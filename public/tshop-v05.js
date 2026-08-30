/* KHONCHAIHERB Commerce v0.5 — LIVE, vertical video, creator showcase, order center */
const V05_SOCIAL_FALLBACK = {
  creators: [
    {id:1,handle:'khonchaiherb.official',displayName:'KHONCHAIHERB Official',bio:'ร้านทางการและทีมดูแลสินค้า',avatar:'K',followers:12800,rating:4.9,productIds:[1,3,6]},
    {id:2,handle:'khonchaiherb.live',displayName:'KHONCHAIHERB LIVE',bio:'ไลฟ์แนะนำสินค้าและดีลจากร้าน',avatar:'LIVE',followers:6400,rating:4.9,productIds:[1,2,4]},
    {id:3,handle:'khonchaiherb.guide',displayName:'Herbal Product Guide',bio:'คอนเทนต์แนะนำการเลือกผลิตภัณฑ์ของแบรนด์',avatar:'HG',followers:3900,rating:4.8,productIds:[2,5,6]}
  ],
  contents: [
    {id:1,creatorId:2,type:'live',title:'LIVE ดีลสมุนไพรขายดี',caption:'รวมสินค้าขายดีและคูปองช่วง LIVE',status:'live',viewers:1280,likes:940,productIds:[1,2,4]},
    {id:2,creatorId:1,type:'video',title:'เลือกชารางจืดให้เหมาะกับคุณ',caption:'ดูรายละเอียดสินค้าและดีลจากร้านทางการ',status:'published',viewers:18400,likes:2800,productIds:[1]},
    {id:3,creatorId:3,type:'video',title:'บาล์มสมุนไพรและลูกประคบ ต่างกันอย่างไร',caption:'เปรียบเทียบรูปแบบสินค้าเพื่อเลือกซื้อได้ง่ายขึ้น',status:'published',viewers:9200,likes:1100,productIds:[2,5]},
    {id:4,creatorId:2,type:'live',title:'LIVE Gift Set & โปรของขวัญ',caption:'ดูชุดของขวัญและโปรจากร้าน',status:'scheduled',viewers:0,likes:0,productIds:[3,6]},
    {id:5,creatorId:1,type:'video',title:'จัด Gift Set แบบพรีเมียม',caption:'ไอเดียเลือกชุดของขวัญจาก KHONCHAIHERB',status:'published',viewers:7600,likes:860,productIds:[6,3]}
  ]
};
let V05_SOCIAL = JSON.parse(JSON.stringify(V05_SOCIAL_FALLBACK));
let v05OrderFilter = 'all';
const v05Fmt = n => new Intl.NumberFormat('th-TH').format(Number(n)||0);
const v05Creator = id => V05_SOCIAL.creators.find(x=>Number(x.id)===Number(id)) || V05_SOCIAL.creators[0];
const v05Content = id => V05_SOCIAL.contents.find(x=>Number(x.id)===Number(id));
const v05Product = id => PRODUCTS.find(x=>Number(x.id)===Number(id)) || PRODUCTS[0];

const chromeV04 = chrome;
chrome = function(body,active=current){
  const shopActive=['home','product','cart','checkout','creator'].includes(active);
  const dark=['video','live-room'].includes(active);
  return `<div class="shell v05-shell ${dark?'v05-dark-shell':''}">
    ${dark?'':`<header class="topbar tshop-topbar v05-topbar">
      <div class="tshop-searchbox">${I('search')}<input id="global-shop-search" placeholder="ค้นหาใน KHONCHAIHERB Shop" aria-label="ค้นหาสินค้า"><button data-focus-search>ค้นหา</button></div>
      <div class="tshop-top-actions">
        <button class="tshop-icon" data-go="orders" aria-label="คำสั่งซื้อ">${I('receipt_long')}</button>
        <button class="tshop-icon" data-go="cart" aria-label="ตะกร้า">${I('shopping_cart')}<i class="badge">${count()}</i></button>
      </div>
    </header>`}
    ${body}
    <nav class="tshop-bottom v05-bottom ${dark?'on-dark':''}">
      <button data-go="home" class="${shopActive?'active':''}">${I('storefront')}<span>Shop</span></button>
      <button data-v05-nav="live" class="${active==='live'||active==='live-room'?'active':''}">${I('live_tv')}<span>LIVE</span></button>
      <button data-v05-nav="video" class="v05-video-nav ${active==='video'?'active':''}">${I('play_circle')}<span>วิดีโอ</span></button>
      <button data-go="orders" class="${active==='orders'?'active':''}">${I('local_shipping')}<span>ออเดอร์</span></button>
      <button data-go="account" class="${active==='account'?'active':''}">${I('person')}<span>ฉัน</span></button>
    </nav>
  </div>`;
};

