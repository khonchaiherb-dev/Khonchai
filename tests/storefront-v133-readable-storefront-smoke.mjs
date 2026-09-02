import fs from 'node:fs';
import assert from 'node:assert/strict';

const css=fs.readFileSync('public/tshop-v133-readable-storefront.css','utf8');
const js=fs.readFileSync('public/kch-readable-storefront.js','utf8');
const middleware=fs.readFileSync('functions/_middleware.js','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));

assert.match(middleware,/tshop-v133-readable-storefront\.css\?v=1\.33\.0/);
assert.match(middleware,/kch-readable-storefront\.js\?v=1\.33\.0/);
assert.ok(middleware.indexOf('tshop-v133-readable-storefront.css')>middleware.indexOf('tshop-v1321-search-visibility-fix.css'));
assert.ok(middleware.indexOf('kch-readable-storefront.js')>middleware.indexOf('kch-conversion-storefront.js'));

assert.match(css,/--kch-v133-shell:1760px/);
assert.match(css,/--kch-v133-content:1540px/);
assert.match(css,/\.kch-master-shell \.kch-ref-menu button[\s\S]*font-size:16px!important/);
assert.match(css,/\.kch-master-shell \.search input[\s\S]*font-size:16px!important/);
assert.match(css,/\.kch-master-shell \.kch-master-product h3[\s\S]*font-size:18px!important/);
assert.match(css,/\.kch-master-shell \.kch-master-product-meta[\s\S]*font-size:14px!important/);
assert.match(css,/\.kch-v133-account-action[\s\S]*min-height:48px!important/);
assert.match(css,/\.kch-v133-action-copy b[\s\S]*font-size:15px!important/);
assert.match(css,/\.kch-v133-action-copy small[\s\S]*font-size:14px!important/);
assert.match(css,/\.kch-v133-legacy-account-strip\{display:none!important\}/);
assert.match(css,/\.kch-master-product\[hidden\]\{display:none!important\}/);
assert.match(css,/@media \(max-width:699px\)/);

assert.match(js,/const BUILD='1\.33\.0'/);
assert.match(js,/function ensureAccountAction\(shell,header,actions\)/);
assert.match(js,/บัญชีสมาชิก/);
assert.match(js,/เข้าสู่ระบบ \/ สมัครสมาชิก/);
assert.match(js,/normalizeUtilityAction\(orders,'คำสั่งซื้อ','ติดตามสถานะ'\)/);
assert.match(js,/normalizeUtilityAction\(cart,'ตะกร้า','ดูสินค้า'\)/);
assert.match(js,/function hideLegacyAccountStrip\(shell,accountButton\)/);
assert.match(js,/typeof account==='function'/);
assert.doesNotMatch(js,/Math\.random/);
assert.doesNotMatch(js,/sale_verified\s*=|price\s*=|stock\s*=/);

assert.ok(pkg.scripts['qa:v133']);
assert.match(pkg.scripts.check,/storefront-v133-readable-storefront-smoke\.mjs/);

console.log('storefront v1.33 readable header + typography baseline smoke: OK');
