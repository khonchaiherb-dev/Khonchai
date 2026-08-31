import {adminAuthorized,json,clean,audit} from '../../_lib/admin.js';

async function orderSnapshot(env,orderNo){
  const order=await env.DB.prepare("SELECT id,order_no,status,fulfillment_status,customer_name FROM orders WHERE order_no=?").bind(orderNo).first();
  if(!order)return null;
  const items=await env.DB.prepare(`SELECT oi.id order_item_id,oi.product_id,oi.variant_id,oi.sku,oi.product_name,oi.qty,
    COALESCE(v.barcode,p.barcode,'') barcode,
    COALESCE(pv.verified_qty,0) verified_qty,
    pv.verified_at
    FROM order_items oi JOIN products p ON p.id=oi.product_id
    LEFT JOIN product_variants v ON v.id=oi.variant_id
    LEFT JOIN packing_verifications pv ON pv.order_item_id=oi.id
    WHERE oi.order_id=? ORDER BY oi.id`).bind(order.id).all();
  const rows=items.results||[];
  return {order,items:rows,complete:rows.length>0&&rows.every(x=>Number(x.verified_qty)>=Number(x.qty))};
}

export async function onRequestGet({request,env}){
  if(!adminAuthorized(request,env))return json({error:'unauthorized'},401);
  if(!env.DB)return json({error:'database_not_bound'},503);
  const orderNo=clean(new URL(request.url).searchParams.get('orderNo'),80);
  if(!orderNo)return json({error:'order_required'},400);
  const d=await orderSnapshot(env,orderNo);if(!d)return json({error:'order_not_found'},404);
  return json(d);
}

export async function onRequestPost({request,env}){
  if(!adminAuthorized(request,env))return json({error:'unauthorized'},401);
  if(!env.DB)return json({error:'database_not_bound'},503);
  const b=await request.json().catch(()=>({})),orderNo=clean(b.orderNo,80),action=clean(b.action,30),code=clean(b.code,120);
  if(!orderNo)return json({error:'order_required'},400);
  const d=await orderSnapshot(env,orderNo);if(!d)return json({error:'order_not_found'},404);
  if(['cancelled','shipping','delivered'].includes(d.order.fulfillment_status)||d.order.status==='cancelled')return json({error:'order_not_packable'},409);

  if(action==='reset'){
    await env.DB.prepare("DELETE FROM packing_verifications WHERE order_id=?").bind(d.order.id).run();
    await audit(env,{action:'packing.reset',entityType:'order',entityId:orderNo});
    return json({ok:true,...await orderSnapshot(env,orderNo)});
  }

  if(action!=='scan'||code.length<2)return json({error:'scan_code_required'},400);
  const matches=d.items.filter(x=>String(x.sku||'').toLowerCase()===code.toLowerCase()||String(x.barcode||'').toLowerCase()===code.toLowerCase());
  if(matches.length!==1)return json({error:matches.length?'ambiguous_code':'code_not_in_order'},409);
  const item=matches[0],current=Number(item.verified_qty||0),expected=Number(item.qty||0);
  if(current>=expected)return json({error:'item_already_complete'},409);
  const next=current+1,done=next>=expected;
  await env.DB.prepare(`INSERT INTO packing_verifications(order_id,order_item_id,expected_qty,verified_qty,last_code,verified_at,updated_at)
    VALUES(?,?,?,?,?,CASE WHEN ? THEN datetime('now') ELSE NULL END,datetime('now'))
    ON CONFLICT(order_item_id) DO UPDATE SET verified_qty=excluded.verified_qty,last_code=excluded.last_code,
      verified_at=CASE WHEN excluded.verified_qty>=packing_verifications.expected_qty THEN datetime('now') ELSE NULL END,
      updated_at=datetime('now')`)
    .bind(d.order.id,item.order_item_id,expected,next,code,done?1:0).run();

  const after=await orderSnapshot(env,orderNo);
  if(after.complete){
    await env.DB.batch([
      env.DB.prepare("UPDATE orders SET fulfillment_status=CASE WHEN fulfillment_status='pending' THEN 'packing' ELSE fulfillment_status END,status=CASE WHEN status='pending' THEN 'processing' ELSE status END,updated_at=datetime('now') WHERE id=?").bind(d.order.id),
      env.DB.prepare("INSERT INTO order_events(order_id,event_type,note) VALUES(?,'packing_verified','สแกนตรวจสินค้าครบตามออเดอร์แล้ว')").bind(d.order.id)
    ]);
    await audit(env,{action:'packing.verified',entityType:'order',entityId:orderNo,metadata:{items:after.items.length}});
  }
  return json({ok:true,scanned:item.order_item_id,...after});
}
