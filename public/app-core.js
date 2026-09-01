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