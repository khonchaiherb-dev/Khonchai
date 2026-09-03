import fs from 'node:fs';
import assert from 'node:assert/strict';

const read=p=>fs.readFileSync(p,'utf8');
const js=read('public/kch-v137-contextual-care.js');
const css=read('public/kch-v137-contextual-care.css');
const middleware=read('functions/_middleware.js');
const support=read('public/support.js');

for(const token of ['KHONCHAIHERB CARE','ช่วยเหลือ','ติดตาม / แจ้งปัญหาคำสั่งซื้อ','การจัดส่งและพัสดุ','คืนสินค้า / คืนเงิน','ติดตามเคสเดิม'])assert.ok(js.includes(token),`missing care launcher token: ${token}`);
for(const token of ['category','subject','orderNo','focus','knowledge'])assert.ok(js.includes(token),`missing contextual support parameter: ${token}`);
assert.ok(js.includes("url.searchParams.set('orderNo',orderNo)"),'order number is not carried to support');
assert.ok(!js.includes("searchParams.set('phone'"),'phone must not be placed in support URL');
assert.ok(!js.includes('Math.random'),'care launcher must be deterministic');
assert.match(js,/Escape/);
assert.match(js,/aria-expanded/);

for(const token of ['.kch-v137-care-trigger','.kch-v137-care-panel','.kch-v137-care-action','min-height:50px','@media(max-width:720px)','env(safe-area-inset-bottom)'])assert.ok(css.includes(token),`missing care style: ${token}`);
for(const token of ['/kch-v137-contextual-care.css?v=1.37.0','/kch-v137-contextual-care.js?v=1.37.0'])assert.ok(middleware.includes(token),`middleware missing v1.37 asset: ${token}`);
for(const token of ['applyStorefrontContext','URLSearchParams(location.search)','orderNo','focus===\'track\''])assert.ok(support.includes(token),`support prefill missing: ${token}`);

console.log('storefront v1.37 contextual care smoke: OK');
