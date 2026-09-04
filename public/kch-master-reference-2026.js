/* KHONCHAIHERB — MASTER STOREFRONT REFERENCE 2026
   Structural authority that runs after legacy storefront rendering.
   It rearranges existing, real commerce modules only; it never fabricates products, reviews or promotions. */
(()=>{
  'use strict';
  const MASTER='kch-master-2026';
  let frame=0;

  function isHome(){
    if(typeof current!=='undefined') return String(current)==='home';
    return Boolean(document.querySelector('.tshop-hero'));
  }

  function visible(el){
    return Boolean(el)&&!el.hidden&&el.getAttribute('aria-hidden')!=='true'&&getComputedStyle(el).display!=='none';
  }

  function markMaster(){
    document.body?.classList.add(MASTER);
    document.documentElement.dataset.kchMasterReference='2026';
  }

  function normalizeHomeLabels(){
    if(!isHome())return;
    const recommend=document.querySelector('#recommend');
    if(recommend&&!recommend.dataset.kchMasterCopy){
      recommend.dataset.kchMasterCopy='1';
      if(!recommend.textContent.trim())recommend.textContent='สินค้าที่ได้รับความนิยม';
    }
    const hero=document.querySelector('.tshop-hero');
    if(hero)hero.setAttribute('aria-label','เลือกซื้อสินค้าคุณชายสมุนไพร');
  }

  function placeShortcuts(){
    const hero=document.querySelector('.tshop-hero');
    const quick=document.querySelector('.quick-icons');
    if(!hero||!quick)return;
    if(hero.nextElementSibling!==quick)hero.insertAdjacentElement('afterend',quick);
    quick.setAttribute('aria-label','ทางลัดการเลือกซื้อ');
  }

  function promoGrid(){
    const hero=document.querySelector('.tshop-hero');
    if(!hero)return null;
    const quick=document.querySelector('.quick-icons');
    const story=document.querySelector('.v118-brand-story');
    const helper=document.querySelector('.v118-smart-helper');
    if(!story&&!helper)return null;
    let grid=document.querySelector('.kch-master-promo-grid');
    if(!grid){
      grid=document.createElement('section');
      grid.className='kch-master-promo-grid';
      grid.setAttribute('aria-label','บริการและผู้ช่วยเลือกสินค้า');
    }
    if(story&&story.parentElement!==grid)grid.appendChild(story);
    if(helper&&helper.parentElement!==grid)grid.appendChild(helper);
    const anchor=quick||hero;
    if(anchor.nextElementSibling!==grid)anchor.insertAdjacentElement('afterend',grid);
    return grid;
  }

  function placeProducts(grid){
    const shop=document.querySelector('.v118-shop-first');
    if(!shop)return;
    const anchor=grid||document.querySelector('.quick-icons')||document.querySelector('.tshop-hero');
    if(anchor&&anchor.nextElementSibling!==shop)anchor.insertAdjacentElement('afterend',shop);
    shop.setAttribute('aria-label','เลือกซื้อสินค้า');
  }

  function trustStrip(){
    if(!isHome())return;
    let strip=document.querySelector('.kch-master-trust-strip');
    if(!strip){
      strip=document.createElement('section');
      strip.className='kch-master-trust-strip';
      strip.setAttribute('aria-label','ความมั่นใจในการสั่งซื้อ');
      strip.innerHTML=`
        <div class="kch-master-trust-item"><span class="material-symbols-rounded">verified_user</span><span><b>ข้อมูลก่อนสั่งซื้อชัดเจน</b><small>ตรวจรายละเอียด ราคา และสถานะสินค้าก่อนยืนยัน</small></span></div>
        <div class="kch-master-trust-item"><span class="material-symbols-rounded">local_shipping</span><span><b>ติดตามคำสั่งซื้อได้</b><small>ตรวจสถานะคำสั่งซื้อและการจัดส่งจากระบบ</small></span></div>
        <div class="kch-master-trust-item"><span class="material-symbols-rounded">receipt_long</span><span><b>ประวัติคำสั่งซื้อเป็นระบบ</b><small>ข้อมูลคำสั่งซื้อเชื่อมกับการชำระและเอกสารที่เกี่ยวข้อง</small></span></div>
        <div class="kch-master-trust-item"><span class="material-symbols-rounded">support_agent</span><span><b>มีช่องทางช่วยเหลือลูกค้า</b><small>ค้นหาสินค้าและขอความช่วยเหลือได้สะดวก</small></span></div>`;
    }
    const footer=document.querySelector('.kch-master-footer,.kch-footer-v2,footer,.tshop-bottom');
    if(footer&&strip.nextElementSibling!==footer)footer.insertAdjacentElement('beforebegin',strip);
    else if(!footer&&!strip.isConnected)document.querySelector('.shell')?.appendChild(strip);
  }

  function aiPill(){
    let pill=document.querySelector('.kch-master-ai-pill');
    const helper=document.querySelector('.v118-smart-helper');
    if(!isHome()){
      pill?.remove();
      return;
    }
    if(!pill){
      pill=document.createElement('button');
      pill.type='button';
      pill.className='kch-master-ai-pill';
      pill.setAttribute('aria-label','เปิดผู้ช่วยเลือกสินค้า');
      pill.innerHTML='<span class="material-symbols-rounded">smart_toy</span><span>AI ช่วยเลือกสินค้า</span>';
      pill.addEventListener('click',()=>{
        const target=document.querySelector('.v118-smart-helper');
        if(target)target.scrollIntoView({behavior:'smooth',block:'center'});
      });
      document.body.appendChild(pill);
    }
    pill.hidden=!helper;
  }

  function annotateRealMedia(){
    if(!isHome())return;
    document.querySelectorAll('.video-feed,.review-grid,.reviews-grid,[class*="review-grid"]').forEach(section=>{
      if(visible(section))section.dataset.kchMasterRealContent='1';
    });
  }

  function apply(){
    markMaster();
    if(!isHome()){
      aiPill();
      return;
    }
    normalizeHomeLabels();
    placeShortcuts();
    const grid=promoGrid();
    placeProducts(grid);
    annotateRealMedia();
    trustStrip();
    aiPill();
  }

  function schedule(){
    if(frame)return;
    frame=requestAnimationFrame(()=>{frame=0;apply()});
  }

  function start(){
    markMaster();
    schedule();
    const app=document.getElementById('app');
    if(app)new MutationObserver(schedule).observe(app,{childList:true,subtree:true});
    document.addEventListener('click',e=>{
      if(e.target.closest?.('[data-go],[data-add],[data-buy],.shop-tabs button,.quick-icons button'))setTimeout(schedule,0);
    },true);
    window.addEventListener('popstate',()=>setTimeout(schedule,0),{passive:true});
    window.addEventListener('load',schedule,{once:true});
    setTimeout(schedule,120);
    setTimeout(schedule,600);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
  window.__KCH_MASTER_REFERENCE_2026__={refresh:schedule,version:'2026.09'};
})();
