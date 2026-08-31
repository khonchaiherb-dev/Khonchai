import {adminAuthorized,json,clean,money,audit} from '../../_lib/admin.js';

const int=v=>Math.trunc(Number(v)||0);
const sqlDate=v=>{if(!v)return null;const d=new Date(v);return Number.isNaN(d.getTime())?null:d.toISOString().slice(0,19).replace('T',' ')};

async function lowStock(env){
  const p=await env.DB.prepare(`SELECT id product_id,name,sku,stock,COALESCE(reserved_stock,0) reserved_stock,low_stock_threshold,
    MAX(0,stock-COALESCE(reserved_stock,0)) available
    FROM products WHERE active=1 AND MAX(0,stock-COALESCE(reserved_stock,0))<=low_stock_threshold
    ORDER BY available ASC,name LIMIT 200`).all();
  const v=await env.DB.prepare(`SELECT v.id variant_id,v.product_id,p.name product_name,v.sku,v.option_name,v.option_value,v.stock,COALESCE(v.reserved_stock,0) reserved_stock,v.low_stock_threshold,
    MAX(0,v.stock-COALESCE(v.reserved_stock,0)) available
    FROM product_variants v JOIN products p ON p.id=v.product_id
    WHERE v.active=1 AND p.active=1 AND MAX(0,v.stock-COALESCE(v.reserved_stock,0))<=v.low_stock_threshold
    ORDER BY available ASC,p.name,v.id LIMIT 300`).all();
  return {products:p.results||[],variants:v.results||[]};
}

export async function onRequestGet({request,env}){
  if(!adminAuthorized(request,env))return json({error:'unauthorized'},401);
  if(!env.DB)return json({error:'database_not_bound'},503);
  const u=new URL(request.url),poNo=clean(u.searchParams.get('poNo'),80);
  const pos=await env.DB.prepare(`SELECT po.id,po.po_no,po.supplier_name,po.status,po.expected_at,po.note,po.created_at,po.updated_at,
      COUNT(poi.id) item_lines,COALESCE(SUM(poi.qty_ordered),0) qty_ordered,COALESCE(SUM(poi.qty_received),0) qty_received,
      COALESCE(SUM(poi.qty_ordered*poi.unit_cost),0) order_cost
    FROM purchase_orders po LEFT JOIN purchase_order_items poi ON poi.purchase_order_id=po.id
    GROUP BY po.id ORDER BY po.id DESC LIMIT 100`).all();
  const alerts=await lowStock(env);
  let detail=null;
  if(poNo){
    const po=await env.DB.prepare("SELECT * FROM purchase_orders WHERE po_no=?").bind(poNo).first();
    if(po){
      const items=await env.DB.prepare(`SELECT poi.id,poi.product_id,poi.variant_id,poi.sku,poi.qty_ordered,poi.qty_received,poi.unit_cost,
        p.name product_name,v.option_name,v.option_value
        FROM purchase_order_items poi JOIN products p ON p.id=poi.product_id
        LEFT JOIN product_variants v ON v.id=poi.variant_id
        WHERE poi.purchase_order_id=? ORDER BY poi.id`).bind(po.id).all();
      detail={...po,items:items.results||[]};
    }
  }
  return json({purchaseOrders:pos.results||[],lowStock:alerts,detail});
}

