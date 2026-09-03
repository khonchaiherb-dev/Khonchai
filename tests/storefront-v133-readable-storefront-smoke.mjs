import fs from 'node:fs';
import assert from 'node:assert/strict';

const css=fs.readFileSync('public/tshop-v133-readable-storefront.css','utf8');
const js=fs.readFileSync('public/kch-readable-storefront.js','utf8');
const middleware=fs.readFileSync('functions/_middleware.js','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));

assert.match(middleware,/tshop-v133-readable-storefront\.css\?v=1\.33\.1/);
assert.match(middleware,/kch-readable-storefront\.js\?v=1\.33\.1/);
assert.ok(middleware.indexOf('tshop-v133-readable-storefront.css')>middleware.indexOf('tshop-v1321-search-visibility-fix.css'));
assert.ok(middleware.indexOf('kch-readable-storefront.js')>middleware.indexOf('kch-conversion-storefront.js'));

assert.match(css,/v1\.33\.1/);
assert.match(css,/--kch-v133-shell:1760px/);
assert.match(css,/--kch-v133-content:1540px/);
assert.match(css,/\.shell\.kch-master-shell\.kch-v131\.kch-v132\.kch-v133-readable-storefront \.kch-ref-menu button/);
assert.match(css,/\.shell\.kch-master-shell\.kch-v133-readable-storefront \.kch-master-home\.kch-v131-home\.kch-v132-home \.kch-master-product-copy h3/);
assert.match(css,/font-size:18px!important/);
assert.match(css,/font-size:16px!important/);
assert.match(css,/font-size:14px!important/);
assert.match(css,/min-height:48px!important/);
assert.match(css,/\.kch-v133-legacy-account-strip\{display:none!important\}/);
assert.match(css,/\.kch-master-product\[hidden\]\{display:none!important\}/);
assert.match(css,/\.kch-source-card-copy p\{font-size:14px!important/);
assert.match(css,/@media\(max-width:699px\)/);

assert.match(js,/const BUILD='1\.33\.1'/);
assert.match(js,/function ensureAccountAction\(header,actions\)/);
assert.match(js,/บัญชีสมาชิก/);
assert.match(js,/เข้าสู่ระบบ \/ สมัครสมาชิก/);
assert.match(js,/normalizeUtilityAction\(orders,'คำสั่งซื้อ','ติดตามสถานะ'\)/);
assert.match(js,/normalizeUtilityAction\(cart,'ตะกร้า','ดูสินค้า'\)/);
assert.match(js,/function hideLegacyAccountStrip\(shell,accountButton\)/);
assert.match(js,/typeof account==='function'/);

// Canonical search must be owned by window.__KCH_MASTER_SEARCH__; v1.31 state is compatibility-only.
assert.match(js,/function masterSearchOwner\(\)\{return window\.__KCH_MASTER_SEARCH__/);
assert.match(js,/window\.addEventListener\('input',acceptCanonicalSearchInput,true\)/);
assert.match(js,/window\.addEventListener\('search',acceptCanonicalSearchInput,true\)/);
assert.match(js,/owner\.source='v133-window-input'/);
assert.match(js,/card\.dataset\.kchV131SearchMatch=state/);
assert.match(js,/card\.removeAttribute\('data-kch-v131-search-match'\)/);

// Tablet structural actions must retain an accessible 48x48 minimum hit target without adding a new tshop layer.
assert.match(js,/@media\(max-width:860px\) and \(min-width:561px\)/);
assert.match(js,/grid-template-columns:repeat\(3,48px\)!important/);
assert.match(js,/min-width:48px!important;min-height:48px!important/);
assert.doesNotMatch(js,/Math\.random/);
assert.doesNotMatch(js,/sale_verified\s*=|price\s*=|stock\s*=/);

assert.ok(pkg.scripts['qa:v133']);
assert.match(pkg.scripts.check,/storefront-v133-readable-storefront-smoke\.mjs/);

console.log('storefront v1.33.1 readable header + canonical search + tablet touch baseline smoke: OK');
