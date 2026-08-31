/* KHONCHAIHERB Commerce v1.7 — customer variant/SKU selection and variant-safe cart */
const V17_DETAIL_CACHE=new Map();
const V17_DETAIL_PENDING=new Map();
const V17_SELECTED_VARIANT=new Map();

function v17Variant(v){return {id:Number(v.id),productId:Number(v.product_id||v.productId),sku:String(v.sku||''),optionName:String(v.option_name||v.optionName||'รูปแบบ'),optionValue:String(v.option_value||v.optionValue||'มาตรฐาน'),price:Number(v.price||0),old:Number(v.compare_at_price??v.compareAtPrice??v.price??0),stock:Math.max(0,Number(v.available_stock??v.stock??0))}}
function v17LineKey(x){return `${Number(x?.id||x?.productId||0)}:${Number(x?.variantId||0)}`}
function v17VariantLabel(x){return x?.variantOptionValue?`${x.variantOptionName||'รูปแบบ'}: ${x.variantOptionValue}`:''}
function v17OrderItemsPayload(){return cart.map(x=>{const item={id:Number(x.id),qty:Number(x.qty)||1};if(Number(x.variantId)>0)item.variantId=Number(x.variantId);return item})}

async function v17EnsureDetail(p){
  const id=Number(p?.id);if(!id)return null;
  if(V17_DETAIL_CACHE.has(id))return V17_DETAIL_CACHE.get(id);
  if(V17_DETAIL_PENDING.has(id))return V17_DETAIL_PENDING.get(id);
  const pending=api(`/api/product-detail?id=${id}`).then(d=>{
    const detail=d?.product||null;if(detail){detail.variants=(detail.variants||[]).map(v17Variant);V17_DETAIL_CACHE.set(id,detail)}
    V17_DETAIL_PENDING.delete(id);return detail;
  }).catch(e=>{V17_DETAIL_PENDING.delete(id);throw e});
  V17_DETAIL_PENDING.set(id,pending);return pending;
}
function v17CurrentVariant(p,detail){
  const variants=detail?.variants||[];if(!variants.length)return null;
  let id=Number(V17_SELECTED_VARIANT.get(Number(p.id))||0);
  if(!id&&variants.length===1){id=variants[0].id;V17_SELECTED_VARIANT.set(Number(p.id),id)}
  return variants.find(v=>v.id===id)||null;
}
function v17PriceHtml(v){const off=v.old>v.price?Math.round((1-v.price/v.old)*100):0;return `${M(v.price)}${v.old>v.price?`<small>${M(v.old)}</small><span class="pdp-off">-${off}%</span>`:''}`}
function v17ApplyVariantUI(p,detail,variant){
  const variants=detail?.variants||[];
  document.querySelectorAll('[data-v17-variant]').forEach(b=>b.classList.toggle('active',Number(b.dataset.v17Variant)===Number(variant?.id||0)));
  const selectedText=document.querySelector('[data-v17-selected]');if(selectedText)selectedText.textContent=variant?`${variant.optionName}: ${variant.optionValue}`:variants.length>1?'กรุณาเลือกตัวเลือก':'มาตรฐาน';
  if(variant){
    const price=document.querySelector('.pdp-price');if(price)price.innerHTML=v17PriceHtml(variant);
    const stock=document.querySelector('[data-v17-stock]');if(stock)stock.textContent=`คงเหลือ ${variant.stock}`;
    const addBtn=document.querySelector('.pdp-bottom [data-add]'),buyBtn=document.querySelector('.pdp-bottom [data-buy]');
    [addBtn,buyBtn].forEach(b=>{if(b)b.disabled=variant.stock<=0});if(buyBtn)buyBtn.textContent=variant.stock>0?'ซื้อเลย':'สินค้าหมด';
  }
}
function v17MountVariants(p,detail){
  if(current!=='product'||Number(selected?.id)!==Number(p.id))return;
  document.querySelector('.v17-variant-block')?.remove();
  const variants=detail?.variants||[];if(!variants.length)return;
  const anchor=document.querySelector('.pdp-price-block');if(!anchor)return;
  const selectedVariant=v17CurrentVariant(p,detail);
  anchor.insertAdjacentHTML('afterend',`<section class="pdp-block v17-variant-block"><div class="v17-variant-head"><div><b>ตัวเลือกสินค้า</b><small data-v17-selected>${selectedVariant?`${esc(selectedVariant.optionName)}: ${esc(selectedVariant.optionValue)}`:variants.length>1?'กรุณาเลือกตัวเลือก':'มาตรฐาน'}</small></div><span>${variants.length} ตัวเลือก</span></div><div class="v17-variant-options">${variants.map(v=>`<button data-v17-variant="${v.id}" class="${selectedVariant?.id===v.id?'active':''}" ${v.stock<=0?'disabled':''}><b>${esc(v.optionValue)}</b><small>${M(v.price)} • ${v.stock>0?`เหลือ ${v.stock}`:'หมด'}</small></button>`).join('')}</div><div class="v17-variant-stock" data-v17-stock>${selectedVariant?`คงเหลือ ${selectedVariant.stock}`:'เลือกตัวเลือกเพื่อดูสต๊อก'}</div></section>`);
  v17ApplyVariantUI(p,detail,selectedVariant);
}

