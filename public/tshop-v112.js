/* KHONCHAIHERB Commerce v1.12 — post-purchase conversion, review reward, aftercare recommendations */
const V112_REWARD_KEY='kch-review-rewards-v1';
let V112_REWARDS=(()=>{try{const x=JSON.parse(localStorage.getItem(V112_REWARD_KEY)||'[]');return Array.isArray(x)?x:[]}catch{return []}})();
const v112SaveRewards=()=>localStorage.setItem(V112_REWARD_KEY,JSON.stringify(V112_REWARDS));
const v112RewardActive=r=>!r?.expiresAt||new Date(r.expiresAt).getTime()>Date.now();
function v112HydrateRewardCoupons(){
  V112_REWARDS=V112_REWARDS.filter(v112RewardActive);v112SaveRewards();
  for(const r of V112_REWARDS){
    if(!COUPONS.some(c=>c.code===r.code))COUPONS.push({code:r.code,type:r.type||'fixed',value:Number(r.value||0),min_spend:Number(r.minSpend||0),max_discount:r.maxDiscount==null?Number(r.value||0):Number(r.maxDiscount),new_customer_only:0,label:'คูปองขอบคุณสำหรับรีวิว'});
    if(!claimed.includes(r.code))claimed.push(r.code);
  }
  saveCoupons();
}
function v112StoreReward(r){
  if(!r?.code)return null;const reward={code:String(r.code).toUpperCase(),type:r.type||'fixed',value:Number(r.value||0),minSpend:Number(r.minSpend||0),maxDiscount:r.maxDiscount==null?Number(r.value||0):Number(r.maxDiscount),expiresAt:r.expiresAt||null};
  V112_REWARDS=[reward,...V112_REWARDS.filter(x=>x.code!==reward.code)].slice(0,20);v112SaveRewards();v112HydrateRewardCoupons();return reward;
}
const v112PreviewBase=previewDiscount;
previewDiscount=function(sum){const r=V112_REWARDS.find(x=>x.code===activeCoupon&&v112RewardActive(x));if(!r)return v112PreviewBase(sum);if(Number(sum)<Number(r.minSpend||0))return 0;return Math.max(0,Math.min(Number(r.value||0),Number(sum)||0))};

const v112NormalizeItemBase=v19NormalizeItem;
v19NormalizeItem=function(i){const x=v112NormalizeItemBase(i);return {...x,reviewed:Boolean(Number(i?.reviewed??x.reviewed??0))}};
function v112Delivered(o){const f=String(o?.fulfillmentStatus||o?.fulfillment_status||'').toLowerCase(),s=String(o?.status||'').toLowerCase();return s!=='cancelled'&&(f==='delivered'||s==='completed')}
function v112UniqueItems(o){const m=new Map();for(const raw of o?.items||[]){const i=v19NormalizeItem(raw),id=Number(i.id||i.product_id||0);if(!id)continue;const prev=m.get(id);if(!prev)m.set(id,i);else if(i.reviewed)prev.reviewed=true}return [...m.values()]}
function v112Reviewable(o){return v112Delivered(o)?v112UniqueItems(o):[]}
function v112AftercareHtml(o){
  if(!v112Delivered(o))return '';
  const no=v19OrderNo(o),phone=v19OrderPhone(o),items=v112Reviewable(o),pending=items.filter(i=>!i.reviewed);
  return `<section class="v112-aftercare"><div class="v112-aftercare-head"><div>${I('redeem')}<span><b>ได้รับสินค้าแล้ว</b><small>ซื้อซ้ำ รีวิวสินค้า และดูสินค้าที่เหมาะกับออเดอร์นี้ได้จากที่นี่</small></span></div><button class="primary" data-v19-reorder="${esc(no)}">ซื้อซ้ำ 1 แตะ</button></div><div class="v112-review-list"><div class="v112-section-title"><b>รีวิวสินค้าที่ได้รับ</b><span>${pending.length?`เหลือ ${pending.length} รายการ`:'รีวิวครบแล้ว'}</span></div>${items.map(i=>`<div class="v112-review-row"><span><b>${esc(i.name)}</b>${i.optionValue?`<small>${esc(v19VariantText(i))}</small>`:''}</span><button data-v112-review="${Number(i.id||i.product_id)}" data-v112-order="${esc(no)}" data-v112-phone="${esc(phone)}" ${i.reviewed?'disabled':''}>${i.reviewed?`${I('check_circle')} รีวิวแล้ว`:`${I('rate_review')} รีวิว`}</button></div>`).join('')||'<p class="sub">ยังไม่มีรายการสำหรับรีวิว</p>'}</div><div class="v112-recommend-wrap"><div class="v112-section-title"><b>น่าจะเหมาะกับคุณ</b><span>แนะนำจากออเดอร์นี้</span></div><div data-v112-recommendations="${esc(no)}" class="v112-recommendations"><div class="v112-rec-loading">${I('progress_activity')} กำลังคัดสินค้า...</div></div></div></section>`;
}

