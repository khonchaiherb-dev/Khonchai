import fs from 'node:fs';
import assert from 'node:assert/strict';

const read=p=>fs.readFileSync(p,'utf8');
const quote=read('functions/api/checkout-quote.js');
const integrity=read('public/kch-commerce-integrity.js');
const guided=read('public/kch-guided-sales.js');
const middleware=read('functions/_middleware.js');

for(const token of ['sale_verified','reserved_stock','promotions','store_settings','paymentMethods:[\'COD\']','quoteSource:\'server\''])assert.ok(quote.includes(token),`checkout quote missing: ${token}`);
for(const forbidden of ['INSERT INTO','UPDATE products','UPDATE orders','DELETE FROM'])assert.ok(!quote.includes(forbidden),`checkout quote must stay read-only: ${forbidden}`);

for(const token of ['/api/checkout-quote','/api/orders','stopImmediatePropagation','customer-district','customer-province','customer-postal','idempotencyKey','paymentMethod:\'COD\'','ระบบจะไม่สร้างเลขออเดอร์จำลอง','addCanonicalProduct','openOrders'])assert.ok(integrity.includes(token),`commerce integrity missing: ${token}`);
assert.ok(!integrity.includes("data={ok:true,orderNo:'KCH'"),'integrity layer must not create local fake orders');

for(const token of ['/api/products','เปรียบเทียบสินค้า','addCanonicalProduct','ไม่ใช้รีวิวหรือยอดขายสมมติ','data-kch-assistant=\'compare\'','data-kch-assistant=\'quick\''])assert.ok(guided.includes(token),`guided sales missing: ${token}`);

for(const token of ['/kch-master-reference-2026.css?v=2026.09.05','/kch-master-reference-2026.js?v=2026.09.05','/kch-commerce-integrity.js?v=2026.09.05','/kch-guided-sales.js?v=2026.09.05'])assert.ok(middleware.includes(token),`middleware missing storefront authority asset: ${token}`);
const live=middleware.indexOf('/kch-live-catalog-guard.js');
const master=middleware.indexOf('/kch-master-reference-2026.js');
const safe=middleware.indexOf('/kch-commerce-integrity.js');
const sales=middleware.indexOf('/kch-guided-sales.js');
assert.ok(live>=0&&master>live&&safe>master&&sales>safe,'storefront authority assets must load after legacy/live guard in deterministic order');
assert.ok(middleware.includes("if(canonicalPath==='/')"),'Master Reference must be scoped to canonical storefront root');

console.log('storefront commerce integrity and guided sales smoke: OK');
