import {adminAuthorized,json,clean,audit,money} from '../../_lib/admin.js';
export async function onRequestGet({request,env}){
  if(!adminAuthorized(request,env))return json({error:'unauthorized'},401);
  const rows=await env.DB.prepare(`SELECT r.id,r.amount,r.reason,r.status,r.provider_ref,r.created_at,r.completed_at,r.updated_at,o.order_no,o.total,o.payment_status FROM refunds r JOIN orders o ON o.id=r.order_id ORDER BY r.id DESC LIMIT 300`).all();
  return json({refunds:rows.results||[]});
}
export async function onRequestPost({request,env}){
  if(!adminAuthorized(request,env))return json({error:'unauthorized'},401);
  const b=await request.json().catch(()=>({})),action=clean(b.action,30),refundId=Number(b.refundId),providerRef=clean(b.providerRef,160);
  if(action!=='confirm_refund'||!refundId||providerRef.length<4)return json({error:'invalid_request'},400);
  const row=await env.DB.prepare(`SELECT r.id,r.order_id,r.amount,r.status,o.order_no,o.total,o.payment_status FROM refunds r JOIN orders o ON o.id=r.order_id WHERE r.id=?`).bind(refundId).first();if(!row)return json({error:'refund_not_found'},404);
  if(row.status==='completed')return json({ok:true,reused:true,refundId,providerRef:row.provider_ref||providerRef});
  if(!['cod_collected','paid'].includes(String(row.payment_status)))return json({error:'order_not_paid'},409);
  const amount=money(row.amount);if(amount<=0||amount>Number(row.total)+0.01)return json({error:'invalid_refund_amount'},409);
  await env.DB.batch([
    env.DB.prepare("UPDATE refunds SET status='completed',provider_ref=?,completed_at=COALESCE(completed_at,datetime('now')),updated_at=datetime('now') WHERE id=?").bind(providerRef,refundId),
    env.DB.prepare("INSERT OR IGNORE INTO financial_ledger(entry_type,amount,order_id,refund_id,reference_type,reference_id,description,dedupe_key) VALUES('refund',?,?,?,?,?,'ยืนยันการคืนเงินจริงจากหลักฐานผู้ให้บริการ',?)").bind(-amount,row.order_id,refundId,'refund_provider',providerRef,`refund:${refundId}:${providerRef}`),
    env.DB.prepare("INSERT INTO order_events(order_id,event_type,note) VALUES(?,'refund_completed',?)").bind(row.order_id,`ยืนยันคืนเงิน ${amount.toFixed(2)} บาท อ้างอิง ${providerRef}`)
  ]);
  await audit(env,{action:'finance.refund_confirm',entityType:'refund',entityId:refundId,metadata:{orderNo:row.order_no,amount,providerRef}});return json({ok:true,refundId,orderNo:row.order_no,amount,providerRef,recorded:true});
}
