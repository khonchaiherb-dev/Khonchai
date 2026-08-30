export async function onRequestGet({env,request}){
  const url=new URL(request.url); const q=(url.searchParams.get('q')||'').trim();
  if(!env.DB) return Response.json({products:[],note:'Bind D1 as DB in Cloudflare Pages settings'});
  let sql='SELECT id,slug,sku,name,description,category,price,compare_at_price,rating,sold_count,stock,featured FROM products WHERE active=1';
  const binds=[];
  if(q){sql+=' AND (name LIKE ? OR category LIKE ? OR sku LIKE ?)';const x=`%${q}%`;binds.push(x,x,x)}
  sql+=' ORDER BY featured DESC,sold_count DESC LIMIT 100';
  const stmt=env.DB.prepare(sql); const r=binds.length?await stmt.bind(...binds).all():await stmt.all();
  return Response.json({products:r.results||[]},{headers:{'Cache-Control':'public, max-age=60'}});
}
