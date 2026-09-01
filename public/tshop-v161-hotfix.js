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
  const ensureFlagshipVisualPolish=()=>{
    try{
      if(typeof document==='undefined'||typeof document.createElement!=='function')return;
      if(document.getElementById?.('kch-flagship-visual-polish'))return;
      const style=document.createElement('style');style.id='kch-flagship-visual-polish';style.textContent='.v05-creator-section,.v118-brand-story{content-visibility:visible!important;contain-intrinsic-size:auto!important}.kch-launch-media img{display:block!important;opacity:1!important}';
      const host=document.head||document.documentElement;if(host&&typeof host.appendChild==='function')host.appendChild(style);
    }catch{}
  };
  const syncUi=()=>{try{const nav=document.querySelector('.tshop-bottom');if(nav)nav.hidden=typeof current!=='undefined'&&['product','checkout'].includes(current);if(typeof count==='function')document.querySelectorAll('.badge').forEach(x=>x.textContent=count());queueMicrotask?.(ensureBrandIdentity);queueMicrotask?.(ensureFlagshipVisualPolish);if(typeof requestAnimationFrame==='function')requestAnimationFrame(ensureBrandIdentity)}catch{}};
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
  ensureFlagshipVisualPolish();
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
  const installVerifiedFinalGuard=()=>{
    try{
      if(typeof v118PolishHomeCopy==='function'&&!v118PolishHomeCopy.__kchVerifiedGuard){
        const base=v118PolishHomeCopy;
        const guarded=function(){const out=base.apply(this,arguments);try{if(typeof kchV121SyncCatalogClaims==='function')kchV121SyncCatalogClaims()}catch{}return out};
        guarded.__kchVerifiedGuard=true;
        v118PolishHomeCopy=guarded;
      }
      if(typeof kchV121ApplyVerifiedDataGate==='function')kchV121ApplyVerifiedDataGate();
      if(typeof kchV121SyncVerifiedUi==='function'){queueMicrotask(kchV121SyncVerifiedUi);requestAnimationFrame(kchV121SyncVerifiedUi)}
    }catch{}
  };
  window.addEventListener('load',installVerifiedFinalGuard,{once:true});
  const boot=()=>{try{ensureMobileHitArea();ensureBrandIdentity();ensureFlagshipVisualPolish();if(typeof current!=='undefined'&&current==='home'&&typeof home==='function')home();else if(typeof bind==='function')bind();syncUi()}catch(err){console.error('KCH interaction boot failed',err)}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else queueMicrotask(boot);
})();

