function json(data,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store'}})}
export async function onRequestGet({env}){
  if(!env.DB) return json({coupons:[{code:'WELCOME50',type:'fixed',value:50,min_spend:499},{code:'HERB10',type:'percent',value:10,min_spend:799}]});
  const r=await env.DB.prepare("SELECT code,type,value,min_spend,max_discount,new_customer_only FROM coupons WHERE active=1 AND code NOT LIKE 'RVW%' AND (starts_at IS NULL OR starts_at<=datetime('now')) AND (ends_at IS NULL OR ends_at>=datetime('now'))").all();
  return json({coupons:r.results||[]});
}
export async function onRequestPost({request,env}){
  const body=await request.json().catch(()=>({}));
  const code=String(body.code||'').trim().toUpperCase();
  const subtotal=Number(body.subtotal||0);
  if(!code || subtotal<0) return json({error:'invalid_request'},400);
  if(code.startsWith('RVW'))return json({valid:false,error:'private_coupon'},403);
  let c;
  if(env.DB) c=await env.DB.prepare("SELECT code,type,value,min_spend,max_discount,new_customer_only FROM coupons WHERE code=? AND active=1").bind(code).first();
  else c=code==='WELCOME50'?{code,type:'fixed',value:50,min_spend:499,max_discount:50}:null;
  if(!c) return json({valid:false,error:'coupon_not_found'},404);
  if(subtotal<Number(c.min_spend||0)) return json({valid:false,error:'minimum_not_met',minSpend:Number(c.min_spend||0)},400);
  let discount=c.type==='percent'?subtotal*(Number(c.value)/100):Number(c.value);
  if(c.max_discount!=null) discount=Math.min(discount,Number(c.max_discount));
  discount=Math.max(0,Math.min(discount,subtotal));
  return json({valid:true,code:c.code,discount});
}
