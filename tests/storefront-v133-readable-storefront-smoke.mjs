import fs from 'node:fs';
import assert from 'node:assert/strict';

const css=fs.readFileSync('public/tshop-v133-readable-storefront.css','utf8');
const js=fs.readFileSync('public/kch-readable-storefront.js','utf8');
const structuralCss=fs.readFileSync('public/tshop-v134-structural-storefront.css','utf8');
const structuralJs=fs.readFileSync('public/kch-v134-structural-storefront.js','utf8');
const middleware=fs.readFileSync('functions/_middleware.js','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));

assert.doesNotMatch(middleware,/tshop-v133-readable-storefront\.css/);
assert.doesNotMatch(middleware,/kch-readable-storefront\.js/);
assert.match(middleware,/tshop-v134-structural-storefront\.css\?v=1\.34\.6/);
assert.match(middleware,/kch-v134-structural-storefront\.js\?v=1\.34\.6/);

assert.match(css,/v1\.33\.1/);
assert.match(css,/font-size:18px!important/);
assert.match(css,/font-size:16px!important/);
assert.match(css,/font-size:14px!important/);
assert.match(js,/const BUILD='1\.33\.1'/);
assert.match(js,/บัญชีสมาชิก/);
assert.match(js,/คำสั่งซื้อ/);
assert.match(js,/ตะกร้า/);
assert.doesNotMatch(js,/Math\.random/);

assert.match(structuralCss,/v1\.34\.6/);
assert.match(structuralCss,/\.kch-v134-retired-chrome\[hidden\]\{display:none!important/);
assert.match(structuralCss,/font-size:16px!important/);
assert.match(structuralCss,/min-height:52px!important/);
assert.match(structuralJs,/const BUILD='1\.34\.6'/);
assert.match(structuralJs,/function pruneLegacy\(root\)/);
assert.match(structuralJs,/el\.hidden=true/);
assert.match(structuralJs,/el\.inert=true/);
assert.match(structuralJs,/tshop-topbar/);
assert.match(structuralJs,/kch-master-topbar/);
assert.match(structuralJs,/looksLikeAccountStrip/);
assert.match(structuralJs,/input\[type="search"\]/);
assert.match(structuralJs,/normalize\('NFKC'\)/);
assert.match(structuralJs,/<svg viewBox=/);
assert.doesNotMatch(structuralJs,/material-symbols-rounded/);
assert.doesNotMatch(structuralJs,/Math\.random|ขายแล้ว|★★★★★|⭐/);

assert.ok(pkg.scripts['qa:v133']);
assert.match(pkg.scripts.check,/storefront-v133-readable-storefront-smoke\.mjs/);
console.log('storefront v1.33 historical fixture + v1.34.6 single-header supersession smoke: OK');
