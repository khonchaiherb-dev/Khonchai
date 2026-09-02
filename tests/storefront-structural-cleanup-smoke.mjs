import fs from 'node:fs';
import assert from 'node:assert/strict';

const middleware=fs.readFileSync('functions/_middleware.js','utf8');
const css=fs.readFileSync('public/tshop-v134-structural-storefront.css','utf8');
const js=fs.readFileSync('public/kch-v134-structural-storefront.js','utf8');
const e2e=fs.readFileSync('tests/e2e/readability.spec.mjs','utf8');
const playwright=fs.readFileSync('playwright.config.mjs','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));

assert.match(middleware,/tshop-v134-structural-storefront\.css\?v=1\.34\.2/);
assert.match(middleware,/kch-v134-structural-storefront\.js\?v=1\.34\.2/);
assert.doesNotMatch(middleware,/tshop-v131-top-conversion\.css/);
assert.doesNotMatch(middleware,/tshop-v132-conversion-storefront\.css/);
assert.doesNotMatch(middleware,/tshop-v1321-search-visibility-fix\.css/);
assert.doesNotMatch(middleware,/tshop-v133-readable-storefront\.css/);
assert.doesNotMatch(middleware,/kch-top-conversion\.js/);
assert.doesNotMatch(middleware,/kch-readable-storefront\.js/);
assert.match(middleware,/kch-conversion-storefront\.js\?v=1\.32\.0/);

assert.match(js,/const BUILD='1\.34\.2'/);
assert.match(js,/function removeInjectedHeader\(\)/);
assert.match(js,/function removeDuplicateChrome\(shell,canonicalTop,canonicalNav\)/);
assert.match(js,/function ensureActions\(top\)/);
assert.match(js,/บัญชีสมาชิก/);
assert.match(js,/คำสั่งซื้อ/);
assert.match(js,/ตะกร้า/);
assert.match(js,/tokens\.every\(token=>hay\.includes\(token\)\)/);
assert.doesNotMatch(js,/createElement\('header'\)/);
assert.doesNotMatch(js,/Math\.random/);
assert.doesNotMatch(js,/ขายแล้ว|★★★★★|⭐/);

assert.match(css,/width:min\(1920px,calc\(100vw - 32px\)\)!important/);
assert.match(css,/\.kch-master-searchbox input\{[\s\S]*?font-size:16px!important/);
assert.match(css,/\.kch-master-nav button\{[\s\S]*?font-size:16px!important/);
assert.match(css,/\.kch-master-utility-copy b\{[\s\S]*?font-size:15\.5px!important/);
assert.match(css,/\.kch-master-product-copy h3[\s\S]*?font-size:18px!important/);
assert.match(css,/\.kch-master-price\{font-size:23px!important/);
assert.match(css,/\.kch-master-hero-benefits b\{font-size:15px!important/);
assert.match(css,/\.kch-master-hero-benefits small\{[\s\S]*?font-size:13px!important/);
assert.match(css,/@media\(max-width:699px\)/);

assert.match(e2e,/toHaveCount\(1\)/);
assert.match(e2e,/data-kch-ui','1\.34\.2/);
assert.match(e2e,/structural-cleanup-\$\{viewport\.width\}\.png/);
assert.match(playwright,/desktop-1920/);
assert.match(playwright,/width:1920,height:1080/);
assert.ok(pkg.scripts['qa:structural']);
assert.match(pkg.scripts.check,/storefront-structural-cleanup-smoke\.mjs/);

console.log('structural cleanup single-header + readability + wide-desktop release gate: OK');
