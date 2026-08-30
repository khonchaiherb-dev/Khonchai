/* KHONCHAIHERB Commerce v0.6 — attribution, privacy-safe analytics, media lifecycle */
const V06_ATTR_KEY='kch-social-attribution';
const V06_ATTR_TTL=30*60*1000;
let V06_ACTIVE_CONTENT_ID=null;
function v06ReadAttr(){try{const a=JSON.parse(sessionStorage.getItem(V06_ATTR_KEY)||'null');if(!a||!a.touchedAt||Date.now()-a.touchedAt>V06_ATTR_TTL)return null;return a}catch{return null}}
function v06SetAttr(next={}){const prev=v06ReadAttr()||{};const a={source:next.source||prev.source||'shop',creatorId:next.creatorId??prev.creatorId??null,contentId:next.contentId??prev.contentId??null,touchedAt:Date.now()};try{sessionStorage.setItem(V06_ATTR_KEY,JSON.stringify(a))}catch{}return a}
function v06CurrentAttr(){return v06ReadAttr()||{source:'shop',creatorId:null,contentId:null,touchedAt:Date.now()}}
function v06ClearAttr(){try{sessionStorage.removeItem(V06_ATTR_KEY)}catch{}}
function v06Track(eventType,extra={}){const a={...v06CurrentAttr(),...extra};const body={eventType,source:a.source||'shop',creatorId:a.creatorId||null,contentId:a.contentId||null,productId:a.productId||null};fetch('/api/commerce-event',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),keepalive:true}).catch(()=>{})}

const v06LiveRoomBase=liveRoom;
liveRoom=function(contentId){const x=v05Content(contentId);V06_ACTIVE_CONTENT_ID=Number(contentId)||null;const a=v06SetAttr({source:'live',contentId:V06_ACTIVE_CONTENT_ID,creatorId:x?.creatorId||null});v06Track('content_view',a);v06LiveRoomBase(contentId)};
const v06CreatorPageBase=creatorPage;
creatorPage=function(id){const c=v05Creator(id);v06SetAttr({source:'creator',creatorId:Number(c?.id)||null,contentId:null});v06Track('creator_view',{source:'creator',creatorId:Number(c?.id)||null,contentId:null});v06CreatorPageBase(id)};
const v06VideoPageBase=videoPage;
videoPage=function(){V06_ACTIVE_CONTENT_ID=null;v06VideoPageBase();setTimeout(v06InitVideoObserver,0)};

function v06InitVideoObserver(){
  try{window.__v06VideoObserver?.disconnect()}catch{}
  const slides=[...document.querySelectorAll('.v05-video-slide')];if(!slides.length)return;
  window.__v06VideoObserver=new IntersectionObserver(entries=>{
    for(const entry of entries){const slide=entry.target,video=slide.querySelector('video'),id=Number(slide.dataset.videoId),x=v05Content(id);
      if(entry.isIntersecting&&entry.intersectionRatio>=.7){V06_ACTIVE_CONTENT_ID=id;v06SetAttr({source:'video',contentId:id,creatorId:x?.creatorId||null});if(!slide.dataset.analyticsViewed){slide.dataset.analyticsViewed='1';v06Track('content_view',{source:'video',contentId:id,creatorId:x?.creatorId||null})}if(video)video.play().catch(()=>{})}else if(video){video.pause()}
    }
  },{threshold:[0,.35,.7,1]});
  slides.forEach(s=>window.__v06VideoObserver.observe(s));
}

