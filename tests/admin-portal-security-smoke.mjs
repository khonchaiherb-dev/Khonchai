import assert from 'node:assert/strict';
import fs from 'node:fs';

const portal=fs.readFileSync('public/seller-center.html','utf8');
const bridge=fs.readFileSync('public/app-admin-actions.js','utf8');
const guard=fs.readFileSync('public/kch-production-guard.js','utf8');
const wrangler=fs.readFileSync('wrangler.jsonc','utf8');
const staffAuth=fs.readFileSync('functions/_lib/staff-auth.js','utf8');
const login=fs.readFileSync('functions/api/staff/login.js','utf8');

assert.match(portal,/\/api\/staff\/login/);
assert.match(portal,/\/api\/staff\/me/);
assert.match(portal,/\/api\/staff\/logout/);
assert.match(portal,/credentials:'same-origin'/);
assert.match(portal,/X-KCH-CSRF/);
assert.doesNotMatch(portal,/Admin token/i);
assert.doesNotMatch(portal,/kch-admin-token/);
assert.doesNotMatch(portal,/sessionStorage/);
assert.doesNotMatch(portal,/Authorization\s*:/);

assert.match(bridge,/seller-center\.html/);
assert.match(bridge,/\[data-go=\\"seller\\"\]/);
assert.match(bridge,/kch-production-guard\.js/);
assert.doesNotMatch(bridge,/kch-admin-token/);
assert.doesNotMatch(bridge,/sessionStorage/);
assert.doesNotMatch(bridge,/Authorization\s*:/);

assert.match(guard,/sale_verified/);
assert.match(guard,/ขายแล้ว/);
assert.match(guard,/สินค้าขายดี/);
assert.match(guard,/tshop-searchbox input/);
assert.match(guard,/MutationObserver/);

assert.match(wrangler,/"LEGACY_ADMIN_ENABLED"\s*:\s*"false"/);
assert.match(wrangler,/"STAFF_CSRF_ENFORCE"\s*:\s*"true"/);
assert.match(staffAuth,/verifyStaffCsrf/);
assert.match(login,/HttpOnly; Secure; SameSite=Strict/);
assert.match(login,/account_temporarily_locked/);

console.log('admin portal security smoke: OK');
