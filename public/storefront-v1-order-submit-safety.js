/* KHONCHAIHERB V1 — duplicate-order submission safety
   Reuses one idempotency key for the same checkout payload across uncertain network/server
   failures and coalesces duplicate in-flight /api/orders requests. No PII is persisted: only
   a SHA-256/fallback fingerprint, idempotency key and timestamp are kept in sessionStorage. */
(()=>{
  'use strict';

  const STORAGE_KEY='kch-order-submit-attempts-v1';
  const MAX_AGE_MS=30*60*1000;
  const ORDER_PATH='/api/orders';
  const nativeFetch=window.fetch.bind(window);
  const inflight=new Map();

  const randomKey=()=>crypto?.randomUUID?.()||`kch-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const stable=value=>{
    if(Array.isArray(value))return `[${value.map(stable).join(',')}]`;
    if(value&&typeof value==='object')return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
    return JSON.stringify(value);
  };
  const fallbackHash=text=>{
    let h=2166136261;
    for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}
    return `fnv1a-${(h>>>0).toString(16).padStart(8,'0')}-${text.length}`;
  };
  async function fingerprint(payload){
    const copy={...payload};delete copy.idempotencyKey;
    const text=stable(copy);
    try{
      if(crypto?.subtle&&typeof TextEncoder!=='undefined'){
        const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
        return [...new Uint8Array(bytes)].map(v=>v.toString(16).padStart(2,'0')).join('');
      }
    }catch{/* fallback below */}
    return fallbackHash(text);
  }

  function loadAttempts(){
    try{
      const parsed=JSON.parse(sessionStorage.getItem(STORAGE_KEY)||'{}');
      const now=Date.now(),clean={};
      for(const [fp,row] of Object.entries(parsed||{})){
        if(row&&typeof row.key==='string'&&row.key&&now-Number(row.createdAt||0)<MAX_AGE_MS)clean[fp]=row;
      }
      sessionStorage.setItem(STORAGE_KEY,JSON.stringify(clean));
      return clean;
    }catch{return {}}
  }
  function remember(fp,key){
    try{
      const rows=loadAttempts();
      rows[fp]={key,createdAt:Date.now()};
      sessionStorage.setItem(STORAGE_KEY,JSON.stringify(rows));
    }catch{/* session storage must never block checkout */}
  }
  function forget(fp){
    try{
      const rows=loadAttempts();
      if(rows[fp]){delete rows[fp];sessionStorage.setItem(STORAGE_KEY,JSON.stringify(rows))}
    }catch{/* ignore */}
  }
  function keyFor(fp,proposed){
    const existing=loadAttempts()[fp]?.key;
    const key=existing||String(proposed||'').trim()||randomKey();
    if(!existing)remember(fp,key);
    return key;
  }

  function setSubmitting(active){
    const button=document.querySelector('[data-place-order]');
    if(!button)return;
    if(active){
      button.dataset.kchSubmitSafety='pending';
      button.setAttribute('aria-busy','true');
      button.disabled=true;
    }else{
      delete button.dataset.kchSubmitSafety;
      button.removeAttribute('aria-busy');
    }
  }

  async function guardedOrderFetch(input,init={}){
    const inputUrl=typeof input==='string'||input instanceof URL?String(input):String(input?.url||'');
    let url;
    try{url=new URL(inputUrl,location.href)}catch{return nativeFetch(input,init)}
    const method=String(init?.method||input?.method||'GET').toUpperCase();
    if(url.origin!==location.origin||url.pathname!==ORDER_PATH||method!=='POST'||typeof init?.body!=='string')return nativeFetch(input,init);

    let payload;
    try{payload=JSON.parse(init.body)}catch{return nativeFetch(input,init)}
    if(!payload||typeof payload!=='object'||Array.isArray(payload))return nativeFetch(input,init);

    const fp=await fingerprint(payload);
    payload.idempotencyKey=keyFor(fp,payload.idempotencyKey);
    const patched={...init,body:JSON.stringify(payload)};

    const existing=inflight.get(fp);
    if(existing)return existing.then(response=>response.clone());

    setSubmitting(true);
    const request=nativeFetch(input,patched)
      .then(response=>{
        // A 4xx response is a definitive rejection: no order should have been committed.
        // 2xx stays remembered until the success UI is rendered. Network/5xx remains
        // remembered so retrying the same form uses the exact same idempotency key.
        if(response.status>=400&&response.status<500)forget(fp);
        return response;
      })
      .finally(()=>{
        inflight.delete(fp);
        setSubmitting(false);
      });
    inflight.set(fp,request);
    return request.then(response=>response.clone());
  }

  window.fetch=guardedOrderFetch;

  // Core renders .kch-success only after it has parsed a successful order response and saved
  // the order locally. At that point this browser no longer needs the pending retry record.
  const clearConfirmedAttempts=()=>{
    if(!document.querySelector('.kch-success'))return;
    try{sessionStorage.removeItem(STORAGE_KEY)}catch{/* ignore */}
  };
  new MutationObserver(clearConfirmedAttempts).observe(document.documentElement,{childList:true,subtree:true});
  clearConfirmedAttempts();
})();
