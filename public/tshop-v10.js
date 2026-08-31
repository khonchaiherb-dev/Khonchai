/* KHONCHAIHERB Commerce v1.0 — production center, SKU, inventory, product media and legal access */
const V10_ADMIN=()=>sessionStorage.getItem('kch-admin-token')||'';
const v10AdminFetch=async(url,options={})=>{
  const token=V10_ADMIN();if(!token)throw new Error('no_admin_session');
  const isForm=options.body instanceof FormData;
  const r=await fetch(url,{...options,headers:{Authorization:`Bearer ${token}`,...(isForm?{}:{'Content-Type':'application/json'}),...(options.headers||{})}});
  let d={};try{d=await r.json()}catch{}if(!r.ok){const e=new Error(d.error||`HTTP_${r.status}`);e.data=d;e.status=r.status;throw e}return d;
};
const v10Num=v=>Number(v??0);
const v10Date=s=>{if(!s)return '-';try{return new Intl.DateTimeFormat('th-TH',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Bangkok'}).format(new Date(String(s).includes('T')?s:String(s).replace(' ','T')+'Z'))}catch{return String(s)}};

const v10SellerBase=sellerDashboard;
sellerDashboard=async function(token){
  await v10SellerBase(token);
  if(!document.querySelector('.v10-production')){
    const main=document.querySelector('.sellerMain');
    if(main)main.insertAdjacentHTML('beforeend',`<section class="v10-production">
      <div class="head"><div><h3>Production Center</h3><p>จัดการสินค้า SKU รูปภาพ สต๊อก และประวัติการแก้ไข</p></div><span class="v10-ready">v1.0</span></div>
      <div class="v10-tools">
        <button data-v10-products>${I('inventory_2')}<b>สินค้า & SKU</b><small>เพิ่ม แก้ไข เปิด/ปิดสินค้า</small></button>
        <button data-v10-stock>${I('warehouse')}<b>Stock Center</b><small>ปรับสต๊อกพร้อมบันทึกเหตุผล</small></button>
        <button data-v10-audit>${I('history')}<b>Audit Log</b><small>ตรวจประวัติการเปลี่ยนแปลง</small></button>
      </div>
    </section>`);
  }
};

async function v10ProductsModal(editId=0){
  try{
    const d=await v10AdminFetch('/api/admin/products-manage'),products=d.products||[],variants=d.variants||[],p=products.find(x=>Number(x.id)===Number(editId))||null;
    modal(`<div class="v10-modal"><div class="v10-modal-head"><div><h2>สินค้า & SKU</h2><p>ข้อมูลที่เปิดขายจริงบนหน้าร้าน</p></div><button data-close-modal>${I('close')}</button></div>
      <div class="v10-product-list">${products.map(x=>`<article>
        <div class="v10-thumb">${x.image_url?`<img src="${esc(x.image_url)}" alt="">`:`${I('eco')}`}</div>
        <span><b>${esc(x.name)}</b><small>${esc(x.sku||'-')} • ${esc(x.category||'ไม่ระบุหมวด')}</small><small>${M(x.price)} • สต๊อก ${v10Num(x.stock)} • SKU ย่อย ${v10Num(x.variant_count)}</small></span>
        <i class="${Number(x.active)?'on':'off'}">${Number(x.active)?'เปิดขาย':'ปิดขาย'}</i>
        <div><button data-v10-edit-product="${x.id}">${I('edit')}</button><button data-v10-media="${x.id}">${I('image')}</button><button data-v10-toggle-product="${x.id}">${I(Number(x.active)?'visibility_off':'visibility')}</button></div>
      </article>`).join('')||'<p class="sub">ยังไม่มีสินค้า</p>'}</div>
      <div class="v10-form">
        <h3>${p?'แก้ไขสินค้า':'เพิ่มสินค้าใหม่'}</h3>
        <input type="hidden" id="v10-p-id" value="${p?.id||''}">
        <div class="formgrid"><label>ชื่อสินค้า<input id="v10-p-name" value="${esc(p?.name||'')}"></label><label>SKU หลัก<input id="v10-p-sku" value="${esc(p?.sku||'')}"></label></div>
        <div class="formgrid"><label>Slug<input id="v10-p-slug" value="${esc(p?.slug||'')}" placeholder="herbal-product"></label><label>หมวดสินค้า<input id="v10-p-category" value="${esc(p?.category||'')}"></label></div>
        <label>รายละเอียด<textarea id="v10-p-description" maxlength="4000">${esc(p?.description||'')}</textarea></label>
        <div class="formgrid"><label>ราคาขาย<input id="v10-p-price" type="number" min="0" step="0.01" value="${p?.price??''}"></label><label>ราคาก่อนลด<input id="v10-p-compare" type="number" min="0" step="0.01" value="${p?.compare_at_price??''}"></label></div>
        <div class="formgrid"><label>สต๊อก<input id="v10-p-stock" type="number" min="0" value="${p?.stock??0}"></label><label>เตือนสต๊อกต่ำ<input id="v10-p-low" type="number" min="0" value="${p?.low_stock_threshold??5}"></label></div>
        <div class="formgrid"><label>Barcode<input id="v10-p-barcode" value="${esc(p?.barcode||'')}"></label><label>น้ำหนัก (กรัม)<input id="v10-p-weight" type="number" min="0" value="${p?.weight_grams??0}"></label></div>
        <label>SEO Title<input id="v10-p-seo-title" maxlength="180" value="${esc(p?.seo_title||'')}"></label>
        <label>SEO Description<textarea id="v10-p-seo-desc" maxlength="320">${esc(p?.seo_description||'')}</textarea></label>
        <div class="v10-checks"><label><input id="v10-p-featured" type="checkbox" ${Number(p?.featured)?'checked':''}> สินค้าแนะนำ</label><label><input id="v10-p-active" type="checkbox" ${p?Number(p.active)?'checked':'':'checked'}> เปิดขาย</label></div>
        <div id="v10-product-error" class="form-error"></div>
        <button class="primary" data-v10-save-product>บันทึกสินค้า</button>${p?'<button class="secondary" data-v10-products>ยกเลิกการแก้ไข</button>':''}
      </div>
      ${p?`<section class="v10-variants"><h3>SKU / Variant</h3><div class="v10-variant-list">${variants.filter(v=>Number(v.product_id)===Number(p.id)).map(v=>`<article><span><b>${esc(v.option_name)}: ${esc(v.option_value)}</b><small>${esc(v.sku)} • ${M(v.price)} • สต๊อก ${v.stock}</small></span><i>${Number(v.active)?'เปิด':'ปิด'}</i></article>`).join('')||'<p class="sub">ยังไม่มี SKU ย่อย</p>'}</div><div class="formgrid"><label>SKU<input id="v10-v-sku"></label><label>ชื่อตัวเลือก<input id="v10-v-name" value="รูปแบบ"></label></div><div class="formgrid"><label>ค่าตัวเลือก<input id="v10-v-value" placeholder="เช่น 100 กรัม"></label><label>ราคา<input id="v10-v-price" type="number" min="0" step="0.01" value="${p.price}"></label></div><div class="formgrid"><label>สต๊อก<input id="v10-v-stock" type="number" min="0" value="0"></label><label>เตือนต่ำ<input id="v10-v-low" type="number" min="0" value="5"></label></div><div id="v10-variant-error" class="form-error"></div><button class="secondary" data-v10-save-variant="${p.id}">เพิ่ม SKU / Variant</button></section>`:''}
      <button class="secondary" data-close-modal>ปิด</button></div>`);
  }catch{toast('โหลด Product Manager ไม่สำเร็จ')}
}
async function v10SaveProduct(){
  const q=s=>document.querySelector(s),body={action:'upsert_product',id:Number(q('#v10-p-id')?.value)||null,name:q('#v10-p-name')?.value,sku:q('#v10-p-sku')?.value,slug:q('#v10-p-slug')?.value,category:q('#v10-p-category')?.value,description:q('#v10-p-description')?.value,price:q('#v10-p-price')?.value,compareAtPrice:q('#v10-p-compare')?.value,stock:q('#v10-p-stock')?.value,lowStockThreshold:q('#v10-p-low')?.value,barcode:q('#v10-p-barcode')?.value,weightGrams:q('#v10-p-weight')?.value,seoTitle:q('#v10-p-seo-title')?.value,seoDescription:q('#v10-p-seo-desc')?.value,featured:Boolean(q('#v10-p-featured')?.checked),active:Boolean(q('#v10-p-active')?.checked)},err=q('#v10-product-error');
  try{await v10AdminFetch('/api/admin/products-manage',{method:'POST',body:JSON.stringify(body)});toast('บันทึกสินค้าแล้ว');v10ProductsModal(body.id||0);hydrateCatalog()}catch(e){if(err)err.textContent=e.data?.error==='duplicate_slug_or_sku'?'Slug หรือ SKU ซ้ำกับสินค้าอื่น':'กรุณาตรวจข้อมูลสินค้า'}
}
async function v10ToggleProduct(id){try{await v10AdminFetch('/api/admin/products-manage',{method:'POST',body:JSON.stringify({action:'toggle_product',id:Number(id)})});v10ProductsModal();hydrateCatalog()}catch{toast('เปลี่ยนสถานะสินค้าไม่สำเร็จ')}}
async function v10SaveVariant(productId){
  const q=s=>document.querySelector(s),body={action:'upsert_variant',productId:Number(productId),sku:q('#v10-v-sku')?.value,optionName:q('#v10-v-name')?.value,optionValue:q('#v10-v-value')?.value,price:q('#v10-v-price')?.value,stock:q('#v10-v-stock')?.value,lowStockThreshold:q('#v10-v-low')?.value,active:true},err=q('#v10-variant-error');
  try{await v10AdminFetch('/api/admin/products-manage',{method:'POST',body:JSON.stringify(body)});toast('เพิ่ม SKU / Variant แล้ว');v10ProductsModal(productId)}catch(e){if(err)err.textContent=e.data?.error==='duplicate_variant_sku'?'SKU นี้มีอยู่แล้ว':'กรุณาตรวจข้อมูล SKU / Variant'}
}

async function v10MediaModal(productId){
  try{
    const d=await v10AdminFetch(`/api/admin/product-media?productId=${Number(productId)}`),media=d.media||[];
    modal(`<div class="v10-modal"><div class="v10-modal-head"><div><h2>รูปสินค้า</h2><p>ภาพหลักจะถูกใช้บนหน้าร้านตามลำดับ</p></div><button data-close-modal>${I('close')}</button></div>
      <div class="v10-media-grid">${media.map(m=>`<article><img src="${esc(m.url)}" alt="${esc(m.alt_text||'')}"><small>${esc(m.alt_text||'ไม่มีคำอธิบาย')}</small><button data-v10-delete-media="${m.id}" data-product-id="${productId}">${I('delete')} ลบ</button></article>`).join('')||'<p class="sub">ยังไม่มีรูปสินค้า</p>'}</div>
      <div class="v10-form"><label>เลือกรูป<input id="v10-media-file" type="file" accept="image/jpeg,image/png,image/webp,image/avif"></label><label>คำอธิบายภาพ<input id="v10-media-alt" maxlength="180"></label><label>ลำดับ<input id="v10-media-sort" type="number" value="0"></label><div id="v10-media-error" class="form-error"></div><button class="primary" data-v10-upload-media="${productId}">อัปโหลดรูป</button></div>
      <button class="secondary" data-close-modal>ปิด</button></div>`);
  }catch(e){toast(e.status===503?'ยังไม่ได้เชื่อม PRODUCT_MEDIA_BUCKET บน Cloudflare':'โหลดรูปสินค้าไม่สำเร็จ')}
}
async function v10UploadMedia(productId){
  const file=document.querySelector('#v10-media-file')?.files?.[0],err=document.querySelector('#v10-media-error');if(!file){if(err)err.textContent='กรุณาเลือกรูป';return}
  const fd=new FormData();fd.append('productId',String(productId));fd.append('file',file);fd.append('altText',document.querySelector('#v10-media-alt')?.value||'');fd.append('sortOrder',document.querySelector('#v10-media-sort')?.value||'0');
  try{await v10AdminFetch('/api/admin/product-media',{method:'POST',body:fd});toast('อัปโหลดรูปแล้ว');v10MediaModal(productId);hydrateCatalog()}catch(e){if(err)err.textContent=e.data?.error==='product_media_storage_not_bound'?'ต้องเชื่อม R2 ชื่อ PRODUCT_MEDIA_BUCKET ก่อน':'รองรับ JPG, PNG, WEBP, AVIF ขนาดไม่เกิน 8 MB'}
}
async function v10DeleteMedia(id,productId){if(!confirm('ลบรูปนี้ออกจากสินค้า?'))return;try{await v10AdminFetch('/api/admin/product-media',{method:'DELETE',body:JSON.stringify({id:Number(id)})});v10MediaModal(productId);hydrateCatalog()}catch{toast('ลบรูปไม่สำเร็จ')}}

async function v10StockModal(){
  try{
    const d=await v10AdminFetch('/api/admin/inventory'),products=d.products||[],variants=d.variants||[];
    modal(`<div class="v10-modal"><div class="v10-modal-head"><div><h2>Stock Center</h2><p>ทุกการปรับสต๊อกต้องมีเหตุผลและถูกบันทึก Audit Log</p></div><button data-close-modal>${I('close')}</button></div>
      <div class="v10-stock-list">${products.map(p=>`<article class="${v10Num(p.stock)<=v10Num(p.low_stock_threshold)?'low':''}"><span><b>${esc(p.name)}</b><small>${esc(p.sku||'-')} • เตือนต่ำ ${p.low_stock_threshold}</small></span><strong>${p.stock}</strong><button data-v10-adjust="${p.product_id}" data-current="${p.stock}">ปรับสต๊อก</button>${variants.filter(v=>Number(v.product_id)===Number(p.product_id)).map(v=>`<div class="v10-variant"><small>${esc(v.option_name)}: ${esc(v.option_value)} • ${esc(v.sku)}</small><b>${v.stock}</b><button data-v10-adjust="${p.product_id}" data-variant="${v.id}" data-current="${v.stock}">ปรับ</button></div>`).join('')}</article>`).join('')}</div>
      <button class="secondary" data-close-modal>ปิด</button></div>`);
  }catch{toast('โหลด Stock Center ไม่สำเร็จ')}
}
function v10AdjustModal(productId,variantId=0,current=0){
  modal(`<div class="v10-modal v10-small"><h2>ปรับสต๊อก</h2><p>สต๊อกปัจจุบัน <b>${current}</b></p><label>จำนวนที่เปลี่ยน<input id="v10-stock-delta" type="number" placeholder="+10 หรือ -3"></label><label>เหตุผล<textarea id="v10-stock-reason" maxlength="300" placeholder="เช่น รับสินค้าเข้า / ตรวจนับพบส่วนต่าง / สินค้าชำรุด"></textarea></label><div id="v10-stock-error" class="form-error"></div><button class="primary" data-v10-adjust-submit="${productId}" data-variant="${variantId||''}">ยืนยันการปรับ</button><button class="secondary" data-close-modal>ยกเลิก</button></div>`);
}
async function v10AdjustSubmit(productId,variantId){
  const delta=Number(document.querySelector('#v10-stock-delta')?.value),reason=document.querySelector('#v10-stock-reason')?.value.trim()||'',err=document.querySelector('#v10-stock-error');
  try{await v10AdminFetch('/api/admin/inventory',{method:'POST',body:JSON.stringify({productId:Number(productId),variantId:Number(variantId)||null,delta,reason})});document.querySelector('#kch-modal')?.remove();toast('ปรับสต๊อกแล้ว');v10StockModal();hydrateCatalog()}catch(e){if(err)err.textContent=e.data?.error==='insufficient_stock'?'สต๊อกไม่เพียงพอสำหรับการปรับลด':'กรุณาระบุจำนวนและเหตุผลอย่างน้อย 3 ตัวอักษร'}
}
async function v10AuditModal(){
  try{
    const d=await v10AdminFetch('/api/admin/audit-log?limit=100'),logs=d.logs||[];
    modal(`<div class="v10-modal"><div class="v10-modal-head"><div><h2>Audit Log</h2><p>ประวัติการเปลี่ยนแปลงหลังร้านล่าสุด</p></div><button data-close-modal>${I('close')}</button></div>
      <div class="v10-audit">${logs.map(x=>`<article><i>${I('history')}</i><span><b>${esc(x.action)}</b><small>${esc(x.entity_type)} ${esc(x.entity_id||'')} • ${v10Date(x.created_at)}</small>${x.metadata_json?`<code>${esc(x.metadata_json)}</code>`:''}</span></article>`).join('')||'<p class="sub">ยังไม่มีประวัติ</p>'}</div><button class="secondary" data-close-modal>ปิด</button></div>`);
  }catch{toast('โหลด Audit Log ไม่สำเร็จ')}
}

const v10AccountBase=account;
account=function(){v10AccountBase();const menu=document.querySelector('.acctmenu');if(menu&&!menu.querySelector('[data-v10-privacy]'))menu.insertAdjacentHTML('beforeend',`<button data-v10-privacy>${I('privacy_tip')}<b>นโยบายความเป็นส่วนตัว</b>${I('chevron_right')}</button><button data-v10-terms>${I('gavel')}<b>ข้อกำหนดการใช้บริการ</b>${I('chevron_right')}</button><button data-v10-returns-policy>${I('local_shipping')}<b>การจัดส่งและคืนสินค้า</b>${I('chevron_right')}</button>`)};

if(!window.__v10Bound){
  window.__v10Bound=true;
  document.addEventListener('click',e=>{
    const t=e.target.closest('button,a');if(!t)return;
    if(t.matches('[data-v10-products]')){e.preventDefault();v10ProductsModal();return}
    if(t.matches('[data-v10-edit-product]')){v10ProductsModal(t.dataset.v10EditProduct);return}
    if(t.matches('[data-v10-save-product]')){v10SaveProduct();return}
    if(t.matches('[data-v10-toggle-product]')){v10ToggleProduct(t.dataset.v10ToggleProduct);return}
    if(t.matches('[data-v10-save-variant]')){v10SaveVariant(t.dataset.v10SaveVariant);return}
    if(t.matches('[data-v10-media]')){v10MediaModal(t.dataset.v10Media);return}
    if(t.matches('[data-v10-upload-media]')){v10UploadMedia(t.dataset.v10UploadMedia);return}
    if(t.matches('[data-v10-delete-media]')){v10DeleteMedia(t.dataset.v10DeleteMedia,t.dataset.productId);return}
    if(t.matches('[data-v10-stock]')){v10StockModal();return}
    if(t.matches('[data-v10-adjust]')){v10AdjustModal(t.dataset.v10Adjust,t.dataset.variant,t.dataset.current);return}
    if(t.matches('[data-v10-adjust-submit]')){v10AdjustSubmit(t.dataset.v10AdjustSubmit,t.dataset.variant);return}
    if(t.matches('[data-v10-audit]')){v10AuditModal();return}
    if(t.matches('[data-v10-privacy]')){location.href='/privacy.html';return}
    if(t.matches('[data-v10-terms]')){location.href='/terms.html';return}
    if(t.matches('[data-v10-returns-policy]')){location.href='/shipping-returns.html';return}
  });
}