const homeV04 = home;
home = function(){
  homeV04();
  mountV05CreatorRail();
  bindV05();
};

const productV04 = product;
product = function(p){
  productV04(p);
  bindV05();
};

function v05CreatorRailHtml(){
  return `<section class="tshop-section v05-creator-section">
    <div class="tshop-section-head"><h2>Creator Showcase</h2><button data-v05-nav="video">ดูคอนเทนต์ ›</button></div>
    <div class="v05-creator-rail">
      ${V05_SOCIAL.creators.map(c=>`<button class="v05-creator-card" data-creator="${c.id}">
        <span class="v05-creator-avatar">${esc(c.avatar||'K')}</span>
        <span><b>${esc(c.displayName)}</b><small>@${esc(c.handle)}</small><small>${v05Fmt(c.followers)} ผู้ติดตาม</small></span>
      </button>`).join('')}
    </div>
  </section>`;
}
function mountV05CreatorRail(){
  if(current!=='home'||document.querySelector('.v05-creator-section')) return;
  const anchor=document.querySelector('.category-strip') || document.querySelector('#recommend');
  if(anchor) anchor.insertAdjacentHTML('beforebegin',v05CreatorRailHtml());
}

async function hydrateV05Social(){
  try{
    const data=await api('/api/social-feed');
    if(Array.isArray(data.creators)&&data.creators.length && Array.isArray(data.contents)){
      V05_SOCIAL={
        creators:data.creators.map(c=>({
          id:Number(c.id),handle:c.handle||'',displayName:c.displayName||c.display_name||c.handle||'Creator',
          bio:c.bio||'',avatar:c.avatar||c.avatar_url||'K',followers:Number(c.followers??c.follower_count??0),
          rating:Number(c.rating??5),productIds:(c.products||[]).map(p=>Number(p.id||p.product_id)).filter(Boolean)
        })),
        contents:data.contents.map(x=>({
          id:Number(x.id),creatorId:Number(x.creatorId??x.creator_id),type:x.type||x.content_type,
          title:x.title||'',caption:x.caption||'',status:x.status||'published',
          viewers:Number(x.viewers??x.viewer_count??0),likes:Number(x.likes??x.like_count??0),
          mediaUrl:x.mediaUrl||x.media_url||'',posterUrl:x.posterUrl||x.poster_url||'',
          startsAt:x.startsAt||x.starts_at||'',productIds:(x.products||[]).map(p=>Number(p.id||p.product_id)).filter(Boolean)
        }))
      };
    }
  }catch{}
  if(current==='home'){mountV05CreatorRail()}
}

function livePage(){
  current='live';
  const lives=V05_SOCIAL.contents.filter(x=>x.type==='live');
  app.innerHTML=chrome(`<main class="v05-live-page">
    <div class="v05-page-head"><div><span class="v05-live-dot"></span><b>LIVE Shopping</b><small>ดูสินค้าและดีลจากร้านในรูปแบบไลฟ์</small></div><button data-go="cart">${I('shopping_cart')}<i class="badge">${count()}</i></button></div>
    <div class="v05-live-featured">
      ${lives.map((x,i)=>{const c=v05Creator(x.creatorId),p=v05Product(x.productIds[0]);return `<article class="v05-live-tile ${i===0?'featured':''}" data-live-room="${x.id}">
        <div class="v05-live-stage"><span class="live-tag">${x.status==='live'?'LIVE':'เร็ว ๆ นี้'}</span><span class="live-viewers">${x.status==='live'?`${v05Fmt(x.viewers)} กำลังดู`:'ตั้งเตือน'}</span><div class="v05-stage-art">${p.emoji||'🌿'}</div><div class="v05-live-product"><span>${esc(p.name)}</span><b>${M(p.price)}</b></div></div>
        <div class="v05-live-info"><b>${esc(x.title)}</b><small>${esc(c.displayName)} • @${esc(c.handle)}</small><p>${esc(x.caption)}</p></div>
      </article>`}).join('')}
    </div>
    <section class="v05-live-products"><div class="tshop-section-head"><h2>สินค้าที่กำลังถูกพูดถึง</h2><button data-go="home">ดูร้าน ›</button></div><div class="tshop-grid">${PRODUCTS.slice(0,4).map(tshopCard).join('')}</div></section>
  </main>`,'live');
  bind();
  bindV05();
}

