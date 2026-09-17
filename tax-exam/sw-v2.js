const CACHE='kexam-tax-v5';
const CORE=['./','index.html','styles.css?v=5','base64-fix.js?v=5','app-v2.js?v=5','manifest.webmanifest'];
const BANK=['bank-01.txt','bank-02-03.txt','bank-04-05.txt','bank-06-07.txt','bank-08-09.txt','bank-10-11.txt','bank-12-13.txt','bank-14-15.txt','bank-16-17.txt','bank-18.txt'];
const ASSETS=[...CORE,...BANK];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);
  const fresh=e.request.mode==='navigate'||url.pathname.endsWith('/index.html')||url.pathname.endsWith('/app-v2.js')||url.pathname.endsWith('/base64-fix.js')||url.pathname.endsWith('/styles.css');
  if(fresh){
    e.respondWith(fetch(e.request,{cache:'no-store'}).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return res}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./'))));
    return;
  }
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return res}).catch(()=>caches.match('./'))));
});
