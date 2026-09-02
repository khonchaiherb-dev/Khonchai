const CACHE='khonchaiherb-v1.18.2-ui1.34.3';
const CORE=[
  '/',
  '/index.html',
  '/styles.css',
  '/v03.css',
  '/v031.css',
  '/tshop-v04.css',
  '/tshop-v05.css',
  '/tshop-v06.css',
  '/tshop-v07.css',
  '/tshop-v08.css',
  '/tshop-v09.css',
  '/tshop-v10.css',
  '/tshop-v11.css',
  '/tshop-v12.css',
  '/tshop-v13.css',
  '/tshop-v14.css',
  '/tshop-v15.css',
  '/tshop-v16.css',
  '/tshop-v17.css?v=1.18.2',
  '/tshop-v18.css?v=1.18.2',
  '/tshop-v19.css?v=1.18.2',
  '/tshop-v110.css?v=1.18.2',
  '/tshop-v111.css?v=1.18.2',
  '/tshop-v112.css?v=1.18.2',
  '/tshop-v113.css?v=1.18.2',
  '/tshop-v114.css?v=1.18.2',
  '/tshop-v115.css?v=1.18.2',
  '/tshop-v116.css?v=1.18.2',
  '/tshop-v117.css?v=1.18.2',
  '/tshop-v118.css?v=1.18.2',
  '/tshop-v134-structural-storefront.css?v=1.34.3',
  '/app-core.js','/app-shop.js','/app-account.js','/app-admin-actions.js',
  '/tshop-v04.js','/tshop-v05.js','/tshop-v06.js','/tshop-v07.js','/tshop-v08.js','/tshop-v09.js','/tshop-v10.js','/tshop-v11.js','/tshop-v12.js','/tshop-v121.js','/tshop-v13.js','/tshop-v14.js','/tshop-v15.js','/tshop-v16.js',
  '/tshop-v17.js?v=1.18.2','/tshop-v18.js?v=1.18.2','/tshop-v19.js?v=1.18.2','/tshop-v110.js?v=1.18.2','/tshop-v111.js?v=1.18.2','/tshop-v112.js?v=1.18.2','/tshop-v113.js?v=1.18.2','/tshop-v114.js?v=1.18.2','/tshop-v161-hotfix.js?v=1.18.2','/tshop-v115.js?v=1.18.2','/tshop-v116.js?v=1.18.2','/tshop-v117.js?v=1.18.2','/tshop-v118.js?v=1.18.2',
  '/kch-conversion-storefront.js?v=1.32.0',
  '/kch-v134-structural-storefront.js?v=1.34.3',
  '/assets/products/rang-jued-tea-360.webp','/assets/products/chiang-da-tea-360.webp','/assets/products/gymnema-capsules-100-512.webp','/assets/pandan-aromatic-dried.svg',
  '/privacy.html','/terms.html','/shipping-returns.html','/manifest.webmanifest'
];
const put=async(request,response)=>{if(response?.ok){const cache=await caches.open(CACHE);await cache.put(request,response.clone())}return response};
const networkFirst=async request=>{try{return await put(request,await fetch(request,{cache:'no-store'}))}catch{return (await caches.match(request))||(request.mode==='navigate'?await caches.match('/index.html'):Response.error())}};
const cacheFirst=async request=>{const cached=await caches.match(request);if(cached)return cached;try{return await put(request,await fetch(request))}catch{return Response.error()}};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;const url=new URL(event.request.url);if(url.origin!==self.location.origin)return;if(url.pathname.startsWith('/api/')||url.pathname.startsWith('/media/'))return;const dynamic=event.request.mode==='navigate'||url.pathname==='/'||/\.(?:html|js|css|webmanifest)$/.test(url.pathname);event.respondWith(dynamic?networkFirst(event.request):cacheFirst(event.request))});
