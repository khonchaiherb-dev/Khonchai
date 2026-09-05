(()=>{
  'use strict';

  const CART_KEY='kch-cart';
  const ORDER_KEY='kch-last-order';
  const state={
    products:[],
    filtered:[],
    category:'ทั้งหมด',
    query:'',
    cart:[],
    detail:null,
    selectedVariant:null,
    payment:{checkoutEnabled:false,codEnabled:false},
    placing:false
  };

  const $=(sel,root=document)=>root.querySelector(sel);
  const $$=(sel,root=document)=>[...root.querySelectorAll(sel)];
  const esc=(v='')=>String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const num=v=>Number(v)||0;
  const money=v=>new Intl.NumberFormat('th-TH',{style:'currency',currency:'THB',minimumFractionDigits:0,maximumFractionDigits:2}).format(num(v));
  const icon=name=>`<svg aria-hidden="true" focusable="false"><use href="#i-${esc(name)}"></use></svg>`;
  const uuid=()=>crypto?.randomUUID?.()||`kch-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  function productImage(p){
    if(p?.image_url)return p.image_url;
    if(p?.media?.[0]?.url)return p.media[0].url;
    if(String(p?.slug||'').includes('rang-jued'))return '/assets/products/rang-jued-tea-360.webp';
    return '/assets/products/rang-jued-tea-360.webp';
  }

  function normalizeLine(raw){
    const id=Number(raw?.id);
    if(!Number.isInteger(id)||id<=0)return null;
    return {
      id,
      slug:String(raw.slug||''),
      name:String(raw.name||'สินค้า'),
      category:String(raw.category||raw.cat||''),
      price:num(raw.price),
      image_url:String(raw.image_url||raw.image||''),
      stock:Math.max(0,num(raw.stock||raw.available_stock)),
      qty:Math.max(1,Math.min(20,Number(raw.qty)||1)),
      variantId:raw.variantId?Number(raw.variantId):null,
      variantLabel:String(raw.variantLabel||'')
    };
  }

  function loadCart(){
    try{
      const rows=JSON.parse(localStorage.getItem(CART_KEY)||'[]');
      state.cart=Array.isArray(rows)?rows.map(normalizeLine).filter(Boolean):[];
    }catch{state.cart=[]}
  }
  function saveCart(){
    localStorage.setItem(CART_KEY,JSON.stringify(state.cart));
    renderCartBadge();
  }
  function cartCount(){return state.cart.reduce((n,x)=>n+x.qty,0)}
  function cartSubtotal(){return state.cart.reduce((n,x)=>n+x.price*x.qty,0)}
  function cartKey(line){return `${line.id}:${line.variantId||0}`}

  async function api(url,options={}){
    const res=await fetch(url,{headers:{'content-type':'application/json',...(options.headers||{})},...options});
    const data=await res.json().catch(()=>({}));
    if(!res.ok){const err=new Error(data.error||`http_${res.status}`);err.status=res.status;err.data=data;throw err}
    return data;
  }

  function renderCartBadge(){
    const n=cartCount();
    $$('[data-cart-count]').forEach(el=>{el.textContent=String(n);el.hidden=n===0});
    $$('[data-cart-label]').forEach(el=>el.textContent=n?`ตะกร้า (${n})`:'ตะกร้า');
  }

  function setHeroProduct(){
    const hero=state.products[0];
    const image=$('[data-hero-image]');
    const badge=$('[data-hero-product]');
    if(!hero||!image||!badge)return;
    image.src=productImage(hero);
    image.alt=hero.name||'สินค้าคุณชายสมุนไพร';
    badge.innerHTML=`<strong>${esc(hero.name)}</strong><span>${money(hero.price)} • พร้อมสั่งซื้อ</span>`;
  }

  function categories(){
    return ['ทั้งหมด',...new Set(state.products.map(p=>String(p.category||'').trim()).filter(Boolean))];
  }
  function renderCategories(){
    const row=$('[data-category-row]');
    if(!row)return;
    row.innerHTML=categories().map(cat=>`<button class="kch-category${cat===state.category?' is-active':''}" type="button" data-category="${esc(cat)}">${esc(cat)}</button>`).join('');
  }

  function filterProducts(){
    const q=state.query.trim().toLocaleLowerCase('th-TH');
    state.filtered=state.products.filter(p=>{
      const inCategory=state.category==='ทั้งหมด'||String(p.category||'')===state.category;
      if(!inCategory)return false;
      if(!q)return true;
      return `${p.name||''} ${p.category||''} ${p.sku||''}`.toLocaleLowerCase('th-TH').includes(q);
    });
    renderProducts();
  }

  function card(p){
    const stock=Math.max(0,num(p.stock));
    return `<article class="kch-product-card" data-product-card="${esc(p.slug)}">
      <button class="kch-product-media" type="button" data-open-product="${esc(p.slug)}" aria-label="ดูรายละเอียด ${esc(p.name)}">
        <span class="kch-product-status">พร้อมสั่งซื้อ</span>
        <img src="${esc(productImage(p))}" alt="${esc(p.name)}" loading="lazy" decoding="async">
      </button>
      <div class="kch-product-body">
        <span class="kch-product-category">${esc(p.category||'ผลิตภัณฑ์สมุนไพร')}</span>
        <h3 class="kch-product-title"><button type="button" data-open-product="${esc(p.slug)}">${esc(p.name)}</button></h3>
        <div class="kch-product-price"><strong>${money(p.price)}</strong><span>รวมภาษีตามเงื่อนไขร้าน</span></div>
        <div class="kch-product-actions">
          <button class="kch-add" type="button" data-add-product="${p.id}" ${stock<=0?'disabled':''}>เพิ่มลงตะกร้า</button>
          <button class="kch-buy" type="button" data-buy-product="${p.id}" ${stock<=0?'disabled':''}>ซื้อเลย</button>
        </div>
      </div>
    </article>`;
  }

  function renderProducts(){
    const grid=$('[data-product-grid]');
    const count=$('[data-product-count]');
    if(!grid)return;
    if(count)count.textContent=`${state.filtered.length} รายการพร้อมจำหน่าย`;
    if(!state.filtered.length){
      grid.innerHTML=`<div class="kch-empty"><div>${icon('search')}<strong>ไม่พบสินค้าที่ตรงกับการค้นหา</strong><span>ลองเปลี่ยนคำค้นหาหรือเลือกหมวด “ทั้งหมด”</span></div></div>`;
      return;
    }
    grid.innerHTML=state.filtered.map(card).join('');
  }

  function renderCatalogError(){
    const grid=$('[data-product-grid]');
    if(grid)grid.innerHTML=`<div class="kch-empty"><div><strong>ยังโหลดรายการสินค้าไม่ได้</strong><span>กรุณาลองรีเฟรชอีกครั้ง ระบบจะไม่แสดงสินค้าที่ไม่ได้ยืนยันสถานะขาย</span></div></div>`;
    const count=$('[data-product-count]');if(count)count.textContent='กำลังตรวจสอบสถานะสินค้า';
  }

  async function loadCatalog(){
    try{
      const data=await api('/api/products');
      state.products=Array.isArray(data.products)?data.products.filter(p=>num(p.price)>0&&num(p.stock)>0):[];
      state.filtered=[...state.products];
      renderCategories();
      renderProducts();
      setHeroProduct();
      reconcileCart();
    }catch(err){
      console.error('catalog_load_failed',err);
      renderCatalogError();
    }
  }

  function reconcileCart(){
    if(!state.products.length){renderCartBadge();return}
    const live=new Map(state.products.map(p=>[Number(p.id),p]));
    const next=[];
    for(const line of state.cart){
      const p=live.get(line.id);
      if(!p)continue;
      line.name=p.name;
      line.slug=p.slug;
      line.category=p.category||line.category;
      if(!line.variantId)line.price=num(p.price);
      line.image_url=productImage(p);
      line.stock=Math.max(0,num(p.stock));
      line.qty=Math.min(line.qty,Math.max(1,line.stock));
      next.push(line);
    }
    state.cart=next;
    saveCart();
  }

  async function loadPaymentOptions(){
    try{
      const data=await api('/api/payment-options');
      const cod=(data.capabilities||[]).find(x=>x.id==='COD');
      state.payment={checkoutEnabled:Boolean(data.checkoutEnabled),codEnabled:Boolean(cod?.enabled)};
      $$('[data-cod-status]').forEach(el=>el.textContent=state.payment.codEnabled?'เก็บเงินปลายทางพร้อมใช้งาน':'กำลังตรวจสอบช่องทางชำระเงิน');
    }catch{
      state.payment={checkoutEnabled:false,codEnabled:false};
    }
  }

  function addLine(p,{qty=1,variant=null}={}){
    if(!p||num(p.price)<=0)return;
    const variantId=variant?.id?Number(variant.id):null;
    const line={
      id:Number(p.id),slug:p.slug,name:p.name,category:p.category||'',
      price:num(variant?.price||p.price),image_url:productImage(p),
      stock:Math.max(0,num(variant?.available_stock??variant?.stock??p.available_stock??p.stock)),
      qty:Math.max(1,qty),variantId,
      variantLabel:variant?`${variant.option_name||''}${variant.option_value?`: ${variant.option_value}`:''}`:''
    };
    const key=cartKey(line),hit=state.cart.find(x=>cartKey(x)===key);
    const max=Math.max(1,Math.min(20,line.stock||20));
    if(hit){hit.qty=Math.min(max,hit.qty+qty);hit.price=line.price;hit.stock=line.stock}
    else{line.qty=Math.min(max,line.qty);state.cart.push(line)}
    saveCart();
    renderCart();
    toast('เพิ่มสินค้าในตะกร้าแล้ว');
  }

  function addFromCatalog(id,buyNow=false){
    const p=state.products.find(x=>Number(x.id)===Number(id));
    if(!p)return;
    addLine(p);
    if(buyNow)openCheckout();else openCart();
  }

  function renderCart(){
    const body=$('[data-cart-body]'),foot=$('[data-cart-foot]');
    if(!body||!foot)return;
    if(!state.cart.length){
      body.innerHTML=`<div class="kch-cart-empty"><div>${icon('bag')}<strong>ตะกร้ายังว่าง</strong><span>เลือกสินค้าที่พร้อมจำหน่ายจากหน้าร้านได้ทันที</span></div></div>`;
      foot.innerHTML=`<button class="kch-btn kch-btn-primary" type="button" data-close-cart data-scroll-shop>เลือกซื้อสินค้า</button>`;
      return;
    }
    body.innerHTML=state.cart.map(line=>`<div class="kch-cart-line" data-cart-line="${esc(cartKey(line))}">
      <div class="kch-cart-media"><img src="${esc(line.image_url||'/assets/products/rang-jued-tea-360.webp')}" alt="${esc(line.name)}"></div>
      <div class="kch-cart-copy">
        <strong>${esc(line.name)}</strong>
        <small>${esc(line.variantLabel||line.category||'ผลิตภัณฑ์สมุนไพร')}</small>
        <div class="kch-cart-price">${money(line.price*line.qty)}</div>
        <div class="kch-cart-controls">
          <div class="kch-qty" aria-label="จำนวนสินค้า">
            <button type="button" data-cart-qty="${esc(cartKey(line))}" data-delta="-1" aria-label="ลดจำนวน">−</button>
            <span>${line.qty}</span>
            <button type="button" data-cart-qty="${esc(cartKey(line))}" data-delta="1" aria-label="เพิ่มจำนวน">+</button>
          </div>
          <button class="kch-remove" type="button" data-remove-line="${esc(cartKey(line))}">ลบ</button>
        </div>
      </div>
    </div>`).join('');
    foot.innerHTML=`<div class="kch-cart-summary"><span>ยอดสินค้า</span><strong>${money(cartSubtotal())}</strong></div>
      <button class="kch-btn kch-btn-primary" type="button" data-start-checkout ${!state.payment.checkoutEnabled||!state.payment.codEnabled?'disabled':''}>ดำเนินการชำระเงิน</button>
      <div class="kch-cart-note">ค่าจัดส่งและยอดสุดท้ายจะตรวจสอบจากระบบก่อนสร้างคำสั่งซื้อ</div>`;
  }

  function changeQty(key,delta){
    const line=state.cart.find(x=>cartKey(x)===key);if(!line)return;
    if(delta<0&&line.qty<=1){state.cart=state.cart.filter(x=>cartKey(x)!==key)}
    else line.qty=Math.max(1,Math.min(Math.max(1,line.stock||20),line.qty+delta));
    saveCart();renderCart();
  }
  function removeLine(key){state.cart=state.cart.filter(x=>cartKey(x)!==key);saveCart();renderCart()}

  function openCart(){renderCart();openLayer('cart')}
  function closeCart(){closeLayer('cart')}

  async function openProduct(slug){
    if(!slug)return;
    const card=state.products.find(p=>p.slug===slug);
    const modal=$('[data-product-modal]');
    const content=$('[data-product-detail]');
    if(!modal||!content)return;
    content.innerHTML=`<div class="kch-loading"><div><div class="kch-skeleton"></div><strong>กำลังโหลดรายละเอียดสินค้า</strong></div></div>`;
    openLayer('product');
    try{
      const data=await api(`/api/product-detail?slug=${encodeURIComponent(slug)}`);
      state.detail=data.product;
      const inStock=(state.detail.variants||[]).filter(v=>num(v.available_stock)>0&&num(v.price)>0);
      state.selectedVariant=inStock[0]||null;
      renderProductDetail();
    }catch(err){
      console.error('product_detail_failed',err);
      state.detail=card||null;state.selectedVariant=null;
      renderProductDetail(true);
    }
  }

  function renderProductDetail(degraded=false){
    const p=state.detail,root=$('[data-product-detail]');if(!root)return;
    if(!p){root.innerHTML=`<div class="kch-empty"><div><strong>ไม่พบข้อมูลสินค้า</strong><span>กรุณากลับไปเลือกสินค้าจากหน้าร้าน</span></div></div>`;return}
    const variants=Array.isArray(p.variants)?p.variants.filter(v=>num(v.available_stock)>0&&num(v.price)>0):[];
    const selected=state.selectedVariant;
    const price=num(selected?.price||p.price);
    const available=Math.max(0,num(selected?.available_stock??p.available_stock??p.stock));
    root.innerHTML=`<div class="kch-product-detail">
      <div class="kch-detail-media"><img src="${esc(productImage(p))}" alt="${esc(p.name)}"></div>
      <div class="kch-detail-copy">
        <span class="kch-detail-category">${esc(p.category||'ผลิตภัณฑ์สมุนไพร')}</span>
        <h2>${esc(p.name)}</h2>
        <p class="kch-detail-desc">${esc(p.description||'รายละเอียดสินค้าจะแสดงตามข้อมูลที่ได้รับการยืนยันจากร้าน')}</p>
        <div class="kch-detail-price">${money(price)}</div>
        <div class="kch-detail-stock">${available>0?'พร้อมสั่งซื้อ':'ไม่พร้อมจำหน่ายชั่วคราว'}</div>
        ${variants.length?`<div class="kch-variant-wrap"><strong>ตัวเลือกสินค้า</strong><div class="kch-variants">${variants.map(v=>`<button type="button" class="kch-variant${selected&&Number(selected.id)===Number(v.id)?' is-active':''}" data-variant="${v.id}">${esc(v.option_value||v.option_name||'ตัวเลือก')}</button>`).join('')}</div></div>`:''}
        ${degraded?'<div class="kch-assure">ข้อมูลรายละเอียดบางส่วนกำลังเชื่อมต่อ แต่ราคาหน้าร้านยังมาจากสินค้าที่เปิดขายจริง</div>':''}
        <div class="kch-detail-assurance">
          <div class="kch-assure">${icon('truck')}<span>รองรับการจัดส่งทั่วประเทศ</span></div>
          <div class="kch-assure">${icon('shield')}<span>ตรวจสอบคำสั่งซื้อบนเซิร์ฟเวอร์</span></div>
        </div>
        <div class="kch-detail-actions">
          <button class="kch-btn kch-btn-ghost" type="button" data-detail-add ${available<=0?'disabled':''}>เพิ่มลงตะกร้า</button>
          <button class="kch-btn kch-btn-primary" type="button" data-detail-buy ${available<=0?'disabled':''}>ซื้อเลย</button>
        </div>
      </div>
    </div>`;
  }

  function chooseVariant(id){
    const p=state.detail;if(!p)return;
    const v=(p.variants||[]).find(x=>Number(x.id)===Number(id));
    if(v&&num(v.available_stock)>0){state.selectedVariant=v;renderProductDetail()}
  }

  function addDetail(buyNow=false){
    const p=state.detail;if(!p)return;
    addLine(p,{variant:state.selectedVariant});
    closeLayer('product');
    if(buyNow)openCheckout();else openCart();
  }

  function checkoutMarkup(){
    const sub=cartSubtotal();
    return `<div class="kch-checkout-head"><span>SECURE CHECKOUT</span><h2>ยืนยันคำสั่งซื้อ</h2></div>
      <div class="kch-checkout-body">
        <div class="kch-progress" aria-label="ขั้นตอนการสั่งซื้อ">
          <div class="is-active"><b>1</b><span>ข้อมูลจัดส่ง</span></div>
          <div class="is-active"><b>2</b><span>เก็บเงินปลายทาง</span></div>
          <div><b>3</b><span>ยืนยันคำสั่งซื้อ</span></div>
        </div>
        <section class="kch-form-section">
          <h3>ข้อมูลผู้รับและที่อยู่จัดส่ง</h3>
          <div class="kch-form-grid">
            <div class="kch-field"><label for="customer-name">ชื่อ-นามสกุล</label><input id="customer-name" autocomplete="name" placeholder="ชื่อผู้รับ"></div>
            <div class="kch-field"><label for="customer-phone">โทรศัพท์</label><input id="customer-phone" inputmode="tel" autocomplete="tel" placeholder="08X-XXX-XXXX"></div>
          </div>
          <div class="kch-field kch-field-full"><label for="customer-address">ที่อยู่</label><textarea id="customer-address" autocomplete="street-address" placeholder="บ้านเลขที่ หมู่ ถนน"></textarea></div>
          <div class="kch-form-grid" style="margin-top:12px">
            <div class="kch-field"><label for="customer-subdistrict">ตำบล/แขวง</label><input id="customer-subdistrict" autocomplete="address-level3" placeholder="ตำบล/แขวง"></div>
            <div class="kch-field"><label for="customer-district">อำเภอ/เขต</label><input id="customer-district" autocomplete="address-level2" placeholder="อำเภอ/เขต"></div>
            <div class="kch-field"><label for="customer-province">จังหวัด</label><input id="customer-province" autocomplete="address-level1" placeholder="จังหวัด"></div>
            <div class="kch-field"><label for="customer-postal">รหัสไปรษณีย์</label><input id="customer-postal" inputmode="numeric" autocomplete="postal-code" maxlength="5" placeholder="XXXXX"></div>
          </div>
          <label class="kch-consent"><input type="checkbox" id="marketing-consent"><span>ฉันต้องการรับข่าวสารและสิทธิพิเศษจาก KHONCHAIHERB (ไม่บังคับ)</span></label>
        </section>
        <section class="kch-form-section">
          <h3>วิธีชำระเงิน</h3>
          <div class="kch-payment-option">
            <div class="kch-payment-icon">${icon('cash')}</div>
            <div class="kch-payment-copy"><strong>เก็บเงินปลายทาง (COD)</strong><span>${state.payment.codEnabled?'ชำระเมื่อได้รับสินค้า':'ช่องทางนี้ยังไม่พร้อมใช้งาน'}</span></div>
          </div>
        </section>
        <section class="kch-form-section">
          <h3>สรุปก่อนยืนยัน</h3>
          <div class="kch-order-review">
            <div class="kch-review-row"><span>จำนวนสินค้า</span><strong>${cartCount()} ชิ้น</strong></div>
            <div class="kch-review-row"><span>ยอดสินค้า</span><strong>${money(sub)}</strong></div>
            <div class="kch-review-row"><span>ค่าจัดส่ง / ส่วนลด</span><strong>ระบบยืนยันเมื่อสร้างคำสั่งซื้อ</strong></div>
          </div>
        </section>
        <div class="kch-checkout-error" data-checkout-error role="alert"></div>
        <div class="kch-checkout-actions">
          <button class="kch-btn kch-btn-ghost" type="button" data-back-cart>กลับตะกร้า</button>
          <button class="kch-btn kch-btn-primary" type="button" data-place-order ${!state.payment.checkoutEnabled||!state.payment.codEnabled?'disabled':''}>สั่งซื้อสินค้า</button>
        </div>
      </div>`;
  }

  async function openCheckout(){
    if(!state.cart.length){openCart();return}
    await loadPaymentOptions();
    closeCart();
    const root=$('[data-checkout-content]');
    if(root)root.innerHTML=checkoutMarkup();
    openLayer('checkout');
    try{
      await api('/api/checkout-session',{method:'POST',body:JSON.stringify({items:state.cart.map(x=>({id:x.id,variantId:x.variantId,qty:x.qty})),lastStep:'address',sourceChannel:'shop'})});
    }catch{/* checkout recovery is helpful but must not block a valid sale */}
  }

  function validateCheckout(){
    const fields={
      name:$('#customer-name'),phone:$('#customer-phone'),address:$('#customer-address'),subdistrict:$('#customer-subdistrict'),district:$('#customer-district'),province:$('#customer-province'),postal:$('#customer-postal')
    };
    const values={
      name:fields.name?.value.trim()||'',phone:fields.phone?.value.replace(/\D/g,'')||'',address:fields.address?.value.trim()||'',subdistrict:fields.subdistrict?.value.trim()||'',district:fields.district?.value.trim()||'',province:fields.province?.value.trim()||'',postal:fields.postal?.value.trim()||''
    };
    const invalid=[];
    if(values.name.length<2)invalid.push(fields.name);
    if(values.phone.length<9)invalid.push(fields.phone);
    if(values.address.length<5)invalid.push(fields.address);
    if(values.subdistrict.length<2)invalid.push(fields.subdistrict);
    if(values.district.length<2)invalid.push(fields.district);
    if(values.province.length<2)invalid.push(fields.province);
    if(!/^\d{5}$/.test(values.postal))invalid.push(fields.postal);
    Object.values(fields).forEach(el=>el?.removeAttribute('aria-invalid'));
    invalid.filter(Boolean).forEach(el=>el.setAttribute('aria-invalid','true'));
    return {ok:invalid.length===0,values};
  }

  function orderError(err){
    const code=err?.data?.error||err?.message;
    if(code==='insufficient_stock')return 'สินค้าในตะกร้ามีจำนวนมากกว่าสต๊อกที่พร้อมขาย กรุณากลับไปตรวจสอบตะกร้า';
    if(code==='product_unavailable'||code==='variant_unavailable')return 'มีสินค้าบางรายการไม่พร้อมจำหน่ายแล้ว กรุณากลับไปเลือกสินค้าใหม่';
    if(code==='customer_details_required')return 'กรุณาตรวจสอบข้อมูลผู้รับและที่อยู่จัดส่งให้ครบถ้วน';
    if(code==='idempotency_key_required')return 'ระบบความปลอดภัยไม่สามารถยืนยันคำสั่งซื้อได้ กรุณาลองใหม่อีกครั้ง';
    if(code==='checkout_disabled'||code==='cod_disabled')return 'ระบบรับคำสั่งซื้อกำลังปิดปรับปรุงชั่วคราว กรุณาลองใหม่ภายหลัง';
    return 'ยังสร้างคำสั่งซื้อไม่ได้ กรุณาตรวจข้อมูลและลองใหม่อีกครั้ง';
  }

  async function placeOrder(){
    if(state.placing)return;
    const result=validateCheckout(),err=$('[data-checkout-error]');
    if(!result.ok){if(err)err.textContent='กรุณากรอกชื่อ โทรศัพท์ ที่อยู่ ตำบล/แขวง อำเภอ/เขต จังหวัด และรหัสไปรษณีย์ให้ครบถ้วน';return}
    if(!state.payment.checkoutEnabled||!state.payment.codEnabled){if(err)err.textContent='ระบบเก็บเงินปลายทางยังไม่พร้อมใช้งาน';return}
    if(err)err.textContent='';
    const btn=$('[data-place-order]');
    state.placing=true;if(btn){btn.disabled=true;btn.textContent='กำลังยืนยันคำสั่งซื้อ…'}
    const v=result.values,idempotencyKey=uuid();
    const payload={
      idempotencyKey,
      customerName:v.name,
      phone:v.phone,
      marketingConsent:Boolean($('#marketing-consent')?.checked),
      address:{addressLine:v.address,subdistrict:v.subdistrict,district:v.district,province:v.province,postalCode:v.postal},
      paymentMethod:'COD',
      items:state.cart.map(x=>({id:x.id,variantId:x.variantId||undefined,qty:x.qty})),
      attribution:{source:'shop'}
    };
    try{
      const data=await api('/api/orders',{method:'POST',body:JSON.stringify(payload)});
      const order={orderNo:data.orderNo,total:num(data.total),subtotal:num(data.subtotal),shipping:num(data.shipping),discount:num(data.discount),paymentMethod:'COD',createdAt:new Date().toISOString()};
      localStorage.setItem(ORDER_KEY,JSON.stringify(order));
      state.cart=[];saveCart();
      showSuccess(order);
    }catch(e){
      if(err)err.textContent=orderError(e);
      if(btn){btn.disabled=false;btn.textContent='สั่งซื้อสินค้า'}
    }finally{state.placing=false}
  }

  function showSuccess(order){
    const root=$('[data-checkout-content]');if(!root)return;
    root.innerHTML=`<div class="kch-success">
      <div class="kch-success-mark">${icon('check')}</div>
      <h2>สั่งซื้อสำเร็จ</h2>
      <p>ระบบรับคำสั่งซื้อและกันสต๊อกให้เรียบร้อยแล้ว</p>
      <div class="kch-success-order">
        <div><span>เลขที่คำสั่งซื้อ</span><strong>${esc(order.orderNo)}</strong></div>
        <div><span>ยอดที่ต้องชำระ</span><strong>${money(order.total)}</strong></div>
        <div><span>วิธีชำระเงิน</span><strong>เก็บเงินปลายทาง (COD)</strong></div>
      </div>
      <div class="kch-success-actions">
        <button class="kch-btn kch-btn-primary" type="button" data-success-shop>เลือกซื้อสินค้าต่อ</button>
      </div>
    </div>`;
  }

  function openLayer(name){
    const el=$(`[data-layer="${name}"]`),backdrop=$('[data-backdrop]');if(!el)return;
    if(name==='cart')el.classList.add('is-open');else el.classList.add('is-open');
    backdrop?.classList.add('is-open');
    backdrop?.setAttribute('data-active-layer',name);
    document.body.classList.add('is-locked');
    setTimeout(()=>el.querySelector('button,[href],input,textarea')?.focus(),40);
  }
  function closeLayer(name){
    const el=$(`[data-layer="${name}"]`);el?.classList.remove('is-open');
    const backdrop=$('[data-backdrop]');
    if(backdrop?.getAttribute('data-active-layer')===name){backdrop.classList.remove('is-open');backdrop.removeAttribute('data-active-layer');document.body.classList.remove('is-locked')}
  }
  function closeActiveLayer(){const b=$('[data-backdrop]');const name=b?.getAttribute('data-active-layer');if(name)closeLayer(name)}

  let toastTimer;
  function toast(message){
    const el=$('[data-toast]');if(!el)return;
    el.textContent=message;el.classList.add('is-open');
    clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('is-open'),2200);
  }

  function scrollShop(){closeActiveLayer();$('#shop')?.scrollIntoView({behavior:'smooth',block:'start'})}

  function bind(){
    document.addEventListener('click',e=>{
      const target=e.target.closest('button,a');if(!target)return;
      if(target.matches('[data-open-cart]')){e.preventDefault();openCart();return}
      if(target.matches('[data-close-cart]')){closeCart();return}
      if(target.matches('[data-close-product]')){closeLayer('product');return}
      if(target.matches('[data-close-checkout]')){closeLayer('checkout');return}
      if(target.matches('[data-scroll-shop]')){e.preventDefault();scrollShop();return}
      if(target.matches('[data-open-product]')){e.preventDefault();openProduct(target.dataset.openProduct);return}
      if(target.matches('[data-add-product]')){addFromCatalog(target.dataset.addProduct,false);return}
      if(target.matches('[data-buy-product]')){addFromCatalog(target.dataset.buyProduct,true);return}
      if(target.matches('[data-category]')){state.category=target.dataset.category||'ทั้งหมด';renderCategories();filterProducts();return}
      if(target.matches('[data-cart-qty]')){changeQty(target.dataset.cartQty,Number(target.dataset.delta)||0);return}
      if(target.matches('[data-remove-line]')){removeLine(target.dataset.removeLine);return}
      if(target.matches('[data-start-checkout]')){openCheckout();return}
      if(target.matches('[data-back-cart]')){closeLayer('checkout');openCart();return}
      if(target.matches('[data-variant]')){chooseVariant(target.dataset.variant);return}
      if(target.matches('[data-detail-add]')){addDetail(false);return}
      if(target.matches('[data-detail-buy]')){addDetail(true);return}
      if(target.matches('[data-place-order]')){placeOrder();return}
      if(target.matches('[data-success-shop]')){closeLayer('checkout');scrollShop();return}
      if(target.matches('[data-mobile-home]')){e.preventDefault();window.scrollTo({top:0,behavior:'smooth'});return}
    });
    $('[data-backdrop]')?.addEventListener('click',closeActiveLayer);
    document.addEventListener('keydown',e=>{if(e.key==='Escape')closeActiveLayer()});
    const form=$('[data-search-form]'),input=$('[data-search-input]');
    form?.addEventListener('submit',e=>{e.preventDefault();state.query=input?.value||'';state.category='ทั้งหมด';renderCategories();filterProducts();scrollShop()});
    input?.addEventListener('input',()=>{state.query=input.value;if(!state.query){filterProducts()}});
  }

  async function init(){
    loadCart();renderCartBadge();renderCart();bind();
    await Promise.all([loadCatalog(),loadPaymentOptions()]);
    renderCart();
    if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js?v=2026.09.05.5').catch(()=>{})}
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();