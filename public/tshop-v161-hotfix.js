/* KHONCHAIHERB Commerce v1.7.5 — storefront interaction reliability */
(()=>{
  if(window.__KCH_INTERACTION_HOTFIX__==='1.7.5')return;
  window.__KCH_INTERACTION_HOTFIX__='1.7.5';
  try{document.documentElement.dataset.kchBuild='1.7.5'}catch{}

  const stop=e=>{e.preventDefault();e.stopImmediatePropagation()};
  const enabled=el=>el&&!el.disabled&&el.getAttribute('aria-disabled')!=='true';
  const ensureBrandIdentity=()=>{
    try{
      if(typeof document==='undefined')return;
      if(typeof document.createElement==='function'&&(!document.getElementById||!document.getElementById('kch-brand-identity-style'))){
        const style=document.createElement('style');style.id='kch-brand-identity-style';style.textContent='.kch-brand-lockup{border:0;background:transparent;padding:2px 7px 2px 0;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;min-width:max-content;color:#103f31;cursor:pointer;line-height:1}.kch-brand-lockup b{font-size:13px;font-weight:900;white-space:nowrap}.kch-brand-lockup small{margin-top:3px;font-size:7px;font-weight:800;letter-spacing:.09em;color:#98783f;white-space:nowrap}.v118-hero-brand{display:flex;align-items:baseline;flex-wrap:wrap;gap:8px;margin:-3px 0 10px;color:#103f31;font-size:clamp(24px,2.7vw,38px);font-weight:900;line-height:1.08;letter-spacing:-.025em}.v118-hero-brand small{font-size:10px;letter-spacing:.16em;color:#9a7b41;font-weight:900}@media(min-width:1024px){.v118-signature-home .live-rail,.v118-signature-home .video-feed{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;overflow:visible!important}.v118-signature-home .live-card,.v118-signature-home .video-card{width:auto!important;min-width:0!important;max-width:none!important;flex:none!important}.v118-signature-home .live-card{height:260px}.v118-signature-home .video-thumb{height:300px}}@media(max-width:699px){.tshop-topbar .kch-brand-lockup{width:86px;min-width:86px}.kch-brand-lockup b{font-size:12px}.kch-brand-lockup small{font-size:6px}.tshop-topbar .tshop-searchbox{min-width:0}.v118-hero-brand{font-size:27px;margin-bottom:8px}.v118-hero-brand small{font-size:8px}}@media(max-width:420px){.tshop-topbar .kch-brand-lockup{width:78px;min-width:78px}.kch-brand-lockup b{font-size:11px;letter-spacing:-.02em}.kch-brand-lockup small{font-size:5.5px}.v118-hero-brand{font-size:25px}}';
        const host=document.head||document.documentElement;if(host&&typeof host.appendChild==='function')host.appendChild(style);
      }
      const top=document.querySelector?.('.tshop-topbar');
      if(top&&!top.querySelector?.('.kch-brand-lockup')&&typeof document.createElement==='function'){
        const brand=document.createElement('button');brand.type='button';brand.className='kch-brand-lockup';brand.setAttribute('data-go','home');brand.setAttribute('aria-label','คุณชายสมุนไพร หน้าแรก');brand.innerHTML='<b>คุณชายสมุนไพร</b><small>KHONCHAIHERB</small>';
        const search=top.querySelector?.('.tshop-searchbox');if(search&&typeof top.insertBefore==='function')top.insertBefore(brand,search);else top.prepend?.(brand);
      }
    }catch{}
  };
  const syncUi=()=>{try{const nav=document.querySelector('.tshop-bottom');if(nav)nav.hidden=typeof current!=='undefined'&&['product','checkout'].includes(current);if(typeof count==='function')document.querySelectorAll('.badge').forEach(x=>x.textContent=count());queueMicrotask?.(ensureBrandIdentity);if(typeof requestAnimationFrame==='function')requestAnimationFrame(ensureBrandIdentity)}catch{}};
  const removeDrawer=()=>document.querySelector('#v05-product-drawer')?.remove();
  const interactiveTarget=target=>target?.closest?.('button,a,input,select,textarea,label');
  const openProductSlug=(slug,e)=>{
    if(!slug||typeof current==='undefined'||current!=='home')return false;
    const p=Array.isArray(PRODUCTS)?PRODUCTS.find(x=>x.slug===slug):null;
    if(!p||typeof product!=='function')return false;
    if(e)stop(e);product(p);syncUi();return true;
  };
  const ensureMobileHitArea=()=>{
    if(typeof document==='undefined'||typeof document.createElement!=='function')return;
    if(typeof document.getElementById==='function'&&document.getElementById('kch-mobile-product-hitarea'))return;
    const style=document.createElement('style');
    style.id='kch-mobile-product-hitarea';
    style.textContent='@media (max-width:480px){#recommend,.v116-result-meta{pointer-events:none!important}.v116-discovery{position:relative;z-index:1;pointer-events:none!important}.v116-discovery button,.v116-discovery select,.v116-discovery input,.v116-discovery label{pointer-events:auto!important}#product-grid{position:relative;z-index:2}#product-grid .tshop-card{position:relative;z-index:1;scroll-margin-top:190px;scroll-margin-bottom:84px;touch-action:manipulation}#product-grid .tshop-card>.visual{pointer-events:none!important}#product-grid .tshop-card>.tshop-card-info{position:relative;z-index:2}}';
    const host=document.head||document.documentElement;
    if(host&&typeof host.appendChild==='function')host.appendChild(style);
  };
  ensureMobileHitArea();
  ensureBrandIdentity();
  let productPointer=null,productTouch=null;

  document.addEventListener('pointerdown',e=>{
    const target=e.target;if(!target||typeof target.closest!=='function'||interactiveTarget(target))return;
    const card=target.closest('.tshop-card[data-product]');if(!card)return;
    productPointer={pointerId:e.pointerId,slug:card.dataset.product,card,x:Number(e.clientX||0),y:Number(e.clientY||0),moved:false};
  },true);
  document.addEventListener('pointermove',e=>{const p=productPointer;if(!p||p.pointerId!==e.pointerId)return;if(Math.hypot(Number(e.clientX||0)-p.x,Number(e.clientY||0)-p.y)>12)p.moved=true},true);
  document.addEventListener('pointercancel',e=>{if(productPointer?.pointerId===e.pointerId)productPointer=null},true);
  document.addEventListener('pointerup',e=>{
    const intent=productPointer;if(!intent||intent.pointerId!==e.pointerId)return;productPointer=null;
    if(intent.moved||typeof current==='undefined'||current!=='home')return;
    const touch=e.pointerType==='touch',replaced=intent.card?.isConnected===false;
    if(!touch&&!replaced)return;
    openProductSlug(intent.slug,e);
  },true);

  const touchPoint=(list,id)=>{if(!list)return null;for(let i=0;i<list.length;i++){const t=list[i];if(id==null||t.identifier===id)return t}return null};
  document.addEventListener('touchstart',e=>{
    if(productTouch||e.touches?.length!==1)return;
    const target=e.target;if(!target||typeof target.closest!=='function'||interactiveTarget(target))return;
    const card=target.closest('.tshop-card[data-product]');if(!card)return;
    const t=touchPoint(e.touches,null);if(!t)return;
    productTouch={identifier:t.identifier,slug:card.dataset.product,x:Number(t.clientX||0),y:Number(t.clientY||0),moved:false};
  },{capture:true,passive:true});
  document.addEventListener('touchmove',e=>{
    const intent=productTouch;if(!intent)return;const t=touchPoint(e.touches,intent.identifier);if(!t)return;
    if(Math.hypot(Number(t.clientX||0)-intent.x,Number(t.clientY||0)-intent.y)>12)intent.moved=true;
  },{capture:true,passive:true});
  document.addEventListener('touchcancel',()=>{productTouch=null},{capture:true,passive:true});
  document.addEventListener('touchend',e=>{
    const intent=productTouch;if(!intent)return;const t=touchPoint(e.changedTouches,intent.identifier);if(!t)return;productTouch=null;
    if(intent.moved||typeof current==='undefined'||current!=='home')return;
    openProductSlug(intent.slug,e);
  },{capture:true,passive:false});

  document.addEventListener('click',e=>{
    const target=e.target;if(!target||typeof target.closest!=='function')return;
    const el=target.closest('[data-add],[data-buy],[data-v05-drawer-add],[data-v05-drawer-buy],[data-place],[data-go="cart"],[data-go="checkout"],[data-product]');
    if(!el||!enabled(el))return;

    if(el.matches('[data-add]')){stop(e);const q=(typeof current!=='undefined'&&current==='product'&&typeof qty!=='undefined')?qty:1;if(typeof v17Purchase==='function')v17Purchase(el.dataset.add,q,false);else if(typeof add==='function')add(el.dataset.add,q);syncUi();return}
    if(el.matches('[data-buy]')){stop(e);const q=typeof qty!=='undefined'?qty:1;if(typeof v17Purchase==='function')v17Purchase(el.dataset.buy,q,true);else{const ok=typeof add==='function'?add(el.dataset.buy,q):false;if(ok!==false&&typeof checkout==='function')checkout()}syncUi();return}
    if(el.matches('[data-v05-drawer-add]')){stop(e);const id=el.dataset.v05DrawerAdd;if(typeof v17Purchase==='function')v17Purchase(id,1,false);else if(typeof add==='function')add(id,1);removeDrawer();syncUi();return}
    if(el.matches('[data-v05-drawer-buy]')){stop(e);const id=el.dataset.v05DrawerBuy;if(typeof v17Purchase==='function')v17Purchase(id,1,true);else{const ok=typeof add==='function'?add(id,1):false;if(ok!==false&&typeof checkout==='function')checkout()}removeDrawer();syncUi();return}
    if(el.matches('[data-place]')){stop(e);if(typeof placeOrder==='function')placeOrder();return}
    if(el.matches('[data-go="cart"]')){stop(e);if(typeof cartPage==='function')cartPage();else if(typeof go==='function')go('cart');syncUi();return}
    if(el.matches('[data-go="checkout"]')){stop(e);if(typeof checkout==='function')checkout();else if(typeof go==='function')go('checkout');syncUi();return}
    if(el.matches('[data-product]')){if(interactiveTarget(target))return;stop(e);openProductSlug(el.dataset.product)}
  },true);

  if(typeof navigator!=='undefined'&&'serviceWorker' in navigator){navigator.serviceWorker.addEventListener('controllerchange',()=>{try{const key='kch-sw-1.7.5-reloaded';if(!sessionStorage.getItem(key)){sessionStorage.setItem(key,'1');location.reload()}}catch{}})}
  const boot=()=>{try{ensureMobileHitArea();ensureBrandIdentity();if(typeof current!=='undefined'&&current==='home'&&typeof home==='function')home();else if(typeof bind==='function')bind();syncUi()}catch(err){console.error('KCH interaction boot failed',err)}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else queueMicrotask(boot);
})();