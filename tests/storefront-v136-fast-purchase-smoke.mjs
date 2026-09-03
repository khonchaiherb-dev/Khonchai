import fs from 'node:fs';
import assert from 'node:assert/strict';

const js=fs.readFileSync('public/kch-v136-fast-purchase.js','utf8');
const css=fs.readFileSync('public/kch-v136-fast-purchase.css','utf8');
const middleware=fs.readFileSync('functions/_middleware.js','utf8');

assert.match(middleware,/kch-v136-fast-purchase\.css\?v=1\.36\.0/);
assert.match(middleware,/kch-v136-fast-purchase\.js\?v=1\.36\.0/);
assert.ok(middleware.indexOf('kch-v136-fast-purchase.js')>middleware.indexOf('kch-v1341-header-dedupe.js'));

assert.match(js,/const BUILD='1\.36\.0'/);
assert.match(js,/Number\(p\?\.sale_verified\)===1/);
assert.match(js,/Number\(p\?\.price\|\|0\)>0/);
assert.match(js,/Number\(p\?\.stock\|\|0\)>0/);
assert.match(js,/!p\?\.comingSoon/);
assert.match(js,/typeof v17Purchase==='function'/);
assert.match(js,/v17Purchase\(p\.id,1,true\)/);
assert.match(js,/if\(!ready\(p\)\)return openDetails\(p\)/);
assert.match(js,/className='kch-v136-buy-now'/);
assert.match(js,/buy\.textContent='ซื้อเลย'/);
assert.match(js,/details\.textContent='ดูรายละเอียด'/);
assert.doesNotMatch(js,/Math\.random/);
assert.doesNotMatch(js,/discount|free shipping|ส่งฟรี/i);

assert.match(css,/\.kch-v136-actions/);
assert.match(css,/min-height:44px/);
assert.match(css,/\.kch-v136-buy-now/);
assert.match(css,/\.kch-master-product\[data-kch-v132-ready="1"\] \.kch-v132-card-cta\{display:none!important\}/);
assert.match(css,/@media\(max-width:520px\)/);

console.log('storefront v1.36 fast purchase conversion smoke: OK');
