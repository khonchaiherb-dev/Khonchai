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
