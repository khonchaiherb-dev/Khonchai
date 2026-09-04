const json=(data,status=200,cache='no-store')=>Response.json(data,{status,headers:{'Cache-Control':cache}});

function schemaHint(error){
  const msg=String(error?.message||error||'');
  const lower=msg.toLowerCase();
  if(lower.includes('no such table: products'))return {migration:'0001',missing:'products'};
  if(lower.includes('no such table: product_variants'))return {migration:'0008',missing:'product_variants'};
  if(lower.includes('no such table: product_media'))return {migration:'0008',missing:'product_media'};
  if(lower.includes('no such column: reserved_stock')||lower.includes('no such column: v.reserved_stock')||lower.includes('no such column: p.reserved_stock'))return {migration:'0009',missing:'reserved_stock'};
  if(lower.includes('no such column: sale_verified')||lower.includes('no such column: p.sale_verified'))return {migration:'0018',missing:'sale_verified'};
  return {migration:null,missing:null};
}

export async function onRequestGet({env,request}){
  const url=new URL(request.url),q=(url.searchParams.get('q')||'').trim().slice(0,100);
  if(!env.DB)return json({products:[],ready:false,error:'database_not_bound',action:'Bind the production D1 database as DB in Cloudflare Pages.'},503);

  let sql=`SELECT p.id,p.slug,p.sku,p.name,p.description,p.category,p.price,p.compare_at_price,p.rating,p.sold_count,
    CASE WHEN EXISTS(SELECT 1 FROM product_variants vx WHERE vx.product_id=p.id AND vx.active=1)
      THEN COALESCE((SELECT SUM(MAX(0,v.stock-COALESCE(v.reserved_stock,0))) FROM product_variants v WHERE v.product_id=p.id AND v.active=1),0)
      ELSE MAX(0,p.stock-COALESCE(p.reserved_stock,0)) END stock,
    p.featured,p.sale_verified,
    (SELECT '/media/product?key='||m.object_key FROM product_media m WHERE m.product_id=p.id AND m.active=1 ORDER BY m.sort_order,m.id LIMIT 1) image_url
    FROM products p WHERE p.active=1 AND p.sale_verified=1 AND p.price>0`;
  const binds=[];
  if(q){sql+=' AND (p.name LIKE ? OR p.category LIKE ? OR p.sku LIKE ?)';const x=`%${q}%`;binds.push(x,x,x)}
  sql+=` AND (CASE WHEN EXISTS(SELECT 1 FROM product_variants vx WHERE vx.product_id=p.id AND vx.active=1)
      THEN COALESCE((SELECT SUM(MAX(0,v.stock-COALESCE(v.reserved_stock,0))) FROM product_variants v WHERE v.product_id=p.id AND v.active=1),0)
      ELSE MAX(0,p.stock-COALESCE(p.reserved_stock,0)) END)>0
    AND EXISTS(SELECT 1 FROM product_media m WHERE m.product_id=p.id AND m.active=1)
    ORDER BY p.featured DESC,p.sold_count DESC LIMIT 100`;

  try{
    const stmt=env.DB.prepare(sql),r=binds.length?await stmt.bind(...binds).all():await stmt.all();
    const products=r.results||[];
    return json({products,ready:true,count:products.length},200,'public, max-age=30');
  }catch(error){
    const hint=schemaHint(error);
    return json({
      products:[],
      ready:false,
      error:'catalog_schema_not_ready',
      migration:hint.migration,
      missing:hint.missing,
      action:hint.migration?`Apply D1 migration ${hint.migration} and re-run the production readiness check.`:'Run the D1 production readiness workflow and inspect the catalog schema.'
    },503);
  }
}
