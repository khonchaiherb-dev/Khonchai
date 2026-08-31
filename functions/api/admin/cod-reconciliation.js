import {adminAuthorized,json,clean,audit} from '../../_lib/admin.js';
import {reconcileCod,settleCod} from '../../_lib/finance.js';
export async function onRequestGet({request,env}){
  if(!adminAuthorized(request,env))return json({error:'unauthorized'},401);
  const rows=await env.DB.prepare(`SELECT c.id,c.provider,c.provider_ref,c.gross_amount,c.fee_amount,c.net_amount,c.status,c.note,c.received_at,c.settled_at,o.order_no,o.total expected_amount,o.payment_status,s.tracking_no
    FROM cod_reconciliations c JOIN orders o ON o.id=c.order_id LEFT JOIN shipments s ON s.id=c.shipment_id
    ORDER BY CASE c.status WHEN 'exception' THEN 0 WHEN 'matched' THEN 1 WHEN 'pending' THEN 2 ELSE 3 END,c.id DESC LIMIT 300`).all();
  const pending=await env.DB.prepare(`SELECT o.id order_id,o.order_no,o.total,o.payment_status,s.id shipment_id,s.carrier,s.tracking_no
    FROM orders o JOIN shipments s ON s.order_id=o.id WHERE o.payment_method='COD' AND o.status!='cancelled' AND o.payment_status!='cod_collected' AND o.fulfillment_status IN ('shipping','delivered') ORDER BY o.created_at LIMIT 200`).all();
  return json({reconciliations:rows.results||[],pendingOrders:pending.results||[]});
}
export async function onRequestPost({request,env}){
  if(!adminAuthorized(request,env))return json({error:'unauthorized'},401);
  const b=await request.json().catch(()=>({})),action=clean(b.action,30);
  if(action==='record'){
    const order=await env.DB.prepare("SELECT o.id order_id,s.id shipment_id FROM orders o LEFT JOIN shipments s ON s.order_id=o.id WHERE o.order_no=?").bind(clean(b.orderNo,80)).first();if(!order)return json({error:'order_not_found'},404);
    try{const result=await reconcileCod(env,{orderId:order.order_id,shipmentId:order.shipment_id,provider:clean(b.provider,60)||'manual',providerRef:clean(b.providerRef,120),grossAmount:Number(b.grossAmount),feeAmount:Number(b.feeAmount)||0,note:clean(b.note,240)||'Manual reconciliation'});await audit(env,{action:'finance.cod_reconcile',entityType:'order',entityId:b.orderNo,metadata:result});return json({ok:true,...result})}catch(e){return json({error:String(e.message||e)},400)}
  }
  if(action==='settle'){
    try{const result=await settleCod(env,{provider:clean(b.provider,60),providerRef:clean(b.providerRef,120)});await audit(env,{action:'finance.cod_settle',entityType:'cod_reconciliation',entityId:`${b.provider}:${b.providerRef}`});return json(result)}catch(e){return json({error:String(e.message||e)},409)}
  }
  return json({error:'invalid_action'},400);
}
