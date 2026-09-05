/* KHONCHAIHERB V1 — server checkout quote
   Reads only cart identifiers/quantity and asks the existing read-only /api/checkout-quote
   endpoint for authoritative subtotal, automatic discount, shipping and total. */
(()=>{
  'use strict';

  const CART_KEY='kch-cart';
  const requestSeq={cart:0,checkout:0};

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
  function itemCount(items){return items.reduce((sum,row)=>sum+row.qty,0)}
  function reviewRoot(){return document.querySelector('[data-layer="checkout"] .kch-order-review')}
  function cartFoot(){return document.querySelector('[data-cart-foot]')}

  function parseQuote(data){
    const subtotal=Number(data?.subtotal)||0;
    const discount=Math.max(0,Number(data?.discount)||0);
    const shipping=Math.max(0,Number(data?.shipping)||0);
    const total=Math.max(0,Number(data?.total)||0);
    if(data?.quoteSource!=='server'||subtotal<=0||total<0)throw new Error('invalid_server_quote');
    const expected=Math.max(0,subtotal-discount+shipping);
    if(Math.abs(total-expected)>.011)throw new Error('quote_total_mismatch');
    return {subtotal,discount,shipping,total,promotionName:String(data?.promotionName||'')};
  }

  async function fetchQuote(items,context){
    const seq=++requestSeq[context];
    const response=await fetch('/api/checkout-quote',{
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({items}),
      cache:'no-store'
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.error||`http_${response.status}`);
    if(seq!==requestSeq[context])throw new Error('stale_quote');
    return parseQuote(data);
  }

  function setCheckoutLoading(root,count){
    root.setAttribute('aria-live','polite');
    root.innerHTML=`
      <div class="kch-review-row"><span>จำนวนสินค้า</span><strong>${count} ชิ้น</strong></div>
      <div class="kch-review-row kch-quote-loading"><span>ยอดที่ต้องชำระ</span><strong>กำลังคำนวณจากระบบ…</strong></div>`;
  }

  function setCheckoutFallback(root,count){
    root.dataset.quoteStatus='unavailable';
    delete root.dataset.quoteTotal;
    root.innerHTML=`
      <div class="kch-review-row"><span>จำนวนสินค้า</span><strong>${count} ชิ้น</strong></div>
      <div class="kch-review-row"><span>ยอดสินค้า</span><strong>ตรวจสอบอีกครั้งเมื่อยืนยัน</strong></div>
      <div class="kch-quote-note is-warning">ขณะนี้ยังดึงยอดสรุปล่วงหน้าไม่ได้ ระบบจะตรวจสอบราคา สต๊อก ส่วนลด และค่าจัดส่งอีกครั้งก่อนสร้างคำสั่งซื้อ</div>`;
  }

  function decoratePlaceOrder(total){
    const button=document.querySelector('[data-layer="checkout"] [data-place-order]');
    if(!button||button.disabled)return;
    const label=`สั่งซื้อสินค้า • ${money(total)}`;
    if(button.textContent!==label)button.textContent=label;
  }

  function setCheckoutQuote(root,quote,count){
    root.dataset.quoteStatus='ready';
    root.dataset.quoteTotal=String(quote.total);
    root.innerHTML=`
      <div class="kch-review-row"><span>จำนวนสินค้า</span><strong>${count} ชิ้น</strong></div>
      <div class="kch-review-row"><span>ยอดสินค้า</span><strong>${money(quote.subtotal)}</strong></div>
      ${quote.discount>0?`<div class="kch-review-row kch-review-discount"><span>ส่วนลดอัตโนมัติ</span><strong>−${money(quote.discount)}</strong></div>`:''}
      <div class="kch-review-row"><span>ค่าจัดส่ง</span><strong>${quote.shipping===0?'ส่งฟรี':money(quote.shipping)}</strong></div>
      <div class="kch-review-row kch-review-total" data-quote-final-total><span>ยอดชำระทั้งหมด</span><strong>${money(quote.total)}</strong></div>
      ${quote.discount>0&&quote.promotionName?`<div class="kch-quote-promo">ใช้สิทธิ์: ${esc(quote.promotionName)}</div>`:''}
      <div class="kch-quote-note">ยอดนี้คำนวณจากราคา สต๊อก โปรโมชั่นอัตโนมัติ และค่าจัดส่งล่าสุดบนเซิร์ฟเวอร์ และจะตรวจสอบอีกครั้งเมื่อกดยืนยันคำสั่งซื้อ</div>`;
    decoratePlaceOrder(quote.total);
  }

  async function enhanceCheckout(){
    const root=reviewRoot();if(!root)return;
    if(root.closest('[data-checkout-content]')?.querySelector('.kch-success'))return;
    const items=cartItems();if(!items.length)return;
    const key=quoteKey(items);
    if(root.dataset.quoteKey===key&&root.dataset.quoteStatus==='ready'&&root.querySelector('[data-quote-final-total]')){
      decoratePlaceOrder(Number(root.dataset.quoteTotal)||0);
      return;
    }
    root.dataset.quoteKey=key;
    root.dataset.quoteStatus='loading';
    setCheckoutLoading(root,itemCount(items));
    try{
      const quote=await fetchQuote(items,'checkout');
      if(!root.isConnected||root.dataset.quoteKey!==key)return;
      setCheckoutQuote(root,quote,itemCount(items));
    }catch(error){
      if(error?.message==='stale_quote'||!root.isConnected||root.dataset.quoteKey!==key)return;
      console.warn('checkout_quote_unavailable',error?.message||error);
      setCheckoutFallback(root,itemCount(items));
    }
  }

  function setCartLoading(foot,key){
    foot.dataset.cartQuoteKey=key;
    foot.dataset.cartQuoteStatus='loading';
    const note=foot.querySelector('.kch-cart-note');
    if(note)note.textContent='กำลังตรวจสอบยอดรวมและค่าจัดส่งล่าสุดจากระบบ…';
  }

  function setCartFallback(foot){
    foot.dataset.cartQuoteStatus='unavailable';
    const note=foot.querySelector('.kch-cart-note');
    if(note)note.textContent='ไปขั้นตอนชำระเงินเพื่อดูค่าจัดส่งและยอดรวมล่าสุดจากระบบก่อนยืนยันคำสั่งซื้อ';
  }

  function setCartQuote(foot,quote){
    foot.dataset.cartQuoteStatus='ready';
    foot.dataset.cartQuoteTotal=String(quote.total);
    const summary=foot.querySelector('.kch-cart-summary');
    const button=foot.querySelector('[data-start-checkout]');
    const note=foot.querySelector('.kch-cart-note');
    if(summary){
      const label=summary.querySelector('span'),value=summary.querySelector('strong');
      if(label)label.textContent='ยอดรวมล่าสุด';
      if(value){value.textContent=money(quote.total);value.dataset.cartServerTotal=''}
    }
    let breakdown=foot.querySelector('[data-cart-quote-breakdown]');
    if(!breakdown){
      breakdown=document.createElement('div');
      breakdown.className='kch-cart-quote-breakdown';
      breakdown.dataset.cartQuoteBreakdown='';
      if(button)foot.insertBefore(breakdown,button);else foot.append(breakdown);
    }
    const parts=[`สินค้า ${money(quote.subtotal)}`];
    if(quote.discount>0)parts.push(`ส่วนลด −${money(quote.discount)}`);
    parts.push(quote.shipping===0?'จัดส่งฟรี':`จัดส่ง ${money(quote.shipping)}`);
    breakdown.textContent=parts.join(' • ');
    if(button&&!button.disabled)button.textContent=`ดำเนินการชำระเงิน • ${money(quote.total)}`;
    if(note)note.textContent='ยอดจากระบบล่าสุด และจะตรวจสอบอีกครั้งในขั้นตอนชำระเงินก่อนยืนยันคำสั่งซื้อ';
  }

  async function enhanceCart(){
    const foot=cartFoot();if(!foot)return;
    const button=foot.querySelector('[data-start-checkout]');
    if(!button)return;
    const items=cartItems();if(!items.length)return;
    const key=quoteKey(items);
    if(foot.dataset.cartQuoteKey===key&&foot.dataset.cartQuoteStatus==='ready'&&foot.querySelector('[data-cart-server-total]'))return;
    setCartLoading(foot,key);
    try{
      const quote=await fetchQuote(items,'cart');
      if(!foot.isConnected||foot.dataset.cartQuoteKey!==key)return;
      setCartQuote(foot,quote);
    }catch(error){
      if(error?.message==='stale_quote'||!foot.isConnected||foot.dataset.cartQuoteKey!==key)return;
      console.warn('cart_quote_unavailable',error?.message||error);
      setCartFallback(foot);
    }
  }

  const boot=()=>{
    const checkoutContent=document.querySelector('[data-checkout-content]');
    if(checkoutContent)new MutationObserver(()=>enhanceCheckout()).observe(checkoutContent,{childList:true,subtree:true});
    const foot=cartFoot();
    if(foot)new MutationObserver(()=>enhanceCart()).observe(foot,{childList:true,subtree:true,characterData:true});
    document.addEventListener('click',event=>{
      const target=event.target.closest?.('button,a');if(!target)return;
      if(target.matches('[data-open-cart],[data-add-product],[data-detail-add],[data-cart-qty],[data-remove-line]'))setTimeout(enhanceCart,0);
      if(target.matches('[data-start-checkout],[data-detail-buy],[data-buy-product]'))setTimeout(enhanceCheckout,0);
    });
    enhanceCart();
    enhanceCheckout();
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
