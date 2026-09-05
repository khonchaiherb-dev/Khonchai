import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const [orders,guard,middleware]=await Promise.all([
  readFile('functions/api/orders.js','utf8'),
  readFile('public/storefront-v1-phone-integrity.js','utf8'),
  readFile('functions/_middleware.js','utf8')
]);

for(const source of [orders,guard]){
  assert.match(source,/normalizeThaiPhone/,'phone normalizer must exist on client and server');
  assert.match(source,/0\[689\]\\d\{8\}/,'mobile phone rule must require a Thai mobile prefix');
  assert.match(source,/0\[23457\]\\d\{7\}/,'Thai fixed-line numbers must remain supported');
  assert.match(source,/startsWith\('66'\)/,'international +66 input must normalize to national format');
  assert.match(source,/startsWith\('0066'\)/,'international 0066 input must normalize to national format');
}

assert.match(orders,/phone=normalizeThaiPhone\(body\.phone\)/,'Order API must normalize before persistence');
assert.match(orders,/if\(!validThaiPhone\(phone\)\)return json\(\{error:'invalid_phone'\},400\)/,'Order API must fail closed on malformed delivery phones');
assert.ok(orders.indexOf("error:'invalid_phone'")<orders.indexOf('const attr=body.attribution'),'invalid phone must be rejected before order commerce work');

const phoneAsset='/storefront-v1-phone-integrity.js?v=2026.09.05.1';
const preflightAsset='/storefront-v1-order-preflight.js?v=2026.09.05.1';
assert.ok(middleware.includes(phoneAsset),'canonical home must inject phone integrity guard');
assert.ok(middleware.includes(preflightAsset),'canonical home must inject final-order preflight');
assert.ok(middleware.indexOf(`src=\"${'${STOREFRONT_PHONE_INTEGRITY}'}\"`)<middleware.indexOf(`src=\"${'${STOREFRONT_ORDER_PREFLIGHT}'}\"`),'phone integrity guard must register before final-order preflight');
assert.match(guard,/event\.stopImmediatePropagation\(\)/,'invalid phone must stop the checkout click before preflight/order handlers');
assert.match(guard,/INVALID_MESSAGE='กรุณากรอกเบอร์โทรศัพท์ไทยที่ติดต่อได้/,'customer must receive a specific phone correction message');

console.log('PASS delivery phone integrity: +66 normalization, Thai phone validation, fail-closed Order API and preflight ordering');
