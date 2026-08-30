/* KHONCHAIHERB Commerce v0.4 — social commerce interaction layer */
const TSHOP_LIVE=[
  {title:'LIVE สมุนไพรขายดี',sub:'ดีลสดจากร้านทางการ',emoji:'🌿',viewers:'1.2K',productId:1},
  {title:'ดีลดูแลร่างกาย',sub:'คูปองเฉพาะช่วง LIVE',emoji:'🍃',viewers:'824',productId:2},
  {title:'Gift Set Showcase',sub:'ไอเดียของขวัญสุขภาพ',emoji:'🎁',viewers:'516',productId:6}
];
const TSHOP_VIDEOS=[
  {title:'ชารางจืด เลือกแบบไหนดี?',emoji:'🌿',productId:1},
  {title:'บาล์มสมุนไพร ใช้ง่ายทุกวัน',emoji:'🍃',productId:2},
  {title:'จัด Gift Set แบบพรีเมียม',emoji:'🎁',productId:6}
];
function chrome(body,active=current){
  const shopActive=['home','product','cart','checkout'].includes(active);
  return `<div class="shell">
    <header class="topbar tshop-topbar">
      <div class="tshop-searchbox">${I('search')}<input id="global-shop-search" placeholder="ค้นหาใน KHONCHAIHERB Shop" aria-label="ค้นหาสินค้า"><button data-focus-search>ค้นหา</button></div>
      <div class="tshop-top-actions">
        <button class="tshop-icon" data-go="orders" aria-label="คำสั่งซื้อ">${I('receipt_long')}</button>
        <button class="tshop-icon" data-go="cart" aria-label="ตะกร้า">${I('shopping_cart')}<i class="badge">${count()}</i></button>
      </div>
    </header>
    ${body}
    <nav class="tshop-bottom">
      <button data-go="home" class="${shopActive?'active':''}">${I('storefront')}<span>Shop</span></button>
      <button data-live-nav>${I('live_tv')}<span>LIVE</span></button>
      <button data-go="orders" class="${active==='orders'?'active':''}">${I('local_shipping')}<span>คำสั่งซื้อ</span></button>
      <button data-go="account" class="${active==='account'?'active':''}">${I('person')}<span>ฉัน</span></button>
    </nav>
  </div>`
}
function tshopCard(p){
  const off=p.old>p.price?Math.round((1-p.price/p.old)*100):0;
  return `<article class="tshop-card" data-product="${esc(p.slug)}">
    ${visual(p)}
    <div class="tshop-card-info">
      <div class="tshop-card-title"><span class="shop-badge">Official</span>${esc(p.name)}</div>
      <div class="tshop-card-tags"><span class="deal-chip">ดีลจากร้าน</span>${p.price>=699?'<span class="shipping-chip">ส่งฟรี</span>':'<span class="shipping-chip">ส่งไว</span>'}</div>
      <div class="tshop-price-line"><span class="tshop-price">${M(p.price)}</span>${off?`<span class="tshop-old">${M(p.old)}</span>`:''}</div>
      <div class="tshop-meta"><span>ขายแล้ว ${p.sold.toLocaleString('th-TH')}</span><span>⭐ ${p.rating.toFixed(1)}</span></div>
      <button class="tshop-add" data-add="${p.id}" ${p.stock<=0?'disabled':''}>${I('add_shopping_cart')}</button>
    </div>
  </article>`
}
function tshopVoucher(c){
  const saved=claimed.includes(c.code);
  const value=c.type==='percent'?`${Number(c.value)}%`:`฿${Number(c.value)}`;
  return `<div class="voucher-ticket"><div class="voucher-value">${value}</div><div class="voucher-copy"><b>${esc(c.label||'คูปองร้านค้า')}</b><small>ขั้นต่ำ ${M(c.min_spend||0)} • ${esc(c.code)}</small></div><button data-claim="${esc(c.code)}" ${saved?'disabled':''}>${saved?'เก็บแล้ว':'เก็บ'}</button></div>`
}
function tshopLiveCard(x){
  const p=PRODUCTS.find(p=>p.id===x.productId)||PRODUCTS[0];
  return `<div class="live-card" data-product="${esc(p.slug)}"><span class="live-tag">LIVE</span><span class="live-viewers">${esc(x.viewers)}</span><div class="live-emoji">${x.emoji}</div><div class="live-copy"><b>${esc(x.title)}</b><small>${esc(x.sub)}</small><div class="live-price">${M(p.price)}</div></div></div>`
}
function tshopVideoCard(x,i){
  const p=PRODUCTS.find(p=>p.id===x.productId)||PRODUCTS[0];
  return `<div class="video-card" data-product="${esc(p.slug)}"><div class="video-thumb"><div style="font-size:60px">${x.emoji}</div><span class="video-play">${I('play_arrow')}</span><div class="video-product-pin"><span>${esc(p.name).slice(0,16)}</span><b>${M(p.price)}</b></div></div><div style="font-size:11px;font-weight:700;padding:5px 2px">${esc(x.title)}</div></div>`
}
function home(){
  current='home';
  const list=PRODUCTS.filter(p=>activeCategory==='ทั้งหมด'||p.cat===activeCategory);
  app.innerHTML=chrome(`
    <div class="shop-tabs"><button class="active" data-home-tab="recommend">แนะนำ</button><button data-live-jump>LIVE</button><button data-scroll-deals>ดีล</button><button data-scroll-products>สินค้า</button></div>
    <section class="tshop-hero"><div class="tshop-hero-copy"><span class="mini">KHONCHAIHERB OFFICIAL SHOP</span><h1>Shop • Scroll • Buy</h1><p>เลือกสินค้า ดูดีล เก็บคูปอง แล้วสั่งซื้อได้ในไม่กี่แตะ</p><button data-scroll-products>ช้อปเลย</button></div><div class="tshop-hero-art">🌿</div></section>
    <section class="quick-icons">
      <button data-scroll-deals><span class="quick-icon-ball">${I('bolt')}</span><span>Flash Sale</span></button>
      <button data-live-jump><span class="quick-icon-ball">${I('live_tv')}</span><span>LIVE</span></button>
      <button data-scroll-voucher><span class="quick-icon-ball">${I('confirmation_number')}</span><span>คูปอง</span></button>
      <button data-go="orders"><span class="quick-icon-ball">${I('local_shipping')}</span><span>คำสั่งซื้อ</span></button>
      <button data-go="account"><span class="quick-icon-ball">${I('favorite')}</span><span>ถูกใจ</span></button>
    </section>
    <section class="tshop-section" id="deals"><div class="tshop-section-head"><div class="flash-head-left"><span class="flash-logo">FLASH SALE</span><div class="flash-countdown"><span id="fh">00</span>:<span id="fm">00</span>:<span id="fs">00</span></div></div><button data-scroll-products>ดูทั้งหมด ›</button></div><div class="flash-row">${PRODUCTS.filter(p=>p.stock>0).slice(0,5).map(p=>`<div class="flash-product" data-product="${esc(p.slug)}">${visual(p)}<b>${M(p.price)}</b><del>${M(p.old)}</del><div class="flash-sold"><i style="width:${Math.min(95,30+(p.sold%60))}%"></i><span>ขายแล้ว ${p.sold.toLocaleString('th-TH')}</span></div></div>`).join('')}</div></section>
    <div class="voucher-rail" id="vouchers">${COUPONS.slice(0,3).map(tshopVoucher).join('')}</div>
    <section class="tshop-section" id="live"><div class="tshop-section-head"><h2>LIVE กำลังมาแรง</h2><button data-live-jump>ดูทั้งหมด ›</button></div><div class="live-rail">${TSHOP_LIVE.map(tshopLiveCard).join('')}</div></section>
    <section class="tshop-section"><div class="tshop-section-head"><h2>ช้อปจากวิดีโอ</h2><button>ดูเพิ่มเติม ›</button></div><div class="video-feed">${TSHOP_VIDEOS.map(tshopVideoCard).join('')}</div></section>
    <div class="category-strip">
      ${['ทั้งหมด','ชาสมุนไพร','ดูแลร่างกาย','เครื่องดื่ม','ชุดของขวัญ'].map(c=>`<button data-cat="${esc(c)}" class="${activeCategory===c?'active':''}">${esc(c)}</button>`).join('')}
    </div>
    <div class="recommend-head" id="recommend">แนะนำสำหรับคุณ</div>
    <section class="tshop-grid" id="product-grid">${list.length?list.map(tshopCard).join(''):`<div class="empty search-empty"><h2>ยังไม่มีสินค้าในหมวดนี้</h2></div>`}</section>
  `);
  bind();bindTShopV04();startTShopCountdown();
}
function product(p){
  current='product';selected=p;qty=1;
  const off=p.old>p.price?Math.round((1-p.price/p.old)*100):0;
  const recommend=PRODUCTS.filter(x=>x.id!==p.id).slice(0,4);
  app.innerHTML=chrome(`<main class="tshop-pdp">
    <section class="pdp-media">${visual(p,'large')}<div class="pdp-floating"><button class="pdp-float-btn" data-go="home">${I('arrow_back')}</button><button class="pdp-float-btn" data-go="cart">${I('shopping_cart')}</button></div></section>
    <section class="pdp-price-block"><div class="pdp-price">${M(p.price)}${p.old>p.price?`<small>${M(p.old)}</small><span class="pdp-off">-${off}%</span>`:''}</div><div class="pdp-title">${esc(p.name)}</div><div class="pdp-sold"><span>⭐ ${p.rating.toFixed(1)}</span><span>ขายแล้ว ${p.sold.toLocaleString('th-TH')}</span><span>คงเหลือ ${p.stock}</span></div></section>
    <section class="pdp-block"><div class="pdp-row"><span class="pdp-row-label">คูปอง</span><div class="pdp-voucher-line">${COUPONS.slice(0,3).map(c=>`<span class="pdp-voucher-chip">${esc(c.code)}</span>`).join('')}</div><span>${I('chevron_right')}</span></div><div class="pdp-row"><span class="pdp-row-label">จัดส่ง</span><div class="pdp-row-main"><b>${p.price>=699?'ส่งฟรีตามเงื่อนไข':'ค่าจัดส่งคำนวณตอนชำระ'}</b><small>รองรับเก็บเงินปลายทาง • ติดตามสถานะได้</small></div><span>${I('chevron_right')}</span></div></section>
    <section class="pdp-block"><div class="shop-profile"><div class="shop-avatar">K</div><div class="shop-profile-copy"><b>KHONCHAIHERB Official</b><small>ร้านทางการ • ตอบแชตไว</small></div><button data-go="home">ดูร้าน</button></div><div class="shop-stats"><div><b>${PRODUCTS.length}</b><span>สินค้า</span></div><div><b>4.9</b><span>คะแนนร้าน</span></div><div><b>96%</b><span>ตอบแชต</span></div></div></section>
    <section class="pdp-block"><div class="pdp-review-top"><b>คะแนนและรีวิว (${Math.max(12,Math.floor(p.sold/9))})</b><span>${p.rating.toFixed(1)} ★ ›</span></div><div><span class="review-pill">คุณภาพดี</span><span class="review-pill">แพ็กดี</span><span class="review-pill">จัดส่งไว</span></div><div class="review-card" style="margin-top:10px"><b>ผู้ซื้อที่ยืนยันแล้ว</b><div class="stars">★★★★★</div><p>สินค้าแพ็กเรียบร้อย สถานะออเดอร์ชัด และใช้งานหน้าร้านสะดวก</p></div></section>
    <section class="pdp-block"><b>รายละเอียดสินค้า</b><p style="font-size:12px;line-height:1.7;color:#555">${esc(p.desc)}</p><div style="font-size:11px;color:#888">SKU: ${esc(p.sku||'-')}</div></section>
    <div class="recommend-head">คุณอาจชอบ</div><section class="tshop-grid">${recommend.map(tshopCard).join('')}</section>
    <div class="pdp-bottom"><button class="pdp-mini" data-go="home">${I('storefront')}<span>ร้าน</span></button><button class="pdp-mini" data-favorite="${p.id}">${I('favorite')}<span>ถูกใจ</span></button><button class="pdp-add" data-add="${p.id}" ${p.stock<=0?'disabled':''}>เพิ่มลงตะกร้า</button><button class="pdp-buy" data-buy="${p.id}" ${p.stock<=0?'disabled':''}>${p.stock>0?'ซื้อเลย':'สินค้าหมด'}</button></div>
  </main>`,'product');
  bind();bindTShopV04();
}
function startTShopCountdown(){
  const tick=()=>{const now=new Date(),end=new Date(now);end.setHours(23,59,59,999);let s=Math.max(0,Math.floor((end-now)/1000));const h=String(Math.floor(s/3600)).padStart(2,'0');s%=3600;const m=String(Math.floor(s/60)).padStart(2,'0'),sec=String(s%60).padStart(2,'0');[['fh',h],['fm',m],['fs',sec]].forEach(([id,v])=>{const e=document.getElementById(id);if(e)e.textContent=v})};tick();clearInterval(window.__kchTShopTimer);window.__kchTShopTimer=setInterval(tick,1000)
}
function bindTShopV04(){
  const search=document.getElementById('global-shop-search');
  if(search){search.addEventListener('keydown',e=>{if(e.key==='Enter')runTShopSearch(search.value)});search.addEventListener('input',e=>{if(!e.target.value.trim()&&current==='home')home()})}
  document.querySelectorAll('[data-focus-search]').forEach(b=>b.onclick=()=>{const s=document.getElementById('global-shop-search');if(s)s.focus()});
  document.querySelectorAll('[data-live-nav],[data-live-jump]').forEach(b=>b.onclick=()=>{if(current!=='home'){home();setTimeout(()=>document.getElementById('live')?.scrollIntoView({behavior:'smooth'}),40)}else document.getElementById('live')?.scrollIntoView({behavior:'smooth'})});
  document.querySelectorAll('[data-scroll-deals]').forEach(b=>b.onclick=()=>document.getElementById('deals')?.scrollIntoView({behavior:'smooth'}));
  document.querySelectorAll('[data-scroll-voucher]').forEach(b=>b.onclick=()=>document.getElementById('vouchers')?.scrollIntoView({behavior:'smooth'}));
}
function runTShopSearch(q){
  q=String(q||'').trim().toLowerCase();if(!q)return;
  const hits=PRODUCTS.filter(p=>`${p.name} ${p.desc} ${p.cat}`.toLowerCase().includes(q));
  const grid=document.getElementById('product-grid');if(grid){grid.innerHTML=hits.length?hits.map(tshopCard).join(''):`<div class="empty search-empty"><h2>ไม่พบสินค้า</h2><p>ลองค้นหาด้วยคำอื่น</p></div>`;bind();bindTShopV04();grid.scrollIntoView({behavior:'smooth'})}
}
