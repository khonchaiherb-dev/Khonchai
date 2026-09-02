function json(data,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store'}})}
const clean=(v,n=500)=>String(v??'').trim().slice(0,n);
const int=v=>Number.isInteger(Number(v))?Number(v):0;
const safeStatus=v=>['draft','published','archived'].includes(String(v))?String(v):'draft';
function safeMediaUrl(v,{poster=false}={}){
  const s=clean(v,1200);if(!s)return '';
  if(poster&&/^\/media\/[A-Za-z0-9_./-]+$/.test(s))return s;
  try{const u=new URL(s);if(u.protocol!=='https:')return '';return u.toString()}catch{return ''}
}
function tiktokHandle(url){try{const u=new URL(url);if(!/(^|\.)tiktok\.com$/i.test(u.hostname))return '';const m=u.pathname.match(/^\/@([A-Za-z0-9._-]{2,80})(?:\/|$)/);return m?m[1].toLowerCase():''}catch{return ''}}
function validTikTokVideo(url){try{const u=new URL(url);if(!/(^|\.)tiktok\.com$/i.test(u.hostname))return false;return /^\/@[A-Za-z0-9._-]{2,80}\/video\/\d{6,30}\/?$/i.test(u.pathname)}catch{return false}}
function uniqueIds(value){const out=[];for(const v of Array.isArray(value)?value:[]){const n=int(v);if(n>0&&!out.includes(n))out.push(n);if(out.length>=20)break}return out}
async function productRows(env){const r=await env.DB.prepare("SELECT id,slug,sku,name,active,sale_verified,price,stock FROM products WHERE active=1 ORDER BY sale_verified DESC,name COLLATE NOCASE,id DESC LIMIT 500").all();return r.results||[]}
async function listContents(env){
  const [cr,links]=await Promise.all([
    env.DB.prepare(`SELECT sc.id,sc.creator_id,sc.content_type,sc.title,sc.caption,sc.media_url,sc.poster_url,sc.status,sc.created_at,sc.updated_at,c.handle,c.display_name
      FROM social_contents sc JOIN creators c ON c.id=sc.creator_id
      WHERE sc.status IN ('draft','published','archived') ORDER BY sc.updated_at DESC,sc.id DESC LIMIT 150`).all(),
    env.DB.prepare(`SELECT cp.content_id,p.id product_id,p.slug,p.name,p.sale_verified,p.active
      FROM content_products cp JOIN products p ON p.id=cp.product_id ORDER BY cp.content_id,cp.sort_order,p.id`).all()
  ]);
  const by=new Map();for(const row of links.results||[]){const k=Number(row.content_id);if(!by.has(k))by.set(k,[]);by.get(k).push({id:Number(row.product_id),slug:row.slug,name:row.name,saleVerified:Boolean(Number(row.sale_verified)),active:Boolean(Number(row.active))})}
  return (cr.results||[]).map(x=>({id:Number(x.id),creatorId:Number(x.creator_id),type:x.content_type,title:x.title,caption:x.caption||'',mediaUrl:x.media_url||'',posterUrl:x.poster_url||'',status:x.status,handle:x.handle,displayName:x.display_name,createdAt:x.created_at,updatedAt:x.updated_at,products:by.get(Number(x.id))||[]}));
}
export async function onRequestGet({env}){
  if(!env.DB)return json({error:'database_not_bound'},503);
  try{const [products,contents]=await Promise.all([productRows(env),listContents(env)]);return json({ok:true,products:products.map(p=>({id:Number(p.id),slug:p.slug,sku:p.sku||'',name:p.name,active:Boolean(Number(p.active)),saleVerified:Boolean(Number(p.sale_verified)),price:Number(p.price||0),stock:Number(p.stock||0)})),contents})}catch(error){return json({error:'social_content_read_failed'},500)}
}
export async function onRequestPost({request,env}){
  if(!env.DB)return json({error:'database_not_bound'},503);
  const body=await request.json().catch(()=>null);if(!body)return json({error:'invalid_body'},400);
  const action=clean(body.action,30)||'save';
  if(action==='archive'){
    const id=int(body.id);if(id<1)return json({error:'invalid_content_id'},400);
    const found=await env.DB.prepare("SELECT id FROM social_contents WHERE id=?").bind(id).first();if(!found)return json({error:'content_not_found'},404);
    await env.DB.prepare("UPDATE social_contents SET status='archived',updated_at=datetime('now') WHERE id=?").bind(id).run();return json({ok:true,id,status:'archived'});
  }
  if(action!=='save')return json({error:'invalid_action'},400);
  const id=int(body.id),title=clean(body.title,180),caption=clean(body.caption,1000),mediaUrl=safeMediaUrl(body.mediaUrl),posterUrl=safeMediaUrl(body.posterUrl,{poster:true}),status=safeStatus(body.status),productIds=uniqueIds(body.productIds);
  if(!title)return json({error:'title_required'},400);
  if(!mediaUrl)return json({error:'media_url_required'},400);
  if(!validTikTokVideo(mediaUrl)&&!/\.(mp4|webm)(?:$|\?)/i.test(mediaUrl))return json({error:'unsupported_media_url'},400);
  if(!productIds.length)return json({error:'product_required'},400);
  const placeholders=productIds.map(()=>'?').join(','),pr=await env.DB.prepare(`SELECT id FROM products WHERE active=1 AND id IN (${placeholders})`).bind(...productIds).all(),existingIds=(pr.results||[]).map(x=>Number(x.id));
  if(existingIds.length!==productIds.length)return json({error:'invalid_product_selection'},400);
  let handle=clean(body.handle,80).replace(/^@/,'').toLowerCase();const parsed=tiktokHandle(mediaUrl);if(parsed)handle=parsed;
  if(!/^[A-Za-z0-9._-]{2,80}$/i.test(handle))handle='khonchaiherb.official';
  const displayName=clean(body.displayName,160)||`@${handle}`;
  const creator=await env.DB.prepare(`INSERT INTO creators(handle,display_name,bio,active,updated_at) VALUES(?,?,?,1,datetime('now'))
    ON CONFLICT(handle) DO UPDATE SET display_name=excluded.display_name,active=1,updated_at=datetime('now') RETURNING id`).bind(handle,displayName,'').first();
  const creatorId=Number(creator?.id||0);if(!creatorId)return json({error:'creator_save_failed'},500);
  let contentId=id;
  if(contentId>0){const found=await env.DB.prepare("SELECT id FROM social_contents WHERE id=?").bind(contentId).first();if(!found)return json({error:'content_not_found'},404);await env.DB.prepare(`UPDATE social_contents SET creator_id=?,content_type='video',title=?,caption=?,media_url=?,poster_url=?,status=?,viewer_count=0,like_count=0,updated_at=datetime('now') WHERE id=?`).bind(creatorId,title,caption,mediaUrl,posterUrl||null,status,contentId).run()}
  else{const created=await env.DB.prepare(`INSERT INTO social_contents(creator_id,content_type,title,caption,media_url,poster_url,status,viewer_count,like_count,updated_at) VALUES(?,'video',?,?,?,?,0,0,datetime('now')) RETURNING id`).bind(creatorId,title,caption,mediaUrl,posterUrl||null,status).first();contentId=Number(created?.id||0);if(!contentId)return json({error:'content_save_failed'},500)}
  const statements=[env.DB.prepare("DELETE FROM content_products WHERE content_id=?").bind(contentId),...productIds.map((pid,idx)=>env.DB.prepare("INSERT INTO content_products(content_id,product_id,pin_label,sort_order) VALUES(?,?,?,?)").bind(contentId,pid,null,idx))];await env.DB.batch(statements);
  return json({ok:true,id:contentId,status,productIds,handle});
}
