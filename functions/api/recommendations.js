function json(data,status=200){return Response.json(data,{status,headers:{'Cache-Control':'public, max-age=45'}})}
const norm=s=>String(s||'').trim().toLowerCase();
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export async function onRequestGet({request,env}){
  if(!env.DB)return json({error:'database_not_bound'},503);
  const u=new URL(request.url),q=norm(u.searchParams.get('q')),productId=Number(u.searchParams.get('productId'))||0,category=norm(u.searchParams.get('category')),limit=clamp(Number(u.searchParams.get('limit'))||10,1,20);
  const r=await env.DB.prepare(`SELECT p.id,p.slug,p.sku,p.name,p.description,p.category,p.price,p.compare_at_price,p.rating,p.sold_count,p.stock,p.featured,
    COALESCE(e.content_views,0) content_views,COALESCE(e.product_clicks,0) product_clicks,COALESCE(e.adds_to_cart,0) adds_to_cart,COALESCE(e.purchases,0) purchases
    FROM products p
    LEFT JOIN (
      SELECT product_id,
        SUM(CASE WHEN event_type='content_view' THEN 1 ELSE 0 END) content_views,
        SUM(CASE WHEN event_type='product_pin_click' THEN 1 ELSE 0 END) product_clicks,
        SUM(CASE WHEN event_type='add_to_cart' THEN 1 ELSE 0 END) adds_to_cart,
        SUM(CASE WHEN event_type='purchase' THEN 1 ELSE 0 END) purchases
      FROM commerce_events
      WHERE created_at>=datetime('now','-30 day') AND product_id IS NOT NULL
      GROUP BY product_id
    ) e ON e.product_id=p.id
    WHERE p.active=1 AND p.sale_verified=1 AND p.price>0 AND MAX(0,p.stock-COALESCE(p.reserved_stock,0))>0
      AND EXISTS(SELECT 1 FROM product_media m WHERE m.product_id=p.id AND m.active=1)
    LIMIT 200`).all();
  const rows=r.results||[];
  const current=productId?rows.find(x=>Number(x.id)===productId):null,currentCategory=norm(current?.category);
  const tokens=q.split(/\s+/).filter(Boolean);
  const scored=rows.filter(x=>Number(x.id)!==productId).map(x=>{
    const text=norm(`${x.name} ${x.description||''} ${x.category||''} ${x.sku||''}`);
    let score=0;
    if(tokens.length){for(const t of tokens){if(norm(x.name).includes(t))score+=45;if(norm(x.category).includes(t))score+=20;if(text.includes(t))score+=10}}
    if(category&&norm(x.category)===category)score+=30;
    if(currentCategory&&norm(x.category)===currentCategory)score+=34;
    score+=Number(x.featured||0)*12+Number(x.rating||0)*4+Math.min(25,Number(x.sold_count||0)/100);
    score+=Math.min(20,Number(x.product_clicks||0)*.25)+Math.min(25,Number(x.adds_to_cart||0)*.5)+Math.min(35,Number(x.purchases||0)*2);
    return {...x,score:Math.round(score*100)/100};
  }).sort((a,b)=>b.score-a.score||Number(b.sold_count)-Number(a.sold_count)).slice(0,limit);
  return json({query:q||null,productId:productId||null,category:category||null,products:scored.map(x=>({id:Number(x.id),slug:x.slug,sku:x.sku,name:x.name,description:x.description,category:x.category,price:Number(x.price),compareAtPrice:x.compare_at_price==null?null:Number(x.compare_at_price),rating:Number(x.rating||0),soldCount:Number(x.sold_count||0),stock:Number(x.stock||0),featured:Boolean(Number(x.featured)),score:x.score}))});
}
