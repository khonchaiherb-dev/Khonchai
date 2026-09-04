import fs from 'node:fs';
import assert from 'node:assert/strict';

const ui=fs.readFileSync('public/kch-canonical-commerce-ui.js','utf8');
const middleware=fs.readFileSync('functions/_middleware.js','utf8');

for(const token of ['/api/products','KCHCommerceIntegrity','canonicalizeProduct','canonicalizeCart','removeLegacyClaims','data-go="account"','/member.html','data-go="seller"','stopImmediatePropagation','[data-add],[data-buy]','image_url','compare_at_price'])assert.ok(ui.includes(token),`canonical commerce UI missing: ${token}`);
for(const claim of ['WELCOME50','คูปองลูกค้าใหม่','ขายแล้ว','แพ็กดี จัดส่งเรียบร้อย'])assert.ok(ui.includes(claim),`legacy claim sanitizer missing: ${claim}`);
assert.ok(ui.includes("location.href='/member.html'"),'account route must use real member center');
assert.ok(!ui.includes("location.href='/seller-center-v2.html'"),'public customer UI must not expose seller center shortcut');

const guided=middleware.indexOf('/kch-guided-sales.js?v=2026.09.05');
const canonical=middleware.indexOf('/kch-canonical-commerce-ui.js?v=2026.09.05');
assert.ok(guided>=0&&canonical>guided,'canonical commerce UI must load after guided sales');

console.log('storefront canonical commerce UI smoke: OK');
