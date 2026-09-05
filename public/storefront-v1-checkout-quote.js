/* KHONCHAIHERB V1 — server checkout quote
   Reads only cart identifiers/quantity and asks the existing read-only /api/checkout-quote
   endpoint for authoritative subtotal, automatic discount, shipping and total. */
(()=>{
  'use strict';

  const CART_KEY='kch-cart';
  let requestSeq=0;

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

  function quoteKey(items){
    return items.map(row=>`${row.id}:${row.variantId||0}:${row.qty}`).sort().join('|');
  }

  function reviewRoot(){return document.querySelector('[data-layer="checkout"] .kch-order-review')}

  function setLoading(root,count){
    root.setAttribute('aria-live','polite');
    root.innerHTML=`
      <div class="kch-review-row"><span>จำนวนสินค้า</span><strong>${count} ชิ้น</strong></div>
      <div class="kch-review-row kch-quote-loading"><span>ยอดที่ต้องชำระ</span><strong>กำลังคำนวณจากระบบ…</strong></div>`;
  }

  function setFallback(root,count){
    root.dataset.quoteStatus='unavailable';
    root.innerHTML=`
      <div class="kch-review-row"><span>จำนวนสินค้า</span><strong>${count} ชิ้น</strong></div>
      <div class="kch-review-row"><span>ยอดสินค้า</span><strong>ตรวจสอบอีกครั้งเมื่อยืนยัน</strong></div>
      <div class="kch-quote-note is-warning">ขณะนี้ยังดึงยอดสรุปล่วงหน้าไม่ได้ ระบบจะตรวจสอบราคา สต๊อก ส่วนลด และค่าจัดส่งอีกครั้งก่อนสร้างคำสั่งซื้อ</div>`;
  }

  function setQuote(root,data,count){
    const subtotal=Number(data.subtotal)||0;
    const discount=Math.max(0,Number(data.discount)||0);
    const shipping=Math.max(0,Number(data.shipping)||0);
    const total=Math.max(0,Number(data.total)||0);
    if(data.quoteSource!=='server'||subtotal<0||total<0)throw new Error('invalid_server_quote');

    root.dataset.quoteStatus='ready';
    root.dataset.quoteTotal=String(total);
    root.innerHTML=`
      <div class="kch-review-row"><span>จำนวนสินค้า</span><strong>${count} ชิ้น</strong></div>
      <div class="kch-review-row"><span>ยอดสินค้า</span><strong>${money(subtotal)}</strong></div>
      ${discount>0?`<div class="kch-review-row kch-review-discount"><span>ส่วนลดอัตโนมัติ</span><strong>−${money(discount)}</strong></div>`:''}
      <div class="kch-review-row"><span>ค่าจัดส่ง</span><strong>${shipping===0?'ส่งฟรี':money(shipping)}</strong></div>
      <div class="kch-review-row kch-review-total" data-quote-final-total><span>ยอดชำระทั้งหมด</span><strong>${money(total)}</strong></div>
      ${discount>0&&data.promotionName?`<div class="kch-quote-promo">ใช้สิทธิ์: ${esc(data.promotionName)}</div>`:''}
      <div class="kch-quote-note">ยอดนี้คำนวณจากราคา สต๊อก โปรโมชั่นอัตโนมัติ และค่าจัดส่งล่าสุดบนเซิร์ฟเวอร์ และจะตรวจสอบอีกครั้งเมื่อกดยืนยันคำสั่งซื้อ</div>`;
  }

  async function requestQuote(root,items,key){
    const seq=++requestSeq;
    root.dataset.quoteKey=key;
    root.dataset.quoteStatus='loading';
    setLoading(root,items.reduce((sum,row)=>sum+row.qty,0));
    try{
      const response=await fetch('/api/checkout-quote',{
        method:'POST',
        headers:{'content-type':'application/json'},
        body:JSON.stringify({items}),
        cache:'no-store'
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.error||`http_${response.status}`);
      if(seq!==requestSeq||!root.isConnected||root.dataset.quoteKey!==key)return;
      setQuote(root,data,items.reduce((sum,row)=>sum+row.qty,0));
    }catch(error){
      if(seq!==requestSeq||!root.isConnected||root.dataset.quoteKey!==key)return;
      console.warn('checkout_quote_unavailable',error?.message||error);
      setFallback(root,items.reduce((sum,row)=>sum+row.qty,0));
    }
  }

  function enhance(){
    const root=reviewRoot();if(!root)return;
    if(root.closest('[data-checkout-content]')?.querySelector('.kch-success'))return;
    const items=cartItems();if(!items.length)return;
    const key=quoteKey(items);
    if(root.dataset.quoteKey===key)return;
    requestQuote(root,items,key);
  }

  const boot=()=>{
    const content=document.querySelector('[data-checkout-content]');
    if(content)new MutationObserver(enhance).observe(content,{childList:true,subtree:true});
    document.addEventListener('click',event=>{
      if(event.target.closest?.('[data-start-checkout],[data-detail-buy],[data-buy-product]'))setTimeout(enhance,0);
    });
    enhance();
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
