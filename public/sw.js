/* KHONCHAIHERB V1 service worker — resilient cache lifecycle 2026.09.05.5 */
const CACHE_PREFIX='khonchaiherb-storefront-v1-';
const LEGACY_CACHE_PREFIX='khonchaiherb-v';
const CACHE=`${CACHE_PREFIX}runtime-2026.09.05.5`;
const CORE=[
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/storefront-v1.css?v=2026.09.05.5',
  '/storefront-v1.js?v=2026.09.05.5',
  '/assets/products/rang-jued-tea-360.webp'
];

const currentCache=()=>caches.open(CACHE);
const currentMatch=async request=>(await currentCache()).match(request);

const put=async(request,response)=>{
  if(response?.ok){
    const cache=await currentCache();
    await cache.put(request,response.clone());
  }
  return response;
};

const warmCore=async()=>{
  const cache=await currentCache();
  const results=await Promise.allSettled(CORE.map(async path=>{
    const url=new URL(path,self.location.origin).toString();
    const request=new Request(url,{cache:'no-store'});
    const response=await fetch(request);
    if(!response.ok)throw new Error(`core_${response.status}_${path}`);
    await cache.put(request,response.clone());
    return path;
  }));
  for(const [index,result] of results.entries()){
    if(result.status==='rejected')console.warn('service_worker_core_warm_failed',CORE[index],result.reason?.message||result.reason);
  }
};

const networkFirst=async request=>{
  try{return await put(request,await fetch(request,{cache:'no-store'}))}
  catch{
    const cached=await currentMatch(request);
    if(cached)return cached;
    if(request.mode==='navigate'){
      return (await currentMatch(new URL('/index.html',self.location.origin).toString()))||Response.error();
    }
    return Response.error();
  }
};

const cacheFirst=async request=>{
  const cached=await currentMatch(request);
  if(cached)return cached;
  try{return await put(request,await fetch(request))}catch{return Response.error()}
};

self.addEventListener('install',event=>event.waitUntil(
  warmCore().then(()=>self.skipWaiting())
));

self.addEventListener('activate',event=>event.waitUntil(
  caches.keys()
    .then(keys=>Promise.all(keys
      .filter(key=>key!==CACHE&&(key.startsWith(CACHE_PREFIX)||key.startsWith(LEGACY_CACHE_PREFIX)))
      .map(key=>caches.delete(key))))
    .then(()=>self.clients.claim())
));

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;
  if(url.pathname.startsWith('/api/')||url.pathname.startsWith('/media/'))return;
  const fresh=event.request.mode==='navigate'||url.pathname==='/'||/\.(?:html|js|css|webmanifest)$/.test(url.pathname);
  event.respondWith(fresh?networkFirst(event.request):cacheFirst(event.request));
});
