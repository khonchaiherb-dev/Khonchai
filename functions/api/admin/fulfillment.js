import {adminAuthorized,json,clean,audit} from '../../_lib/admin.js';
const uniq=a=>[...new Set((Array.isArray(a)?a:[]).map(x=>clean(x,80)).filter(Boolean))];

export async function onRequestGet({request,env}){
  if(!adminAuthorized(request,env))return json({error:'unauthorized'},401);
  const orders=await env.DB.prepare(`SELECT o.order_no,o.customer_name,o.total,o.payment_method,o.payment_status,o.fulfillment_status,o.status,o.created_at,
    s.carrier,s.tracking_no,
    (SELECT COUNT(*) FROM order_items i WHERE i.order_id=o.id) item_lines,
    (SELECT COALESCE(SUM(qty),0) FROM order_items i WHERE i.order_id=o.id) item_qty,
    (SELECT COALESCE(SUM(qty),0) FROM stock_reservations r WHERE r.order_id=o.id AND r.status='active') reserved_qty,
    (SELECT b.batch_no FROM fulfillment_batch_orders bo JOIN fulfillment_batches b ON b.id=bo.batch_id WHERE bo.order_id=o.id AND b.status NOT IN ('closed','cancelled') ORDER BY b.id DESC LIMIT 1) batch_no
    FROM orders o LEFT JOIN shipments s ON s.order_id=o.id
    WHERE o.status!='cancelled' AND o.fulfillment_status IN ('pending','packing','shipping')
    ORDER BY CASE o.fulfillment_status WHEN 'packing' THEN 0 WHEN 'pending' THEN 1 ELSE 2 END,o.created_at ASC LIMIT 200`).all();
  const batches=await env.DB.prepare(`SELECT b.id,b.batch_no,b.status,b.note,b.created_at,b.updated_at,COUNT(bo.order_id) orders_count
    FROM fulfillment_batches b LEFT JOIN fulfillment_batch_orders bo ON bo.batch_id=b.id
    WHERE b.status NOT IN ('closed','cancelled') GROUP BY b.id ORDER BY b.id DESC LIMIT 50`).all();
  return json({orders:orders.results||[],batches:batches.results||[]});
}

export async function onRequestPost({request,env}){
  if(!adminAuthorized(request,env))return json({error:'unauthorized'},401);
  const b=await request.json().catch(()=>({})),action=clean(b.action,30);
  if(action==='create_batch'){
    const orderNos=uniq(b.orderNos).slice(0,100);if(!orderNos.length)return json({error:'orders_required'},400);
    const ph=orderNos.map(()=>'?').join(','),valid=await env.DB.prepare(`SELECT id,order_no FROM orders WHERE order_no IN (${ph}) AND status!='cancelled' AND fulfillment_status IN ('pending','packing')`).bind(...orderNos).all();
    if((valid.results||[]).length!==orderNos.length)return json({error:'invalid_batch_orders'},409);
    const batchNo=`PK${new Date().toISOString().replace(/\D/g,'').slice(2,14)}${Math.floor(Math.random()*90+10)}`,note=clean(b.note,240),stmts=[env.DB.prepare("INSERT INTO fulfillment_batches(batch_no,status,note,created_by) VALUES(?,'open',?,'admin')").bind(batchNo,note||null)];
    for(const o of valid.results||[])stmts.push(env.DB.prepare("INSERT INTO fulfillment_batch_orders(batch_id,order_id) VALUES((SELECT id FROM fulfillment_batches WHERE batch_no=?),?)").bind(batchNo,o.id));
    await env.DB.batch(stmts);await audit(env,{action:'fulfillment.batch_create',entityType:'fulfillment_batch',entityId:batchNo,metadata:{orderNos}});return json({ok:true,batchNo,orders:orderNos.length});
  }
  if(action==='batch_status'){
    const batchNo=clean(b.batchNo,80),status=clean(b.status,20);if(!batchNo||!['picking','packed','closed','cancelled'].includes(status))return json({error:'invalid_batch_status'},400);
    const row=await env.DB.prepare("SELECT id,status FROM fulfillment_batches WHERE batch_no=?").bind(batchNo).first();if(!row)return json({error:'batch_not_found'},404);
    const stmts=[env.DB.prepare("UPDATE fulfillment_batches SET status=?,updated_at=datetime('now') WHERE id=?").bind(status,row.id)];
    if(status==='picking')stmts.push(env.DB.prepare("UPDATE fulfillment_batch_orders SET picked_at=COALESCE(picked_at,datetime('now')) WHERE batch_id=?").bind(row.id));
    if(status==='packed'){
      stmts.push(env.DB.prepare("UPDATE fulfillment_batch_orders SET picked_at=COALESCE(picked_at,datetime('now')),packed_at=COALESCE(packed_at,datetime('now')) WHERE batch_id=?").bind(row.id));
      stmts.push(env.DB.prepare("UPDATE orders SET fulfillment_status='packing',status='processing',updated_at=datetime('now') WHERE id IN (SELECT order_id FROM fulfillment_batch_orders WHERE batch_id=?) AND status!='cancelled' AND fulfillment_status='pending'").bind(row.id));
      stmts.push(env.DB.prepare("UPDATE shipments SET status='packing' WHERE order_id IN (SELECT order_id FROM fulfillment_batch_orders WHERE batch_id=?) AND status='pending'").bind(row.id));
    }
    await env.DB.batch(stmts);await audit(env,{action:'fulfillment.batch_status',entityType:'fulfillment_batch',entityId:batchNo,metadata:{from:row.status,to:status}});return json({ok:true,batchNo,status});
  }
  return json({error:'invalid_action'},400);
}
