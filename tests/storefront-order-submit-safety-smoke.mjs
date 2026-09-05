import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const [guard,middleware,core]=await Promise.all([
  readFile('public/storefront-v1-order-submit-safety.js','utf8'),
  readFile('functions/_middleware.js','utf8'),
  readFile('public/storefront-v1.js','utf8')
]);

assert.match(guard,/const STORAGE_KEY='kch-order-submit-attempts-v1'/,'submission safety must use session-scoped retry state');
assert.match(guard,/crypto\.subtle\.digest\('SHA-256'/,'retry fingerprint must avoid persisting raw checkout PII');
assert.match(guard,/delete copy\.idempotencyKey/,'fingerprint must ignore the newly generated core idempotency key');
assert.match(guard,/const inflight=new Map\(\)/,'duplicate in-flight order requests must be coalesced');
assert.match(guard,/if\(existing\)return existing\.then\(response=>response\.clone\(\)\)/,'same-payload concurrent order fetches must share one network request');
assert.match(guard,/response\.status>=400&&response\.status<500\)forget\(fp\)/,'definitive client rejections may release the retry key');
assert.doesNotMatch(guard,/localStorage\.setItem\(/,'raw retry safety state must not be persisted in localStorage');
assert.match(guard,/sessionStorage\.setItem\(STORAGE_KEY/,'uncertain retries must persist only in the tab session');
assert.match(guard,/document\.querySelector\('\.kch-success'\)/,'retry key must clear only after core renders confirmed success');

assert.match(core,/if\(state\.placing\)return/,'core checkout must retain its rapid-submit lock');
assert.match(core,/finally\{state\.placing=false\}/,'core checkout must release its submit lock after success/failure handling');
assert.match(core,/catch\(e\)[\s\S]*btn\.disabled=false/,'core checkout must re-enable retry after a failed order response');

const safetyAsset='/storefront-v1-order-submit-safety.js?v=2026.09.05.1';
assert.ok(middleware.includes(safetyAsset),'canonical home must inject duplicate-order safety');
const safetyIndex=middleware.indexOf('src="${STOREFRONT_ORDER_SUBMIT_SAFETY}"');
const phoneIndex=middleware.indexOf('src="${STOREFRONT_PHONE_INTEGRITY}"');
const preflightIndex=middleware.indexOf('src="${STOREFRONT_ORDER_PREFLIGHT}"');
assert.ok(safetyIndex>=0&&phoneIndex>safetyIndex&&preflightIndex>phoneIndex,'submit safety must wrap fetch before phone/preflight click guards execute');

console.log('PASS duplicate-order safety: stable retry idempotency, in-flight coalescing, no raw PII persistence and retry UX contract');
