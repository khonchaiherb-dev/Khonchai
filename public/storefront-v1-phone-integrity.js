/* KHONCHAIHERB V1 — delivery phone integrity
   Normalizes Thai +66 input before checkout and blocks malformed delivery contact numbers
   before quote/order submission. The Order API enforces the same rule server-side. */
(()=>{
  'use strict';

  const PHONE_SELECTOR='#customer-phone';
  const ORDER_SELECTOR='[data-place-order]';
  const ERROR_SELECTOR='[data-layer="checkout"] [data-checkout-error]';
  const INVALID_MESSAGE='กรุณากรอกเบอร์โทรศัพท์ไทยที่ติดต่อได้ เช่น 0812345678 หรือ +66 81 234 5678';

  const digits=value=>String(value||'').replace(/\D/g,'');
  const normalizeThaiPhone=value=>{
    let d=digits(value);
    if(d.startsWith('00660'))d=`0${d.slice(5)}`;
    else if(d.startsWith('0066'))d=`0${d.slice(4)}`;
    else if(d.startsWith('660'))d=`0${d.slice(3)}`;
    else if(d.startsWith('66'))d=`0${d.slice(2)}`;
    return d;
  };
  const validThaiPhone=value=>/^(?:0[689]\d{8}|0[23457]\d{7})$/.test(String(value||''));

  function phoneInput(){return document.querySelector(PHONE_SELECTOR)}
  function errorRoot(){return document.querySelector(ERROR_SELECTOR)}

  function setPhoneError(input,message=INVALID_MESSAGE){
    if(input){
      input.setAttribute('aria-invalid','true');
      input.setCustomValidity(message);
    }
    const error=errorRoot();
    if(error){error.textContent=message;error.dataset.phoneIntegrityError='1'}
  }

  function clearPhoneError(input){
    if(input){input.removeAttribute('aria-invalid');input.setCustomValidity('')}
    const error=errorRoot();
    if(error?.dataset.phoneIntegrityError==='1'){
      error.textContent='';
      delete error.dataset.phoneIntegrityError;
    }
  }

  function preparePhone({focusInvalid=false}={}){
    const input=phoneInput();
    if(!input)return {ok:false,phone:''};
    const phone=normalizeThaiPhone(input.value);
    if(phone&&input.value!==phone)input.value=phone;
    const ok=validThaiPhone(phone);
    if(ok)clearPhoneError(input);
    else{
      setPhoneError(input);
      if(focusInvalid)input.focus({preventScroll:true});
    }
    return {ok,phone};
  }

  document.addEventListener('focusout',event=>{
    const input=event.target?.closest?.(PHONE_SELECTOR);
    if(!input)return;
    if(!String(input.value||'').trim()){clearPhoneError(input);return}
    preparePhone();
  });

  document.addEventListener('input',event=>{
    const input=event.target?.closest?.(PHONE_SELECTOR);
    if(!input)return;
    const normalized=normalizeThaiPhone(input.value);
    if(validThaiPhone(normalized))clearPhoneError(input);
  });

  // Capture before final-order preflight so an invalid contact number never waits for
  // a server quote and never reaches the core /api/orders click handler.
  document.addEventListener('click',event=>{
    const button=event.target?.closest?.(ORDER_SELECTOR);
    if(!button)return;
    const result=preparePhone({focusInvalid:true});
    if(result.ok)return;
    event.preventDefault();
    event.stopImmediatePropagation();
  },true);
})();
