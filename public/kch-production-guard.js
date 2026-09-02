/* KHONCHAIHERB production storefront guard v1.21.3 — verified claims + canonical master search consumer + premium polish */
(()=>{
  if(typeof window==='undefined'||window.__KCH_PRODUCTION_GUARD__==='1.21.3')return;
  window.__KCH_PRODUCTION_GUARD__='1.21.3';

  let frame=0;
  const catalog=()=>{try{return Array.isArray(PRODUCTS)?PRODUCTS:[]}catch{return []}};
  const productBySlug=slug=>catalog().find(p=>String(p?.slug||'')===String(slug||''))||null;
  const verified=p=>Boolean(p)&&Number(p.sale_verified)===1;
  const soldOf=p=>Number(p?.sold_count??p?.sold??0);
  const ratingOf=p=>Number(p?.rating??0);
  const hasVerifiedDemand=()=>catalog().some(p=>verified(p)&&(soldOf(p)>0||ratingOf(p)>0));
  const text=v=>String(v??'').trim().toLowerCase();

  function ensureGuardStyle(){
    if(document.getElementById('kch-production-guard-style'))return;
    const style=document.createElement('style');
    style.id='kch-production-guard-style';
    style.textContent=`
      .kch-master-search-empty{grid-column:1/-1;display:none;min-height:150px;place-items:center;text-align:center;border:1px dashed #d8d2c5;border-radius:18px;background:linear-gradient(145deg,#fffdf8,#f8f5ed);color:#52665c;padding:28px}
      .kch-master-search-empty.is-visible{display:grid}
      .kch-master-search-empty b{display:block;color:#173e30;font-size:16px;line-height:1.4}
      .kch-master-search-empty small{display:block;margin-top:6px;color:#7a847e;font-size:13px;line-height:1.55}
      .kch-master-search-count{margin-left:auto;color:#6d7c74;font-size:12px;font-weight:800;white-space:nowrap}

      /* v1.21 premium herbal refinement — scoped to the approved master storefront. */
      .kch-master-home{--kch-v121-forest:#073e2f;--kch-v121-gold:#b59249;--kch-v121-paper:#fffdf8;--kch-v121-line:#e3dccf;--kch-v121-ink:#173d30}
      .kch-master-home .kch-master-section-head{margin-bottom:17px!important}
      .kch-master-home .kch-master-section-head h2{font-size:clamp(21px,1.75vw,27px)!important;letter-spacing:-.015em!important;color:var(--kch-v121-ink)!important}
      .kch-master-home .kch-master-section-head p{font-size:11px!important;line-height:1.55!important}
      .kch-master-home .kch-master-finder{border-color:#ddd6c8!important;box-shadow:0 16px 44px rgba(17,55,40,.09)!important}
      .kch-master-home .kch-master-filter{min-height:42px!important;border-radius:999px!important;padding-inline:15px!important;transition:border-color .18s ease,background .18s ease,box-shadow .18s ease,transform .18s ease}
      .kch-master-home .kch-master-filter:hover{border-color:#cdbb90!important;box-shadow:0 6px 16px rgba(29,61,46,.07)}
      .kch-master-home .kch-master-filter.active{box-shadow:inset 0 0 0 1px rgba(181,146,73,.12)!important}
      .kch-master-home .kch-master-reset{min-height:40px!important;padding:0 8px!important;border-radius:8px!important}
      .kch-master-home .kch-master-product{border-color:var(--kch-v121-line)!important;border-radius:19px!important;background:linear-gradient(180deg,#fffefb 0%,#fffdf8 62%,#faf6ec 100%)!important;box-shadow:0 12px 30px rgba(18,52,38,.07)!important;isolation:isolate}
      .kch-master-home .kch-master-product:hover{transform:translateY(-3px)!important;border-color:#d1c6ae!important;box-shadow:0 20px 46px rgba(18,52,38,.12)!important}
      .kch-master-home .kch-master-product-media{background:radial-gradient(circle at 50% 28%,#fff 0%,#f6f2e8 54%,#eaf1ea 100%)!important}
      .kch-master-home .kch-master-product-media:after{content:'';position:absolute;left:13%;right:13%;bottom:8px;height:24px;border-radius:50%;background:radial-gradient(ellipse,rgba(24,58,42,.12),transparent 70%);filter:blur(5px);pointer-events:none;z-index:0}
      .kch-master-home .kch-master-product-media img{position:relative;z-index:1!important;padding:18px!important;transition:transform .22s ease,filter .22s ease!important}
      .kch-master-home .kch-master-product:hover .kch-master-product-media img{transform:translateY(-2px) scale(1.015);filter:drop-shadow(0 17px 21px rgba(19,51,36,.15))!important}
      .kch-master-home .kch-master-tag{left:12px!important;top:12px!important;padding:6px 9px!important;border-radius:999px!important;box-shadow:0 5px 14px rgba(76,59,25,.12)}
      .kch-master-home .kch-master-product-copy{padding:14px 14px 15px!important}
      .kch-master-home .kch-master-product-copy h3{min-height:39px!important;font-size:13px!important;line-height:1.5!important;letter-spacing:-.01em!important;color:var(--kch-v121-ink)!important}
      .kch-master-home .kch-master-product-copy .meta{margin-top:5px!important;font-size:9px!important}
      .kch-master-home .kch-master-product-bottom{margin-top:10px!important}
      .kch-master-home .kch-master-price{font-size:17px!important;letter-spacing:-.02em!important;color:#0b5840!important}
      .kch-master-home .kch-master-no-price{font-size:11px!important;line-height:1.4!important}
      .kch-master-home .kch-master-product-bottom button{width:40px!important;height:40px!important;border-radius:12px!important;box-shadow:0 8px 18px rgba(8,66,47,.13);transition:transform .16s ease,box-shadow .16s ease,background .16s ease}
      .kch-master-home .kch-master-product-bottom button:not([disabled]):hover{transform:translateY(-1px);box-shadow:0 11px 22px rgba(8,66,47,.19)}
      .kch-master-home .kch-master-category{border-radius:16px!important;transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease}
      .kch-master-home .kch-master-category:hover{transform:translateY(-2px);border-color:#d5cbb6!important;box-shadow:0 12px 26px rgba(23,58,42,.07)}
      .kch-master-home .kch-master-story{border-radius:22px!important;box-shadow:0 16px 38px rgba(18,52,38,.06)!important}
      .kch-master-home .kch-master-shop{box-shadow:0 14px 30px rgba(211,169,80,.20)!important}
      .kch-master-home button:focus-visible,.kch-master-home input:focus-visible{outline:3px solid rgba(214,181,95,.42)!important;outline-offset:3px!important}
      .kch-master-newsletter[hidden]{display:none!important}

      @media(max-width:699px){
        .kch-master-search-empty{grid-column:auto;grid-row:1;min-width:calc(100vw - 40px);min-height:132px;padding:20px}
        .kch-master-search-count{width:100%;margin:2px 0 0;text-align:left}
        .kch-master-home .kch-master-section-head{margin-bottom:12px!important}
        .kch-master-home .kch-master-section-head h2{font-size:20px!important}
        .kch-master-home .kch-master-filter{min-height:40px!important;padding-inline:12px!important}
        .kch-master-home .kch-master-product{border-radius:17px!important;box-shadow:0 9px 24px rgba(18,52,38,.07)!important}
        .kch-master-home .kch-master-product-media img{padding:13px!important}
        .kch-master-home .kch-master-product-copy{padding:12px 12px 13px!important}
        .kch-master-home .kch-master-product-copy h3{font-size:12.5px!important}
        .kch-master-home .kch-master-price{font-size:16px!important}
        .kch-master-home .kch-master-product-bottom button{width:44px!important;height:44px!important;border-radius:12px!important}
        .kch-master-home .kch-master-category{border-radius:15px!important}
      }
      @media(prefers-reduced-motion:reduce){
        .kch-master-home .kch-master-product,.kch-master-home .kch-master-product-media img,.kch-master-home .kch-master-category,.kch-master-home .kch-master-filter,.kch-master-home .kch-master-product-bottom button{transition:none!important;transform:none!important}
      }
    `;
    (document.head||document.documentElement).appendChild(style);
  }

  function removeMetricNodes(scope,p){
    if(!scope)return;
    const canShow=verified(p);
    scope.querySelectorAll('.rating,.stars,.pdp-sold,.stats span,.tshop-meta span,.v120-verified-metric').forEach(el=>{
      const t=text(el.textContent);
      if((t.includes('ขายแล้ว')||t.includes('ยอดขาย'))&&(!canShow||soldOf(p)<=0))el.remove();
      else if((t.includes('★')||t.includes('⭐')||t.includes('/ 5'))&&(!canShow||ratingOf(p)<=0))el.remove();
    });
  }

  function sanitizeSocialProof(){
    document.querySelectorAll('[data-product]').forEach(scope=>{
      const p=productBySlug(scope.dataset.product);
      if(p)removeMetricNodes(scope,p);
    });
    document.querySelectorAll('.kch-master-review,.review-promo').forEach(section=>{
      if((section.textContent||'').includes('Verified Purchase')&&!section.dataset.kchVerifiedReview)section.remove();
    });
  }

  function enforceUnsupportedSurfaces(){
    document.querySelectorAll('.kch-master-newsletter').forEach(section=>{
      section.hidden=true;
      section.setAttribute('aria-hidden','true');
    });
    if(!hasVerifiedDemand()){
      document.querySelectorAll('[data-kch-filter="สินค้าขายดี"]').forEach(el=>{
        el.hidden=true;
        el.setAttribute('aria-hidden','true');
      });
    }
  }

  function neutralizeUnsupportedDemandClaims(){
    if(hasVerifiedDemand())return;
    document.querySelectorAll('button,span,b,strong,h1,h2,h3,h4,p,small,a,option').forEach(el=>{
      if(el.children.length)return;
      const raw=el.textContent||'';
      if(raw.includes('สินค้าขายดี'))el.textContent=raw.replaceAll('สินค้าขายดี','สินค้าแนะนำ');
      if(raw.includes('สินค้ายอดนิยม'))el.textContent=raw.replaceAll('สินค้ายอดนิยม','สินค้าแนะนำ');
    });
  }

  function ensureSearchEmpty(grid){
    let empty=grid?.querySelector(':scope > .kch-master-search-empty');
    if(!empty&&grid){
      empty=document.createElement('div');
      empty.className='kch-master-search-empty';
      empty.setAttribute('role','status');
      empty.setAttribute('aria-live','polite');
      empty.innerHTML='<div><b>ไม่พบสินค้าที่ตรงกับคำค้นหา</b><small>ลองใช้ชื่อสมุนไพร หมวดสินค้า หรือคำค้นหาที่สั้นลง</small></div>';
      grid.appendChild(empty);
    }
    return empty;
  }

  function syncSearchCount(main,visible,total,q){
    const finder=main?.querySelector('.kch-master-finder');
    if(!finder)return;
    let count=finder.querySelector('.kch-master-search-count');
    if(!count){
      count=document.createElement('span');
      count.className='kch-master-search-count';
      count.setAttribute('aria-live','polite');
      finder.appendChild(count);
    }
    count.textContent=q?`พบ ${visible} จาก ${total} รายการ`:'';
    count.hidden=!q;
  }

  function syncCanonicalSearchUi(){
    ensureGuardStyle();
    const main=document.querySelector('.kch-master-home');
    const grid=main?.querySelector('.kch-master-products');
    if(!main||!grid)return;
    const owner=window.__KCH_MASTER_SEARCH__;
    owner?.apply?.();
    const q=text(owner?.get?.()??owner?.query??'');
    const cards=[...grid.querySelectorAll('.kch-master-product')];
    const visible=cards.filter(card=>card.dataset.kchSearchMatch!=='0'&&!card.hidden).length;
    const empty=ensureSearchEmpty(grid);
    if(empty){
      const noResults=Boolean(q)&&visible===0;
      empty.classList.toggle('is-visible',noResults);
      empty.hidden=!noResults;
      empty.setAttribute('aria-hidden',String(!noResults));
    }
    syncSearchCount(main,visible,cards.length,q);
  }

  function run(){
    frame=0;
    sanitizeSocialProof();
    enforceUnsupportedSurfaces();
    neutralizeUnsupportedDemandClaims();
    syncCanonicalSearchUi();
  }
  function schedule(){if(!frame)frame=requestAnimationFrame(run)}

  /* Search state is deliberately not owned here. The synchronous storefront
     bridge owns window.__KCH_MASTER_SEARCH__; this guard only consumes it. */
  const root=document.getElementById('app');
  if(root)new MutationObserver(schedule).observe(root,{childList:true,subtree:true,characterData:true});
  window.addEventListener('load',schedule,{once:true});
  ensureGuardStyle();
  schedule();
})();
