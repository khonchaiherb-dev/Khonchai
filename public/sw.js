const CACHE='khonchaiherb-storefront-v1-2026.09.05.5';
const CORE=[
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/storefront-v1.css?v=2026.09.05.5',
  '/storefront-v1.js?v=2026.09.05.5',
  '/assets/products/rang-jued-tea-360.webp'
];

const put=async(request,response)=>{
  if(response?.ok){
    const cache=await caches.open(CACHE);
    await cache.put(request,response.clone());
  }
  return response;
};

const networkFirst=async request=>{
  try{return await put(request,await fetch(request,{cache:'no-store'}))}
  catch{return (await caches.match(request))||(request.mode==='navigate'?await caches.match('/index.html'):Response.error())}
};

const cacheFirst=async request=>{
  const cached=await caches.match(request);
  if(cached)return cached;
  try{return await put(request,await fetch(request))}catch{return Response.error()}
};

self.addEventListener('install',event=>event.waitUntil(
  caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting())
));

self.addEventListener('activate',event=>event.waitUntil(
  caches.keys()
    .then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))
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
