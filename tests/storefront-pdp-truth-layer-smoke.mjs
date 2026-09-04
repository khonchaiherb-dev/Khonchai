import fs from 'node:fs';
import assert from 'node:assert/strict';

const js=fs.readFileSync('public/kch-pdp-truth-layer.js','utf8');
const detail=fs.readFileSync('functions/api/product-detail.js','utf8');
const reviews=fs.readFileSync('functions/api/reviews.js','utf8');
const social=fs.readFileSync('functions/api/social-feed.js','utf8');
const middleware=fs.readFileSync('functions/_middleware.js','utf8');

for(const token of ['/api/product-detail','/api/reviews?productId=','/api/social-feed?productId=','verifiedPurchase===true','available_stock','Verified Purchase','ยังไม่มีรีวิวจากผู้ซื้อที่ยืนยันแล้ว','reviewMedia','renderGallery','renderSocial','renderReviews'])assert.ok(js.includes(token),`PDP truth layer missing: ${token}`);
for(const token of ['sale_verified=1','product_media','available_stock','variants','media:media.results'])assert.ok(detail.includes(token),`product detail API missing truth source: ${token}`);
for(const token of ['verified_purchase','verifiedPurchase:Boolean','review_media'])assert.ok(reviews.includes(token),`reviews API missing verification source: ${token}`);
for(const token of ['productId','content_products','mediaUrl','products:byContent'])assert.ok(social.includes(token),`social feed missing product-linked content source: ${token}`);
assert.ok(!js.includes('sold_count'),'PDP truth UI must not surface legacy sold counts');
assert.ok(!js.includes('viewer_count'),'PDP truth UI must not surface social vanity counts');
assert.ok(!js.includes('like_count'),'PDP truth UI must not surface social vanity counts');
assert.ok(!js.includes('Math.random'),'PDP truth layer must not generate commerce/review data');

const canonical=middleware.indexOf('/kch-canonical-commerce-ui.js?v=2026.09.05');
const truth=middleware.indexOf('/kch-pdp-truth-layer.js?v=2026.09.05');
assert.ok(canonical>=0&&truth>canonical,'PDP truth layer must load after canonical customer UI');

console.log('storefront verified PDP truth layer smoke: OK');
