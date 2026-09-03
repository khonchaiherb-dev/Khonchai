/* KHONCHAIHERB Search Authority — deterministic storefront search state */
(()=>{
  'use strict';
  if(typeof document==='undefined')return;
  const BUILD='1.0.6';
  if(window.__KCH_SEARCH_AUTHORITY__===BUILD)return;
  window.__KCH_SEARCH_AUTHORITY__=BUILD;

  const SEARCH_SELECTOR='.tshop-searchbox input,#kch-v134-search';
  const PRIMARY_SEARCH_SELECTOR='.tshop-topbar .tshop-searchbox input';
  const CARD_SELECTOR='.kch-master-product';
  const IDENTITY_ATTRIBUTES=new Set(['data-kch-name','data-product','data-kch-cat']);
  let activeQuery='';
  let activeDisplayQuery='';
  let authorityReady=false;
  let activeInput=null;
  let editingInput=null;
  let seq=0;

  const normalize=value=>String(value??'').normalize('NFKC').toLocaleLowerCase('th-TH').replace(/\s+/g,' ').trim();
  const masterActive=()=>Boolean(document.querySelector('.kch-master-home'));
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
  function primaryInput(){
    if(editingInput?.isConnected&&editingInput.matches?.(SEARCH_SELECTOR))return editingInput;
    if(activeInput?.isConnected&&activeInput.matches?.(SEARCH_SELECTOR))return activeInput;
    const focused=document.activeElement;
    if(focused?.matches?.(SEARCH_SELECTOR))return focused;
    return document.querySelector(PRIMARY_SEARCH_SELECTOR)||inputs()[0]||null;
  }

  // Search UI is rendered by several legacy layers. Any one of them may keep
  // the same input node and clear its value, or replace the node entirely.
  // Once authority is established, every live search control must therefore
  // mirror the customer's exact display query. Property assignment does not
  // dispatch input events, so hydration cannot recursively claim ownership.
  function syncReplacementInputs(displayQuery=activeDisplayQuery){
    const value=String(displayQuery??'');
    inputs().forEach(input=>{
      if(input.value!==value)input.value=value;
    });
  }

  function apply(query=activeDisplayQuery){
    ensureRule();
    const displayQuery=String(query??'');
    const q=normalize(displayQuery);
    activeDisplayQuery=displayQuery;
    activeQuery=q;
    authorityReady=true;
    syncReplacementInputs(displayQuery);

    const cards=[...document.querySelectorAll(CARD_SELECTOR)];
    if(!cards.length)return;
    if(!q){cards.forEach(clearCard);return}
    const tokens=q.split(' ').filter(Boolean);
    cards.forEach(card=>setCard(card,tokens.every(token=>cardText(card).includes(token))));
  }

  function schedule(query){
    const displayQuery=String(query??'');
    activeDisplayQuery=displayQuery;
    activeQuery=normalize(displayQuery);
    authorityReady=true;
    const run=++seq;
    const pass=()=>{if(run===seq)apply(displayQuery)};

    // Legacy storefront layers can still mutate product markup while the page
    // settles. Re-apply one canonical state across that render window.
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
    const primary=primaryInput();
    if(primary)return primary.value||'';
    const all=inputs();
    const populated=all.find(input=>normalize(input.value));
    return populated?.value??all[0]?.value??activeDisplayQuery;
  }

  function onSearchFocus(event){
    const target=event.target;
    if(!target?.matches?.(SEARCH_SELECTOR))return;
    editingInput=target;
    activeInput=target;
    if(authorityReady&&activeQuery&&!normalize(target.value))target.value=activeDisplayQuery;
  }

  function onSearchBlur(event){
    const target=event.target;
    if(target!==editingInput)return;
    queueMicrotask(()=>{
      if(document.activeElement!==target)editingInput=null;
    });
  }

  function onSearchInput(event){
    const target=event.target;
    if(!target?.matches?.(SEARCH_SELECTOR))return;

    // The approved Master Storefront has accumulated older input listeners.
    // One v0.4 listener calls home() whenever an input event briefly reports an
    // empty value; browser fill/autofill commonly performs that empty step
    // before writing the next value, which replaces #global-shop-search in the
    // middle of editing. At capture phase, Search Authority owns Master search
    // completely and prevents those legacy handlers from rerendering/filtering
    // the same UI a second time. Non-Master pages keep their legacy fallback.
    if(masterActive())event.stopImmediatePropagation();

    const displayQuery=String(target.value??'');
    const q=normalize(displayQuery);
    const focused=document.activeElement===target;
    const owned=target===editingInput||target===activeInput||focused;

    // Never infer customer intent from isTrusted. Programmatic search entry
    // points (history, smart actions, structural header bridge, automation and
    // autofill) legitimately dispatch synthetic input events. Any non-empty
    // search may become authoritative. Empty events may clear only from the
    // active/focused source (or when there is no active query); an empty stale
    // replacement source is rehydrated instead of erasing the customer's text.
    if(!q&&activeQuery&&!owned){
      target.value=activeDisplayQuery;
      schedule(activeDisplayQuery);
      return;
    }

    editingInput=focused?target:editingInput;
    activeInput=target;
    schedule(displayQuery);
  }

  function clearFromReset(event){
    if(!event.target?.closest?.('.kch-master-reset'))return;
    activeQuery='';
    activeDisplayQuery='';
    authorityReady=true;
    activeInput=null;
    editingInput=null;
    syncReplacementInputs('');
    schedule('');
  }

  function setQuery(query){
    activeInput=null;
    editingInput=null;
    schedule(String(query??''));
    return activeDisplayQuery;
  }

  window.__KCH_SEARCH_AUTHORITY_API__={
    build:BUILD,
    get:()=>activeDisplayQuery,
    set:setQuery,
    clear:()=>setQuery(''),
    refresh:()=>schedule(activeDisplayQuery)
  };

  document.addEventListener('focusin',onSearchFocus,true);
  document.addEventListener('focusout',onSearchBlur,true);
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

      if(editingInput&&!editingInput.isConnected)editingInput=null;
      if(activeInput&&!activeInput.isConnected)activeInput=primaryInput();

      if(authorityReady){
        syncReplacementInputs(activeDisplayQuery);
        schedule(activeDisplayQuery);
      }
    }).observe(document.documentElement,{
      childList:true,
      subtree:true,
      attributes:true,
      attributeFilter:[...IDENTITY_ATTRIBUTES]
    });
  }

  const boot=()=>{
    const live=queryFromTarget();
    authorityReady=true;
    schedule(live||activeDisplayQuery);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.addEventListener('pageshow',boot,{passive:true});
})();