function v17AddVariant(p,v,q=1){
  if(!p||!v||v.stock<=0){toast('ตัวเลือกนี้สินค้าหมด');return false}
  const key=`${Number(p.id)}:${Number(v.id)}`,hit=cart.find(x=>v17LineKey(x)===key),next=Math.min(v.stock,(Number(hit?.qty)||0)+Math.max(1,Number(q)||1));
  const line={...p,lineKey:key,variantId:v.id,variantSku:v.sku,variantOptionName:v.optionName,variantOptionValue:v.optionValue,lineName:`${p.name} • ${v.optionValue}`,price:v.price,old:v.old,stock:v.stock,needsVariant:false};
  if(hit)Object.assign(hit,line,{qty:next});else cart.push({...line,qty:Math.min(Math.max(1,Number(q)||1),v.stock)});
  save();document.querySelectorAll('.badge').forEach(x=>x.textContent=count());toast(`เพิ่ม ${p.name} • ${v.optionValue} ลงตะกร้าแล้ว`);return true;
}
const v17LegacyAdd=add;
add=function(id,q=1,variantId=null){
  const p=PRODUCTS.find(x=>Number(x.id)===Number(id));if(!p)return false;
  const detail=V17_DETAIL_CACHE.get(Number(p.id));
  if(detail?.variants?.length){
    const v=detail.variants.find(x=>x.id===Number(variantId||V17_SELECTED_VARIANT.get(Number(p.id))||0))||(detail.variants.length===1?detail.variants[0]:null);
    if(!v){toast('กรุณาเลือกตัวเลือกสินค้า');return false}
    V17_SELECTED_VARIANT.set(Number(p.id),v.id);return v17AddVariant(p,v,q);
  }
  const before=count();v17LegacyAdd(id,q);return count()>before||cart.some(x=>Number(x.id)===Number(id));
};
async function v17Purchase(id,q=1,buyNow=false,explicitVariantId=null){
  const p=PRODUCTS.find(x=>Number(x.id)===Number(id));if(!p)return false;
  let detail=null;try{detail=await v17EnsureDetail(p)}catch{}
  const variants=detail?.variants||[];
  if(!variants.length){const ok=add(p.id,q);if(ok!==false&&buyNow)checkout();return ok!==false}
  let variant=variants.find(v=>v.id===Number(explicitVariantId||V17_SELECTED_VARIANT.get(Number(p.id))||0));
  if(!variant&&variants.length===1)variant=variants[0];
  if(!variant){if(current!=='product'||Number(selected?.id)!==Number(p.id))product(p);toast('สินค้านี้มีหลายตัวเลือก กรุณาเลือกก่อนสั่งซื้อ');return false}
  V17_SELECTED_VARIANT.set(Number(p.id),variant.id);const ok=v17AddVariant(p,variant,q);if(ok&&buyNow)checkout();return ok;
}

const v17ProductBase=product;
product=function(p){
  v17ProductBase(p);
  const addBtn=document.querySelector('.pdp-bottom [data-add]'),buyBtn=document.querySelector('.pdp-bottom [data-buy]');
  if(addBtn)addBtn.dataset.v17Loading='1';if(buyBtn)buyBtn.dataset.v17Loading='1';
  v17EnsureDetail(p).then(detail=>{if(addBtn)delete addBtn.dataset.v17Loading;if(buyBtn)delete buyBtn.dataset.v17Loading;v17MountVariants(p,detail)}).catch(()=>{if(addBtn)delete addBtn.dataset.v17Loading;if(buyBtn)delete buyBtn.dataset.v17Loading});
};

