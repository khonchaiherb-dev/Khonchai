const STATIC_MEDIA={
  'static/rang-jued-tea-360.webp':'/assets/products/rang-jued-tea-360.webp',
  'static/chiang-da-tea-360.webp':'/assets/products/chiang-da-tea-360.webp',
  'static/gymnema-capsules-100-512.webp':'/assets/products/gymnema-capsules-100-512.webp'
};

export async function onRequestGet({request,env}){
  const key=new URL(request.url).searchParams.get('key')||'';
  const staticPath=STATIC_MEDIA[key];
  if(staticPath){
    const target=new URL(staticPath,request.url);
    return new Response(null,{status:302,headers:{
      Location:target.pathname,
      'Cache-Control':'public, max-age=86400',
      'X-Content-Type-Options':'nosniff'
    }});
  }

  if(!env.PRODUCT_MEDIA_BUCKET)return new Response('Not configured',{status:404});
  if(!/^products\/\d+\/[a-f0-9-]+\.(?:jpg|png|webp|avif)$/i.test(key))return new Response('Not found',{status:404});
  const obj=await env.PRODUCT_MEDIA_BUCKET.get(key);
  if(!obj)return new Response('Not found',{status:404});
  const headers=new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('etag',obj.httpEtag);
  headers.set('Cache-Control','public, max-age=31536000, immutable');
  headers.set('X-Content-Type-Options','nosniff');
  return new Response(obj.body,{headers});
}
