const STATIC_PRODUCT_MEDIA={
'rang-jued-tea':'/assets/products/rang-jued-tea-360.webp',
'chiang-da-tea':'/assets/products/chiang-da-tea-360.webp',
'gymnema-capsules-100':'/assets/products/gymnema-capsules-100-512.webp'
};
const FALLBACK_PRODUCTS=[
{id:1,slug:'rang-jued-tea',sku:'KCH-TEA-001',name:'ชารางจืดคัดพิเศษ',desc:'ใบคัดคุณภาพ กลิ่นหอม ดื่มง่าย',price:189,old:259,rating:4.9,sold:1248,stock:86,cat:'ชาสมุนไพร',emoji:'🌿',tag:'ขายดี',featured:true,image:STATIC_PRODUCT_MEDIA['rang-jued-tea']},
{id:2,slug:'herbal-balm',sku:'KCH-BALM-001',name:'บาล์มสมุนไพรสูตรเข้มข้น',desc:'กลิ่นสมุนไพรสดชื่น เนื้อสัมผัสดี',price:149,old:199,rating:4.8,sold:938,stock:120,cat:'ดูแลร่างกาย',emoji:'🍃',tag:'ฮิต',featured:true},
{id:3,slug:'herbal-set',sku:'KCH-SET-001',name:'ชุดสมุนไพรดูแลสุขภาพ',desc:'รวมสินค้ายอดนิยมในชุดเดียว',price:459,old:590,rating:4.9,sold:524,stock:42,cat:'ชุดของขวัญ',emoji:'🎁',tag:'คุ้มสุด',featured:true},
{id:4,slug:'herbal-drink',sku:'KCH-DRINK-001',name:'เครื่องดื่มสมุนไพรสูตรดั้งเดิม',desc:'รสกลมกล่อม พกง่าย พร้อมดื่ม',price:99,old:129,rating:4.7,sold:2201,stock:210,cat:'เครื่องดื่ม',emoji:'🫖',tag:'คนซื้อเยอะ',featured:true},
{id:5,slug:'herbal-compress',sku:'KCH-COMP-001',name:'ลูกประคบสมุนไพร',desc:'สมุนไพรคัดสรร กลิ่นธรรมชาติ',price:129,old:169,rating:4.8,sold:781,stock:64,cat:'ดูแลร่างกาย',emoji:'🌾',tag:'แนะนำ',featured:false},
{id:6,slug:'herbal-gift',sku:'KCH-GIFT-001',name:'กล่องของขวัญ KHONCHAIHERB',desc:'ของขวัญสุขภาพภาพลักษณ์พรีเมียม',price:699,old:850,rating:5.0,sold:194,stock:25,cat:'ชุดของขวัญ',emoji:'✨',tag:'พรีเมียม',featured:true}
];
const FALLBACK_COUPONS=[
{code:'WELCOME50',type:'fixed',value:50,min_spend:499,max_discount:50,new_customer_only:1,label:'ลูกค้าใหม่ ลด ฿50'},
{code:'HERB10',type:'percent',value:10,min_spend:799,max_discount:120,new_customer_only:0,label:'ลด 10% สูงสุด ฿120'}
];
let PRODUCTS=[...FALLBACK_PRODUCTS];
let COUPONS=[...FALLBACK_COUPONS];
let cart=readJson('kch-cart',[]);
let claimed=readJson('kch-coupons',[]);
let ordersLocal=readJson('kch-orders',[]);
let activeCoupon=localStorage.getItem('kch-active-coupon')||'';
let current='home',selected=null,qty=1,activeCategory='ทั้งหมด',checkoutKey='';
const app=document.querySelector('#app');
const M=n=>new Intl.NumberFormat('th-TH',{style:'currency',currency:'THB',maximumFractionDigits:0}).format(Number(n)||0);
const I=n=>`<span class="material-symbols-rounded">${n}</span>`;
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
function readJson(k,f){try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(f))}catch{return f}}
function writeJson(k,v){localStorage.setItem(k,JSON.stringify(v))}
const save=()=>writeJson('kch-cart',cart);
const saveCoupons=()=>writeJson('kch-coupons',claimed);
const saveOrders=()=>writeJson('kch-orders',ordersLocal);
const count=()=>cart.reduce((s,x)=>s+(Number(x.qty)||0),0);
const subtotal=()=>cart.reduce((s,x)=>s+(Number(x.price)||0)*(Number(x.qty)||0),0);
const uuid=()=>crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(16).slice(2)}`;
async function api(url,options={}){const r=await fetch(url,{...options,headers:{'Content-Type':'application/json',...(options.headers||{})}});let data={};try{data=await r.json()}catch{}if(!r.ok){const e=new Error(data.error||`HTTP_${r.status}`);e.data=data;e.status=r.status;throw e}return data}
function normalizeProduct(p){const fallback=FALLBACK_PRODUCTS.find(x=>x.id===Number(p.id))||{},slug=p.slug||fallback.slug||'',price=Number(p.price??fallback.price??0);return {id:Number(p.id),slug,sku:p.sku||fallback.sku||'',name:p.name||fallback.name||'',desc:p.description??p.desc??fallback.desc??'',price,old:Number(p.compare_at_price??p.old??fallback.old??p.price??0),rating:Number(p.rating??fallback.rating??0),sold:Number(p.sold_count??p.sold??fallback.sold??0),stock:Number(p.stock??fallback.stock??0),cat:p.category??p.cat??fallback.cat??'สินค้า',emoji:p.emoji||fallback.emoji||'🌿',tag:p.tag||fallback.tag||(p.featured?'แนะนำ':''),featured:Boolean(Number(p.featured??fallback.featured??0)),image:p.image_url||p.image||STATIC_PRODUCT_MEDIA[slug]||fallback.image||'',comingSoon:Boolean(p.comingSoon)||price<=0}}
async function hydrateCatalog(){try{const data=await api('/api/products');if(Array.isArray(data.products)&&data.products.length){PRODUCTS=data.products.map(normalizeProduct);cart=cart.map(x=>{const fresh=PRODUCTS.find(p=>p.id===Number(x.id));if(!fresh)return x;if(Number(x.variantId)>0)return {...fresh,qty:x.qty,lineKey:x.lineKey||`${fresh.id}:${Number(x.variantId)}`,variantId:Number(x.variantId),variantSku:x.variantSku||'',variantOptionName:x.variantOptionName||'รูปแบบ',variantOptionValue:x.variantOptionValue||'',lineName:x.lineName||fresh.name,price:Number(x.price??fresh.price),old:Number(x.old??fresh.old),stock:Number(x.stock??fresh.stock),needsVariant:Boolean(x.needsVariant)};return {...fresh,qty:x.qty,needsVariant:Boolean(x.needsVariant),lineKey:x.lineKey||`${fresh.id}:0`}});save()}}catch{}try{const data=await api('/api/coupons');if(Array.isArray(data.coupons)&&data.coupons.length){COUPONS=data.coupons.map(c=>({...c,label:c.code==='WELCOME50'?'ลูกค้าใหม่ ลด ฿50':c.type==='percent'?`ลด ${c.value}%${c.max_discount?` สูงสุด ${M(c.max_discount)}`:''}`:`ลด ${M(c.value)}`}))}}catch{}if(current==='home')home()}
function visual(p,cls=''){const priority=cls.includes('large')?' fetchpriority="high"':' loading="lazy"';const content=p.image?`<img src="${esc(p.image)}" alt="${esc(p.name)}"${priority} decoding="async">`:`<span class="emoji">${p.emoji||'🌿'}</span>`;return `<div class="visual ${cls}">${p.tag?`<span class="tag">${esc(p.tag)}</span>`:''}${content}<span class="decor d1">☘</span><span class="decor d2">❧</span></div>`}

/* Digital Flagship Store phase 2 — premium discovery + verified launch preview */
const KCH_FLAGSHIP_LAUNCH=[
{name:'ชาเชียงดา',meta:'30 ซอง',image:STATIC_PRODUCT_MEDIA['chiang-da-tea'],type:'ชาสมุนไพร',copy:'ชาเชียงดาแบบซองชง ตรา คุณชายสมุนไพร เตรียมเพิ่มเข้าสู่หน้าร้านเมื่อข้อมูลราคาและสต็อกพร้อม'},
{name:'ผักเชียงดาแคปซูล',meta:'100 แคปซูล',image:STATIC_PRODUCT_MEDIA['gymnema-capsules-100'],type:'แคปซูลสมุนไพร',copy:'ผักเชียงดาแบบแคปซูล บรรจุ 100 แคปซูล เตรียมจำหน่ายหลังยืนยันข้อมูลสินค้า ราคา และสต็อก'}
];
let KCH_FLAGSHIP_FRAME=0;
function kchFlagshipStyles(){
  if(document.getElementById('kch-flagship-phase2-style'))return;
  const style=document.createElement('style');style.id='kch-flagship-phase2-style';style.textContent=`
  .kch-shop-assistant-form{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:9px;margin:12px 0 4px;padding:8px;border:1px solid #dfe7e1;border-radius:16px;background:rgba(255,255,255,.8);box-shadow:0 8px 22px rgba(20,55,40,.045)}
  .kch-shop-assistant-input{display:flex;align-items:center;gap:8px;min-width:0;padding:0 10px;border:1px solid #e1e8e3;border-radius:12px;background:#fff}.kch-shop-assistant-input .material-symbols-rounded{font-size:20px;color:#2b6b4c}.kch-shop-assistant-input input{width:100%;min-width:0;min-height:44px;border:0;outline:0;background:transparent;font:600 12px/1.45 inherit;color:#183e31}.kch-shop-assistant-input input::placeholder{color:#87928b;font-weight:500}
  .kch-shop-assistant-submit{min-height:44px;border:0;border-radius:12px;padding:0 16px;background:#173f31;color:#fff;font:800 12px/1 inherit;cursor:pointer}.kch-shop-assistant-submit:hover{background:#20553f}
  .kch-shop-assistant-chips{grid-column:1/-1;display:flex;gap:7px;overflow-x:auto;scrollbar-width:none;padding:1px 2px 2px}.kch-shop-assistant-chips::-webkit-scrollbar{display:none}.kch-shop-assistant-chips button{flex:0 0 auto;min-height:32px;border:1px solid #dde6df;border-radius:999px;background:#fbfdfb;color:#385548;padding:0 11px;font:700 10px/1 inherit;cursor:pointer}.kch-shop-assistant-chips button:hover{border-color:#b8cbbf;background:#f0f6f2}.kch-shop-assistant-status{grid-column:1/-1;min-height:17px;color:#68766e;font-size:9.5px;line-height:1.5}
  .kch-flagship-launch{position:relative;margin:24px auto 0;padding:clamp(18px,2.5vw,34px);border:1px solid #dfe6df;border-radius:24px;background:linear-gradient(135deg,#f8f3e8 0%,#fbfdf9 45%,#eef5ef 100%);box-shadow:0 16px 42px rgba(21,57,40,.065);overflow:hidden}.kch-flagship-launch::after{content:"";position:absolute;right:-70px;top:-90px;width:250px;height:250px;border-radius:50%;background:radial-gradient(circle,rgba(177,138,71,.12),rgba(177,138,71,0) 68%);pointer-events:none}
  .kch-flagship-launch-head{position:relative;z-index:1;display:flex;align-items:end;justify-content:space-between;gap:18px;margin-bottom:18px}.kch-flagship-launch-eyebrow{display:block;margin-bottom:5px;color:#9a793e;font-size:9px;font-weight:900;letter-spacing:.16em}.kch-flagship-launch-head h2{margin:0;color:#143c2e;font-size:clamp(23px,2.2vw,34px);line-height:1.2;letter-spacing:-.025em}.kch-flagship-launch-head p{max-width:620px;margin:7px 0 0;color:#65736b;font-size:11px;line-height:1.65}.kch-flagship-launch-head button{flex:0 0 auto;min-height:42px;border:1px solid #cfdcd3;border-radius:999px;background:#fff;color:#224a39;padding:0 15px;font:800 10.5px/1 inherit;cursor:pointer}
  .kch-launch-grid{position:relative;z-index:1;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.kch-launch-card{display:grid;grid-template-columns:minmax(150px,.8fr) minmax(0,1.2fr);min-width:0;overflow:hidden;border:1px solid rgba(210,222,213,.92);border-radius:20px;background:rgba(255,255,255,.9);box-shadow:0 10px 26px rgba(23,58,42,.05)}.kch-launch-media{position:relative;display:grid;place-items:center;min-height:260px;padding:18px;background:linear-gradient(145deg,#f5f6ee,#eaf2eb)}.kch-launch-media img{width:100%;height:100%;max-height:245px;object-fit:contain;filter:drop-shadow(0 14px 18px rgba(19,51,36,.12))}.kch-launch-badge{position:absolute;left:12px;top:12px;border:1px solid rgba(255,255,255,.7);border-radius:999px;background:#173f31;color:#fff;padding:7px 10px;font-size:8.5px;font-weight:900;letter-spacing:.04em}
  .kch-launch-copy{display:flex;flex-direction:column;justify-content:center;min-width:0;padding:20px}.kch-launch-copy small{color:#9a793e;font-size:9px;font-weight:900;letter-spacing:.08em}.kch-launch-copy h3{margin:6px 0 5px;color:#173e30;font-size:clamp(19px,1.6vw,25px);line-height:1.25}.kch-launch-copy p{margin:0;color:#66746c;font-size:10.5px;line-height:1.65}.kch-launch-meta{display:flex;flex-wrap:wrap;gap:7px;margin-top:13px}.kch-launch-meta span{border:1px solid #dde7df;border-radius:999px;background:#f8fbf8;color:#496057;padding:6px 9px;font-size:8.5px;font-weight:800}.kch-launch-soon{margin-top:15px;color:#8d7138;font-size:13px;font-weight:900}
  .v05-creator-section,.v118-brand-story{content-visibility:auto;contain-intrinsic-size:480px}
  @media(max-width:699px){.kch-shop-assistant-form{grid-template-columns:1fr;margin:10px 0 2px;padding:7px}.kch-shop-assistant-submit{width:100%}.kch-shop-assistant-chips,.kch-shop-assistant-status{grid-column:1}.kch-flagship-launch{margin:18px 12px 0;padding:16px;border-radius:20px}.kch-flagship-launch-head{align-items:start}.kch-flagship-launch-head button{display:none}.kch-flagship-launch-head h2{font-size:24px}.kch-flagship-launch-head p{font-size:10px}.kch-launch-grid{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(260px,86%);grid-template-columns:none;gap:10px;overflow-x:auto;overscroll-behavior-inline:contain;scroll-snap-type:x mandatory;scrollbar-width:none;padding-bottom:3px}.kch-launch-grid::-webkit-scrollbar{display:none}.kch-launch-card{grid-template-columns:1fr;scroll-snap-align:start}.kch-launch-media{min-height:210px}.kch-launch-media img{max-height:190px}.kch-launch-copy{padding:15px}.kch-launch-copy h3{font-size:20px}.kch-launch-copy p{font-size:10px}.v05-creator-section{margin-top:14px!important;padding:12px!important}.v05-creator-section .v05-creator-rail{gap:8px!important}}
  @media(min-width:700px) and (max-width:1023px){.kch-flagship-launch{margin-inline:14px}.kch-launch-card{grid-template-columns:1fr}.kch-launch-media{min-height:230px}}
  `;
  document.head.appendChild(style);
}
function kchFlagshipIntent(value){
  const q=String(value||'').trim();if(!q)return;
  const t=q.toLowerCase();
  if(/ของฝาก|ของขวัญ|ฝากผู้ใหญ่/.test(t)&&typeof v118RunSmartAction==='function')v118RunSmartAction('gift');
  else if(/พร้อมส่ง|มีของ|ส่งเลย|ส่งทันที/.test(t)&&typeof v118RunSmartAction==='function')v118RunSmartAction('ready');
  else if(/300/.test(t)&&/งบ|ไม่เกิน|ต่ำกว่า/.test(t)&&typeof v118RunSmartAction==='function')v118RunSmartAction('budget');
  else if(typeof runTShopSearch==='function')runTShopSearch(q);
  const status=document.querySelector('.kch-shop-assistant-status');if(status)status.textContent=`กำลังแสดงสินค้าที่เกี่ยวข้องกับ “${q}”`;
  setTimeout(()=>document.getElementById('product-grid')?.scrollIntoView({behavior:'smooth',block:'start'}),20);
}
function kchFlagshipAssistant(){
  const helper=document.querySelector('.v118-smart-helper');if(!helper||helper.querySelector('.kch-shop-assistant-form'))return;
  const form=document.createElement('form');form.className='kch-shop-assistant-form';form.setAttribute('role','search');form.setAttribute('aria-label','ค้นหาและช่วยเลือกสินค้า');
  form.innerHTML=`<label class="kch-shop-assistant-input"><span class="material-symbols-rounded">search</span><input type="search" autocomplete="off" inputmode="search" placeholder="ลองพิมพ์ เช่น ชาชงง่าย ของฝาก หรือ งบไม่เกิน 300" aria-label="บอกสิ่งที่กำลังมองหา"></label><button class="kch-shop-assistant-submit" type="submit">ช่วยค้นหา</button><div class="kch-shop-assistant-chips" aria-label="คำค้นแนะนำ"><button type="button" data-kch-query="ชารางจืด">ชารางจืด</button><button type="button" data-kch-query="ชาสมุนไพร">ชาสมุนไพร</button><button type="button" data-kch-query="ของฝาก">ของฝาก</button><button type="button" data-kch-query="พร้อมส่ง">พร้อมส่ง</button></div><div class="kch-shop-assistant-status" aria-live="polite"></div>`;
  const head=helper.querySelector('.v118-smart-head');if(head)head.insertAdjacentElement('afterend',form);else helper.prepend(form);
  form.addEventListener('submit',e=>{e.preventDefault();kchFlagshipIntent(form.querySelector('input')?.value)});
  form.querySelectorAll('[data-kch-query]').forEach(button=>button.addEventListener('click',()=>{const input=form.querySelector('input');if(input)input.value=button.dataset.kchQuery||'';kchFlagshipIntent(button.dataset.kchQuery)}));
}
function kchFlagshipLaunch(){
  if(current!=='home')return;
  const shell=document.querySelector('.v118-signature-home');if(!shell||shell.querySelector('.kch-flagship-launch'))return;
  const shop=document.querySelector('.v118-shop-first');if(!shop)return;
  const section=document.createElement('section');section.className='kch-flagship-launch';section.setAttribute('aria-labelledby','kch-launch-title');
  section.innerHTML=`<div class="kch-flagship-launch-head"><div><span class="kch-flagship-launch-eyebrow">NEW FROM KHONCHAIHERB</span><h2 id="kch-launch-title">เตรียมพบสินค้าใหม่จากคุณชายสมุนไพร</h2><p>เราแสดงเฉพาะข้อมูลผลิตภัณฑ์ที่ยืนยันแล้ว และจะเปิดสั่งซื้อเมื่อราคา สต็อก และข้อมูลจำหน่ายพร้อมครบถ้วน</p></div><button type="button" data-kch-ready-products>ดูสินค้าพร้อมสั่งซื้อ</button></div><div class="kch-launch-grid">${KCH_FLAGSHIP_LAUNCH.map(item=>`<article class="kch-launch-card"><div class="kch-launch-media"><span class="kch-launch-badge">สินค้าใหม่</span><img src="${esc(item.image)}" alt="${esc(item.name)} ${esc(item.meta)}" loading="lazy" decoding="async"></div><div class="kch-launch-copy"><small>คุณชายสมุนไพร • KHONCHAIHERB</small><h3>${esc(item.name)}</h3><p>${esc(item.copy)}</p><div class="kch-launch-meta"><span>${esc(item.type)}</span><span>${esc(item.meta)}</span></div><strong class="kch-launch-soon">ราคาเร็ว ๆ นี้</strong></div></article>`).join('')}</div>`;
  shop.insertAdjacentElement('afterend',section);
  section.querySelector('[data-kch-ready-products]')?.addEventListener('click',()=>document.getElementById('product-grid')?.scrollIntoView({behavior:'smooth',block:'start'}));
}
function kchFlagshipEnhance(){
  kchFlagshipStyles();
  if(current!=='home')return;
  kchFlagshipAssistant();
  kchFlagshipLaunch();
  document.querySelectorAll('.v05-creator-section').forEach(section=>section.setAttribute('aria-label','เรื่องราวจากคุณชายสมุนไพร'));
}
function kchFlagshipSchedule(){if(KCH_FLAGSHIP_FRAME)return;KCH_FLAGSHIP_FRAME=requestAnimationFrame(()=>{KCH_FLAGSHIP_FRAME=0;kchFlagshipEnhance()})}
if(app)new MutationObserver(()=>queueMicrotask(kchFlagshipSchedule)).observe(app,{childList:true,subtree:true});
window.addEventListener('load',kchFlagshipSchedule,{once:true});
window.addEventListener('resize',kchFlagshipSchedule,{passive:true});
