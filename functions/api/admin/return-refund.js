import {adminAuthorized,json,clean,money,audit} from '../../_lib/admin.js';

export async function onRequestPost({request,env}){
  if(!adminAuthorized(request,env))return json({error:'unauthorized'},401);
  if(!env.DB)return json({error:'database_not_bound'},503);
  const b=await request.json().catch(()=>({})),returnRequestId=Number(b.returnRequestId),amount=money(b.amount),reason=clean(b.reason,500)||'คืนเงินจากการคืนสินค้า';
  if(!returnRequestId||amount<=0)return json({error:'invalid_refund_request'},400);
  const r=await env.DB.prepare(`SELECT rr.id,rr.order_id,rr.status,rr.qty,o.order_no,o.total,p.name product_name
    FROM return_requests rr JOIN orders o ON o.id=rr.order_id JOIN products p ON p.id=rr.product_id WHERE rr.id=?`).bind(returnRequestId).first();
  if(!r)return json({error:'return_request_not_found'},404);
  if(!['approved','completed'].includes(r.status))return json({error:'return_not_approved'},409);
  if(amount>Number(r.total||0))return json({error:'refund_exceeds_order_total'},409);
  const old=await env.DB.prepare("SELECT refund_id FROM return_refund_links WHERE return_request_id=?").bind(returnRequestId).first();
  if(old)return json({ok:true,reused:true,refundId:Number(old.refund_id)});
  const refund=await env.DB.prepare("INSERT INTO refunds(order_id,amount,reason,status,updated_at) VALUES(?,?,?,'requested',datetime('now')) RETURNING id").bind(r.order_id,amount,reason).first();
  await env.DB.batch([
    env.DB.prepare("INSERT INTO return_refund_links(return_request_id,refund_id) VALUES(?,?)").bind(returnRequestId,refund.id),
    env.DB.prepare("INSERT INTO order_events(order_id,event_type,note) VALUES(?,'refund_requested',?)").bind(r.order_id,`สร้างคำขอคืนเงิน ${amount.toFixed(2)} บาท จากเคสคืนสินค้า #${returnRequestId}`)
  ]);
  await audit(env,{action:'return.refund_request',entityType:'return_request',entityId:returnRequestId,metadata:{refundId:Number(refund.id),amount,orderNo:r.order_no}});
  return json({ok:true,refundId:Number(refund.id),amount,financialRefundCompleted:false});
}