export async function onRequestPost({request,env}){
  if(!adminAuthorized(request,env))return json({error:'unauthorized'},401);
  if(!env.DB)return json({error:'database_not_bound'},503);
  const b=await request.json().catch(()=>({})),action=clean(b.action,30);

  if(action==='create_po'){
    const supplierName=clean(b.supplierName,180),expectedAt=sqlDate(b.expectedAt),note=clean(b.note,500)||null,items=Array.isArray(b.items)?b.items:[];
    if(supplierName.length<2||!items.length||items.length>200)return json({error:'invalid_purchase_order'},400);
    const normalized=[];
    for(const raw of items){
      const productId=int(raw.productId),variantId=int(raw.variantId)||null,qty=int(raw.qty),unitCost=money(raw.unitCost);
      if(!productId||qty<=0||qty>100000||unitCost<0)return json({error:'invalid_purchase_order_item'},400);
      const row=variantId
        ? await env.DB.prepare("SELECT v.id,v.product_id,v.sku FROM product_variants v WHERE v.id=? AND v.product_id=?").bind(variantId,productId).first()
        : await env.DB.prepare("SELECT id,sku FROM products WHERE id=?").bind(productId).first();
      if(!row)return json({error:'catalog_item_not_found',productId,variantId},404);
      normalized.push({productId,variantId,qty,unitCost,sku:row.sku||null});
    }
    const poNo=`PO${new Date().toISOString().replace(/\D/g,'').slice(2,14)}${Math.floor(Math.random()*900+100)}`;
    const batch=[env.DB.prepare("INSERT INTO purchase_orders(po_no,supplier_name,status,expected_at,note,created_by) VALUES(?,?,'ordered',?,?, 'admin')").bind(poNo,supplierName,expectedAt,note)];
    for(const x of normalized)batch.push(env.DB.prepare(`INSERT INTO purchase_order_items(purchase_order_id,product_id,variant_id,sku,qty_ordered,unit_cost)
      VALUES((SELECT id FROM purchase_orders WHERE po_no=?),?,?,?,?,?)`).bind(poNo,x.productId,x.variantId,x.sku,x.qty,x.unitCost));
    await env.DB.batch(batch);
    await audit(env,{action:'purchase_order.create',entityType:'purchase_order',entityId:poNo,metadata:{supplierName,itemLines:normalized.length}});
    return json({ok:true,poNo});
  }

  if(action==='receive_po'){
    const poNo=clean(b.poNo,80),receiptRef=clean(b.receiptRef,120),rows=Array.isArray(b.items)?b.items:[];
    if(!poNo||receiptRef.length<3||!rows.length)return json({error:'invalid_receipt'},400);
    const po=await env.DB.prepare("SELECT id,status FROM purchase_orders WHERE po_no=?").bind(poNo).first();
    if(!po)return json({error:'purchase_order_not_found'},404);
    if(['received','cancelled'].includes(po.status))return json({error:'purchase_order_closed'},409);
    const batch=[];let receivedTotal=0;
    for(const raw of rows){
      const itemId=int(raw.itemId),qty=int(raw.qty);
      if(!itemId||qty<=0)continue;
      const x=await env.DB.prepare(`SELECT poi.id,poi.product_id,poi.variant_id,poi.qty_ordered,poi.qty_received,poi.unit_cost,
        p.stock product_stock,p.cost_price product_cost,v.stock variant_stock,v.cost_price variant_cost
        FROM purchase_order_items poi JOIN products p ON p.id=poi.product_id
        LEFT JOIN product_variants v ON v.id=poi.variant_id
        WHERE poi.id=? AND poi.purchase_order_id=?`).bind(itemId,po.id).first();
      if(!x)return json({error:'purchase_order_item_not_found',itemId},404);
      const remaining=Number(x.qty_ordered)-Number(x.qty_received);
      if(qty>remaining)return json({error:'receive_exceeds_remaining',itemId,remaining},409);
      if(x.variant_id){
        const oldStock=Number(x.variant_stock||0),oldCost=Number(x.variant_cost||0),newStock=oldStock+qty,newCost=newStock?money((oldStock*oldCost+qty*Number(x.unit_cost||0))/newStock):Number(x.unit_cost||0);
        batch.push(env.DB.prepare("UPDATE product_variants SET stock=stock+?,cost_price=?,updated_at=datetime('now') WHERE id=?").bind(qty,newCost,x.variant_id));
      }else{
        const oldStock=Number(x.product_stock||0),oldCost=Number(x.product_cost||0),newStock=oldStock+qty,newCost=newStock?money((oldStock*oldCost+qty*Number(x.unit_cost||0))/newStock):Number(x.unit_cost||0);
        batch.push(env.DB.prepare("UPDATE products SET stock=stock+?,cost_price=?,updated_at=datetime('now') WHERE id=?").bind(qty,newCost,x.product_id));
      }
      batch.push(env.DB.prepare("UPDATE purchase_order_items SET qty_received=qty_received+?,updated_at=datetime('now') WHERE id=?").bind(qty,itemId));
      batch.push(env.DB.prepare("INSERT INTO inventory_movements(product_id,variant_id,movement_type,qty,reference_type,reference_id,note) VALUES(?,?,'purchase_receive',?,'purchase_order',?,?)").bind(x.product_id,x.variant_id,qty,poNo,`รับสินค้าเข้า • ${receiptRef}`));
      receivedTotal+=qty;
    }
    if(!receivedTotal)return json({error:'nothing_to_receive'},400);
    batch.push(env.DB.prepare(`UPDATE purchase_orders SET status=CASE
      WHEN NOT EXISTS(SELECT 1 FROM purchase_order_items WHERE purchase_order_id=? AND qty_received<qty_ordered) THEN 'received'
      ELSE 'partial' END,updated_at=datetime('now') WHERE id=?`).bind(po.id,po.id));
    await env.DB.batch(batch);
    await audit(env,{action:'purchase_order.receive',entityType:'purchase_order',entityId:poNo,metadata:{receiptRef,qty:receivedTotal}});
    return json({ok:true,poNo,receivedQty:receivedTotal});
  }

  if(action==='cancel_po'){
    const poNo=clean(b.poNo,80),po=await env.DB.prepare("SELECT id,status FROM purchase_orders WHERE po_no=?").bind(poNo).first();
    if(!po)return json({error:'purchase_order_not_found'},404);
    const received=await env.DB.prepare("SELECT COALESCE(SUM(qty_received),0) qty FROM purchase_order_items WHERE purchase_order_id=?").bind(po.id).first();
    if(Number(received?.qty||0)>0)return json({error:'cannot_cancel_received_po'},409);
    await env.DB.prepare("UPDATE purchase_orders SET status='cancelled',updated_at=datetime('now') WHERE id=?").bind(po.id).run();
    await audit(env,{action:'purchase_order.cancel',entityType:'purchase_order',entityId:poNo});
    return json({ok:true});
  }

  return json({error:'invalid_action'},400);
}