function v06SourceLabel(a=v06CurrentAttr()){return a.source==='live'?'LIVE':a.source==='video'?'วิดีโอ':a.source==='creator'?'Creator Showcase':a.source==='shop'?'หน้าร้าน':'โดยตรง'}
function v06MountCheckoutSource(){const a=v06CurrentAttr();if(!['live','video','creator'].includes(a.source))return;const form=document.querySelector('.checkout-form');if(!form||document.querySelector('.v06-source-note'))return;form.insertAdjacentHTML('afterend',`<div class="v06-source-note">${I(a.source==='live'?'live_tv':a.source==='video'?'play_circle':'person')}<div><b>ดีลที่คุณค้นพบจาก ${v06SourceLabel(a)}</b><small>ระบบจะใช้แหล่งที่มาเพื่อวัดผลยอดขายของคอนเทนต์ โดยไม่บันทึกข้อมูลส่วนบุคคลลงใน analytics</small></div></div>`)}
const v06CheckoutBase=checkout;
checkout=function(){if(cart.length)v06Track('checkout_start');v06CheckoutBase();setTimeout(v06MountCheckoutSource,0)};

placeOrder=async function(){
  const el=id=>document.querySelector(id),name=el('#customer-name')?.value.trim()||'',phone=el('#customer-phone')?.value.trim()||'',addressLine=el('#customer-address')?.value.trim()||'',district=el('#customer-district')?.value.trim()||'',province=el('#customer-province')?.value.trim()||'',postalCode=el('#customer-postal')?.value.trim()||'',pay=document.querySelector('input[name=pay]:checked')?.value||'COD',marketingConsent=Boolean(el('#marketing-consent')?.checked),err=el('#checkout-error');
  if(name.length<2||phone.replace(/\D/g,'').length<9||addressLine.length<5||district.length<2||province.length<2||!/^[0-9]{5}$/.test(postalCode)){if(err)err.textContent='กรุณากรอกชื่อ โทรศัพท์ ที่อยู่ อำเภอ/เขต จังหวัด และรหัสไปรษณีย์ให้ครบ';return}
  if(err)err.textContent='';const btn=document.querySelector('[data-place]');if(btn){btn.disabled=true;btn.textContent='กำลังยืนยันราคาและสร้างคำสั่งซื้อ...'}
  const attribution=v06CurrentAttr();
  const payload={idempotencyKey:checkoutKey,customerName:name,phone,marketingConsent,address:{addressLine,district,province,postalCode},paymentMethod:pay,couponCode:activeCoupon,items:cart.map(x=>({id:x.id,qty:x.qty})),attribution:{source:attribution.source,creatorId:attribution.creatorId,contentId:attribution.contentId}};
  try{const data=await api('/api/orders',{method:'POST',body:JSON.stringify(payload)});const record={orderNo:data.orderNo,total:Number(data.total||0),subtotal:Number(data.subtotal||0),discount:Number(data.discount||0),shipping:Number(data.shipping||0),paymentMethod:pay,paymentStatus:data.paymentStatus||'unpaid',status:data.status||'pending',fulfillmentStatus:data.fulfillmentStatus||'pending',createdAt:new Date().toISOString(),phone,source:data.attribution?.source||attribution.source,items:cart.map(x=>({id:x.id,name:x.name,qty:x.qty,price:x.price}))};ordersLocal=ordersLocal.filter(o=>o.orderNo!==record.orderNo);ordersLocal.unshift(record);saveOrders();cart=[];save();checkoutKey='';v06ClearAttr();success(record)}catch(e){if(err)err.textContent=orderErrorMessage(e);if(btn){btn.disabled=false;btn.textContent='สั่งซื้อสินค้า'}}
};

function v06BindGlobal(){
  if(window.__v06GlobalBound)return;window.__v06GlobalBound=true;
  document.addEventListener('click',e=>{
    const pin=e.target.closest('[data-product-drawer]');
    if(pin){const productId=Number(pin.dataset.productDrawer),slide=pin.closest('[data-video-id]');if(slide){const id=Number(slide.dataset.videoId),x=v05Content(id);v06SetAttr({source:'video',contentId:id,creatorId:x?.creatorId||null});v06Track('product_pin_click',{source:'video',contentId:id,creatorId:x?.creatorId||null,productId})}else if(current==='live-room'&&V06_ACTIVE_CONTENT_ID){const x=v05Content(V06_ACTIVE_CONTENT_ID);v06SetAttr({source:'live',contentId:V06_ACTIVE_CONTENT_ID,creatorId:x?.creatorId||null});v06Track('product_pin_click',{source:'live',contentId:V06_ACTIVE_CONTENT_ID,creatorId:x?.creatorId||null,productId})}}
    const addBtn=e.target.closest('[data-add],[data-v05-drawer-add]');if(addBtn){const id=Number(addBtn.dataset.add||addBtn.dataset.v05DrawerAdd);v06Track('add_to_cart',{productId:id})}
    const productEl=e.target.closest('[data-product]');if(productEl&&!pin&&!['video','live-room','creator'].includes(current)){v06SetAttr({source:'shop',creatorId:null,contentId:null})}
  },true);
}

