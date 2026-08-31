/* KHONCHAIHERB Commerce v1.6.1 — storefront interaction reliability hotfix */
(()=>{
  if(window.__KCH_INTERACTION_HOTFIX__)return;
  window.__KCH_INTERACTION_HOTFIX__='1.6.1';

  const stop=e=>{e.preventDefault();e.stopImmediatePropagation()};
  const enabled=el=>el&&!el.disabled&&el.getAttribute('aria-disabled')!=='true';

  document.addEventListener('click',e=>{
    const el=e.target.closest('[data-add],[data-buy],[data-place],[data-go="cart"],[data-go="checkout"],[data-product]');
    if(!el||!enabled(el))return;

    if(el.matches('[data-add]')){
      stop(e);
      const q=(typeof current!=='undefined'&&current==='product'&&typeof qty!=='undefined')?qty:1;
      if(typeof add==='function')add(el.dataset.add,q);
      return;
    }

    if(el.matches('[data-buy]')){
      stop(e);
      const q=typeof qty!=='undefined'?qty:1;
      if(typeof add==='function')add(el.dataset.buy,q);
      if(typeof checkout==='function')checkout();
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
      return;
    }

    if(el.matches('[data-go="checkout"]')){
      stop(e);
      if(typeof checkout==='function')checkout();
      else if(typeof go==='function')go('checkout');
      return;
    }

    if(el.matches('[data-product]')){
      if(e.target.closest('button,a,input,select,textarea,label'))return;
      stop(e);
      const slug=el.dataset.product;
      const p=Array.isArray(PRODUCTS)?PRODUCTS.find(x=>x.slug===slug):null;
      if(p&&typeof product==='function')product(p);
    }
  },true);

  const boot=()=>{
    try{
      if(typeof current!=='undefined'&&current==='home'&&typeof home==='function')home();
      else if(typeof bind==='function')bind();
    }catch(err){console.error('KCH interaction boot failed',err)}
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else queueMicrotask(boot);
})();