const v112OrderCardBase=v19OrderCard;
v19OrderCard=function(o){
  let html=v112OrderCardBase(o);if(!v112Delivered(o))return html;
  html=html.replace('class="order v19-order','class="order v19-order v112-delivered');
  html=html.replace('>ซื้ออีกครั้ง</button>','>ซื้อซ้ำ 1 แตะ</button>');
  const unreviewed=v112Reviewable(o).some(i=>!i.reviewed),marker='<div class="orderactions">';
  if(unreviewed&&html.includes(marker))html=html.replace(marker,`${marker}<button class="v112-review-order" data-v19-order-detail="${esc(v19OrderNo(o))}">${I('rate_review')} รีวิวสินค้า</button>`);
  return html;
};
const v112DetailBase=v19DetailHtml;
v19DetailHtml=function(o){const html=v112DetailBase(o),after=v112AftercareHtml(o),marker='<div class="v19-detail-actions">';return after&&html.includes(marker)?html.replace(marker,`${after}${marker}`):`${html}${after}`};

function v112FallbackRecommendations(o,limit=4){
  const bought=new Set(v112UniqueItems(o).map(i=>Number(i.id||i.product_id))),cats=new Set([...bought].map(id=>PRODUCTS.find(p=>Number(p.id)===id)?.cat).filter(Boolean));
  return PRODUCTS.filter(p=>p.stock>0&&!bought.has(Number(p.id))).map(p=>({p,score:(cats.has(p.cat)?40:0)+Number(p.rating||0)*5+Math.min(30,Number(p.sold||0)/100)+(p.featured?10:0)})).sort((a,b)=>b.score-a.score).slice(0,limit).map(x=>x.p);
}
async function v112MountRecommendations(o){
  if(!v112Delivered(o))return;const host=document.querySelector('[data-v112-recommendations]');if(!host)return;
  const first=v112UniqueItems(o)[0],productId=Number(first?.id||first?.product_id||0),p=PRODUCTS.find(x=>Number(x.id)===productId);let list=[];
  if(productId){try{const d=await api(`/api/recommendations?productId=${productId}&category=${encodeURIComponent(p?.cat||'')}&limit=4`);list=(d.products||[]).map(x=>normalizeProduct({id:x.id,slug:x.slug,sku:x.sku,name:x.name,description:x.description,category:x.category,price:x.price,compare_at_price:x.compareAtPrice,rating:x.rating,sold_count:x.soldCount,stock:x.stock,featured:x.featured}))}catch{}}
  if(!list.length)list=v112FallbackRecommendations(o,4);
  host.innerHTML=list.length?list.map(x=>`<button data-v112-rec-product="${esc(x.slug)}">${visual(x)}<span><b>${esc(x.name)}</b><strong>${M(x.price)}</strong><small>⭐ ${Number(x.rating||0).toFixed(1)} • ขายแล้ว ${Number(x.sold||0).toLocaleString('th-TH')}</small></span></button>`).join(''):'<p class="sub">ยังไม่มีสินค้าแนะนำเพิ่มเติมในขณะนี้</p>';
}
const v112OpenDetailBase=v19OpenDetail;
v19OpenDetail=async function(no){await v112OpenDetailBase(no);const o=v19FindOrder(no);if(o)v112MountRecommendations(o)};

