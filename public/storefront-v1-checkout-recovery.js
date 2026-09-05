/* KHONCHAIHERB V1 — checkout recovery
   Keeps checkout input only in page memory so customers can move back to the cart without
   losing work. No customer name, phone or address is persisted to local/session storage. */
(()=>{
  'use strict';

  const FIELD_MAP={
    name:'#customer-name',
    phone:'#customer-phone',
    address:'#customer-address',
    subdistrict:'#customer-subdistrict',
    district:'#customer-district',
    province:'#customer-province',
    postal:'#customer-postal'
  };
  const draft={name:'',phone:'',address:'',subdistrict:'',district:'',province:'',postal:'',marketingConsent:false};
  let hasDraft=false;

  const $=(sel,root=document)=>root.querySelector(sel);
  const digits=value=>String(value||'').replace(/\D/g,'');
  const layer=()=>document.querySelector('[data-layer="checkout"]');

  function fieldNodes(root=document){
    return Object.fromEntries(Object.entries(FIELD_MAP).map(([key,selector])=>[key,$(selector,root)]));
  }

  function readDraft(){
    const root=layer();if(!root)return;
    const fields=fieldNodes(root);
    let touched=false;
    for(const [key,node] of Object.entries(fields)){
      if(!node)continue;
      const value=String(node.value||'');
      draft[key]=value;
      if(value.trim())touched=true;
    }
    const consent=$('#marketing-consent',root);
    draft.marketingConsent=Boolean(consent?.checked);
    hasDraft=touched||draft.marketingConsent;
  }

  function restoreDraft(){
    if(!hasDraft)return;
    const root=layer();if(!root)return;
    const fields=fieldNodes(root);
    for(const [key,node] of Object.entries(fields)){
      if(node&&!String(node.value||'')&&draft[key])node.value=draft[key];
    }
    const consent=$('#marketing-consent',root);
    if(consent)consent.checked=Boolean(draft.marketingConsent);
  }

  function clearDraft(){
    for(const key of Object.keys(draft))draft[key]=key==='marketingConsent'?false:'';
    hasDraft=false;
  }

  function validator(key,value){
    const text=String(value||'').trim();
    if(key==='name')return text.length>=2;
    if(key==='phone')return digits(text).length>=9&&digits(text).length<=15;
    if(key==='address')return text.length>=5;
    if(key==='subdistrict'||key==='district'||key==='province')return text.length>=2;
    if(key==='postal')return /^\d{5}$/.test(digits(text));
    return true;
  }

  function clearFieldError(target){
    const hit=Object.entries(FIELD_MAP).find(([,selector])=>target.matches?.(selector));
    if(!hit)return;
    const [key]=hit;
    if(validator(key,target.value))target.removeAttribute('aria-invalid');
    const root=layer(),error=$('[data-checkout-error]',root);
    if(error&&root&&!root.querySelector('[aria-invalid="true"]'))error.textContent='';
  }

  function validateBeforeOrder(){
    const root=layer();if(!root)return true;
    readDraft();
    const fields=fieldNodes(root);
    const invalid=[];
    for(const [key,node] of Object.entries(fields)){
      if(!node)continue;
      node.removeAttribute('aria-invalid');
      if(!validator(key,node.value)){
        node.setAttribute('aria-invalid','true');
        invalid.push({key,node});
      }
    }
    if(!invalid.length)return true;

    const labels={
      name:'ชื่อ-นามสกุล',phone:'โทรศัพท์',address:'ที่อยู่',subdistrict:'ตำบล/แขวง',
      district:'อำเภอ/เขต',province:'จังหวัด',postal:'รหัสไปรษณีย์'
    };
    const error=$('[data-checkout-error]',root);
    if(error)error.textContent=`กรุณาตรวจสอบ ${invalid.map(x=>labels[x.key]).join(', ')} ให้ครบถ้วน`;
    const first=invalid[0].node;
    first.scrollIntoView?.({behavior:'smooth',block:'center'});
    setTimeout(()=>first.focus?.(),80);
    return false;
  }

  function addRecoveryNote(){
    const root=layer();if(!root||root.querySelector('[data-checkout-recovery-note]'))return;
    const firstSection=root.querySelector('.kch-form-section');
    if(!firstSection)return;
    const note=document.createElement('div');
    note.className='kch-checkout-memory-note';
    note.dataset.checkoutRecoveryNote='';
    note.textContent='ข้อมูลที่กรอกจะคงไว้ชั่วคราวเมื่อกลับไปแก้ตะกร้าในหน้านี้ และจะไม่ถูกบันทึกเป็นแบบร่างถาวร';
    firstSection.append(note);
  }

  function enhanceCheckout(){
    const root=layer();if(!root)return;
    if(root.querySelector('.kch-success')){clearDraft();return}
    if(!root.querySelector('#customer-name'))return;
    restoreDraft();
    addRecoveryNote();
  }

  // Capture validation before the core checkout click handler can submit an incomplete order.
  document.addEventListener('click',event=>{
    const target=event.target.closest?.('button,a');if(!target)return;
    if(target.matches('[data-place-order]')&&!validateBeforeOrder()){
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    if(target.matches('[data-back-cart],[data-close-checkout]'))readDraft();
    if(target.matches('[data-start-checkout]'))setTimeout(enhanceCheckout,0);
  },true);

  document.addEventListener('input',event=>{
    if(!event.target.closest?.('[data-layer="checkout"]'))return;
    if(event.target.matches?.('input,textarea')){
      readDraft();
      clearFieldError(event.target);
    }
  });
  document.addEventListener('change',event=>{
    if(event.target.closest?.('[data-layer="checkout"]'))readDraft();
  });
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&layer()?.classList.contains('is-open'))readDraft();
  },true);

  const observer=new MutationObserver(()=>enhanceCheckout());
  const boot=()=>{
    const root=$('[data-checkout-content]');
    if(root)observer.observe(root,{childList:true,subtree:true});
    enhanceCheckout();
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