/* KHONCHAIHERB Reference Storefront v1.19 — approved dark green / gold luxury herbal layout */
(()=>{
  if(window.__KCH_REFERENCE_STOREFRONT__==='1.19.0')return;
  window.__KCH_REFERENCE_STOREFRONT__='1.19.0';
  let frame=0;
  const icon=name=>`<span class="material-symbols-rounded" aria-hidden="true">${name}</span>`;
  const money=n=>typeof M==='function'?M(Number(n||0)):`฿${Number(n||0).toLocaleString('th-TH')}`;
  const imgOf=p=>String(p?.image||p?.image_url||'').trim();
  const catalog=()=>Array.isArray(window.PRODUCTS)?window.PRODUCTS:(typeof PRODUCTS!=='undefined'&&Array.isArray(PRODUCTS)?PRODUCTS:[]);
  const fallback=[
    {name:'ชารางจืด',image:'/assets/products/rang-jued-tea-360.webp',slug:'',price:0},
    {name:'ชาเชียงดา',image:'/assets/products/chiang-da-tea-360.webp',slug:'',price:0},
    {name:'ผลิตภัณฑ์เชียงดา',image:'/assets/products/gymnema-capsules-100-512.webp',slug:'',price:0}
  ];
  const saleProducts=()=>{const rows=catalog().filter(p=>imgOf(p)&&Number(p.price||0)>0&&!p.comingSoon);return (rows.length?rows:fallback).slice(0,3)};

  function ensureStyle(){
    if(document.getElementById('kch-reference-storefront-style'))return;
    const s=document.createElement('style');s.id='kch-reference-storefront-style';s.textContent=`
      :root{--ref-green:#062d23;--ref-green2:#0a4333;--ref-green3:#0d5a43;--ref-gold:#d9b96d;--ref-gold2:#f1d794;--ref-cream:#fbf7ed;--ref-cream2:#f3eee2;--ref-ink:#14271f;--ref-line:rgba(212,186,126,.24)}
      .v118-signature-home{background:#f6f2e8!important}
      .v118-signature-home .tshop-topbar{position:relative!important;top:auto!important;display:grid!important;grid-template-columns:auto minmax(260px,560px) auto!important;align-items:center!important;gap:22px!important;padding:18px clamp(22px,4.6vw,74px) 14px!important;background:linear-gradient(180deg,#052b21,#07382a)!important;border-bottom:1px solid rgba(221,190,116,.24)!important;box-shadow:none!important;color:#fff!important;backdrop-filter:none!important}
      .kch-brand-lockup{position:relative!important;display:grid!important;grid-template-columns:48px auto!important;grid-template-rows:auto auto!important;column-gap:11px!important;align-items:center!important;width:auto!important;min-width:210px!important;color:var(--ref-gold2)!important;padding:0!important;text-align:left!important}
      .kch-brand-lockup:before{content:'✦';grid-row:1/3;display:grid;place-items:center;width:44px;height:44px;border:1px solid rgba(234,205,134,.55);border-radius:50%;font-size:19px;color:#e8c878;background:radial-gradient(circle,rgba(217,185,109,.18),rgba(217,185,109,.03));box-shadow:0 0 26px rgba(210,178,104,.12)}
      .kch-brand-lockup b{font-family:Georgia,'Times New Roman',serif!important;font-size:19px!important;line-height:1!important;letter-spacing:.035em!important;color:#e8ca83!important}.kch-brand-lockup small{font-size:10px!important;line-height:1.15!important;letter-spacing:0!important;color:#f6e4b5!important;margin-top:3px!important}
      .v118-signature-home .tshop-searchbox{min-height:42px!important;background:rgba(255,255,255,.08)!important;border:1px solid rgba(223,209,168,.25)!important;box-shadow:none!important;color:#eef7f1!important}.v118-signature-home .tshop-searchbox input{color:#eef7f1!important}.v118-signature-home .tshop-searchbox input::placeholder{color:#9fb5aa!important}.v118-signature-home .tshop-searchbox button{color:#e9d29c!important}.v118-signature-home .tshop-top-actions{display:flex!important;align-items:center!important;gap:7px!important}.v118-signature-home .tshop-icon{color:#f3e2ba!important;background:transparent!important}.v118-signature-home .badge{background:#d7b562!important;color:#17382d!important}
      .kch-ref-menu{display:flex;align-items:center;justify-content:center;gap:clamp(20px,3vw,48px);height:44px;padding:0 24px;background:#063126;border-bottom:1px solid rgba(217,185,109,.30);color:#f2e8cf}.kch-ref-menu button{position:relative;border:0;background:transparent;color:#e9eee9;font-size:10px;font-weight:800;letter-spacing:.025em;padding:14px 0 12px;cursor:pointer}.kch-ref-menu button.active,.kch-ref-menu button:hover{color:#e9c979}.kch-ref-menu button.active:after{content:'';position:absolute;left:0;right:0;bottom:0;height:2px;background:#d9b96d}
      .v118-signature-home>.shop-tabs,.v118-signature-home .shop-tabs{display:none!important}
      .kch-ref-hamburger{display:none;border:0;background:transparent;color:#f5e8c7;padding:5px}.kch-ref-mobile-panel{display:none}
      .v118-signature-home .tshop-hero.kch-ref-hero{position:relative!important;display:grid!important;grid-template-columns:minmax(0,.92fr) minmax(420px,1.08fr)!important;min-height:480px!important;margin:0!important;padding:clamp(44px,5vw,76px) clamp(38px,6vw,96px) 78px!important;border:0!important;border-radius:0!important;background:radial-gradient(circle at 68% 34%,rgba(90,220,151,.22),transparent 22%),radial-gradient(circle at 24% 65%,rgba(215,182,100,.10),transparent 24%),linear-gradient(108deg,#03271e 0%,#07392b 50%,#052d23 100%)!important;box-shadow:none!important;overflow:hidden!important}
      .v118-signature-home .tshop-hero.kch-ref-hero:before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 78% 65%,rgba(27,220,141,.10),transparent 18%),linear-gradient(90deg,transparent 0 58%,rgba(131,238,186,.035) 58% 59%,transparent 59%);background-size:auto,52px 52px;opacity:1;pointer-events:none}.v118-signature-home .tshop-hero.kch-ref-hero:after{content:'';position:absolute;right:5%;bottom:-150px;width:520px;height:260px;border-radius:50%;border:1px solid rgba(63,223,152,.38);box-shadow:0 0 0 22px rgba(34,209,136,.04),0 0 70px rgba(43,220,145,.16);transform:perspective(420px) rotateX(70deg);pointer-events:none}
      .kch-ref-copy{position:relative;z-index:3;align-self:center;max-width:650px}.kch-ref-copy .kicker{display:flex;align-items:center;gap:10px;color:#d9b96d;font-size:10px;font-weight:850;letter-spacing:.15em;text-transform:uppercase}.kch-ref-copy .kicker:before{content:'';width:38px;height:1px;background:#d9b96d}.kch-ref-copy h1{margin:15px 0 0!important;font-family:Georgia,'Times New Roman',serif!important;font-size:clamp(43px,5.2vw,76px)!important;line-height:.98!important;letter-spacing:-.025em!important;font-weight:500!important;color:#e8ca83!important;text-shadow:0 8px 38px rgba(0,0,0,.18)}.kch-ref-copy h1 small{display:block;margin-top:12px;font-family:'Noto Sans Thai',sans-serif;font-size:clamp(23px,2.2vw,34px);font-weight:800;color:#f3e3bc;letter-spacing:0}.kch-ref-copy .tagline{margin:23px 0 0;color:#e5d6b3;font-family:Georgia,'Times New Roman',serif;font-size:clamp(16px,1.4vw,21px);letter-spacing:.02em}.kch-ref-copy .desc{max-width:560px;margin:9px 0 0;color:#b7cbc2;font-size:12px;line-height:1.7}.kch-ref-actions{display:flex;gap:10px;margin-top:24px}.kch-ref-actions button{min-height:46px;border-radius:7px;padding:0 22px;font-size:11px;font-weight:900;cursor:pointer}.kch-ref-shop{border:1px solid #e0c075;background:linear-gradient(135deg,#efd38c,#d5ae59);color:#183c2e;box-shadow:0 12px 30px rgba(208,169,84,.18)}.kch-ref-explore{border:1px solid rgba(218,195,137,.42);background:rgba(255,255,255,.025);color:#f3e5c5}
      .kch-ref-stage{position:relative;z-index:3;align-self:center;min-height:340px;display:flex;align-items:flex-end;justify-content:center;gap:12px;padding:20px 76px 25px 18px}.kch-ref-product{position:relative;border:0;background:transparent;padding:0;cursor:pointer;filter:drop-shadow(0 22px 25px rgba(0,0,0,.28));transition:transform .25s ease}.kch-ref-product:hover{transform:translateY(-7px)}.kch-ref-product img{display:block;width:100%;height:100%;object-fit:contain}.kch-ref-product.p1{width:32%;height:260px;z-index:3}.kch-ref-product.p2{width:31%;height:230px;z-index:2}.kch-ref-product.p3{width:27%;height:205px;z-index:1}.kch-ref-stage:before{content:'';position:absolute;left:10%;right:12%;bottom:4px;height:76px;border-radius:50%;background:radial-gradient(ellipse,rgba(49,235,157,.26),rgba(26,130,90,.08) 46%,transparent 70%);border:1px solid rgba(71,236,164,.27);transform:perspective(320px) rotateX(68deg)}
      .kch-ref-quality{position:absolute;right:0;top:58px;display:grid;gap:14px}.kch-ref-quality span{display:flex;align-items:center;gap:8px;color:#cce8dc;font-size:9px;font-weight:800;letter-spacing:.025em}.kch-ref-quality i{display:grid;place-items:center;width:28px;height:28px;border:1px solid rgba(178,245,214,.35);border-radius:50%;color:#9df0c9;font-style:normal}.kch-ref-quality .material-symbols-rounded{font-size:16px}
      .kch-ref-commerce{position:relative;z-index:8;margin:-48px clamp(20px,6vw,92px) 0;border:1px solid rgba(210,195,160,.52);border-radius:22px;background:linear-gradient(180deg,#fffdf7,#f9f5ea);box-shadow:0 22px 60px rgba(31,45,37,.13);overflow:hidden}.kch-ref-trust{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));padding:0 18px;border-bottom:1px solid #e8dfcf}.kch-ref-trust>div{display:flex;align-items:center;justify-content:center;gap:11px;padding:16px 10px;color:#273b32}.kch-ref-trust>div+div{border-left:1px solid #ece4d6}.kch-ref-trust .material-symbols-rounded{font-size:22px;color:#436b59}.kch-ref-trust b,.kch-ref-trust small{display:block}.kch-ref-trust b{font-size:10px}.kch-ref-trust small{margin-top:2px;color:#7b817d;font-size:8px}
      .kch-ref-categories{padding:13px 18px 17px}.kch-ref-categories-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:9px}.kch-ref-categories-head b{font-size:11px;color:#1e3129}.kch-ref-categories-head button{border:0;background:transparent;color:#245746;font-size:9px;font-weight:800}.kch-ref-catrow{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px}.kch-ref-cat{display:flex;align-items:center;gap:8px;min-width:0;padding:8px;border:1px solid #e9e1d3;border-radius:13px;background:#fdfbf5;color:#24362f;text-align:left;cursor:pointer}.kch-ref-cat i{display:grid;place-items:center;flex:0 0 auto;width:36px;height:36px;border-radius:50%;background:#eff1e7;color:#426453;font-style:normal}.kch-ref-cat .material-symbols-rounded{font-size:19px}.kch-ref-cat b,.kch-ref-cat small{display:block}.kch-ref-cat b{font-size:9px;line-height:1.2}.kch-ref-cat small{margin-top:2px;color:#8a8c87;font-size:7px}.kch-ref-cat.active{border-color:#cbb474;background:#fffaf0;box-shadow:inset 0 0 0 1px rgba(203,180,116,.15)}
      .v118-signature-home .quick-icons,.v118-signature-home .v118-smart-helper{display:none!important}.v118-signature-home .category-strip{display:none!important}.v118-signature-home .kch-ref-commerce + .tshop-section{margin-top:22px!important}
      .v118-signature-home .recommend-head{display:flex!important;align-items:center!important;justify-content:space-between!important;margin-top:24px!important;margin-bottom:10px!important;color:#18362c!important;font-size:15px!important;font-weight:900!important}.v118-signature-home .recommend-head:after{content:'ดูทั้งหมด  ›';font-size:9px;color:#2e6652;font-weight:800}.v118-signature-home #product-grid{display:grid!important;grid-template-columns:repeat(6,minmax(0,1fr))!important;gap:12px!important}.v118-signature-home #product-grid .tshop-card{border:1px solid #e8e1d4!important;border-radius:13px!important;background:#fffdf7!important;box-shadow:0 8px 24px rgba(35,48,41,.055)!important}.v118-signature-home #product-grid .tshop-card .visual{border-radius:12px 12px 0 0!important;background:linear-gradient(145deg,#f6f4ec,#eef1e8)!important}.v118-signature-home #product-grid .tshop-card-info{padding:8px!important}.v118-signature-home #product-grid .tshop-card-title{font-size:9.5px!important;line-height:1.35!important}.v118-signature-home #product-grid .tshop-price{color:#164c39!important;font-size:13px!important}.v118-signature-home #product-grid .tshop-meta{font-size:7.5px!important}.v118-signature-home #product-grid .tshop-add{background:#0a4635!important;color:#fff!important;border-radius:7px!important}
      .kch-ref-footer{display:grid;grid-template-columns:1.15fr repeat(4,minmax(0,.7fr));gap:0;margin:34px clamp(14px,4vw,64px) 0;background:linear-gradient(135deg,#073326,#06402f);border:1px solid rgba(209,177,103,.22);border-radius:20px 20px 0 0;color:#e9f2ec;overflow:hidden}.kch-ref-footer>div{padding:23px 20px;min-height:130px}.kch-ref-footer>div+div{border-left:1px solid rgba(228,211,167,.13)}.kch-ref-footer .story b{display:block;color:#e3c476;font-family:Georgia,'Times New Roman',serif;font-size:16px;letter-spacing:.04em}.kch-ref-footer .story p{margin:9px 0 0;color:#b6c9c0;font-size:9px;line-height:1.65}.kch-ref-footitem{text-align:center}.kch-ref-footitem .material-symbols-rounded{font-size:25px;color:#c5e8d6}.kch-ref-footitem b{display:block;margin-top:7px;color:#e2c377;font-size:9px}.kch-ref-footitem small{display:block;margin-top:4px;color:#a8bdb4;font-size:7.5px;line-height:1.45}
      @media(max-width:1100px){.v118-signature-home #product-grid{grid-template-columns:repeat(4,minmax(0,1fr))!important}.kch-ref-catrow{grid-template-columns:repeat(3,minmax(0,1fr))}.kch-ref-footer{grid-template-columns:1fr repeat(2,1fr)}.kch-ref-footer .story{grid-row:span 2}}
      @media(max-width:699px){
        .v118-signature-home .tshop-topbar{position:sticky!important;top:0!important;grid-template-columns:auto 1fr auto!important;gap:7px!important;padding:9px 10px 8px!important;background:rgba(4,42,31,.97)!important;z-index:90!important}.kch-ref-hamburger{display:grid;place-items:center!important;width:34px;height:34px}.kch-brand-lockup{grid-template-columns:auto!important;grid-template-rows:auto auto!important;min-width:0!important;width:auto!important;padding:0!important}.kch-brand-lockup:before{display:none!important}.kch-brand-lockup b{font-size:13px!important;text-align:center}.kch-brand-lockup small{font-size:7px!important;text-align:center}.v118-signature-home .tshop-searchbox{grid-column:1/-1;grid-row:2;min-height:36px!important}.v118-signature-home .tshop-top-actions{grid-column:3;grid-row:1}.v118-signature-home .tshop-icon{width:32px!important;height:32px!important}.kch-ref-menu{display:none!important}.kch-ref-mobile-panel{position:fixed;z-index:120;left:10px;right:10px;top:64px;display:none;padding:8px;border:1px solid rgba(226,198,130,.25);border-radius:16px;background:#062f24;box-shadow:0 20px 70px rgba(0,0,0,.34)}.kch-ref-mobile-panel.open{display:grid}.kch-ref-mobile-panel button{border:0;border-radius:10px;background:transparent;color:#f2ead5;text-align:left;padding:12px 13px;font-size:11px;font-weight:800}.kch-ref-mobile-panel button:active{background:rgba(255,255,255,.07)}
        .v118-signature-home .tshop-hero.kch-ref-hero{display:block!important;min-height:0!important;padding:26px 14px 17px!important;background:radial-gradient(circle at 76% 22%,rgba(75,223,153,.20),transparent 27%),linear-gradient(145deg,#03271e,#073d2e)!important}.kch-ref-copy{text-align:center}.kch-ref-copy .kicker{justify-content:center;font-size:7.8px}.kch-ref-copy .kicker:before{display:none}.kch-ref-copy h1{font-size:35px!important;line-height:1!important;margin-top:10px!important}.kch-ref-copy h1 small{font-size:19px;margin-top:8px}.kch-ref-copy .tagline{margin-top:15px;font-size:13px}.kch-ref-copy .desc{font-size:9.5px;line-height:1.55;margin:6px auto 0}.kch-ref-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:15px}.kch-ref-actions button{min-height:40px;padding:0 10px;font-size:9px}.kch-ref-stage{min-height:210px;margin-top:10px;padding:12px 24px 18px;gap:4px}.kch-ref-product.p1{width:34%;height:180px}.kch-ref-product.p2{width:31%;height:160px}.kch-ref-product.p3{width:29%;height:145px}.kch-ref-quality{display:none}.kch-ref-stage:before{left:8%;right:8%;height:52px}.kch-ref-commerce{margin:-1px 8px 0!important;border-radius:14px!important}.kch-ref-trust{grid-template-columns:repeat(4,minmax(0,1fr));padding:0 4px}.kch-ref-trust>div{display:grid;justify-items:center;text-align:center;gap:4px;padding:10px 3px}.kch-ref-trust>div+div{border-left:0}.kch-ref-trust .material-symbols-rounded{font-size:19px}.kch-ref-trust b{font-size:6.8px}.kch-ref-trust small{font-size:5.8px}.kch-ref-categories{padding:11px 9px 12px}.kch-ref-categories-head b{font-size:9px}.kch-ref-catrow{display:grid;grid-auto-flow:column;grid-auto-columns:76px;grid-template-columns:none;gap:6px;overflow-x:auto;scroll-snap-type:x proximity;scrollbar-width:none}.kch-ref-catrow::-webkit-scrollbar{display:none}.kch-ref-cat{display:grid;justify-items:center;text-align:center;gap:4px;padding:7px 3px;scroll-snap-align:start}.kch-ref-cat i{width:38px;height:38px}.kch-ref-cat b{font-size:7px}.kch-ref-cat small{display:none}.v118-signature-home .recommend-head{margin-top:18px!important;font-size:12px!important}.v118-signature-home #product-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px!important}.kch-ref-footer{grid-template-columns:1fr 1fr!important;margin:22px 8px 72px!important;border-radius:16px!important}.kch-ref-footer .story{grid-column:1/-1;grid-row:auto!important}.kch-ref-footer>div{min-height:0;padding:15px 12px}.kch-ref-footer>div+div{border-left:0}.kch-ref-footer .story b{font-size:14px}.kch-ref-footer .story p{font-size:8px}.kch-ref-footitem{border-top:1px solid rgba(228,211,167,.11)}
      }
    `;document.head.appendChild(s);
  }

  function enhanceHeader(){
    const shell=document.querySelector('.shell');const top=shell?.querySelector('.tshop-topbar');if(!shell||!top)return;
    const brand=top.querySelector('.kch-brand-lockup');if(brand&&!brand.dataset.refBrand){brand.dataset.refBrand='1';brand.innerHTML='<b>KHONCHAIHERB</b><small>คุณชายสมุนไพร</small>'}
    if(!top.querySelector('.kch-ref-hamburger')){const h=document.createElement('button');h.className='kch-ref-hamburger';h.type='button';h.setAttribute('aria-label','เปิดเมนู');h.innerHTML=icon('menu');h.addEventListener('click',()=>document.querySelector('.kch-ref-mobile-panel')?.classList.toggle('open'));top.prepend(h)}
    if(!shell.querySelector('.kch-ref-menu')){
      const nav=document.createElement('nav');nav.className='kch-ref-menu';nav.setAttribute('aria-label','เมนูหลัก');
      const items=[['HOME','home'],['SHOP','products'],['BEST SELLERS','popular'],['NEW ARRIVALS','new'],['PROMOTIONS','deals'],['ABOUT US','about'],['CONTACT','contact']];
      nav.innerHTML=items.map(([label,key],i)=>`<button type="button" data-ref-nav="${key}" class="${i===0?'active':''}">${label}</button>`).join('');top.insertAdjacentElement('afterend',nav);
      nav.addEventListener('click',e=>{const b=e.target.closest('[data-ref-nav]');if(!b)return;runNav(b.dataset.refNav)});
      const panel=document.createElement('div');panel.className='kch-ref-mobile-panel';panel.innerHTML=items.map(([label,key])=>`<button type="button" data-ref-nav="${key}">${label}</button>`).join('');shell.appendChild(panel);panel.addEventListener('click',e=>{const b=e.target.closest('[data-ref-nav]');if(!b)return;panel.classList.remove('open');runNav(b.dataset.refNav)});
    }
  }

  function runNav(key){
    if(key==='home'){if(typeof home==='function')home();return}
    if(key==='products'){document.getElementById('recommend')?.scrollIntoView({behavior:'smooth'});return}
    if(key==='popular'){if(typeof runTShopSearch==='function')runTShopSearch('');document.getElementById('recommend')?.scrollIntoView({behavior:'smooth'});return}
    if(key==='new'){document.getElementById('recommend')?.scrollIntoView({behavior:'smooth'});return}
    if(key==='deals'){document.getElementById('deals')?.scrollIntoView({behavior:'smooth'});return}
    if(key==='about'){document.querySelector('.kch-ref-footer')?.scrollIntoView({behavior:'smooth'});return}
    if(key==='contact'){document.querySelector('.kch-ref-footer')?.scrollIntoView({behavior:'smooth'});return}
  }

  function stageMarkup(){
    return saleProducts().map((p,i)=>{const src=imgOf(p)||fallback[i]?.image||'';const cls=`p${i+1}`;const slug=String(p.slug||'');return `<button type="button" class="kch-ref-product ${cls}" ${slug?`data-product="${String(slug).replace(/"/g,'&quot;')}"`:''} aria-label="ดู ${String(p.name||'สินค้า').replace(/"/g,'&quot;')}"><img src="${src}" alt="${String(p.name||'สินค้า').replace(/"/g,'&quot;')}" loading="${i===0?'eager':'lazy'}" decoding="async"></button>`}).join('')
  }

  function enhanceHero(){
    if(typeof current!=='undefined'&&current!=='home')return;
    const hero=document.querySelector('.tshop-hero');if(!hero)return;
    if(hero.querySelector('.kch-ref-stage'))return;
    hero.classList.add('kch-ref-hero');
    hero.innerHTML=`<div class="kch-ref-copy"><span class="kicker">KHONCHAIHERB • PREMIUM THAI HERBAL</span><h1>KHONCHAIHERB<small>คุณชายสมุนไพร</small></h1><div class="tagline">Ancient Wisdom. Future Wellness.</div><p class="desc">สมุนไพรไทยในประสบการณ์ช้อปยุคใหม่ เลือกสินค้าได้ง่าย ตรวจสอบข้อมูลสำคัญก่อนสั่งซื้อ และติดตามคำสั่งซื้อได้ในที่เดียว</p><div class="kch-ref-actions"><button type="button" class="kch-ref-shop" data-ref-shop>SHOP NOW 🌿</button><button type="button" class="kch-ref-explore" data-ref-explore>EXPLORE COLLECTION</button></div></div><div class="kch-ref-stage">${stageMarkup()}<div class="kch-ref-quality"><span><i>${icon('eco')}</i>HERBAL SELECTION</span><span><i>${icon('workspace_premium')}</i>PREMIUM EXPERIENCE</span><span><i>${icon('fact_check')}</i>CLEAR PRODUCT INFO</span></div></div>`;
    hero.querySelector('[data-ref-shop]')?.addEventListener('click',()=>document.getElementById('recommend')?.scrollIntoView({behavior:'smooth'}));
    hero.querySelector('[data-ref-explore]')?.addEventListener('click',()=>document.querySelector('.kch-ref-commerce')?.scrollIntoView({behavior:'smooth'}));
  }

  function categories(){
    const rows=catalog();const actual=[...new Set(rows.map(p=>String(p.cat||'').trim()).filter(Boolean))];const cats=['ทั้งหมด',...actual].slice(0,6);while(cats.length<6){for(const x of ['ชาสมุนไพร','ผลิตภัณฑ์สมุนไพร','พร้อมส่ง','สินค้ายอดนิยม','ของฝาก']){if(cats.length>=6)break;if(!cats.includes(x))cats.push(x)}}
    const map={'ทั้งหมด':'apps','ชาสมุนไพร':'emoji_food_beverage','ผลิตภัณฑ์สมุนไพร':'nutrition','ดูแลร่างกาย':'spa','เครื่องดื่ม':'local_cafe','ชุดของขวัญ':'redeem','พร้อมส่ง':'inventory_2','สินค้ายอดนิยม':'star','ของฝาก':'redeem'};
    return cats.map((c,i)=>`<button type="button" class="kch-ref-cat ${i===0?'active':''}" data-ref-cat="${c.replace(/"/g,'&quot;')}"><i>${icon(map[c]||'eco')}</i><span><b>${c}</b><small>${c==='ทั้งหมด'?'เลือกชมสินค้าทั้งหมด':'เลือกตามหมวดสินค้า'}</small></span></button>`).join('')
  }

  function enhanceCommercePanel(){
    if(typeof current!=='undefined'&&current!=='home')return;
    const hero=document.querySelector('.tshop-hero');if(!hero||document.querySelector('.kch-ref-commerce'))return;
    const wrap=document.createElement('section');wrap.className='kch-ref-commerce';wrap.innerHTML=`<div class="kch-ref-trust"><div>${icon('assignment_turned_in')}<span><b>EASY ORDERING</b><small>สั่งซื้อง่าย ไม่ซับซ้อน</small></span></div><div>${icon('payments')}<span><b>CASH ON DELIVERY</b><small>รองรับเก็บเงินปลายทาง</small></span></div><div>${icon('local_shipping')}<span><b>SHIPMENT TRACKING</b><small>ติดตามสถานะคำสั่งซื้อ</small></span></div><div>${icon('verified_user')}<span><b>OFFICIAL STORE</b><small>ข้อมูลจากร้านโดยตรง</small></span></div></div><div class="kch-ref-categories"><div class="kch-ref-categories-head"><b>SHOP BY CATEGORY</b><button type="button" data-ref-viewall>View All</button></div><div class="kch-ref-catrow">${categories()}</div></div>`;
    hero.insertAdjacentElement('afterend',wrap);
    wrap.addEventListener('click',e=>{const cat=e.target.closest('[data-ref-cat]');if(cat){const val=cat.dataset.refCat;wrap.querySelectorAll('.kch-ref-cat').forEach(x=>x.classList.toggle('active',x===cat));try{if(typeof activeCategory!=='undefined')activeCategory=val}catch{}if(val==='ทั้งหมด'){if(typeof home==='function')home();return}if(typeof runTShopSearch==='function')runTShopSearch(val);else if(typeof home==='function')home();return}if(e.target.closest('[data-ref-viewall]'))document.getElementById('recommend')?.scrollIntoView({behavior:'smooth'})});
  }

  function enhanceFooter(){
    if(typeof current!=='undefined'&&current!=='home')return;
    const shell=document.querySelector('.shell');if(!shell||shell.querySelector('.kch-ref-footer'))return;
    const footer=document.createElement('section');footer.className='kch-ref-footer';footer.innerHTML=`<div class="story"><b>OUR STORY</b><p>KHONCHAIHERB นำเสนอสมุนไพรไทยผ่านประสบการณ์ช้อปที่ทันสมัย โดยให้ความสำคัญกับข้อมูลสินค้า ความสะดวกในการสั่งซื้อ การจัดส่ง และบริการหลังการขาย</p></div><div class="kch-ref-footitem">${icon('eco')}<b>HERBAL</b><small>ประสบการณ์เลือกซื้อสมุนไพรที่เป็นระบบ</small></div><div class="kch-ref-footitem">${icon('payments')}<b>COD</b><small>รองรับการเก็บเงินปลายทางตามเงื่อนไข</small></div><div class="kch-ref-footitem">${icon('local_shipping')}<b>TRACK</b><small>ติดตามสถานะคำสั่งซื้อได้สะดวก</small></div><div class="kch-ref-footitem">${icon('receipt_long')}<b>RECEIPT</b><small>เชื่อมโยงคำสั่งซื้อและหลักฐานการชำระเงิน</small></div>`;
    const bottom=shell.querySelector(':scope > .tshop-bottom');if(bottom)bottom.insertAdjacentElement('beforebegin',footer);else shell.appendChild(footer)
  }

  function apply(){ensureStyle();enhanceHeader();enhanceHero();enhanceCommercePanel();enhanceFooter()}
  function schedule(){if(frame)return;frame=requestAnimationFrame(()=>{frame=0;try{apply()}catch(err){console.warn('reference storefront enhancement skipped',err?.message||err)}})}
  const app=document.getElementById('app');if(app)new MutationObserver(schedule).observe(app,{childList:true,subtree:true});
  window.addEventListener('resize',schedule,{passive:true});window.addEventListener('load',schedule,{once:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();