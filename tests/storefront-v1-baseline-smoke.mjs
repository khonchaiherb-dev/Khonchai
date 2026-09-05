import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const [html,css,commerceCss,recoveryCss,quoteCss,js,recoveryJs,quoteJs,postPurchase,quoteApi,orderStatusApi,sw,wrangler,constitution,middleware]=await Promise.all([
  readFile('public/index.html','utf8'),
  readFile('public/storefront-v1.css','utf8'),
  readFile('public/storefront-v1-commerce.css','utf8'),
  readFile('public/storefront-v1-checkout-recovery.css','utf8'),
  readFile('public/storefront-v1-checkout-quote.css','utf8'),
  readFile('public/storefront-v1.js','utf8'),
  readFile('public/storefront-v1-checkout-recovery.js','utf8'),
  readFile('public/storefront-v1-checkout-quote.js','utf8'),
  readFile('public/storefront-v1-postpurchase.js','utf8'),
  readFile('functions/api/checkout-quote.js','utf8'),
  readFile('functions/api/order-status.js','utf8'),
  readFile('public/sw.js','utf8'),
  readFile('wrangler.jsonc','utf8'),
  readFile('docs/KHONCHAIHERB-STOREFRONT-CONSTITUTION.md','utf8'),
  readFile('functions/_middleware.js','utf8')
]);

assert.match(html,/storefront-v1\.css\?v=/,'index must load the clean storefront stylesheet');
assert.match(html,/storefront-v1\.js\?v=/,'index must load the clean storefront controller');
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

