/* KHONCHAIHERB Commerce v1.8 — discovery search, order center, variant-safe social drawer */
let V18_SEARCH={q:'',category:'ทั้งหมด',sort:'relevance',stockOnly:true};
let V18_ORDER_QUERY='';

function v18ProductText(p){return `${p.name||''} ${p.desc||''} ${p.cat||''} ${p.sku||''}`.toLowerCase()}
function v18SearchList(){
  const q=String(V18_SEARCH.q||'').trim().toLowerCase();
  let list=typeof v07RankProducts==='function'?v07RankProducts(q):PRODUCTS.filter(p=>!q||v18ProductText(p).includes(q));
  if(V18_SEARCH.category!=='ทั้งหมด')list=list.filter(p=>p.cat===V18_SEARCH.category);
  if(V18_SEARCH.stockOnly)list=list.filter(p=>Number(p.stock)>0);
  const sort=V18_SEARCH.sort;
  if(sort==='popular')list=[...list].sort((a,b)=>Number(b.sold||0)-Number(a.sold||0));
  if(sort==='rating')list=[...list].sort((a,b)=>Number(b.rating||0)-Number(a.rating||0)||Number(b.sold||0)-Number(a.sold||0));
  if(sort==='price-asc')list=[...list].sort((a,b)=>Number(a.price||0)-Number(b.price||0));
  if(sort==='price-desc')list=[...list].sort((a,b)=>Number(b.price||0)-Number(a.price||0));
  return list;
}
function v18SearchPage(q=V18_SEARCH.q){
  current='search';V18_SEARCH.q=String(q||'').trim();
  const categories=['ทั้งหมด',...new Set(PRODUCTS.map(p=>p.cat).filter(Boolean))],list=v18SearchList();
  app.innerHTML=chrome(`<main class="v18-search-page">
    <div class="v18-search-summary"><div><b>${V18_SEARCH.q?`ผลการค้นหา “${esc(V18_SEARCH.q)}”`:'สินค้าทั้งหมด'}</b><small>${list.length} รายการที่ตรงเงื่อนไข</small></div><button data-v18-clear-search ${V18_SEARCH.q?'':'disabled'}>${I('close')} ล้าง</button></div>
    <div class="v18-search-cats">${categories.map(c=>`<button data-v18-category="${esc(c)}" class="${V18_SEARCH.category===c?'active':''}">${esc(c)}</button>`).join('')}</div>
    <div class="v18-filterbar"><label><input type="checkbox" data-v18-stock ${V18_SEARCH.stockOnly?'checked':''}> มีสินค้าเท่านั้น</label><select data-v18-sort aria-label="เรียงสินค้า"><option value="relevance" ${V18_SEARCH.sort==='relevance'?'selected':''}>เกี่ยวข้องที่สุด</option><option value="popular" ${V18_SEARCH.sort==='popular'?'selected':''}>ขายดี</option><option value="rating" ${V18_SEARCH.sort==='rating'?'selected':''}>คะแนนสูง</option><option value="price-asc" ${V18_SEARCH.sort==='price-asc'?'selected':''}>ราคาต่ำ → สูง</option><option value="price-desc" ${V18_SEARCH.sort==='price-desc'?'selected':''}>ราคาสูง → ต่ำ</option></select></div>
    <section class="tshop-grid v18-search-grid">${list.length?list.map(tshopCard).join(''):`<div class="empty v18-search-empty">${I('search_off')}<h2>ไม่พบสินค้าที่ตรงเงื่อนไข</h2><p>ลองเปลี่ยนคำค้น หมวดสินค้า หรือตัวกรอง</p><button class="primary" data-v18-reset-search>ดูสินค้าทั้งหมด</button></div>`}</section>
  </main>`,'search');
  bind();bindTShopV04();bindV05();bindV18();
  const input=document.querySelector('#global-shop-search');if(input){input.value=V18_SEARCH.q;input.focus({preventScroll:true})}
  if(typeof v07DecorateProductCards==='function')v07DecorateProductCards();if(typeof v07ApplyWishState==='function')v07ApplyWishState();
}
runTShopSearch=function(q){V18_SEARCH.q=String(q||'').trim();V18_SEARCH.category='ทั้งหมด';V18_SEARCH.sort='relevance';v18SearchPage(V18_SEARCH.q)};

