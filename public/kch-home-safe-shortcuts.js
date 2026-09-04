/* KHONCHAIHERB — safe home shortcuts
   Replaces legacy Flash/LIVE/Coupon shortcuts after canonical storefront rendering. */
(()=>{
  'use strict';
  if(typeof document==='undefined'||window.__KCH_HOME_SAFE_SHORTCUTS__)return;
  window.__KCH_HOME_SAFE_SHORTCUTS__='2026.09.05';
  const icon=name=>{const el=document.createElement('span');el.className='quick-icon-ball material-symbols-rounded';el.textContent=name;return el};
  const label=text=>{const el=document.createElement('span');el.textContent=text;return el};
  function button(name,text,action){const b=document.createElement('button');b.type='button';b.dataset.kchSafeShortcut=action;b.append(icon(name),label(text));return b}
  function scrollTo(selector){const el=document.querySelector(selector);if(el)el.scrollIntoView({behavior:'smooth',block:'start'})}
  function openCart(){const header=document.querySelector('.tshop-topbar [data-go="cart"]');if(header){header.click();return}try{if(typeof cartPage==='function')cartPage()}catch{}}
  function apply(){
    const quick=document.querySelector('.quick-icons');if(!quick||!document.querySelector('.tshop-hero'))return;
    if(quick.dataset.kchSafeShortcuts==='1'&&quick.querySelectorAll('[data-kch-safe-shortcut]').length===5)return;
    quick.replaceChildren(
      button('storefront','สินค้าทั้งหมด','products'),
      button('auto_awesome','ช่วยเลือกสินค้า','guide'),
      button('local_shipping','ติดตามคำสั่งซื้อ','orders'),
      button('shopping_cart','ตะกร้า','cart'),
      button('person','บัญชี','account')
    );
    quick.dataset.kchSafeShortcuts='1';quick.setAttribute('aria-label','ทางลัดการเลือกซื้อและบริการลูกค้า');
  }
  document.addEventListener('click',e=>{
    const b=e.target.closest?.('[data-kch-safe-shortcut]');if(!b)return;
    const action=b.dataset.kchSafeShortcut;
    if(action==='products'){scrollTo('#recommend');return}
    if(action==='guide'){const heroGuide=document.querySelector('[data-v118-guide]');if(heroGuide){heroGuide.click();return}scrollTo('.v118-smart-helper');return}
    if(action==='orders'){location.href='/my-orders.html';return}
    if(action==='cart'){openCart();return}
    if(action==='account')location.href='/member.html';
  },true);
  let raf=0;const schedule=()=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;apply()})};
  const observer=new MutationObserver(records=>{if(records.some(r=>r.addedNodes?.length||r.removedNodes?.length))schedule()});observer.observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
  setTimeout(schedule,180);setTimeout(schedule,720);
})();
