/* KHONCHAIHERB Commerce v1.6.2 — storefront interaction reliability */
(()=>{
  if(window.__KCH_INTERACTION_HOTFIX__==='1.6.2')return;
  window.__KCH_INTERACTION_HOTFIX__='1.6.2';
  try{document.documentElement.dataset.kchBuild='1.6.2'}catch{}

  const stop=e=>{e.preventDefault();e.stopImmediatePropagation()};
  const enabled=el=>el&&!el.disabled&&el.getAttribute('aria-disabled')!=='true';
  const syncUi=()=>{
    try{
      const nav=document.querySelector('.tshop-bottom');
      if(nav)nav.hidden=typeof current!=='undefined'&&['product','checkout'].includes(current);
      if(typeof count==='function')document.querySelectorAll('.badge').forEach(x=>x.textContent=count());
    }catch{}
  };
  const removeDrawer=()=>document.querySelector('#v05-product-drawer')?.remove();

  document.addEventListener('click',e=>{
    const target=e.target;
    if(!target||typeof target.closest!=='function')return;
    const el=target.closest('[data-add],[data-buy],[data-v05-drawer-add],[data-v05-drawer-buy],[data-place],[data-go="cart"],[data-go="checkout"],[data-product]');
    if(!el||!enabled(el))return;

    if(el.matches('[data-add]')){
      stop(e);
      const q=(typeof current!=='undefined'&&current==='product'&&typeof qty!=='undefined')?qty:1;
      if(typeof add==='function')add(el.dataset.add,q);
      syncUi();
      return;
    }

    if(el.matches('[data-buy]')){
      stop(e);
      const q=typeof qty!=='undefined'?qty:1;
      if(typeof add==='function')add(el.dataset.buy,q);
      if(typeof checkout==='function')checkout();
      syncUi();
      return;
    }

    if(el.matches('[data-v05-drawer-add]')){
      stop(e);
      if(typeof add==='function')add(el.dataset.v05DrawerAdd,1);
      removeDrawer();syncUi();
      return;
    }

    if(el.matches('[data-v05-drawer-buy]')){
      stop(e);
      if(typeof add==='function')add(el.dataset.v05DrawerBuy,1);
      removeDrawer();
      if(typeof checkout==='function')checkout();
      syncUi();
      return;
    }

    if(el.matches('[data-place]')){
      stop(e);
      if(typeof placeOrder==='function')placeOrder();
      return;
    }

    if(el.matches('[data-go="cart"]')){
      stop(e);
      if(typeof cartPage==='function')cartPage();
      else if(typeof go==='function')go('cart');
      syncUi();
      return;
    }

    if(el.matches('[data-go="checkout"]')){
      stop(e);
      if(typeof checkout==='function')checkout();
      else if(typeof go==='function')go('checkout');
      syncUi();
      return;
    }

    if(el.matches('[data-product]')){
      if(target.closest('button,a,input,select,textarea,label'))return;
      stop(e);
      const slug=el.dataset.product;
      const p=Array.isArray(PRODUCTS)?PRODUCTS.find(x=>x.slug===slug):null;
      if(p&&typeof product==='function')product(p);
      syncUi();
    }
  },true);

  if(typeof navigator!=='undefined'&&'serviceWorker' in navigator){
    navigator.serviceWorker.addEventListener('controllerchange',()=>{
      try{
        const key='kch-sw-1.6.2-reloaded';
        if(!sessionStorage.getItem(key)){sessionStorage.setItem(key,'1');location.reload()}
      }catch{}
    });
  }

  const boot=()=>{
    try{
      if(typeof current!=='undefined'&&current==='home'&&typeof home==='function')home();
      else if(typeof bind==='function')bind();
      syncUi();
    }catch(err){console.error('KCH interaction boot failed',err)}
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else queueMicrotask(boot);
})();
