import {json,sameOrigin,safeUsername,derivePassword,randomToken,sha256Hex,securityEvent} from '../../_lib/staff-auth.js';
const maxAge=28800;
export async function onRequestPost({request,env}){
  if(!sameOrigin(request))return json({error:'invalid_origin'},403);if(!env.DB)return json({error:'database_not_bound'},503);
  const b=await request.json().catch(()=>({})),username=safeUsername(b.username),password=String(b.password||'').slice(0,200);if(!username||password.length<1)return json({error:'invalid_credentials'},401);
  const u=await env.DB.prepare(`SELECT id,username,display_name,role,password_hash,password_salt,password_iterations,active,failed_login_count,locked_until,
    CASE WHEN locked_until IS NOT NULL AND locked_until>datetime('now') THEN 1 ELSE 0 END locked
    FROM staff_users WHERE username=? COLLATE NOCASE`).bind(username).first();
  if(!u||!Number(u.active)){await securityEvent(env,{eventType:'staff_login_failed',severity:'warning',route:'/api/staff/login',method:'POST',statusCode:401,detail:{reason:'invalid_credentials'}});return json({error:'invalid_credentials'},401)}
  if(Number(u.locked))return json({error:'account_temporarily_locked'},423);
  const hash=await derivePassword(password,u.password_salt,Number(u.password_iterations));
  if(hash!==u.password_hash){const failed=Number(u.failed_login_count||0)+1,lock=failed>=5;await env.DB.prepare(`UPDATE staff_users SET failed_login_count=?,locked_until=${lock?"datetime('now','+15 minutes')":"NULL"},updated_at=datetime('now') WHERE id=?`).bind(failed,u.id).run();await securityEvent(env,{staffUserId:u.id,eventType:'staff_login_failed',severity:'warning',route:'/api/staff/login',method:'POST',statusCode:401,detail:{failedAttempts:failed,locked:lock}});return json({error:lock?'account_temporarily_locked':'invalid_credentials'},lock?423:401)}
  const token=randomToken(32),tokenHash=await sha256Hex(token),ttl=Math.min(43200,Math.max(1800,Number(env.STAFF_SESSION_SECONDS||maxAge))),expires=new Date(Date.now()+ttl*1000).toISOString().slice(0,19).replace('T',' ');
  await env.DB.batch([env.DB.prepare("UPDATE staff_users SET failed_login_count=0,locked_until=NULL,last_login_at=datetime('now'),updated_at=datetime('now') WHERE id=?").bind(u.id),env.DB.prepare("INSERT INTO staff_sessions(token_hash,staff_user_id,expires_at) VALUES(?,?,?)").bind(tokenHash,u.id,expires),env.DB.prepare("UPDATE staff_sessions SET revoked_at=COALESCE(revoked_at,datetime('now')) WHERE staff_user_id=? AND expires_at<=datetime('now') AND revoked_at IS NULL").bind(u.id)]);
  await securityEvent(env,{staffUserId:u.id,eventType:'staff_login_success',route:'/api/staff/login',method:'POST',statusCode:200});
  return json({ok:true,staff:{id:u.id,username:u.username,displayName:u.display_name,role:u.role}},200,{'Set-Cookie':`kch_staff=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${ttl}`});
}