function v17CartPage(){
  current='cart';const sum=subtotal(),ship=shippingInfo(sum),ambiguous=cart.filter(x=>x.needsVariant),canCheckout=cart.length&&!ambiguous.length;
  app.innerHTML=chrome(`<main class="page v17-cart"><h1 class="page-title">ตะกร้าสินค้า</h1>${cart.length?`<section class="shipping-progress"><div><b>${ship.remaining?`อีก ${M(ship.remaining)} รับสิทธิ์ส่งฟรี`:'คุณได้รับสิทธิ์ส่งฟรีแล้ว'}</b><small>ส่งฟรีเมื่อยอดสินค้าครบ ${M(ship.threshold)}</small></div><div class="progress"><i style="width:${ship.progress}%"></i></div></section>`:''}${cart.length?cart.map(x=>{const key=v17LineKey(x),variant=v17VariantLabel(x);return `<div class="cartrow v17-cartrow ${x.needsVariant?'needs-variant':''}">${visual(x)}<div class="grow"><b>${esc(x.name)}</b>${variant?`<span class="v17-line-variant">${esc(variant)}</span>`:''}${x.needsVariant?'<span class="v17-line-warning">ต้องเลือกตัวเลือกสินค้าก่อน Checkout</span>':''}<strong>${M(x.price)}</strong><div class="cart-controls"><div class="qty"><button data-v17-cartqty="${esc(key)}" data-delta="-1">−</button><b>${x.qty}</b><button data-v17-cartqty="${esc(key)}" data-delta="1">+</button></div><button class="remove" data-v17-remove="${esc(key)}" aria-label="ลบสินค้า">${I('delete')}</button></div></div></div>`}).join(''):`<div class="empty">${I('shopping_bag')}<h2>ยังไม่มีสินค้าในตะกร้า</h2><button class="primary" data-go="home">เลือกซื้อสินค้า</button></div>`}${cart.length?`<section class="voucher-box"><div class="voucher-title">${I('confirmation_number')}<b>คูปองร้านค้า</b></div>${claimed.length?claimed.map(code=>{const c=COUPONS.find(x=>x.code===code)||{code,label:code,min_spend:0};return `<label class="voucher-choice"><input type="radio" name="coupon" value="${esc(code)}" ${activeCoupon===code?'checked':''}><span><b>${esc(c.label||code)}</b><small>${esc(code)} • ขั้นต่ำ ${M(c.min_spend||0)}</small></span></label>`}).join(''):`<p class="sub">ยังไม่มีคูปองที่เก็บไว้</p>`}${activeCoupon?`<button class="clear-coupon" data-clear-coupon>ไม่ใช้คูปอง</button>`:''}</section><div class="summary"><div><span>ยอดสินค้า</span><b>${M(sum)}</b></div><div><span>ค่าจัดส่งโดยประมาณ</span><b>${ship.ship?M(ship.ship):'ฟรี'}</b></div></div><div class="sticky-pay"><span>รวมโดยประมาณ <b>${M(sum+ship.ship)}</b></span>${canCheckout?`<button class="primary" data-go="checkout">ชำระเงิน (${count()})</button>`:`<button class="primary" data-v17-resolve-cart>เลือกตัวเลือกให้ครบ</button>`}</div>`:''}</main>`,'cart');bind();
}
cartPage=v17CartPage;

const v17CheckoutBase=checkout;
checkout=function(){if(cart.some(x=>x.needsVariant)){cartPage();toast('กรุณาเลือกตัวเลือกสินค้าให้ครบก่อนชำระเงิน');return}v17CheckoutBase();setTimeout(v17DecorateCheckout,0)};
function v17DecorateCheckout(){document.querySelectorAll('.box .mini').forEach((row,i)=>{const x=cart[i],label=v17VariantLabel(x);if(x&&label&&!row.querySelector('.v17-checkout-variant')){const title=row.querySelector('div>b');title?.insertAdjacentHTML('afterend',`<small class="v17-checkout-variant">${esc(label)} • SKU ${esc(x.variantSku||'')}</small>`)}})}

