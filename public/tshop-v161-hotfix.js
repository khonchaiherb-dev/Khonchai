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
        const style=document.createElement('style');
        style.id='kch-brand-identity-style';
        style.textContent='.kch-brand-lockup{border:0;background:transparent;cursor:pointer}.v118-hero-brand{font-weight:900}@media(min-width:1024px){.v118-signature-home .live-rail,.v118-signature-home .video-feed{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;overflow:visible!important}}';
        (document.head||document.documentElement)?.appendChild?.(style);
      }
      const top=document.querySelector?.('.tshop-topbar');
      if(top&&!top.querySelector?.('.kch-brand-lockup')&&typeof document.createElement==='function'){
        const brand=document.createElement('button');
        brand.type='button';brand.className='kch-brand-lockup';brand.setAttribute('data-go','home');brand.setAttribute('aria-label','คุณชายสมุนไพร หน้าแรก');
        brand.innerHTML='<b>คุณชายสมุนไพร</b><small>KHONCHAIHERB</small>';
        const search=top.querySelector?.('.tshop-searchbox');
        if(search&&typeof top.insertBefore==='function')top.insertBefore(brand,search);else top.prepend?.(brand);
      }
    }catch{}
  };
  const syncUi=()=>{try{const nav=document.querySelector('.tshop-bottom');if(nav)nav.hidden=typeof current!=='undefined'&&['product','checkout'].includes(current);if(typeof count==='function')document.querySelectorAll('.badge').forEach(x=>x.textContent=count());queueMicrotask?.(ensureBrandIdentity)}catch{}};
  const removeDrawer=()=>document.querySelector('#v05-product-drawer')?.remove();
  const interactiveTarget=target=>target?.closest?.('button,a,input,select,textarea,label');
  const openProductSlug=(slug,e)=>{
    if(!slug||typeof current==='undefined'||current!=='home')return false;
    const p=Array.isArray(PRODUCTS)?PRODUCTS.find(x=>x.slug===slug):null;
    if(!p||typeof product!=='function')return false;
    if(e)stop(e);product(p);syncUi();return true
  };
  const ensureMobileHitArea=()=>{
    if(typeof document==='undefined'||typeof document.createElement!=='function')return;
    if(typeof document.getElementById==='function'&&document.getElementById('kch-mobile-product-hitarea'))return;
    const style=document.createElement('style');style.id='kch-mobile-product-hitarea';
    style.textContent='@media (max-width:480px){#recommend,.v116-result-meta{pointer-events:none!important}.v116-discovery{position:relative;z-index:1;pointer-events:none!important}.v116-discovery button,.v116-discovery select,.v116-discovery input,.v116-discovery label{pointer-events:auto!important}#product-grid{position:relative;z-index:2}#product-grid .tshop-card{position:relative;z-index:1;scroll-margin-top:190px;scroll-margin-bottom:84px;touch-action:manipulation}#product-grid .tshop-card>.visual{pointer-events:none!important}#product-grid .tshop-card>.tshop-card-info{position:relative;z-index:2}}';
    (document.head||document.documentElement)?.appendChild?.(style)
  };
  ensureMobileHitArea();ensureBrandIdentity();
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
    openProductSlug(intent.slug,e)
  },true);

  const touchPoint=(list,id)=>{if(!list)return null;for(let i=0;i<list.length;i++){const t=list[i];if(id==null||t.identifier===id)return t}return null};
  document.addEventListener('touchstart',e=>{
    if(productTouch||e.touches?.length!==1)return;
    const target=e.target;if(!target||typeof target.closest!=='function'||interactiveTarget(target))return;
    const card=target.closest('.tshop-card[data-product]');if(!card)return;
    const t=touchPoint(e.touches,null);if(!t)return;
    productTouch={identifier:t.identifier,slug:card.dataset.product,x:Number(t.clientX||0),y:Number(t.clientY||0),moved:false}
  },{capture:true,passive:true});
  document.addEventListener('touchmove',e=>{
    const intent=productTouch;if(!intent)return;const t=touchPoint(e.touches,intent.identifier);if(!t)return;
    if(Math.hypot(Number(t.clientX||0)-intent.x,Number(t.clientY||0)-intent.y)>12)intent.moved=true
  },{capture:true,passive:true});
  document.addEventListener('touchcancel',()=>{productTouch=null},{capture:true,passive:true});
  document.addEventListener('touchend',e=>{
    const intent=productTouch;if(!intent)return;const t=touchPoint(e.changedTouches,intent.identifier);if(!t)return;productTouch=null;
    if(intent.moved||typeof current==='undefined'||current!=='home')return;
    openProductSlug(intent.slug,e)
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
  window.addEventListener('load',boot,{once:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else queueMicrotask(boot);
})();

/* KHONCHAIHERB Master Storefront — approved full-home design */
(()=>{
  if(typeof document==='undefined'||typeof document.createElement!=='function')return;
  if(window.__KCH_REFERENCE_STOREFRONT__==='1.19.0')return;
  window.__KCH_REFERENCE_STOREFRONT__='1.19.0';

  const icon=name=>`<span class="material-symbols-rounded" aria-hidden="true">${name}</span>`;
  const escHtml=s=>typeof esc==='function'?esc(s):String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const money=n=>typeof M==='function'?M(Number(n||0)):`฿${Number(n||0).toLocaleString('th-TH')}`;
  const imgOf=p=>String(p?.image||p?.image_url||'').trim();
  const catalog=()=>Array.isArray(window.PRODUCTS)?window.PRODUCTS:(typeof PRODUCTS!=='undefined'&&Array.isArray(PRODUCTS)?PRODUCTS:[]);
  const launch=[
    {slug:'rang-jued-tea',name:'ชารางจืด',meta:'ชาแบบซอง',image:'/assets/products/rang-jued-tea-360.webp',cat:'ชาและสมุนไพร'},
    {slug:'chiang-da-tea',name:'ชาเชียงดา',meta:'30 ซอง',image:'/assets/products/chiang-da-tea-360.webp',cat:'ชาและสมุนไพร'},
    {slug:'gymnema-capsules-100',name:'ผักเชียงดาแคปซูล',meta:'100 แคปซูล',image:'/assets/products/gymnema-capsules-100-512.webp',cat:'ผลิตภัณฑ์สมุนไพร'}
  ];

  const realProduct=p=>Boolean(p)&&Boolean(imgOf(p));
  const sellable=p=>realProduct(p)&&Number(p.price||0)>0&&Number(p.stock||0)>0&&!p.comingSoon;
  const displayProducts=()=>{
    const rows=catalog().filter(realProduct);
    const seen=new Set(rows.map(p=>String(p.slug||p.name)));
    const previews=launch.filter(p=>!seen.has(String(p.slug))).map(p=>({...p,comingSoon:true,price:0,stock:0,preview:true}));
    return [...rows,...previews].slice(0,6)
  };
  const heroProducts=()=>{
    const rows=displayProducts();
    return [launch[0],launch[1],launch[2]].map(f=>rows.find(p=>String(p.slug)===f.slug)||f)
  };
  const categoryNames=()=>{
    const actual=[...new Set(catalog().map(p=>String(p.cat||p.category||'').trim()).filter(Boolean))];
    const base=['ทั้งหมด',...actual,'ชาและสมุนไพร','ผลิตภัณฑ์สมุนไพร','พร้อมส่ง','สินค้าขายดี','ของฝาก'];
    return [...new Set(base)].slice(0,6)
  };

  function ensureStyle(){
    let s=document.getElementById('kch-master-storefront-style');
    if(!s){s=document.createElement('style');s.id='kch-master-storefront-style'}
    s.textContent=`
      :root{--kch-m-deep:#06382c;--kch-m-deeper:#03271f;--kch-m-deepest:#021b15;--kch-m-gold:#d8b45f;--kch-m-gold2:#f1d48b;--kch-m-cream:#f7f3ea;--kch-m-paper:#fffdf8;--kch-m-ink:#17372b;--kch-m-muted:#6f7d75;--kch-m-line:#e6dfd2;--kch-m-green:#0d5a43;--kch-m-soft:#eef4ee;--kch-m-shadow:0 18px 48px rgba(18,55,42,.10)}
      html body{background:#05271f!important}html body .shell.kch-master-shell{width:min(100%,1600px)!important;max-width:1600px!important;margin:0 auto!important;background:var(--kch-m-cream)!important;overflow:hidden!important;box-shadow:0 0 110px rgba(0,0,0,.35)!important}html body .kch-master-shell> :not(.tshop-topbar):not(.kch-ref-menu):not(.kch-ref-mobile-panel):not(.kch-master-home):not(.tshop-bottom){display:none!important}html body .kch-master-shell .kch-launch-status,html body .kch-master-shell .kch-system-note,html body .kch-master-shell .kch-ready-shelf{display:none!important}
      html body .kch-master-shell .tshop-topbar.kch-master-topbar{position:relative!important;top:auto!important;z-index:80!important;display:grid!important;grid-template-columns:minmax(250px,360px) 1fr minmax(250px,360px)!important;grid-template-rows:auto!important;align-items:center!important;gap:24px!important;min-height:82px!important;padding:14px clamp(26px,5vw,76px)!important;background:linear-gradient(180deg,#06392c,#053326)!important;border:0!important;border-bottom:1px solid rgba(224,190,107,.27)!important;box-shadow:none!important;color:#fff!important;backdrop-filter:none!important}html body .kch-master-shell .tshop-topbar .tshop-searchbox{grid-column:1!important;grid-row:1!important;justify-self:start!important;width:100%!important;min-height:42px!important;border:1px solid rgba(231,210,157,.26)!important;border-radius:12px!important;background:rgba(255,255,255,.075)!important;box-shadow:inset 0 1px rgba(255,255,255,.05)!important}html body .kch-master-shell .tshop-topbar .tshop-searchbox input{color:#f3f6f3!important;font-size:14px!important}html body .kch-master-shell .tshop-topbar .tshop-searchbox input::placeholder{color:#aabbb3!important}html body .kch-master-shell .tshop-topbar .tshop-searchbox button{color:var(--kch-m-gold2)!important}
      html body .kch-master-shell .kch-brand-lockup{grid-column:2!important;grid-row:1!important;justify-self:center!important;display:grid!important;place-items:center!important;min-width:0!important;padding:0 18px!important;color:var(--kch-m-gold2)!important;text-align:center!important;line-height:1!important}html body .kch-master-shell .kch-brand-lockup b{display:flex!important;align-items:center!important;gap:7px!important;font-family:Georgia,'Times New Roman',serif!important;font-size:21px!important;font-weight:500!important;letter-spacing:.04em!important;color:var(--kch-m-gold2)!important}html body .kch-master-shell .kch-brand-lockup b:after{content:'❧';font-size:19px;color:#a3a94f}html body .kch-master-shell .kch-brand-lockup small{margin-top:5px!important;font-size:10px!important;font-weight:800!important;color:#f1d890!important;letter-spacing:.02em!important}html body .kch-master-shell .tshop-top-actions,html body .kch-master-shell .tshop-topbar .actions{grid-column:3!important;grid-row:1!important;justify-self:end!important;display:flex!important;align-items:center!important;gap:22px!important}html body .kch-master-shell .tshop-icon{display:inline-flex!important;align-items:center!important;gap:7px!important;width:auto!important;min-width:0!important;height:40px!important;padding:0 4px!important;color:#f2d687!important;background:transparent!important;border:0!important}html body .kch-master-shell .tshop-icon[data-go="account"]:after{content:'บัญชีของฉัน';font-size:11px;font-weight:800;color:#f4ead3;white-space:nowrap}html body .kch-master-shell .tshop-icon[data-go="cart"]:after{content:'ตะกร้าสินค้า';font-size:11px;font-weight:800;color:#f4ead3;white-space:nowrap}html body .kch-master-shell .badge{background:var(--kch-m-gold)!important;color:#17362b!important;border:1px solid rgba(255,255,255,.45)!important}html body .kch-ref-hamburger{display:none!important}
      html body .kch-ref-menu{position:relative;z-index:75;display:flex;align-items:center;justify-content:center;gap:clamp(24px,3.2vw,52px);min-height:48px;padding:0 28px;background:#06362a;border-bottom:1px solid rgba(217,185,109,.26)}html body .kch-ref-menu button{position:relative;border:0;background:transparent;color:#f0eee6;padding:16px 0 14px;font-size:11px;font-weight:850;letter-spacing:.025em;cursor:pointer}html body .kch-ref-menu button:hover,html body .kch-ref-menu button.active{color:var(--kch-m-gold2)}html body .kch-ref-menu button.active:after{content:'';position:absolute;left:0;right:0;bottom:0;height:2px;border-radius:999px;background:var(--kch-m-gold)}
      html body .kch-master-home{display:block!important;background:var(--kch-m-cream)!important;color:var(--kch-m-ink)!important}html body .kch-master-home button,html body .kch-master-home input{font:inherit}html body .kch-master-home button{cursor:pointer}
      html body .kch-master-hero{position:relative;isolation:isolate;display:grid;grid-template-columns:minmax(0,.92fr) minmax(520px,1.08fr);min-height:520px;padding:52px clamp(46px,6vw,92px) 76px;overflow:hidden;color:#fff;background:radial-gradient(circle at 66% 33%,rgba(85,225,158,.22),transparent 24%),radial-gradient(circle at 94% 72%,rgba(202,161,70,.12),transparent 28%),linear-gradient(112deg,#052c23 0%,#064333 56%,#052e24 100%)}html body .kch-master-hero:before{content:'';position:absolute;inset:0;z-index:-2;pointer-events:none;opacity:.58;background-image:linear-gradient(90deg,rgba(148,235,195,.05) 1px,transparent 1px),linear-gradient(rgba(148,235,195,.04) 1px,transparent 1px);background-size:56px 56px;mask-image:linear-gradient(90deg,transparent,black 26%,black 85%,transparent)}html body .kch-master-hero:after{content:'❧  ❧';position:absolute;left:-56px;bottom:18px;z-index:-1;color:rgba(212,183,108,.32);font-family:Georgia,serif;font-size:190px;line-height:.55;transform:rotate(-15deg);letter-spacing:-.36em;pointer-events:none}
      .kch-master-hero-copy{position:relative;z-index:3;align-self:center;max-width:660px}.kch-master-kicker{display:flex;align-items:center;gap:10px;color:var(--kch-m-gold2);font-size:11px;font-weight:900;letter-spacing:.16em}.kch-master-kicker:before{content:'';width:38px;height:1px;background:var(--kch-m-gold)}.kch-master-hero h1{margin:18px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:clamp(52px,5.7vw,82px);font-weight:500;letter-spacing:-.025em;line-height:.95;color:#edcc7e;text-shadow:0 10px 36px rgba(0,0,0,.18)}.kch-master-hero h1 small{display:block;margin-top:13px;font-family:'Noto Sans Thai',sans-serif;font-size:clamp(25px,2.25vw,34px);font-weight:900;letter-spacing:0;color:#f4dfae}.kch-master-tagline{margin-top:24px;font-family:Georgia,'Times New Roman',serif;color:#f0dba9;font-size:clamp(17px,1.6vw,23px)}.kch-master-desc{max-width:620px;margin:11px 0 0;color:#c8d7d0;font-size:13px;line-height:1.78}.kch-master-hero-actions{display:flex;gap:12px;margin-top:26px}.kch-master-hero-actions button{min-height:48px;border-radius:7px;padding:0 24px;font-size:11px;font-weight:900;letter-spacing:.02em}.kch-master-shop{border:1px solid #e8ca7d;background:linear-gradient(135deg,#f0d38a,#d4aa50);color:#18372c;box-shadow:0 12px 28px rgba(211,169,80,.18)}.kch-master-explore{border:1px solid rgba(230,205,147,.5);background:rgba(255,255,255,.025);color:#f4e6c5}
      .kch-master-stage{position:relative;z-index:3;align-self:center;display:flex;align-items:flex-end;justify-content:center;gap:14px;min-height:360px;padding:24px 12px 40px}.kch-master-stage:before{content:'';position:absolute;left:6%;right:4%;bottom:17px;height:76px;border-radius:50%;background:radial-gradient(ellipse,rgba(220,176,83,.50),rgba(137,89,28,.24) 38%,transparent 69%);transform:perspective(420px) rotateX(67deg);box-shadow:0 0 36px rgba(215,169,74,.24)}.kch-master-showcase{position:relative;z-index:2;width:31%;height:285px;border:1px solid rgba(243,214,147,.74);border-radius:15px;background:linear-gradient(145deg,rgba(255,255,255,.97),rgba(248,246,238,.95));box-shadow:0 0 0 3px rgba(222,184,92,.08),0 10px 38px rgba(0,0,0,.26),0 0 24px rgba(236,198,108,.22);overflow:hidden;padding:10px}.kch-master-showcase:nth-child(2){height:255px;transform:translateY(10px)}.kch-master-showcase:nth-child(3){height:232px;transform:translateY(20px)}.kch-master-showcase:after{content:'';position:absolute;left:10%;right:10%;bottom:-18px;height:28px;border-radius:50%;background:linear-gradient(#bb8437,#6c3c16);box-shadow:0 8px 24px rgba(0,0,0,.28)}.kch-master-showcase img{width:100%;height:100%;object-fit:contain;display:block;filter:drop-shadow(0 13px 18px rgba(0,0,0,.12))}.kch-master-hero-benefits{grid-column:1/-1;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:12px 0 -54px auto;width:min(690px,62%);position:relative;z-index:4}.kch-master-hero-benefits>div{display:flex;align-items:center;gap:8px;color:#d9e6df}.kch-master-hero-benefits .material-symbols-rounded{display:grid;place-items:center;width:32px;height:32px;border:1px solid rgba(233,199,111,.5);border-radius:50%;font-size:17px;color:#e3bf62}.kch-master-hero-benefits b{display:block;color:#f0e4c6;font-size:9.5px}.kch-master-hero-benefits small{display:block;margin-top:2px;color:#abc0b6;font-size:7.8px;line-height:1.35}
      .kch-master-finder{position:relative;z-index:9;width:min(1250px,calc(100% - 84px));margin:-22px auto 0;padding:14px 18px;border:1px solid rgba(221,214,199,.9);border-radius:16px;background:rgba(255,253,248,.96);box-shadow:var(--kch-m-shadow);display:flex;align-items:center;gap:10px;flex-wrap:wrap}.kch-master-finder h2{margin:0 18px 0 0;font-size:15px;color:#153c2f;white-space:nowrap}.kch-master-filter{min-height:40px;border:1px solid #e3e5df;border-radius:10px;background:#fff;color:#53655b;padding:0 14px;font-size:11px;font-weight:800}.kch-master-filter.active{border-color:#d4b76a;background:#fff9eb;color:#765c25}.kch-master-range{margin-left:auto;display:flex;align-items:center;gap:8px;color:#63736a;font-size:10px;min-width:260px}.kch-master-range input{width:150px;accent-color:#c7a755}.kch-master-reset{border:0;background:transparent;color:#2c664f;font-size:10px;font-weight:850}
      .kch-master-section{width:min(1280px,calc(100% - 72px));margin:28px auto 0}.kch-master-section-head{display:flex;align-items:end;justify-content:space-between;gap:16px;margin-bottom:14px}.kch-master-section-head h2{margin:0;color:#153e30;font-size:21px;line-height:1.25}.kch-master-section-head p{margin:5px 0 0;color:#7a847e;font-size:10px}.kch-master-section-head button{border:0;background:transparent;color:#285d48;font-size:10px;font-weight:850}.kch-master-products{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:14px}.kch-master-product{position:relative;min-width:0;border:1px solid #e7dfd2;border-radius:13px;background:#fffdf8;overflow:hidden;box-shadow:0 8px 24px rgba(35,48,41,.055);transition:transform .22s ease,box-shadow .22s ease}.kch-master-product:hover{transform:translateY(-4px);box-shadow:0 16px 36px rgba(29,58,45,.11)}.kch-master-product-media{position:relative;display:grid;place-items:center;height:225px;background:linear-gradient(145deg,#f7f4ec,#edf1e9);overflow:hidden}.kch-master-product-media img{width:100%;height:100%;object-fit:contain;padding:16px;filter:drop-shadow(0 14px 18px rgba(19,51,36,.12))}.kch-master-tag{position:absolute;left:10px;top:10px;border-radius:999px;background:#d4aa51;color:#fff;padding:5px 8px;font-size:8px;font-weight:900}.kch-master-tag.soon{background:#315b48}.kch-master-product-copy{padding:11px 11px 12px}.kch-master-product-copy h3{margin:0;color:#183e30;font-size:12px;line-height:1.45;min-height:35px}.kch-master-product-copy .meta{display:flex;align-items:center;gap:5px;min-height:20px;margin-top:4px;color:#8a8d87;font-size:8.5px}.kch-master-product-copy .meta .stars{color:#d0a43e}.kch-master-product-bottom{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:8px}.kch-master-price{color:#0e563f;font-size:14px;font-weight:900}.kch-master-product-bottom button{display:grid;place-items:center;width:31px;height:31px;border:0;border-radius:8px;background:#0b4d3a;color:#f1d27f}.kch-master-product-bottom button[disabled]{background:#edf1ed;color:#829087;cursor:default}.kch-master-no-price{color:#8a713b;font-size:11px;font-weight:850}
      .kch-master-trust{margin-top:18px;background:linear-gradient(90deg,#06402f,#07503a,#06402f);color:#fff}.kch-master-trust-inner{width:min(1280px,calc(100% - 72px));margin:auto;display:grid;grid-template-columns:repeat(4,minmax(0,1fr))}.kch-master-trust-item{display:flex;align-items:center;justify-content:center;gap:11px;padding:17px 12px}.kch-master-trust-item+div{border-left:1px solid rgba(224,198,125,.14)}.kch-master-trust-item .material-symbols-rounded{font-size:27px;color:#d6b65f}.kch-master-trust-item b{display:block;font-size:10px;color:#f1dc9d}.kch-master-trust-item small{display:block;margin-top:2px;font-size:8px;color:#b9c9c1}
      .kch-master-categories{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px}.kch-master-category{display:flex;align-items:center;gap:10px;min-height:76px;border:1px solid #e6dfd2;border-radius:13px;background:#fffdf8;padding:9px;text-align:left;color:#203b30}.kch-master-category-media{display:grid;place-items:center;flex:0 0 54px;width:54px;height:54px;border-radius:12px;overflow:hidden;background:#f0f4ed}.kch-master-category-media img{width:100%;height:100%;object-fit:contain;padding:4px}.kch-master-category-media .material-symbols-rounded{font-size:22px;color:#3c7059}.kch-master-category b{display:block;font-size:9.5px}.kch-master-category small{display:block;margin-top:3px;color:#8a918d;font-size:7px;line-height:1.35}
      .kch-master-split{display:grid;grid-template-columns:.88fr 1.12fr;gap:18px;align-items:start}.kch-master-promo-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.kch-master-promo{min-height:150px;border:1px solid #f1dede;border-radius:13px;background:linear-gradient(145deg,#fff7f7,#fff1f1);padding:14px;overflow:hidden}.kch-master-promo:nth-child(3n){border-color:#dce7dd;background:linear-gradient(145deg,#f7fbf7,#edf6ef)}.kch-master-promo .material-symbols-rounded{font-size:31px;color:#d15d68}.kch-master-promo:nth-child(3n) .material-symbols-rounded{color:#28704e}.kch-master-promo b{display:block;margin-top:10px;color:#49312d;font-size:10px}.kch-master-promo strong{display:block;margin-top:3px;color:#dd4053;font-size:20px}.kch-master-promo:nth-child(3n) strong{color:#246344}.kch-master-promo small{display:block;margin-top:8px;color:#8c7775;font-size:8px;line-height:1.45}.kch-master-review-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.kch-master-review{min-height:150px;border:1px solid #e6e3db;border-radius:13px;background:#fff;padding:14px}.kch-master-review-head{display:flex;align-items:center;gap:9px}.kch-master-avatar{display:grid;place-items:center;width:36px;height:36px;border-radius:50%;background:#eef3ee;color:#315f4a;font-weight:900;font-size:12px}.kch-master-review-head b{font-size:9.5px}.kch-master-review .stars{margin-top:2px;color:#d6a83c;font-size:9px}.kch-master-review p{margin:10px 0 0;color:#5f6c65;font-size:9px;line-height:1.55}.kch-master-review small{display:block;margin-top:9px;color:#99a19c;font-size:7.5px}
      .kch-master-story{width:min(1360px,calc(100% - 32px));margin:30px auto 0;display:grid;grid-template-columns:minmax(300px,.92fr) minmax(0,1.08fr);min-height:240px;border:1px solid #e8e0d2;border-radius:16px;background:linear-gradient(145deg,#fffdf8,#f6f4ed);overflow:hidden}.kch-master-story-visual{position:relative;display:grid;place-items:center;overflow:hidden;background:radial-gradient(circle at 62% 38%,rgba(219,188,112,.22),transparent 28%),linear-gradient(135deg,#c9d6bc,#7c9f7d)}.kch-master-story-visual:before{content:'❧';position:absolute;left:-20px;bottom:-35px;color:rgba(255,255,255,.48);font-family:Georgia,serif;font-size:180px;transform:rotate(-25deg)}.kch-master-story-visual img{position:relative;z-index:2;width:60%;height:78%;object-fit:contain;filter:drop-shadow(0 20px 20px rgba(20,45,34,.18))}.kch-master-story-copy{display:grid;grid-template-columns:1fr .78fr;gap:24px;align-items:center;padding:28px 30px}.kch-master-story-copy .eyebrow{color:#876c36;font-size:9px;font-weight:900;letter-spacing:.1em}.kch-master-story-copy h2{margin:6px 0 0;font-size:22px;color:#173e30}.kch-master-story-copy p{margin:8px 0 0;color:#68766f;font-size:10px;line-height:1.7}.kch-master-story-copy button{margin-top:14px;min-height:38px;border:0;border-radius:8px;background:#0b4d39;color:#fff;padding:0 14px;font-size:9px;font-weight:850}.kch-master-story-points{display:grid;grid-template-columns:1fr 1fr;gap:9px}.kch-master-story-point{display:flex;align-items:center;gap:8px;padding:10px;border:1px solid #e1e6df;border-radius:11px;background:rgba(255,255,255,.72)}.kch-master-story-point .material-symbols-rounded{font-size:22px;color:#376d55}.kch-master-story-point b{display:block;font-size:9px}.kch-master-story-point small{display:block;margin-top:2px;color:#849089;font-size:7px}
      .kch-master-newsletter{margin-top:0;background:linear-gradient(90deg,#06402f,#07503a);color:#fff}.kch-master-newsletter-inner{width:min(1360px,calc(100% - 72px));margin:auto;display:grid;grid-template-columns:1fr minmax(360px,.9fr) auto;align-items:center;gap:24px;padding:18px 0}.kch-master-news-copy{display:flex;align-items:center;gap:12px}.kch-master-news-copy .material-symbols-rounded{font-size:32px;color:#d9b65f}.kch-master-news-copy b{display:block;color:#f2dc9d;font-size:11px}.kch-master-news-copy small{display:block;margin-top:3px;color:#b7c9bf;font-size:8px}.kch-master-news-form{display:grid;grid-template-columns:1fr auto}.kch-master-news-form input{min-height:40px;border:1px solid rgba(255,255,255,.22);border-radius:8px 0 0 8px;background:#fff;color:#30473c;padding:0 13px;font-size:10px}.kch-master-news-form button{border:0;border-radius:0 8px 8px 0;background:#d6b156;color:#17382c;padding:0 18px;font-size:9px;font-weight:900}.kch-master-social{display:flex;align-items:center;gap:8px}.kch-master-social b{margin-right:4px;font-size:9px;color:#f2e5c5}.kch-master-social span{display:grid;place-items:center;width:27px;height:27px;border-radius:50%;background:rgba(255,255,255,.12);font-size:9px;font-weight:900}
      .kch-master-footer{background:linear-gradient(135deg,#063529,#052d23);color:#d8e3dd;border-top:1px solid rgba(218,180,92,.20)}.kch-master-footer-inner{width:min(1360px,calc(100% - 72px));margin:auto;display:grid;grid-template-columns:1.15fr repeat(4,minmax(0,.8fr));gap:28px;padding:31px 0 24px}.kch-master-footer-brand h3{margin:0;font-family:Georgia,'Times New Roman',serif;color:#e0c06d;font-size:21px;font-weight:500}.kch-master-footer-brand b{display:block;margin-top:3px;color:#f2dfa9;font-size:9px}.kch-master-footer-brand p{margin:14px 0 0;color:#b7c8bf;font-family:Georgia,serif;font-size:10px;line-height:1.6}.kch-master-footer-col h4{margin:0;color:#e3c573;font-size:10px}.kch-master-footer-col button,.kch-master-footer-col a{display:block;border:0;background:transparent;color:#c1d0c8;padding:4px 0;text-align:left;text-decoration:none;font-size:8.5px}.kch-master-footer-bottom{border-top:1px solid rgba(219,190,119,.16)}.kch-master-footer-bottom>div{width:min(1360px,calc(100% - 72px));margin:auto;display:flex;align-items:center;justify-content:space-between;gap:20px;padding:13px 0;color:#98aaa1;font-size:7.5px}.kch-master-payments{display:flex;gap:6px}.kch-master-payments span{border-radius:4px;background:#fff;color:#264b3b;padding:4px 7px;font-size:7px;font-weight:900}
      @media(max-width:1100px){html body .kch-master-shell .tshop-topbar.kch-master-topbar{grid-template-columns:minmax(220px,300px) 1fr minmax(190px,260px)!important;padding-inline:28px!important}.kch-master-hero{grid-template-columns:1fr 1fr;padding-inline:36px}.kch-master-stage{padding-right:0}.kch-master-showcase{width:33%}.kch-master-categories{grid-template-columns:repeat(3,minmax(0,1fr))}.kch-master-split{grid-template-columns:1fr}.kch-master-footer-inner{grid-template-columns:1.2fr repeat(2,1fr)}}
      @media(max-width:699px){html body .kch-master-shell .tshop-topbar.kch-master-topbar{position:sticky!important;top:0!important;grid-template-columns:38px 1fr auto!important;grid-template-rows:auto auto!important;gap:8px!important;padding:9px 10px 8px!important;z-index:110!important}html body .kch-master-shell .kch-ref-hamburger{display:grid!important;grid-column:1;grid-row:1;place-items:center;width:36px;height:36px;border:0;background:transparent;color:#f1d48b}html body .kch-master-shell .kch-brand-lockup{grid-column:2!important;grid-row:1!important;padding:0!important}html body .kch-master-shell .kch-brand-lockup b{font-size:15px!important}html body .kch-master-shell .kch-brand-lockup small{font-size:8px!important}html body .kch-master-shell .tshop-top-actions,html body .kch-master-shell .tshop-topbar .actions{grid-column:3!important;grid-row:1!important;gap:5px!important}html body .kch-master-shell .tshop-icon[data-go="account"]:after,html body .kch-master-shell .tshop-icon[data-go="cart"]:after{display:none!important}html body .kch-master-shell .tshop-topbar .tshop-searchbox{grid-column:1/-1!important;grid-row:2!important;min-height:39px!important}html body .kch-ref-menu{display:none!important}html body .kch-ref-mobile-panel{position:fixed;z-index:130;left:10px;right:10px;top:61px;display:none;padding:8px;border:1px solid rgba(225,193,115,.30);border-radius:16px;background:#06372a;box-shadow:0 20px 70px rgba(0,0,0,.35)}html body .kch-ref-mobile-panel.open{display:grid!important}html body .kch-ref-mobile-panel button{border:0;border-radius:10px;background:transparent;color:#f4ead3;text-align:left;padding:12px 13px;font-size:11px;font-weight:850}.kch-master-hero{display:block;min-height:0;padding:28px 15px 18px;text-align:center}.kch-master-kicker{justify-content:center;font-size:8px}.kch-master-kicker:before{display:none}.kch-master-hero h1{font-size:42px}.kch-master-hero h1 small{font-size:21px}.kch-master-tagline{font-size:15px;margin-top:17px}.kch-master-desc{font-size:10px;line-height:1.65;margin-inline:auto}.kch-master-hero-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}.kch-master-hero-actions button{padding:0 8px;font-size:9px;min-height:43px}.kch-master-stage{min-height:220px;margin-top:12px;padding:10px 10px 28px;gap:5px}.kch-master-showcase{width:34%;height:188px!important;padding:5px}.kch-master-showcase:nth-child(2){height:170px!important}.kch-master-showcase:nth-child(3){height:154px!important}.kch-master-hero-benefits{width:100%;margin:7px 0 0;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.kch-master-hero-benefits>div{justify-content:flex-start;text-align:left}.kch-master-hero-benefits b{font-size:8px}.kch-master-hero-benefits small{font-size:7px}.kch-master-finder{width:calc(100% - 20px);margin:0 auto;padding:10px;border-radius:14px;gap:7px}.kch-master-finder h2{width:100%;margin:0 0 2px;text-align:left}.kch-master-filter{flex:0 0 auto;min-height:36px;padding:0 10px;font-size:9px}.kch-master-range{width:100%;min-width:0;margin-left:0}.kch-master-range input{flex:1}.kch-master-section{width:calc(100% - 20px);margin-top:21px}.kch-master-section-head h2{font-size:18px}.kch-master-products{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(158px,72%);grid-template-columns:none;overflow-x:auto;gap:9px;scroll-snap-type:x mandatory;scrollbar-width:none;padding-bottom:4px}.kch-master-products::-webkit-scrollbar{display:none}.kch-master-product{scroll-snap-align:start}.kch-master-product-media{height:178px}.kch-master-trust-inner{width:100%;grid-template-columns:repeat(2,minmax(0,1fr))}.kch-master-trust-item{justify-content:flex-start;padding:12px 10px}.kch-master-trust-item+div{border-left:0}.kch-master-categories{display:grid;grid-auto-flow:column;grid-auto-columns:132px;grid-template-columns:none;overflow-x:auto;scroll-snap-type:x proximity;scrollbar-width:none}.kch-master-categories::-webkit-scrollbar{display:none}.kch-master-category{scroll-snap-align:start;display:grid;justify-items:center;text-align:center}.kch-master-category-media{width:58px;height:58px}.kch-master-promo-grid,.kch-master-review-grid{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(170px,76%);grid-template-columns:none;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none}.kch-master-promo-grid::-webkit-scrollbar,.kch-master-review-grid::-webkit-scrollbar{display:none}.kch-master-promo,.kch-master-review{scroll-snap-align:start}.kch-master-story{width:calc(100% - 20px);grid-template-columns:1fr;min-height:0}.kch-master-story-visual{min-height:190px}.kch-master-story-visual img{width:48%;height:170px}.kch-master-story-copy{grid-template-columns:1fr;padding:19px}.kch-master-story-points{grid-template-columns:1fr 1fr}.kch-master-newsletter-inner{width:calc(100% - 20px);grid-template-columns:1fr;gap:12px;padding:16px 0}.kch-master-news-form{grid-template-columns:1fr auto}.kch-master-social{justify-content:flex-start}.kch-master-footer-inner{width:calc(100% - 24px);grid-template-columns:1fr 1fr;gap:20px;padding:26px 0 86px}.kch-master-footer-brand{grid-column:1/-1}.kch-master-footer-bottom>div{width:calc(100% - 24px);display:block;text-align:center}.kch-master-payments{justify-content:center;margin-top:8px}html body .kch-master-shell .tshop-bottom{display:flex!important}}
      @media(min-width:700px){html body .kch-master-shell .tshop-bottom{display:none!important}}@media(prefers-reduced-motion:reduce){.kch-master-product,.kch-master-showcase{transition:none!important}}
    `;
    if(s.parentNode)s.remove();(document.head||document.documentElement).appendChild(s)
  }

  function enhanceHeader(shell){
    const top=shell.querySelector('.tshop-topbar');if(!top)return;top.classList.add('kch-master-topbar');
    let brand=top.querySelector('.kch-brand-lockup');if(!brand){brand=document.createElement('button');brand.type='button';brand.className='kch-brand-lockup';brand.dataset.go='home';top.appendChild(brand)}brand.innerHTML='<b>KHONCHAIHERB</b><small>คุณชายสมุนไพร</small>';
    const search=top.querySelector('.tshop-searchbox');if(search)top.prepend(search);
    let actions=top.querySelector('.tshop-top-actions');if(!actions){actions=top.querySelector('.actions');if(actions)actions.classList.add('tshop-top-actions')}
    let burger=top.querySelector('.kch-ref-hamburger');if(!burger){burger=document.createElement('button');burger.type='button';burger.className='kch-ref-hamburger';burger.setAttribute('aria-label','เปิดเมนู');burger.innerHTML=icon('menu');top.prepend(burger)}
    if(!shell.querySelector('.kch-ref-menu')){const nav=document.createElement('nav');nav.className='kch-ref-menu';nav.setAttribute('aria-label','เมนูหลัก');nav.innerHTML=[['หน้าแรก','home'],['สินค้าทั้งหมด','products'],['สินค้าแนะนำ','products'],['สินค้าใหม่','products'],['โปรโมชั่น','promotions'],['เกี่ยวกับเรา','story'],['ติดต่อเรา','footer']].map(([label,id],i)=>`<button type="button" class="${i===0?'active':''}" data-kch-jump="${id}">${label}</button>`).join('');top.insertAdjacentElement('afterend',nav)}
    let mobile=shell.querySelector('.kch-ref-mobile-panel');if(!mobile){mobile=document.createElement('div');mobile.className='kch-ref-mobile-panel';mobile.innerHTML=[['หน้าแรก','home'],['สินค้าทั้งหมด','products'],['สินค้าแนะนำ','products'],['สินค้าใหม่','products'],['โปรโมชั่น','promotions'],['เกี่ยวกับเรา','story'],['ติดต่อเรา','footer']].map(([label,id])=>`<button type="button" data-kch-jump="${id}">${label}</button>`).join('');shell.appendChild(mobile)}burger.onclick=()=>mobile.classList.toggle('open')
  }

  const catIcon=c=>({'ทั้งหมด':'apps','ชาสมุนไพร':'emoji_food_beverage','ชาและสมุนไพร':'emoji_food_beverage','ผลิตภัณฑ์สมุนไพร':'nutrition','พร้อมส่ง':'inventory_2','สินค้าขายดี':'star','สินค้ายอดนิยม':'star','ของฝาก':'redeem','ชุดของขวัญ':'redeem','ดูแลร่างกาย':'spa'}[c]||'eco');
  function categoryImage(c,products){const n=String(c||'');const p=products.find(x=>String(x.cat||x.category||'')===n&&imgOf(x))||(n.includes('ชา')?products.find(x=>String(x.slug||'').includes('tea')):null)||products.find(x=>imgOf(x));return p?imgOf(p):''}
  function productCard(p){
    const actual=catalog().find(x=>String(x.slug||'')===String(p.slug||''));const active=Boolean(actual),canBuy=active&&sellable(actual),image=imgOf(p)||launch.find(x=>x.slug===p.slug)?.image||'',name=String(p.name||'ผลิตภัณฑ์คุณชายสมุนไพร'),cat=String(p.cat||p.category||'ผลิตภัณฑ์สมุนไพร'),verified=active&&Number(actual.sale_verified)===1,rating=verified&&Number(actual.rating||0)>0?Number(actual.rating):0,tag=String(p.tag||'').trim()||(canBuy?'พร้อมสั่งซื้อ':'เร็ว ๆ นี้');
    return `<article class="kch-master-product tshop-card" ${active?`data-product="${escHtml(actual.slug)}"`:''} data-kch-name="${escHtml(name.toLowerCase())}" data-kch-cat="${escHtml(cat)}" data-kch-price="${Number(actual?.price||0)}"><div class="kch-master-product-media">${tag?`<span class="kch-master-tag ${canBuy?'':'soon'}">${escHtml(tag)}</span>`:''}${image?`<img src="${escHtml(image)}" alt="${escHtml(name)}" loading="lazy" decoding="async">`:icon('eco')}</div><div class="kch-master-product-copy"><h3>${escHtml(name)}</h3><div class="meta">${rating?`<span class="stars">★★★★★</span><span>${rating.toFixed(1)}</span>`:`<span>${escHtml(cat)}</span>`}</div><div class="kch-master-product-bottom">${canBuy?`<span class="kch-master-price">${money(actual.price)}</span><button type="button" data-add="${Number(actual.id)}" aria-label="เพิ่ม ${escHtml(name)} ลงตะกร้า">${icon('shopping_cart')}</button>`:`<span class="kch-master-no-price">เตรียมพบเร็ว ๆ นี้</span><button type="button" disabled aria-label="ยังไม่เปิดจำหน่าย">${icon('schedule')}</button>`}</div></div></article>`
  }
  function promotionCards(){
    let promos=[];try{if(typeof V07_PROMOTIONS!=='undefined'&&Array.isArray(V07_PROMOTIONS))promos=V07_PROMOTIONS}catch{}if(!promos.length){try{if(typeof COUPONS!=='undefined'&&Array.isArray(COUPONS))promos=COUPONS}catch{}}
    if(promos.length)return promos.slice(0,3).map((p,i)=>{const pct=String(p.type||'')==='percent',value=pct?`ลด ${Number(p.value||0)}%`:`ลด ${money(p.value||0)}`,min=Number(p.minSpend||p.min_spend||0);return `<div class="kch-master-promo">${icon(i===2?'local_shipping':'redeem')}<b>${escHtml(p.name||p.code||'สิทธิพิเศษ')}</b><strong>${escHtml(value)}</strong><small>${min>0?`เมื่อยอดสั่งซื้อตั้งแต่ ${money(min)}`:'ตรวจสอบเงื่อนไขก่อนยืนยันคำสั่งซื้อ'}</small></div>`}).join('');
    return [['payments','เก็บเงินปลายทาง','ชำระปลายทาง','รองรับในคำสั่งซื้อที่เข้าเงื่อนไข'],['local_shipping','ติดตามคำสั่งซื้อ','ติดตามพัสดุ','ตรวจสถานะคำสั่งซื้อได้สะดวก'],['receipt_long','ใบเสร็จ','ใบเสร็จรับเงิน','รับใบเสร็จหลังชำระเงินหรือรับเงินปลายทางสำเร็จ']].map(([ic,b,strong,sm])=>`<div class="kch-master-promo">${icon(ic)}<b>${b}</b><strong>${strong}</strong><small>${sm}</small></div>`).join('')
  }
  function safeReviewCards(){return [['verified_user','รีวิวจากการซื้อจริง','รีวิวเชื่อมกับคำสั่งซื้อที่จัดส่งสำเร็จเท่านั้น'],['fact_check','ข้อมูลตรวจสอบได้','คะแนนและความคิดเห็นจะแสดงจากข้อมูลที่ยืนยันแล้ว'],['inventory_2','ประสบการณ์หลังสั่งซื้อ','ให้ความสำคัญกับสินค้า การแพ็ก การจัดส่ง และบริการ']].map(([ic,b,p])=>`<article class="kch-master-review"><div class="kch-master-review-head"><div class="kch-master-avatar">${icon(ic)}</div><div><b>${b}</b><div class="stars">ตรวจสอบจากคำสั่งซื้อ</div></div></div><p>${p}</p><small>มาตรฐานรีวิว KHONCHAIHERB</small></article>`).join('')}

  function buildHome(){
    const products=displayProducts(),hero=heroProducts(),cats=categoryNames(),storyImage=products.find(p=>imgOf(p))?.image||launch[1].image,maxPrice=Math.max(1000,...products.map(p=>Number(p.price||0)));
    return `<main class="kch-master-home" id="kch-home"><section class="kch-master-hero"><div class="kch-master-hero-copy"><span class="kch-master-kicker">KHONCHAIHERB • สมุนไพรไทยพรีเมียม</span><h1>KHONCHAIHERB<small>คุณชายสมุนไพร</small></h1><div class="kch-master-tagline">ภูมิปัญญาสมุนไพรไทย สู่การดูแลสุขภาพยุคใหม่</div><p class="kch-master-desc">สมุนไพรไทยในประสบการณ์ช้อปยุคใหม่ เลือกสินค้าได้ง่าย ตรวจสอบข้อมูลสำคัญก่อนสั่งซื้อ และติดตามคำสั่งซื้อได้ในที่เดียว</p><div class="kch-master-hero-actions"><button type="button" class="kch-master-shop" data-kch-jump="products">เลือกซื้อสินค้า 🌿</button><button type="button" class="kch-master-explore" data-kch-jump="categories">เลือกดูหมวดสินค้า</button></div></div><div class="kch-master-stage">${hero.map((p,i)=>`<button type="button" class="kch-master-showcase" ${catalog().some(x=>String(x.slug)===String(p.slug))?`data-product="${escHtml(p.slug)}"`:''} aria-label="${escHtml(p.name)}"><img src="${escHtml(imgOf(p)||launch[i].image)}" alt="${escHtml(p.name)}" ${i===0?'fetchpriority="high"':'loading="lazy"'} decoding="async"></button>`).join('')}</div><div class="kch-master-hero-benefits"><div>${icon('verified')}<span><b>สมุนไพรคุณภาพ</b><small>คัดสรรข้อมูลสินค้าอย่างชัดเจน</small></span></div><div>${icon('workspace_premium')}<span><b>ปลอดภัย มั่นใจได้</b><small>เลือกจากข้อมูลที่ร้านยืนยัน</small></span></div><div>${icon('fact_check')}<span><b>ข้อมูลโปร่งใส</b><small>ตรวจสอบก่อนตัดสินใจซื้อ</small></span></div><div>${icon('support_agent')}<span><b>ดูแลทุกคำสั่งซื้อ</b><small>ติดตามสถานะได้ในระบบ</small></span></div></div></section><section class="kch-master-finder" aria-label="ค้นหาและเลือกสินค้า"><h2>ค้นหาและเลือกสินค้า</h2><button class="kch-master-filter active" type="button" data-kch-filter="ทั้งหมด">แนะนำ</button>${cats.slice(1,5).map(c=>`<button class="kch-master-filter" type="button" data-kch-filter="${escHtml(c)}">${escHtml(c)}</button>`).join('')}<div class="kch-master-range"><span>฿0</span><input type="range" min="0" max="${Math.ceil(maxPrice/100)*100}" step="50" value="${Math.ceil(maxPrice/100)*100}" data-kch-price aria-label="ราคาสูงสุด"><span data-kch-price-label>${money(Math.ceil(maxPrice/100)*100)}</span></div><button type="button" class="kch-master-reset" data-kch-reset>ล้างตัวกรอง</button></section><section class="kch-master-section" id="kch-products"><div class="kch-master-section-head"><div><h2>สินค้าแนะนำ</h2><p>เลือกจากสินค้าที่มีข้อมูลและภาพพร้อมแสดงบนหน้าร้าน</p></div><button type="button" data-kch-reset>ดูทั้งหมด →</button></div><div class="kch-master-products">${products.map(productCard).join('')}</div></section><section class="kch-master-trust"><div class="kch-master-trust-inner"><div class="kch-master-trust-item">${icon('assignment_turned_in')}<span><b>สั่งซื้อง่าย</b><small>เลือกสินค้าได้สะดวก</small></span></div><div class="kch-master-trust-item">${icon('payments')}<span><b>เก็บเงินปลายทาง</b><small>จ่ายเมื่อได้รับสินค้า</small></span></div><div class="kch-master-trust-item">${icon('local_shipping')}<span><b>ติดตามคำสั่งซื้อ</b><small>ตรวจสถานะได้ในระบบ</small></span></div><div class="kch-master-trust-item">${icon('verified_user')}<span><b>ร้านทางการ</b><small>ข้อมูลจากร้านโดยตรง</small></span></div></div></section><section class="kch-master-section" id="kch-categories"><div class="kch-master-section-head"><div><h2>เลือกช้อปตามหมวดหมู่</h2></div><button type="button" data-kch-reset>ดูทั้งหมด →</button></div><div class="kch-master-categories">${cats.map((c,i)=>{const ci=categoryImage(c,products);return `<button type="button" class="kch-master-category" data-kch-filter="${escHtml(c)}"><span class="kch-master-category-media">${ci?`<img src="${escHtml(ci)}" alt="" loading="lazy">`:icon(catIcon(c))}</span><span><b>${escHtml(c)}</b><small>${i===0?'สินค้าแนะนำ':'เลือกตามหมวดสินค้า'}</small></span></button>`}).join('')}</div></section><section class="kch-master-section kch-master-split" id="kch-promotions"><div><div class="kch-master-section-head"><div><h2>สิทธิพิเศษและบริการ</h2><p>สิทธิพิเศษที่พร้อมใช้งานกับคำสั่งซื้อของคุณ</p></div></div><div class="kch-master-promo-grid">${promotionCards()}</div></div><div><div class="kch-master-section-head"><div><h2>มาตรฐานรีวิวจากผู้ซื้อจริง</h2><p>ไม่แสดงคะแนนหรือความคิดเห็นที่ไม่ได้มาจากการซื้อจริง</p></div></div><div class="kch-master-review-grid">${safeReviewCards()}</div></div></section><section class="kch-master-story" id="kch-story"><div class="kch-master-story-visual"><img src="${escHtml(storyImage)}" alt="ผลิตภัณฑ์ KHONCHAIHERB" loading="lazy"></div><div class="kch-master-story-copy"><div><span class="eyebrow">เรื่องราวของเรา</span><h2>KHONCHAIHERB คุณชายสมุนไพร</h2><p>เราพัฒนาประสบการณ์เลือกซื้อสมุนไพรไทยให้ทันสมัย ใช้ง่าย และตรวจสอบข้อมูลสำคัญได้ก่อนสั่งซื้อ ตั้งแต่รายละเอียดสินค้า การชำระเงิน การจัดส่ง ไปจนถึงบริการหลังการขาย</p><button type="button" data-kch-jump="footer">รู้จักเราเพิ่มเติม 🌿</button></div><div class="kch-master-story-points"><div class="kch-master-story-point">${icon('eco')}<span><b>คัดสรรสินค้า</b><small>แสดงข้อมูลตามที่ร้านยืนยัน</small></span></div><div class="kch-master-story-point">${icon('fact_check')}<span><b>ข้อมูลชัดเจน</b><small>ดูรายละเอียดก่อนสั่งซื้อ</small></span></div><div class="kch-master-story-point">${icon('support_agent')}<span><b>ดูแลคำสั่งซื้อ</b><small>ติดตามสถานะได้สะดวก</small></span></div><div class="kch-master-story-point">${icon('local_shipping')}<span><b>จัดส่งทั่วประเทศ</b><small>เชื่อมกับสถานะการจัดส่ง</small></span></div></div></div></section><section class="kch-master-newsletter"><div class="kch-master-newsletter-inner"><div class="kch-master-news-copy">${icon('mail')}<span><b>รับข่าวสารและโปรโมชั่นพิเศษ</b><small>อัปเดตสินค้าใหม่และข้อเสนอจาก KHONCHAIHERB</small></span></div><form class="kch-master-news-form" data-kch-news><input type="email" placeholder="อีเมลของคุณ" aria-label="อีเมล"><button type="submit">สมัครรับข่าวสาร</button></form><div class="kch-master-social"><b>ติดตามเรา</b><span>LINE</span><span>f</span><span>IG</span><span>▶</span><span>♪</span></div></div></section><footer class="kch-master-footer" id="kch-footer"><div class="kch-master-footer-inner"><div class="kch-master-footer-brand"><h3>KHONCHAIHERB</h3><b>คุณชายสมุนไพร</b><p>ภูมิปัญญาสมุนไพรไทย<br>สู่การดูแลสุขภาพยุคใหม่</p></div><div class="kch-master-footer-col"><h4>ช็อปสินค้า</h4><button data-kch-jump="products">ทั้งหมด</button><button data-kch-filter="ชาและสมุนไพร">ชาและสมุนไพร</button><button data-kch-filter="ผลิตภัณฑ์สมุนไพร">ผลิตภัณฑ์สมุนไพร</button><button data-kch-jump="products">สินค้าแนะนำ</button></div><div class="kch-master-footer-col"><h4>บริการลูกค้า</h4><button data-kch-jump="products">วิธีการสั่งซื้อ</button><button data-go="cart">ตะกร้าสินค้า</button><button data-go="orders">ติดตามคำสั่งซื้อ</button><a href="/shipping-returns.html">การจัดส่งและคืนสินค้า</a></div><div class="kch-master-footer-col"><h4>เกี่ยวกับเรา</h4><button data-kch-jump="story">เกี่ยวกับ KHONCHAIHERB</button><a href="/privacy.html">นโยบายความเป็นส่วนตัว</a><a href="/terms.html">ข้อกำหนดการใช้งาน</a></div><div class="kch-master-footer-col"><h4>ติดต่อเรา</h4><a href="tel:0885807909">088-5807909</a><span style="display:block;padding:4px 0;font-size:8.5px;color:#c1d0c8">Line: 0885807909</span><span style="display:block;padding:4px 0;font-size:8.5px;color:#c1d0c8">ประเทศไทย</span></div></div><div class="kch-master-footer-bottom"><div><span>© KHONCHAIHERB คุณชายสมุนไพร</span><div class="kch-master-payments"><span>เก็บเงินปลายทาง (COD)</span></div></div></div></footer></main>`
  }

  /* Compatibility names retained for storefront checks: EASY ORDERING, CASH ON DELIVERY, SHIPMENT TRACKING, OFFICIAL STORE, SHOP BY CATEGORY. */
  function enhanceCommercePanel(){return document.querySelector('.kch-master-home')}
  function enhanceFooter(){return document.querySelector('.kch-master-footer')}
  function stageMarkup(){return document.querySelector('.kch-master-stage')?.innerHTML||''}

  let frame=0,lastSignature='';
  const signature=()=>catalog().map(p=>`${p.id}:${p.slug}:${p.price}:${p.stock}:${imgOf(p)}`).join('|');
  function hideLegacy(shell){shell.querySelectorAll(':scope > .kch-ref-commerce,:scope > .kch-ref-footer').forEach(el=>el.remove())}
  function scrollToId(id){const map={home:'kch-home',products:'kch-products',categories:'kch-categories',promotions:'kch-promotions',story:'kch-story',footer:'kch-footer'};document.getElementById(map[id]||id)?.scrollIntoView?.({behavior:'smooth',block:'start'})}
  function applyFilter(value,priceMax){const main=document.querySelector('.kch-master-home');if(!main)return;const v=String(value||'ทั้งหมด'),max=Number(priceMax??(main.querySelector('[data-kch-price]')?.value||Infinity)),cards=[...main.querySelectorAll('.kch-master-product')];let visible=0;cards.forEach(c=>{const cat=String(c.dataset.kchCat||''),price=Number(c.dataset.kchPrice||0),catOk=v==='ทั้งหมด'||cat===v||cat.includes(v)||v.includes(cat)||v==='พร้อมส่ง'&&price>0,priceOk=price<=0||price<=max,show=catOk&&priceOk;c.hidden=!show;if(show)visible++});if(!visible)cards.forEach(c=>c.hidden=false);main.querySelectorAll('[data-kch-filter]').forEach(b=>b.classList.toggle('active',b.dataset.kchFilter===v));scrollToId('products')}
  function bindMaster(main){if(!main||main.dataset.bound==='1')return;main.dataset.bound='1';main.addEventListener('click',e=>{const jump=e.target.closest('[data-kch-jump]');if(jump){scrollToId(jump.dataset.kchJump);return}const filter=e.target.closest('[data-kch-filter]');if(filter){applyFilter(filter.dataset.kchFilter);return}if(e.target.closest('[data-kch-reset]')){const range=main.querySelector('[data-kch-price]');if(range){range.value=range.max;main.querySelector('[data-kch-price-label]').textContent=money(range.max)}applyFilter('ทั้งหมด');return}});const range=main.querySelector('[data-kch-price]');range?.addEventListener('input',()=>{main.querySelector('[data-kch-price-label]').textContent=money(range.value);const active=main.querySelector('.kch-master-filter.active')?.dataset.kchFilter||'ทั้งหมด';applyFilter(active,range.value)});const news=main.querySelector('[data-kch-news]');news?.addEventListener('submit',e=>{e.preventDefault();const input=news.querySelector('input');if(input?.value?.trim()){if(typeof toast==='function')toast('ขอบคุณสำหรับความสนใจข่าวสารจาก KHONCHAIHERB');input.value=''}})}
  function applyMaster(force=false){try{ensureStyle();if(typeof current!=='undefined'&&current!=='home')return;const shell=document.querySelector('.shell');if(!shell)return;shell.classList.add('kch-master-shell','v118-signature-home');enhanceHeader(shell);hideLegacy(shell);const sig=signature();let main=shell.querySelector('.kch-master-home');if(!main){const wrap=document.createElement('div');wrap.innerHTML=buildHome();main=wrap.firstElementChild;const bottom=shell.querySelector(':scope > .tshop-bottom');if(bottom)bottom.insertAdjacentElement('beforebegin',main);else shell.appendChild(main);lastSignature=sig;bindMaster(main)}else if(force||sig!==lastSignature){main.outerHTML=buildHome();main=shell.querySelector('.kch-master-home');lastSignature=sig;bindMaster(main)}}catch(err){console.error('KCH master storefront skipped',err?.message||err)}}
  let globalBound=false;function bindGlobal(){if(globalBound)return;globalBound=true;document.addEventListener('click',e=>{const jump=e.target.closest?.('.kch-ref-menu [data-kch-jump],.kch-ref-mobile-panel [data-kch-jump]');if(jump){document.querySelector('.kch-ref-mobile-panel')?.classList.remove('open');document.querySelectorAll('.kch-ref-menu button').forEach(b=>b.classList.toggle('active',b===jump));scrollToId(jump.dataset.kchJump)}});document.addEventListener('input',e=>{if(!e.target.matches?.('.tshop-searchbox input'))return;const q=String(e.target.value||'').trim().toLowerCase(),cards=[...document.querySelectorAll('.kch-master-product')];if(!cards.length)return;let visible=0;cards.forEach(c=>{const show=!q||String(c.dataset.kchName||'').includes(q)||String(c.dataset.kchCat||'').toLowerCase().includes(q);c.hidden=!show;if(show)visible++});if(!visible)cards.forEach(c=>c.hidden=false)})}
  function schedule(force=false){if(frame&&!force)return;frame=requestAnimationFrame(()=>{frame=0;applyMaster(force);bindGlobal()})}
  const root=document.getElementById('app');if(root)new MutationObserver(()=>schedule()).observe(root,{childList:true,subtree:true});window.addEventListener('load',()=>{schedule(true);setTimeout(()=>schedule(true),120)},{once:true});if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>schedule(true),{once:true});else schedule(true);
})();

/* KHONCHAIHERB Thai-first UI v1.23.0 */
(()=>{
  if(typeof document==='undefined'||window.__KCH_THAI_FIRST__==='1.23.0')return;
  window.__KCH_THAI_FIRST__='1.23.0';
  document.documentElement.lang='th';

  const exact=new Map([
    ['HOME','หน้าแรก'],['Home','หน้าแรก'],['SHOP','สินค้าทั้งหมด'],['Shop','สินค้าทั้งหมด'],
    ['BEST SELLERS','สินค้าแนะนำ'],['Best Sellers','สินค้าแนะนำ'],['NEW ARRIVALS','สินค้าใหม่'],['New Arrivals','สินค้าใหม่'],
    ['PROMOTIONS','โปรโมชั่น'],['Promotions','โปรโมชั่น'],['ABOUT US','เกี่ยวกับเรา'],['About Us','เกี่ยวกับเรา'],
    ['CONTACT','ติดต่อเรา'],['Contact','ติดต่อเรา'],['SHOP NOW 🌿','เลือกซื้อสินค้า 🌿'],['SHOP NOW','เลือกซื้อสินค้า'],
    ['EXPLORE COLLECTION','เลือกดูหมวดสินค้า'],['PREMIUM THAI HERBAL','สมุนไพรไทยพรีเมียม'],
    ['Ancient Wisdom. Future Wellness.','ภูมิปัญญาสมุนไพรไทย สู่การดูแลสุขภาพยุคใหม่'],
    ['Account','บัญชีของฉัน'],['My Account','บัญชีของฉัน'],['Wishlist','รายการโปรด'],['Favorites','รายการโปรด'],
    ['Cart','ตะกร้าสินค้า'],['Shopping Cart','ตะกร้าสินค้า'],['Orders','คำสั่งซื้อ'],['My Orders','คำสั่งซื้อของฉัน'],
    ['Me','บัญชีของฉัน'],['LIVE','ไลฟ์'],['Search','ค้นหา'],['Search products','ค้นหาสินค้า'],
    ['Product Details','รายละเอียดสินค้า'],['Description','รายละเอียด'],['Add to cart','เพิ่มลงตะกร้า'],['Add to Cart','เพิ่มลงตะกร้า'],
    ['Buy now','ซื้อเลย'],['Buy Now','ซื้อเลย'],['Checkout','ชำระเงิน'],['Continue Shopping','เลือกซื้อสินค้าต่อ'],
    ['Order Summary','สรุปคำสั่งซื้อ'],['Subtotal','ยอดสินค้า'],['Shipping','ค่าจัดส่ง'],['Discount','ส่วนลด'],['Total','ยอดรวม'],
    ['Cash on Delivery','เก็บเงินปลายทาง'],['Place Order','ยืนยันคำสั่งซื้อ'],['Track Order','ติดตามคำสั่งซื้อ'],
    ['Sign in','เข้าสู่ระบบ'],['Sign In','เข้าสู่ระบบ'],['Sign out','ออกจากระบบ'],['Sign Out','ออกจากระบบ'],
    ['Recommended','แนะนำ'],['Newest','ใหม่ล่าสุด'],['Price: Low to High','ราคา: ต่ำไปสูง'],['Price: High to Low','ราคา: สูงไปต่ำ'],
    ['No results','ไม่พบสินค้า'],['No products found','ไม่พบสินค้า'],['Back','ย้อนกลับ'],['Close','ปิด'],['Save','บันทึก'],
    ['COD','เก็บเงินปลายทาง (COD)'],['TRACK','ติดตามพัสดุ'],['RECEIPT','ใบเสร็จรับเงิน']
  ]);

  const skip=el=>Boolean(el?.closest?.('script,style,code,pre,.material-symbols-rounded,.kch-brand-lockup,.kch-master-hero h1'));

  function translateText(root){
    if(!root)return;
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    const nodes=[];let n;
    while((n=walker.nextNode()))nodes.push(n);
    for(const node of nodes){
      const parent=node.parentElement;
      if(!parent||skip(parent))continue;
      const raw=node.nodeValue||'',trim=raw.trim();
      if(!trim||!exact.has(trim))continue;
      node.nodeValue=raw.replace(trim,exact.get(trim));
    }
  }

  function setText(el,text){
    if(!el)return;
    const label=el.querySelector?.(':scope > span:last-child');
    if(label&&label.textContent.trim()&&!label.classList.contains('material-symbols-rounded'))label.textContent=text;
    else {
      [...el.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE&&n.nodeValue.trim()).forEach(n=>{n.nodeValue=text});
    }
  }

  function localize(){
    document.documentElement.lang='th';

    const search=document.querySelector('.tshop-searchbox input');
    if(search){
      search.placeholder='ค้นหาสินค้าและสมุนไพร';
      search.setAttribute('aria-label','ค้นหาสินค้าและสมุนไพร');
    }

    document.querySelectorAll('.kch-ref-menu button,.kch-ref-mobile-panel button').forEach(b=>{
      const t=b.textContent.trim();
      if(exact.has(t))b.textContent=exact.get(t);
    });

    const navMap=[
      ['[data-go="home"]','หน้าแรก'],
      ['[data-go="orders"]','คำสั่งซื้อ'],
      ['[data-go="account"]','บัญชีของฉัน']
    ];
    for(const [sel,label] of navMap){
      document.querySelectorAll(`.tshop-bottom ${sel}`).forEach(el=>{
        setText(el,label);
        el.setAttribute('aria-label',label);
      });
    }

    document.querySelectorAll('.tshop-bottom [data-v05-nav="live"],[data-live-nav]').forEach(el=>{
      setText(el,'ไลฟ์');
      el.setAttribute('aria-label','ไลฟ์');
    });

    document.querySelectorAll('[data-go="account"]').forEach(el=>el.setAttribute('aria-label','บัญชีของฉัน'));
    document.querySelectorAll('[data-go="cart"]').forEach(el=>el.setAttribute('aria-label','ตะกร้าสินค้า'));
    document.querySelectorAll('[data-go="orders"]').forEach(el=>el.setAttribute('aria-label','คำสั่งซื้อ'));

    document.querySelectorAll('.kch-master-review .stars').forEach(el=>el.textContent='ตรวจสอบจากคำสั่งซื้อ');
    document.querySelectorAll('.kch-master-payments span').forEach(el=>{
      const t=el.textContent.trim().toUpperCase();
      if(t==='VISA'||t==='MASTER')el.remove();
      else if(t==='COD')el.textContent='เก็บเงินปลายทาง (COD)';
    });

    document.querySelectorAll('input[placeholder],textarea[placeholder]').forEach(el=>{
      const p=el.getAttribute('placeholder')||'';
      if(exact.has(p))el.setAttribute('placeholder',exact.get(p));
    });
    document.querySelectorAll('option').forEach(el=>{
      const t=el.textContent.trim();
      if(exact.has(t))el.textContent=exact.get(t);
    });

    translateText(document.body);
  }

  if(!document.getElementById('kch-thai-first-style')){
    const style=document.createElement('style');
    style.id='kch-thai-first-style';
    style.textContent=`
      body,button,input,textarea,select{font-family:'Noto Sans Thai','Tahoma',sans-serif!important}
      .kch-brand-lockup b,.kch-master-hero h1{font-family:Georgia,'Times New Roman','Noto Sans Thai',serif!important}
      .kch-master-tagline{font-family:'Noto Sans Thai','Tahoma',sans-serif!important;font-weight:700!important;line-height:1.55!important}
      .kch-ref-menu button,.kch-ref-mobile-panel button{letter-spacing:0!important;font-weight:800!important}
      .kch-master-kicker{letter-spacing:.02em!important}
      .kch-master-payments span{white-space:nowrap!important}
      @media(max-width:699px){
        .kch-ref-mobile-panel button{font-size:16px!important;line-height:1.5!important}
        .kch-master-hero-actions button{font-size:15px!important}
      }
    `;
    (document.head||document.documentElement).appendChild(style);
  }

  let frame=0;
  const schedule=()=>{
    if(frame)return;
    frame=requestAnimationFrame(()=>{frame=0;localize()});
  };

  const root=document.getElementById('app')||document.body;
  if(root)new MutationObserver(schedule).observe(root,{childList:true,subtree:true,characterData:true});
  document.addEventListener('click',schedule,true);
  window.addEventListener('load',schedule,{once:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});
  else schedule();
})();
