function json(data,status=200){return Response.json(data,{status,headers:{'Cache-Control':'public, max-age=60'}})}
const clean=(v,n=500)=>String(v??'').trim().slice(0,n);
const SOURCE={platform:'TikTok Shop',platformKey:'tiktok_shop',shopName:'Koonchaishop',shopCode:'THLCRLWLHR',disclosure:'สื่อและรีวิวจากร้าน Koonchaishop บน TikTok Shop'};
const safeUrl=(v,n=1200)=>{const s=clean(v,n);if(!s)return '';if(s.startsWith('/media/')||s.startsWith('/assets/'))return s;try{const u=new URL(s);return u.protocol==='https:'?u.href.slice(0,n):''}catch{return ''}};
const safeMedia=v=>{try{const a=JSON.parse(v||'[]');return Array.isArray(a)?a.map(x=>safeUrl(x,1200)).filter(Boolean).slice(0,4):[]}catch{return []}};
export async function onRequestGet({request,env}){
  if(!env.DB)return json({source:SOURCE,assets:[],reviews:[],databaseReady:false});
  try{
    const u=new URL(request.url),productId=Math.max(0,Number(u.searchParams.get('productId'))||0),limit=Math.max(1,Math.min(12,Number(u.searchParams.get('limit'))||6));
    const source=await env.DB.prepare("SELECT id,platform,shop_code,shop_name,authorization_scope FROM commerce_sources WHERE platform='tiktok_shop' AND shop_code='THLCRLWLHR' AND active=1 LIMIT 1").first();
    if(!source)return json({source:SOURCE,assets:[],reviews:[],databaseReady:true});
    const assetSql=productId?"SELECT id,external_id,product_id,asset_type,title,caption,source_url,media_url,poster_url,source_created_at FROM source_assets WHERE source_id=? AND status='published' AND product_id=? ORDER BY COALESCE(source_created_at,created_at) DESC,id DESC LIMIT ?":"SELECT id,external_id,product_id,asset_type,title,caption,source_url,media_url,poster_url,source_created_at FROM source_assets WHERE source_id=? AND status='published' ORDER BY COALESCE(source_created_at,created_at) DESC,id DESC LIMIT ?";
    const reviewSql=productId?"SELECT id,external_id,product_id,rating,author_display,review_text,media_json,source_created_at,source_verified FROM source_reviews WHERE source_id=? AND status='published' AND product_id=? ORDER BY COALESCE(source_created_at,created_at) DESC,id DESC LIMIT ?":"SELECT id,external_id,product_id,rating,author_display,review_text,media_json,source_created_at,source_verified FROM source_reviews WHERE source_id=? AND status='published' ORDER BY COALESCE(source_created_at,created_at) DESC,id DESC LIMIT ?";
    const [ar,rr]=await Promise.all([
      productId?env.DB.prepare(assetSql).bind(source.id,productId,limit).all():env.DB.prepare(assetSql).bind(source.id,limit).all(),
      productId?env.DB.prepare(reviewSql).bind(source.id,productId,limit).all():env.DB.prepare(reviewSql).bind(source.id,limit).all()
    ]);
    const assets=(ar.results||[]).map(x=>({id:Number(x.id),externalId:clean(x.external_id,160),productId:Number(x.product_id||0),type:x.asset_type,title:clean(x.title,180),caption:clean(x.caption,700),sourceUrl:safeUrl(x.source_url),mediaUrl:safeUrl(x.media_url),posterUrl:safeUrl(x.poster_url),createdAt:x.source_created_at||''}));
    const reviews=(rr.results||[]).map(x=>({id:Number(x.id),externalId:clean(x.external_id,160),productId:Number(x.product_id||0),rating:Math.max(1,Math.min(5,Number(x.rating)||5)),author:clean(x.author_display,100)||'ผู้รีวิวบน TikTok Shop',body:clean(x.review_text,1200),media:safeMedia(x.media_json),createdAt:x.source_created_at||'',sourceVerified:Boolean(Number(x.source_verified||0)),verifiedOnSite:false}));
    return json({source:{...SOURCE,authorizationScope:clean(source.authorization_scope,120)},assets,reviews,databaseReady:true});
  }catch{return json({source:SOURCE,assets:[],reviews:[],databaseReady:false});}
}
