import fs from 'node:fs';
import assert from 'node:assert/strict';

const js=fs.readFileSync('public/kch-v134-structural-storefront.js','utf8');
const css=fs.readFileSync('public/tshop-v134-structural-storefront.css','utf8');
const sw=fs.readFileSync('public/sw.js','utf8');
const middleware=fs.readFileSync('functions/_middleware.js','utf8');

assert.match(js,/const BUILD='1\.34\.6'/);
assert.match(js,/function pruneLegacy\(root\)/);
assert.match(js,/\.tshop-topbar,\.topbar,\.kch-master-topbar,\.kch-ref-menu,\.tshop-menu,\.tshop-nav/);
assert.match(js,/el\.hidden=true/);
assert.match(js,/el\.inert=true/);
assert.match(js,/looksLikeAccountStrip/);
assert.match(js,/normalize\('NFKC'\)/);
assert.match(js,/function repairMaterialIcons\(root\)/);
assert.match(js,/\.material-symbols-rounded/);
assert.match(js,/shopping_cart:/);
assert.match(js,/receipt_long:/);
assert.match(js,/assignment_turned_in:/);
assert.match(js,/el\.innerHTML=svg\(path\)/);
assert.match(js,/<svg viewBox=/);
assert.doesNotMatch(js,/Math\.random|ขายแล้ว|★★★★★|⭐/);

assert.match(css,/v1\.34\.6/);
assert.match(css,/\.kch-v134-retired-chrome\[hidden\]\{display:none!important/);
assert.match(css,/\.material-symbols-rounded\[data-kch-svg-fallback\]/);
assert.match(css,/\.material-symbols-rounded\[data-kch-svg-fallback\] svg/);
assert.match(css,/#kch-v134-search[\s\S]*font-size:16px!important/);
assert.match(css,/#kch-v134-nav button[\s\S]*min-height:52px!important[\s\S]*font-size:16px!important/);
assert.match(css,/grid-template-columns:repeat\(3,48px\)!important/);
assert.match(css,/min-width:48px!important;min-height:48px!important/);
assert.match(css,/\.kch-v134-action-icon svg/);

assert.match(middleware,/tshop-v134-structural-storefront\.css\?v=1\.34\.6/);
assert.match(middleware,/kch-v134-structural-storefront\.js\?v=1\.34\.6/);
assert.match(sw,/khonchaiherb-v1\.18\.2-ui1\.34\.6/);
assert.match(sw,/tshop-v134-structural-storefront\.css\?v=1\.34\.6/);
assert.match(sw,/kch-v134-structural-storefront\.js\?v=1\.34\.6/);

console.log('storefront v1.34.6 urgent structural smoke: OK');