function v112OpenReview(productId,orderNo,phone){
  if(typeof v07ReviewModal!=='function'){toast('ระบบรีวิวยังไม่พร้อม');return}v07ReviewModal(productId);
  const a=document.querySelector('#v07-review-order'),p=document.querySelector('#v07-review-phone');if(a)a.value=orderNo||'';if(p)p.value=phone||'';
}
function v112MarkReviewed(orderNo,productId){
  const mark=o=>{if(String(o.orderNo||o.order_no)!==String(orderNo))return;for(const i of o.items||[]){if(Number(i.id||i.product_id)===Number(productId))i.reviewed=true}};
  V19_ORDER_CACHE.forEach(mark);ordersLocal.forEach(mark);saveOrders();
}
function v112RewardModal(reward){
  modal(`<div class="v112-reward-modal"><div class="v112-reward-icon">${I('redeem')}</div><h2>ขอบคุณสำหรับรีวิว</h2><p>รับคูปองสำหรับการสั่งซื้อครั้งถัดไป</p><div class="v112-reward-ticket"><span>ส่วนลด</span><b>${M(reward.value)}</b><small>เมื่อซื้อขั้นต่ำ ${M(reward.minSpend||0)}</small><code>${esc(reward.code)}</code>${reward.expiresAt?`<small>ใช้ได้ถึง ${esc(new Date(reward.expiresAt).toLocaleDateString('th-TH'))}</small>`:''}</div><button class="primary" data-v112-use-reward="${esc(reward.code)}">ใช้คูปองกับการซื้อครั้งถัดไป</button><button class="secondary" data-close-modal>เก็บไว้ก่อน</button></div>`);
}
v07SubmitReview=async function(productId){
  const q=s=>document.querySelector(s),orderNo=q('#v07-review-order')?.value.trim()||'',phone=q('#v07-review-phone')?.value.trim()||'',rating=Number(q('#v07-review-rating')?.value||5),body=q('#v07-review-body')?.value.trim()||'',files=[...(q('#v07-review-files')?.files||[])].slice(0,4),err=q('#v07-review-error'),btn=document.querySelector('[data-v07-review-submit]');
  if(!orderNo||phone.replace(/\D/g,'').length<9){if(err)err.textContent='กรุณากรอกเลขคำสั่งซื้อและเบอร์โทร';return}
  if(btn){btn.disabled=true;btn.textContent='กำลังส่งรีวิว...'}if(err)err.textContent='';const media=[];
  try{
    for(const file of files){const fd=new FormData();fd.append('orderNo',orderNo);fd.append('phone',phone);fd.append('productId',String(productId));fd.append('file',file);const r=await fetch('/api/review-media',{method:'POST',body:fd}),d=await r.json().catch(()=>({}));if(!r.ok){if(d.error==='media_storage_not_bound')throw new Error('พื้นที่ภาพ/วิดีโอยังไม่ได้เชื่อม R2 บน Cloudflare');throw new Error('อัปโหลดภาพ/วิดีโอไม่สำเร็จ')}media.push(d.objectKey)}
    const d=await api('/api/reviews',{method:'POST',body:JSON.stringify({orderNo,phone,productId,rating,body,media})});v112MarkReviewed(orderNo,productId);document.querySelector('#kch-modal')?.remove();const reward=v112StoreReward(d.rewardCoupon);if(reward)v112RewardModal(reward);else toast('ขอบคุณสำหรับรีวิว');const p=PRODUCTS.find(x=>Number(x.id)===Number(productId));if(p&&current==='product')v07MountReviews(p)
  }catch(e){if(err)err.textContent=e.data?.error==='review_not_available_yet'?'รีวิวได้หลังจัดส่งสำเร็จแล้ว':e.data?.error==='review_already_submitted'?'ออเดอร์นี้รีวิวสินค้านี้แล้ว':e.message||'ส่งรีวิวไม่สำเร็จ';if(btn){btn.disabled=false;btn.textContent='ส่งรีวิว'}}
};

function bindV112(){v112HydrateRewardCoupons()}
const v112BindBase=typeof bind==='function'?bind:null;
bind=function(){if(v112BindBase)v112BindBase();bindV112()};
document.addEventListener('click',e=>{
  const review=e.target.closest?.('[data-v112-review]');if(review){e.preventDefault();v112OpenReview(Number(review.dataset.v112Review),review.dataset.v112Order||'',review.dataset.v112Phone||'');return}
  const rec=e.target.closest?.('[data-v112-rec-product]');if(rec){e.preventDefault();document.querySelector('#kch-modal')?.remove();const p=PRODUCTS.find(x=>x.slug===rec.dataset.v112RecProduct);if(p)product(p);return}
  const reward=e.target.closest?.('[data-v112-use-reward]');if(reward){e.preventDefault();activeCoupon=reward.dataset.v112UseReward;localStorage.setItem('kch-active-coupon',activeCoupon);document.querySelector('#kch-modal')?.remove();toast('เลือกคูปองรีวิวแล้ว');cart.length?cartPage():home();return}
},true);
v112HydrateRewardCoupons();
window.__KCH_V112_AFTERCARE_HELPERS__={delivered:v112Delivered,uniqueItems:v112UniqueItems,reviewable:v112Reviewable,fallbackRecommendations:v112FallbackRecommendations,storeReward:v112StoreReward};
