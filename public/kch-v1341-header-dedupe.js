/* KHONCHAIHERB v1.34.1 — production header de-duplication hotfix */
(()=>{
  'use strict';
  if(typeof document==='undefined')return;
  const BUILD='1.34.1';
  if(window.__KCH_V1341_HEADER_DEDUPE__===BUILD)return;
  window.__KCH_V1341_HEADER_DEDUPE__=BUILD;

  const $=(s,r=document)=>r?.querySelector?.(s)||null;
  const $$=(s,r=document)=>Array.from(r?.querySelectorAll?.(s)||[]);
  const clean=v=>String(v||'').replace(/\s+/g,' ').trim();
  const LEGACY_SELECTORS=[
    '.tshop-topbar',
    '.topbar',
    '.kch-ref-menu',
    '.tshop-menu',
    '.tshop-nav',
    '.kch-ref-header',
    '.kch-master-header',
    '.kch-header',
    '.kch-ref-mobile-panel',
    '.kch-member-entry',
    '.kch-member-quick',
    '.kch-v133-legacy-account-strip',
    '.kch-v134-obsolete-header',
    '.kch-v134-obsolete-menu',
    '.kch-v134-obsolete-account-strip'
  ];

  function hide(el,header){
    if(!el||el===header||el.closest?.('#kch-v134-header')||el.contains?.(header))return;
    if(el.matches?.('nav.bottom,nav.tshop-bottom')||el.closest?.('nav.bottom,nav.tshop-bottom'))return;
    el.classList.add('kch-v1341-hidden-legacy');
    el.setAttribute('aria-hidden','true');
  }

  function looksLikeLegacyTop(el,header){
    if(!el||el===header||el.closest?.('#kch-v134-header')||el.contains?.(header))return false;
    if(el.matches?.('nav.bottom,nav.tshop-bottom')||el.closest?.('nav.bottom,nav.tshop-bottom'))return false;
    if(el.closest?.('.kch-master-home,.tshop-pdp,main,footer,.kch-master-footer'))return false;
    const text=clean(el.textContent);
    if(!text||text.length>900)return false;
    const hasBrand=text.includes('KHONCHAIHERB');
    const hasSearch=Boolean($('input[type="search"],.tshop-searchbox input,.kch-ref-search input,.kch-header-search input',el));
    const hasCart=/ตะกร้า/.test(text);
    const hasOrder=/คำสั่งซื้อ/.test(text);
    const navHits=['หน้าหลัก','สินค้าทั้งหมด','สินค้าแนะนำ','สินค้าใหม่','โปรโมชั่น','เกี่ยวกับเรา','ติดต่อเรา'].filter(x=>text.includes(x)).length;
    const hasMember=/เข้าสู่ระบบ/.test(text)&&/สมัครสมาชิก/.test(text);
    if(hasBrand&&hasSearch&&(hasCart||hasOrder))return true;
    if(navHits>=3&&(el.tagName==='NAV'||el.getAttribute?.('role')==='navigation'||el.className?.toString?.().includes('menu')))return true;
    if(hasMember){
      const rect=el.getBoundingClientRect?.();
      if(rect&&rect.top<460&&rect.height<180)return true;
    }
    return false;
  }

  function dedupe(){
    const header=$('#kch-v134-header');
    if(!header)return;
    LEGACY_SELECTORS.forEach(sel=>$$(sel).forEach(el=>hide(el,header)));

    const app=$('#app');
    if(app){
      $$('header,nav,section,div',app).forEach(el=>{
        if(looksLikeLegacyTop(el,header))hide(el,header);
      });
    }

    // Guard against accidental duplicate structural headers during rerenders.
    $$('#kch-v134-header').slice(1).forEach(el=>el.remove());
    header.classList.add('kch-v1341-header-fixed');
  }

  let raf=0;
  const schedule=()=>{
    if(raf)return;
    raf=requestAnimationFrame(()=>{raf=0;dedupe()});
  };

  const app=$('#app')||document.body;
  if(app&&typeof MutationObserver!=='undefined'){
    new MutationObserver(schedule).observe(app,{childList:true,subtree:true});
  }
  window.addEventListener('pageshow',schedule,{passive:true});
  window.addEventListener('resize',schedule,{passive:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});
  else schedule();
  setTimeout(schedule,40);
  setTimeout(schedule,180);
  setTimeout(schedule,700);
})();
