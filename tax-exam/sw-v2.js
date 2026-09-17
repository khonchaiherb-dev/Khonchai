const CACHE='kexam-tax-v7';
const CORE=['./','index.html','styles.css?v=7','base64-fix.js?v=7','app-v2.js?v=7','manifest.webmanifest'];
const BANK=['bank-01.txt','bank-02-03.txt','bank-04-05.txt','bank-06-07.txt','bank-08-09.txt','bank-10-11.txt','bank-12-13.txt','bank-14-15.txt','bank-16-17.txt','bank-18.txt'];
const ASSETS=[...CORE,...BANK];

self.addEventListener('install',e=>{
  self.skipWaiting();
  e.waitUntil((async()=>{
    const c=await caches.open(CACHE);
    for(const url of ASSETS){
      const r=await fetch(url,{cache:'reload'});
      if(!r.ok) throw new Error(`cache install failed: ${url}`);
      await c.put(url,r.clone());
    }
  })());
});

self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});

self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);
  const isBank=BANK.some(name=>url.pathname.endsWith('/'+name));
  const fresh=e.request.mode==='navigate'||isBank||url.pathname.endsWith('/index.html')||url.pathname.endsWith('/app-v2.js')||url.pathname.endsWith('/base64-fix.js')||url.pathname.endsWith('/styles.css');
  if(fresh){
    e.respondWith(fetch(e.request,{cache:'no-store'}).then(res=>{
      if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));}
      return res;
    }).catch(()=>caches.match(e.request).then(r=>r||caches.match('./'))));
    return;
  }
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request,{cache:'no-store'}).then(res=>{
    if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));}
    return res;
  }).catch(()=>caches.match('./'))));
});
