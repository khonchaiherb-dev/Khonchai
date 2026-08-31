import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const index=read('public/index.html');
const sw=read('public/sw.js');
const wrangler=read('wrangler.jsonc');
const readiness=read('functions/api/admin/launch-readiness.js');
const health=read('functions/api/health.js');
const pkg=JSON.parse(read('package.json'));

const scripts=[...index.matchAll(/<script[^>]+src="([^"]+)"/g)].map(x=>x[1]);
const styles=[...index.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)].map(x=>x[1]);
assert.equal(new Set(scripts).size,scripts.length,'duplicate script reference');
assert.equal(new Set(styles).size,styles.length,'duplicate stylesheet reference');
assert.ok(scripts.length<=31,`frontend script budget regressed: ${scripts.length}`);
assert.ok(styles.length<=28,`frontend stylesheet budget regressed: ${styles.length}`);
for(const future of ['/tshop-v119.js','/tshop-v119.css','/tshop-v120.js','/tshop-v120.css'])assert.ok(!index.includes(future),`new compatibility layer added after stabilization freeze: ${future}`);
assert.match(index,/kch-build" content="1\.18\.1"/);
assert.match(sw,/khonchaiherb-v1\.18\.1/);
assert.match(sw,/networkFirst/);
assert.match(wrangler,/"ORDER_IDEMPOTENCY_REQUIRED"\s*:\s*"true"/);
assert.doesNotMatch(wrangler,/AUTH_DEV_SHOW_CODE/);
assert.match(readiness,/customer_favorites/);
assert.match(readiness,/version:'1\.18\.1'/);
assert.match(health,/version:'1\.18\.1'/);
assert.equal(pkg.version,'1.18.1');
console.log(`production stability smoke: OK (${scripts.length} scripts, ${styles.length} styles; compatibility-layer budget frozen)`);
