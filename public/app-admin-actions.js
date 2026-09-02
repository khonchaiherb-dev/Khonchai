/* KHONCHAIHERB storefront/admin separation bridge.
   Customer pages never collect or retain administrative secrets. */

/* Critical customer safeguards run synchronously with the storefront shell.
   They must not depend on asynchronously fetched hardening layers. */
(()=>{
  if(typeof document==='undefined'||window.__KCH_CRITICAL_STOREFRONT__==='1.21.6')return;
  window.__KCH_CRITICAL_STOREFRONT__='1.21.6';
  const head=document.head||document.documentElement;
  const style=document.createElement('style');
  style.id='kch-critical-storefront-style';
  style.textContent=`
    .kch-master-newsletter{display:none!important}
    .kch-critical-search-hidden,
    .kch-master-product[data-kch-search-match="0"]{display:none!important}
    .kch-master-home,
    .kch-master-home .kch-master-section,
    .kch-master-home .kch-master-trust,
    .kch-master-home .kch-master-story,
    .kch-master-home .kch-master-split{min-width:0!important;max-width:100%!important}
    .kch-master-home .kch-master-split>* ,
    .kch-master-home .kch-master-story>* ,
    .kch-master-home .kch-master-trust-inner>* ,
    .kch-master-home .kch-master-products>* ,
    .kch-master-home .kch-master-categories>*{min-width:0!important;max-width:100%!important}
    @media(max-width:1023px){
      .pdp-bottom,.kch-pdp-20 .pdp-bottom{box-sizing:border-box!important;width:auto!important;height:auto!important;grid-template-columns:48px 48px minmax(112px,1fr) minmax(122px,1.12fr)!important;align-items:stretch!important;overflow:visible!important;transform:none!important}
      .pdp-bottom .pdp-mini{min-width:0!important;padding:4px 2px!important}.pdp-bottom .pdp-add,.pdp-bottom .pdp-buy{min-width:0!important;padding-inline:8px!important;white-space:nowrap!important}
      .kch-master-home .kch-master-split>*{min-width:0!important}
    }
    @media(max-width:699px){
      .pdp-bottom,.kch-pdp-20 .pdp-bottom{left:8px!important;right:8px!important;bottom:calc(76px + env(safe-area-inset-bottom))!important;grid-template-columns:42px 42px minmax(104px,1fr) minmax(112px,1.08fr)!important;gap:5px!important;padding:6px!important}
      .pdp-bottom button,.kch-pdp-20 .pdp-bottom button{min-height:50px!important}
      .kch-master-home .kch-master-categories{grid-auto-flow:row!important;grid-auto-columns:auto!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;overflow-x:visible!important;width:100%!important;min-width:0!important;max-width:100%!important}
      .kch-master-home .kch-master-promo-grid,
      .kch-master-home .kch-master-review-grid,
      .kch-master-home .kch-master-products{min-width:0!important;max-width:100%!important}
      .kch-master-home .kch-master-promo-grid>* ,
      .kch-master-home .kch-master-review-grid>* ,
      .kch-master-home .kch-master-products>*{min-width:0!important}
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

  const masterSearch=window.__KCH_MASTER_SEARCH__=window.__KCH_MASTER_SEARCH__||{query:'',revision:0,source:'boot'};
  if(!masterSearch.query){masterSearch.query=String(document.querySelector('.tshop-searchbox input')?.value||'')}
  let frame=0;
  const schedule=()=>{if(frame)return;frame=requestAnimationFrame(run)};

  function setMasterQuery(value,{force=false,trusted=false,source='unknown'}={}){
    const next=String(value||'');
    /* Ignore synthetic empty resets while a real query is active. Genuine user
       clears and the explicit Master reset button remain authoritative. */
    if(!force&&!trusted&&!next&&masterSearch.query)return masterSearch.query;
    if(next!==masterSearch.query){masterSearch.query=next;masterSearch.revision=Number(masterSearch.revision||0)+1;masterSearch.source=source}
    return masterSearch.query;
  }

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

  function adoptLiveInput(){
    const input=document.querySelector('.tshop-searchbox input');
    if(!input)return;
    const domValue=String(input.value||'');
    if(domValue)setMasterQuery(domValue,{source:'dom'});
    else if(!masterSearch.query)setMasterQuery('',{force:true,source:'dom-empty'});
    else if(input.value!==masterSearch.query)input.value=masterSearch.query;
  }

  function applyMasterSearch(){
    adoptLiveInput();
    const q=String(masterSearch.query||'').trim().toLowerCase();
    document.querySelectorAll('.kch-master-product').forEach(card=>{
      const name=String(card.dataset.kchName||card.querySelector('h3')?.textContent||'').toLowerCase();
      const cat=String(card.dataset.kchCat||'').toLowerCase();
      const slug=String(card.dataset.product||'').toLowerCase();
      const match=!q||name.includes(q)||cat.includes(q)||slug.includes(q);
      card.dataset.kchSearchMatch=match?'1':'0';
      card.hidden=!match;
      card.classList.toggle('kch-critical-search-hidden',!match);
      card.setAttribute('aria-hidden',String(!match));
    });
  }

  masterSearch.set=(value,options={})=>{setMasterQuery(value,options);applyMasterSearch();return masterSearch.query};
  masterSearch.apply=applyMasterSearch;
  masterSearch.get=()=>String(masterSearch.query||'');
  masterSearch.clear=()=>{setMasterQuery('',{force:true,trusted:true,source:'reset'});const input=document.querySelector('.tshop-searchbox input');if(input)input.value='';applyMasterSearch()};

  function run(){frame=0;ensureStoreStructuredData();neutralize();applyMasterSearch();document.querySelectorAll('[data-go="seller"]').forEach(el=>el.remove())}

  document.addEventListener('input',event=>{
    if(!event.target?.matches?.('.tshop-searchbox input'))return;
    setMasterQuery(event.target.value,{trusted:event.isTrusted,source:event.isTrusted?'user-input':'synthetic-input'});
    if(document.querySelector('.kch-master-shell'))event.stopImmediatePropagation();
    applyMasterSearch();
    queueMicrotask(applyMasterSearch);
    requestAnimationFrame(applyMasterSearch);
  },true);
  document.addEventListener('search',event=>{
    if(!event.target?.matches?.('.tshop-searchbox input'))return;
    setMasterQuery(event.target.value,{force:event.isTrusted,trusted:event.isTrusted,source:event.isTrusted?'user-search':'synthetic-search'});
    if(document.querySelector('.kch-master-shell'))event.stopImmediatePropagation();
    applyMasterSearch();
  },true);
  document.addEventListener('click',event=>{
    if(!document.querySelector('.kch-master-shell'))return;
    if(event.target?.closest?.('[data-kch-reset]'))masterSearch.clear();
  },true);

  const root=document.getElementById('app');if(root)new MutationObserver(schedule).observe(root,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['hidden','class','style','aria-hidden','data-kch-search-match']});
  adoptLiveInput();
  schedule();
})();

function kchOpenStaffPortal(){location.href='/seller-center.html'}
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

const kchPublicRoot=document.getElementById('app');
if(kchPublicRoot)new MutationObserver(()=>document.querySelectorAll('[data-go="seller"]').forEach(el=>el.remove())).observe(kchPublicRoot,{childList:true,subtree:true});

(()=>{
  if(typeof document==='undefined')return;
  const head=document.head||document.documentElement;
  const addCss=(href,key)=>{if(document.querySelector(`link[data-${key}]`))return;const link=document.createElement('link');link.rel='stylesheet';link.href=href;link.setAttribute(`data-${key}`,'1');head.appendChild(link)};
  const addScript=(src,key,done)=>{const old=document.querySelector(`script[data-${key}]`);if(old){done?.();return}const script=document.createElement('script');script.src=src;script.async=false;script.setAttribute(`data-${key}`,'1');if(done)script.addEventListener('load',done,{once:true});head.appendChild(script)};
  addCss('/tshop-v119.css?v=1.19.0','kch-v119');
  addCss('/tshop-v120.css?v=1.20.0','kch-v120');
  const boot=()=>{
    addScript('/kch-production-guard.js?v=1.21.3','kch-production-guard');
    addScript('/kch-footer-premium.js?v=2.0.0','kch-footer-v2');
    addScript('/kch-future-standard.js?v=1.29.0','kch-future-standard');
    addScript('/tshop-v119.js?v=1.19.0','kch-v119',()=>addScript('/tshop-v120.js?v=1.20.0','kch-v120'));
  };
  if(document.readyState==='complete')boot();else window.addEventListener('load',boot,{once:true});
})();