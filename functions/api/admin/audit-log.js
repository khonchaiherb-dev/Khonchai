import {adminAuthorized,json} from '../../_lib/admin.js';
export async function onRequestGet({request,env}){
  if(!adminAuthorized(request,env))return json({error:'unauthorized'},401);
  const u=new URL(request.url),limit=Math.min(200,Math.max(1,Number(u.searchParams.get('limit'))||80)),entity=String(u.searchParams.get('entity')||'').trim();
  let sql="SELECT id,actor_type,actor_id,action,entity_type,entity_id,metadata_json,created_at FROM audit_logs",binds=[];
  if(entity){sql+=" WHERE entity_type=?";binds.push(entity)}
  sql+=" ORDER BY id DESC LIMIT ?";binds.push(limit);
  const r=await env.DB.prepare(sql).bind(...binds).all();
  return json({logs:r.results||[]});
}