function liveRoom(contentId){
  const x=v05Content(contentId); if(!x){livePage();return}
  current='live-room';
  const c=v05Creator(x.creatorId), ps=x.productIds.map(v05Product).filter(Boolean);
  const main=ps[0]||PRODUCTS[0];
  app.innerHTML=chrome(`<main class="v05-live-room">
    <div class="v05-live-room-stage">
      <div class="v05-live-room-top"><button data-v05-nav="live">${I('arrow_back')}</button><div class="v05-room-creator"><span class="v05-creator-avatar">${esc(c.avatar||'K')}</span><span><b>${esc(c.displayName)}</b><small>${x.status==='live'?`${v05Fmt(x.viewers)} กำลังดู`:'LIVE ที่กำหนดไว้'}</small></span></div><button data-go="cart">${I('shopping_cart')}<i class="badge">${count()}</i></button></div>
      <div class="v05-live-visual"><div class="v05-live-orb">${main.emoji||'🌿'}</div><span class="v05-live-status">${x.status==='live'?'LIVE':'SCHEDULED'}</span></div>
      <div class="v05-live-copy"><h1>${esc(x.title)}</h1><p>${esc(x.caption)}</p></div>
      <div class="v05-live-actions"><button>${I('favorite')}<span>${v05Fmt(x.likes)}</span></button><button>${I('share')}<span>แชร์</span></button></div>
      <div class="v05-live-input">${I('chat_bubble')}<span>ถามเกี่ยวกับสินค้า...</span></div>
    </div>
    <div class="v05-live-tray"><div class="v05-tray-head"><b>${I('shopping_bag')} สินค้าใน LIVE</b><span>${ps.length} รายการ</span></div>${ps.map(p=>`<button class="v05-tray-product" data-product-drawer="${p.id}">${visual(p)}<span><b>${esc(p.name)}</b><small>ร้านทางการ • ${p.stock>0?'พร้อมสั่ง':'สินค้าหมด'}</small><strong>${M(p.price)}</strong></span><i>${I('add_shopping_cart')}</i></button>`).join('')}</div>
  </main>`,'live-room');
  bind();
  bindV05();
}

function videoPage(){
  current='video';
  const videos=V05_SOCIAL.contents.filter(x=>x.type==='video' && x.status==='published');
  app.innerHTML=chrome(`<main class="v05-video-page">
    <div class="v05-video-top"><button data-go="home">${I('arrow_back')}</button><b>สำหรับคุณ</b><button data-go="cart">${I('shopping_cart')}<i class="badge">${count()}</i></button></div>
    <div class="v05-video-scroller">${videos.map((x,i)=>v05VideoSlide(x,i)).join('')}</div>
  </main>`,'video');
  bind();
  bindV05();
}
function v05VideoSlide(x,i){
  const c=v05Creator(x.creatorId),p=v05Product(x.productIds[0]);
  const bg=i%3===0?'forest':i%3===1?'warm':'sage';
  return `<section class="v05-video-slide ${bg}" data-video-id="${x.id}">
    <div class="v05-video-visual">${x.mediaUrl?`<video src="${esc(x.mediaUrl)}" playsinline muted loop preload="metadata"></video>`:`<div class="v05-video-art">${p.emoji||'🌿'}<span>${I('play_arrow')}</span></div>`}</div>
    <div class="v05-video-side">
      <button data-local-like="${x.id}">${I('favorite')}<span>${v05Fmt(x.likes)}</span></button>
      <button>${I('chat_bubble')}<span>สินค้า</span></button>
      <button>${I('share')}<span>แชร์</span></button>
    </div>
    <div class="v05-video-overlay">
      <button class="v05-video-creator" data-creator="${c.id}"><span class="v05-creator-avatar">${esc(c.avatar||'K')}</span><span><b>${esc(c.displayName)}</b><small>@${esc(c.handle)}</small></span><i>ดูโปรไฟล์</i></button>
      <h2>${esc(x.title)}</h2><p>${esc(x.caption)}</p>
      <button class="v05-product-pin" data-product-drawer="${p.id}">${visual(p)}<span><small>สินค้าในวิดีโอ</small><b>${esc(p.name)}</b><strong>${M(p.price)}</strong></span><i>${I('chevron_right')}</i></button>
    </div>
  </section>`;
}

