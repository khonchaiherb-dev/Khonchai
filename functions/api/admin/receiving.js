import {adminAuthorized,json,clean,money,audit} from '../../_lib/admin.js';
const n=v=>Math.trunc(Number(v)||0);
export async function onRequestGet({request,env}){
  if(!adminAuthorized(request,env))return json({error:'unauthorized'},401);
  if(!env.DB)return json({error:'database_not_bound'},503);
  const u=new URL(request.url),poNo=clean(u.searchParams.get('poNo'),80);
  const [receipts,pos]=await Promise.all([
    env.DB.prepare(`SELECT gr.id,gr.receipt_no,gr.external_ref,gr.note,gr.received_by,gr.received_at,po.po_no,
      COALESCE(s.name,po.supplier_name) supplier_name,COUNT(gri.id) item_lines,COALESCE(SUM(gri.qty_received),0) qty_received,
      COALESCE(SUM(gri.qty_received*gri.unit_cost),0) received_cost
      FROM goods_receipts gr JOIN purchase_orders po ON po.id=gr.purchase_order_id
      LEFT JOIN suppliers s ON s.id=gr.supplier_id LEFT JOIN goods_receipt_items gri ON gri.goods_receipt_id=gr.id
      GROUP BY gr.id ORDER BY gr.id DESC LIMIT 150`).all(),
    env.DB.prepare(`SELECT po.id,po.po_no,COALESCE(s.name,po.supplier_name) supplier_name,po.status,po.approval_status,po.expected_at,
      COALESCE(SUM(poi.qty_ordered),0) qty_ordered,COALESCE(SUM(poi.qty_received),0) qty_received
      FROM purchase_orders po LEFT JOIN suppliers s ON s.id=po.supplier_id
      LEFT JOIN purchase_order_items poi ON poi.purchase_order_id=po.id
      WHERE po.approval_status='approved' AND po.status IN ('ordered','partial')
      GROUP BY po.id ORDER BY po.id DESC`).all()
  ]);
  let detail=null;
  if(poNo){
    const po=await env.DB.prepare(`SELECT po.id,po.po_no,po.status,po.approval_status,COALESCE(s.name,po.supplier_name) supplier_name
      FROM purchase_orders po LEFT JOIN suppliers s ON s.id=po.supplier_id WHERE po.po_no=?`).bind(poNo).first();
    if(po){
      const items=await env.DB.prepare(`SELECT poi.id,poi.product_id,poi.variant_id,poi.sku,poi.qty_ordered,poi.qty_received,poi.unit_cost,
        p.name product_name,v.option_name,v.option_value
        FROM purchase_order_items poi JOIN products p ON p.id=poi.product_id LEFT JOIN product_variants v ON v.id=poi.variant_id
        WHERE poi.purchase_order_id=? ORDER BY poi.id`).bind(po.id).all();
      detail={...po,items:items.results||[]};
    }
  }
  return json({receipts:receipts.results||[],openPurchaseOrders:pos.results||[],detail});
}
export async function onRequestPost({request,env}){
  if(!adminAuthorized(request,env))return json({error:'unauthorized'},401);
  if(!env.DB)return json({error:'database_not_bound'},503);
  const b=await request.json().catch(()=>({})),poNo=clean(b.poNo,80),externalRef=clean(b.externalRef,120),note=clean(b.note,500)||null,rows=Array.isArray(b.items)?b.items:[];
  if(!poNo||externalRef.length<3||!rows.length)return json({error:'invalid_receipt'},400);
  const po=await env.DB.prepare("SELECT id,supplier_id,status,approval_status FROM purchase_orders WHERE po_no=?").bind(poNo).first();
  if(!po)return json({error:'purchase_order_not_found'},404);
  if(po.approval_status!=='approved'||!['ordered','partial'].includes(po.status))return json({error:'purchase_order_not_receivable'},409);
  const receiptNo=`GR${new Date().toISOString().replace(/\D/g,'').slice(2,14)}${Math.floor(Math.random()*900+100)}`;
  const normalized=[];
  for(const raw of rows){
    const itemId=n(raw.itemId),qty=n(raw.qty);
    if(!itemId||qty<=0)continue;
    const x=await env.DB.prepare(`SELECT poi.id,poi.product_id,poi.variant_id,poi.qty_ordered,poi.qty_received,poi.unit_cost,
      p.stock product_stock,p.cost_price product_cost,v.stock variant_stock,v.cost_price variant_cost
      FROM purchase_order_items poi JOIN products p ON p.id=poi.product_id
      LEFT JOIN product_variants v ON v.id=poi.variant_id
      WHERE poi.id=? AND poi.purchase_order_id=?`).bind(itemId,po.id).first();
    if(!x)return json({error:'purchase_order_item_not_found',itemId},404);
    const remaining=Number(x.qty_ordered)-Number(x.qty_received);
    if(qty>remaining)return json({error:'receive_exceeds_remaining',itemId,remaining},409);
    normalized.push({...x,qty});
  }
  if(!normalized.length)return json({error:'nothing_to_receive'},400);
  const batch=[env.DB.prepare(`INSERT INTO goods_receipts(receipt_no,purchase_order_id,supplier_id,external_ref,note,received_by)
    VALUES(?,?,?,?,?,'admin')`).bind(receiptNo,po.id,po.supplier_id||null,externalRef,note)];
  let totalQty=0;
  for(const x of normalized){
    const qty=x.qty,unitCost=Number(x.unit_cost||0);
    if(x.variant_id){
      const oldStock=Number(x.variant_stock||0),oldCost=Number(x.variant_cost||0),newStock=oldStock+qty,newCost=newStock?money((oldStock*oldCost+qty*unitCost)/newStock):unitCost;
      batch.push(env.DB.prepare("UPDATE product_variants SET stock=stock+?,cost_price=?,updated_at=datetime('now') WHERE id=?").bind(qty,newCost,x.variant_id));
    }else{
      const oldStock=Number(x.product_stock||0),oldCost=Number(x.product_cost||0),newStock=oldStock+qty,newCost=newStock?money((oldStock*oldCost+qty*unitCost)/newStock):unitCost;
      batch.push(env.DB.prepare("UPDATE products SET stock=stock+?,cost_price=?,updated_at=datetime('now') WHERE id=?").bind(qty,newCost,x.product_id));
    }
    batch.push(env.DB.prepare("UPDATE purchase_order_items SET qty_received=qty_received+?,updated_at=datetime('now') WHERE id=?").bind(qty,x.id));
    batch.push(env.DB.prepare(`INSERT INTO goods_receipt_items(goods_receipt_id,purchase_order_item_id,product_id,variant_id,qty_received,unit_cost)
      VALUES((SELECT id FROM goods_receipts WHERE receipt_no=?),?,?,?,?,?)`).bind(receiptNo,x.id,x.product_id,x.variant_id,qty,unitCost));
    batch.push(env.DB.prepare(`INSERT INTO inventory_lots(product_id,variant_id,source_type,source_ref,qty_received,qty_remaining,unit_cost)
      VALUES(?,?,'purchase_order',?,?,?,?)`).bind(x.product_id,x.variant_id,`${poNo}:${receiptNo}`,qty,qty,unitCost));
    batch.push(env.DB.prepare(`INSERT INTO inventory_movements(product_id,variant_id,movement_type,qty,reference_type,reference_id,note)
      VALUES(?,?,'purchase_receive',?,'goods_receipt',?,?)`).bind(x.product_id,x.variant_id,qty,receiptNo,`รับสินค้าเข้า • ${externalRef}`));
    totalQty+=qty;
  }
  batch.push(env.DB.prepare(`UPDATE purchase_orders SET status=CASE
    WHEN NOT EXISTS(SELECT 1 FROM purchase_order_items WHERE purchase_order_id=? AND qty_received<qty_ordered) THEN 'received'
    ELSE 'partial' END,updated_at=datetime('now') WHERE id=?`).bind(po.id,po.id));
  await env.DB.batch(batch);
  await audit(env,{action:'goods_receipt.create',entityType:'goods_receipt',entityId:receiptNo,metadata:{poNo,externalRef,qty:totalQty}});
  return json({ok:true,receiptNo,poNo,receivedQty:totalQty});
}
