function json(data,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store'}})}
function authorized(request,env){if(!env.ADMIN_TOKEN)return false;return (request.headers.get('Authorization')||'')===`Bearer ${env.ADMIN_TOKEN}`}
export async function onRequestGet({env,request}){
  if(!env.ADMIN_TOKEN) return json({error:'admin_not_configured'},503);
  if(!authorized(request,env)) return json({error:'unauthorized'},401);
  if(!env.DB) return json({error:'database_not_bound'},503);
  const url=new URL(request.url),limit=Math.max(1,Math.min(100,Number(url.searchParams.get('limit'))||20)),status=(url.searchParams.get('status')||'').trim();
  let sql="SELECT order_no,customer_name,total,payment_method,payment_status,fulfillment_status,status,created_at FROM orders";const binds=[];
  if(status){sql+=' WHERE status=? OR fulfillment_status=?';binds.push(status,status)}
  sql+=' ORDER BY id DESC LIMIT ?';binds.push(limit);
  const r=await env.DB.prepare(sql).bind(...binds).all();
  return json({orders:r.results||[]});
}