function creatorPage(id){
  const c=v05Creator(id);
  current='creator';
  const products=(c.productIds||[]).map(v05Product).filter(Boolean);
  const contents=V05_SOCIAL.contents.filter(x=>Number(x.creatorId)===Number(c.id));
  app.innerHTML=chrome(`<main class="v05-creator-page">
    <section class="v05-creator-hero"><span class="v05-creator-avatar big">${esc(c.avatar||'K')}</span><div><h1>${esc(c.displayName)}</h1><p>@${esc(c.handle)}</p><small>${esc(c.bio)}</small></div></section>
    <section class="v05-creator-stats"><div><b>${v05Fmt(c.followers)}</b><span>ผู้ติดตาม</span></div><div><b>${Number(c.rating||5).toFixed(1)}</b><span>คะแนน</span></div><div><b>${products.length}</b><span>สินค้าแนะนำ</span></div></section>
    <div class="v05-creator-tabs"><button class="active">Showcase</button><button data-v05-nav="video">วิดีโอ</button></div>
    <div class="recommend-head">สินค้าใน Showcase</div><section class="tshop-grid">${products.length?products.map(tshopCard).join(''):'<div class="empty"><p>ยังไม่มีสินค้าใน Showcase</p></div>'}</section>
    <section class="tshop-section"><div class="tshop-section-head"><h2>คอนเทนต์ล่าสุด</h2></div><div class="v05-content-mini">${contents.map(x=>`<button data-${x.type==='live'?'live-room':'video-open'}="${x.id}"><span>${x.type==='live'?I('live_tv'):I('play_circle')}</span><b>${esc(x.title)}</b><small>${x.type==='live'?x.status:v05Fmt(x.viewers)+' วิว'}</small></button>`).join('')}</div></section>
  </main>`,'creator');
  bind();
  bindV05();
}

function openV05ProductDrawer(productId){
  const p=v05Product(productId); if(!p) return;
  document.querySelector('#v05-product-drawer')?.remove();
  const el=document.createElement('div');
  el.id='v05-product-drawer';el.className='v05-drawer-wrap';
  el.innerHTML=`<div class="v05-drawer-backdrop" data-close-v05-drawer></div><section class="v05-product-drawer">
    <div class="v05-drawer-handle"></div>
    <button class="v05-drawer-close" data-close-v05-drawer>${I('close')}</button>
    <div class="v05-drawer-product">${visual(p,'large')}<div><span class="shop-badge">Official</span><h2>${esc(p.name)}</h2><p>${esc(p.desc)}</p><div class="v05-drawer-meta"><span>⭐ ${p.rating.toFixed(1)}</span><span>ขายแล้ว ${v05Fmt(p.sold)}</span><span>คงเหลือ ${p.stock}</span></div><strong>${M(p.price)}</strong></div></div>
    <div class="v05-drawer-actions"><button class="pdp-add" data-v05-drawer-add="${p.id}" ${p.stock<=0?'disabled':''}>เพิ่มลงตะกร้า</button><button class="pdp-buy" data-v05-drawer-buy="${p.id}" ${p.stock<=0?'disabled':''}>${p.stock>0?'ซื้อเลย':'สินค้าหมด'}</button></div>
  </section>`;
  document.body.appendChild(el);
}

