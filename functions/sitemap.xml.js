const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const originOf=(request,env)=>String(env?.SITE_ORIGIN||new URL(request.url).origin).replace(/\/$/,'');
export async function onRequestGet({request,env}){
  const origin=originOf(request,env);
  const urls=[{loc:`${origin}/`,priority:'1.0',changefreq:'daily'}];
  if(env.DB){
    try{
      const r=await env.DB.prepare(`SELECT p.slug,p.updated_at FROM products p
        WHERE p.active=1 AND p.sale_verified=1 AND p.price>0
        AND MAX(0,COALESCE(p.stock,0)-COALESCE(p.reserved_stock,0))>0
        AND EXISTS(SELECT 1 FROM product_media pm WHERE pm.product_id=p.id AND pm.active=1)
        ORDER BY p.id DESC`).all();
      for(const p of r.results||[]){if(!p.slug)continue;urls.push({loc:`${origin}/product/${encodeURIComponent(p.slug)}`,lastmod:p.updated_at||'',priority:'0.9',changefreq:'daily'})}
    }catch{}
  }
  for(const path of ['/about.html','/privacy.html','/terms.html'])urls.push({loc:`${origin}${path}`,priority:'0.4',changefreq:'monthly'});
  const body=`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u=>`  <url><loc>${esc(u.loc)}</loc>${u.lastmod?`<lastmod>${esc(String(u.lastmod).slice(0,10))}</lastmod>`:''}<changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`).join('\n')}\n</urlset>\n`;
  return new Response(body,{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'public, max-age=300'}});
}
