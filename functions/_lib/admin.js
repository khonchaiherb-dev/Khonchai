const enc=new TextEncoder();
export function adminAuthorized(request,env){
  const internal=String(request.headers.get('X-KCH-Internal-Admin')||'');
  const staffId=String(request.headers.get('X-KCH-Staff-Id')||'');
  const staffRole=String(request.headers.get('X-KCH-Staff-Role')||'');
  if(internal==='staff-session'&&/^\d+$/.test(staffId)&&staffRole.length>0)return true;
  if(String(env.LEGACY_ADMIN_ENABLED??'false').toLowerCase()!=='true')return false;
  const expected=String(env.ADMIN_TOKEN||'');
  const got=String(request.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');
  if(!expected||got.length!==expected.length)return false;
  let diff=0;for(let i=0;i<expected.length;i++)diff|=expected.charCodeAt(i)^got.charCodeAt(i);
  return diff===0;
}
export function json(data,status=200,headers={}){
  return Response.json(data,{status,headers:{'Cache-Control':'no-store',...headers}});
}
export const clean=(v,n=200)=>String(v??'').trim().slice(0,n);
export const money=n=>Math.round((Number(n)||0)*100)/100;
export async function audit(env,{action,entityType,entityId=null,metadata=null,actorId='admin'}){
  if(!env.DB)return;
  try{
    await env.DB.prepare("INSERT INTO audit_logs(actor_type,actor_id,action,entity_type,entity_id,metadata_json) VALUES('admin',?,?,?,?,?)")
      .bind(clean(actorId,80),clean(action,80),clean(entityType,80),entityId==null?null:clean(entityId,120),metadata==null?null:JSON.stringify(metadata).slice(0,8000)).run();
  }catch{}
}
export function safeSlug(v){
  const s=clean(v,100).toLowerCase();
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s)?s:null;
}