const v06SellerDashboardBase=sellerDashboard;
sellerDashboard=async function(token){
  app.innerHTML=`<div class="seller-loading">${I('progress_activity')} กำลังโหลด Seller Center...</div>`;
  try{const [d,o,s]=await Promise.all([api('/api/admin/dashboard',{headers:{Authorization:`Bearer ${token}`}}),api('/api/admin/orders?limit=8',{headers:{Authorization:`Bearer ${token}`}}),api('/api/admin/social-analytics',{headers:{Authorization:`Bearer ${token}`}}).catch(()=>null)]);renderSeller(d,o.orders||[]);if(s)v06RenderSocialAnalytics(s)}catch{sessionStorage.removeItem('kch-admin-token');sellerLogin();const err=document.querySelector('#admin-error');if(err)err.textContent='เซสชันหมดอายุหรือยังไม่ได้ตั้งค่า ADMIN_TOKEN บน Cloudflare'}
};
function v06RenderSocialAnalytics(s){const main=document.querySelector('.sellerMain'),anchor=main?.querySelector('.sellerGrid');if(!main||!anchor)return;const f=s.funnel||{},maxSource=Math.max(1,...(s.sources||[]).map(x=>Number(x.revenue||0)));anchor.insertAdjacentHTML('afterend',`<section class="v06-social-analytics"><div class="head"><div><h3>Social Commerce • 30 วัน</h3><span class="sub">วัดจากเหตุการณ์รวม ไม่เก็บชื่อ เบอร์โทร ที่อยู่ หรือ IP ใน analytics</span></div></div><div class="v06-funnel"><div><b>${v05Fmt(f.contentViews||0)}</b><span>ดูคอนเทนต์</span></div><i>›</i><div><b>${v05Fmt(f.productClicks||0)}</b><span>แตะสินค้า</span></div><i>›</i><div><b>${v05Fmt(f.addsToCart||0)}</b><span>เพิ่มตะกร้า</span></div><i>›</i><div><b>${v05Fmt(f.checkoutStarts||0)}</b><span>Checkout</span></div><i>›</i><div><b>${v05Fmt(f.purchases||0)}</b><span>ออเดอร์</span></div></div><div class="v06-analytics-grid"><div><h4>ยอดขายตามช่องทาง</h4>${(s.sources||[]).map(x=>`<div class="v06-source-row"><span>${esc(x.source||'direct')}</span><div><i style="width:${Math.max(4,Math.round(Number(x.revenue||0)/maxSource*100))}%"></i></div><b>${M(x.revenue||0)}</b><small>${v05Fmt(x.orders||0)} ออเดอร์</small></div>`).join('')||'<p class="sub">ยังไม่มีข้อมูล</p>'}</div><div><h4>Creator / Showcase</h4>${(s.creators||[]).slice(0,5).map(x=>`<div class="v06-creator-sale"><span><b>${esc(x.name)}</b><small>@${esc(x.handle)}</small></span><strong>${M(x.revenue||0)}</strong><small>${v05Fmt(x.orders||0)} ออเดอร์</small></div>`).join('')||'<p class="sub">ยังไม่มีข้อมูล</p>'}</div></div></section>`)}

v06BindGlobal();
setTimeout(()=>{if(current==='video')v06InitVideoObserver()},0);
