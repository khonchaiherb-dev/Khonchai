import fs from 'node:fs';
import assert from 'node:assert/strict';

const css=fs.readFileSync('public/tshop-v131-top-conversion.css','utf8');
const js=fs.readFileSync('public/kch-top-conversion.js','utf8');
const middleware=fs.readFileSync('functions/_middleware.js','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));

assert.match(middleware,/tshop-v131-top-conversion\.css\?v=1\.31\.0/);
assert.match(middleware,/kch-top-conversion\.js\?v=1\.31\.2/);
assert.ok(middleware.indexOf('tshop-v131-top-conversion.css')>middleware.indexOf('tshop-v130-koonchaishop.css'));
assert.ok(middleware.indexOf('kch-top-conversion.js')>middleware.indexOf('kch-koonchaishop-commerce.js'));

assert.match(css,/grid-template-columns:minmax\(215px,\.72fr\) minmax\(390px,1\.45fr\)/);
assert.match(css,/min-height:420px!important/);
assert.match(css,/aspect-ratio:4\/5!important/);
assert.match(css,/\.kch-master-range\{display:none!important\}/);
assert.match(css,/\.kch-v131-member-interrupt\{display:none!important\}/);
assert.match(css,/@media\(max-width:899px\)/);
assert.match(css,/@media\(max-width:520px\)/);
assert.match(css,/grid-auto-flow:column!important/);
assert.match(css,/min-height:44px!important/);

assert.match(js,/const BUILD='1\.31\.2'/);
assert.match(js,/Number\(p\?\.sale_verified\)===1/);
assert.match(js,/function enhanceHeader\(\)/);
assert.match(js,/function enhanceHero\(\)/);
assert.match(js,/function enhanceShowcase\(\)/);
assert.match(js,/function enhanceTrust\(\)/);
assert.match(js,/function hideMemberInterrupt\(\)/);
assert.match(js,/function enhanceFinder\(\)/);
assert.match(js,/function searchText\(card\)/);
assert.match(js,/card\?\.dataset\?\.kchName/);
assert.match(js,/card\?\.dataset\?\.product/);
assert.match(js,/card\?\.dataset\?\.kchCat/);
assert.match(js,/h1,h2,h3,h4,\.kch-master-product-name,\[data-product-name\]/);
assert.match(js,/card\?\.getAttribute\?\.\('aria-label'\)/);
assert.match(js,/function ensureSearchRule\(\)/);
assert.match(js,/function applyMasterSearch\(\)/);
assert.match(js,/const hay=searchText\(card\)/);
assert.doesNotMatch(js,/kchCat,text\(card\)/);
assert.match(js,/normalize\('NFKC'\)/);
assert.match(js,/tokens\.every\(token=>hay\.includes\(token\)\)/);
assert.match(js,/data-kch-v131-search-match/);
assert.match(js,/dataset\.kchV131SearchMatch=match\?'1':'0'/);
assert.match(js,/removeAttribute\('data-kch-v131-search-match'\)/);
assert.match(js,/display:none!important/);
assert.doesNotMatch(js,/dataset\.kchSearchMatch=match/);
assert.match(js,/setTimeout\(applyMasterSearch,180\)/);
assert.match(js,/สมุนไพรไทยที่คัดสรร/);
assert.match(js,/เก็บเงินปลายทาง/);
assert.match(js,/ติดตามสถานะคำสั่งซื้อ/);
assert.match(js,/ใบเสร็จรับเงิน/);
assert.match(js,/แตะเพื่อดูรายละเอียดสินค้า/);
assert.doesNotMatch(js,/ขายแล้ว/);
assert.doesNotMatch(js,/★★★★★|⭐/);
assert.doesNotMatch(js,/Math\.random/);
assert.doesNotMatch(js,/rating\s*[:=]\s*[45](?:\.|\b)/i);

assert.ok(pkg.scripts['qa:v131']);
assert.match(pkg.scripts.check,/storefront-v131-top-conversion-smoke\.mjs/);

console.log('storefront v1.31.2 top conversion + authoritative Thai search + responsive + integrity smoke: OK');