function v18OrderBucket(o){
  const f=String(o.fulfillmentStatus||o.fulfillment_status||'pending'),p=String(o.paymentStatus||o.payment_status||'unpaid'),s=String(o.status||'pending'),pay=String(o.paymentMethod||o.payment_method||'COD').toUpperCase();
  if(s==='cancelled')return 'cancelled';
  if(pay!=='COD'&&['unpaid','pending','failed'].includes(p))return 'unpaid';
  if(['shipping','shipped'].includes(f))return 'shipping';
  if(['delivered','completed'].includes(f)||s==='completed')return 'completed';
  return 'packing';
}
function v18OrderMatches(o){const q=V18_ORDER_QUERY.trim().toLowerCase();if(!q)return true;return `${o.orderNo||o.order_no||''} ${(o.items||[]).map(i=>i.name||i.product_name||'').join(' ')}`.toLowerCase().includes(q)}
function v18OrderTabs(){
  const defs=[['all','ทั้งหมด'],['unpaid','รอชำระ'],['packing','เตรียมส่ง'],['shipping','กำลังส่ง'],['completed','สำเร็จ'],['cancelled','ยกเลิก']];
  return defs.map(([k,label])=>{const n=k==='all'?ordersLocal.length:ordersLocal.filter(o=>v18OrderBucket(o)===k).length;return `<button data-order-filter="${k}" class="${v05OrderFilter===k?'active':''}">${label}<span>${n}</span></button>`}).join('')
}
orders=function(){
  current='orders';
  const base=v05OrderFilter==='all'?ordersLocal:ordersLocal.filter(o=>v18OrderBucket(o)===v05OrderFilter),filtered=base.filter(v18OrderMatches);
  const counts={packing:ordersLocal.filter(o=>v18OrderBucket(o)==='packing').length,shipping:ordersLocal.filter(o=>v18OrderBucket(o)==='shipping').length,completed:ordersLocal.filter(o=>v18OrderBucket(o)==='completed').length};
  app.innerHTML=chrome(`<main class="v05-order-center v18-order-center">
    <div class="v05-order-head"><div><h1>คำสั่งซื้อของฉัน</h1><p>ติดตาม จัดการ และค้นหาคำสั่งซื้อในที่เดียว</p></div><button data-lookup-focus>${I('manage_search')}</button></div>
    <section class="v18-order-summary"><div><b>${counts.packing}</b><span>เตรียมส่ง</span></div><div><b>${counts.shipping}</b><span>กำลังส่ง</span></div><div><b>${counts.completed}</b><span>สำเร็จ</span></div></section>
    <div class="v05-order-tabs v18-order-tabs">${v18OrderTabs()}</div>
    <div class="v18-order-search">${I('search')}<input data-v18-order-search value="${esc(V18_ORDER_QUERY)}" placeholder="ค้นหาเลขคำสั่งซื้อหรือชื่อสินค้า"><button data-v18-order-clear ${V18_ORDER_QUERY?'':'disabled'}>${I('close')}</button></div>
    <div id="orders-list" class="v05-order-list">${filtered.length?filtered.map(orderCard).join(''):`<div class="empty">${I('inventory_2')}<h2>ไม่พบคำสั่งซื้อ</h2><p>${V18_ORDER_QUERY?'ลองเปลี่ยนคำค้นหรือสถานะ':'ยังไม่มีคำสั่งซื้อในสถานะนี้'}</p><button class="primary" data-go="home">เลือกซื้อสินค้า</button></div>`}</div>
    <section class="lookup-box v05-lookup"><h3>ค้นหาคำสั่งซื้อจากระบบ</h3><p>สำหรับออเดอร์ที่ไม่ได้อยู่ในเครื่องนี้ ใช้เลขคำสั่งซื้อและเบอร์โทรที่ใช้สั่งซื้อ</p><div class="lookup-grid"><input id="lookup-order" placeholder="เลขคำสั่งซื้อ KCH..."><input id="lookup-phone" inputmode="tel" placeholder="เบอร์โทร"><button class="primary" data-lookup-order>ค้นหา</button></div><div id="lookup-result"></div></section>
  </main>`,'orders');bind();bindV05();bindV18();
};

