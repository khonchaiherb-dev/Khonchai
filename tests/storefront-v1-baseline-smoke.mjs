import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const [html,css,js,sw,wrangler,constitution,middleware]=await Promise.all([
  readFile('public/index.html','utf8'),
  readFile('public/storefront-v1.css','utf8'),
  readFile('public/storefront-v1.js','utf8'),
  readFile('public/sw.js','utf8'),
  readFile('wrangler.jsonc','utf8'),
  readFile('docs/KHONCHAIHERB-STOREFRONT-CONSTITUTION.md','utf8'),
  readFile('functions/_middleware.js','utf8')
]);

assert.match(html,/storefront-v1\.css\?v=/,'index must load the single clean storefront stylesheet');
assert.match(html,/storefront-v1\.js\?v=/,'index must load the single clean storefront controller');
assert.doesNotMatch(html,/tshop-v\d+/i,'legacy tshop generations must not load on the customer storefront');
assert.doesNotMatch(html,/kch-(?:rescue|master-reference|canonical-commerce-ui|v13)/i,'legacy rescue/master layers must not load on the customer storefront');
assert.doesNotMatch(html,/FLASH DEAL|Verified Purchase|ขายแล้ว\s*\d|WELCOME50|HERB10/i,'unverified commerce content must not appear in the clean storefront');

for(const marker of ['class="kch-hero"','data-product-grid','data-layer="cart"','data-layer="product"','data-layer="checkout"']){
  assert.ok(html.includes(marker),`missing required storefront marker: ${marker}`);
}

for(const endpoint of ['/api/products','/api/product-detail','/api/payment-options','/api/checkout-session','/api/orders']){
  assert.ok(js.includes(endpoint),`storefront controller must use ${endpoint}`);
}
assert.ok(js.includes('idempotencyKey'),'order creation must send an idempotency key');
assert.ok(js.includes('variantId'),'cart/order flow must preserve product variant identity');
assert.ok(js.includes("paymentMethod:'COD'"),'V1 checkout must explicitly use verified COD');
assert.doesNotMatch(js,/FLASH DEAL|Verified Purchase|WELCOME50|HERB10/i,'controller must not reintroduce fake storefront content');

assert.match(css,/@media\(max-width:560px\)/,'mobile 390-class responsive rules required');
assert.match(css,/@media\(max-width:840px\)/,'tablet responsive rules required');
assert.match(css,/--kch-container:1280px/,'desktop content must use a bounded professional container');
assert.match(css,/min-height:44px/,'touch targets must keep a professional minimum height');

assert.match(sw,/storefront-v1\.css/,'service worker must cache the clean storefront stylesheet');
assert.match(sw,/storefront-v1\.js/,'service worker must cache the clean storefront controller');
assert.doesNotMatch(sw,/kch-rescue-live|kch-master-reference-2026/,'service worker must not pre-cache retired legacy storefront layers');

// Cloudflare middleware must never put retired customer UI layers back into otherwise-clean HTML.
assert.doesNotMatch(middleware,/head\.append\([^\n]*(?:tshop-v\d+|kch-rescue-live|kch-master-reference-2026|kch-canonical-commerce-ui)/i,'middleware must not inject retired storefront assets');
assert.doesNotMatch(middleware,/body\.setAttribute\([^\n]*(?:kch-master-2026|kch-rescue-live)/i,'middleware must not add retired storefront body classes');
assert.match(middleware,/X-KCH-Storefront/,'middleware must mark clean storefront responses');
assert.match(middleware,/KOONCHAISHOP_ADMIN_GUARD/,'seller readiness guard must remain intact');
assert.match(middleware,/coupon_not_eligible/,'order coupon eligibility guard must remain intact');

assert.match(wrangler,/"CHECKOUT_ENABLED"\s*:\s*"true"/,'checkout must remain enabled in production source config');
assert.match(wrangler,/"COD_ENABLED"\s*:\s*"true"/,'COD must remain enabled in production source config');
assert.match(wrangler,/"ONLINE_PAYMENTS_ENABLED"\s*:\s*"false"/,'unverified online payments must remain disabled');

assert.match(constitution,/Always start from the latest production branch HEAD/,'development constitution must lock latest-HEAD workflow');
assert.match(constitution,/Regression is failure/,'development constitution must lock regression protection');

console.log('PASS storefront V1 baseline: clean architecture, truth-first commerce, COD, responsive and middleware isolation contract');
