import assert from 'node:assert/strict';
import fs from 'node:fs';

const entry=fs.readFileSync('public/seller-center.html','utf8');
const portal=fs.readFileSync('public/seller-center-v2.html','utf8');
const bridge=fs.readFileSync('public/app-admin-actions.js','utf8');
const guard=fs.readFileSync('public/kch-production-guard.js','utf8');
const wrangler=fs.readFileSync('wrangler.jsonc','utf8');
const staffAuth=fs.readFileSync('functions/_lib/staff-auth.js','utf8');
const login=fs.readFileSync('functions/api/staff/login.js','utf8');
const adminMiddleware=fs.readFileSync('functions/api/admin/_middleware.js','utf8');
const adminLib=fs.readFileSync('functions/_lib/admin.js','utf8');

assert.match(entry,/seller-center-v2\.html/);
assert.match(entry,/noindex,nofollow,noarchive/);

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
assert.match(bridge,/\[data-go=["']seller["']\]/);
assert.match(bridge,/kch-production-guard\.js/);
assert.match(bridge,/__KCH_MASTER_SEARCH__/);
assert.match(bridge,/tshop-searchbox input/);
assert.match(bridge,/data\.kchSearchMatch/);
assert.match(bridge,/stopImmediatePropagation/);
assert.doesNotMatch(bridge,/kch-admin-token/);
assert.doesNotMatch(bridge,/sessionStorage/);
assert.doesNotMatch(bridge,/Authorization\s*:/);

assert.match(guard,/sale_verified/);
assert.match(guard,/ขายแล้ว/);
assert.match(guard,/สินค้าขายดี/);
assert.match(guard,/__KCH_MASTER_SEARCH__/);
assert.match(guard,/owner\?\.apply\?\.\(\)/);
assert.doesNotMatch(guard,/addEventListener\(['"]input['"]/);
assert.doesNotMatch(guard,/addEventListener\(['"]search['"]/);
assert.match(guard,/MutationObserver/);

assert.match(wrangler,/"LEGACY_ADMIN_ENABLED"\s*:\s*"false"/);
assert.match(wrangler,/"STAFF_CSRF_ENFORCE"\s*:\s*"true"/);
assert.match(staffAuth,/verifyStaffCsrf/);
assert.match(login,/HttpOnly; Secure; SameSite=Strict/);
assert.match(login,/account_temporarily_locked/);

assert.match(adminMiddleware,/getStaffSession/);
assert.match(adminMiddleware,/headers\.delete\('Authorization'\)/);
assert.match(adminMiddleware,/X-KCH-Internal-Admin/);
assert.doesNotMatch(adminMiddleware,/Bearer \$\{env\.ADMIN_TOKEN\}/);
assert.match(adminLib,/LEGACY_ADMIN_ENABLED/);
assert.match(adminLib,/X-KCH-Internal-Admin/);

console.log('admin portal security smoke: OK');
