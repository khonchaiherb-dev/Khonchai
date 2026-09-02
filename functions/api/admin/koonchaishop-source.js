import {adminAuthorized,json,clean,audit} from '../../_lib/admin.js';
const SOURCE={platform:'tiktok_shop',shopCode:'THLCRLWLHR',shopName:'Koonchaishop'};
const statuses=new Set(['draft','published','hidden']);
const assetTypes=new Set(['image','video','text']);
const safeUrl=v=>{const s=clean(v,1200);if(!s)return '';if(s.startsWith('/media/')||s.startsWith('/assets/'))return s;try{const u=new URL(s);return u.protocol==='https:'?u.href.slice(0,1200):''}catch{return ''}};
const safeDate=v=>{const s=clean(v,40);if(!s)return null;const d=new Date(s);return Number.isNaN(d.valueOf())?null:d.toISOString()};
async function ensureSource(env){
  await env.DB.prepare("INSERT OR IGNORE INTO commerce_sources(platform,shop_code,shop_name,authorization_scope,active) VALUES('tiktok_shop','THLCRLWLHR','Koonchaishop','owner_authorized_media_content_reviews',1)").run();
  return env.DB.prepare("SELECT id FROM commerce_sources WHERE platform='tiktok_shop' AND shop_code='THLCRLWLHR' LIMIT 1").first();
}
export async function onRequestGet({request,env}){
  if(!adminAuthorized(request,env))return json({error:'unauthorized'},401);
  if(!env.DB)return json({error:'database_not_bound'},503);
  try{
    const source=await ensureSource(env),[ar,rr,lr]=await Promise.all([
      env.DB.prepare("SELECT id,external_id,product_id,asset_type,title,caption,source_url,media_url,poster_url,status,source_created_at,updated_at FROM source_assets WHERE source_id=? ORDER BY id DESC LIMIT 100").bind(source.id).all(),
      env.DB.prepare("SELECT id,external_id,product_id,rating,author_display,review_text,source_verified,status,source_created_at,updated_at FROM source_reviews WHERE source_id=? ORDER BY id DESC LIMIT 100").bind(source.id).all(),
      env.DB.prepare("SELECT external_product_id,product_id,external_title,updated_at FROM source_product_links WHERE source_id=? ORDER BY updated_at DESC LIMIT 100").bind(source.id).all()
    ]);
    return json({source:{...SOURCE,id:Number(source.id)},assets:ar.results||[],reviews:rr.results||[],productLinks:lr.results||[]});
  }catch{return json({error:'source_library_not_ready'},503)}
}
export async function onRequestPost({request,env}){
  if(!adminAuthorized(request,env))return json({error:'unauthorized'},401);
  if(!env.DB)return json({error:'database_not_bound'},503);
  const b=await request.json().catch(()=>null);if(!b)return json({error:'invalid_body'},400);
  let source;try{source=await ensureSource(env)}catch{return json({error:'source_library_not_ready'},503)}
  const action=clean(b.action,40),externalId=clean(b.externalId,180),productId=Math.max(0,Math.trunc(Number(b.productId)||0))||null;
  if(action==='upsertAsset'){
    const type=clean(b.assetType,20),status=statuses.has(clean(b.status,20))?clean(b.status,20):'draft';
    if(!externalId||!assetTypes.has(type))return json({error:'invalid_asset'},400);
    const title=clean(b.title,180),caption=clean(b.caption,1500),sourceUrl=safeUrl(b.sourceUrl),mediaUrl=safeUrl(b.mediaUrl),posterUrl=safeUrl(b.posterUrl),created=safeDate(b.sourceCreatedAt),metadata=JSON.stringify(b.metadata&&typeof b.metadata==='object'?b.metadata:{});
    const row=await env.DB.prepare("INSERT INTO source_assets(source_id,external_id,product_id,asset_type,title,caption,source_url,media_url,poster_url,rights_basis,status,source_created_at,metadata_json,updated_at) VALUES(?,?,?,?,?,?,?,?,?,'owner_authorized',?,?,?,datetime('now')) ON CONFLICT(source_id,external_id) DO UPDATE SET product_id=excluded.product_id,asset_type=excluded.asset_type,title=excluded.title,caption=excluded.caption,source_url=excluded.source_url,media_url=excluded.media_url,poster_url=excluded.poster_url,status=excluded.status,source_created_at=excluded.source_created_at,metadata_json=excluded.metadata_json,updated_at=datetime('now') RETURNING id").bind(source.id,externalId,productId,type,title||null,caption||null,sourceUrl||null,mediaUrl||null,posterUrl||null,status,created,metadata).first();
    await audit(env,{action:'koonchaishop.asset.upsert',entityType:'source_asset',entityId:row.id,metadata:{externalId,productId,type,status}});return json({ok:true,id:Number(row.id)});
  }
  if(action==='upsertReview'){
    const rating=Math.max(1,Math.min(5,Math.trunc(Number(b.rating)||0))),body=clean(b.body,2000),status=statuses.has(clean(b.status,20))?clean(b.status,20):'draft';
    if(!externalId||!body||!Number(b.rating))return json({error:'invalid_review'},400);
    const author=clean(b.authorDisplay,100),created=safeDate(b.sourceCreatedAt),sourceVerified=b.sourceVerified?1:0,media=Array.isArray(b.media)?b.media.map(safeUrl).filter(Boolean).slice(0,4):[];
    const row=await env.DB.prepare("INSERT INTO source_reviews(source_id,external_id,product_id,rating,author_display,review_text,media_json,source_created_at,source_verified,verified_on_site,status,updated_at) VALUES(?,?,?,?,?,?,?,?,?,0,?,datetime('now')) ON CONFLICT(source_id,external_id) DO UPDATE SET product_id=excluded.product_id,rating=excluded.rating,author_display=excluded.author_display,review_text=excluded.review_text,media_json=excluded.media_json,source_created_at=excluded.source_created_at,source_verified=excluded.source_verified,verified_on_site=0,status=excluded.status,updated_at=datetime('now') RETURNING id").bind(source.id,externalId,productId,rating,author||null,body,JSON.stringify(media),created,sourceVerified,status).first();
    await audit(env,{action:'koonchaishop.review.upsert',entityType:'source_review',entityId:row.id,metadata:{externalId,productId,rating,status,sourceVerified:Boolean(sourceVerified)}});return json({ok:true,id:Number(row.id),verifiedOnSite:false});
  }
  if(action==='linkProduct'){
    const externalProductId=clean(b.externalProductId,180),externalTitle=clean(b.externalTitle,240);if(!externalProductId||!productId)return json({error:'invalid_product_link'},400);
    const product=await env.DB.prepare("SELECT id FROM products WHERE id=?").bind(productId).first();if(!product)return json({error:'product_not_found'},404);
    await env.DB.prepare("INSERT INTO source_product_links(source_id,external_product_id,product_id,external_title,updated_at) VALUES(?,?,?,?,datetime('now')) ON CONFLICT(source_id,external_product_id) DO UPDATE SET product_id=excluded.product_id,external_title=excluded.external_title,updated_at=datetime('now')").bind(source.id,externalProductId,productId,externalTitle||null).run();
    await audit(env,{action:'koonchaishop.product.link',entityType:'source_product_link',entityId:externalProductId,metadata:{productId,externalTitle}});return json({ok:true});
  }
  return json({error:'unsupported_action'},400);
}
