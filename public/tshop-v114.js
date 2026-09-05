/* KHONCHAIHERB Commerce v1.14 — responsive runtime helpers */
const V114_BREAKPOINTS={mobile:699,tablet:1023};
function v114FormFactor(width){const w=Number(width||0);return w<=V114_BREAKPOINTS.mobile?'mobile':w<=V114_BREAKPOINTS.tablet?'tablet':'desktop'}
function v114ApplyViewport(){const vv=window.visualViewport,width=Math.round(vv?.width||window.innerWidth||document.documentElement.clientWidth||320),height=Math.round(vv?.height||window.innerHeight||document.documentElement.clientHeight||640),factor=v114FormFactor(width),root=document.documentElement;root.dataset.kchFormFactor=factor;root.dataset.kchInput=matchMedia('(pointer:coarse)').matches?'touch':'pointer';root.style.setProperty('--kch-vh',`${height}px`);root.style.setProperty('--kch-vw',`${width}px`);return {width,height,factor}}
let V114_RESIZE_TIMER=0;function v114ScheduleViewport(){clearTimeout(V114_RESIZE_TIMER);V114_RESIZE_TIMER=setTimeout(v114ApplyViewport,60)}
function v114EnhanceResponsiveA11y(){document.querySelectorAll('.tablecard').forEach((el,i)=>{if(!el.hasAttribute('tabindex'))el.tabIndex=0;if(!el.hasAttribute('role'))el.setAttribute('role','region');if(!el.hasAttribute('aria-label'))el.setAttribute('aria-label',`ตารางข้อมูล ${i+1}`)});document.querySelectorAll('.tshop-add').forEach(b=>{if(!b.getAttribute('aria-label'))b.setAttribute('aria-label','เพิ่มสินค้าลงตะกร้า')})}
const v114BindBase=typeof bind==='function'?bind:null;if(v114BindBase){bind=function(){v114BindBase();v114EnhanceResponsiveA11y()}}
window.addEventListener('resize',v114ScheduleViewport,{passive:true});window.addEventListener('orientationchange',v114ScheduleViewport,{passive:true});window.visualViewport?.addEventListener('resize',v114ScheduleViewport,{passive:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{v114ApplyViewport();v114EnhanceResponsiveA11y()},{once:true});else{v114ApplyViewport();v114EnhanceResponsiveA11y()}
window.__KCH_RESPONSIVE__={breakpoints:V114_BREAKPOINTS,formFactor:v114FormFactor,refresh:v114ApplyViewport};

/* Canonical live storefront bootstrap.
   IMPORTANT: the canonical layers are loaded only after every legacy storefront
   script has finished, so the customer-facing authority wins the cascade. */
(()=>{
  'use strict';
  const VERSION='2026.09.05.3';
  if(window.__KCH_LIVE_ENTRY__===VERSION)return;
  window.__KCH_LIVE_ENTRY__=VERSION;

  const styles=[
    'kch-master-reference-2026.css',
    'tshop-v120.css',
    'tshop-v131-top-conversion.css',
    'tshop-v132-conversion-storefront.css',
    'tshop-v1321-search-visibility-fix.css',
    'tshop-v133-readable-storefront.css',
    'tshop-v134-structural-storefront.css',
    'tshop-v1341-header-dedupe.css',
    'tshop-v135-lower-standard.css',
    'kch-storefront-stability.css'
  ];
  const scripts=[
    'kch-master-reference-2026.js',
    'kch-top-conversion.js',
    'kch-conversion-storefront.js',
    'kch-readable-storefront.js',
    'kch-v134-structural-storefront.js',
    'kch-v1341-header-dedupe.js',
    'kch-canonical-commerce-ui.js',
    'kch-pdp-truth-layer.js',
    'kch-live-catalog-guard.js',
    'kch-search-authority.js'
  ];

  function addStyle(name){
    if(document.querySelector(`link[data-kch-live-style="${name}"]`))return;
    const link=document.createElement('link');link.rel='stylesheet';link.href=`/${name}?v=${VERSION}`;link.dataset.kchLiveStyle=name;document.head.appendChild(link);
  }
  function addScript(name){
    return new Promise(resolve=>{
      const existing=document.querySelector(`script[data-kch-live-script="${name}"]`);
      if(existing){if(existing.dataset.kchLoaded==='1')resolve();else existing.addEventListener('load',resolve,{once:true});return}
      const script=document.createElement('script');script.src=`/${name}?v=${VERSION}`;script.async=false;script.dataset.kchLiveScript=name;
      script.addEventListener('load',()=>{script.dataset.kchLoaded='1';resolve()},{once:true});script.addEventListener('error',()=>resolve(),{once:true});document.body.appendChild(script);
    });
  }

  const glyphs={
    search:'⌕',local_shipping:'▰',payments:'฿',verified:'✓',verified_user:'✓',check_circle:'✓',schedule:'◷',auto_awesome:'✦',home:'⌂',shopping_bag:'▣',person:'●',inventory_2:'▦',receipt_long:'≣',bolt:'ϟ',smart_toy:'◆',menu:'☰',close:'×',arrow_forward:'→',chevron_right:'›',favorite:'♡',add:'＋',remove:'−',eco:'❧',redeem:'✦'
  };
  function installIconFallback(){
    const fonts=document.fonts;
    if(fonts?.check?.('16px "Material Symbols Rounded"'))return;
    if(!document.getElementById('kch-icon-fallback-style')){
      const style=document.createElement('style');style.id='kch-icon-fallback-style';style.textContent='.material-symbols-rounded[data-kch-icon-fallback="1"]{font-family:Arial,sans-serif!important;font-variation-settings:normal!important;font-weight:800!important;letter-spacing:0!important;text-transform:none!important;line-height:1!important}';document.head.appendChild(style)
    }
    const apply=root=>root.querySelectorAll?.('.material-symbols-rounded:not([data-kch-icon-fallback])').forEach(el=>{const key=String(el.textContent||'').trim();if(!glyphs[key])return;el.textContent=glyphs[key];el.dataset.kchIconFallback='1'});
    apply(document);
    if(typeof MutationObserver!=='undefined')new MutationObserver(records=>records.forEach(r=>r.addedNodes?.forEach(n=>{if(n.nodeType===1){if(n.matches?.('.material-symbols-rounded')){const key=String(n.textContent||'').trim();if(glyphs[key]){n.textContent=glyphs[key];n.dataset.kchIconFallback='1'}}apply(n)}}))).observe(document.body,{childList:true,subtree:true});
  }

  async function boot(){
    styles.forEach(addStyle);
    for(const script of scripts)await addScript(script);
    document.documentElement.dataset.kchLiveAuthority=VERSION;
    setTimeout(installIconFallback,900);
  }
  if(document.readyState==='complete')boot();else window.addEventListener('load',boot,{once:true});
})();