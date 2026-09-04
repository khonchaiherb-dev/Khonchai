/* KHONCHAIHERB — canonical customer commerce UI
   Keeps legacy renderer from surfacing unverified commerce metadata. */
(()=>{
  'use strict';
  if(typeof document==='undefined'||window.__KCH_CANONICAL_COMMERCE_UI__)return;
  window.__KCH_CANONICAL_COMMERCE_UI__='2026.09.05';

  const state={products:[],loading:false};
  const $=(s,r=document)=>r?.querySelector?.(s)||null;
  const $$=(s,r=document)=>Array.from(r?.querySelectorAll?.(s)||[]);
  const text=el=>String(el?.textContent||'').replace(/\s+/g,' ').trim();
  const clean=v=>String(v??'').trim();
  const money=n=>{try{return new Intl.NumberFormat('th-TH',{style:'currency',currency:'THB',maximumFractionDigits:0}).format(Number(n)||0)}catch{return `฿${Number(n)||0}`}};

  async function products(){
    if(state.products.length)return state.products;
    if(state.loading)return [];
    state.loading=true;
    try{
      const fromIntegrity=await window.KCHCommerceIntegrity?.loadCatalog?.().catch?.(()=>[])||[];
      if(Array.isArray(fromIntegrity)&&fromIntegrity.length){state.products=fromIntegrity;return state.products}
      const r=await fetch('/api/products',{credentials:'same-origin',headers:{Accept:'application/json'},cache:'no-store'});
      const d=await r.json().catch(()=>({}));
      if(r.ok&&d.ready===true&&Array.isArray(d.products))state.products=d.products;
      return state.products;
    }catch{return []}finally{state.loading=false}
  }

  function currentIdentity(){
    let id=null,slug='';
    try{if(typeof selected!=='undefined'&&selected){id=Number(selected.id)||null;slug=clean(selected.slug)}}catch{}
    if(!slug){const m=String(location.hash||'').match(/product\/([^/?#]+)/i);if(m)try{slug=decodeURIComponent(m[1])}catch{slug=m[1]}}
    return {id,slug};
  }
  function findLive(rows,id,slug=''){return rows.find(p=>id&&Number(p.id)===Number(id))||rows.find(p=>slug&&clean(p.slug)===clean(slug))||null}

  function removeLegacyClaims(scope=document){
    $$('.rating,.review-promo',scope).forEach(el=>el.remove());
    $$('.stats span',scope).forEach(el=>{const t=text(el);if(/^⭐/.test(t)||/ขายแล้ว/.test(t))el.remove()});
    $$('.flash-title',scope).forEach(el=>el.closest('.section,.tshop-section')?.remove());
    $$('.coupon,.voucher',scope).forEach(el=>{if(/WELCOME50|คูปองลูกค้าใหม่/.test(text(el))&&!el.dataset.kchLiveCoupon)el.remove()});
    $$('.review',scope).forEach(el=>{
      const t=text(el),verified=el.matches('[data-review-id],[data-kch-live-review]')||Boolean(el.querySelector('[data-review-id],[data-kch-live-review],.kch-live-review'));
      if(!verified&&(/พ\*\*\*า/.test(t)||/แพ็กดี จัดส่งเรียบร้อย/.test(t)))el.remove();
    });
    $$('[data-go="seller"]',scope).forEach(el=>{el.hidden=true;el.setAttribute('aria-hidden','true')});
  }

  function setImage(host,p){
    if(!host||!clean(p.image_url))return;
    host.querySelectorAll(':scope > .emoji,:scope > .decor,:scope > .tag').forEach(x=>x.remove());
    let img=host.querySelector(':scope > img');if(!img){img=document.createElement('img');host.appendChild(img)}
    img.src=p.image_url;img.alt=clean(p.name);img.loading='eager';img.decoding='async';
  }

  async function canonicalizeProduct(){
    const identity=currentIdentity();if(!identity.id&&!identity.slug)return;
    const rows=await products(),p=findLive(rows,identity.id,identity.slug);if(!p)return;
    const root=$('.kch-pdp-20,.v118-signature-pdp,.detail')?.closest('.shell')||$('#app')||document;
    const title=$('.pdp-title',root)||$('.detail h1',root);if(title)title.textContent=clean(p.name);
    const desc=$('.pdp-description',root)||$('.detail>p',root);if(desc)desc.textContent=clean(p.description)||'ดูรายละเอียดผลิตภัณฑ์และข้อมูลที่ร้านยืนยันก่อนสั่งซื้อ';
    const price=$('.pdp-price',root)||$('.pprice b',root);if(price)price.textContent=money(p.price);
    const old=$('.pprice del',root);const discount=$('.pprice span',root);const compare=Number(p.compare_at_price)||0,livePrice=Number(p.price)||0;
    if(old){if(compare>livePrice){old.hidden=false;old.textContent=money(compare)}else old.remove()}
    if(discount){if(compare>livePrice){discount.hidden=false;discount.textContent=`ลด ${Math.round((1-livePrice/compare)*100)}%`}else discount.remove()}
    $$('.stats span',root).forEach(el=>{const t=text(el);if(/คงเหลือ|สต๊อก/.test(t))el.textContent=`คงเหลือ ${Number(p.stock)||0}`});
    setImage($('.pdp-media .visual',root)||$('.visual.large',root),p);
    root.dataset.kchCanonicalProduct=String(p.id);
    removeLegacyClaims(root);
  }

  function cartRows(){try{const x=JSON.parse(localStorage.getItem('kch-cart')||'[]');return Array.isArray(x)?x:[]}catch{return []}}
  async function canonicalizeCart(){
    const domRows=$$('.cartrow');if(!domRows.length)return;
    await products();const rows=cartRows();
    domRows.forEach((row,i)=>{
      const item=rows[i];if(!item)return;
      const live=findLive(state.products,item.id,item.slug)||item;
      const name=$('.grow>b',row);if(name)name.textContent=clean(live.name||item.name);
      const category=$('.grow>small',row);if(category)category.textContent=clean(live.category||live.cat||item.category||item.cat||'สินค้า');
      const price=$('.grow>strong',row);if(price)price.textContent=money(live.price||item.price);
      setImage($('.visual',row),{...live,image_url:live.image_url||live.image||item.image_url||item.image});
    });
    removeLegacyClaims($('#app')||document);
  }

  async function interceptPurchase(target,e){
    const rawId=Number(target.dataset.add||target.dataset.buy||target.dataset.productId||0);const identity=currentIdentity();const rows=await products();
    const p=findLive(rows,rawId||identity.id,identity.slug);if(!p)return false;
    e.preventDefault();e.stopImmediatePropagation();
    const qty=Math.max(1,Math.min(20,Number($('#qty')?.textContent)||1));
    const out=window.KCHCommerceIntegrity?.addCanonicalProduct?.(p,qty);
    if(!out?.ok)return true;
    if(target.hasAttribute('data-buy')){window.KCHCommerceIntegrity?.openCheckout?.();return true}
    const original=target.textContent;target.textContent='เพิ่มแล้ว';target.disabled=true;setTimeout(()=>{if(target.isConnected){target.disabled=false;target.textContent=original}},650);return true;
  }

  function routeAuthority(e){
    const account=e.target.closest?.('[data-go="account"]');if(account){e.preventDefault();e.stopImmediatePropagation();location.href='/member.html';return true}
    const seller=e.target.closest?.('[data-go="seller"]');if(seller){e.preventDefault();e.stopImmediatePropagation();return true}
    return false;
  }

  async function run(){
    removeLegacyClaims();
    await Promise.allSettled([canonicalizeProduct(),canonicalizeCart()]);
  }

  document.addEventListener('click',e=>{
    if(routeAuthority(e))return;
    const buy=e.target.closest?.('[data-add],[data-buy]');if(!buy||buy.closest('.kch-guided-results'))return;
    interceptPurchase(buy,e).catch(()=>{});
  },true);
  window.addEventListener('hashchange',()=>setTimeout(run,0),{passive:true});
  const observer=new MutationObserver(records=>{if(records.some(r=>r.addedNodes?.length||r.removedNodes?.length))schedule()});observer.observe(document.documentElement,{childList:true,subtree:true});
  let raf=0;function schedule(){if(raf)return;raf=requestAnimationFrame(()=>{raf=0;run()})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
  setTimeout(schedule,160);setTimeout(schedule,650);
})();
