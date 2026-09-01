import assert from 'node:assert/strict';
import fs from 'node:fs';

const core=fs.readFileSync('public/app-core.js','utf8');
const html=fs.readFileSync('public/index.html','utf8');
const staged=fs.readFileSync('db/migrations/0017_chiang_da_products.sql','utf8');
const assets=[
  'public/assets/products/rang-jued-tea-360.webp',
  'public/assets/products/chiang-da-tea-360.webp',
  'public/assets/products/gymnema-capsules-100-512.webp'
];
for(const asset of assets){assert.ok(fs.existsSync(asset),`missing real product media: ${asset}`);assert.ok(fs.statSync(asset).size>8000,`unexpectedly small product media: ${asset}`)}
assert.match(core,/STATIC_PRODUCT_MEDIA/);
assert.match(core,/rang-jued-tea-360\.webp/);
assert.match(core,/chiang-da-tea-360\.webp/);
assert.match(core,/gymnema-capsules-100-512\.webp/);
assert.match(core,/p\.image_url\|\|p\.image\|\|STATIC_PRODUCT_MEDIA\[slug\]/);
assert.match(core,/comingSoon:Boolean\(p\.comingSoon\)\|\|price<=0/);
assert.match(staged,/8,'chiang-da-tea'/);
assert.match(staged,/9,'gymnema-capsules-100'/);
assert.match(staged,/0,NULL,0,0,0,5,0,0,0/);
assert.match(html,/id="kch-product-detail-upgrade"/);
assert.match(html,/kch-pdp-20/);
assert.match(html,/kch-pdp-assurance/);
assert.match(html,/ราคาเร็ว ๆ นี้/);
assert.match(html,/อยู่ระหว่างเตรียมจำหน่าย/);
assert.match(html,/function productSchema/);
assert.match(html,/'@type':'Product'/);
assert.match(html,/price>0&&!p\.comingSoon/);
assert.match(html,/https:\/\/schema\.org\/InStock/);
assert.match(html,/meta\[property="og:image"\]/);
assert.doesNotMatch(html,/tshop-v119/);
console.log('real product media + PDP 2.0 + dynamic product SEO smoke: OK');
