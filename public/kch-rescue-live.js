/* KHONCHAIHERB live storefront rescue — independent of Google icon fonts and legacy hydration. */
(()=>{
  'use strict';
  const VERSION='2026.09.05.4';
  if(window.__KCH_LIVE_RESCUE__===VERSION)return;
  window.__KCH_LIVE_RESCUE__=VERSION;

  const $=(s,r=document)=>r?.querySelector?.(s)||null;
  const $$=(s,r=document)=>Array.from(r?.querySelectorAll?.(s)||[]);
  const clean=v=>String(v??'').trim();
  const num=v=>Number(v)||0;
  const ready=p=>clean(p?.slug)&&clean(p?.image_url||p?.image)&&num(p?.price)>0&&Math.max(0,num(p?.available_stock??p?.stock))>0;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=n=>{try{return new Intl.NumberFormat('th-TH',{style:'currency',currency:'THB',maximumFractionDigits:0}).format(num(n))}catch{return `฿${num(n)}`}};

  function activate(){
    document.documentElement.dataset.kchMasterReference='2026';
    document.documentElement.dataset.kchLiveRescue=VERSION;
    document.body?.classList.add('kch-master-2026','kch-rescue-live');
  }

  const iconPaths={
    search:'<circle cx="10.5" cy="10.5" r="5.8"/><path d="m15 15 5 5"/>',
    local_shipping:'<path d="M3 6h11v10H3zM14 9h4l3 3v4h-7z"/><circle cx="7" cy="18" r="1.7"/><circle cx="18" cy="18" r="1.7"/>',
    payments:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 9h18M7 15h4"/>',
    verified:'<circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16.5 8.5"/>',
    verified_user:'<path d="M12 3 5 6v5c0 4.3 2.8 8 7 10 4.2-2 7-5.7 7-10V6z"/><path d="m8.5 12 2.2 2.2 4.8-5"/>',
    check_circle:'<circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16.5 8.5"/>',
    schedule:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    auto_awesome:'<path d="m12 3 1.4 4.1L17.5 8.5l-4.1 1.4L12 14l-1.4-4.1-4.1-1.4 4.1-1.4zM18.5 14.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
    home:'<path d="m3 11 9-7 9 7"/><path d="M5.5 9.5V20h13V9.5M10 20v-6h4v6"/>',
    shopping_bag:'<path d="M5 8h14l-1 12H6z"/><path d="M9 9V7a3 3 0 0 1 6 0v2"/>',
    shopping_cart:'<path d="M3 4h2l2 11h10l3-7H6"/><circle cx="9" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/>',
    person:'<circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 6.5 0 0 1 15 0"/>',
    inventory_2:'<path d="M4 7h16v14H4zM3 3h18v4H3zM9 11h6"/>',
    receipt_long:'<path d="M6 3h12v18l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4L6 21z"/><path d="M9 8h6M9 12h6M9 16h4"/>',
    bolt:'<path d="m13 2-7 11h6l-1 9 7-12h-6z"/>',
    smart_toy:'<rect x="4" y="7" width="16" height="12" rx="3"/><path d="M12 3v4M9 13h.01M15 13h.01M8 17h8"/>',
    add:'<path d="M12 5v14M5 12h14"/>',
    delete:'<path d="M5 7h14M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6"/>',
    favorite:'<path d="M12 20s-8-4.8-8-10a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.2-8 10-8 10z"/>',
    storefront:'<path d="M4 10h16v11H4zM3 10l2-6h14l2 6M8 21v-7h8v7"/>',
    arrow_back:'<path d="M20 12H5M11 6l-6 6 6 6"/>',
    arrow_forward:'<path d="M4 12h15M13 6l6 6-6 6"/>',
    chevron_right:'<path d="m9 5 7 7-7 7"/>',
    sell:'<path d="M20 13 13 20 4 11V4h7z"/><circle cx="8.5" cy="8.5" r="1"/>',
    confirmation_number:'<path d="M4 6h16v4a2 2 0 0 0 0 4v4H4v-4a2 2 0 0 0 0-4z"/><path d="M12 7v10"/>',
    star:'<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9z"/>',
    magic_button:'<path d="m4 20 10-10M14 4l1 3 3 1-3 1-1 3-1-3-3-1 3-1zM19 14l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/>',
    redeem:'<path d="M4 11h16v10H4zM3 7h18v4H3zM12 7v14"/><path d="M12 7c-4 0-5-1.5-5-3 0-1 1-1.7 2-1.7 2 0 3 2 3 4.7zm0 0c4 0 5-1.5 5-3 0-1-1-1.7-2-1.7-2 0-3 2-3 4.7z"/>',
    savings:'<path d="M5 11c0-4 3-7 8-7 4 0 7 2 8 5l-1.5 1.5V16H17l-1 3h-3l-.5-2h-4l-.5 2H5l-1-4H2v-3h3z"/><circle cx="15.5" cy="8" r=".7"/>',
    local_florist:'<path d="M12 21v-9M12 13c-5 0-8-3-8-7 5 0 8 3 8 7zm0 2c5 0 8-3 8-7-5 0-8 3-8 7z"/>',
    menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
    close:'<path d="M6 6l12 12M18 6 6 18"/>'
  };
  const generic='<circle cx="12" cy="12" r="8"/><path d="M8.5 12h7"/>';

  function safeIcons(root=document){
    $$('.material-symbols-rounded',root).forEach(el=>{
      if(el.dataset.kchIconSafe==='1')return;
      const name=clean(el.textContent).toLowerCase();
      if(!/^[a-z0-9_]+$/.test(name))return;
      el.dataset.kchIconSafe='1';
      el.dataset.kchIconName=name;
      el.classList.add('kch-icon-safe');
      el.setAttribute('aria-hidden','true');
      el.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${iconPaths[name]||generic}</svg>`;
    });
  }

  function removeUnverifiedMerchandising(){
    const roots=$$('section,div').filter(el=>{
      const t=clean(el.textContent).replace(/\s+/g,' ');
      return t.includes('FLASH DEAL')&&(/เหลือเวลา|ขายแล้ว|ดูทั้งหมด/.test(t));
    });
    const shallow=roots.filter(el=>!roots.some(other=>other!==el&&el.contains(other)));
    shallow.forEach(el=>{el.hidden=true;el.setAttribute('aria-hidden','true')});
    $('#coupon-strip')?.setAttribute('hidden','');
    $$('.review-promo').forEach(el=>el.hidden=true);
  }

  function enrichLegacyHero(rows){
    if(!rows?.length)return;
    const art=$('.hero-art');
    if(!art||art.querySelector('img'))return;
    const p=rows[0],src=clean(p.image_url||p.image);
    if(!src)return;
    art.innerHTML=`<img src="${esc(src)}" alt="${esc(p.name||'สินค้า KHONCHAIHERB')}" loading="eager" decoding="async">`;
  }

  function enforceLiveCards(rows){
    const allowed=new Set((rows||[]).map(p=>clean(p.slug)).filter(Boolean));
    if(!allowed.size)return;
    $$('[data-product]').forEach(el=>{
      const slug=clean(el.dataset.product);
      if(!slug)return;
      if(el.matches('.flash-item,.flash-product')){el.hidden=true;return}
      if(el.matches('.card,.tshop-card,.kch-master-product,.v118-featured-product')&&!allowed.has(slug)){
        el.hidden=true;el.setAttribute('aria-hidden','true');
      }
    });
  }

  async function loadLive(){
    try{
      const r=await fetch('/api/products',{cache:'no-store',credentials:'same-origin',headers:{Accept:'application/json'}});
      const d=await r.json().catch(()=>({}));
      const rows=(r.ok&&Array.isArray(d.products)?d.products:[]).filter(ready);
      window.__KCH_RESCUE_READY_PRODUCTS__=rows;
      enrichLegacyHero(rows);
      enforceLiveCards(rows);
      return rows;
    }catch{return []}
  }

  function polish(){activate();safeIcons();removeUnverifiedMerchandising();const rows=window.__KCH_RESCUE_READY_PRODUCTS__;if(Array.isArray(rows)&&rows.length){enrichLegacyHero(rows);enforceLiveCards(rows)}}

  let frame=0;
  const schedule=()=>{if(frame)return;frame=requestAnimationFrame(()=>{frame=0;polish()})};
  const start=()=>{
    activate();polish();loadLive().then(()=>polish());
    const root=$('#app')||document.body;
    if(root&&typeof MutationObserver!=='undefined')new MutationObserver(schedule).observe(root,{childList:true,subtree:true,characterData:true});
    window.addEventListener('pageshow',schedule,{passive:true});
    window.addEventListener('resize',schedule,{passive:true});
    if('serviceWorker' in navigator)navigator.serviceWorker.getRegistrations().then(regs=>regs.forEach(reg=>reg.update().catch(()=>{}))).catch(()=>{});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
