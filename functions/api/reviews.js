function json(data,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store'}})}
const digits=s=>String(s||'').replace(/\D/g,'');
const clean=s=>String(s||'').trim();
const variants=s=>{const d=digits(s);const a=new Set([d]);if(d.startsWith('66'))a.add('0'+d.slice(2));else if(d.startsWith('0'))a.add('66'+d.slice(1));return [...a].filter(Boolean)};
const mask=s=>{const t=clean(s);if(!t)return 'ผู้ซื้อที่ยืนยันแล้ว';return `${t.slice(0,1)}***${t.length>4?t.slice(-1):''}`};
const safeMedia=a=>Array.isArray(a)?a.map(x=>clean(x)).filter(x=>/^reviews\/\d+\/\d+\/[a-f0-9-]+\.(jpg|jpeg|png|webp|mp4|webm)$/i.test(x)).slice(0,4):[];
export async function onRequestGet({request,env}){
  if(!env.DB)return json({error:'database_not_bound'},503);
  const u=new URL(request.url),productId=Number(u.searchParams.get('productId')),limit=Math.max(1,Math.min(30,Number(u.searchParams.get('limit'))||12));
  if(!Number.isInteger(productId)||productId<1)return json({error:'invalid_product'},400);
  const rr=await env.DB.prepare("SELECT r.id,r.rating,r.body,r.verified_purchase,r.created_at,c.full_name FROM reviews r LEFT JOIN customers c ON c.id=r.customer_id WHERE r.product_id=? ORDER BY r.created_at DESC LIMIT ?").bind(productId,limit).all();
  const reviews=rr.results||[],ids=reviews.map(x=>Number(x.id));
  let media=[];
  if(ids.length){const ph=ids.map(()=>'?').join(','),mr=await env.DB.prepare(`SELECT review_id,object_key,media_type FROM review_media WHERE review_id IN (${ph}) AND status='published' ORDER BY id`).bind(...ids).all();media=mr.results||[]}
  const by=new Map();for(const m of media){const id=Number(m.review_id);if(!by.has(id))by.set(id,[]);by.get(id).push({type:m.media_type,url:`/media/${m.object_key}`})}
  const summary=await env.DB.prepare("SELECT COUNT(*) count,COALESCE(AVG(rating),0) average FROM reviews WHERE product_id=?").bind(productId).first();
  return json({summary:{count:Number(summary?.count||0),average:Math.round(Number(summary?.average||0)*10)/10},reviews:reviews.map(r=>({id:Number(r.id),rating:Number(r.rating),body:r.body||'',verifiedPurchase:Boolean(Number(r.verified_purchase)),buyer:mask(r.full_name),createdAt:r.created_at,media:by.get(Number(r.id))||[]}))});
}
export async function onRequestPost({request,env}){
  if(!env.DB)return json({error:'database_not_bound'},503);
  const b=await request.json().catch(()=>null);if(!b)return json({error:'invalid_body'},400);
  const orderNo=clean(b.orderNo).slice(0,40),phoneVars=variants(b.phone),productId=Number(b.productId),rating=Number(b.rating),body=clean(b.body).slice(0,1500),mediaKeys=safeMedia(b.media);
  if(!orderNo||!phoneVars.length||!Number.isInteger(productId)||productId<1||!Number.isInteger(rating)||rating<1||rating>5)return json({error:'invalid_review'},400);
  const ph=phoneVars.map(()=>'?').join(','),order=await env.DB.prepare(`SELECT id,customer_id,fulfillment_status,status FROM orders WHERE order_no=? AND phone IN (${ph})`).bind(orderNo,...phoneVars).first();
  if(!order)return json({error:'order_not_found'},404);
  if(order.status==='cancelled'||order.fulfillment_status!=='delivered')return json({error:'review_not_available_yet'},409);
  const item=await env.DB.prepare("SELECT id FROM order_items WHERE order_id=? AND product_id=?").bind(order.id,productId).first();if(!item)return json({error:'product_not_in_order'},403);
  const existing=await env.DB.prepare("SELECT id FROM reviews WHERE order_id=? AND product_id=?").bind(order.id,productId).first();if(existing)return json({error:'review_already_submitted'},409);
  if(mediaKeys.length){const mph=mediaKeys.map(()=>'?').join(','),mr=await env.DB.prepare(`SELECT object_key FROM review_media WHERE order_id=? AND product_id=? AND status='pending' AND object_key IN (${mph})`).bind(order.id,productId,...mediaKeys).all();const allowed=new Set((mr.results||[]).map(x=>x.object_key));if(mediaKeys.some(k=>!allowed.has(k)))return json({error:'invalid_media'},400)}
  const review=await env.DB.prepare("INSERT INTO reviews(product_id,order_id,customer_id,rating,body,media_json,verified_purchase) VALUES(?,?,?,?,?,?,1) RETURNING id").bind(productId,order.id,order.customer_id,rating,body,JSON.stringify(mediaKeys.map(k=>`/media/${k}`))).first();
  if(mediaKeys.length){const mph=mediaKeys.map(()=>'?').join(',');await env.DB.prepare(`UPDATE review_media SET review_id=?,status='published' WHERE order_id=? AND product_id=? AND object_key IN (${mph})`).bind(review.id,order.id,productId,...mediaKeys).run()}
  const summary=await env.DB.prepare("SELECT AVG(rating) avg FROM reviews WHERE product_id=?").bind(productId).first();await env.DB.prepare("UPDATE products SET rating=?,updated_at=datetime('now') WHERE id=?").bind(Math.round(Number(summary?.avg||rating)*10)/10,productId).run();
  return json({ok:true,reviewId:Number(review.id)});
}
