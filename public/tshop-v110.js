/* KHONCHAIHERB Commerce v1.10 — saved-address checkout and address fidelity */
let V110_SELECTED_ADDRESS=0;
let V110_CHECKOUT_REQUEST=0;

function v110AddressLabel(a){return [a.address_line,a.subdistrict,a.district,a.province,a.postal_code].filter(Boolean).join(' ')}
function v110EnsureSubdistrictField(){
  const form=document.querySelector('.checkout-form');if(!form||document.querySelector('#customer-subdistrict'))return;
  const address=document.querySelector('#customer-address');if(address)address.placeholder='บ้านเลขที่ หมู่ ซอย ถนน';
  const districtGrid=form.querySelectorAll('.formgrid')[1];if(districtGrid)districtGrid.insertAdjacentHTML('beforebegin',`<label class="v110-subdistrict-label">ตำบล/แขวง<input id="customer-subdistrict" autocomplete="address-level3" placeholder="ตำบล/แขวง"></label>`);
}
function v110CheckoutFields(){const q=s=>document.querySelector(s);return {name:q('#customer-name'),phone:q('#customer-phone'),addressLine:q('#customer-address'),subdistrict:q('#customer-subdistrict'),district:q('#customer-district'),province:q('#customer-province'),postalCode:q('#customer-postal'),marketing:q('#marketing-consent')}}
function v110FormBlank(){const f=v110CheckoutFields();return ![f.name?.value,f.phone?.value,f.addressLine?.value,f.subdistrict?.value,f.district?.value,f.province?.value,f.postalCode?.value].some(x=>String(x||'').trim())}
function v110AddressBlank(){const f=v110CheckoutFields();return ![f.addressLine?.value,f.subdistrict?.value,f.district?.value,f.province?.value,f.postalCode?.value].some(x=>String(x||'').trim())}
function v110ApplyAddress(a,{profile=null,force=true}={}){
  if(!a)return;v110EnsureSubdistrictField();const f=v110CheckoutFields();
  const set=(el,v)=>{if(el&&(force||!String(el.value||'').trim()))el.value=String(v||'')};
  set(f.name,a.recipient_name||profile?.fullName);set(f.phone,a.phone||profile?.phone);set(f.addressLine,a.address_line);set(f.subdistrict,a.subdistrict);set(f.district,a.district);set(f.province,a.province);set(f.postalCode,a.postal_code);
  V110_SELECTED_ADDRESS=Number(a.id)||0;document.querySelectorAll('[data-v110-address]').forEach(b=>b.classList.toggle('active',Number(b.dataset.v110Address)===V110_SELECTED_ADDRESS));
  const selected=document.querySelector('[data-v110-selected-address]');if(selected)selected.textContent=a.label||'ที่อยู่จัดส่ง';
}
function v110ApplyProfile(c){const f=v110CheckoutFields();if(f.name&&!f.name.value)f.name.value=c?.fullName||'';if(f.phone&&!f.phone.value)f.phone.value=c?.phone||'';if(f.marketing&&c?.marketingConsent)f.marketing.checked=true}
function v110RenderAddressPicker(me){
  const form=document.querySelector('.checkout-form');if(!form||document.querySelector('.v110-address-picker'))return;
  const addresses=me?.addresses||[],def=addresses.find(a=>Number(a.is_default))||addresses[0]||null,applyDefault=Boolean(def&&v110AddressBlank());
  const html=`<section class="v110-address-picker"><div class="v110-address-head"><div>${I('location_on')}<span><b>ที่อยู่จัดส่ง</b><small data-v110-selected-address>${applyDefault?esc(def.label||'ที่อยู่หลัก'):addresses.length?'ที่อยู่อื่น':'ยังไม่มีที่อยู่ที่บันทึกไว้'}</small></span></div>${addresses.length?`<button data-v110-other-address>ใช้ที่อยู่อื่น</button>`:''}</div>${addresses.length?`<div class="v110-address-scroll">${addresses.map(a=>`<button data-v110-address="${a.id}" class="${applyDefault&&Number(def.id)===Number(a.id)?'active':''}"><span><b>${esc(a.label||'ที่อยู่')}</b>${Number(a.is_default)?'<i>ค่าเริ่มต้น</i>':''}</span><strong>${esc(a.recipient_name||me.customer?.fullName||'')}</strong><small>${esc(v110AddressLabel(a))}</small></button>`).join('')}</div>`:`<div class="v110-no-address">${I('add_location_alt')}<span><b>กรอกที่อยู่ครั้งนี้ได้เลย</b><small>เมื่อสั่งซื้อสำเร็จ ระบบจะบันทึกที่อยู่ไว้ในบัญชีเพื่อใช้ครั้งถัดไป</small></span></div>`}</section>`;
  form.insertAdjacentHTML('beforebegin',html);v110ApplyProfile(me.customer);if(applyDefault)v110ApplyAddress(def,{profile:me.customer,force:false});bindV110();
}
async function v110HydrateCheckout(){
  const req=++V110_CHECKOUT_REQUEST;v110EnsureSubdistrictField();
  const me=await v08LoadMe().catch(()=>null);if(req!==V110_CHECKOUT_REQUEST||current!=='checkout')return;
  if(me?.authenticated)v110RenderAddressPicker(me);else V110_SELECTED_ADDRESS=0;
}
const v110CheckoutBase=checkout;
checkout=function(){v110CheckoutBase();if(current==='checkout')setTimeout(v110HydrateCheckout,0)};

