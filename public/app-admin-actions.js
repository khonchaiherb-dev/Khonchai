/* KHONCHAIHERB storefront/admin separation bridge.
   Customer pages never collect or retain administrative secrets. */
(()=>{
  if(typeof document==='undefined')return;
  if(!document.querySelector('script[data-kch-production-guard]')){
    const script=document.createElement('script');
    script.src='/kch-production-guard.js';
    script.dataset.kchProductionGuard='1';
    script.async=true;
    (document.head||document.documentElement).appendChild(script);
  }
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
  // Administrative controls do not belong in the customer account surface.
  document.querySelectorAll('[data-go="seller"]').forEach(el=>el.remove());
};

async function runAdminAction(){
  kchOpenStaffPortal();
}

// Remove any legacy seller entry that may be introduced by a later render.
const kchPublicRoot=document.getElementById('app');
if(kchPublicRoot){
  new MutationObserver(()=>document.querySelectorAll('[data-go="seller"]').forEach(el=>el.remove()))
    .observe(kchPublicRoot,{childList:true,subtree:true});
}

// Progressive storefront upgrades are loaded here so the customer shell stays
// independent from the staff portal and older cached HTML can receive fixes.
(()=>{
  if(typeof document==='undefined')return;
  const head=document.head||document.documentElement;
  if(!document.querySelector('link[data-kch-v119]')){
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='/tshop-v119.css?v=1.19.0';
    link.dataset.kchV119='1';
    head.appendChild(link);
  }
  if(!document.querySelector('script[data-kch-v119]')){
    const script=document.createElement('script');
    script.src='/tshop-v119.js?v=1.19.0';
    script.dataset.kchV119='1';
    script.defer=true;
    head.appendChild(script);
  }
})();
