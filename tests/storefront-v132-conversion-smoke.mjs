import fs from 'node:fs';
import assert from 'node:assert/strict';

const css=fs.readFileSync('public/tshop-v132-conversion-storefront.css','utf8');
const patch=fs.readFileSync('public/tshop-v1321-search-visibility-fix.css','utf8');
const js=fs.readFileSync('public/kch-conversion-storefront.js','utf8');
const middleware=fs.readFileSync('functions/_middleware.js','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));

// CSS remains the v1.32.0 canvas contract. The JS behavior is v1.32.1 and
// public JS responses are revalidated, so the existing middleware asset URL
// remains compatible while the behavioral smoke pins the newer script build.
assert.match(middleware,/tshop-v132-conversion-storefront\.css\?v=1\.32\.0/);
assert.match(middleware,/tshop-v1321-search-visibility-fix\.css\?v=1\.32\.1/);
assert.match(middleware,/kch-conversion-storefront\.js\?v=1\.32\.0/);
assert.ok(middleware.indexOf('tshop-v132-conversion-storefront.css')>middleware.indexOf('tshop-v131-top-conversion.css'));
assert.ok(middleware.indexOf('tshop-v1321-search-visibility-fix.css')>middleware.indexOf('tshop-v132-conversion-storefront.css'));
assert.ok(middleware.indexOf('kch-conversion-storefront.js')>middleware.indexOf('kch-top-conversion.js'));

assert.match(css,/--kch-v132-max:1760px/);
assert.match(css,/--kch-v132-content:1500px/);
assert.match(css,/minmax\(520px,1\.65fr\)/);
assert.match(css,/min-height:365px!important/);
assert.match(css,/\.kch-master-product-media\{\s*height:194px!important/);
assert.match(css,/\.kch-v132-card-cta/);
assert.match(css,/\.kch-v132-buy/);
assert.match(css,/\.kch-master-reset\{\s*display:none!important/);
assert.match(css,/\.kch-v132-has-filter \.kch-master-reset/);
assert.match(css,/\.kch-master-trust-item b\{\s*font-size:12px!important/);
assert.match(css,/@media\(max-width:899px\)/);
assert.match(css,/@media\(max-width:520px\)/);
assert.match(patch,/\.kch-master-product\[hidden\]\{display:none!important\}/);

assert.match(js,/const BUILD='1\.32\.1'/);
assert.match(js,/Number\(p\?\.sale_verified\)===1/);
assert.match(js,/Number\(p\?\.price\|\|0\)>0/);
assert.match(js,/Number\(p\?\.stock\|\|0\)>0/);
assert.match(js,/!p\?\.comingSoon/);
assert.match(js,/function productFromIdentity\(el\)/);
assert.match(js,/function productFromShowcase\(el\)/);
assert.match(js,/function clearCardEnhancement\(card\)/);
assert.match(js,/const p=productFromIdentity\(card\)/);
assert.match(js,/if\(!p\)\{clearCardEnhancement\(card\);return\}/);
assert.match(js,/card\.dataset\.kchV132Product=slug/);
assert.match(js,/cta\.dataset\.product=slug/);
assert.match(js,/button\.dataset\.product=slug/);
assert.match(js,/function enhanceHeader\(\)/);
assert.match(js,/function enhanceHero\(\)/);
assert.match(js,/function enhanceFilters\(\)/);
assert.match(js,/function enhanceProductCards\(\)/);
assert.match(js,/function enhanceTrust\(\)/);
assert.match(js,/button\.textContent=canBuy\?'สั่งซื้อ':'ดูรายละเอียด'/);
assert.match(js,/กำลังเตรียมข้อมูลสำหรับการจำหน่าย จึงยังไม่เปิดรับคำสั่งซื้อ/);
assert.match(js,/ผลิตภัณฑ์ของเรา/);
assert.match(js,/openProduct\(p\)/);
assert.doesNotMatch(js,/Math\.random/);
assert.doesNotMatch(js,/ขายแล้ว/);
assert.doesNotMatch(js,/★★★★★|⭐/);
assert.doesNotMatch(js,/rating\s*[:=]\s*[45](?:\.|\b)/i);

assert.ok(pkg.scripts['qa:v132']);
assert.match(pkg.scripts.check,/storefront-v132-conversion-smoke\.mjs/);

console.log('storefront v1.32.1 canonical product identity + conversion canvas + search visibility + commerce integrity smoke: OK');