function bindV110(){
  document.querySelectorAll('[data-v110-address]').forEach(b=>b.onclick=()=>{const a=V08_ME?.addresses?.find(x=>Number(x.id)===Number(b.dataset.v110Address));if(a)v110ApplyAddress(a,{profile:V08_ME?.customer})});
  const other=document.querySelector('[data-v110-other-address]');if(other&&!other.dataset.v110Bound){other.dataset.v110Bound='1';other.addEventListener('click',()=>{v110EnsureSubdistrictField();const f=v110CheckoutFields();[f.addressLine,f.subdistrict,f.district,f.province,f.postalCode].forEach(x=>{if(x)x.value=''});V110_SELECTED_ADDRESS=0;document.querySelectorAll('[data-v110-address]').forEach(x=>x.classList.remove('active'));const selected=document.querySelector('[data-v110-selected-address]');if(selected)selected.textContent='ที่อยู่อื่น';f.addressLine?.focus()})}
}
const v110BindBase=typeof bind==='function'?bind:null;
bind=function(){if(v110BindBase)v110BindBase();bindV110()};

placeOrder=async function(){
  v110EnsureSubdistrictField();const f=v110CheckoutFields(),name=f.name?.value.trim()||'',phone=f.phone?.value.trim()||'',addressLine=f.addressLine?.value.trim()||'',subdistrict=f.subdistrict?.value.trim()||'',district=f.district?.value.trim()||'',province=f.province?.value.trim()||'',postalCode=f.postalCode?.value.trim()||'',pay=document.querySelector('input[name=pay]:checked')?.value||'COD',marketingConsent=Boolean(f.marketing?.checked),err=document.querySelector('#checkout-error');
  if(name.length<2||phone.replace(/\D/g,'').length<9||addressLine.length<5||district.length<2||province.length<2||!/^[0-9]{5}$/.test(postalCode)){if(err)err.textContent='กรุณากรอกชื่อ โทรศัพท์ ที่อยู่ อำเภอ/เขต จังหวัด และรหัสไปรษณีย์ให้ครบ';return}
  if(cart.some(x=>x.needsVariant)){if(err)err.textContent='มีสินค้าที่ยังไม่ได้เลือกตัวเลือก กรุณากลับไปที่ตะกร้า';return}
  if(err)err.textContent='';const btn=document.querySelector('[data-place]');if(btn){btn.disabled=true;btn.textContent='กำลังยืนยันราคาและสร้างคำสั่งซื้อ...'}
  const attribution=typeof v06CurrentAttr==='function'?v06CurrentAttr():{source:'shop',creatorId:null,contentId:null};
  const payload={idempotencyKey:checkoutKey,customerName:name,phone,marketingConsent,address:{addressLine,subdistrict,district,province,postalCode},paymentMethod:pay,couponCode:activeCoupon,items:v17OrderItemsPayload(),attribution:{source:attribution.source,creatorId:attribution.creatorId,contentId:attribution.contentId}};
  try{
    const data=await api('/api/orders',{method:'POST',body:JSON.stringify(payload)});
    const record={orderNo:data.orderNo,total:Number(data.total||0),subtotal:Number(data.subtotal||0),discount:Number(data.discount||0),shipping:Number(data.shipping||0),paymentMethod:pay,paymentStatus:data.paymentStatus||'unpaid',status:data.status||'pending',fulfillmentStatus:data.fulfillmentStatus||'pending',createdAt:new Date().toISOString(),phone,source:data.attribution?.source||attribution.source,items:cart.map(x=>({id:x.id,variantId:x.variantId||null,name:x.lineName||x.name,qty:x.qty,price:x.price,sku:x.variantSku||x.sku||'',optionName:x.variantOptionName||null,optionValue:x.variantOptionValue||null}))};
    ordersLocal=ordersLocal.filter(o=>o.orderNo!==record.orderNo);ordersLocal.unshift(record);saveOrders();cart=[];save();checkoutKey='';V110_SELECTED_ADDRESS=0;V08_ME_LOADED=false;if(typeof v06ClearAttr==='function')v06ClearAttr();success(record);
  }catch(e){if(err)err.textContent=orderErrorMessage(e);if(btn){btn.disabled=false;btn.textContent='สั่งซื้อสินค้า'}}
};
window.__KCH_V110_CHECKOUT_HELPERS__={addressLabel:v110AddressLabel,formBlank:v110FormBlank,addressBlank:v110AddressBlank};
