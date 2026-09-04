import {sha256Hex,hitRateLimit,securityEvent,json,tableExists} from '../_lib/staff-auth.js';
function policy(path,method){if(method!=='POST'&&method!=='PUT'&&method!=='PATCH'&&method!=='DELETE')return null;if(path==='/api/orders')return ['orders-create',20,600];if(path==='/api/customer/request-code')return ['customer-otp',6,600];if(path==='/api/staff/login')return ['staff-login',10,600];if(path==='/api/reviews')return ['reviews-write',20,3600];if(path==='/api/commerce-event')return ['commerce-events',300,3600];return ['api-write',240,600]}
const production=env=>String(env.ENVIRONMENT||'').toLowerCase()==='production'||String(env.PRODUCTION_MODE||'').toLowerCase()==='true';
const enabled=v=>String(v??'').toLowerCase()==='true';
const stable=v=>{if(v===null||typeof v!=='object')return JSON.stringify(v);if(Array.isArray(v))return `[${v.map(stable).join(',')}]`;return `{${Object.keys(v).sort().map(k=>`${JSON.stringify(k)}:${stable(v[k])}`).join(',')}}`};
function withRequestId(response,requestId){const headers=new Headers(response.headers);headers.set('X-Request-ID',requestId);return new Response(response.body,{status:response.status,statusText:response.statusText,headers})}
async function orderGuard(request,env,url,requestId){
  if(request.method!=='POST'||url.pathname!=='/api/orders')return null;
  if(!enabled(env.CHECKOUT_ENABLED))return {response:json({error:'checkout_disabled',requestId},503)};
  if(!enabled(env.COD_ENABLED))return {response:json({error:'cod_disabled',requestId},503)};
  if(!env.DB)return {response:json({error:'database_not_bound',requestId},503)};
  const max=Math.max(4096,Math.min(262144,Number(env.ORDER_MAX_BODY_BYTES||32768))),raw=await request.clone().text();
  if(new TextEncoder().encode(raw).byteLength>max)return {response:json({error:'request_too_large',requestId},413)};
  let body;try{body=JSON.parse(raw)}catch{return {response:json({error:'invalid_json',requestId},400)}}
  const key=String(body?.idempotencyKey||'').trim().slice(0,100),required=production(env)||String(env.ORDER_IDEMPOTENCY_REQUIRED||'').toLowerCase()==='true';
  if(required&&!key)return {response:json({error:'idempotency_key_required',requestId},428)};
  if(!key)return {body};
  const ready=await tableExists(env,'order_request_registry');if(required&&!ready)return {response:json({error:'order_resilience_not_ready',requestId},503)};if(!ready)return {body};
  const canonical={...body};delete canonical.idempotencyKey;const fingerprint=await sha256Hex(stable(canonical));
  let row=await env.DB.prepare("SELECT request_fingerprint,order_no,reuse_count,conflict_count FROM order_request_registry WHERE idempotency_key=?").bind(key).first();
  if(row&&row.request_fingerprint!==fingerprint){await env.DB.prepare("UPDATE order_request_registry SET conflict_count=conflict_count+1,last_seen_at=datetime('now') WHERE idempotency_key=?").bind(key).run();return {response:json({error:'idempotency_conflict',requestId},409)}}
  if(!row){await env.DB.prepare("INSERT OR IGNORE INTO order_request_registry(idempotency_key,request_fingerprint) VALUES(?,?)").bind(key,fingerprint).run();row=await env.DB.prepare("SELECT request_fingerprint,order_no,reuse_count,conflict_count FROM order_request_registry WHERE idempotency_key=?").bind(key).first();if(row&&row.request_fingerprint!==fingerprint){await env.DB.prepare("UPDATE order_request_registry SET conflict_count=conflict_count+1,last_seen_at=datetime('now') WHERE idempotency_key=?").bind(key).run();return {response:json({error:'idempotency_conflict',requestId},409)}}}
  else await env.DB.prepare("UPDATE order_request_registry SET reuse_count=reuse_count+1,last_seen_at=datetime('now') WHERE idempotency_key=?").bind(key).run();
  return {body,key,fingerprint};
}
export async function onRequest(context){
  const {request,env}=context,url=new URL(request.url),p=policy(url.pathname,request.method),requestId=crypto.randomUUID();
  try{
    const contentLength=Number(request.headers.get('Content-Length')||0),genericMax=Math.max(8192,Math.min(1048576,Number(env.API_MAX_BODY_BYTES||131072)));if(contentLength>genericMax)return withRequestId(json({error:'request_too_large',requestId},413),requestId);
    const guard=await orderGuard(request,env,url,requestId);if(guard?.response)return withRequestId(guard.response,requestId);
    if(p&&env.DB){
      const rawIp=request.headers.get('CF-Connecting-IP')||'',ua=(request.headers.get('User-Agent')||'').slice(0,160),pepper=String(env.RATE_LIMIT_PEPPER||env.ADMIN_TOKEN||'');
      if(!pepper&&production(env))return withRequestId(json({error:'rate_limit_secret_not_configured',requestId},503),requestId);
      const fp=await sha256Hex(`${pepper||url.host}|${rawIp}|${ua}`),r=await hitRateLimit(env,{scope:p[0],fingerprint:fp,limit:p[1],windowSeconds:p[2]});
      if(!r.allowed){context.waitUntil(securityEvent(env,{eventType:'rate_limit_block',severity:'warning',route:url.pathname,method:request.method,statusCode:429,detail:{scope:p[0],hits:r.hits,requestId}}));return withRequestId(json({error:'too_many_requests',requestId},429,{'Retry-After':String(r.retryAfter)}),requestId)}
    }
    const headers=new Headers(request.headers);headers.set('X-KCH-Request-ID',requestId);const forwarded=new Request(request,{headers});let response=await context.next(forwarded);
    if(guard?.key&&response.status<400&&env.DB){try{const data=await response.clone().json();if(data?.orderNo)await env.DB.prepare("UPDATE order_request_registry SET order_no=COALESCE(order_no,?),last_seen_at=datetime('now') WHERE idempotency_key=? AND request_fingerprint=?").bind(String(data.orderNo).slice(0,100),guard.key,guard.fingerprint).run()}catch{}}
    return withRequestId(response,requestId);
  }catch(err){context.waitUntil(securityEvent(env,{eventType:'api_unhandled_error',severity:'critical',route:url.pathname,method:request.method,statusCode:500,detail:{name:String(err?.name||'Error'),requestId}}));return withRequestId(json({error:'internal_error',requestId},500),requestId)}
}
