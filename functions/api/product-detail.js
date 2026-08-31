function json(data,status=200,headers={}){return Response.json(data,{status,headers:{'Cache-Control':'public, max-age=30',...headers}})}
const clean=(v,n=120)=>String(v??'').trim().slice(0,n);
export async function onRequestGet({request,env}){
  if(!env.DB)return json({error:'database_not_bound'},503,{'Cache-Control':'no-store'});
  const u=new URL(request.url),slug=clean(u.searchParams.get('slug')),id=Number(u.searchParams.get('id'))||0;
  if(!slug&&!id)return json({error:'product_required'},400,{'Cache-Control':'no-store'});
  const p=id
    ? await env.DB.prepare(`SELECT id,slug,sku,name,description,category,price,compare_at_price,rating,sold_count,stock,COALESCE(reserved_stock,0) reserved_stock,featured,barcode,weight_grams,seo_title,seo_description FROM products WHERE id=? AND active=1`).bind(id).first()
    : await env.DB.prepare(`SELECT id,slug,sku,name,description,category,price,compare_at_price,rating,sold_count,stock,COALESCE(reserved_stock,0) reserved_stock,featured,barcode,weight_grams,seo_title,seo_description FROM products WHERE slug=? AND active=1`).bind(slug).first();
  if(!p)return json({error:'not_found'},404,{'Cache-Control':'no-store'});
  const variants=await env.DB.prepare(`SELECT id,product_id,sku,option_name,option_value,price,compare_at_price,stock,COALESCE(reserved_stock,0) reserved_stock,barcode,active
    FROM product_variants WHERE product_id=? AND active=1 ORDER BY id`).bind(p.id).all();
  const media=await env.DB.prepare(`SELECT id,alt_text,sort_order,'/media/product?key='||object_key url
    FROM product_media WHERE product_id=? AND active=1 ORDER BY sort_order,id LIMIT 12`).bind(p.id).all();
  const review=await env.DB.prepare(`SELECT COUNT(*) count,COALESCE(AVG(rating),0) average
    FROM reviews WHERE product_id=?`).bind(p.id).first();
  const out={
    ...p,
    available_stock:Math.max(0,Number(p.stock||0)-Number(p.reserved_stock||0)),
    variants:(variants.results||[]).map(v=>({...v,available_stock:Math.max(0,Number(v.stock||0)-Number(v.reserved_stock||0))})),
    media:media.results||[],
    review:{count:Number(review?.count||0),average:Number(review?.average||0)}
  };
  return json({product:out});
}
