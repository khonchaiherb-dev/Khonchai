function json(data,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store'}})}
const digits=s=>String(s||'').replace(/\D/g,'');
const clean=s=>String(s||'').trim();
const variants=s=>{const d=digits(s);const a=new Set([d]);if(d.startsWith('66'))a.add('0'+d.slice(2));else if(d.startsWith('0'))a.add('66'+d.slice(1));return [...a].filter(Boolean)};
const types=new Map([['image/jpeg',['image','jpg']],['image/png',['image','png']],['image/webp',['image','webp']],['video/mp4',['video','mp4']],['video/webm',['video','webm']]]);
export async function onRequestPost({request,env}){
  if(!env.DB)return json({error:'database_not_bound'},503);
  if(!env.MEDIA_BUCKET)return json({error:'media_storage_not_bound'},503);
  const form=await request.formData().catch(()=>null);if(!form)return json({error:'invalid_form'},400);
  const orderNo=clean(form.get('orderNo')).slice(0,40),phoneVars=variants(form.get('phone')),productId=Number(form.get('productId')),file=form.get('file');
  if(!orderNo||!phoneVars.length||!Number.isInteger(productId)||productId<1||!(file instanceof File))return json({error:'invalid_upload'},400);
  const meta=types.get(file.type);if(!meta)return json({error:'unsupported_media_type'},415);
  const max=meta[0]==='video'?12*1024*1024:6*1024*1024;if(file.size<1||file.size>max)return json({error:'media_too_large',maxBytes:max},413);
  const ph=phoneVars.map(()=>'?').join(','),order=await env.DB.prepare(`SELECT id,fulfillment_status,status FROM orders WHERE order_no=? AND phone IN (${ph})`).bind(orderNo,...phoneVars).first();
  if(!order)return json({error:'order_not_found'},404);
  if(order.status==='cancelled'||order.fulfillment_status!=='delivered')return json({error:'review_not_available_yet'},409);
  const item=await env.DB.prepare("SELECT id FROM order_items WHERE order_id=? AND product_id=?").bind(order.id,productId).first();if(!item)return json({error:'product_not_in_order'},403);
  const count=await env.DB.prepare("SELECT COUNT(*) c FROM review_media WHERE order_id=? AND product_id=? AND status IN ('pending','published')").bind(order.id,productId).first();if(Number(count?.c||0)>=4)return json({error:'media_limit_reached'},409);
  const key=`reviews/${order.id}/${productId}/${crypto.randomUUID()}.${meta[1]}`,buf=await file.arrayBuffer();
  await env.MEDIA_BUCKET.put(key,buf,{httpMetadata:{contentType:file.type,cacheControl:'public, max-age=31536000, immutable'}});
  await env.DB.prepare("INSERT INTO review_media(order_id,product_id,object_key,media_type,status) VALUES(?,?,?,?,'pending')").bind(order.id,productId,key,meta[0]).run();
  return json({ok:true,objectKey:key,type:meta[0],url:`/media/${key}`});
}
