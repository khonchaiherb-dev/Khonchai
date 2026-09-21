const CACHE='kexam-tax-v26';
const CORE=['./','index.html','question-publication-manifest.json','question-content-integrity.json','source-verification-backlog.json','source-reverification-watchlist.json','styles.css?v=26','enhancements-v8.css?v=26','polish-v9.css?v=26','positions-v10.css?v=26','cosmic-v12.css?v=26','ai-tutor-v26.css?v=26','analytics-config.js?v=26','analytics-v13.js?v=26','base64-fix.js?v=26','app-v3.js?v=26','ai-tutor-v26.js?v=26','app-v3-part1.txt','app-v3-part2.txt','app-v3-part3.txt','app-v3-part4.txt','manifest.webmanifest?v=26'];
const BANK=[
  'bank-01.txt','bank-02-03.txt','bank-04-05.txt','bank-06-07.txt','bank-08-09.txt','bank-10-11.txt','bank-12-13.txt','bank-14-15.txt','bank-16-17.txt','bank-18.txt',
  'ra-bank-01.txt','ra-bank-02a.txt','ra-bank-02b.txt','ra-bank-03a.txt','ra-bank-03b.txt','ra-bank-04.txt','ra-bank-05.txt','ra-bank-06.txt','ra-bank-07.txt','ra-bank-08.txt','ra-bank-09.txt','ra-bank-10.txt'
];
const ASSETS=[...CORE,...BANK];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil((async()=>{const c=await caches.open(CACHE);for(const url of ASSETS){const r=await fetch(url,{cache:'reload'});if(!r.ok)throw new Error(`cache install failed: ${url}`);await c.put(url,r.clone())}})())});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE&&k.startsWith('kexam-tax-')).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);
  const isBank=BANK.some(name=>url.pathname.endsWith('/'+name));
  const isPart=/\/app-v3-part[1-4]\.txt$/.test(url.pathname);
  const isAdmin=url.pathname.includes('/tax-exam/admin/');
  const fresh=e.request.mode==='navigate'||isBank||isPart||isAdmin||url.pathname.endsWith('/index.html')||url.pathname.endsWith('/app-v3.js')||url.pathname.endsWith('/analytics-config.js')||url.pathname.endsWith('/analytics-v13.js')||url.pathname.endsWith('/base64-fix.js')||url.pathname.endsWith('/styles.css')||url.pathname.endsWith('/enhancements-v8.css')||url.pathname.endsWith('/polish-v9.css')||url.pathname.endsWith('/positions-v10.css')||url.pathname.endsWith('/cosmic-v12.css')||url.pathname.endsWith('/ai-tutor-v26.css')||url.pathname.endsWith('/ai-tutor-v26.js')||url.pathname.endsWith('/manifest.webmanifest')||url.pathname.endsWith('/question-publication-manifest.json')||url.pathname.endsWith('/question-content-integrity.json')||url.pathname.endsWith('/source-verification-backlog.json')||url.pathname.endsWith('/source-reverification-watchlist.json');
  if(fresh){e.respondWith(fetch(e.request,{cache:'no-store'}).then(res=>{if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(e.request,copy))}return res}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./'))));return}
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request,{cache:'no-store'}).then(res=>{if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(e.request,copy))}return res}).catch(()=>caches.match('./'))));
});
