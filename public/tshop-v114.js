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

/* Canonical storefront bootstrap. These assets are deliberately loaded at runtime so they become the final customer-facing authority after the legacy cascade. */
(()=>{
  const VERSION='2026.09';
  if(!document.querySelector('link[data-kch-master-reference="2026"]')){
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href=`/kch-master-reference-2026.css?v=${encodeURIComponent(VERSION)}`;
    link.dataset.kchMasterReference='2026';
    document.head.appendChild(link);
  }
  if(!document.querySelector('script[data-kch-master-reference="2026"]')){
    const script=document.createElement('script');
    script.src=`/kch-master-reference-2026.js?v=${encodeURIComponent(VERSION)}`;
    script.async=false;
    script.dataset.kchMasterReference='2026';
    document.head.appendChild(script);
  }
})();