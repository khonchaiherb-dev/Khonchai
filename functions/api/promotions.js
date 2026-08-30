function json(data,status=200){return Response.json(data,{status,headers:{'Cache-Control':'public, max-age=30'}})}
export async function onRequestGet({env}){
  if(!env.DB)return json({error:'database_not_bound'},503);
  const r=await env.DB.prepare("SELECT code,name,type,value,min_spend,max_discount,stack_with_coupon,priority,starts_at,ends_at FROM promotions WHERE active=1 AND (starts_at IS NULL OR starts_at<=datetime('now')) AND (ends_at IS NULL OR ends_at>=datetime('now')) AND (usage_limit IS NULL OR used_count<usage_limit) ORDER BY priority DESC,id ASC").all();
  return json({serverTime:new Date().toISOString(),promotions:(r.results||[]).map(x=>({code:x.code,name:x.name,type:x.type,value:Number(x.value||0),minSpend:Number(x.min_spend||0),maxDiscount:x.max_discount==null?null:Number(x.max_discount),stackWithCoupon:Boolean(Number(x.stack_with_coupon)),priority:Number(x.priority||0),startsAt:x.starts_at||null,endsAt:x.ends_at||null}))});
}
