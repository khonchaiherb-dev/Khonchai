/* KHONCHAIHERB — MASTER STOREFRONT REFERENCE 2026
   Structural authority that runs after legacy storefront rendering.
   It rearranges existing, real commerce modules only; it never fabricates products, reviews or promotions. */
(()=>{
  'use strict';
  const MASTER='kch-master-2026';
  let frame=0;
  const PDP_REVIEWS={productId:0,loading:false,loaded:false};

  function page(){return typeof current==='undefined'?'':String(current)}
  function isHome(){return page()==='home'||(!page()&&Boolean(document.querySelector('.tshop-hero')))}
  function isProduct(){return page()==='product'}
  function isCart(){return page()==='cart'}
  function isCheckout(){return page()==='checkout'}
  function isCustomerPage(){return !['seller','admin'].includes(page())}
  function visible(el){return Boolean(el)&&!el.hidden&&el.getAttribute('aria-hidden')!=='true'&&getComputedStyle(el).display!=='none'}
  function setText(el,text){if(el&&el.textContent!==text)el.textContent=text}

  function markMaster(){
    document.body?.classList.add(MASTER);
    document.documentElement.dataset.kchMasterReference='2026';
  }

  function injectCommerceStyles(){
    if(document.getElementById('kch-master-guided-commerce'))return;
    const style=document.createElement('style');
    style.id='kch-master-guided-commerce';
    style.textContent=`
      body.kch-master-2026 .kch-master-sales-assistant{position:fixed;right:18px;bottom:78px;z-index:240;width:min(390px,calc(100vw - 28px));border:1px solid #dce8e0;border-radius:22px;background:rgba(255,255,255,.985);box-shadow:0 28px 70px rgba(6,55,33,.24);overflow:hidden;backdrop-filter:blur(18px) saturate(120%)}
      body.kch-master-2026 .kch-master-sales-assistant[hidden]{display:none!important}
      body.kch-master-2026 .kch-assistant-head{display:flex;align-items:center;gap:11px;padding:16px 16px 13px;background:linear-gradient(125deg,#f0f8f1,#fff);border-bottom:1px solid #e5ece7}
      body.kch-master-2026 .kch-assistant-mark{display:grid;place-items:center;width:42px;height:42px;flex:0 0 auto;border-radius:14px;background:#075031;color:#fff}
      body.kch-master-2026 .kch-assistant-head>div:nth-child(2){display:grid;gap:2px;min-width:0;flex:1}body.kch-master-2026 .kch-assistant-head b{color:#173f2d;font-size:13px}body.kch-master-2026 .kch-assistant-head small{color:#748078;font-size:9px;line-height:1.4}
      body.kch-master-2026 .kch-assistant-close{display:grid;place-items:center;width:36px;height:36px;border:1px solid #e1e8e3;border-radius:50%;background:#fff;color:#365645}
      body.kch-master-2026 .kch-assistant-body{padding:14px 15px 16px}
      body.kch-master-2026 .kch-assistant-search{display:grid;grid-template-columns:1fr auto;gap:7px;padding:5px;border:1px solid #dce6df;border-radius:15px;background:#f6f8f6}
      body.kch-master-2026 .kch-assistant-search input{min-width:0;height:40px;padding:0 10px;border:0;outline:0;background:transparent;color:#244638;font:600 11px/1.2 'Noto Sans Thai',sans-serif}
      body.kch-master-2026 .kch-assistant-search button{min-width:76px;border:0;border-radius:11px;background:#075031;color:#fff;font:900 10px/1 'Noto Sans Thai',sans-serif}
      body.kch-master-2026 .kch-assistant-caption{display:block;margin:9px 2px 8px;color:#718078;font-size:8.8px}
      body.kch-master-2026 .kch-assistant-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}
      body.kch-master-2026 .kch-assistant-actions button{display:grid;grid-template-columns:auto 1fr;align-items:center;gap:8px;min-height:52px;padding:9px 10px;border:1px solid #e1e9e3;border-radius:13px;background:#fff;color:#254636;text-align:left;font:850 9.6px/1.35 'Noto Sans Thai',sans-serif}
      body.kch-master-2026 .kch-assistant-actions .material-symbols-rounded{font-size:20px;color:#137b4d}
      body.kch-master-2026 .kch-master-pdp-guide{margin:12px 0 0;padding:13px;border:1px solid #dfe9e2;border-radius:15px;background:#f8fbf8}
      body.kch-master-2026 .kch-master-pdp-guide-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:10px}.kch-master-pdp-guide-head>span{display:grid;gap:2px}.kch-master-pdp-guide-head b{color:#1d4633;font-size:11px}.kch-master-pdp-guide-head small{color:#748078;font-size:8.7px;line-height:1.45}
      body.kch-master-2026 .kch-master-pdp-guide-head button{flex:0 0 auto;min-height:36px;padding:0 12px;border:1px solid #cfe0d5;border-radius:999px;background:#fff;color:#126640;font:900 9px/1 'Noto Sans Thai',sans-serif}
      body.kch-master-2026 .kch-master-pdp-guide-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}.kch-master-pdp-guide-grid>div{display:flex;align-items:flex-start;gap:7px;padding:9px;border-radius:11px;background:#fff;border:1px solid #e4ebe6}.kch-master-pdp-guide-grid .material-symbols-rounded{font-size:18px;color:#137b4d}.kch-master-pdp-guide-grid span:last-child{display:grid;gap:2px}.kch-master-pdp-guide-grid b{font-size:8.8px;color:#284a39}.kch-master-pdp-guide-grid small{font-size:7.8px;line-height:1.4;color:#77837c}
      body.kch-master-2026 .kch-master-real-pdp-reviews{margin:16px 0 0;padding:16px;border:1px solid #e0e8e2;border-radius:17px;background:#fff;box-shadow:0 7px 22px rgba(13,67,39,.045)}
      body.kch-master-2026 .kch-master-real-review-head{display:flex;align-items:end;justify-content:space-between;gap:12px;margin-bottom:11px}.kch-master-real-review-head span{display:grid;gap:2px}.kch-master-real-review-head b{color:#1d4633;font-size:13px}.kch-master-real-review-head small{color:#748078;font-size:8.8px}.kch-master-real-review-head strong{color:#137b4d;font-size:12px}
      body.kch-master-2026 .kch-master-real-review-list{display:grid;gap:8px}.kch-master-real-review{display:grid;gap:6px;padding:11px;border:1px solid #e5ebe7;border-radius:13px;background:#fbfdfb}.kch-master-real-review-stars{color:#f5a000;font-size:13px;letter-spacing:1px}.kch-master-real-review p{margin:0;color:#3e584a;font-size:9.8px;line-height:1.62}.kch-master-real-review footer{display:flex;align-items:center;justify-content:space-between;gap:9px;margin:0!important;padding:0!important;border:0!important;background:transparent!important;color:#748078!important;font-size:8.3px}.kch-master-real-review footer b{color:#315440;font-size:8.7px}.kch-master-review-empty{margin:0;color:#718078;font-size:9.4px;line-height:1.55}
      body.kch-master-2026 .kch-master-cart-confidence{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:0 0 14px}.kch-master-cart-confidence>div{display:flex;align-items:center;gap:8px;min-height:52px;padding:9px 11px;border:1px solid #e0e8e2;border-radius:13px;background:#f8fbf8;color:#315440}.kch-master-cart-confidence .material-symbols-rounded{font-size:19px;color:#137b4d}.kch-master-cart-confidence span:last-child{display:grid;gap:1px}.kch-master-cart-confidence b{font-size:8.9px}.kch-master-cart-confidence small{font-size:7.8px;color:#76827b}
      body.kch-master-2026 .kch-master-checkout-steps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin:0 0 14px}.kch-master-checkout-step{display:flex;align-items:center;gap:8px;padding:10px;border:1px solid #e0e8e2;border-radius:13px;background:#f8fbf8;color:#65766c}.kch-master-checkout-step i{display:grid;place-items:center;width:27px;height:27px;flex:0 0 auto;border-radius:50%;background:#e8f4eb;color:#116a42;font:900 9px/1 'Noto Sans Thai',sans-serif}.kch-master-checkout-step span{display:grid;gap:1px}.kch-master-checkout-step b{font-size:8.8px;color:#315440}.kch-master-checkout-step small{font-size:7.6px;color:#78837d}
      body.kch-master-2026 .kch-master-checkout-page .checkout-form :where(input,textarea){min-height:47px;border-radius:11px!important;border-color:#dce6df!important;background:#fff!important;font-size:12px!important}body.kch-master-2026 .kch-master-checkout-page .checkout-form textarea{min-height:86px;padding-top:12px!important}
      body.kch-master-2026 .kch-master-checkout-page .payment label.selected{border-color:#9ccbad!important;background:#f0f8f2!important;box-shadow:0 0 0 3px rgba(19,123,77,.05)!important}.kch-master-checkout-page .payment label.disabled{opacity:.55!important}
      body.kch-master-2026 .kch-master-checkout-page [data-place]{min-height:54px;border:0!important;border-radius:13px!important;background:#075031!important;color:#fff!important;font-weight:900!important;box-shadow:0 13px 30px rgba(7,80,49,.17)!important}.kch-master-checkout-page [data-place]:disabled{opacity:.65!important}
      body.kch-master-2026 .v118-hero-copy h1 em{white-space:normal!important}
      @media(max-width:699px){body.kch-master-2026 .kch-master-sales-assistant{right:10px;bottom:calc(76px + env(safe-area-inset-bottom));width:calc(100vw - 20px);border-radius:19px}body.kch-master-2026 .kch-assistant-actions{grid-template-columns:1fr 1fr}body.kch-master-2026 .kch-master-pdp-guide-grid{grid-template-columns:1fr}body.kch-master-2026 .kch-master-pdp-guide-head{display:grid;grid-template-columns:1fr}body.kch-master-2026 .kch-master-pdp-guide-head button{width:100%}body.kch-master-2026.kch-assistant-open{overflow:hidden}body.kch-master-2026 .kch-master-cart-confidence{grid-template-columns:1fr}body.kch-master-2026 .kch-master-checkout-steps{grid-template-columns:1fr 1fr 1fr;gap:5px}.kch-master-checkout-step{display:grid;justify-items:center;text-align:center;gap:4px;padding:8px 5px}.kch-master-checkout-step small{display:none}body.kch-master-2026 .kch-master-checkout-page{padding-bottom:150px!important}body.kch-master-2026 .kch-master-checkout-page [data-place]{position:sticky;bottom:calc(70px + env(safe-area-inset-bottom));z-index:75;width:100%;box-shadow:0 15px 34px rgba(7,80,49,.25)!important}body.kch-master-2026 .kch-master-real-pdp-reviews{margin:12px 10px 0;padding:13px}.kch-master-real-review-head{align-items:start}}
    `;
    document.head.appendChild(style);
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

  function upgradeHeroCopy(){
    if(!isHome())return;
    const hero=document.querySelector('.tshop-hero');
    if(!hero)return;
    setText(hero.querySelector('.v118-eyebrow'),'KHONCHAIHERB • คุณชายสมุนไพร');
    const brand=hero.querySelector('.v118-hero-brand');
    if(brand&&brand.textContent.replace(/\s+/g,' ').trim()!=='คุณชายสมุนไพร KHONCHAIHERB')brand.innerHTML='คุณชายสมุนไพร <small>KHONCHAIHERB</small>';
    const h1=hero.querySelector('.v118-hero-copy h1');
    const headline='สมุนไพรไทย<br><em>เพื่อสุขภาพที่ดีกว่า</em>';
    if(h1&&h1.innerHTML!==headline)h1.innerHTML=headline;
    setText(hero.querySelector('.v118-hero-copy p'),'เลือกซื้อผลิตภัณฑ์สมุนไพรด้วยข้อมูลที่ชัดเจน ดูราคา สถานะสินค้า การจัดส่ง และติดตามคำสั่งซื้อได้ในที่เดียว');
    setText(hero.querySelector('[data-v118-shop]'),'เลือกดูสินค้าทั้งหมด');
    setText(hero.querySelector('[data-v118-guide]'),'ให้ผู้ช่วยช่วยเลือก');
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
    if(!grid){grid=document.createElement('section');grid.className='kch-master-promo-grid';grid.setAttribute('aria-label','บริการและผู้ช่วยเลือกสินค้า')}
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
      strip=document.createElement('section');strip.className='kch-master-trust-strip';strip.setAttribute('aria-label','ความมั่นใจในการสั่งซื้อ');
      strip.innerHTML=`<div class="kch-master-trust-item"><span class="material-symbols-rounded">verified_user</span><span><b>ข้อมูลก่อนสั่งซื้อชัดเจน</b><small>ตรวจรายละเอียด ราคา และสถานะสินค้าก่อนยืนยัน</small></span></div><div class="kch-master-trust-item"><span class="material-symbols-rounded">local_shipping</span><span><b>ติดตามคำสั่งซื้อได้</b><small>ตรวจสถานะคำสั่งซื้อและการจัดส่งจากระบบ</small></span></div><div class="kch-master-trust-item"><span class="material-symbols-rounded">receipt_long</span><span><b>ประวัติคำสั่งซื้อเป็นระบบ</b><small>ข้อมูลคำสั่งซื้อเชื่อมกับการชำระและเอกสารที่เกี่ยวข้อง</small></span></div><div class="kch-master-trust-item"><span class="material-symbols-rounded">support_agent</span><span><b>มีช่องทางช่วยเหลือลูกค้า</b><small>ค้นหาสินค้าและขอความช่วยเหลือได้สะดวก</small></span></div>`;
    }
    const footer=document.querySelector('.kch-master-footer,.kch-footer-v2,footer,.tshop-bottom');
    if(footer&&strip.nextElementSibling!==footer)footer.insertAdjacentElement('beforebegin',strip);else if(!footer&&!strip.isConnected)document.querySelector('.shell')?.appendChild(strip);
  }

  function closeAssistant(){const panel=document.querySelector('.kch-master-sales-assistant');if(panel)panel.hidden=true;document.body?.classList.remove('kch-assistant-open')}
  function openAssistant(seed=''){
    const panel=ensureAssistant();if(!panel)return;
    panel.hidden=false;document.body?.classList.add('kch-assistant-open');
    const input=panel.querySelector('input');if(input){if(seed&&!input.value)input.value=seed;setTimeout(()=>input.focus({preventScroll:true}),20)}
  }
  function goHomeThen(fn){if(isHome()){fn();return}if(typeof home==='function'){home();setTimeout(fn,60);return}fn()}
  function runAssistantAction(action){
    closeAssistant();
    if(action==='shop'){goHomeThen(()=>document.getElementById('recommend')?.scrollIntoView({behavior:'smooth',block:'start'}));return}
    if(action==='ready'||action==='budget'){goHomeThen(()=>{if(typeof v118RunSmartAction==='function')v118RunSmartAction(action);document.getElementById('recommend')?.scrollIntoView({behavior:'smooth',block:'start'})});return}
    if(action==='cart'){if(typeof cartPage==='function')cartPage();return}
    if(action==='orders'){if(typeof orders==='function')orders();else document.querySelector('[data-go="orders"]')?.click();return}
  }

  function ensureAssistant(){
    if(!isCustomerPage()){document.querySelector('.kch-master-sales-assistant')?.remove();document.querySelector('.kch-master-ai-pill')?.remove();return null}
    let panel=document.querySelector('.kch-master-sales-assistant');
    if(!panel){
      panel=document.createElement('aside');panel.className='kch-master-sales-assistant';panel.hidden=true;panel.setAttribute('aria-label','ผู้ช่วยเลือกซื้อสินค้า');
      panel.innerHTML=`<div class="kch-assistant-head"><span class="material-symbols-rounded kch-assistant-mark">smart_toy</span><div><b>ผู้ช่วยขาย KHONCHAIHERB</b><small>ค้นหาจากข้อมูลสินค้าในร้าน และพาไปยังขั้นตอนที่ต้องการ</small></div><button type="button" class="kch-assistant-close" aria-label="ปิดผู้ช่วย"><span class="material-symbols-rounded">close</span></button></div><div class="kch-assistant-body"><form class="kch-assistant-search"><input type="search" autocomplete="off" placeholder="พิมพ์ชื่อสินค้า หรือสิ่งที่กำลังมองหา"><button type="submit">ค้นหา</button></form><small class="kch-assistant-caption">ผู้ช่วยนี้ใช้ข้อมูลสินค้าและระบบร้านค้า ไม่ให้คำวินิจฉัยทางการแพทย์</small><div class="kch-assistant-actions"><button type="button" data-kch-assistant="shop"><span class="material-symbols-rounded">storefront</span><span>ดูสินค้าทั้งหมด</span></button><button type="button" data-kch-assistant="ready"><span class="material-symbols-rounded">inventory_2</span><span>สินค้าพร้อมส่ง</span></button><button type="button" data-kch-assistant="budget"><span class="material-symbols-rounded">savings</span><span>งบไม่เกิน 300 บาท</span></button><button type="button" data-kch-assistant="cart"><span class="material-symbols-rounded">shopping_bag</span><span>เปิดตะกร้า</span></button><button type="button" data-kch-assistant="orders"><span class="material-symbols-rounded">local_shipping</span><span>ติดตามคำสั่งซื้อ</span></button></div></div>`;
      panel.querySelector('.kch-assistant-close')?.addEventListener('click',closeAssistant);
      panel.querySelector('.kch-assistant-search')?.addEventListener('submit',e=>{e.preventDefault();const q=panel.querySelector('input')?.value.trim()||'';if(!q)return;closeAssistant();goHomeThen(()=>{if(typeof runTShopSearch==='function')runTShopSearch(q);else{const box=document.querySelector('.tshop-searchbox input,.searchbox input');if(box){box.value=q;box.dispatchEvent(new Event('input',{bubbles:true}))}}setTimeout(()=>document.getElementById('recommend')?.scrollIntoView({behavior:'smooth',block:'start'}),60)})});
      panel.addEventListener('click',e=>{const b=e.target.closest('[data-kch-assistant]');if(b)runAssistantAction(b.dataset.kchAssistant)});
      document.body.appendChild(panel);
    }
    return panel;
  }

  function assistantSurface(){
    const panel=ensureAssistant();
    if(!panel)return;
    let pill=document.querySelector('.kch-master-ai-pill');
    if(!pill){pill=document.createElement('button');pill.type='button';pill.className='kch-master-ai-pill';pill.setAttribute('aria-label','เปิดผู้ช่วยขาย');pill.innerHTML='<span class="material-symbols-rounded">smart_toy</span><span>ผู้ช่วยขาย</span>';pill.addEventListener('click',()=>panel.hidden?openAssistant():closeAssistant());document.body.appendChild(pill)}
    pill.hidden=!isCustomerPage();
  }

  function removeLegacyReviewPlaceholder(){
    if(!isProduct())return;
    document.querySelectorAll('section.review').forEach(section=>{
      const text=String(section.textContent||'').replace(/\s+/g,' ').trim();
      if(text.includes('แพ็กเรียบร้อย จัดส่งตามกำหนด และติดตามสถานะได้สะดวก'))section.remove();
    });
  }

  async function loadVerifiedProductReviews(){
    if(!isProduct()||typeof selected==='undefined'||!selected)return;
    const productId=Number(selected.id||0);if(!Number.isInteger(productId)||productId<1)return;
    if(PDP_REVIEWS.productId!==productId){PDP_REVIEWS.productId=productId;PDP_REVIEWS.loaded=false;PDP_REVIEWS.loading=false;document.querySelector('.kch-master-real-pdp-reviews')?.remove()}
    if(PDP_REVIEWS.loaded||PDP_REVIEWS.loading)return;
    PDP_REVIEWS.loading=true;
    try{
      const response=await fetch(`/api/reviews?productId=${encodeURIComponent(productId)}&limit=8`,{credentials:'same-origin',headers:{Accept:'application/json'}});
      if(!response.ok)return;
      const data=await response.json().catch(()=>null);if(!data)return;
      const reviews=(Array.isArray(data.reviews)?data.reviews:[]).filter(r=>r&&r.verifiedPurchase&&String(r.body||'').trim());
      renderVerifiedProductReviews(productId,data.summary||{},reviews);
      PDP_REVIEWS.loaded=true;
    }catch{}finally{PDP_REVIEWS.loading=false}
  }

  function renderVerifiedProductReviews(productId,summary,reviews){
    if(!isProduct()||Number(selected?.id||0)!==productId)return;
    let section=document.querySelector('.kch-master-real-pdp-reviews');
    if(!section){section=document.createElement('section');section.className='kch-master-real-pdp-reviews';section.setAttribute('aria-label','รีวิวจากผู้ซื้อที่ยืนยันแล้ว')}
    section.replaceChildren();
    const head=document.createElement('div');head.className='kch-master-real-review-head';const label=document.createElement('span');const title=document.createElement('b');title.textContent='รีวิวจากผู้ซื้อที่ยืนยันแล้ว';const sub=document.createElement('small');sub.textContent='แสดงเฉพาะรีวิวที่เชื่อมกับคำสั่งซื้อในระบบ';label.append(title,sub);head.appendChild(label);
    const count=Number(summary.count||0),average=Number(summary.average||0);if(count>0&&average>0){const score=document.createElement('strong');score.textContent=`${average.toFixed(1)} / 5 • ${count} รีวิว`;head.appendChild(score)}
    section.appendChild(head);
    if(reviews.length){const list=document.createElement('div');list.className='kch-master-real-review-list';reviews.forEach(r=>{const card=document.createElement('article');card.className='kch-master-real-review';const stars=document.createElement('div');stars.className='kch-master-real-review-stars';stars.textContent='★'.repeat(Math.max(0,Math.min(5,Number(r.rating||0))));stars.setAttribute('aria-label',`${Number(r.rating||0)} ดาว`);const body=document.createElement('p');body.textContent=String(r.body||'').trim();const footer=document.createElement('footer');const buyer=document.createElement('b');buyer.textContent=String(r.buyer||'ผู้ซื้อที่ยืนยันแล้ว');const verified=document.createElement('span');verified.textContent='✓ Verified Purchase';footer.append(buyer,verified);card.append(stars,body,footer);list.appendChild(card)});section.appendChild(list)}
    else{const empty=document.createElement('p');empty.className='kch-master-review-empty';empty.textContent='ยังไม่มีรีวิวจากผู้ซื้อที่ยืนยันแล้วสำหรับสินค้านี้';section.appendChild(empty)}
    const pdp=document.querySelector('.kch-pdp-20,.tshop-pdp,.detail');if(pdp&&!section.isConnected)pdp.appendChild(section);
  }

  function enhanceProductDetail(){
    if(!isProduct())return;
    removeLegacyReviewPlaceholder();
    const pdp=document.querySelector('.kch-pdp-20,.tshop-pdp,.detail');if(!pdp)return;
    if(!pdp.querySelector('.kch-master-pdp-guide')){
      const ready=typeof selected!=='undefined'&&selected&&Number(selected.price||0)>0&&!selected.comingSoon;
      const name=typeof selected!=='undefined'&&selected?.name?String(selected.name):'';
      const guide=document.createElement('section');guide.className='kch-master-pdp-guide';guide.setAttribute('aria-label','ความช่วยเหลือก่อนสั่งซื้อ');
      guide.innerHTML=`<div class="kch-master-pdp-guide-head"><span><b>${ready?'พร้อมดำเนินการสั่งซื้อ':'ตรวจข้อมูลสินค้าก่อนสั่งซื้อ'}</b><small>ตรวจราคา จำนวน ที่อยู่จัดส่ง และยอดรวมอีกครั้งก่อนยืนยันคำสั่งซื้อ</small></span><button type="button" data-kch-ask-product>ให้ผู้ช่วยช่วยเลือก</button></div><div class="kch-master-pdp-guide-grid"><div><span class="material-symbols-rounded">payments</span><span><b>เก็บเงินปลายทาง</b><small>รองรับ COD เมื่อรายการเข้าเงื่อนไข</small></span></div><div><span class="material-symbols-rounded">local_shipping</span><span><b>ติดตามออเดอร์</b><small>ค้นหาสถานะด้วยข้อมูลคำสั่งซื้อ</small></span></div><div><span class="material-symbols-rounded">receipt_long</span><span><b>ใบเสร็จ</b><small>ออกได้หลังรับชำระสำเร็จ</small></span></div></div>`;
      const anchor=pdp.querySelector('.pdp-price-block,.v115-pdp-info-pane,.pdp-info')||pdp;anchor.insertAdjacentElement?.('afterend',guide);if(!guide.isConnected)pdp.appendChild(guide);
      guide.querySelector('[data-kch-ask-product]')?.addEventListener('click',()=>openAssistant(name));
    }
    loadVerifiedProductReviews();
  }

  function enhanceCart(){
    if(!isCart())return;
    const main=document.querySelector('main.page');if(!main)return;main.classList.add('kch-master-cart-page');
    if(main.querySelector('.kch-master-cart-confidence'))return;
    const title=main.querySelector('.page-title');if(!title)return;
    const strip=document.createElement('section');strip.className='kch-master-cart-confidence';strip.setAttribute('aria-label','ความมั่นใจก่อนชำระเงิน');strip.innerHTML=`<div><span class="material-symbols-rounded">payments</span><span><b>รองรับเก็บเงินปลายทาง</b><small>เลือก COD ในขั้นตอนชำระเงิน</small></span></div><div><span class="material-symbols-rounded">fact_check</span><span><b>ตรวจยอดก่อนยืนยัน</b><small>ราคาและสต๊อกตรวจซ้ำบนเซิร์ฟเวอร์</small></span></div><div><span class="material-symbols-rounded">receipt_long</span><span><b>มีใบเสร็จหลังรับชำระ</b><small>เชื่อมกับคำสั่งซื้อและสถานะการชำระ</small></span></div>`;title.insertAdjacentElement('afterend',strip);
  }

  function enhanceCheckout(){
    if(!isCheckout())return;
    const main=document.querySelector('main.page');if(!main)return;main.classList.add('kch-master-checkout-page');
    const title=main.querySelector('.page-title');
    if(title&&!main.querySelector('.kch-master-checkout-steps')){const steps=document.createElement('section');steps.className='kch-master-checkout-steps';steps.setAttribute('aria-label','ขั้นตอนชำระเงิน');steps.innerHTML=`<div class="kch-master-checkout-step"><i>1</i><span><b>ข้อมูลจัดส่ง</b><small>ชื่อ เบอร์โทร ที่อยู่</small></span></div><div class="kch-master-checkout-step"><i>2</i><span><b>COD</b><small>ชำระเมื่อได้รับสินค้า</small></span></div><div class="kch-master-checkout-step"><i>3</i><span><b>ยืนยันออเดอร์</b><small>ตรวจยอดก่อนส่งคำสั่งซื้อ</small></span></div>`;title.insertAdjacentElement('afterend',steps)}
    const err=main.querySelector('#checkout-error');if(err){err.setAttribute('role','alert');err.setAttribute('aria-live','polite')}
    const place=main.querySelector('[data-place]');if(place&&!place.disabled&&place.textContent.trim()==='สั่งซื้อสินค้า')place.textContent='ยืนยันคำสั่งซื้อแบบเก็บเงินปลายทาง';
    main.querySelectorAll('.checkout-form input,.checkout-form textarea').forEach(el=>{el.setAttribute('aria-required',el.id==='marketing-consent'?'false':'true')});
  }

  function annotateRealMedia(){if(!isHome())return;document.querySelectorAll('.video-feed,.review-grid,.reviews-grid,[class*="review-grid"]').forEach(section=>{if(visible(section))section.dataset.kchMasterRealContent='1'})}

  function apply(){
    markMaster();injectCommerceStyles();assistantSurface();
    if(isProduct())enhanceProductDetail();
    if(isCart())enhanceCart();
    if(isCheckout())enhanceCheckout();
    if(!isHome())return;
    normalizeHomeLabels();upgradeHeroCopy();placeShortcuts();const grid=promoGrid();placeProducts(grid);annotateRealMedia();trustStrip();
  }

  function schedule(){if(frame)return;frame=requestAnimationFrame(()=>{frame=0;apply()})}
  function start(){
    markMaster();injectCommerceStyles();schedule();
    const app=document.getElementById('app');if(app)new MutationObserver(schedule).observe(app,{childList:true,subtree:true});
    document.addEventListener('click',e=>{if(e.target.closest?.('[data-go],[data-add],[data-buy],.shop-tabs button,.quick-icons button'))setTimeout(schedule,0)},true);
    document.addEventListener('keydown',e=>{if(e.key==='Escape')closeAssistant()});
    window.addEventListener('popstate',()=>setTimeout(schedule,0),{passive:true});window.addEventListener('load',schedule,{once:true});setTimeout(schedule,120);setTimeout(schedule,600);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.__KCH_MASTER_REFERENCE_2026__={refresh:schedule,openAssistant,version:'2026.09.3'};
})();
