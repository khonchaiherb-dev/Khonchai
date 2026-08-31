import {sha256Hex,hitRateLimit,securityEvent,json} from '../_lib/staff-auth.js';
function policy(path,method){if(method!=='POST'&&method!=='PUT'&&method!=='PATCH'&&method!=='DELETE')return null;if(path==='/api/orders')return ['orders-create',20,600];if(path==='/api/customer/request-code')return ['customer-otp',6,600];if(path==='/api/staff/login')return ['staff-login',10,600];if(path==='/api/reviews')return ['reviews-write',20,3600];if(path==='/api/commerce-event')return ['commerce-events',300,3600];return ['api-write',240,600]}
export async function onRequest(context){
  const {request,env}=context,url=new URL(request.url),p=policy(url.pathname,request.method);
  try{
    if(p&&env.DB){const rawIp=request.headers.get('CF-Connecting-IP')||'',ua=(request.headers.get('User-Agent')||'').slice(0,160),pepper=String(env.RATE_LIMIT_PEPPER||'kch-rate-v1'),fp=await sha256Hex(`${pepper}|${rawIp}|${ua}`),r=await hitRateLimit(env,{scope:p[0],fingerprint:fp,limit:p[1],windowSeconds:p[2]});if(!r.allowed){context.waitUntil(securityEvent(env,{eventType:'rate_limit_block',severity:'warning',route:url.pathname,method:request.method,statusCode:429,detail:{scope:p[0],hits:r.hits}}));return json({error:'too_many_requests'},429,{'Retry-After':String(r.retryAfter)})}}
    return await context.next();
  }catch(err){context.waitUntil(securityEvent(env,{eventType:'api_unhandled_error',severity:'critical',route:url.pathname,method:request.method,statusCode:500,detail:{name:String(err?.name||'Error')}}));return json({error:'internal_error'},500)}
}
