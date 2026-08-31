export async function onRequestGet({env,request}){
  const url=new URL(request.url),q=(url.searchParams.get('q')||'').trim();
  if(!env.DB)return Response.json({products:[],note:'Bind D1 as DB in Cloudflare Pages settings'});
  let sql=`SELECT p.id,p.slug,p.sku,p.name,p.description,p.category,p.price,p.compare_at_price,p.rating,p.sold_count,
    CASE WHEN EXISTS(SELECT 1 FROM product_variants vx WHERE vx.product_id=p.id AND vx.active=1)
      THEN COALESCE((SELECT SUM(MAX(0,v.stock-COALESCE(v.reserved_stock,0))) FROM product_variants v WHERE v.product_id=p.id AND v.active=1),0)
      ELSE MAX(0,p.stock-COALESCE(p.reserved_stock,0)) END stock,
    p.featured,
    (SELECT '/media/product?key='||m.object_key FROM product_media m WHERE m.product_id=p.id AND m.active=1 ORDER BY m.sort_order,m.id LIMIT 1) image_url
    FROM products p WHERE p.active=1`;
  const binds=[];
  if(q){sql+=' AND (p.name LIKE ? OR p.category LIKE ? OR p.sku LIKE ?)';const x=`%${q}%`;binds.push(x,x,x)}
  sql+=' ORDER BY p.featured DESC,p.sold_count DESC LIMIT 100';
  const stmt=env.DB.prepare(sql),r=binds.length?await stmt.bind(...binds).all():await stmt.all();
  return Response.json({products:r.results||[]},{headers:{'Cache-Control':'public, max-age=60'}});
}
