import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const [preflight,middleware,quoteApi,orderApi]=await Promise.all([
  readFile('public/storefront-v1-order-preflight.js','utf8'),
  readFile('functions/_middleware.js','utf8'),
  readFile('functions/api/checkout-quote.js','utf8'),
  readFile('functions/api/orders.js','utf8')
]);

assert.match(preflight,/\/api\/checkout-quote/,'final order action must revalidate against the read-only checkout quote API');
assert.match(preflight,/data-place-order/,'preflight must guard the final place-order control');
assert.match(preflight,/stopImmediatePropagation/,'preflight must stop the order click until verification completes');
assert.match(preflight,/kchPreflightBypass/,'only a verified one-shot click may pass through to the core order handler');
assert.match(preflight,/Math\.abs\(previousTotal-quote\.total\)/,'preflight must compare the customer-visible total with the fresh server total');
assert.match(preflight,/กรุณาตรวจสอบยอดใหม่แล้วกดสั่งซื้ออีกครั้ง/,'a changed total must require fresh customer confirmation');
assert.match(preflight,/insufficient_stock/,'preflight must fail closed when server stock is insufficient');
assert.match(preflight,/product_unavailable/,'preflight must fail closed when the server product is unavailable');
assert.match(preflight,/variant_unavailable/,'preflight must fail closed when the selected variant is unavailable');
assert.match(preflight,/quoteSource/,'preflight must require an authoritative server quote marker');
assert.match(preflight,/paymentMethods/,'preflight must respect server payment capabilities when supplied');
assert.doesNotMatch(preflight,/customerName|customer-phone|customer-address|customer-subdistrict|customer-district|customer-province|customer-postal/,'final quote verification must not read checkout PII');
assert.doesNotMatch(preflight,/\/api\/orders/,'preflight module must never create an order itself');
assert.doesNotMatch(preflight,/localStorage\.setItem|sessionStorage\.setItem/,'preflight must not persist customer or quote state');

assert.match(middleware,/STOREFRONT_ORDER_PREFLIGHT/,'canonical middleware must declare the final order preflight asset');
assert.match(middleware,/storefront-v1-order-preflight\.js\?v=/,'canonical home must inject a versioned final order preflight module');
assert.ok(middleware.indexOf('STOREFRONT_CHECKOUT_RECOVERY')<middleware.indexOf('STOREFRONT_ORDER_PREFLIGHT'),'recovery validation must be registered before final order preflight');
assert.match(quoteApi,/quoteSource:'server'/,'preflight source API must remain authoritative');
assert.doesNotMatch(quoteApi,/INSERT\s+INTO\s+(?:orders|order_items|customers)/i,'preflight source API must remain read-only');
assert.match(orderApi,/idempotencyKey/,'server order creation must retain idempotency protection after preflight');
assert.match(orderApi,/reserved_stock/,'server order creation must still enforce stock truth after preflight');

console.log('PASS final order preflight: fresh server total/stock gate, changed-total re-confirmation, PII isolation and no direct order creation');
