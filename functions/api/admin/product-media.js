import {adminAuthorized,json,clean,audit} from '../../_lib/admin.js';
const allowed=new Set(['image/jpeg','image/png','image/webp','image/avif']);
const ext=t=>({'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/avif':'avif'}[t]||'bin');

export async function onRequestGet({request,env}){
  if(!adminAuthorized(request,env))return json({error:'unauthorized'},401);
  const productId=Number(new URL(request.url).searchParams.get('productId'));if(!productId)return json({error:'invalid_product'},400);
  const r=await env.DB.prepare("SELECT id,product_id,object_key,alt_text,sort_order,active,created_at FROM product_media WHERE product_id=? ORDER BY sort_order,id").bind(productId).all();
  return json({media:(r.results||[]).map(x=>({...x,url:`/media/product?key=${encodeURIComponent(x.object_key)}`}))});
}

export async function onRequestPost({request,env}){
  if(!adminAuthorized(request,env))return json({error:'unauthorized'},401);
  if(!env.PRODUCT_MEDIA_BUCKET)return json({error:'product_media_storage_not_bound'},503);
  const form=await request.formData(),file=form.get('file'),productId=Number(form.get('productId')),altText=clean(form.get('altText'),180),sortOrder=Math.trunc(Number(form.get('sortOrder'))||0);
  if(!productId||!file||typeof file.arrayBuffer!=='function')return json({error:'invalid_upload'},400);
  if(!allowed.has(file.type)||Number(file.size)>8*1024*1024)return json({error:'invalid_media'},400);
  const product=await env.DB.prepare("SELECT id FROM products WHERE id=?").bind(productId).first();if(!product)return json({error:'product_not_found'},404);
  const key=`products/${productId}/${crypto.randomUUID()}.${ext(file.type)}`,buf=await file.arrayBuffer();
  await env.PRODUCT_MEDIA_BUCKET.put(key,buf,{httpMetadata:{contentType:file.type,cacheControl:'public, max-age=31536000, immutable'}});
  const r=await env.DB.prepare("INSERT INTO product_media(product_id,object_key,alt_text,sort_order,active) VALUES(?,?,?,?,1) RETURNING id").bind(productId,key,altText||null,sortOrder).first();
  await audit(env,{action:'product_media.create',entityType:'product_media',entityId:r.id,metadata:{productId,key,contentType:file.type,size:file.size}});
  return json({ok:true,id:r.id,url:`/media/product?key=${encodeURIComponent(key)}`});
}

export async function onRequestDelete({request,env}){
  if(!adminAuthorized(request,env))return json({error:'unauthorized'},401);
  const b=await request.json().catch(()=>({})),id=Number(b.id);if(!id)return json({error:'invalid_id'},400);
  const row=await env.DB.prepare("SELECT id,product_id,object_key FROM product_media WHERE id=?").bind(id).first();if(!row)return json({error:'not_found'},404);
  await env.DB.prepare("DELETE FROM product_media WHERE id=?").bind(id).run();
  if(env.PRODUCT_MEDIA_BUCKET){try{await env.PRODUCT_MEDIA_BUCKET.delete(row.object_key)}catch{}}
  await audit(env,{action:'product_media.delete',entityType:'product_media',entityId:id,metadata:{productId:row.product_id,key:row.object_key}});
  return json({ok:true});
}
