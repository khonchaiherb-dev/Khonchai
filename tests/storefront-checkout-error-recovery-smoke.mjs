import fs from 'node:fs';
import assert from 'node:assert/strict';

const js=fs.readFileSync('public/storefront-v1-checkout-error-recovery.js','utf8');
const css=fs.readFileSync('public/storefront-v1-checkout-error-recovery.css','utf8');
const middleware=fs.readFileSync('functions/_middleware.js','utf8');

for(const marker of [
  "const ORDER_PATH='/api/orders'",
  "code==='invalid_phone'",
  "code==='customer_details_required'",
  "code==='insufficient_stock'",
  "code==='product_unavailable'||code==='variant_unavailable'",
  "code==='coupon_not_eligible'",
  "code==='order_intake_closed'||code==='checkout_disabled'||code==='cod_disabled'",
  "code==='network_error'",
  "status===429",
  "status>=500",
  "data-checkout-recovery-action=\"cart\""
])assert.ok(js.includes(marker),`missing checkout recovery contract: ${marker}`);

assert.ok(js.includes("url.origin!==location.origin||url.pathname!==ORDER_PATH||method!=='POST'"),'recovery observer must be scoped to same-origin POST /api/orders');
assert.ok(js.includes('response.clone().json()'),'must inspect a clone and leave the core response readable');
assert.ok(js.includes("setTimeout(()=>renderFailure(failure),0)"),'actionable error must render after core fallback message');
assert.ok(js.includes('ระบบจะใช้รหัสคำขอเดิมเพื่อลดความเสี่ยงออเดอร์ซ้ำ'),'uncertain failures must explain stable retry safety');
assert.ok(js.includes('ข้อมูลที่กรอกยังอยู่'),'recovery must explicitly preserve customer progress');

assert.ok(!/localStorage\.(?:setItem|removeItem)/.test(js),'error recovery must not persist PII to localStorage');
assert.ok(!/sessionStorage\.(?:setItem|removeItem)/.test(js),'error recovery must not persist PII to sessionStorage');
assert.ok(!js.includes('customerName:'),'error recovery should never construct or retain a customer payload');

assert.ok(css.includes('[data-checkout-recovery-error]'),'missing recovery error presentation');
assert.ok(css.includes('.kch-checkout-error-action'),'missing recovery action presentation');

assert.ok(middleware.includes('STOREFRONT_CHECKOUT_ERROR_RECOVERY_CSS'),'middleware must inject checkout error recovery CSS');
assert.ok(middleware.includes('STOREFRONT_CHECKOUT_ERROR_RECOVERY'),'middleware must inject checkout error recovery JS');
assert.ok(middleware.indexOf('STOREFRONT_ORDER_PREFLIGHT')<middleware.lastIndexOf('STOREFRONT_CHECKOUT_ERROR_RECOVERY}`')), 'error recovery must be registered after final-order preflight');

console.log('Checkout actionable error recovery contract: OK');
