export async function onRequestGet({env,params}){
  if(!env.MEDIA_BUCKET)return new Response('Media storage not configured',{status:503});
  const raw=Array.isArray(params.path)?params.path.join('/'):String(params.path||''),key=decodeURIComponent(raw);
  if(!/^reviews\/\d+\/\d+\/[a-f0-9-]+\.(jpg|jpeg|png|webp|mp4|webm)$/i.test(key))return new Response('Not found',{status:404});
  const obj=await env.MEDIA_BUCKET.get(key);if(!obj)return new Response('Not found',{status:404});
  const h=new Headers();obj.writeHttpMetadata(h);h.set('etag',obj.httpEtag);h.set('Cache-Control','public, max-age=31536000, immutable');h.set('X-Content-Type-Options','nosniff');
  return new Response(obj.body,{headers:h});
}
