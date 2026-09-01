import fs from 'node:fs';
import assert from 'node:assert/strict';

const index=fs.readFileSync('public/index.html','utf8');
const js=fs.readFileSync('public/tshop-v119.js','utf8');
const css=fs.readFileSync('public/tshop-v119.css','utf8');

assert.match(index,/kch-build" content="1\.19\.0"/);
assert.match(index,/tshop-v119\.css\?v=1\.19\.0/);
assert.match(index,/tshop-v119\.js\?v=1\.19\.0/);
assert.match(js,/function v119ReadyProducts\(/);
assert.match(js,/v119-cart-launcher/);
assert.match(js,/function v119EnhanceCheckout\(/);
assert.match(js,/\/api\/health/);
assert.match(js,/sessionStorage/);
assert.match(css,/\.v119-ready-shelf/);
assert.match(css,/\.v119-cart-launcher/);
assert.match(css,/\.v119-checkout-progress/);
console.log('v1.19 launch conversion smoke: OK');
