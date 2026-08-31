import {json,getStaffSession,verifyStaffCsrf,securityEvent,randomHex,tableExists} from '../../_lib/staff-auth.js';
async function ensureRefs(env,staffUserId){
  const rows=(await env.DB.prepare(`SELECT s.token_hash FROM staff_sessions s LEFT JOIN staff_session_meta m ON m.token_hash=s.token_hash WHERE s.staff_user_id=? AND s.revoked_at IS NULL AND s.expires_at>datetime('now') AND m.token_hash IS NULL`).bind(staffUserId).all()).results||[];
  for(const r of rows){try{await env.DB.prepare("INSERT INTO staff_session_meta(token_hash,session_ref,csrf_token_hash,device_label) VALUES(?,?,?,'Legacy browser session')").bind(r.token_hash,randomHex(12),'').run()}catch{}}
}
export async function onRequestGet({request,env}){
  const s=await getStaffSession(request,env);if(!s)return json({error:'staff_auth_required'},401);if(!(await tableExists(env,'staff_session_meta')))return json({error:'session_security_migration_required'},503);
  await ensureRefs(env,s.id);
  const rows=await env.DB.prepare(`SELECT m.session_ref,m.device_label,ss.created_at,ss.last_seen_at,ss.expires_at,ss.revoked_at,CASE WHEN ss.token_hash=? THEN 1 ELSE 0 END current_session
    FROM staff_sessions ss JOIN staff_session_meta m ON m.token_hash=ss.token_hash WHERE ss.staff_user_id=? AND ss.revoked_at IS NULL AND ss.expires_at>datetime('now') ORDER BY current_session DESC,ss.last_seen_at DESC`).bind(s.tokenHash,s.id).all();
  return json({sessions:rows.results||[]});
}
export async function onRequestPost({request,env}){
  const s=await getStaffSession(request,env,{touch:false});if(!s)return json({error:'staff_auth_required'},401);const csrf=await verifyStaffCsrf(request,env,s);if(csrf===null)return json({error:'session_security_migration_required'},503);if(!csrf)return json({error:'csrf_invalid'},403);
  const b=await request.json().catch(()=>({})),action=String(b.action||''),sessionRef=String(b.sessionRef||'').trim();
  if(action==='revoke_others'){const r=await env.DB.prepare("UPDATE staff_sessions SET revoked_at=datetime('now') WHERE staff_user_id=? AND token_hash<>? AND revoked_at IS NULL").bind(s.id,s.tokenHash).run();await securityEvent(env,{staffUserId:s.id,eventType:'staff_sessions_revoked',route:'/api/staff/sessions',method:'POST',statusCode:200,detail:{scope:'others',changes:Number(r.meta?.changes||0)}});return json({ok:true,revoked:Number(r.meta?.changes||0)})}
  if(action!=='revoke'||sessionRef.length<8)return json({error:'invalid_request'},400);
  const target=await env.DB.prepare(`SELECT ss.token_hash FROM staff_sessions ss JOIN staff_session_meta m ON m.token_hash=ss.token_hash WHERE ss.staff_user_id=? AND m.session_ref=? AND ss.revoked_at IS NULL`).bind(s.id,sessionRef).first();if(!target)return json({error:'session_not_found'},404);
  const current=target.token_hash===s.tokenHash;await env.DB.prepare("UPDATE staff_sessions SET revoked_at=datetime('now') WHERE token_hash=?").bind(target.token_hash).run();await securityEvent(env,{staffUserId:s.id,eventType:'staff_session_revoked',route:'/api/staff/sessions',method:'POST',statusCode:200,detail:{current}});
  return json({ok:true,current},200,current?{'Set-Cookie':'kch_staff=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0'}:{});
}
