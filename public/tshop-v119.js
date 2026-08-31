/* KHONCHAIHERB Commerce v1.19 — checkout confidence and policy clarity */
const V119_BUILD='1.19.0';
let V119_FRAME=0;
function v119Current(){return typeof current==='string'?current:''}
function v119Icon(name){return `<span class="material-symbols-rounded" aria-hidden="true">${name}</span>`}
function v119TrustItems(){return [
  ['storefront','สั่งตรงกับ KHONCHAIHERB','ข้อมูลสินค้า ราคา และสต็อกถูกตรวจอีกครั้งโดยระบบก่อนสร้างคำสั่งซื้อ'],
  ['payments','รองรับเก็บเงินปลายทาง','เลือก COD ได้ในขั้นตอนชำระเงินเมื่อรายการสั่งซื้อเข้าเงื่อนไข'],
  ['local_shipping','ติดตามสถานะคำสั่งซื้อ','ใช้เลขคำสั่งซื้อและข้อมูลยืนยันเพื่อตรวจสอบสถานะการจัดส่ง'],
  ['receipt_long','มีหลักฐานการชำระเงิน','ใบเสร็จออกได้หลังระบบยืนยันการชำระเงินหรือยืนยันการรับเงิน COD สำเร็จ']
]}
function v119TrustPanel(compact=false){const box=document.createElement('section');box.className=`v119-confidence${compact?' compact':''}`;box.setAttribute('aria-label','ข้อมูลความมั่นใจก่อนสั่งซื้อ');box.innerHTML=`<div class="v119-confidence-head"><div><b>ซื้ออย่างมั่นใจกับ KHONCHAIHERB</b><small>แสดงเงื่อนไขสำคัญก่อนยืนยันคำสั่งซื้อ</small></div>${v119Icon('verified_user')}</div><div class="v119-confidence-grid">${v119TrustItems().map(([icon,title,sub])=>`<div>${v119Icon(icon)}<span><b>${title}</b><small>${sub}</small></span></div>`).join('')}</div><div class="v119-policy-links"><a href="/shipping-returns.html">การจัดส่งและคืนสินค้า</a><a href="/privacy.html">ความเป็นส่วนตัว</a><a href="/terms.html">ข้อกำหนดการใช้งาน</a></div>`;return box}
function v119EnhanceProduct(){if(v119Current()!=='product')return;const root=document.querySelector('.tshop-pdp')||document.querySelector('.detail')?.parentElement;if(!root||root.querySelector('.v119-confidence'))return;const panel=v119TrustPanel(false);const review=root.querySelector('.review,.tshop-review,.pdp-review');const bottom=root.querySelector('.buybar,.pdp-bottom');if(review)review.insertAdjacentElement('beforebegin',panel);else if(bottom)bottom.insertAdjacentElement('beforebegin',panel);else root.appendChild(panel)}
function v119EnhanceCart(){if(v119Current()!=='cart')return;const page=[...document.querySelectorAll('.page')].find(p=>/ตะกร้า/.test(p.querySelector('.page-title')?.textContent||''));if(!page||page.querySelector('.v119-cart-confidence'))return;const panel=v119TrustPanel(true);panel.classList.add('v119-cart-confidence');const pay=page.querySelector('.sticky-pay');if(pay)pay.insertAdjacentElement('beforebegin',panel);else page.appendChild(panel)}
function v119EnhanceCheckout(){if(v119Current()!=='checkout')return;const page=document.querySelector('.checkout-form')?.closest('.page');if(!page||page.querySelector('.v119-checkout-confidence'))return;const panel=v119TrustPanel(true);panel.classList.add('v119-checkout-confidence');const aside=page.querySelector('.v115-checkout-aside');if(aside)aside.prepend(panel);else{const pay=page.querySelector('.sticky-pay');if(pay)pay.insertAdjacentElement('beforebegin',panel);else page.appendChild(panel)}}
function v119EnhanceOrderSuccess(){const page=[...document.querySelectorAll('.page')].find(p=>/สั่งซื้อ|คำสั่งซื้อ/.test(p.textContent||'')&&p.querySelector('[data-order-number],.order-number,.success-card'));if(!page||page.querySelector('.v119-after-order'))return;const box=document.createElement('section');box.className='v119-after-order';box.innerHTML=`${v119Icon('task_alt')}<div><b>เก็บเลขคำสั่งซื้อไว้เพื่อติดตามสถานะ</b><small>เมื่อระบบยืนยันการชำระเงินหรือรับเงิน COD สำเร็จ จะสามารถออกใบเสร็จตามข้อมูลของคำสั่งซื้อนั้นได้</small></div>`;page.appendChild(box)}
function v119Enhance(){v119EnhanceProduct();v119EnhanceCart();v119EnhanceCheckout();v119EnhanceOrderSuccess()}
function v119Schedule(){cancelAnimationFrame(V119_FRAME);V119_FRAME=requestAnimationFrame(v119Enhance)}
const V119_BIND_BASE=typeof bind==='function'?bind:null;if(V119_BIND_BASE){bind=function(){const out=V119_BIND_BASE();v119Schedule();return out}}
const V119_APP=document.querySelector('#app');if(V119_APP)new MutationObserver(v119Schedule).observe(V119_APP,{childList:true,subtree:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',v119Schedule,{once:true});else v119Schedule();
window.__KCH_CHECKOUT_CONFIDENCE__={build:V119_BUILD,refresh:v119Schedule};
