/* KHONCHAIHERB V1 — COD recipient and delivery address integrity
   Normalizes safe formatting, converts Thai postal digits to ASCII and blocks clearly
   unusable recipient/address fields before final preflight. The Order API enforces the same contract. */
(()=>{
  'use strict';

  const ORDER_SELECTOR='[data-place-order]';
  const ERROR_SELECTOR='[data-layer="checkout"] [data-checkout-error]';
  const THAI_DIGITS={'๐':'0','๑':'1','๒':'2','๓':'3','๔':'4','๕':'5','๖':'6','๗':'7','๘':'8','๙':'9'};
  const PLACEHOLDERS=new Set(['-','--','.','..','...','n/a','na','none','ไม่มี','ไม่ทราบ']);

  const rules=[
    {key:'name',selector:'#customer-name',label:'ชื่อผู้รับ',message:'กรุณากรอกชื่อผู้รับที่ใช้ติดต่อและรับสินค้าได้จริง',valid:meaningfulRecipient},
    {key:'address',selector:'#customer-address',label:'ที่อยู่',message:'กรุณากรอกบ้านเลขที่ หมู่ ถนน หรือรายละเอียดที่ช่วยให้ขนส่งพบสถานที่จัดส่ง',valid:value=>meaningful(value,5,false)},
    {key:'subdistrict',selector:'#customer-subdistrict',label:'ตำบล/แขวง',message:'กรุณากรอกชื่อตำบลหรือแขวงสำหรับจัดส่ง',valid:value=>meaningful(value,2,true)},
    {key:'district',selector:'#customer-district',label:'อำเภอ/เขต',message:'กรุณากรอกชื่ออำเภอหรือเขตสำหรับจัดส่ง',valid:value=>meaningful(value,2,true)},
    {key:'province',selector:'#customer-province',label:'จังหวัด',message:'กรุณากรอกชื่อจังหวัดสำหรับจัดส่ง',valid:value=>meaningful(value,2,true)},
    {key:'postal',selector:'#customer-postal',label:'รหัสไปรษณีย์',message:'กรุณากรอกรหัสไปรษณีย์ 5 หลัก เช่น 34000',valid:value=>/^\d{5}$/.test(normalizePostal(value))}
  ];

  function normalizeText(value){
    return String(value||'').replace(/[\u00a0\t\r\n]+/g,' ').replace(/\s{2,}/g,' ').trim();
  }
  function normalizePostal(value){
    return String(value||'').replace(/[๐-๙]/g,char=>THAI_DIGITS[char]||char).replace(/\s+/g,'').trim();
  }
  function meaningfulRecipient(value){
    const text=normalizeText(value);
    if(text.length<2||text.length>120||PLACEHOLDERS.has(text.toLocaleLowerCase('en-US')))return false;
    // Require at least one human/business name letter while allowing titles, spaces,
    // punctuation and numbers elsewhere (for example "ร้าน 24 สมุนไพร").
    return /[A-Za-zก-ฮ]/.test(text);
  }
  function meaningful(value,min,requireLetter){
    const text=normalizeText(value);
    if(text.length<min||PLACEHOLDERS.has(text.toLocaleLowerCase('en-US')))return false;
    return requireLetter?/[A-Za-zก-๙]/.test(text):/[0-9A-Za-zก-๙]/.test(text);
  }
  function errorRoot(){return document.querySelector(ERROR_SELECTOR)}
  function field(rule){return document.querySelector(rule.selector)}

  function normalizeField(rule,node){
    if(!node)return '';
    const value=rule.key==='postal'?normalizePostal(node.value):normalizeText(node.value);
    if(node.value!==value)node.value=value;
    return value;
  }
  function clearFieldError(node){
    if(!node)return;
    node.removeAttribute('aria-invalid');
    node.setCustomValidity('');
  }
  function setFieldError(rule,node,{focus=false}={}){
    if(node){
      node.setAttribute('aria-invalid','true');
      node.setCustomValidity(rule.message);
      if(focus){
        node.scrollIntoView?.({behavior:'smooth',block:'center'});
        setTimeout(()=>node.focus?.({preventScroll:true}),60);
      }
    }
    const error=errorRoot();
    if(error){
      error.textContent=rule.message;
      error.dataset.addressIntegrityError=rule.key;
    }
  }
  function clearAddressError(){
    const error=errorRoot();
    if(error?.dataset.addressIntegrityError){
      error.textContent='';
      delete error.dataset.addressIntegrityError;
    }
  }

  function validateAll({focusInvalid=false}={}){
    const invalid=[];
    for(const rule of rules){
      const node=field(rule);
      if(!node)continue;
      const value=normalizeField(rule,node);
      if(rule.valid(value))clearFieldError(node);
      else invalid.push({rule,node});
    }
    if(!invalid.length){clearAddressError();return {ok:true,invalid:[]}}
    invalid.forEach(({rule,node},index)=>setFieldError(rule,node,{focus:focusInvalid&&index===0}));
    const first=invalid[0];
    const error=errorRoot();
    if(error){error.textContent=first.rule.message;error.dataset.addressIntegrityError=first.rule.key}
    return {ok:false,invalid};
  }

  document.addEventListener('focusout',event=>{
    const rule=rules.find(item=>event.target?.matches?.(item.selector));
    if(!rule)return;
    const node=event.target;
    const value=normalizeField(rule,node);
    if(!value){clearFieldError(node);return}
    if(rule.valid(value)){
      clearFieldError(node);
      if(errorRoot()?.dataset.addressIntegrityError===rule.key)clearAddressError();
    }else setFieldError(rule,node);
  });

  document.addEventListener('input',event=>{
    const rule=rules.find(item=>event.target?.matches?.(item.selector));
    if(!rule)return;
    const node=event.target;
    const value=rule.key==='postal'?normalizePostal(node.value):normalizeText(node.value);
    if(rule.valid(value)){
      clearFieldError(node);
      if(errorRoot()?.dataset.addressIntegrityError===rule.key)clearAddressError();
    }
  });

  // Capture before final-order preflight/core order creation. This guard performs no
  // network requests and never stores recipient/address PII outside the existing fields.
  document.addEventListener('click',event=>{
    const button=event.target?.closest?.(ORDER_SELECTOR);
    if(!button)return;
    const result=validateAll({focusInvalid:true});
    if(result.ok)return;
    event.preventDefault();
    event.stopImmediatePropagation();
  },true);
})();
