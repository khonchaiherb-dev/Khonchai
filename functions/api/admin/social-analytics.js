function json(data,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store'}})}
function authorized(request,env){if(!env.ADMIN_TOKEN)return false;return (request.headers.get('Authorization')||'')===`Bearer ${env.ADMIN_TOKEN}`}
export async function onRequestGet({env,request}){
  if(!env.ADMIN_TOKEN)return json({error:'admin_not_configured'},503);if(!authorized(request,env))return json({error:'unauthorized'},401);if(!env.DB)return json({error:'database_not_bound'},503);
  const [funnel,sources,contents,creators]=await Promise.all([
    env.DB.prepare("SELECT event_type,COUNT(*) count FROM commerce_events WHERE created_at>=datetime('now','-30 day') GROUP BY event_type").all(),
    env.DB.prepare("SELECT source_channel source,COUNT(*) orders,COALESCE(SUM(total),0) revenue FROM orders WHERE status!='cancelled' AND created_at>=datetime('now','-30 day') GROUP BY source_channel ORDER BY revenue DESC").all(),
    env.DB.prepare("SELECT sc.id,sc.title,sc.content_type type,COUNT(CASE WHEN ce.event_type='content_view' THEN 1 END) views,COUNT(CASE WHEN ce.event_type='product_pin_click' THEN 1 END) product_clicks,COUNT(CASE WHEN ce.event_type='add_to_cart' THEN 1 END) adds,COUNT(CASE WHEN ce.event_type='purchase' THEN 1 END) purchases FROM social_contents sc LEFT JOIN commerce_events ce ON ce.content_id=sc.id AND ce.created_at>=datetime('now','-30 day') GROUP BY sc.id ORDER BY purchases DESC,product_clicks DESC,views DESC LIMIT 10").all(),
    env.DB.prepare("SELECT c.id,c.display_name name,c.handle,COUNT(o.id) orders,COALESCE(SUM(CASE WHEN o.status!='cancelled' THEN o.total ELSE 0 END),0) revenue FROM creators c LEFT JOIN orders o ON o.creator_id=c.id AND o.created_at>=datetime('now','-30 day') WHERE c.active=1 GROUP BY c.id ORDER BY revenue DESC,orders DESC").all()
  ]);
  const fm=Object.fromEntries((funnel.results||[]).map(x=>[x.event_type,Number(x.count||0)]));
  return json({periodDays:30,funnel:{contentViews:fm.content_view||0,productClicks:fm.product_pin_click||0,addsToCart:fm.add_to_cart||0,checkoutStarts:fm.checkout_start||0,purchases:fm.purchase||0},sources:(sources.results||[]).map(x=>({...x,orders:Number(x.orders||0),revenue:Number(x.revenue||0)})),contents:(contents.results||[]).map(x=>({...x,views:Number(x.views||0),product_clicks:Number(x.product_clicks||0),adds:Number(x.adds||0),purchases:Number(x.purchases||0)})),creators:(creators.results||[]).map(x=>({...x,orders:Number(x.orders||0),revenue:Number(x.revenue||0)}))});
}
