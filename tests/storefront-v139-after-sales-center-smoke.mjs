import fs from 'node:fs';
import assert from 'node:assert/strict';

const read=p=>fs.readFileSync(p,'utf8');
const page=read('public/my-orders.html');
const member=read('public/kch-v139-member-orders-bridge.js');
const bridge=read('public/kch-v139-after-sales-bridge.js');
const middleware=read('functions/_middleware.js');
const ordersApi=read('functions/api/customer/orders.js');
const returnsApi=read('functions/api/customer/returns.js');
const receiptApi=read('functions/api/receipt.js');

for(const token of ['คำสั่งซื้อของฉัน','/api/customer/orders?limit=50','/api/customer/returns','/api/receipt?orderNo=','data-receipt','data-return','ส่งคำขอ','ศูนย์ช่วยเหลือ KHONCHAIHERB'])assert.ok(page.includes(token),`missing my-orders token: ${token}`);
assert.ok(page.includes("method:'POST'"),'return request must be an explicit POST action');
assert.ok(page.includes("credentials:'same-origin'"),'member order center must use same-origin credentials');
assert.ok(!page.includes("searchParams.set('phone'"),'support URLs must not contain customer phone');
assert.ok(page.includes("['paid','cod_collected']"),'receipt action must be gated to collected payment states');
assert.ok(page.includes("statusKey(o)!=='delivered'"),'return UI must stay gated to delivered orders');

for(const token of ['/my-orders.html','ดูคำสั่งซื้อและบริการหลังการขาย','MutationObserver'])assert.ok(member.includes(token),`missing member bridge token: ${token}`);
for(const token of ['KCHAfterSales','openTracker','ติดตามคำสั่งซื้อ','kch-v139-my-orders','/my-orders.html'])assert.ok(bridge.includes(token),`missing after-sales bridge token: ${token}`);
for(const token of ['/kch-v139-after-sales-bridge.js?v=1.39.0','/kch-v139-member-orders-bridge.js?v=1.39.0','my-orders'])assert.ok(middleware.includes(token),`middleware missing v1.39 token: ${token}`);

for(const token of ['shipmentEvents','orderEvents','tracking_no','cod_collected_at'])assert.ok(ordersApi.includes(token),`orders API missing detail token: ${token}`);
for(const token of ["fulfillment_status!=='delivered'",'request_exists','return_requested'])assert.ok(returnsApi.includes(token),`returns API missing safety token: ${token}`);
for(const token of ["payment_status==='paid'","payment_status==='cod_collected'",'eligible'])assert.ok(receiptApi.includes(token),`receipt API missing payment gate: ${token}`);

console.log('storefront v1.39 unified after-sales center smoke: OK');
