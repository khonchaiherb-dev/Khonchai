/* KHONCHAIHERB production storefront guard v1.21.0 — verified claims + authoritative master discovery */
(()=>{
  if(typeof window==='undefined'||window.__KCH_PRODUCTION_GUARD__==='1.21.0')return;
  window.__KCH_PRODUCTION_GUARD__='1.21.0';

  let frame=0;
  let searchQuery='';
  let lastSearchInput=null;

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
      .kch-master-product.kch-search-hidden{display:none!important}
      .kch-master-search-empty{grid-column:1/-1;display:none;min-height:150px;place-items:center;text-align:center;border:1px dashed #d8d2c5;border-radius:14px;background:#fffdf8;color:#52665c;padding:24px}
      .kch-master-search-empty.is-visible{display:grid}
      .kch-master-search-empty b{display:block;color:#173e30;font-size:16px;line-height:1.4}
      .kch-master-search-empty small{display:block;margin-top:6px;color:#7a847e;font-size:13px;line-height:1.55}
      .kch-master-search-count{margin-left:auto;color:#6d7c74;font-size:12px;font-weight:700;white-space:nowrap}
      @media(max-width:699px){.kch-master-search-empty{grid-column:auto;grid-row:1;min-width:calc(100vw - 40px);min-height:132px}.kch-master-search-count{width:100%;margin:2px 0 0;text-align:left}}
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

  function neutralizeUnsupportedDemandClaims(){
    if(hasVerifiedDemand())return;
    document.querySelectorAll('button,span,b,strong,h1,h2,h3,h4,p,small,a,option').forEach(el=>{
      if(el.children.length)return;
      const raw=el.textContent||'';
      if(raw.includes('สินค้าขายดี'))el.textContent=raw.replaceAll('สินค้าขายดี','สินค้าแนะนำ');
      if(raw.includes('สินค้ายอดนิยม'))el.textContent=raw.replaceAll('สินค้ายอดนิยม','สินค้าแนะนำ');
    });
  }

  function masterCards(){return [...document.querySelectorAll('.kch-master-products .kch-master-product')];}

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

  function syncSearchCount(main,visible,total){
    const finder=main?.querySelector('.kch-master-finder');
    if(!finder)return;
    let count=finder.querySelector('.kch-master-search-count');
    if(!count){count=document.createElement('span');count.className='kch-master-search-count';count.setAttribute('aria-live','polite');finder.appendChild(count)}
    const q=text(searchQuery);
    count.textContent=q?`พบ ${visible} จาก ${total} รายการ`:'';
    count.hidden=!q;
  }

  function applySearch(){
    ensureGuardStyle();
    const main=document.querySelector('.kch-master-home');
    const grid=main?.querySelector('.kch-master-products');
    if(!main||!grid)return;
    const q=text(searchQuery);
    const cards=masterCards();
    let visible=0;
    cards.forEach(card=>{
      const name=text(card.dataset.kchName||card.querySelector('h3')?.textContent);
      const cat=text(card.dataset.kchCat);
      const slug=text(card.dataset.product);
      const show=!q||name.includes(q)||cat.includes(q)||slug.includes(q);
      card.hidden=!show;
      card.classList.toggle('kch-search-hidden',!show);
      card.setAttribute('aria-hidden',String(!show));
      if(show)visible++;
    });
    const empty=ensureSearchEmpty(grid);
    if(empty){
      const noResults=Boolean(q)&&visible===0;
      empty.classList.toggle('is-visible',noResults);
      empty.hidden=!noResults;
      empty.setAttribute('aria-hidden',String(!noResults));
    }
    syncSearchCount(main,visible,cards.length);
  }

  function run(){
    frame=0;
    sanitizeSocialProof();
    neutralizeUnsupportedDemandClaims();
    applySearch();
  }
  function schedule(){
    if(frame)return;
    frame=requestAnimationFrame(run);
  }

  /* Master search owns discovery on the approved storefront. Capture prevents
     legacy search renderers from replacing the master DOM after every keystroke. */
  document.addEventListener('input',event=>{
    const input=event.target;
    if(!input?.matches?.('.tshop-searchbox input'))return;
    if(!document.querySelector('.kch-master-home'))return;
    searchQuery=String(input.value||'');
    lastSearchInput=input;
    applySearch();
    event.stopImmediatePropagation();
  },true);

  document.addEventListener('search',event=>{
    const input=event.target;
    if(!input?.matches?.('.tshop-searchbox input')||!document.querySelector('.kch-master-home'))return;
    searchQuery=String(input.value||'');
    lastSearchInput=input;
    applySearch();
    event.stopImmediatePropagation();
  },true);

  document.addEventListener('click',event=>{
    if(!document.querySelector('.kch-master-home'))return;
    const reset=event.target?.closest?.('[data-kch-reset]');
    if(!reset)return;
    searchQuery='';
    const input=document.querySelector('.tshop-searchbox input')||lastSearchInput;
    if(input)input.value='';
    queueMicrotask(applySearch);
  },true);

  const root=document.getElementById('app');
  if(root)new MutationObserver(schedule).observe(root,{childList:true,subtree:true,characterData:true});
  window.addEventListener('load',()=>{const input=document.querySelector('.tshop-searchbox input');if(input)searchQuery=String(input.value||'');schedule()},{once:true});
  ensureGuardStyle();
  schedule();
})();
