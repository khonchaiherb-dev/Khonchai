/* KHONCHAIHERB v1.36.0 — variant-safe fast purchase from product cards */
(()=>{
  'use strict';
  if(typeof document==='undefined')return;
  const BUILD='1.36.0';
  if(window.__KCH_FAST_PURCHASE__===BUILD)return;
  window.__KCH_FAST_PURCHASE__=BUILD;

  const $=(s,r=document)=>r?.querySelector?.(s)||null;
  const $$=(s,r=document)=>Array.from(r?.querySelectorAll?.(s)||[]);
  const catalog=()=>{try{return Array.isArray(PRODUCTS)?PRODUCTS:[]}catch{return []}};
  const ready=p=>Boolean(p)&&Number(p?.sale_verified)===1&&Number(p?.price||0)>0&&Number(p?.stock||0)>0&&!p?.comingSoon&&Boolean(String(p?.image||p?.image_url||'').trim());

  function productFrom(card){
    const slug=String(card?.dataset?.product||'').trim();
    return slug?catalog().find(p=>String(p?.slug||'')===slug)||null:null;
  }

  function openDetails(p){
    if(!p)return;
    try{if(typeof product==='function'){product(p);return}}catch{}
    const slug=String(p?.slug||'').trim();
    if(slug)location.hash=`product/${encodeURIComponent(slug)}`;
  }

  function buyNow(p){
    if(!ready(p))return openDetails(p);
    try{
      if(typeof v17Purchase==='function'){
        // v17Purchase is the variant authority: multi-option products are sent
        // to product selection instead of silently choosing a variant.
        v17Purchase(p.id,1,true);
        return;
      }
    }catch{}
    openDetails(p);
  }

  function enhanceCard(card){
    const p=productFrom(card);
    if(!ready(p)){card.querySelector('.kch-v136-actions')?.remove();return}
    const copy=$('.kch-master-product-copy',card)||card;
    let actions=$('.kch-v136-actions',card);
    const key=`${p.id}:${p.price}:${p.stock}:${p.sale_verified}`;
    if(actions?.dataset?.key===key)return;
    actions?.remove();

    actions=document.createElement('div');
    actions.className='kch-v136-actions';
    actions.dataset.key=key;

    const details=document.createElement('button');
    details.type='button';
    details.className='kch-v136-detail';
    details.textContent='ดูรายละเอียด';
    details.setAttribute('aria-label',`ดูรายละเอียด ${String(p.name||'สินค้า')}`);
    details.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();openDetails(productFrom(card)||p)});

    const buy=document.createElement('button');
    buy.type='button';
    buy.className='kch-v136-buy-now';
    buy.textContent='ซื้อเลย';
    buy.setAttribute('aria-label',`ซื้อเลย ${String(p.name||'สินค้า')}`);
    buy.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();buyNow(productFrom(card)||p)});

    actions.append(details,buy);
    copy.appendChild(actions);
  }

  function run(){
    if(!$('.kch-master-home'))return;
    $$('.kch-master-products .kch-master-product').forEach(enhanceCard);
  }

  let raf=0;
  const schedule=()=>{
    if(raf)return;
    raf=requestAnimationFrame(()=>{raf=0;run()});
  };
  const root=$('#app')||document.body;
  if(root&&typeof MutationObserver!=='undefined')new MutationObserver(records=>{
    if(records.some(record=>record.addedNodes?.length||record.removedNodes?.length))schedule();
  }).observe(root,{childList:true,subtree:true});
  window.addEventListener('pageshow',schedule,{passive:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
  setTimeout(schedule,120);setTimeout(schedule,420);
})();