const v17OrderErrorBase=orderErrorMessage;
orderErrorMessage=function(e){const code=e?.data?.error;if(code==='variant_unavailable')return 'ตัวเลือกสินค้านี้ไม่พร้อมจำหน่าย กรุณาเลือกใหม่';if(code==='insufficient_stock'&&e?.data?.variantId)return `สต๊อกตัวเลือกสินค้าไม่เพียงพอ${e.data.available!=null?` (เหลือ ${e.data.available})`:''}`;return v17OrderErrorBase(e)};
placeOrder=async function(){
  const el=id=>document.querySelector(id),name=el('#customer-name')?.value.trim()||'',phone=el('#customer-phone')?.value.trim()||'',addressLine=el('#customer-address')?.value.trim()||'',district=el('#customer-district')?.value.trim()||'',province=el('#customer-province')?.value.trim()||'',postalCode=el('#customer-postal')?.value.trim()||'',pay=document.querySelector('input[name=pay]:checked')?.value||'COD',marketingConsent=Boolean(el('#marketing-consent')?.checked),err=el('#checkout-error');
  if(name.length<2||phone.replace(/\D/g,'').length<9||addressLine.length<5||district.length<2||province.length<2||!/^[0-9]{5}$/.test(postalCode)){if(err)err.textContent='กรุณากรอกชื่อ โทรศัพท์ ที่อยู่ อำเภอ/เขต จังหวัด และรหัสไปรษณีย์ให้ครบ';return}
  if(cart.some(x=>x.needsVariant)){if(err)err.textContent='มีสินค้าที่ยังไม่ได้เลือกตัวเลือก กรุณากลับไปที่ตะกร้า';return}
  if(err)err.textContent='';const btn=document.querySelector('[data-place]');if(btn){btn.disabled=true;btn.textContent='กำลังยืนยันราคาและสร้างคำสั่งซื้อ...'}
  const attribution=typeof v06CurrentAttr==='function'?v06CurrentAttr():{source:'shop',creatorId:null,contentId:null};
  const payload={idempotencyKey:checkoutKey,customerName:name,phone,marketingConsent,address:{addressLine,district,province,postalCode},paymentMethod:pay,couponCode:activeCoupon,items:v17OrderItemsPayload(),attribution:{source:attribution.source,creatorId:attribution.creatorId,contentId:attribution.contentId}};
  try{
    const data=await api('/api/orders',{method:'POST',body:JSON.stringify(payload)});
    const record={orderNo:data.orderNo,total:Number(data.total||0),subtotal:Number(data.subtotal||0),discount:Number(data.discount||0),shipping:Number(data.shipping||0),paymentMethod:pay,paymentStatus:data.paymentStatus||'unpaid',status:data.status||'pending',fulfillmentStatus:data.fulfillmentStatus||'pending',createdAt:new Date().toISOString(),phone,source:data.attribution?.source||attribution.source,items:cart.map(x=>({id:x.id,variantId:x.variantId||null,name:x.lineName||x.name,qty:x.qty,price:x.price}))};
    ordersLocal=ordersLocal.filter(o=>o.orderNo!==record.orderNo);ordersLocal.unshift(record);saveOrders();cart=[];save();checkoutKey='';if(typeof v06ClearAttr==='function')v06ClearAttr();success(record);
  }catch(e){if(err)err.textContent=orderErrorMessage(e);if(btn){btn.disabled=false;btn.textContent='สั่งซื้อสินค้า'}}
};

async function v17MigrateCart(){
  let changed=false;
  for(const x of cart){
    if(Number(x.variantId)>0){x.lineKey=v17LineKey(x);continue}
    const p=PRODUCTS.find(p=>Number(p.id)===Number(x.id));if(!p)continue;
    let detail=null;try{detail=await v17EnsureDetail(p)}catch{continue}
    const variants=detail?.variants||[];
    if(variants.length===1){const v=variants[0];Object.assign(x,{variantId:v.id,variantSku:v.sku,variantOptionName:v.optionName,variantOptionValue:v.optionValue,lineName:`${p.name} • ${v.optionValue}`,lineKey:`${p.id}:${v.id}`,price:v.price,old:v.old,stock:v.stock,needsVariant:false});changed=true}
    else if(variants.length>1&&!x.needsVariant){x.needsVariant=true;x.lineKey=`${p.id}:0`;changed=true}
  }
  if(changed){save();if(current==='cart')cartPage()}
}

document.addEventListener('click',e=>{
  const variant=e.target.closest?.('[data-v17-variant]');if(variant){const p=selected,detail=p&&V17_DETAIL_CACHE.get(Number(p.id)),v=detail?.variants?.find(x=>x.id===Number(variant.dataset.v17Variant));if(p&&v){V17_SELECTED_VARIANT.set(Number(p.id),v.id);v17ApplyVariantUI(p,detail,v)}return}
  const qtyBtn=e.target.closest?.('[data-v17-cartqty]');if(qtyBtn){const key=qtyBtn.dataset.v17Cartqty,x=cart.find(i=>v17LineKey(i)===key);if(!x)return;x.qty=Math.max(0,Math.min(Number(x.stock||99),Number(x.qty||0)+Number(qtyBtn.dataset.delta||0)));if(x.qty<=0)cart=cart.filter(i=>v17LineKey(i)!==key);save();cartPage();return}
  const remove=e.target.closest?.('[data-v17-remove]');if(remove){cart=cart.filter(i=>v17LineKey(i)!==remove.dataset.v17Remove);save();cartPage();return}
  const resolve=e.target.closest?.('[data-v17-resolve-cart]');if(resolve){const x=cart.find(i=>i.needsVariant),p=x&&PRODUCTS.find(p=>Number(p.id)===Number(x.id));if(p){product(p);toast('เลือกตัวเลือกสินค้า แล้วเพิ่มลงตะกร้าอีกครั้ง')}return}
});

window.__KCH_VARIANT_HELPERS__={lineKey:v17LineKey,orderItems:v17OrderItemsPayload,variantLabel:v17VariantLabel};
setTimeout(()=>v17MigrateCart().catch(()=>{}),120);
