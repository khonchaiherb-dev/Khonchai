import fs from 'node:fs';
import assert from 'node:assert/strict';

const css=fs.readFileSync('public/tshop-v131-top-conversion.css','utf8');
const js=fs.readFileSync('public/kch-top-conversion.js','utf8');
const middleware=fs.readFileSync('functions/_middleware.js','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));

// v1.31 remains in the repository for history/regression reference, but the
// structural cleanup must not load its top-level CSS/JS into production HTML.
assert.doesNotMatch(middleware,/tshop-v131-top-conversion\.css/);
assert.doesNotMatch(middleware,/kch-top-conversion\.js/);
assert.match(middleware,/tshop-v134-structural-storefront\.css\?v=1\.34\.2/);
assert.match(middleware,/kch-v134-structural-storefront\.js\?v=1\.34\.2/);

assert.match(css,/grid-template-columns:minmax\(215px,\.72fr\) minmax\(390px,1\.45fr\)/);
assert.match(css,/\.kch-v131-member-interrupt\{display:none!important\}/);
assert.match(js,/const BUILD='1\.31\.2'/);
assert.match(js,/Number\(p\?\.sale_verified\)===1/);
assert.match(js,/normalize\('NFKC'\)/);
assert.match(js,/tokens\.every\(token=>hay\.includes\(token\)\)/);
assert.doesNotMatch(js,/Math\.random/);
assert.doesNotMatch(js,/ขายแล้ว/);
assert.doesNotMatch(js,/★★★★★|⭐/);

assert.ok(pkg.scripts['qa:v131']);
assert.match(pkg.scripts.check,/storefront-v131-top-conversion-smoke\.mjs/);

console.log('storefront v1.31 historical integrity + superseded production layer smoke: OK');
