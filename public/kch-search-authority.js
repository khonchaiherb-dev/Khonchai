/* KHONCHAIHERB Search Authority — deterministic storefront search state */
(()=>{
  'use strict';
  if(typeof document==='undefined')return;
  const BUILD='1.0.11';
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
  let pendingIntent=null;
  let intentSeq=0;
  let seq=0;
  let editHeartbeat=0;

  const normalize=value=>String(value??'').normalize('NFKC').toLocaleLowerCase('th-TH').replace(/\s+/g,' ').trim();
  const masterActive=()=>Boolean(document.querySelector('.kch-master-home'));
  const cardText=card=>{
    const authoritative=[card?.dataset?.kchName,card?.dataset?.product,card?.dataset?.kchCat].filter(value=>normalize(value));
    if(authoritative.length)return normalize(authoritative.join(' '));
    const heading=card?.querySelector?.('h1,h2,h3,h4,.kch-master-product-name,[data-product-name]');
    return normalize([heading?.textContent,card?.getAttribute?.('aria-label')].filter(Boolean).join(' '));
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

  function masterDisplayQuery(){
    const master=window.__KCH_MASTER_SEARCH__;
    if(!master)return '';
    try{
      if(typeof master.get==='function')return String(master.get()??'');
      if('query' in master)return String(master.query??'');
      if('value' in master)return String(master.value??'');
    }catch{}
    return '';
  }

  function syncReplacementInputs(displayQuery=activeDisplayQuery,source=null){
    const value=String(displayQuery??'');
    inputs().forEach(input=>{
      if(document.activeElement===input)return;
      if(source?.isConnected&&input===source)return;
      if(input.value!==value)input.value=value;
    });
  }

  function apply(query=activeDisplayQuery,source=null){
    ensureRule();
    const displayQuery=String(query??'');
    const q=normalize(displayQuery);
    activeDisplayQuery=displayQuery;
    activeQuery=q;
    authorityReady=true;
    syncReplacementInputs(displayQuery,source);

    const cards=[...document.querySelectorAll(CARD_SELECTOR)];
    if(!cards.length)return;
    if(!q){cards.forEach(clearCard);return}
    const tokens=q.split(' ').filter(Boolean);
    cards.forEach(card=>setCard(card,tokens.every(token=>cardText(card).includes(token))));
  }

  function schedule(query,source=null){
    const displayQuery=String(query??'');
    activeDisplayQuery=displayQuery;
    activeQuery=normalize(displayQuery);
    authorityReady=true;
    const run=++seq;
    const pass=()=>{if(run===seq)apply(displayQuery,source?.isConnected?source:null)};
    pass();
    queueMicrotask(pass);
    if(typeof requestAnimationFrame==='function')requestAnimationFrame(pass);
    setTimeout(pass,24);
    setTimeout(pass,96);
    setTimeout(pass,220);
    setTimeout(pass,420);
    setTimeout(pass,900);
  }

  function reconcileFromMaster(){
    if(!masterActive())return;
    const masterQuery=masterDisplayQuery();
    if(!normalize(masterQuery))return;
    const input=primaryInput();
    const inputQuery=String(input?.value??'');
    const authorityMatches=normalize(activeDisplayQuery)===normalize(masterQuery);
    const inputMatches=normalize(inputQuery)===normalize(masterQuery);
    if(authorityMatches&&inputMatches)return;

    // Some legacy tablet render paths receive the edit first, persist it in
    // Master state, then clear the DOM input before this late authority's input
    // listener can observe the event. Master state is therefore the recovery
    // source, not legacy product text or a fabricated default query.
    activeInput=input?.isConnected?input:activeInput;
    if(input?.isConnected&&!inputMatches)input.value=masterQuery;
    schedule(masterQuery,input?.isConnected?input:null);
  }

  function startEditHeartbeat(){
    if(editHeartbeat)clearInterval(editHeartbeat);
    editHeartbeat=setInterval(reconcileFromMaster,90);
  }
  function stopEditHeartbeatSoon(){
    const token=editHeartbeat;
    setTimeout(()=>{if(token&&editHeartbeat===token){clearInterval(editHeartbeat);editHeartbeat=0}},900);
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
    startEditHeartbeat();
    setTimeout(reconcileFromMaster,40);
  }

  function onSearchBlur(event){
    const target=event.target;
    if(target!==editingInput)return;
    queueMicrotask(()=>{
      if(document.activeElement!==target){
        editingInput=null;
        syncReplacementInputs(activeDisplayQuery);
        stopEditHeartbeatSoon();
      }
    });
  }

  function intendedBeforeInputValue(target,event){
    const current=String(target.value??'');
    const type=String(event.inputType||'');
    const start=Number.isInteger(target.selectionStart)?target.selectionStart:current.length;
    const end=Number.isInteger(target.selectionEnd)?target.selectionEnd:start;

    if(type.startsWith('insert')){
      let data=event.data;
      if(data==null&&event.dataTransfer?.getData){try{data=event.dataTransfer.getData('text/plain')}catch{}}
      if(data==null)return null;
      return `${current.slice(0,start)}${String(data)}${current.slice(end)}`;
    }
    if(type.startsWith('delete')){
      if(start!==end)return `${current.slice(0,start)}${current.slice(end)}`;
      if(/Backward$/i.test(type)&&start>0)return `${current.slice(0,start-1)}${current.slice(end)}`;
      if(/Forward$/i.test(type)&&end<current.length)return `${current.slice(0,start)}${current.slice(end+1)}`;
      return current;
    }
    return null;
  }

  function syncMasterFallback(value){
    const master=window.__KCH_MASTER_SEARCH__;
    if(!master)return;
    try{
      if(typeof master.set==='function')master.set(String(value??''),{force:true,trusted:true,source:'search-authority-fallback'});
      else{master.query=String(value??'');if(typeof master.apply==='function')master.apply()}
    }catch{}
  }

  function onSearchBeforeInput(event){
    const target=event.target;
    if(!target?.matches?.(SEARCH_SELECTOR))return;
    const intended=intendedBeforeInputValue(target,event);
    if(intended==null)return;
    editingInput=target;activeInput=target;startEditHeartbeat();
    const token=++intentSeq;pendingIntent={token,target,value:intended};
    setTimeout(()=>{
      const pending=pendingIntent;
      if(!pending||pending.token!==token||pending.target!==target)return;
      pendingIntent=null;
      if(!target.isConnected)return;
      const committed=String(target.value??'');
      if(committed===intended){schedule(committed,target);return}
      target.value=intended;schedule(intended,target);syncMasterFallback(intended);
    },32);
  }

  function onSearchInput(event){
    const target=event.target;
    if(!target?.matches?.(SEARCH_SELECTOR))return;
    if(pendingIntent?.target===target)pendingIntent=null;
    const displayQuery=String(target.value??'');
    const q=normalize(displayQuery);
    const focused=document.activeElement===target;
    const owned=target===editingInput||target===activeInput||focused;

    if(masterActive()&&!q&&event.isTrusted===false&&activeQuery&&!owned){
      event.stopImmediatePropagation();target.value=activeDisplayQuery;schedule(activeDisplayQuery,editingInput?.isConnected?editingInput:null);return;
    }
    if(!q&&activeQuery&&!owned){target.value=activeDisplayQuery;schedule(activeDisplayQuery,editingInput?.isConnected?editingInput:null);return}

    editingInput=focused?target:editingInput;
    activeInput=target;
    schedule(displayQuery,target);
  }

  function clearFromReset(event){
    if(!event.target?.closest?.('.kch-master-reset'))return;
    pendingIntent=null;activeQuery='';activeDisplayQuery='';authorityReady=true;activeInput=null;editingInput=null;
    if(editHeartbeat){clearInterval(editHeartbeat);editHeartbeat=0}
    syncReplacementInputs('');schedule('');
  }

  function setQuery(query){
    pendingIntent=null;activeInput=null;editingInput=null;schedule(String(query??''));return activeDisplayQuery;
  }

  window.__KCH_SEARCH_AUTHORITY_API__={build:BUILD,get:()=>activeDisplayQuery,set:setQuery,clear:()=>setQuery(''),refresh:()=>schedule(activeDisplayQuery,editingInput?.isConnected?editingInput:null)};

  document.addEventListener('focusin',onSearchFocus,true);
  document.addEventListener('focusout',onSearchBlur,true);
  window.addEventListener('beforeinput',onSearchBeforeInput,true);
  window.addEventListener('input',onSearchInput,true);
  window.addEventListener('search',onSearchInput,true);
  document.addEventListener('click',clearFromReset,true);

  if(typeof MutationObserver!=='undefined'){
    new MutationObserver(records=>{
      const relevant=records.some(record=>(record.type==='childList'&&(record.addedNodes?.length||record.removedNodes?.length))||(record.type==='attributes'&&IDENTITY_ATTRIBUTES.has(record.attributeName)));
      if(!relevant)return;
      if(editingInput&&!editingInput.isConnected)editingInput=null;
      if(activeInput&&!activeInput.isConnected)activeInput=primaryInput();
      if(pendingIntent?.target&&!pendingIntent.target.isConnected)pendingIntent=null;
      if(authorityReady){const source=editingInput?.isConnected?editingInput:null;syncReplacementInputs(activeDisplayQuery,source);schedule(activeDisplayQuery,source)}
      setTimeout(reconcileFromMaster,32);
    }).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:[...IDENTITY_ATTRIBUTES]});
  }

  const boot=()=>{
    const live=queryFromTarget();authorityReady=true;schedule(live||activeDisplayQuery);
    setTimeout(reconcileFromMaster,60);setTimeout(reconcileFromMaster,180);setTimeout(reconcileFromMaster,480);setTimeout(reconcileFromMaster,880);setTimeout(reconcileFromMaster,1160);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.addEventListener('pageshow',boot,{passive:true});
})();