// Checkout recovery must reduce accidental form loss without persisting customer PII.
assert.match(recoveryJs,/FIELD_MAP/,'checkout recovery must explicitly map the checkout fields');
assert.match(recoveryJs,/#customer-subdistrict/,'checkout recovery must validate the subdistrict required by the order payload');
assert.match(recoveryJs,/\[data-place-order\]/,'checkout recovery must guard the final order action before submission');
assert.match(recoveryJs,/data-checkout-recovery-note/,'checkout recovery must explain its temporary in-page behavior');
assert.match(recoveryJs,/stopImmediatePropagation/,'invalid checkout must be stopped before the core order handler can call the order API');
assert.doesNotMatch(recoveryJs,/localStorage\.setItem|sessionStorage\.setItem/,'checkout recovery must not persist customer checkout PII');
assert.doesNotMatch(recoveryJs,/FLASH DEAL|Verified Purchase|ขายแล้ว\s*\d|WELCOME50|HERB10/i,'checkout recovery must not introduce unverified commerce content');
assert.match(recoveryCss,/\.kch-checkout-memory-note/,'checkout recovery must include visible privacy/recovery feedback');

// Checkout quote must be authoritative, read-only, single-flight and free of customer PII.
assert.match(quoteJs,/\/api\/checkout-quote/,'checkout quote module must use the existing server quote API');
assert.match(quoteJs,/quoteSource/,'checkout quote UI must require a server quote marker');
assert.match(quoteJs,/data-quote-final-total/,'checkout quote UI must expose the final server total in checkout');
assert.match(quoteJs,/data-cart-server-total/,'cart must expose the server-calculated total before checkout');
assert.match(quoteJs,/data-cart-quote-breakdown/,'cart must show server subtotal/discount/shipping breakdown');
assert.match(quoteJs,/requestSeq=\{cart:0,checkout:0\}/,'cart and checkout quotes must have independent single-flight sequencing');
assert.match(quoteJs,/status==='loading'/,'quote observers must not duplicate in-flight requests');
assert.match(quoteJs,/data-cart-quote-fallback/,'cart quote failures must fail open without a retry loop');
assert.match(quoteJs,/data-checkout-quote-fallback/,'checkout quote failures must fail open without a retry loop');
assert.match(quoteJs,/variantId/,'checkout quote must preserve variant identity');
assert.doesNotMatch(quoteJs,/customerName|customer-phone|customer-address/,'checkout quote request must not read customer PII');
assert.doesNotMatch(quoteJs,/localStorage\.setItem|sessionStorage\.setItem/,'checkout quote module must not persist data');
assert.match(quoteCss,/\.kch-review-total/,'checkout quote must visually emphasize the final total');
assert.match(quoteCss,/\.kch-cart-quote-breakdown/,'cart quote must have a visible server-price breakdown');
assert.match(quoteApi,/sale_verified/,'server quote must require sale-verified products');
assert.match(quoteApi,/reserved_stock/,'server quote must calculate against reserved stock');
assert.match(quoteApi,/shipping_fee/,'server quote must use store shipping settings');
assert.match(quoteApi,/free_shipping_threshold/,'server quote must use the configured free-shipping threshold');
assert.match(quoteApi,/FROM promotions/,'server quote must calculate eligible automatic promotions');
assert.match(quoteApi,/quoteSource:'server'/,'server quote response must identify its authoritative source');
assert.doesNotMatch(quoteApi,/INSERT\s+INTO\s+(?:orders|order_items|customers)/i,'checkout quote endpoint must remain read-only and never create commerce records');

assert.match(postPurchase,/\/api\/order-status\?orderNo=/,'post-purchase module must use the existing private order-status API');
assert.match(postPurchase,/phone=/,'order tracking must require the matching phone lookup factor');
assert.match(postPurchase,/data-open-order-status/,'order tracking must expose a customer entry point');
assert.match(postPurchase,/data-success-track/,'successful checkout must expose order tracking immediately');
assert.doesNotMatch(postPurchase,/localStorage\.setItem\([^\n]*phone/i,'post-purchase module must not persist the customer phone in localStorage');
assert.doesNotMatch(postPurchase,/FLASH DEAL|Verified Purchase|ขายแล้ว\s*\d|WELCOME50|HERB10/i,'post-purchase module must not introduce unverified commerce content');
assert.match(orderStatusApi,/WHERE order_no=\? AND phone IN \(\?,\?\)/,'order-status API must bind lookup to both order number and phone');
assert.doesNotMatch(orderStatusApi,/address_line|addressLine|shipping_address/i,'public order-status response must not expose delivery address fields');

assert.match(css,/@media\(max-width:560px\)/,'mobile 390-class responsive rules required');
assert.match(css,/@media\(max-width:840px\)/,'tablet responsive rules required');
assert.match(css,/--kch-container:1280px/,'desktop content must use a bounded professional container');
assert.match(css,/min-height:44px/,'touch targets must keep a professional minimum height');

assert.match(commerceCss,/:has\(> \.kch-product-card:only-child\)/,'sell-now layer must adapt safely to a one-product live catalog');
assert.match(commerceCss,/:has\(> \.kch-product-card:nth-child\(2\):last-child\)/,'sell-now layer must adapt safely to a two-product live catalog');
assert.match(commerceCss,/\[data-detail-buy\]/,'sell-now layer must strengthen the real PDP buy action');
assert.match(commerceCss,/\[data-start-checkout\]/,'sell-now layer must strengthen the cart checkout action');
assert.match(commerceCss,/\[data-place-order\]/,'sell-now layer must strengthen the final verified order action');
assert.match(commerceCss,/\.kch-order-status/,'sell-now layer must include responsive order tracking presentation');
assert.doesNotMatch(commerceCss,/FLASH DEAL|Verified Purchase|ขายแล้ว\s*\d|WELCOME50|HERB10/i,'sell-now layer must not introduce unverified commerce content');

assert.match(sw,/storefront-v1\.css/,'service worker must cache the clean storefront stylesheet');
assert.match(sw,/storefront-v1\.js/,'service worker must cache the clean storefront controller');
assert.doesNotMatch(sw,/kch-rescue-live|kch-master-reference-2026/,'service worker must not pre-cache retired legacy storefront layers');

// Cloudflare middleware must never put retired customer UI layers back into otherwise-clean HTML.
assert.doesNotMatch(middleware,/head\.append\([^\n]*(?:tshop-v\d+|kch-rescue-live|kch-master-reference-2026|kch-canonical-commerce-ui)/i,'middleware must not inject retired storefront assets');
assert.doesNotMatch(middleware,/body\.setAttribute\([^\n]*(?:kch-master-2026|kch-rescue-live)/i,'middleware must not add retired storefront body classes');
assert.match(middleware,/storefront-v1-commerce\.css/,'canonical home must receive the clean sell-now commerce polish layer');
assert.match(middleware,/storefront-v1-postpurchase\.js/,'canonical home must receive the clean post-purchase tracking module');
assert.match(middleware,/storefront-v1-checkout-recovery\.css/,'canonical home must receive checkout recovery presentation');
assert.match(middleware,/storefront-v1-checkout-recovery\.js/,'canonical home must receive privacy-safe checkout recovery');
assert.match(middleware,/storefront-v1-checkout-quote\.css/,'canonical home must receive checkout quote presentation');
assert.match(middleware,/storefront-v1-checkout-quote\.js/,'canonical home must receive the authoritative checkout quote module');
assert.match(middleware,/2026\.09\.05\.2/,'canonical middleware must cache-bust the cart-enabled quote assets');
assert.match(middleware,/X-KCH-Storefront/,'middleware must mark clean storefront responses');
assert.match(middleware,/KOONCHAISHOP_ADMIN_GUARD/,'seller readiness guard must remain intact');
assert.match(middleware,/coupon_not_eligible/,'order coupon eligibility guard must remain intact');

assert.match(wrangler,/"CHECKOUT_ENABLED"\s*:\s*"true"/,'checkout must remain enabled in production source config');
assert.match(wrangler,/"COD_ENABLED"\s*:\s*"true"/,'COD must remain enabled in production source config');
assert.match(wrangler,/"ONLINE_PAYMENTS_ENABLED"\s*:\s*"false"/,'unverified online payments must remain disabled');

assert.match(constitution,/Always start from the latest production branch HEAD/,'development constitution must lock latest-HEAD workflow');
assert.match(constitution,/Regression is failure/,'development constitution must lock regression protection');

console.log('PASS storefront V1 baseline: clean architecture, server totals from cart through checkout, quote single-flight, privacy-safe recovery, COD, secure post-purchase tracking, responsive and middleware isolation contract');
