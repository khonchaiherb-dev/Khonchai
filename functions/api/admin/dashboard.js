function json(data,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store'}})}
function authorized(request,env){if(!env.ADMIN_TOKEN)return false;const h=request.headers.get('Authorization')||'';return h===`Bearer ${env.ADMIN_TOKEN}`}
function dayLabel(date){return new Intl.DateTimeFormat('th-TH',{weekday:'short',timeZone:'Asia/Bangkok'}).format(new Date(`${date}T12:00:00+07:00`))}
export async function onRequestGet({env,request}){
  if(!env.ADMIN_TOKEN) return json({error:'admin_not_configured'},503);
  if(!authorized(request,env)) return json({error:'unauthorized'},401);
  if(!env.DB) return json({error:'database_not_bound'},503);
  const [revenue,pending,low,reviews,sales]=await Promise.all([
    env.DB.prepare("SELECT COALESCE(SUM(total),0) v,COUNT(*) c FROM orders WHERE date(created_at,'+7 hours')=date('now','+7 hours') AND status!='cancelled'").first(),
    env.DB.prepare("SELECT COUNT(*) c FROM orders WHERE status!='cancelled' AND fulfillment_status IN ('pending','packing')").first(),
    env.DB.prepare("SELECT COUNT(*) c FROM products WHERE active=1 AND stock<=low_stock_threshold").first(),
    env.DB.prepare("SELECT COUNT(*) c FROM reviews WHERE admin_replied_at IS NULL").first(),
    env.DB.prepare("WITH RECURSIVE days(d) AS (SELECT date('now','+7 hours','-6 day') UNION ALL SELECT date(d,'+1 day') FROM days WHERE d<date('now','+7 hours')) SELECT d date,COALESCE(SUM(o.total),0) revenue,COUNT(o.id) orders FROM days LEFT JOIN orders o ON date(o.created_at,'+7 hours')=d AND o.status!='cancelled' GROUP BY d ORDER BY d").all()
  ]);
  return json({revenueToday:Number(revenue?.v||0),ordersToday:Number(revenue?.c||0),pendingShipments:Number(pending?.c||0),lowStock:Number(low?.c||0),pendingReviews:Number(reviews?.c||0),sales7d:(sales.results||[]).map(x=>({date:x.date,label:dayLabel(x.date),revenue:Number(x.revenue||0),orders:Number(x.orders||0)}))});
}