function v18DrawerVariant(p,detail){
  const vs=detail?.variants||[];let id=Number(V17_SELECTED_VARIANT.get(Number(p.id))||0);if(!id&&vs.length===1){id=vs[0].id;V17_SELECTED_VARIANT.set(Number(p.id),id)}return vs.find(v=>v.id===id)||null;
}
function v18RenderDrawer(p,detail){
  const wrap=document.querySelector('#v05-product-drawer');if(!wrap)return;
  const variants=detail?.variants||[],v=v18DrawerVariant(p,detail),hasChoice=!variants.length||Boolean(v),displayPrice=v?.price??p.price,displayOld=v?.old??p.old,stock=v?.stock??(variants.length?0:p.stock),variantLabel=v?`${v.optionName}: ${v.optionValue}`:'';
  wrap.innerHTML=`<div class="v05-drawer-backdrop" data-close-v05-drawer></div><section class="v05-product-drawer v18-product-drawer">
    <div class="v05-drawer-handle"></div><button class="v05-drawer-close" data-close-v05-drawer>${I('close')}</button>
    <div class="v05-drawer-product">${visual(p,'large')}<div><span class="shop-badge">Official</span><h2>${esc(p.name)}</h2><p>${esc(p.desc)}</p><div class="v05-drawer-meta"><span>⭐ ${Number(p.rating||0).toFixed(1)}</span><span>ขายแล้ว ${v05Fmt(p.sold||0)}</span><span>${hasChoice?`คงเหลือ ${stock}`:'เลือกตัวเลือก'}</span></div><strong>${M(displayPrice)}</strong>${displayOld>displayPrice?`<del>${M(displayOld)}</del>`:''}</div></div>
    ${variants.length?`<div class="v18-drawer-variants"><div><b>ตัวเลือกสินค้า</b><small>${variantLabel?esc(variantLabel):'กรุณาเลือกก่อนสั่งซื้อ'}</small></div><div class="v18-drawer-options">${variants.map(x=>`<button data-v18-drawer-variant="${x.id}" data-v18-product="${p.id}" class="${v?.id===x.id?'active':''}" ${x.stock<=0?'disabled':''}><b>${esc(x.optionValue)}</b><small>${M(x.price)} • ${x.stock>0?`เหลือ ${x.stock}`:'หมด'}</small></button>`).join('')}</div></div>`:''}
    <div class="v05-drawer-actions"><button class="pdp-add" data-v18-drawer-add="${p.id}" data-v18-variant="${v?.id||0}" ${!hasChoice||stock<=0?'disabled':''}>เพิ่มลงตะกร้า</button><button class="pdp-buy" data-v18-drawer-buy="${p.id}" data-v18-variant="${v?.id||0}" ${!hasChoice||stock<=0?'disabled':''}>${!hasChoice?'เลือกตัวเลือก':stock>0?'ซื้อเลย':'สินค้าหมด'}</button></div>
  </section>`;
}
openV05ProductDrawer=async function(productId){
  const p=v05Product(productId);if(!p)return;document.querySelector('#v05-product-drawer')?.remove();
  const el=document.createElement('div');el.id='v05-product-drawer';el.className='v05-drawer-wrap';el.innerHTML=`<div class="v05-drawer-backdrop" data-close-v05-drawer></div><section class="v05-product-drawer v18-product-drawer"><div class="v05-drawer-handle"></div><button class="v05-drawer-close" data-close-v05-drawer>${I('close')}</button><div class="v18-drawer-loading">${I('progress_activity')}<b>กำลังตรวจราคาและตัวเลือกสินค้า...</b></div></section>`;document.body.appendChild(el);
  let detail=null;try{detail=await v17EnsureDetail(p)}catch{}if(document.querySelector('#v05-product-drawer'))v18RenderDrawer(p,detail);
};

