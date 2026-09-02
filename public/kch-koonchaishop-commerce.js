/* KHONCHAIHERB Commerce v1.30 — source-aware Koonchaishop social proof */
(()=>{
  'use strict';
  const BUILD='1.30.1';
  const state={cache:new Map(),frame:0,lastView:'',lastProductId:0};
  const $=(s,r=document)=>r.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const now=()=>Date.now();
  const currentView=()=>typeof current==='string'?current:'';
  const localProducts=()=>typeof PRODUCTS!=='undefined'&&Array.isArray(PRODUCTS)?PRODUCTS:[];
  const localProduct=id=>localProducts().find(p=>Number(p?.id)===Number(id))||null;
  const activeProduct=()=>typeof selected==='object'&&selected?selected:null;
  function safeHref(v){try{const u=new URL(String(v||''),location.origin);return u.protocol==='https:'||u.origin===location.origin?u.href:''}catch{return ''}}
  function externalHref(v){try{const u=new URL(String(v||''));return u.protocol==='https:'?u.href:''}catch{return ''}}
  function dateText(v){if(!v)return '';const d=new Date(v);if(Number.isNaN(d.getTime()))return '';try{return new Intl.DateTimeFormat('th-TH',{year:'numeric',month:'short',day:'numeric'}).format(d)}catch{return ''}}
  function stars(n){const x=Math.max(1,Math.min(5,Number(n)||5));return '★★★★★'.slice(0,x)+'☆☆☆☆☆'.slice(0,5-x)}
  function sourceLabel(source){return source?.shopName?`${source.shopName} • ${source.platform||'TikTok Shop'}`:'Koonchaishop • TikTok Shop'}
  async function fetchFeed(productId=0){
    const key=String(Number(productId)||0),hit=state.cache.get(key);
    if(hit&&now()-hit.at<60000)return hit.data;
    if(hit?.promise)return hit.promise;
    const url=`/api/koonchaishop-feed?limit=${productId?8:10}${productId?`&productId=${encodeURIComponent(productId)}`:''}`;
    const promise=fetch(url,{credentials:'same-origin',headers:{Accept:'application/json'}}).then(async r=>{if(!r.ok)throw new Error(`source_feed_${r.status}`);const d=await r.json();const data={source:d?.source||{},assets:Array.isArray(d?.assets)?d.assets:[],reviews:Array.isArray(d?.reviews)?d.reviews:[],databaseReady:d?.databaseReady!==false};state.cache.set(key,{at:now(),data});return data}).catch(()=>{const data={source:{shopName:'Koonchaishop',platform:'TikTok Shop'},assets:[],reviews:[],databaseReady:false};state.cache.set(key,{at:now(),data});return data});
    state.cache.set(key,{at:hit?.at||0,data:hit?.data,promise});
    return promise;
  }
  function assetMedia(asset){
    const media=safeHref(asset?.mediaUrl),poster=safeHref(asset?.posterUrl),type=String(asset?.type||'').toLowerCase(),title=esc(asset?.title||'สื่อจาก Koonchaishop');
    const imageLike=type==='image'||/\.(?:png|jpe?g|webp|gif|avif)(?:$|\?)/i.test(media);
    const directVideo=/\.(?:mp4|webm)(?:$|\?)/i.test(media);
    if(media&&imageLike)return `<img src="${esc(media)}" alt="${title}" loading="lazy" decoding="async">`;
    if(media&&directVideo)return `<video src="${esc(media)}" ${poster?`poster="${esc(poster)}"`:''} controls playsinline preload="metadata" aria-label="${title}"></video>`;
    if(poster)return `<img src="${esc(poster)}" alt="${title}" loading="lazy" decoding="async">`;
    return `<div class="kch-source-media-fallback"><span class="material-symbols-rounded">smart_display</span><b>ดูสื่อต้นฉบับจาก TikTok Shop</b></div>`;
  }
  function assetCard(asset,source){
    const p=localProduct(asset?.productId),src=externalHref(asset?.sourceUrl),title=asset?.title||p?.name||'สื่อจาก Koonchaishop',caption=asset?.caption||'',shop=sourceLabel(source);
    return `<article class="kch-source-card" data-kch-source-asset="${Number(asset?.id)||0}"><div class="kch-source-media">${assetMedia(asset)}<span class="kch-source-origin"><span class="material-symbols-rounded">storefront</span>${esc(shop)}</span></div><div class="kch-source-card-copy"><h3>${esc(title)}</h3>${caption?`<p>${esc(caption)}</p>`:''}<div class="kch-source-actions">${p?`<button type="button" class="primary" data-kch-source-product="${Number(p.id)}"><span class="material-symbols-rounded">shopping_bag</span>ดูสินค้า</button>`:''}${src?`<a href="${esc(src)}" target="_blank" rel="noopener noreferrer nofollow"><span class="material-symbols-rounded">open_in_new</span>ดูต้นฉบับ</a>`:''}</div></div></article>`;
  }
  function reviewMedia(review){const rows=Array.isArray(review?.media)?review.media:[];if(!rows.length)return '';const imgs=rows.map(x=>safeHref(x)).filter(Boolean).slice(0,4);if(!imgs.length)return '';return `<div class="kch-source-review-media">${imgs.map((src,i)=>`<img src="${esc(src)}" alt="ภาพประกอบรีวิว ${i+1}" loading="lazy" decoding="async">`).join('')}</div>`}
  function reviewCard(review,source){
    const dt=dateText(review?.createdAt),shop=sourceLabel(source),p=localProduct(review?.productId),body=review?.body||'';
    return `<article class="kch-source-review" data-kch-source-review="${Number(review?.id)||0}" data-source-verified="${review?.sourceVerified?'1':'0'}"><div class="kch-source-review-top"><div class="kch-source-review-author"><b>${esc(review?.author||'ผู้รีวิวบน TikTok Shop')}</b><small>${esc(shop)}${p?` • ${esc(p.name)}`:''}</small></div><span class="kch-source-stars" aria-label="${Number(review?.rating)||5} ดาว">${stars(review?.rating)}</span></div>${body?`<p>${esc(body)}</p>`:''}${reviewMedia(review)}<div class="kch-source-review-foot"><span><span class="material-symbols-rounded">language</span>รีวิวจากแหล่งข้อมูลภายนอก</span>${dt?`<span><span class="material-symbols-rounded">calendar_month</span>${esc(dt)}</span>`:''}</div></article>`;
  }
  function disclosure(source){return `<div class="kch-source-disclosure"><span class="material-symbols-rounded">info</span><span>${esc(source?.disclosure||'สื่อและรีวิวจากร้าน Koonchaishop บน TikTok Shop')} เป็นข้อมูลจากแหล่งภายนอก ไม่ใช่สถานะ “ผู้ซื้อที่ยืนยันแล้ว” ของเว็บไซต์ KHONCHAIHERB</span></div>`}
  function sectionShell(data,{pdp=false}={}){
    const assets=data.assets.slice(0,pdp?6:8),reviews=data.reviews.slice(0,pdp?4:3),count=assets.length+reviews.length;if(!count)return '';
    const title=pdp?'ดูประสบการณ์และสื่อจาก Koonchaishop':'จาก Koonchaishop บน TikTok Shop';
    const sub=pdp?'สื่อและรีวิวที่เชื่อมกับสินค้านี้ ช่วยให้ดูข้อมูลประกอบก่อนตัดสินใจสั่งซื้อ':'สื่อและรีวิวที่ร้านนำเข้าจากแหล่งต้นทาง พร้อมระบุที่มาอย่างชัดเจน';
    return `<div class="kch-source-head"><div><span class="kch-source-kicker"><span class="material-symbols-rounded">verified</span>Source-aware social proof</span><h2>${title}</h2><p>${sub}</p></div><div class="kch-source-summary"><div><b>${assets.length}</b><small>สื่อที่แสดง</small></div><div><b>${reviews.length}</b><small>รีวิวที่แสดง</small></div></div></div>${disclosure(data.source)}<div class="kch-source-grid"><div class="kch-source-assets"><div class="kch-source-subhead"><b>สื่อจากร้าน</b><small>เปิดต้นฉบับได้เมื่อมีลิงก์</small></div>${assets.length?`<div class="kch-source-rail">${assets.map(x=>assetCard(x,data.source)).join('')}</div>`:'<div class="kch-source-empty">ยังไม่มีสื่อที่เผยแพร่สำหรับส่วนนี้</div>'}</div><div class="kch-source-reviews"><div class="kch-source-subhead"><b>เสียงจากลูกค้าบน TikTok Shop</b><small>แยกจากรีวิวบนเว็บไซต์</small></div>${reviews.length?`<div class="kch-source-review-list">${reviews.map(x=>reviewCard(x,data.source)).join('')}</div>`:'<div class="kch-source-empty">ยังไม่มีรีวิวจากแหล่งนี้ที่เผยแพร่</div>'}</div></div>`;
  }
  function bindSection(root){if(!root||root.dataset.kchSourceBound==='1')return;root.dataset.kchSourceBound='1';root.addEventListener('click',e=>{const b=e.target.closest('[data-kch-source-product]');if(!b)return;const p=localProduct(b.dataset.kchSourceProduct);if(p&&typeof product==='function')product(p)});}
  function placeHome(section){const shopFirst=$('.v118-shop-first');if(shopFirst){shopFirst.insertAdjacentElement('afterend',section);return}const story=$('.v118-brand-story');if(story){story.insertAdjacentElement('beforebegin',section);return}const grid=$('#product-grid');if(grid){grid.parentElement?.insertAdjacentElement('afterend',section);return}const shell=$('.shell');shell?.appendChild(section)}
  async function enhanceHome(){
    if(currentView()!=='home'){$('#kch-koonchaishop-home')?.remove();return}
    if($('#kch-koonchaishop-home'))return;
    const marker=$('#product-grid');if(!marker)return;
    const data=await fetchFeed(0);if(currentView()!=='home')return;if(!data.assets.length&&!data.reviews.length)return;
    const section=document.createElement('section');section.id='kch-koonchaishop-home';section.className='kch-source-section kch-source-home';section.setAttribute('aria-label','สื่อและรีวิวจาก Koonchaishop บน TikTok Shop');section.innerHTML=sectionShell(data);bindSection(section);placeHome(section);
  }
  function placePdp(section){const pdp=$('.tshop-pdp');if(!pdp)return;const recommend=pdp.querySelector(':scope > .v115-pdp-recommend-zone');if(recommend){pdp.insertBefore(section,recommend);return}const layout=pdp.querySelector(':scope > .v115-pdp-layout');if(layout){layout.insertAdjacentElement('afterend',section);return}pdp.appendChild(section)}
  function ensurePdpChip(data,productId){const price=$('.tshop-pdp .pdp-price-block');if(!price)return;let chip=price.querySelector('.kch-source-pdp-chip');if(chip&&Number(chip.dataset.productId)===Number(productId))return;chip?.remove();chip=document.createElement('button');chip.type='button';chip.className='kch-source-pdp-chip';chip.dataset.productId=String(productId);chip.innerHTML=`<span class="material-symbols-rounded">forum</span><span><b>มีข้อมูลประกอบจาก Koonchaishop</b><small>${data.assets.length} สื่อ • ${data.reviews.length} รีวิวจาก TikTok Shop</small></span>`;chip.addEventListener('click',()=>$('#kch-koonchaishop-pdp')?.scrollIntoView({behavior:'smooth',block:'start'}));price.appendChild(chip)}
  async function enhancePdp(){
    if(currentView()!=='product'){$('#kch-koonchaishop-pdp')?.remove();$('.kch-source-pdp-chip')?.remove();state.lastProductId=0;return}
    const p=activeProduct(),productId=Number(p?.id)||0;if(!productId)return;
    const existing=$('#kch-koonchaishop-pdp');if(existing&&Number(existing.dataset.productId)===productId)return;
    existing?.remove();$('.kch-source-pdp-chip')?.remove();
    const data=await fetchFeed(productId);if(currentView()!=='product'||Number(activeProduct()?.id)!==productId)return;if(!data.assets.length&&!data.reviews.length)return;
    const section=document.createElement('section');section.id='kch-koonchaishop-pdp';section.className='kch-source-section kch-source-pdp';section.dataset.productId=String(productId);section.setAttribute('aria-label','สื่อและรีวิวจาก Koonchaishop สำหรับสินค้านี้');section.innerHTML=sectionShell(data,{pdp:true});bindSection(section);placePdp(section);ensurePdpChip(data,productId);state.lastProductId=productId;
  }
  function enhance(){const view=currentView();if(view!==state.lastView){state.lastView=view;if(view!=='home')$('#kch-koonchaishop-home')?.remove();if(view!=='product'){$('#kch-koonchaishop-pdp')?.remove();$('.kch-source-pdp-chip')?.remove()}}enhanceHome();enhancePdp()}
  function schedule(){if(state.frame)return;state.frame=requestAnimationFrame(()=>{state.frame=0;enhance()})}
  const app=$('#app');if(app)new MutationObserver(()=>queueMicrotask(schedule)).observe(app,{childList:true,subtree:true});
  window.addEventListener('focus',()=>{state.cache.clear();schedule()});window.addEventListener('resize',schedule,{passive:true});window.addEventListener('pageshow',schedule);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();setTimeout(schedule,80);setTimeout(schedule,350);
  window.__KCH_KOONCHAISHOP_COMMERCE__={build:BUILD,refresh:()=>{state.cache.clear();schedule()},state};
})();
