function json(data,status=200){return Response.json(data,{status,headers:{'Cache-Control':'public, max-age=60'}})}
const clean=(v,n=160)=>String(v??'').trim().slice(0,n);
export async function onRequestGet({request,env}){
  if(!env.DB)return json({creators:[],contents:[],databaseReady:false});
  try{
    const u=new URL(request.url),productId=Math.max(0,Number(u.searchParams.get('productId'))||0);
    const [creatorRows,contentRows,creatorProducts,contentProducts]=await Promise.all([
      env.DB.prepare("SELECT id,handle,display_name,bio,avatar_url,follower_count,rating FROM creators WHERE active=1 ORDER BY id DESC").all(),
      env.DB.prepare("SELECT id,creator_id,content_type,title,caption,media_url,poster_url,status,viewer_count,like_count,starts_at FROM social_contents WHERE status IN ('published','live','scheduled') ORDER BY CASE status WHEN 'live' THEN 0 WHEN 'scheduled' THEN 1 ELSE 2 END,id DESC").all(),
      env.DB.prepare("SELECT cp.creator_id,p.id,p.slug,p.name,p.price,p.compare_at_price,p.stock FROM creator_products cp JOIN products p ON p.id=cp.product_id WHERE p.active=1 AND p.sale_verified=1 AND p.price>0 ORDER BY cp.featured DESC,cp.created_at DESC").all(),
      env.DB.prepare("SELECT cp.content_id,p.id,p.slug,p.name,p.price,p.compare_at_price,p.stock,cp.pin_label,cp.sort_order FROM content_products cp JOIN products p ON p.id=cp.product_id WHERE p.active=1 AND p.sale_verified=1 AND p.price>0 ORDER BY cp.content_id,cp.sort_order,p.id").all()
    ]);
    const byCreator=new Map();
    for(const p of creatorProducts.results||[]){const k=Number(p.creator_id);if(!byCreator.has(k))byCreator.set(k,[]);byCreator.get(k).push(p)}
    const byContent=new Map();
    for(const p of contentProducts.results||[]){const k=Number(p.content_id);if(!byContent.has(k))byContent.set(k,[]);byContent.get(k).push(p)}
    let contents=(contentRows.results||[]).map(x=>({
      id:Number(x.id),creatorId:Number(x.creator_id),type:x.content_type,title:clean(x.title,180),caption:clean(x.caption,500),mediaUrl:clean(x.media_url,1000),posterUrl:clean(x.poster_url,1000),status:x.status,viewers:Number(x.viewer_count||0),likes:Number(x.like_count||0),startsAt:x.starts_at||'',products:byContent.get(Number(x.id))||[]
    }));
    if(productId)contents=contents.filter(x=>x.products.some(p=>Number(p.id)===productId));
    const creatorIds=new Set(contents.map(x=>Number(x.creatorId)));
    const creators=(creatorRows.results||[]).filter(c=>!productId||creatorIds.has(Number(c.id))).map(c=>({
      id:Number(c.id),handle:clean(c.handle,120),displayName:clean(c.display_name,160),bio:clean(c.bio,400),avatar:clean(c.avatar_url,1000),followers:Number(c.follower_count||0),rating:Number(c.rating||0),products:byCreator.get(Number(c.id))||[]
    }));
    return json({creators,contents,databaseReady:true});
  }catch(error){
    return json({creators:[],contents:[],databaseReady:false},200);
  }
}
