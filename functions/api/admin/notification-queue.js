import {adminAuthorized,json,clean} from '../../_lib/admin.js';
const enc=new TextEncoder();
async function hmac(raw,secret){
  if(!secret)return '';
  const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  return [...new Uint8Array(await crypto.subtle.sign('HMAC',key,enc.encode(raw)))].map(x=>x.toString(16).padStart(2,'0')).join('');
}
export async function onRequestGet({request,env}){
  if(!adminAuthorized(request,env))return json({error:'unauthorized'},401);
  if(!env.DB)return json({error:'database_not_bound'},503);
  const u=new URL(request.url),status=clean(u.searchParams.get('status'),20)||'pending';
  const r=await env.DB.prepare(`SELECT n.id,n.channel,n.template_key,n.status,n.attempts,n.next_attempt_at,n.sent_at,n.last_error,n.created_at,
    o.order_no,c.full_name customer_name
    FROM notification_outbox n LEFT JOIN orders o ON o.id=n.order_id LEFT JOIN customers c ON c.id=n.customer_id
    WHERE n.status=? ORDER BY n.id ASC LIMIT 150`).bind(status).all();
  return json({configured:Boolean(env.NOTIFICATION_WEBHOOK_URL),queue:r.results||[]});
}
export async function onRequestPost({request,env}){
  if(!adminAuthorized(request,env))return json({error:'unauthorized'},401);
  if(!env.DB)return json({error:'database_not_bound'},503);
  const b=await request.json().catch(()=>({})),limit=Math.min(50,Math.max(1,Number(b.limit)||20));
  if(!env.NOTIFICATION_WEBHOOK_URL)return json({error:'notification_provider_not_configured'},503);
  const rows=await env.DB.prepare(`SELECT n.id,n.channel,n.template_key,n.payload_json,n.attempts,o.order_no,c.phone,c.email,c.full_name
    FROM notification_outbox n LEFT JOIN orders o ON o.id=n.order_id LEFT JOIN customers c ON c.id=n.customer_id
    WHERE n.status IN ('pending','failed') AND (n.next_attempt_at IS NULL OR n.next_attempt_at<=datetime('now'))
    ORDER BY n.id ASC LIMIT ?`).bind(limit).all();
  let sent=0,failed=0;
  for(const x of rows.results||[]){
    await env.DB.prepare("UPDATE notification_outbox SET status='sending',attempts=attempts+1,updated_at=datetime('now') WHERE id=?").bind(x.id).run();
    const body=JSON.stringify({channel:x.channel,templateKey:x.template_key,orderNo:x.order_no||null,recipient:{phone:x.phone||null,email:x.email||null,name:x.full_name||null},data:JSON.parse(x.payload_json||'{}')});
    try{
      const sig=await hmac(body,env.NOTIFICATION_WEBHOOK_SECRET||'');
      const r=await fetch(env.NOTIFICATION_WEBHOOK_URL,{method:'POST',headers:{'Content-Type':'application/json',...(sig?{'X-KCH-Signature':sig}:{})},body});
      if(!r.ok)throw new Error(`provider_${r.status}`);
      await env.DB.prepare("UPDATE notification_outbox SET status='sent',sent_at=datetime('now'),last_error=NULL,updated_at=datetime('now') WHERE id=?").bind(x.id).run();sent++;
    }catch(e){
      const attempts=Number(x.attempts||0)+1,nextMinutes=Math.min(360,Math.pow(2,Math.min(8,attempts)));
      await env.DB.prepare("UPDATE notification_outbox SET status='failed',last_error=?,next_attempt_at=datetime('now',?),updated_at=datetime('now') WHERE id=?")
        .bind(clean(String(e?.message||e),240),`+${nextMinutes} minutes`,x.id).run();failed++;
    }
  }
  return json({ok:true,processed:(rows.results||[]).length,sent,failed});
}
