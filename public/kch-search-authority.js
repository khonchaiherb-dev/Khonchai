/* KHONCHAIHERB Search Authority — deterministic storefront search state */
(()=>{
  'use strict';
  if(typeof document==='undefined')return;
  const BUILD='1.0.2';
  if(window.__KCH_SEARCH_AUTHORITY__===BUILD)return;
  window.__KCH_SEARCH_AUTHORITY__=BUILD;

  const SEARCH_SELECTOR='.tshop-searchbox input,#kch-v134-search';
  const CARD_SELECTOR='.kch-master-product';
  let activeQuery='';
  let activeInput=null;
  let seq=0;

  const normalize=value=>String(value??'').normalize('NFKC').toLocaleLowerCase('th-TH').replace(/\s+/g,' ').trim();
  const cardText=card=>{
    const authoritative=[
      card?.dataset?.kchName,
      card?.dataset?.product,
      card?.dataset?.kchCat
    ].filter(value=>normalize(value));
    if(authoritative.length)return normalize(authoritative.join(' '));

    // Fallback only to product-identifying elements. Never index the entire
    // card text because buttons/badges injected by legacy layers can contain
    // stale product names and create false-positive search matches.
    const heading=card?.querySelector?.('h1,h2,h3,h4,.kch-master-product-name,[data-product-name]');
    return normalize([
      heading?.textContent,
      card?.getAttribute?.('aria-label')
    ].filter(Boolean).join(' '));
  };

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

  function inputs(){return [...document.querySelectorAll(SEARCH_SELECTOR)]}

  function syncReplacementInputs(q){
    if(!q)return;
    inputs().forEach(input=>{
      if(input===document.activeElement)return;
      if(!normalize(input.value))input.value=q;
    });
  }

  function apply(query=activeQuery){
    ensureRule();
    const q=normalize(query);
    activeQuery=q;
    const cards=[...document.querySelectorAll(CARD_SELECTOR)];
    if(!cards.length)return;
    if(!q){cards.forEach(clearCard);return}
    syncReplacementInputs(query);
    const tokens=q.split(' ').filter(Boolean);
    cards.forEach(card=>setCard(card,tokens.every(token=>cardText(card).includes(token))));
  }

  function schedule(query){
    const q=normalize(query);
    activeQuery=q;
    const run=++seq;
    const pass=()=>{if(run===seq)apply(query)};

    // Apply once synchronously so competing legacy listeners cannot leave a
    // transiently stale product grid after an input event.
    pass();
    queueMicrotask(pass);
    if(typeof requestAnimationFrame==='function')requestAnimationFrame(pass);
    setTimeout(pass,24);
    setTimeout(pass,96);
    setTimeout(pass,220);
    setTimeout(pass,420);
    setTimeout(pass,900);
  }

  function queryFromTarget(target){
    if(target?.matches?.(SEARCH_SELECTOR))return target.value||'';
    if(activeInput?.isConnected&&activeInput.matches?.(SEARCH_SELECTOR))return activeInput.value||'';
    const focused=document.activeElement;
    if(focused?.matches?.(SEARCH_SELECTOR))return focused.value||'';
    const all=inputs();
    const populated=all.find(input=>normalize(input.value));
    return populated?.value??all[0]?.value??activeQuery;
  }

  function onSearchInput(event){
    const target=event.target;
    if(!target?.matches?.(SEARCH_SELECTOR))return;
    const next=target.value||'';
    const q=normalize(next);

    // Legacy storefront layers can replace the header/search node and emit an
    // empty synthetic input event. Do not let that erase a real customer query.
    // A deliberate customer clear still works because the edited input is focused.
    if(!q&&activeQuery&&document.activeElement!==target){
      schedule(activeQuery);
      return;
    }

    activeInput=target;
    schedule(next);
  }

  function clearFromReset(event){
    if(!event.target?.closest?.('.kch-master-reset'))return;
    activeQuery='';
    activeInput=null;
    inputs().forEach(input=>{input.value=''});
    schedule('');
  }

  document.addEventListener('input',onSearchInput,true);
  document.addEventListener('search',onSearchInput,true);
  document.addEventListener('click',clearFromReset,true);

  if(typeof MutationObserver!=='undefined'){
    new MutationObserver(records=>{
      if(!records.some(record=>record.addedNodes?.length||record.removedNodes?.length))return;
      if(activeInput&&!activeInput.isConnected)activeInput=null;
      if(activeQuery)schedule(activeQuery);
    }).observe(document.documentElement,{childList:true,subtree:true});
  }

  const boot=()=>{
    const live=normalize(queryFromTarget());
    schedule(live||activeQuery);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.addEventListener('pageshow',boot,{passive:true});
})();
