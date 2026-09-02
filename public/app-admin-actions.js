/* KHONCHAIHERB storefront/admin separation bridge.
   Customer pages never collect or retain administrative secrets. */

/* Critical customer safeguards run synchronously with the storefront shell.
   They must not depend on asynchronously fetched hardening layers. */
(()=>{
  if(typeof document==='undefined'||window.__KCH_CRITICAL_STOREFRONT__==='1.20.2')return;
  window.__KCH_CRITICAL_STOREFRONT__='1.20.2';
  const head=document.head||document.documentElement;
  const style=document.createElement('style');
  style.id='kch-critical-storefront-style';
  style.textContent=`
    .kch-master-newsletter{display:none!important}
    .kch-critical-search-hidden{display:none!important}
    @media(max-width:1023px){
      .pdp-bottom,.kch-pdp-20 .pdp-bottom{box-sizing:border-box!important;width:auto!important;height:auto!important;grid-template-columns:48px 48px minmax(112px,1fr) minmax(122px,1.12fr)!important;align-items:stretch!important;overflow:visible!important;transform:none!important}
      .pdp-bottom .pdp-mini{min-width:0!important;padding:4px 2px!important}.pdp-bottom .pdp-add,.pdp-bottom .pdp-buy{min-width:0!important;padding-inline:8px!important;white-space:nowrap!important}
    }
    @media(max-width:699px){
      .pdp-bottom,.kch-pdp-20 .pdp-bottom{left:8px!important;right:8px!important;bottom:calc(76px + env(safe-area-inset-bottom))!important;grid-template-columns:42px 42px minmax(104px,1fr) minmax(112px,1.08fr)!important;gap:5px!important;padding:6px!important}
      .pdp-bottom button,.kch-pdp-20 .pdp-bottom button{min-height:50px!important}
    }
  `;
  head.appendChild(style);

  function ensureStoreStructuredData(){
    let el=document.getElementById('kch-store-jsonld');
    if(!el){el=document.createElement('script');el.type='application/ld+json';el.id='kch-store-jsonld';head.appendChild(el)}
    const origin=location.origin;
    el.textContent=JSON.stringify({'@context':'https://schema.org','@graph':[{'@type':'Organization','@id':`${origin}/#organization`,name:'KHONCHAIHERB',alternateName:'คุณชายสมุนไพร',url:`${origin}/`},{'@type':'WebSite','@id':`${origin}/#website`,url:`${origin}/`,name:'KHONCHAIHERB',alternateName:'คุณชายสมุนไพร',inLanguage:'th-TH',publisher:{'@id':`${origin}/#organization`}}]});
  }
  ensureStoreStructuredData();

  let frame=0,searchQuery='';
  const schedule=()=>{if(frame)return;frame=requestAnimationFrame(run)};
  function neutralize(){
    document.querySelectorAll('span,small,b,strong,h2,h3,button,option,a').forEach(el=>{
      if(el.children.length)return;
      const text=String(el.textContent||'').trim();
      if(/^ขายแล้ว\s*0(?:\D|$)/i.test(text)||/^⭐\s*0(?:\.0+)?(?:\D|$)/.test(text)){el.remove();return}
      if(text==='สินค้าขายดี'||text==='สินค้ายอดนิยม')el.textContent='สินค้าแนะนำ';
      else if(text==='ขายดี'||text==='ฮิต'||text==='คนซื้อเยอะ')el.textContent='แนะนำ';
    });
    document.querySelectorAll('.rating').forEach(el=>{if(/(?:^|\s)0(?:\.0)?(?:\s|$)/.test(el.textContent||''))el.remove()});
  }
  function search(){
    const q=String(searchQuery||'').trim().toLowerCase();
    document.querySelectorAll('.kch-master-product').forEach(card=>{
      const name=String(card.dataset.kchName||card.querySelector('h3')?.textContent||'').toLowerCase();
      const cat=String(card.dataset.kchCat||'').toLowerCase();
      const match=!q||name.includes(q)||cat.includes(q);
      card.hidden=!match;
      card.classList.toggle('kch-critical-search-hidden',!match);
      card.setAttribute('aria-hidden',String(!match));
    });
  }
  function run(){frame=0;ensureStoreStructuredData();neutralize();search();document.querySelectorAll('[data-go="seller"]').forEach(el=>el.remove())}

  // On the approved Master Storefront this is the single authoritative text-search
  // handler. Stop the legacy bubbling handler from restoring all cards after our
  // filter has already produced the correct result set.
  document.addEventListener('input',event=>{
    if(!event.target?.matches?.('.tshop-searchbox input'))return;
    searchQuery=String(event.target.value||'');
    if(document.querySelector('.kch-master-shell'))event.stopImmediatePropagation();
    search();
    queueMicrotask(search);
    requestAnimationFrame(search);
    setTimeout(search,0);
    setTimeout(search,50);
  },true);
  const root=document.getElementById('app');if(root)new MutationObserver(schedule).observe(root,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['hidden','class','style']});
  schedule();
})();

function kchOpenStaffPortal(){location.href='/seller-center.html'}

// Retire every legacy in-store Seller Center entry point. The operating portal
// now authenticates with an HttpOnly staff session on its own page.
try{seller=kchOpenStaffPortal}catch{}
try{sellerLogin=kchOpenStaffPortal}catch{}
try{sellerLoginSubmit=kchOpenStaffPortal}catch{}
try{sellerDashboard=kchOpenStaffPortal}catch{}
try{renderSeller=kchOpenStaffPortal}catch{}

const baseBind=bind;
bind=function(){
  baseBind();
  document.querySelectorAll('[data-go="seller"]').forEach(el=>el.remove());
};

async function runAdminAction(){kchOpenStaffPortal()}

// Remove any legacy seller entry that may be introduced by a later render.
const kchPublicRoot=document.getElementById('app');
if(kchPublicRoot)new MutationObserver(()=>document.querySelectorAll('[data-go="seller"]').forEach(el=>el.remove())).observe(kchPublicRoot,{childList:true,subtree:true});

// Progressive storefront layers load only after the base storefront has finished
// parsing. This prevents hardening and PDP enhancements racing older render layers.
(()=>{
  if(typeof document==='undefined')return;
  const head=document.head||document.documentElement;
  const addCss=(href,key)=>{if(document.querySelector(`link[data-${key}]`))return;const link=document.createElement('link');link.rel='stylesheet';link.href=href;link.setAttribute(`data-${key}`,'1');head.appendChild(link)};
  const addScript=(src,key,done)=>{const old=document.querySelector(`script[data-${key}]`);if(old){done?.();return}const script=document.createElement('script');script.src=src;script.async=false;script.setAttribute(`data-${key}`,'1');if(done)script.addEventListener('load',done,{once:true});head.appendChild(script)};
  addCss('/tshop-v119.css?v=1.19.0','kch-v119');
  addCss('/tshop-v120.css?v=1.20.0','kch-v120');
  const boot=()=>{
    addScript('/kch-production-guard.js?v=1.20.2','kch-production-guard');
    addScript('/tshop-v119.js?v=1.19.0','kch-v119',()=>addScript('/tshop-v120.js?v=1.20.0','kch-v120'));
  };
  if(document.readyState==='complete')boot();else window.addEventListener('load',boot,{once:true});
})();
