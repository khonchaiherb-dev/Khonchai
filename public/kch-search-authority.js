/* KHONCHAIHERB Search Authority — deterministic storefront search state */
(()=>{
  'use strict';
  if(typeof document==='undefined')return;
  const BUILD='1.0.0';
  if(window.__KCH_SEARCH_AUTHORITY__===BUILD)return;
  window.__KCH_SEARCH_AUTHORITY__=BUILD;

  const SEARCH_SELECTOR='.tshop-searchbox input,#kch-v134-search';
  const CARD_SELECTOR='.kch-master-product';
  let activeQuery='';
  let seq=0;

  const normalize=value=>String(value??'').normalize('NFKC').toLocaleLowerCase('th-TH').replace(/\s+/g,' ').trim();
  const cardText=card=>normalize([
    card?.dataset?.kchName,
    card?.dataset?.product,
    card?.dataset?.kchCat,
    card?.getAttribute?.('aria-label'),
    card?.textContent
  ].filter(Boolean).join(' '));

  function ensureRule(){
    if(document.getElementById('kch-search-authority-style'))return;
    const style=document.createElement('style');
    style.id='kch-search-authority-style';
    style.textContent=`
      .kch-master-product[data-kch-search-match="0"],
      .kch-master-product[data-kch-v131-search-match="0"],
      .kch-master-product.kch-critical-search-hidden{display:none!important}
    `;
    (document.head||document.documentElement).appendChild(style);
  }

  function clearCard(card){
    card.removeAttribute('data-kch-search-match');
    card.removeAttribute('data-kch-v131-search-match');
    card.classList.remove('kch-critical-search-hidden');
    card.hidden=false;
    card.setAttribute('aria-hidden','false');
  }

  function setCard(card,match){
    const value=match?'1':'0';
    card.dataset.kchSearchMatch=value;
    card.dataset.kchV131SearchMatch=value;
    card.classList.toggle('kch-critical-search-hidden',!match);
    card.hidden=!match;
    card.setAttribute('aria-hidden',match?'false':'true');
  }

  function apply(query=activeQuery){
    ensureRule();
    const q=normalize(query);
    activeQuery=q;
    const cards=[...document.querySelectorAll(CARD_SELECTOR)];
    if(!cards.length)return;
    if(!q){cards.forEach(clearCard);return}
    const tokens=q.split(' ').filter(Boolean);
    cards.forEach(card=>setCard(card,tokens.every(token=>cardText(card).includes(token))));
  }

  function schedule(query){
    activeQuery=normalize(query);
    const run=++seq;
    const pass=()=>{if(run===seq)apply(activeQuery)};
    queueMicrotask(pass);
    if(typeof requestAnimationFrame==='function')requestAnimationFrame(pass);
    setTimeout(pass,24);
    setTimeout(pass,96);
    setTimeout(pass,220);
  }

  function queryFromTarget(target){
    if(target?.matches?.(SEARCH_SELECTOR))return target.value||'';
    const focused=document.activeElement;
    if(focused?.matches?.(SEARCH_SELECTOR))return focused.value||'';
    return document.querySelector(SEARCH_SELECTOR)?.value||'';
  }

  document.addEventListener('input',event=>{
    if(!event.target?.matches?.(SEARCH_SELECTOR))return;
    schedule(queryFromTarget(event.target));
  },true);
  document.addEventListener('search',event=>{
    if(!event.target?.matches?.(SEARCH_SELECTOR))return;
    schedule(queryFromTarget(event.target));
  },true);

  if(typeof MutationObserver!=='undefined'){
    new MutationObserver(()=>{if(activeQuery)schedule(activeQuery)}).observe(document.documentElement,{childList:true,subtree:true});
  }

  const boot=()=>schedule(queryFromTarget());
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.addEventListener('pageshow',boot,{passive:true});
})();
