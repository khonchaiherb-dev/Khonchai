export async function onRequestGet({request,env}){
  if(!env.PRODUCT_MEDIA_BUCKET)return new Response('Not configured',{status:404});
  const key=new URL(request.url).searchParams.get('key')||'';
  if(!/^products\/\d+\/[a-f0-9-]+\.(?:jpg|png|webp|avif)$/i.test(key))return new Response('Not found',{status:404});
  const obj=await env.PRODUCT_MEDIA_BUCKET.get(key);if(!obj)return new Response('Not found',{status:404});
  const headers=new Headers();obj.writeHttpMetadata(headers);headers.set('etag',obj.httpEtag);headers.set('Cache-Control','public, max-age=31536000, immutable');headers.set('X-Content-Type-Options','nosniff');
  return new Response(obj.body,{headers});
}