function bindV18(){
  document.querySelectorAll('[data-v18-category]').forEach(b=>b.onclick=()=>{V18_SEARCH.category=b.dataset.v18Category;v18SearchPage()});
  document.querySelector('[data-v18-stock]')?.addEventListener('change',e=>{V18_SEARCH.stockOnly=e.target.checked;v18SearchPage()},{once:true});
  document.querySelector('[data-v18-sort]')?.addEventListener('change',e=>{V18_SEARCH.sort=e.target.value;v18SearchPage()},{once:true});
  document.querySelector('[data-v18-clear-search]')?.addEventListener('click',()=>{V18_SEARCH={q:'',category:'ทั้งหมด',sort:'relevance',stockOnly:true};v18SearchPage('')},{once:true});
  document.querySelector('[data-v18-reset-search]')?.addEventListener('click',()=>{V18_SEARCH={q:'',category:'ทั้งหมด',sort:'relevance',stockOnly:true};v18SearchPage('')},{once:true});
  const oq=document.querySelector('[data-v18-order-search]');if(oq)oq.oninput=e=>{V18_ORDER_QUERY=e.target.value;clearTimeout(window.__kchOrderSearchTimer);window.__kchOrderSearchTimer=setTimeout(()=>orders(),180)};
  document.querySelector('[data-v18-order-clear]')?.addEventListener('click',()=>{V18_ORDER_QUERY='';orders()},{once:true});
}

/* Capture Add/Buy before the legacy reliability hotfix. All customer purchase entry points must resolve variants first. */
document.addEventListener('click',async e=>{
  const commerce=e.target.closest?.('[data-add],[data-buy]');
  if(commerce&&!commerce.disabled){e.preventDefault();e.stopImmediatePropagation();const id=Number(commerce.dataset.add||commerce.dataset.buy),q=(current==='product'&&typeof qty!=='undefined')?qty:1,buyNow=commerce.hasAttribute('data-buy');const ok=await v17Purchase(id,q,buyNow);if(ok&&typeof v06Track==='function'&&!buyNow)v06Track('add_to_cart',{productId:id});return}
  const choice=e.target.closest?.('[data-v18-drawer-variant]');if(choice){e.preventDefault();e.stopImmediatePropagation();const productId=Number(choice.dataset.v18Product),variantId=Number(choice.dataset.v18DrawerVariant),p=v05Product(productId),detail=V17_DETAIL_CACHE.get(productId);if(p&&detail){V17_SELECTED_VARIANT.set(productId,variantId);v18RenderDrawer(p,detail)}return}
  const add=e.target.closest?.('[data-v18-drawer-add]');if(add){e.preventDefault();e.stopImmediatePropagation();const id=Number(add.dataset.v18DrawerAdd),vid=Number(add.dataset.v18Variant),ok=await v17Purchase(id,1,false,vid);if(ok){document.querySelector('#v05-product-drawer')?.remove();if(typeof v06Track==='function')v06Track('add_to_cart',{productId:id})}return}
  const buy=e.target.closest?.('[data-v18-drawer-buy]');if(buy){e.preventDefault();e.stopImmediatePropagation();const id=Number(buy.dataset.v18DrawerBuy),vid=Number(buy.dataset.v18Variant),ok=await v17Purchase(id,1,true,vid);if(ok)document.querySelector('#v05-product-drawer')?.remove();return}
},true);

window.__KCH_V18__={searchList:v18SearchList,orderBucket:v18OrderBucket,version:'1.8.0'};
