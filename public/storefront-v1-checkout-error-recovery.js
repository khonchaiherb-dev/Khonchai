/* KHONCHAIHERB V1 — actionable checkout error recovery
   Converts order failures into specific Thai recovery guidance without persisting customer PII.
   It observes only same-origin POST /api/orders and leaves duplicate-order/idempotency safety intact. */
(()=>{
  'use strict';

  const ORDER_PATH='/api/orders';
  const nativeFetch=window.fetch.bind(window);
  let lastFailure=null;
  let renderTimer=0;

  const $=(sel,root=document)=>root.querySelector(sel);
  const digits=value=>String(value||'').replace(/\D/g,'');
  const phone=value=>{
    let d=digits(value);
    if(d.startsWith('00660'))d=`0${d.slice(5)}`;
    else if(d.startsWith('0066'))d=`0${d.slice(4)}`;
    else if(d.startsWith('660'))d=`0${d.slice(3)}`;
    else if(d.startsWith('66'))d=`0${d.slice(2)}`;
    return d;
  };
  const validPhone=value=>/^(?:0[689]\d{8}|0[23457]\d{7})$/.test(phone(value));
  const checkoutRoot=()=>document.querySelector('[data-layer="checkout"]');
  const errorRoot=()=>checkoutRoot()?.querySelector('[data-checkout-error]')||null;

  const fieldRules=[
    {key:'name',selector:'#customer-name',label:'ชื่อ-นามสกุล',valid:v=>String(v||'').trim().length>=2},
    {key:'phone',selector:'#customer-phone',label:'เบอร์โทรศัพท์',valid:validPhone},
    {key:'address',selector:'#customer-address',label:'ที่อยู่',valid:v=>String(v||'').trim().length>=5},
    {key:'subdistrict',selector:'#customer-subdistrict',label:'ตำบล/แขวง',valid:v=>String(v||'').trim().length>=2},
    {key:'district',selector:'#customer-district',label:'อำเภอ/เขต',valid:v=>String(v||'').trim().length>=2},
    {key:'province',selector:'#customer-province',label:'จังหวัด',valid:v=>String(v||'').trim().length>=2},
    {key:'postal',selector:'#customer-postal',label:'รหัสไปรษณีย์',valid:v=>/^\d{5}$/.test(digits(v))}
  ];

  function invalidLocalFields(){
    const root=checkoutRoot();
    if(!root)return [];
    return fieldRules.map(rule=>({rule,node:$(rule.selector,root)})).filter(x=>x.node&&!x.rule.valid(x.node.value));
  }

  function clearFieldErrors(){
    const root=checkoutRoot();if(!root)return;
    fieldRules.forEach(rule=>$(rule.selector,root)?.removeAttribute('aria-invalid'));
  }

  function focusField(selector){
    const node=$(selector,checkoutRoot()||document);
    if(!node)return;
    node.setAttribute('aria-invalid','true');
    node.scrollIntoView?.({behavior:'smooth',block:'center'});
    setTimeout(()=>node.focus?.({preventScroll:true}),80);
  }

  function describe(failure){
    const code=String(failure?.code||'');
    const status=Number(failure?.status||0);
    const data=failure?.data||{};

    if(code==='invalid_phone')return {
      tone:'field',message:'เบอร์โทรศัพท์ไม่ถูกต้อง กรุณากรอกเบอร์ไทยที่ติดต่อได้ เช่น 0812345678 หรือ +66 81 234 5678',focus:'#customer-phone'
    };
    if(code==='customer_details_required'){
      const invalid=invalidLocalFields();
      const names=invalid.map(x=>x.rule.label);
      return {
        tone:'field',
        message:names.length?`กรุณาตรวจสอบ ${names.join(', ')} แล้วกดสั่งซื้ออีกครั้ง`:'ข้อมูลผู้รับหรือที่อยู่บางส่วนยังไม่ครบ กรุณาตรวจสอบข้อมูลจัดส่งแล้วลองอีกครั้ง',
        focus:invalid[0]?.rule.selector||'#customer-name'
      };
    }
    if(code==='insufficient_stock'){
      const available=Number(data.available);
      const suffix=Number.isFinite(available)?(available>0?` ขณะนี้เหลือ ${available} ชิ้น`:' ขณะนี้สินค้ารายการนี้หมดชั่วคราว'):'';
      return {tone:'cart',message:`สต๊อกสินค้าเปลี่ยนระหว่างการสั่งซื้อ${suffix} กรุณากลับไปปรับจำนวนสินค้าในตะกร้า`,action:'cart',actionLabel:'กลับไปตรวจตะกร้า'};
    }
    if(code==='product_unavailable'||code==='variant_unavailable')return {
      tone:'cart',message:'มีสินค้าหรือตัวเลือกบางรายการไม่พร้อมจำหน่ายแล้ว กรุณากลับไปตรวจตะกร้าและเลือกสินค้าที่พร้อมขายอีกครั้ง',action:'cart',actionLabel:'กลับไปตรวจตะกร้า'
    };
    if(code==='invalid_items'||code==='empty_order')return {
      tone:'cart',message:'รายการสินค้าในคำสั่งซื้อต้องตรวจสอบใหม่ กรุณากลับไปที่ตะกร้าแล้วเลือกสินค้าที่พร้อมขายอีกครั้ง',action:'cart',actionLabel:'กลับไปตรวจตะกร้า'
    };
    if(code==='coupon_not_eligible')return {
      tone:'cart',message:'คูปองหรือสิทธิ์ส่วนลดนี้ใช้กับคำสั่งซื้อปัจจุบันไม่ได้แล้ว กรุณากลับไปตรวจตะกร้าหรือสิทธิ์ส่วนลด แล้วลองอีกครั้ง',action:'cart',actionLabel:'กลับไปตรวจตะกร้า'
    };
    if(code==='order_intake_closed'||code==='checkout_disabled'||code==='cod_disabled')return {
      tone:'system',message:'ระบบรับคำสั่งซื้อหรือเก็บเงินปลายทางปิดชั่วคราว ข้อมูลที่กรอกยังอยู่ในหน้านี้ กรุณาลองอีกครั้งภายหลัง'
    };
    if(code==='idempotency_key_required')return {
      tone:'system',message:'ระบบความปลอดภัยยังยืนยันคำสั่งซื้อไม่ได้ ข้อมูลที่กรอกยังอยู่ กรุณากดสั่งซื้ออีกครั้ง ระบบจะใช้คำขอเดิมเพื่อลดความเสี่ยงออเดอร์ซ้ำ'
    };
    if(code==='network_error')return {
      tone:'retry',message:'การเชื่อมต่อสะดุดและระบบยังยืนยันผลคำสั่งซื้อไม่ได้ ข้อมูลที่กรอกยังอยู่ กรุณาลองอีกครั้ง ระบบจะใช้รหัสคำขอเดิมเพื่อลดความเสี่ยงออเดอร์ซ้ำ'
    };
    if(status===429||code==='rate_limited')return {
      tone:'retry',message:'มีการส่งคำขอถี่เกินไป กรุณารอสักครู่แล้วกดสั่งซื้ออีกครั้ง ข้อมูลที่กรอกยังอยู่ครบ'
    };
    if(status>=500||code==='database_not_bound'||code==='http_500'||code==='http_502'||code==='http_503'||code==='http_504')return {
      tone:'retry',message:'ระบบยังยืนยันผลคำสั่งซื้อไม่ได้ ข้อมูลที่กรอกยังอยู่ กรุณาลองอีกครั้ง ระบบจะใช้รหัสคำขอเดิมเพื่อลดความเสี่ยงออเดอร์ซ้ำ'
    };
    if(status===409)return {
      tone:'cart',message:'ข้อมูลสินค้าเปลี่ยนระหว่างยืนยันคำสั่งซื้อ กรุณากลับไปตรวจตะกร้าแล้วลองอีกครั้ง',action:'cart',actionLabel:'กลับไปตรวจตะกร้า'
    };
    if(status>=400&&status<500)return {
      tone:'field',message:'คำสั่งซื้อยังไม่ผ่านการตรวจสอบ กรุณาตรวจข้อมูลผู้รับ ที่อยู่ และรายการสินค้า แล้วลองอีกครั้ง'
    };
    return {tone:'retry',message:'ยังยืนยันผลคำสั่งซื้อไม่ได้ ข้อมูลที่กรอกยังอยู่ กรุณาลองอีกครั้ง'};
  }

  function renderFailure(failure=lastFailure){
    if(!failure||failure!==lastFailure)return;
    const root=errorRoot();if(!root)return;
    const view=describe(failure);
    root.replaceChildren();
    root.dataset.checkoutRecoveryError=String(failure.code||failure.status||'unknown');
    root.dataset.checkoutRecoveryTone=view.tone||'system';
    root.setAttribute('role','alert');
    root.setAttribute('aria-live','assertive');

    const message=document.createElement('span');
    message.className='kch-checkout-error-message';
    message.textContent=view.message;
    root.append(message);

    if(view.action==='cart'){
      const button=document.createElement('button');
      button.type='button';
      button.className='kch-checkout-error-action';
      button.dataset.checkoutRecoveryAction='cart';
      button.textContent=view.actionLabel||'กลับไปตรวจตะกร้า';
      root.append(button);
    }
    if(view.focus)focusField(view.focus);
  }

  function scheduleFailure(failure){
    lastFailure=failure;
    clearTimeout(renderTimer);
    // Core checkout writes its fallback message after fetch settles. Rendering in the next
    // macrotask guarantees the actionable message is the final message customers see.
    renderTimer=setTimeout(()=>renderFailure(failure),0);
  }

  function clearFailure(){
    lastFailure=null;
    clearTimeout(renderTimer);
    const root=errorRoot();
    if(root){
      delete root.dataset.checkoutRecoveryError;
      delete root.dataset.checkoutRecoveryTone;
    }
  }

  async function observeOrderFetch(input,init={}){
    const inputUrl=typeof input==='string'||input instanceof URL?String(input):String(input?.url||'');
    let url;
    try{url=new URL(inputUrl,location.href)}catch{return nativeFetch(input,init)}
    const method=String(init?.method||input?.method||'GET').toUpperCase();
    if(url.origin!==location.origin||url.pathname!==ORDER_PATH||method!=='POST')return nativeFetch(input,init);

    try{
      const response=await nativeFetch(input,init);
      if(response.ok){clearFailure();return response}
      const data=await response.clone().json().catch(()=>({}));
      scheduleFailure({code:String(data?.error||`http_${response.status}`),status:response.status,data});
      return response;
    }catch(error){
      scheduleFailure({code:'network_error',status:0,data:{}});
      throw error;
    }
  }

  window.fetch=observeOrderFetch;

  document.addEventListener('click',event=>{
    const action=event.target?.closest?.('[data-checkout-recovery-action="cart"]');
    if(action){
      event.preventDefault();
      const back=document.querySelector('[data-layer="checkout"] [data-back-cart]');
      back?.click();
      return;
    }
    if(event.target?.closest?.('[data-place-order]')){
      const root=errorRoot();
      if(root?.dataset.checkoutRecoveryError){
        root.textContent='';
        delete root.dataset.checkoutRecoveryError;
        delete root.dataset.checkoutRecoveryTone;
      }
      clearFieldErrors();
    }
  },true);

  document.addEventListener('input',event=>{
    const target=event.target;
    if(!target?.closest?.('[data-layer="checkout"]'))return;
    const match=fieldRules.find(rule=>target.matches?.(rule.selector));
    if(match&&match.valid(target.value))target.removeAttribute('aria-invalid');
  });

  new MutationObserver(()=>{
    if(document.querySelector('.kch-success'))clearFailure();
  }).observe(document.documentElement,{childList:true,subtree:true});
})();