function v05OrderBucket(o){
  const f=o.fulfillmentStatus||o.fulfillment_status||'pending', p=o.paymentStatus||o.payment_status||'unpaid', s=o.status||'pending';
  if(s==='cancelled') return 'cancelled';
  if(['shipping','shipped'].includes(f)) return 'shipping';
  if(['delivered','completed'].includes(f)||s==='completed') return 'completed';
  if(['pending','packing'].includes(f)) return 'packing';
  if(p==='unpaid') return 'unpaid';
  return 'all';
}
function v05OrderTabs(){
  const defs=[['all','ทั้งหมด'],['unpaid','รอชำระ'],['packing','เตรียมส่ง'],['shipping','กำลังส่ง'],['completed','สำเร็จ']];
  return defs.map(([k,label])=>`<button data-order-filter="${k}" class="${v05OrderFilter===k?'active':''}">${label}<span>${k==='all'?ordersLocal.length:ordersLocal.filter(o=>v05OrderBucket(o)===k).length}</span></button>`).join('');
}
const ordersV03=orders;
orders=function(){
  current='orders';
  const filtered=v05OrderFilter==='all'?ordersLocal:ordersLocal.filter(o=>v05OrderBucket(o)===v05OrderFilter);
  app.innerHTML=chrome(`<main class="v05-order-center">
    <div class="v05-order-head"><div><h1>คำสั่งซื้อของฉัน</h1><p>ติดตามทุกขั้นตอนตั้งแต่สั่งซื้อจนรับสินค้า</p></div><button data-lookup-focus>${I('search')}</button></div>
    <div class="v05-order-tabs">${v05OrderTabs()}</div>
    <div id="orders-list" class="v05-order-list">${filtered.length?filtered.map(orderCard).join(''):`<div class="empty">${I('inventory_2')}<h2>ไม่มีคำสั่งซื้อในสถานะนี้</h2><button class="primary" data-go="home">เลือกซื้อสินค้า</button></div>`}</div>
    <section class="lookup-box v05-lookup"><h3>ค้นหาคำสั่งซื้ออื่น</h3><p>ใช้เลขคำสั่งซื้อและเบอร์โทรที่ใช้สั่งซื้อ</p><div class="lookup-grid"><input id="lookup-order" placeholder="เลขคำสั่งซื้อ KCH..."><input id="lookup-phone" inputmode="tel" placeholder="เบอร์โทร"><button class="primary" data-lookup-order>ค้นหา</button></div><div id="lookup-result"></div></section>
  </main>`,'orders');
  bind();
  bindV05();
};

function bindV05(){
  document.querySelectorAll('[data-v05-nav]').forEach(el=>{el.onclick=e=>{e.preventDefault();const dest=el.dataset.v05Nav;if(dest==='live')livePage();if(dest==='video')videoPage()}});
  document.querySelectorAll('[data-live-room]').forEach(el=>el.onclick=e=>{e.preventDefault();liveRoom(Number(el.dataset.liveRoom))});
  document.querySelectorAll('[data-video-open]').forEach(el=>el.onclick=e=>{e.preventDefault();videoPage();setTimeout(()=>document.querySelector(`[data-video-id="${el.dataset.videoOpen}"]`)?.scrollIntoView(),0)});
  document.querySelectorAll('[data-creator]').forEach(el=>el.onclick=e=>{e.preventDefault();creatorPage(Number(el.dataset.creator))});
  document.querySelectorAll('[data-product-drawer]').forEach(el=>el.onclick=e=>{e.preventDefault();e.stopPropagation();openV05ProductDrawer(Number(el.dataset.productDrawer))});
  document.querySelectorAll('[data-order-filter]').forEach(el=>el.onclick=e=>{e.preventDefault();v05OrderFilter=el.dataset.orderFilter;orders()});
  document.querySelectorAll('[data-lookup-focus]').forEach(el=>el.onclick=()=>document.querySelector('#lookup-order')?.focus());
}
document.addEventListener('click',e=>{
  const close=e.target.closest('[data-close-v05-drawer]');if(close){document.querySelector('#v05-product-drawer')?.remove();return}
  const addBtn=e.target.closest('[data-v05-drawer-add]');if(addBtn){add(Number(addBtn.dataset.v05DrawerAdd),1);document.querySelector('#v05-product-drawer')?.remove();return}
  const buyBtn=e.target.closest('[data-v05-drawer-buy]');if(buyBtn){add(Number(buyBtn.dataset.v05DrawerBuy),1);document.querySelector('#v05-product-drawer')?.remove();checkout();return}
  const like=e.target.closest('[data-local-like]');if(like){like.classList.toggle('liked');return}
});

hydrateV05Social().finally(()=>{home()});
