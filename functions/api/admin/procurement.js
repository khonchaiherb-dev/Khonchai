import {adminAuthorized,json,clean,money,audit} from '../../_lib/admin.js';
const n=v=>Math.trunc(Number(v)||0);
const emailOk=v=>!v||/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);

async function catalog(env){
  const [p,v]=await Promise.all([
    env.DB.prepare("SELECT id,name,sku,barcode,stock,cost_price,active FROM products ORDER BY active DESC,name LIMIT 300").all(),
    env.DB.prepare("SELECT id,product_id,sku,barcode,option_name,option_value,stock,cost_price,active FROM product_variants ORDER BY product_id,id").all()
  ]);
  return {products:p.results||[],variants:v.results||[]};
}
export async function onRequestGet({request,env}){
  if(!adminAuthorized(request,env))return json({error:'unauthorized'},401);
  if(!env.DB)return json({error:'database_not_bound'},503);
  const [s,po,c]=await Promise.all([
    env.DB.prepare(`SELECT id,code,name,contact_name,phone,email,tax_id,address,lead_time_days,payment_terms,active,updated_at
      FROM suppliers ORDER BY active DESC,name LIMIT 300`).all(),
    env.DB.prepare(`SELECT po.id,po.po_no,po.supplier_id,COALESCE(s.name,po.supplier_name) supplier_name,po.status,po.approval_status,
      po.approved_by,po.approved_at,po.rejection_note,po.expected_at,po.note,po.created_at,
      COUNT(poi.id) item_lines,COALESCE(SUM(poi.qty_ordered),0) qty_ordered,COALESCE(SUM(poi.qty_received),0) qty_received,
      COALESCE(SUM(poi.qty_ordered*poi.unit_cost),0) order_cost
      FROM purchase_orders po LEFT JOIN suppliers s ON s.id=po.supplier_id
      LEFT JOIN purchase_order_items poi ON poi.purchase_order_id=po.id
      GROUP BY po.id ORDER BY po.id DESC LIMIT 150`).all(),
    catalog(env)
  ]);
  return json({suppliers:s.results||[],purchaseOrders:po.results||[],catalog:c});
}
export async function onRequestPost({request,env}){
  if(!adminAuthorized(request,env))return json({error:'unauthorized'},401);
  if(!env.DB)return json({error:'database_not_bound'},503);
  const b=await request.json().catch(()=>({})),action=clean(b.action,40);
  if(action==='upsert_supplier'){
    const id=n(b.id)||null,code=clean(b.code,40).toUpperCase()||null,name=clean(b.name,180),contact=clean(b.contactName,180)||null,
      phone=clean(b.phone,40)||null,email=clean(b.email,180).toLowerCase()||null,taxId=clean(b.taxId,40)||null,
      address=clean(b.address,800)||null,lead=Math.max(0,Math.min(365,n(b.leadTimeDays)||7)),terms=clean(b.paymentTerms,240)||null,active=b.active===false?0:1;
    if(name.length<2||!emailOk(email))return json({error:'invalid_supplier'},400);
    try{
      let supplierId=id;
      if(id)await env.DB.prepare(`UPDATE suppliers SET code=?,name=?,contact_name=?,phone=?,email=?,tax_id=?,address=?,lead_time_days=?,payment_terms=?,active=?,updated_at=datetime('now') WHERE id=?`)
        .bind(code,name,contact,phone,email,taxId,address,lead,terms,active,id).run();
      else{
        const r=await env.DB.prepare(`INSERT INTO suppliers(code,name,contact_name,phone,email,tax_id,address,lead_time_days,payment_terms,active)
          VALUES(?,?,?,?,?,?,?,?,?,?) RETURNING id`).bind(code,name,contact,phone,email,taxId,address,lead,terms,active).first();
        supplierId=Number(r.id);
      }
      await audit(env,{action:id?'supplier.update':'supplier.create',entityType:'supplier',entityId:supplierId,metadata:{code,name,active}});
      return json({ok:true,id:supplierId});
    }catch(e){if(String(e?.message||e).toLowerCase().includes('unique'))return json({error:'duplicate_supplier_code'},409);throw e}
  }
  if(action==='create_po'){
    const supplierId=n(b.supplierId),expectedAt=clean(b.expectedAt,40)||null,note=clean(b.note,500)||null,items=Array.isArray(b.items)?b.items:[];
    const supplier=await env.DB.prepare("SELECT id,name FROM suppliers WHERE id=? AND active=1").bind(supplierId).first();
    if(!supplier||!items.length||items.length>200)return json({error:'invalid_purchase_order'},400);
    const normalized=[];
    for(const raw of items){
      const productId=n(raw.productId),variantId=n(raw.variantId)||null,qty=n(raw.qty),unitCost=money(raw.unitCost);
      if(!productId||qty<=0||unitCost<0)return json({error:'invalid_purchase_order_item'},400);
      const row=variantId
        ? await env.DB.prepare("SELECT id,product_id,sku FROM product_variants WHERE id=? AND product_id=? AND active=1").bind(variantId,productId).first()
        : await env.DB.prepare("SELECT id,sku FROM products WHERE id=? AND active=1").bind(productId).first();
      if(!row)return json({error:'catalog_item_not_found'},404);
      normalized.push({productId,variantId,qty,unitCost,sku:row.sku||null});
    }
    const poNo=`PO${new Date().toISOString().replace(/\D/g,'').slice(2,14)}${Math.floor(Math.random()*900+100)}`;
    const batch=[env.DB.prepare(`INSERT INTO purchase_orders(po_no,supplier_id,supplier_name,status,approval_status,expected_at,note,created_by)
      VALUES(?,?,?,'draft','pending',?,?, 'admin')`).bind(poNo,supplier.id,supplier.name,expectedAt,note)];
    for(const x of normalized)batch.push(env.DB.prepare(`INSERT INTO purchase_order_items(purchase_order_id,product_id,variant_id,sku,qty_ordered,unit_cost)
      VALUES((SELECT id FROM purchase_orders WHERE po_no=?),?,?,?,?,?)`).bind(poNo,x.productId,x.variantId,x.sku,x.qty,x.unitCost));
    await env.DB.batch(batch);
    await audit(env,{action:'purchase_order.submit',entityType:'purchase_order',entityId:poNo,metadata:{supplierId,itemLines:normalized.length}});
    return json({ok:true,poNo,approvalStatus:'pending'});
  }
  if(action==='approve_po'||action==='reject_po'){
    const poNo=clean(b.poNo,80),note=clean(b.note,500)||null;
    const po=await env.DB.prepare("SELECT id,status,approval_status FROM purchase_orders WHERE po_no=?").bind(poNo).first();
    if(!po)return json({error:'purchase_order_not_found'},404);
    if(po.status!=='draft'||po.approval_status!=='pending')return json({error:'invalid_approval_state'},409);
    if(action==='approve_po'){
      await env.DB.prepare(`UPDATE purchase_orders SET approval_status='approved',status='ordered',approved_by='admin',approved_at=datetime('now'),
        rejection_note=NULL,updated_at=datetime('now') WHERE id=?`).bind(po.id).run();
      await audit(env,{action:'purchase_order.approve',entityType:'purchase_order',entityId:poNo});
      return json({ok:true,status:'ordered',approvalStatus:'approved'});
    }
    if(!note)return json({error:'rejection_note_required'},400);
    await env.DB.prepare(`UPDATE purchase_orders SET approval_status='rejected',status='cancelled',rejection_note=?,updated_at=datetime('now') WHERE id=?`).bind(note,po.id).run();
    await audit(env,{action:'purchase_order.reject',entityType:'purchase_order',entityId:poNo,metadata:{note}});
    return json({ok:true,status:'cancelled',approvalStatus:'rejected'});
  }
  return json({error:'invalid_action'},400);
}
