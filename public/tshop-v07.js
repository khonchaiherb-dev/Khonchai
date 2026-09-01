/* KHONCHAIHERB Commerce v0.7 — growth engine, wishlist, LIVE reminder, verified media reviews */
const V07_WISH_KEY='kch-wishlist';
const V07_RECENT_KEY='kch-recent-products';
const V07_REMINDER_KEY='kch-live-reminders';
let V07_PROMOTIONS=[];
let V07_WISHLIST=new Set(readJson(V07_WISH_KEY,[]).map(Number).filter(Boolean));
let V07_RECENT=readJson(V07_RECENT_KEY,[]).map(Number).filter(Boolean).slice(0,20);
let V07_REMINDERS=readJson(V07_REMINDER_KEY,[]);
const v07SaveWish=()=>writeJson(V07_WISH_KEY,[...V07_WISHLIST]);
const v07SaveRecent=()=>writeJson(V07_RECENT_KEY,V07_RECENT.slice(0,20));
const v07SaveReminders=()=>writeJson(V07_REMINDER_KEY,V07_REMINDERS);
const v07FmtDate=s=>{if(!s)return 'รอประกาศเวลา';try{return new Intl.DateTimeFormat('th-TH',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Bangkok'}).format(new Date(s))}catch{return s}};
function v07RememberProduct(id){id=Number(id);if(!id)return;V07_RECENT=[id,...V07_RECENT.filter(x=>x!==id)].slice(0,20);v07SaveRecent()}
function v07ToggleWish(id){id=Number(id);if(!id)return false;V07_WISHLIST.has(id)?V07_WISHLIST.delete(id):V07_WISHLIST.add(id);v07SaveWish();v07ApplyWishState();toast(V07_WISHLIST.has(id)?'เพิ่มในรายการโปรดแล้ว':'นำออกจากรายการโปรดแล้ว');return V07_WISHLIST.has(id)}
function v07WishButton(id,cls=''){const on=V07_WISHLIST.has(Number(id));return `<button class="v07-wish ${cls} ${on?'active':''}" data-v07-wish="${Number(id)}" aria-label="${on?'นำออกจากรายการโปรด':'เพิ่มในรายการโปรด'}">${I('favorite')}</button>`}
function v07ApplyWishState(){
  document.querySelectorAll('[data-v07-wish]').forEach(b=>{const on=V07_WISHLIST.has(Number(b.dataset.v07Wish));b.classList.toggle('active',on);b.setAttribute('aria-label',on?'นำออกจากรายการโปรด':'เพิ่มในรายการโปรด')});
  document.querySelectorAll('[data-favorite]').forEach(b=>{const on=V07_WISHLIST.has(Number(b.dataset.favorite));b.classList.toggle('v07-favorite-on',on)});
}
function v07DecorateProductCards(){
  document.querySelectorAll('.tshop-card').forEach(card=>{if(card.querySelector('.v07-wish'))return;const slug=card.dataset.product,p=PRODUCTS.find(x=>x.slug===slug);if(!p)return;card.insertAdjacentHTML('afterbegin',v07WishButton(p.id,'card-heart'))});
}
async function v07HydratePromotions(){
  try{const d=await api('/api/promotions');V07_PROMOTIONS=Array.isArray(d.promotions)?d.promotions:[]}catch{V07_PROMOTIONS=[]}
  if(current==='home')v07MountPromotionRail();
  if(current==='checkout')v07MountCheckoutPromotion();
}
function v07PromoText(p){const d=p.type==='percent'?`${Number(p.value)}%`:`${M(p.value)}`;return `${p.name||p.code} • ลด ${d}${p.maxDiscount?` สูงสุด ${M(p.maxDiscount)}`:''} • ขั้นต่ำ ${M(p.minSpend||0)}`}
function v07MountPromotionRail(){
  if(!V07_PROMOTIONS.length||document.querySelector('.v07-promo-rail'))return;
  const anchor=document.querySelector('#vouchers')||document.querySelector('.voucher-rail')||document.querySelector('#live');
  const html=`<section class="v07-promo-rail"><div class="v07-promo-head"><span>${I('local_fire_department')}</span><div><b>ดีลอัตโนมัติจากร้าน</b><small>ระบบเลือกโปรที่เข้าเงื่อนไขให้ตอนสั่งซื้อ</small></div></div><div class="v07-promo-scroll">${V07_PROMOTIONS.map(p=>`<div class="v07-promo-card"><b>${esc(p.name||p.code)}</b><span>${p.type==='percent'?`ลด ${Number(p.value)}%`:`ลด ${M(p.value)}`}</span><small>ขั้นต่ำ ${M(p.minSpend||0)}${p.stackWithCoupon?' • ใช้ร่วมคูปองได้':''}</small></div>`).join('')}</div></section>`;
  if(anchor)anchor.insertAdjacentHTML('beforebegin',html);
}
function v07MountCheckoutPromotion(){
  const target=document.querySelector('.server-total-note');if(!target||document.querySelector('.v07-checkout-promo'))return;
  const eligible=V07_PROMOTIONS.filter(p=>subtotal()>=Number(p.minSpend||0)&&(!activeCoupon||p.stackWithCoupon));
  target.insertAdjacentHTML('beforebegin',`<div class="v07-checkout-promo">${I('sell')}<div><b>โปรอัตโนมัติ</b><small>${eligible.length?`มี ${eligible.length} โปรที่อาจเข้าเงื่อนไข • เซิร์ฟเวอร์จะเลือกโปรที่คุ้มที่สุดให้`:'ระบบจะตรวจโปรที่ใช้งานได้อีกครั้งก่อนสร้างออเดอร์'}</small></div></div>`);
}
function v07RankProducts(q){
  const t=String(q||'').trim().toLowerCase(),tokens=t.split(/\s+/).filter(Boolean);
  return PRODUCTS.map(p=>{const name=String(p.name||'').toLowerCase(),cat=String(p.cat||'').toLowerCase(),desc=String(p.desc||'').toLowerCase(),sku=String(p.sku||'').toLowerCase();let score=0;
    for(const x of tokens){if(name===x)score+=100;if(name.startsWith(x))score+=60;if(name.includes(x))score+=42;if(cat.includes(x))score+=25;if(desc.includes(x))score+=12;if(sku.includes(x))score+=20}
    if(V07_WISHLIST.has(Number(p.id)))score+=6;if(V07_RECENT.includes(Number(p.id)))score+=4;
    score+=Number(p.featured||0)*8+Number(p.rating||0)*3+Math.min(20,Number(p.sold||0)/150)+(p.stock>0?5:-1000);
    return {p,score}
  }).filter(x=>!tokens.length||x.score>0).sort((a,b)=>b.score-a.score||Number(b.p.sold)-Number(a.p.sold)).map(x=>x.p)
}
const v07SearchBase=typeof runTShopSearch==='function'?runTShopSearch:null;
runTShopSearch=function(q){
  const term=String(q||'').trim();if(!term){home();return}
  if(current!=='home')home();
  const list=v07RankProducts(term),grid=document.querySelector('#product-grid'),head=document.querySelector('.recommend-head');
  if(head)head.textContent=`ผลการค้นหา “${term}”`;
  if(grid)grid.innerHTML=list.length?list.map(tshopCard).join(''):`<div class="empty search-empty"><h2>ไม่พบสินค้าที่ตรงกับคำค้น</h2><p>ลองใช้ชื่อสินค้า หมวด หรือคำที่สั้นลง</p></div>`;
  v07DecorateProductCards();v07ApplyWishState();if(typeof v06Track==='function')v06Track('search',{source:'shop'});
};
function v07FallbackRecommendations(p,limit=4){
  return PRODUCTS.filter(x=>x.id!==p.id&&x.stock>0).map(x=>{let s=(x.cat===p.cat?40:0)+Number(x.rating||0)*4+Math.min(25,Number(x.sold||0)/100)+(V07_WISHLIST.has(x.id)?6:0)+(V07_RECENT.includes(x.id)?5:0);return {x,s}}).sort((a,b)=>b.s-a.s).slice(0,limit).map(x=>x.x)
}
async function v07MountRecommendations(p){
  if(current!=='product'||selected?.id!==p.id||document.querySelector('.v07-recommend-block'))return;
  let list=[];try{const d=await api(`/api/recommendations?productId=${p.id}&category=${encodeURIComponent(p.cat||'')}&limit=4`);list=(d.products||[]).map(x=>normalizeProduct({id:x.id,slug:x.slug,sku:x.sku,name:x.name,description:x.description,category:x.category,price:x.price,compare_at_price:x.compareAtPrice,rating:x.rating,sold_count:x.soldCount,stock:x.stock,featured:x.featured}))}catch{}
  if(!list.length)list=v07FallbackRecommendations(p,4);
  const anchor=document.querySelector('.recommend-head');if(anchor&&list.length)anchor.insertAdjacentHTML('beforebegin',`<section class="pdp-block v07-recommend-block"><div class="v07-block-head"><b>คัดมาให้คุณ</b><span>เรียงจากความเกี่ยวข้องและความนิยม</span></div><div class="v07-mini-rec">${list.map(x=>`<button data-product="${esc(x.slug)}">${visual(x)}<span><b>${esc(x.name)}</b><strong>${M(x.price)}</strong><small>⭐ ${Number(x.rating||0).toFixed(1)} • ขายแล้ว ${v05Fmt(x.sold||0)}</small></span></button>`).join('')}</div></section>`);
  bind();v07DecorateProductCards();
}
async function v07MountReviews(p){
  const block=[...document.querySelectorAll('.pdp-block')].find(x=>x.querySelector('.pdp-review-top'));if(!block)return;
  try{
    const d=await api(`/api/reviews?productId=${p.id}&limit=8`),s=d.summary||{},reviews=d.reviews||[];
    const count=Number(s.count||0),average=count>0?`${Number(s.average||0).toFixed(1)} ★`:'ยังไม่มีคะแนน';
    block.innerHTML=`<div class="pdp-review-top"><b>คะแนนและรีวิวจากผู้ซื้อจริง (${count})</b><span>${average}</span></div><div class="v07-review-actions"><button data-v07-review="${p.id}">${I('rate_review')} เขียนรีวิว</button><span>รีวิวจากคำสั่งซื้อที่จัดส่งสำเร็จเท่านั้น</span></div>${reviews.length?`<div class="v07-review-list">${reviews.map(r=>`<article class="v07-review"><div><b>${esc(r.buyer)}</b>${r.verifiedPurchase?'<span class="v07-verified">ซื้อจริง</span>':''}</div><div class="stars">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</div><p>${esc(r.body||'')}</p>${r.media?.length?`<div class="v07-review-media">${r.media.map(m=>m.type==='video'?`<video src="${esc(m.url)}" controls playsinline preload="metadata"></video>`:`<img src="${esc(m.url)}" alt="ภาพรีวิว" loading="lazy">`).join('')}</div>`:''}<small>${esc(r.createdAt||'')}</small></article>`).join('')}</div>`:`<div class="v07-no-review">ยังไม่มีรีวิวจากผู้ซื้อจริงสำหรับสินค้านี้</div>`}`;
    bind();
  }catch{block.innerHTML='<div class="pdp-review-top"><b>คะแนนและรีวิวจากผู้ซื้อจริง</b></div><div class="v07-no-review">ยังไม่สามารถโหลดรีวิวที่ยืนยันแล้วได้ในขณะนี้</div>'}
}
function v07ReviewModal(productId){
  const p=PRODUCTS.find(x=>x.id===Number(productId));if(!p)return;
  modal(`<div class="v07-review-modal"><h2>รีวิว ${esc(p.name)}</h2><p>ใช้เลขคำสั่งซื้อและเบอร์โทรของออเดอร์ที่จัดส่งสำเร็จแล้ว</p><div class="v07-review-form"><label>เลขคำสั่งซื้อ<input id="v07-review-order" placeholder="KCH..."></label><label>เบอร์โทร<input id="v07-review-phone" inputmode="tel" placeholder="08X-XXX-XXXX"></label><label>คะแนน<select id="v07-review-rating"><option value="5">5 ★ ดีมาก</option><option value="4">4 ★ ดี</option><option value="3">3 ★ ปานกลาง</option><option value="2">2 ★ ควรปรับปรุง</option><option value="1">1 ★ ไม่พอใจ</option></select></label><label>ความคิดเห็น<textarea id="v07-review-body" maxlength="1500" placeholder="เล่าประสบการณ์เกี่ยวกับสินค้า การแพ็ก หรือการจัดส่ง"></textarea></label><label>ภาพ/วิดีโอ (ไม่เกิน 4 ไฟล์)<input id="v07-review-files" type="file" multiple accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"><small>ภาพไม่เกิน 6 MB • วิดีโอไม่เกิน 12 MB ต่อไฟล์</small></label><div id="v07-review-error" class="form-error"></div><button class="primary" data-v07-review-submit="${p.id}">ส่งรีวิว</button><button class="secondary" data-close-modal>ยกเลิก</button></div></div>`);
}
async function v07SubmitReview(productId){
  const q=s=>document.querySelector(s),orderNo=q('#v07-review-order')?.value.trim()||'',phone=q('#v07-review-phone')?.value.trim()||'',rating=Number(q('#v07-review-rating')?.value||5),body=q('#v07-review-body')?.value.trim()||'',files=[...(q('#v07-review-files')?.files||[])].slice(0,4),err=q('#v07-review-error'),btn=document.querySelector('[data-v07-review-submit]');
  if(!orderNo||phone.replace(/\D/g,'').length<9){if(err)err.textContent='กรุณากรอกเลขคำสั่งซื้อและเบอร์โทร';return}
  if(btn){btn.disabled=true;btn.textContent='กำลังส่งรีวิว...'}if(err)err.textContent='';
  const media=[];
  try{
    for(const file of files){const fd=new FormData();fd.append('orderNo',orderNo);fd.append('phone',phone);fd.append('productId',String(productId));fd.append('file',file);const r=await fetch('/api/review-media',{method:'POST',body:fd});const d=await r.json().catch(()=>({}));if(!r.ok){if(d.error==='media_storage_not_bound')throw new Error('พื้นที่ภาพ/วิดีโอยังไม่ได้เชื่อม R2 บน Cloudflare');throw new Error('อัปโหลดภาพ/วิดีโอไม่สำเร็จ')}media.push(d.objectKey)}
    await api('/api/reviews',{method:'POST',body:JSON.stringify({orderNo,phone,productId,rating,body,media})});document.querySelector('#kch-modal')?.remove();toast('ขอบคุณสำหรับรีวิว');const p=PRODUCTS.find(x=>x.id===Number(productId));if(p)v07MountReviews(p)
  }catch(e){if(err)err.textContent=e.data?.error==='review_not_available_yet'?'รีวิวได้หลังจัดส่งสำเร็จแล้ว':e.data?.error==='review_already_submitted'?'ออเดอร์นี้รีวิวสินค้านี้แล้ว':e.message||'ส่งรีวิวไม่สำเร็จ';if(btn){btn.disabled=false;btn.textContent='ส่งรีวิว'}}
}
function v07ReminderFor(id){return V07_REMINDERS.find(x=>Number(x.contentId)===Number(id))}
async function v07ToggleReminder(id){
  const x=v05Content(id);if(!x)return;const hit=v07ReminderFor(id);
  if(hit){V07_REMINDERS=V07_REMINDERS.filter(r=>Number(r.contentId)!==Number(id));v07SaveReminders();toast('ยกเลิกการเตือนแล้ว')}
  else{V07_REMINDERS.push({contentId:Number(id),title:x.title,startsAt:x.startsAt||null,notified:false,createdAt:new Date().toISOString()});v07SaveReminders();toast('บันทึก LIVE ไว้แล้ว');if('Notification'in window&&Notification.permission==='default'){Notification.requestPermission().catch(()=>{})}}
  v07DecorateLiveReminders();
}
function v07DecorateLiveReminders(){
  document.querySelectorAll('[data-live-room]').forEach(tile=>{const id=Number(tile.dataset.liveRoom),x=v05Content(id);if(!x||x.status!=='scheduled')return;let b=tile.querySelector('[data-v07-remind]');if(!b){b=document.createElement('button');b.className='v07-remind-btn';b.dataset.v07Remind=String(id);tile.querySelector('.v05-live-info')?.appendChild(b)}const on=Boolean(v07ReminderFor(id));b.innerHTML=`${I(on?'notifications_active':'notifications')} ${on?'เตือนแล้ว':'เตือนฉัน'}`;b.classList.toggle('active',on)});
  if(current==='live-room'&&V06_ACTIVE_CONTENT_ID){const x=v05Content(V06_ACTIVE_CONTENT_ID);if(x?.status==='scheduled'){let b=document.querySelector('.v07-room-remind');if(!b){b=document.createElement('button');b.className='v07-room-remind';b.dataset.v07Remind=String(x.id);document.querySelector('.v05-live-copy')?.appendChild(b)}const on=Boolean(v07ReminderFor(x.id));b.innerHTML=`${I(on?'notifications_active':'notifications')} ${on?'ตั้งเตือนแล้ว':'เตือนฉันก่อน LIVE'}`;b.classList.toggle('active',on)}}
}
function v07CheckReminders(){
  let dirty=false;for(const r of V07_REMINDERS){if(r.notified||!r.startsAt)continue;const ms=new Date(r.startsAt).getTime()-Date.now();if(ms<=15*60*1000&&ms>-60*60*1000){r.notified=true;dirty=true;toast(`LIVE ใกล้เริ่ม: ${r.title}`);if('Notification'in window&&Notification.permission==='granted'){new Notification('KHONCHAIHERB LIVE',{body:`${r.title} กำลังจะเริ่ม`,tag:`kch-live-${r.contentId}`})}}}if(dirty)v07SaveReminders()
}
function v07MountAccountGrowth(){
  const menu=document.querySelector('.acctmenu');if(!menu)return;
  const wish=[...V07_WISHLIST].map(id=>PRODUCTS.find(p=>p.id===id)).filter(Boolean);
  const reminders=V07_REMINDERS.map(r=>({...r,content:v05Content(r.contentId)}));
  menu.insertAdjacentHTML('beforebegin',`<section class="acctcard v07-account-card"><div class="head"><h3>รายการโปรด</h3><b>${wish.length}</b></div>${wish.length?`<div class="v07-wish-list">${wish.slice(0,6).map(p=>`<button data-product="${esc(p.slug)}">${visual(p)}<span><b>${esc(p.name)}</b><strong>${M(p.price)}</strong></span>${I('chevron_right')}</button>`).join('')}</div>`:'<p class="sub">กดหัวใจที่สินค้าเพื่อเก็บไว้ดูภายหลัง</p>'}</section><section class="acctcard v07-account-card"><div class="head"><h3>LIVE ที่ตั้งเตือน</h3><b>${reminders.length}</b></div>${reminders.length?reminders.map(r=>`<button class="v07-reminder-row" data-live-room="${r.contentId}">${I('live_tv')}<span><b>${esc(r.title)}</b><small>${v07FmtDate(r.startsAt||r.content?.startsAt)}</small></span>${I('chevron_right')}</button>`).join(''):'<p class="sub">ยังไม่มี LIVE ที่ตั้งเตือน</p>'}</section>`);
  bind();bindV05();
}
function v07MountSellerGrowth(data){
  const main=document.querySelector('.sellerMain'),anchor=document.querySelector('.v06-social-analytics')||main?.querySelector('.tablecard');if(!main||!anchor||document.querySelector('.v07-growth-admin'))return;
  const r=data.reviews||{};anchor.insertAdjacentHTML('afterend',`<section class="v07-growth-admin"><div class="head"><div><h3>Growth Engine</h3><span class="sub">โปรโมชันอัตโนมัติและ Verified Reviews</span></div></div><div class="v07-growth-metrics"><div><b>${Number(r.average||0).toFixed(1)} ★</b><span>คะแนนรีวิวเฉลี่ย</span></div><div><b>${v05Fmt(r.verified||0)}</b><span>Verified Reviews</span></div><div><b>${v05Fmt(r.media||0)}</b><span>ภาพ/วิดีโอรีวิว</span></div></div><div class="v07-promo-admin">${(data.promotions||[]).map(p=>`<div><span><b>${esc(p.name)}</b><small>${esc(p.code)} • ใช้ ${v05Fmt(p.redemptions)} ครั้ง</small></span><strong>-${M(p.discountTotal||0)}</strong></div>`).join('')||'<p class="sub">ยังไม่มีการใช้โปรโมชัน</p>'}</div></section>`);
}
const v07HomeBase=home;
home=function(){v07HomeBase();v07MountPromotionRail();v07DecorateProductCards();v07ApplyWishState()};
const v07ProductBase=product;
product=function(p){v07RememberProduct(p.id);v07ProductBase(p);const fav=document.querySelector(`[data-favorite="${p.id}"]`);if(fav){fav.dataset.v07Wish=String(p.id);delete fav.dataset.favorite}v07ApplyWishState();setTimeout(()=>{v07MountRecommendations(p);v07MountReviews(p)},0)};
const v07CheckoutBase=checkout;
checkout=function(){v07CheckoutBase();setTimeout(v07MountCheckoutPromotion,0)};
const v07AccountBase=account;
account=function(){v07AccountBase();v07MountAccountGrowth();v07ApplyWishState()};
const v07LivePageBase=livePage;
livePage=function(){v07LivePageBase();v07DecorateLiveReminders()};
const v07LiveRoomBase=liveRoom;
liveRoom=function(id){v07LiveRoomBase(id);v07DecorateLiveReminders()};
const v07SellerBase=sellerDashboard;
sellerDashboard=async function(token){await v07SellerBase(token);try{const d=await api('/api/admin/growth-analytics',{headers:{Authorization:`Bearer ${token}`}});v07MountSellerGrowth(d)}catch{}};

function v07BindGlobal(){
  if(window.__v07Bound)return;window.__v07Bound=true;
  document.addEventListener('click',e=>{
    const wish=e.target.closest('[data-v07-wish]');if(wish){e.preventDefault();e.stopPropagation();v07ToggleWish(wish.dataset.v07Wish);return}
    const remind=e.target.closest('[data-v07-remind]');if(remind){e.preventDefault();e.stopPropagation();v07ToggleReminder(remind.dataset.v07Remind);return}
    const review=e.target.closest('[data-v07-review]');if(review){e.preventDefault();v07ReviewModal(review.dataset.v07Review);return}
    const submit=e.target.closest('[data-v07-review-submit]');if(submit){e.preventDefault();v07SubmitReview(Number(submit.dataset.v07ReviewSubmit));return}
  },true);
}
v07BindGlobal();
v07HydratePromotions();
v07CheckReminders();
clearInterval(window.__v07ReminderTimer);window.__v07ReminderTimer=setInterval(v07CheckReminders,60000);
