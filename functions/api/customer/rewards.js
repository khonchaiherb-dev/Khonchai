import {json,getCustomer} from '../../_lib/customer-auth.js';
export async function onRequestGet({request,env}){
  const c=await getCustomer(request,env);if(!c)return json({error:'unauthorized'},401);
  if(!env.DB)return json({error:'database_not_bound'},503);
  const r=await env.DB.prepare(`SELECT c.code,c.type,c.value,c.min_spend,c.max_discount,c.usage_limit,c.used_count,c.active,c.starts_at,c.ends_at,
      r.id review_id,r.product_id,r.created_at review_created_at,p.name product_name,
      cr.created_at redeemed_at,ro.order_no redeemed_order_no,
      CASE
        WHEN cr.id IS NOT NULL OR (c.usage_limit IS NOT NULL AND c.used_count>=c.usage_limit) THEN 'used'
        WHEN c.active!=1 OR (c.ends_at IS NOT NULL AND c.ends_at<datetime('now')) THEN 'expired'
        WHEN c.starts_at IS NOT NULL AND c.starts_at>datetime('now') THEN 'scheduled'
        ELSE 'active'
      END reward_status
    FROM reviews r
    JOIN coupons c ON c.code LIKE ('RVW' || r.id || '-%')
    LEFT JOIN products p ON p.id=r.product_id
    LEFT JOIN coupon_redemptions cr ON cr.coupon_id=c.id AND cr.customer_id=r.customer_id
    LEFT JOIN orders ro ON ro.id=cr.order_id
    WHERE r.customer_id=? AND r.reward_coupon_issued=1
    ORDER BY r.id DESC,c.id DESC`).bind(c.customer_id).all();
  const rewards=(r.results||[]).map(x=>({code:x.code,type:x.type,value:Number(x.value||0),minSpend:Number(x.min_spend||0),maxDiscount:x.max_discount==null?null:Number(x.max_discount),usageLimit:x.usage_limit==null?null:Number(x.usage_limit),usedCount:Number(x.used_count||0),status:x.reward_status,startsAt:x.starts_at||null,expiresAt:x.ends_at||null,reviewId:Number(x.review_id),productId:Number(x.product_id),productName:x.product_name||'สินค้า KHONCHAIHERB',reviewCreatedAt:x.review_created_at||null,redeemedAt:x.redeemed_at||null,redeemedOrderNo:x.redeemed_order_no||null}));
  const active=rewards.filter(x=>x.status==='active'),used=rewards.filter(x=>x.status==='used'),expired=rewards.filter(x=>x.status==='expired');
  return json({rewards,summary:{active:active.length,used:used.length,expired:expired.length,activeValue:active.reduce((s,x)=>s+Number(x.value||0),0)}});
}
