import fs from 'node:fs';
import assert from 'node:assert/strict';

const guard=fs.readFileSync('public/storefront-v1-address-integrity.js','utf8');
const orders=fs.readFileSync('functions/api/orders.js','utf8');
const recovery=fs.readFileSync('public/storefront-v1-checkout-error-recovery.js','utf8');
const middleware=fs.readFileSync('functions/_middleware.js','utf8');

for(const marker of [
  "const THAI_DIGITS={'๐':'0'",
  'normalizePostal',
  'PLACEHOLDERS',
  "selector:'#customer-address'",
  "selector:'#customer-subdistrict'",
  "selector:'#customer-district'",
  "selector:'#customer-province'",
  "selector:'#customer-postal'",
  "event.stopImmediatePropagation()"
])assert.ok(guard.includes(marker),`missing frontend address-integrity contract: ${marker}`);

assert.ok(!/localStorage\.(?:setItem|removeItem)/.test(guard),'address guard must not persist delivery PII in localStorage');
assert.ok(!/sessionStorage\.(?:setItem|removeItem)/.test(guard),'address guard must not persist delivery PII in sessionStorage');
assert.ok(guard.includes("replace(/[๐-๙]/g"),'frontend must convert Thai postal digits');
assert.ok(guard.includes("/^\\d{5}$/.test(normalizePostal(value))"),'frontend must require an exact five-digit postal code after normalization');

for(const marker of [
  "const normalizePostalCode=s=>",
  "replace(/[๐-๙]/g",
  "error:'invalid_delivery_address',field:'address'",
  "error:'invalid_delivery_address',field:'subdistrict'",
  "error:'invalid_delivery_address',field:'district'",
  "error:'invalid_delivery_address',field:'province'",
  "error:'invalid_postal_code',field:'postal'"
])assert.ok(orders.includes(marker),`missing Order API address-integrity contract: ${marker}`);

assert.ok(orders.indexOf("error:'invalid_postal_code'")<orders.indexOf('const attr=body.attribution'), 'address validation must run before attribution/inventory/order creation');
assert.ok(orders.includes("replace(/[\\u00a0\\t\\r\\n]+/g,' ')"),'Order API must normalize delivery whitespace');

assert.ok(recovery.includes("code==='invalid_postal_code'"),'checkout recovery must explain postal-code failures');
assert.ok(recovery.includes("code==='invalid_delivery_address'"),'checkout recovery must explain address-field failures');
assert.ok(recovery.includes("#customer-postal"),'postal failure must focus the postal field');

assert.ok(middleware.includes("STOREFRONT_ADDRESS_INTEGRITY='/storefront-v1-address-integrity.js?v=2026.09.05.1'"),'middleware must version and inject address guard');
const addressInject=middleware.indexOf('src="${STOREFRONT_ADDRESS_INTEGRITY}"');
const preflightInject=middleware.indexOf('src="${STOREFRONT_ORDER_PREFLIGHT}"');
assert.ok(addressInject>=0&&preflightInject>=0&&addressInject<preflightInject,'address guard must load before final order preflight');

console.log('COD delivery address integrity contract: OK');
