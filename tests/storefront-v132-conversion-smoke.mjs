import fs from 'node:fs';
import assert from 'node:assert/strict';

const css=fs.readFileSync('public/tshop-v132-conversion-storefront.css','utf8');
const patch=fs.readFileSync('public/tshop-v1321-search-visibility-fix.css','utf8');
const js=fs.readFileSync('public/kch-conversion-storefront.js','utf8');
const middleware=fs.readFileSync('functions/_middleware.js','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));

// Keep conversion behavior (real price/readiness/CTA), but remove its older
// structural CSS layers so v1.34.2 is the only active layout baseline.
assert.doesNotMatch(middleware,/tshop-v132-conversion-storefront\.css/);
assert.doesNotMatch(middleware,/tshop-v1321-search-visibility-fix\.css/);
assert.match(middleware,/kch-conversion-storefront\.js\?v=1\.32\.0/);
assert.match(middleware,/tshop-v134-structural-storefront\.css\?v=1\.34\.2/);

assert.match(css,/--kch-v132-max:1760px/);
assert.match(css,/\.kch-v132-card-cta/);
assert.match(patch,/\.kch-master-product\[hidden\]\{display:none!important\}/);
assert.match(js,/const BUILD='1\.32\.0'/);
assert.match(js,/Number\(p\?\.sale_verified\)===1/);
assert.match(js,/Number\(p\?\.price\|\|0\)>0/);
assert.match(js,/Number\(p\?\.stock\|\|0\)>0/);
assert.match(js,/!p\?\.comingSoon/);
assert.match(js,/button\.textContent=canBuy\?'สั่งซื้อ':'ดูรายละเอียด'/);
assert.match(js,/กำลังเตรียมข้อมูลสำหรับการจำหน่าย จึงยังไม่เปิดรับคำสั่งซื้อ/);
assert.doesNotMatch(js,/Math\.random/);
assert.doesNotMatch(js,/ขายแล้ว/);
assert.doesNotMatch(js,/★★★★★|⭐/);

assert.ok(pkg.scripts['qa:v132']);
assert.match(pkg.scripts.check,/storefront-v132-conversion-smoke\.mjs/);

console.log('storefront v1.32 conversion behavior + superseded css integrity smoke: OK');
