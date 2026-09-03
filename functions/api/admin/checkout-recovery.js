import {adminAuthorized,json,clean} from '../../_lib/admin.js';

const allowedChannels=new Set(['line','sms','email','webhook']);
async function tableExists(db,name){
  const r=await db.prepare("SELECT 1 ok FROM sqlite_master WHERE type='table' AND name=? LIMIT 1").bind(name).first();
  return Boolean(r?.ok);
}

export async function onRequestGet({request,env}){
  if(!adminAuthorized(request,env))return json({error:'unauthorized'},401);
  if(!env.DB)return json({error:'database_not_bound'},503);
  if(!await tableExists(env.DB,'checkout_sessions'))return json({ready:false,migration:'0022',error:'checkout_recovery_schema_not_ready'},503);
  const sessions=await env.DB.prepare(`SELECT status,COUNT(*) count,SUM(CASE WHEN recovery_allowed=1 THEN 1 ELSE 0 END) recoverable FROM checkout_sessions GROUP BY status`).all();
  const events=await env.DB.prepare(`SELECT event_type,COUNT(*) count FROM checkout_recovery_events WHERE created_at>=datetime('now','-30 days') GROUP BY event_type`).all();
  return json({ready:true,providerConfigured:Boolean(env.NOTIFICATION_WEBHOOK_URL),sessions:sessions.results||[],events30d:events.results||[]});
}

export async function onRequestPost({request,env}){
  if(!adminAuthorized(request,env))return json({error:'unauthorized'},401);
  if(!env.DB)return json({error:'database_not_bound'},503);
  const required=['checkout_sessions','checkout_recovery_events','notification_outbox'];
  for(const t of required)if(!await tableExists(env.DB,t))return json({error:'checkout_recovery_schema_not_ready',missing:t,migration:'0022'},503);
  const body=await request.json().catch(()=>({}));
  const action=clean(body.action,24)||'scan';
  if(action!=='scan')return json({error:'unsupported_action'},400);

  const abandonMinutes=Math.max(15,Math.min(1440,Number(env.CHECKOUT_ABANDON_AFTER_MINUTES||60)));
  const expireHours=Math.max(24,Math.min(720,Number(env.CHECKOUT_RECOVERY_EXPIRE_HOURS||168)));
  const limit=Math.max(1,Math.min(100,Number(body.limit)||50));
  const configuredChannel=clean(env.RECOVERY_NOTIFICATION_CHANNEL,20).toLowerCase();
  const channel=allowedChannels.has(configuredChannel)?configuredChannel:'sms';

  await env.DB.prepare(`UPDATE checkout_sessions SET status='expired',updated_at=datetime('now') WHERE status IN ('active','abandoned') AND (expires_at<=datetime('now') OR last_activity_at<=datetime('now',?))`)
    .bind(`-${expireHours} hours`).run();
  const marked=await env.DB.prepare(`UPDATE checkout_sessions SET status='abandoned',updated_at=datetime('now') WHERE status='active' AND last_step!='complete' AND last_activity_at<=datetime('now',?) RETURNING id`).bind(`-${abandonMinutes} minutes`).all();

  const candidates=await env.DB.prepare(`SELECT s.id,s.session_key,s.customer_id,s.subtotal,s.cart_json,s.source_channel,c.full_name,c.phone,c.email,c.marketing_consent
    FROM checkout_sessions s JOIN customers c ON c.id=s.customer_id
    WHERE s.status='abandoned' AND s.recovery_allowed=1 AND c.marketing_consent=1
      AND NOT EXISTS(SELECT 1 FROM checkout_recovery_events e WHERE e.checkout_session_id=s.id AND e.event_type IN ('queued','sent','converted'))
    ORDER BY s.last_activity_at ASC LIMIT ?`).bind(limit).all();

  let queued=0,suppressed=0;
  for(const row of candidates.results||[]){
    if(!row.phone&&!row.email){
      await env.DB.batch([
        env.DB.prepare("INSERT INTO checkout_recovery_events(checkout_session_id,event_type,note) VALUES(?,'suppressed','ไม่มีช่องทางติดต่อที่รองรับ')").bind(row.id),
        env.DB.prepare("UPDATE checkout_sessions SET recovery_allowed=0,updated_at=datetime('now') WHERE id=?").bind(row.id)
      ]);suppressed++;continue;
    }
    let cart=[];try{cart=JSON.parse(row.cart_json||'[]')}catch{}
    const payload=JSON.stringify({checkoutSessionId:row.id,itemCount:Array.isArray(cart)?cart.reduce((n,x)=>n+Number(x.qty||0),0):0,subtotal:Number(row.subtotal||0),sourceChannel:row.source_channel||'direct',recoveryPath:'/?continue=cart'});
    await env.DB.batch([
      env.DB.prepare("INSERT INTO checkout_recovery_events(checkout_session_id,event_type,channel,note) VALUES(?,'queued',?,'ผ่าน marketing consent + recovery_allowed')").bind(row.id,channel),
      env.DB.prepare("INSERT INTO notification_outbox(customer_id,channel,template_key,payload_json,status) VALUES(?,?, 'checkout_recovery',?,'pending')").bind(row.customer_id,channel,payload)
    ]);queued++;
  }

  return json({ok:true,abandonMinutes,expireHours,markedAbandoned:(marked.results||[]).length,candidates:(candidates.results||[]).length,queued,suppressed,channel,providerConfigured:Boolean(env.NOTIFICATION_WEBHOOK_URL)});
}
