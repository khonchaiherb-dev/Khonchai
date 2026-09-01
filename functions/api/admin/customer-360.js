import {adminAuthorized,json} from '../../_lib/admin.js';

const n=v=>Number(v||0);
const money=v=>Math.round(n(v)*100)/100;

export async function onRequestGet({request,env}){
  if(!adminAuthorized(request,env))return json({error:'unauthorized'},401);
  if(!env.DB)return json({error:'database_not_bound'},503);
  const u=new URL(request.url),limit=Math.min(200,Math.max(10,Number(u.searchParams.get('limit')||80)));
  const q=String(u.searchParams.get('q')||'').trim().slice(0,80),like=`%${q}%`;
  const rows=await env.DB.prepare(`SELECT c.id,c.full_name,c.phone,c.email,c.marketing_consent,c.created_at,c.last_login_at,
      COUNT(DISTINCT o.id) order_count,
      COALESCE(SUM(CASE WHEN o.payment_status IN ('paid','cod_collected') THEN o.total ELSE 0 END),0) lifetime_value,
      COALESCE(AVG(CASE WHEN o.payment_status IN ('paid','cod_collected') THEN o.total END),0) avg_order_value,
      MIN(o.created_at) first_order_at,MAX(o.created_at) last_order_at,
      COUNT(DISTINCT r.id) review_count,
      COUNT(DISTINCT f.product_id) favorite_count,
      COUNT(DISTINCT rp.product_id) recent_product_count
    FROM customers c
    LEFT JOIN orders o ON o.customer_id=c.id
    LEFT JOIN reviews r ON r.customer_id=c.id
    LEFT JOIN customer_favorites f ON f.customer_id=c.id
    LEFT JOIN customer_recent_products rp ON rp.customer_id=c.id
    WHERE (?='' OR COALESCE(c.full_name,'') LIKE ? OR COALESCE(c.phone,'') LIKE ? OR COALESCE(c.email,'') LIKE ?)
    GROUP BY c.id
    ORDER BY lifetime_value DESC,last_order_at DESC,c.id DESC
    LIMIT ?`).bind(q,like,like,like,limit).all();

  const customers=(rows.results||[]).map(x=>{
    const orderCount=n(x.order_count),ltv=money(x.lifetime_value),daysSince=x.last_order_at?Math.floor((Date.now()-Date.parse(x.last_order_at))/86400000):null;
    let segment='new';
    if(orderCount>=5||ltv>=5000)segment='vip';
    else if(orderCount>=2)segment='repeat';
    else if(orderCount===1&&daysSince!=null&&daysSince>90)segment='at_risk';
    else if(orderCount===1)segment='first_order';
    return {id:n(x.id),name:x.full_name||'',phone:x.phone||'',email:x.email||'',marketingConsent:Boolean(n(x.marketing_consent)),createdAt:x.created_at||null,lastLoginAt:x.last_login_at||null,orderCount,lifetimeValue:ltv,avgOrderValue:money(x.avg_order_value),firstOrderAt:x.first_order_at||null,lastOrderAt:x.last_order_at||null,daysSinceLastOrder:daysSince,reviewCount:n(x.review_count),favoriteCount:n(x.favorite_count),recentProductCount:n(x.recent_product_count),segment};
  });
  const summary=customers.reduce((a,c)=>{a.total++;a.lifetimeValue+=c.lifetimeValue;a[c.segment]=(a[c.segment]||0)+1;return a},{total:0,lifetimeValue:0,vip:0,repeat:0,first_order:0,at_risk:0,new:0});
  summary.lifetimeValue=money(summary.lifetimeValue);
  return json({customers,summary});
}
