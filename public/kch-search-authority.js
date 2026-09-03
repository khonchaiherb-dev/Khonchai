/* KHONCHAIHERB Search Authority — deterministic storefront search state */
(()=>{
  'use strict';
  if(typeof document==='undefined')return;
  const BUILD='1.0.2';
  if(window.__KCH_SEARCH_AUTHORITY__===BUILD)return;
  window.__KCH_SEARCH_AUTHORITY__=BUILD;

  const SEARCH_SELECTOR='.tshop-searchbox input,#kch-v134-search';
  const PRIMARY_SEARCH_SELECTOR='.tshop-topbar .tshop-searchbox input';
  const CARD_SELECTOR='.kch-master-product';
  const IDENTITY_ATTRIBUTES=new Set(['data-kch-name','data-product','data-kch-cat']);
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
  function primaryInput(){return document.querySelector(PRIMARY_SEARCH_SELECTOR)||inputs()[0]||null}

  function syncReplacementInputs(q){
    if(!q)return;
    const primary=primaryInput();
    inputs().forEach(input=>{
      if(input===primary||input===document.activeElement)return;
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

    // Apply repeatedly across the legacy render window so the canonical query
    // remains authoritative even while old storefront layers are settling.
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
    if(target?.matches?.(PRIMARY_SEARCH_SELECTOR))return target.value||'';
    const primary=primaryInput();
    if(primary)return primary.value||'';
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

    // Only the storefront's visible topbar search is allowed to own query
    // state when it exists. Legacy/duplicate search nodes may mirror the query
    // but cannot overwrite it with stale or partial values.
    const primary=primaryInput();
    if(primary&&target!==primary){
      if(activeQuery&&!normalize(primary.value))primary.value=activeQuery;
      return;
    }

    const next=target.value||'';
    const q=normalize(next);

    // If the header was replaced, an empty event from the new node is a render
    // artifact unless the customer is actively editing that node. Preserve the
    // last query in that case; a real clear on the active input still clears.
    if(!q&&activeQuery&&activeInput&&activeInput!==target&&!activeInput.isConnected&&document.activeElement!==target){
      target.value=activeQuery;
      activeInput=target;
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
      const relevant=records.some(record=>
        (record.type==='childList'&&(record.addedNodes?.length||record.removedNodes?.length))||
        (record.type==='attributes'&&IDENTITY_ATTRIBUTES.has(record.attributeName))
      );
      if(!relevant)return;

      if(activeInput&&!activeInput.isConnected){
        const replacement=primaryInput();
        if(replacement&&activeQuery&&!normalize(replacement.value))replacement.value=activeQuery;
        activeInput=replacement;
      }
      if(activeQuery)schedule(activeQuery);
    }).observe(document.documentElement,{
      childList:true,
      subtree:true,
      attributes:true,
      attributeFilter:[...IDENTITY_ATTRIBUTES]
    });
  }

  const boot=()=>{
    const live=normalize(queryFromTarget());
    schedule(live||activeQuery);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.addEventListener('pageshow',boot,{passive:true});
})();
