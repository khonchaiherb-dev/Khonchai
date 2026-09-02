/* KHONCHAIHERB production storefront guard — verified claims + resilient discovery */
(()=>{
  if(typeof window==='undefined'||window.__KCH_PRODUCTION_GUARD__==='1.0.0')return;
  window.__KCH_PRODUCTION_GUARD__='1.0.0';

  let frame=0;
  let searchQuery='';

  const catalog=()=>{
    try{return Array.isArray(PRODUCTS)?PRODUCTS:[]}catch{return []}
  };
  const productBySlug=slug=>catalog().find(p=>String(p?.slug||'')===String(slug||''))||null;
  const verified=p=>Boolean(p)&&Number(p.sale_verified)===1;
  const soldOf=p=>Number(p?.sold_count??p?.sold??0);
  const ratingOf=p=>Number(p?.rating??0);
  const hasVerifiedDemand=()=>catalog().some(p=>verified(p)&&(soldOf(p)>0||ratingOf(p)>0));

  function removeMetricNodes(scope,p){
    if(!scope)return;
    const allowSold=verified(p)&&soldOf(p)>0;
    const allowRating=verified(p)&&ratingOf(p)>0;
    scope.querySelectorAll('span,small').forEach(el=>{
      const text=String(el.textContent||'').trim();
      if(!text)return;
      if(/ขายแล้ว/i.test(text)&&!allowSold){
        if(text.includes('•')){
          const parts=text.split('•').map(x=>x.trim()).filter(Boolean).filter(x=>!/ขายแล้ว/i.test(x));
          if(parts.length)el.textContent=parts.join(' • ');else el.remove();
        }else el.remove();
        return;
      }
      if(/^⭐/.test(text)&&!allowRating){
        if(text.includes('•')){
          const parts=text.split('•').map(x=>x.trim()).filter(Boolean).filter(x=>!/^⭐/.test(x));
          if(parts.length)el.textContent=parts.join(' • ');else el.remove();
        }else el.remove();
      }
    });
    scope.querySelectorAll('.flash-sold').forEach(el=>{if(!allowSold)el.remove()});
    scope.querySelectorAll('.stars').forEach(el=>{if(!allowRating)el.remove()});
    scope.querySelectorAll('.tag,.kch-master-tag').forEach(el=>{
      const text=String(el.textContent||'').trim();
      if(!verified(p)&&/^(ขายดี|ฮิต|คนซื้อเยอะ|สินค้าขายดี|สินค้ายอดนิยม)$/i.test(text))el.textContent='แนะนำ';
    });
  }

  function sanitizeSocialProof(){
    document.querySelectorAll('[data-product]').forEach(scope=>removeMetricNodes(scope,productBySlug(scope.getAttribute('data-product'))));
    let selectedProduct=null;
    try{selectedProduct=typeof selected!=='undefined'?selected:null}catch{}
    document.querySelectorAll('.pdp-sold').forEach(scope=>removeMetricNodes(scope,selectedProduct));

    // Final zero-metric safety for legacy fragments that are not tied to a product card.
    document.querySelectorAll('span,small').forEach(el=>{
      const text=String(el.textContent||'').trim();
      if(/^ขายแล้ว\s*0(?:\D|$)/i.test(text)||/^⭐\s*0(?:\.0+)?(?:\D|$)/.test(text))el.remove();
    });
  }

  function neutralizeUnsupportedDemandClaims(){
    if(hasVerifiedDemand())return;
    const unsupported=/^(สินค้าขายดี|สินค้ายอดนิยม|ขายดี|ฮิต|คนซื้อเยอะ)$/i;
    const replacement=text=>/สินค้า/.test(text)?'สินค้าแนะนำ':'แนะนำ';
    document.querySelectorAll('button,option,a,span,b,strong,h2,h3').forEach(el=>{
      if(el.children.length)return;
      const text=String(el.textContent||'').trim();
      if(unsupported.test(text))el.textContent=replacement(text);
    });
  }

  function applySearch(){
    const q=String(searchQuery||'').trim().toLowerCase();
    if(!q)return;
    const cards=[...document.querySelectorAll('.kch-master-product')];
    if(!cards.length)return;
    cards.forEach(card=>{
      const name=String(card.dataset.kchName||card.querySelector('h3')?.textContent||'').toLowerCase();
      const cat=String(card.dataset.kchCat||'').toLowerCase();
      card.hidden=!(name.includes(q)||cat.includes(q));
    });
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

  document.addEventListener('input',event=>{
    if(!event.target?.matches?.('.tshop-searchbox input'))return;
    searchQuery=String(event.target.value||'');
    // Run after legacy listeners and any resulting re-render.
    setTimeout(schedule,0);
  },true);

  const root=document.getElementById('app');
  if(root)new MutationObserver(schedule).observe(root,{childList:true,subtree:true,characterData:true});
  window.addEventListener('load',schedule,{once:true});
  schedule();
})();
