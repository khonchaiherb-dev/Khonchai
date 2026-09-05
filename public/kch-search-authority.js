/* KHONCHAIHERB Search Authority — deterministic storefront search state */
(()=>{
  'use strict';
  if(typeof document==='undefined')return;
  const BUILD='1.0.12';
  if(window.__KCH_SEARCH_AUTHORITY__===BUILD)return;
  window.__KCH_SEARCH_AUTHORITY__=BUILD;

  const SEARCH_SELECTOR='.tshop-searchbox input,#kch-v134-search';
  const PRIMARY_SEARCH_SELECTOR='.tshop-topbar .tshop-searchbox input';
  const CARD_SELECTOR='.kch-master-product';
  const IDENTITY_ATTRIBUTES=new Set(['data-kch-name','data-product','data-kch-cat']);
  const INPUT_VALUE=typeof HTMLInputElement!=='undefined'?Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value'):null;
  const guardedInputs=new WeakSet();
  let activeQuery='';
  let activeDisplayQuery='';
  let authorityReady=false;
  let activeInput=null;
  let editingInput=null;
  let pendingIntent=null;
  let intentSeq=0;
  let seq=0;
  let editHeartbeat=0;
  let masterSyncDepth=0;

  const normalize=value=>String(value??'').normalize('NFKC').toLocaleLowerCase('th-TH').replace(/\s+/g,' ').trim();
  const masterActive=()=>Boolean(document.querySelector('.kch-master-home'));
  const cardText=card=>{
    const authoritative=[card?.dataset?.kchName,card?.dataset?.product,card?.dataset?.kchCat].filter(value=>normalize(value));
    if(authoritative.length)return normalize(authoritative.join(' '));
    const heading=card?.querySelector?.('h1,h2,h3,h4,.kch-master-product-name,[data-product-name]');
    return normalize([heading?.textContent,card?.getAttribute?.('aria-label')].filter(Boolean).join(' '));
  };

  function nativeValue(input){
    if(!input)return '';
    try{return INPUT_VALUE?.get?String(INPUT_VALUE.get.call(input)??''):String(input.value??'')}catch{return String(input.value??'')}
  }

  function writeNative(input,value){
    if(!input)return;
    const next=String(value??'');
    try{
      if(INPUT_VALUE?.set){INPUT_VALUE.set.call(input,next);return}
      input.value=next;
    }catch{}
  }

  function ownsInput(input){
    return Boolean(input)&&(document.activeElement===input||input===editingInput||input===activeInput);
  }

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

  /* Hydration-era storefront layers may write input.value before their older
     event listeners run. Guard the individual search node so a focused,
     non-empty customer value becomes authoritative immediately, before a
     stale programmatic clear can erase it. Native user deletion still bypasses
     this JS setter and is handled by the trusted input event below. */
  function guardInput(input){
    if(!input||guardedInputs.has(input))return input;
    guardedInputs.add(input);
    if(!INPUT_VALUE?.get||!INPUT_VALUE?.set)return input;
    try{
      Object.defineProperty(input,'value',{
        configurable:true,
        enumerable:INPUT_VALUE.enumerable,
        get(){return INPUT_VALUE.get.call(input)},
        set(next){
          const value=String(next??'');
          const current=String(INPUT_VALUE.get.call(input)??'');
          const owned=ownsInput(input);
          if(value&&owned){
            activeDisplayQuery=value;
            activeQuery=normalize(value);
            authorityReady=true;
            activeInput=input;
            if(document.activeElement===input)editingInput=input;
          }
          if(!value&&current&&owned&&activeQuery)return;
          INPUT_VALUE.set.call(input,value);
        }
      });
    }catch{}
    return input;
  }

  function inputs(){
    const found=[...document.querySelectorAll(SEARCH_SELECTOR)];
    found.forEach(guardInput);
    return found;
  }

  function guardInputs(){inputs()}

  function primaryInput(){
    if(editingInput?.isConnected&&editingInput.matches?.(SEARCH_SELECTOR))return guardInput(editingInput);
    if(activeInput?.isConnected&&activeInput.matches?.(SEARCH_SELECTOR))return guardInput(activeInput);
    const focused=document.activeElement;
    if(focused?.matches?.(SEARCH_SELECTOR))return guardInput(focused);
    const primary=document.querySelector(PRIMARY_SEARCH_SELECTOR)||inputs()[0]||null;
    return guardInput(primary);
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

  function syncMasterFallback(value){
    const master=window.__KCH_MASTER_SEARCH__;
    if(!master)return;
    masterSyncDepth+=1;
    try{
      if(typeof master.set==='function')master.set(String(value??''),{force:true,trusted:true,source:'search-authority-fallback'});
      else{master.query=String(value??'');if(typeof master.apply==='function')master.apply()}
    }catch{}finally{masterSyncDepth=Math.max(0,masterSyncDepth-1)}
  }

  function reconcileFromMaster(){
    if(!masterActive())return;
    const masterQuery=masterDisplayQuery();
    if(!normalize(masterQuery))return;
    const input=primaryInput();
    const inputQuery=nativeValue(input);
    const authorityMatches=normalize(activeDisplayQuery)===normalize(masterQuery);
    const inputMatches=normalize(inputQuery)===normalize(masterQuery);
    if(authorityMatches&&inputMatches)return;

    activeInput=input?.isConnected?input:activeInput;
    if(input?.isConnected&&!inputMatches)writeNative(input,masterQuery);
    schedule(masterQuery,input?.isConnected?input:null);
  }

  function reconcileFocusedInput(){
    const input=primaryInput();
    if(!input||!(document.activeElement===input||input===editingInput)){
      reconcileFromMaster();
      return;
    }
    guardInput(input);
    const dom=nativeValue(input);
    const q=normalize(dom);

    if(q){
      if(normalize(activeDisplayQuery)!==q){
        activeInput=input;
        schedule(dom,input);
        syncMasterFallback(dom);
      }
      return;
    }

    if(activeQuery){
      writeNative(input,activeDisplayQuery);
      syncMasterFallback(activeDisplayQuery);
      schedule(activeDisplayQuery,input);
      return;
    }

    reconcileFromMaster();
  }

  function startEditHeartbeat(){
    if(editHeartbeat)clearInterval(editHeartbeat);
    editHeartbeat=setInterval(reconcileFocusedInput,24);
  }
  function stopEditHeartbeatSoon(){
    const token=editHeartbeat;
    setTimeout(()=>{if(token&&editHeartbeat===token){clearInterval(editHeartbeat);editHeartbeat=0}},900);
  }

  function queryFromTarget(target){
    if(target?.matches?.(SEARCH_SELECTOR))return nativeValue(target);
    const primary=primaryInput();
    if(primary)return nativeValue(primary);
    const all=inputs();
    const populated=all.find(input=>normalize(nativeValue(input)));
    return populated?nativeValue(populated):(all[0]?nativeValue(all[0]):activeDisplayQuery);
  }

  function onSearchFocus(event){
    const target=event.target;
    if(!target?.matches?.(SEARCH_SELECTOR))return;
    guardInput(target);
    editingInput=target;
    activeInput=target;
    if(authorityReady&&activeQuery&&!normalize(nativeValue(target)))writeNative(target,activeDisplayQuery);
    startEditHeartbeat();
    setTimeout(reconcileFocusedInput,24);
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
    const current=nativeValue(target);
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

  function onSearchBeforeInput(event){
    const target=event.target;
    if(!target?.matches?.(SEARCH_SELECTOR))return;
    guardInput(target);
    const intended=intendedBeforeInputValue(target,event);
    if(intended==null)return;
    editingInput=target;activeInput=target;startEditHeartbeat();
    const token=++intentSeq;pendingIntent={token,target,value:intended};
    setTimeout(()=>{
      const pending=pendingIntent;
      if(!pending||pending.token!==token||pending.target!==target)return;
      pendingIntent=null;
      if(!target.isConnected)return;
      const committed=nativeValue(target);
      if(committed===intended){schedule(committed,target);syncMasterFallback(committed);return}
      target.value=intended; schedule(intended,target); syncMasterFallback(intended);
    },32);
  }

  function onSearchInput(event){
    const target=event.target;
    if(!target?.matches?.(SEARCH_SELECTOR))return;
    guardInput(target);
    if(pendingIntent?.target===target)pendingIntent=null;
    const displayQuery=nativeValue(target);
    const q=normalize(displayQuery);
    const focused=document.activeElement===target;
    const owned=target===editingInput||target===activeInput||focused;

    if(masterActive()&&!q&&event.isTrusted===false&&activeQuery&&!owned){
      event.stopImmediatePropagation();target.value=activeDisplayQuery;schedule(activeDisplayQuery,editingInput?.isConnected?editingInput:null);return;
    }
    if(!q&&activeQuery&&!owned){target.value=activeDisplayQuery;schedule(activeDisplayQuery,editingInput?.isConnected?editingInput:null);return}

    if(!q&&activeQuery&&event.isTrusted===false){
      event.stopImmediatePropagation();
      writeNative(target,activeDisplayQuery);
      schedule(activeDisplayQuery,target);
      syncMasterFallback(activeDisplayQuery);
      return;
    }

    editingInput=focused?target:editingInput;
    activeInput=target;
    schedule(displayQuery,target);
    syncMasterFallback(displayQuery);
  }

  function clearFromReset(event){
    if(!event.target?.closest?.('.kch-master-reset'))return;
    pendingIntent=null;activeQuery='';activeDisplayQuery='';authorityReady=true;activeInput=null;editingInput=null;
    if(editHeartbeat){clearInterval(editHeartbeat);editHeartbeat=0}
    syncReplacementInputs('');schedule('');syncMasterFallback('');
  }

  function setQuery(query){
    pendingIntent=null;activeInput=null;editingInput=null;schedule(String(query??''));syncMasterFallback(String(query??''));return activeDisplayQuery;
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
      guardInputs();
      if(editingInput&&!editingInput.isConnected)editingInput=null;
      if(activeInput&&!activeInput.isConnected)activeInput=primaryInput();
      if(pendingIntent?.target&&!pendingIntent.target.isConnected)pendingIntent=null;
      if(authorityReady){const source=editingInput?.isConnected?editingInput:null;syncReplacementInputs(activeDisplayQuery,source);schedule(activeDisplayQuery,source)}
      setTimeout(reconcileFocusedInput,24);
    }).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:[...IDENTITY_ATTRIBUTES]});
  }

  const boot=()=>{
    guardInputs();
    const live=queryFromTarget();authorityReady=true;schedule(live||activeDisplayQuery);
    setTimeout(reconcileFocusedInput,60);setTimeout(reconcileFocusedInput,180);setTimeout(reconcileFocusedInput,480);setTimeout(reconcileFocusedInput,880);setTimeout(reconcileFocusedInput,1160);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.addEventListener('pageshow',boot,{passive:true});
})();