import fs from 'node:fs';
import assert from 'node:assert/strict';

const js=fs.readFileSync('public/tshop-v18.js','utf8');
const html=fs.readFileSync('public/index.html','utf8');
const sw=fs.readFileSync('public/sw.js','utf8');

assert.match(js,/v17Purchase\(id,q,buyNow\)/,'global Add/Buy must pass through variant-safe purchase resolver');
assert.match(js,/data-v18-drawer-variant/,'social drawer must expose variant choices');
assert.match(js,/v17Purchase\(id,1,false,vid\)/,'drawer add-to-cart must pass explicit variantId');
assert.match(js,/v17Purchase\(id,1,true,vid\)/,'drawer buy-now must pass explicit variantId');
assert.match(js,/price-asc/,'search must support price sorting');
assert.match(js,/stockOnly/,'search must support in-stock filtering');
assert.match(js,/cancelled','ยกเลิก/,'order center must expose cancelled orders');
assert.match(js,/pay!==\'COD\'/,'COD unpaid state must not be misclassified as waiting for payment');
assert.ok(html.indexOf('tshop-v18.js?v=1.8.0')>html.indexOf('tshop-v17.js?v=1.8.0'),'v1.8 must load after v1.7');
assert.ok(html.indexOf('tshop-v18.js?v=1.8.0')<html.indexOf('tshop-v161-hotfix.js?v=1.8.0'),'v1.8 capture guard must load before legacy hotfix');
assert.match(sw,/khonchaiherb-v1\.8\.0/,'service worker cache must be v1.8.0');
assert.match(sw,/tshop-v18\.js\?v=1\.8\.0/,'service worker must precache v1.8 JS');
console.log('storefront v1.8 commerce smoke: OK');
