/* KHONCHAIHERB V1 — final order preflight
   Revalidates price, stock, automatic discount and shipping immediately before /api/orders.
   Sends cart identifiers/quantity only; never sends checkout PII to the quote endpoint. */
(()=>{
  'use strict';

  const CART_KEY='kch-cart';
  let checking=false;

  const money=value=>new Intl.NumberFormat('th-TH',{style:'currency',currency:'THB',minimumFractionDigits:0,maximumFractionDigits:2}).format(Number(value)||0);
  const esc=(value='')=>String(value).replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));

  function cartItems(){
    try{
      const rows=JSON.parse(localStorage.getItem(CART_KEY)||'[]');
      if(!Array.isArray(rows))return [];
      return rows.map(row=>({
        id:Number(row?.id),
        variantId:row?.variantId?Number(row.variantId):undefined,
        qty:Math.max(1,Math.min(20,Number(row?.qty)||1))
      })).filter(row=>Number.isInteger(row.id)&&row.id>0);
    }catch{return []}
  }

  function itemCount(items){return items.reduce((sum,row)=>sum+row.qty,0)}
  function reviewRoot(){return document.querySelector('[data-layer="checkout"] .kch-order-review')}
  function errorRoot(){return document.querySelector('[data-layer="checkout"] [data-checkout-error]')}

  function parseQuote(data){
    const subtotal=Number(data?.subtotal)||0;
    const discount=Math.max(0,Number(data?.discount)||0);
    const shipping=Math.max(0,Number(data?.shipping)||0);
    const total=Math.max(0,Number(data?.total)||0);
    const methods=Array.isArray(data?.paymentMethods)?data.paymentMethods:[];
    if(data?.quoteSource!=='server'||subtotal<=0||total<0)throw new Error('invalid_server_quote');
    if(methods.length&&!methods.includes('COD'))throw new Error('cod_unavailable');
    const expected=Math.max(0,subtotal-discount+shipping);
    if(Math.abs(total-expected)>.011)throw new Error('quote_total_mismatch');
    return {subtotal,discount,shipping,total,promotionName:String(data?.promotionName||'')};
  }

  function renderQuote(root,quote,count){
    if(!root)return;
    root.dataset.quoteStatus='ready';
    root.dataset.quoteTotal=String(quote.total);
    root.innerHTML=`
      <div class="kch-review-row"><span>จำนวนสินค้า</span><strong>${count} ชิ้น</strong></div>
      <div class="kch-review-row"><span>ยอดสินค้า</span><strong>${money(quote.subtotal)}</strong></div>
      ${quote.discount>0?`<div class="kch-review-row kch-review-discount"><span>ส่วนลดอัตโนมัติ</span><strong>−${money(quote.discount)}</strong></div>`:''}
      <div class="kch-review-row"><span>ค่าจัดส่ง</span><strong>${quote.shipping===0?'ส่งฟรี':money(quote.shipping)}</strong></div>
      <div class="kch-review-row kch-review-total" data-quote-final-total><span>ยอดชำระทั้งหมด</span><strong>${money(quote.total)}</strong></div>
      ${quote.discount>0&&quote.promotionName?`<div class="kch-quote-promo">ใช้สิทธิ์: ${esc(quote.promotionName)}</div>`:''}
      <div class="kch-quote-note" data-final-preflight-note>ตรวจสอบราคา สต๊อก ส่วนลด และค่าจัดส่งล่าสุดจากเซิร์ฟเวอร์แล้ว</div>`;
  }

  function setError(message){const root=errorRoot();if(root)root.textContent=message||''}
  function restoreButton(button,total){
    if(!button)return;
    button.disabled=false;
    button.textContent=Number.isFinite(total)?`สั่งซื้อสินค้า • ${money(total)}`:'สั่งซื้อสินค้า';
  }

  function preflightError(error){
    const code=String(error?.code||error?.message||'');
    if(code==='insufficient_stock')return 'สินค้าในตะกร้ามีจำนวนมากกว่าสต๊อกที่พร้อมขาย กรุณากลับไปตรวจสอบตะกร้า';
    if(code==='product_unavailable'||code==='variant_unavailable')return 'มีสินค้าบางรายการไม่พร้อมจำหน่ายแล้ว กรุณากลับไปเลือกสินค้าใหม่';
    if(code==='cod_unavailable')return 'ระบบเก็บเงินปลายทางยังไม่พร้อมใช้งาน กรุณาลองใหม่ภายหลัง';
    return 'ยังตรวจสอบราคาและสต๊อกล่าสุดไม่ได้ กรุณาลองกดสั่งซื้ออีกครั้ง';
  }

  async function verify(button){
    if(checking)return;
    const items=cartItems(),root=reviewRoot();
    if(!items.length){setError('ไม่พบสินค้าในตะกร้า กรุณากลับไปเลือกสินค้าอีกครั้ง');return}

    const previousReady=root?.dataset.quoteStatus==='ready';
    const previousTotal=previousReady?Number(root?.dataset.quoteTotal):NaN;
    checking=true;
    button.disabled=true;
    button.textContent='กำลังตรวจสอบราคาและสต๊อกล่าสุด…';
    setError('');

    try{
      const response=await fetch('/api/checkout-quote',{
        method:'POST',
        headers:{'content-type':'application/json'},
        body:JSON.stringify({items}),
        cache:'no-store'
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok){const error=new Error(data.error||`http_${response.status}`);error.code=data.error||'';throw error}
      const quote=parseQuote(data);
      renderQuote(root,quote,itemCount(items));

      const changed=!Number.isFinite(previousTotal)||Math.abs(previousTotal-quote.total)>.011;
      if(changed){
        setError(`ยอดคำสั่งซื้อมีการอัปเดตเป็น ${money(quote.total)} กรุณาตรวจสอบยอดใหม่แล้วกดสั่งซื้ออีกครั้ง`);
        checking=false;
        restoreButton(button,quote.total);
        return;
      }

      checking=false;
      restoreButton(button,quote.total);
      button.dataset.kchPreflightBypass='1';
      button.click();
    }catch(error){
      console.warn('order_preflight_unavailable',error?.code||error?.message||error);
      checking=false;
      setError(preflightError(error));
      restoreButton(button,Number.isFinite(previousTotal)?previousTotal:NaN);
    }
  }

  document.addEventListener('click',event=>{
    const button=event.target.closest?.('[data-place-order]');
    if(!button)return;
    if(button.dataset.kchPreflightBypass==='1'){
      delete button.dataset.kchPreflightBypass;
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    verify(button);
  },true);
})();
