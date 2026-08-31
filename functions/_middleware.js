import {getCustomer} from './_lib/customer-auth.js';
const digits=s=>String(s||'').replace(/\D/g,'');
const phoneVariants=s=>{const d=digits(s);if(d.startsWith('66')&&d.length>=11)return [`0${d.slice(2)}`,d];if(d.startsWith('0')&&d.length>=9)return [d,`66${d.slice(1)}`];return [d,d]};
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function onRequest({request,env,next}){
  const u=new URL(request.url);
  if(request.method!=='POST'||u.pathname!=='/api/orders')return next();
  const body=await request.clone().json().catch(()=>null),code=String(body?.couponCode||'').trim().toUpperCase(),m=code.match(/^RVW(\d+)-[A-Z0-9]{12}$/);
  if(!m||!env.DB)return next();
  let customerId=null;
  const session=await getCustomer(request,env).catch(()=>null);if(session?.customer_id)customerId=Number(session.customer_id);
  if(!customerId){const [local,intl]=phoneVariants(body?.phone);if(local){const c=await env.DB.prepare("SELECT id FROM customers WHERE phone IN (?,?) ORDER BY id DESC LIMIT 1").bind(local,intl).first();customerId=Number(c?.id)||null}}
  const review=await env.DB.prepare("SELECT customer_id,reward_coupon_issued FROM reviews WHERE id=?").bind(Number(m[1])).first();
  if(!customerId||!review||!Number(review.reward_coupon_issued)||Number(review.customer_id)!==customerId)return json({error:'coupon_not_eligible'},400);
  return next();
}
