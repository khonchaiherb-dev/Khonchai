import fs from 'node:fs';
import assert from 'node:assert/strict';

const js=fs.readFileSync('public/kch-pdp-truth-layer.js','utf8');
const middleware=fs.readFileSync('functions/_middleware.js','utf8');

for(const token of ['/api/product-detail','/api/reviews?productId=','/api/social-feed?productId=','verifiedPurchase===true','available_stock','product_media','Verified Purchase','ยังไม่มีรีวิวจากผู้ซื้อที่ยืนยันแล้ว','reviewMedia','renderGallery','renderSocial','renderReviews'])assert.ok(js.includes(token),`PDP truth layer missing: ${token}`);
assert.ok(!js.includes('sold_count'),'PDP truth UI must not surface legacy sold counts');
assert.ok(!js.includes('viewer_count'),'PDP truth UI must not surface social vanity counts');
assert.ok(!js.includes('like_count'),'PDP truth UI must not surface social vanity counts');
assert.ok(!js.includes('Math.random'),'PDP truth layer must not generate commerce/review data');

const canonical=middleware.indexOf('/kch-canonical-commerce-ui.js?v=2026.09.05');
const truth=middleware.indexOf('/kch-pdp-truth-layer.js?v=2026.09.05');
assert.ok(canonical>=0&&truth>canonical,'PDP truth layer must load after canonical customer UI');

console.log('storefront verified PDP truth layer smoke: OK');
