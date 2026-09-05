import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const [html,coreJs,sw]=await Promise.all([
  readFile('public/index.html','utf8'),
  readFile('public/storefront-v1.js','utf8'),
  readFile('public/sw.js','utf8')
]);

const cssMatch=html.match(/href="(\/storefront-v1\.css\?v=([^"]+))"/);
const jsMatch=html.match(/src="(\/storefront-v1\.js\?v=([^"]+))"/);
assert.ok(cssMatch,'index must load a versioned storefront-v1.css asset');
assert.ok(jsMatch,'index must load a versioned storefront-v1.js asset');
assert.equal(cssMatch[2],jsMatch[2],'core CSS and JS must share one storefront asset generation');
assert.ok(sw.includes(`'${cssMatch[1]}'`),'service-worker warm cache must use the exact CSS URL loaded by index');
assert.ok(sw.includes(`'${jsMatch[1]}'`),'service-worker warm cache must use the exact JS URL loaded by index');

assert.match(sw,/KHONCHAIHERB V1 service worker — resilient cache lifecycle/,'service worker must expose the resilient-cache generation marker');
assert.match(sw,/Promise\.allSettled\(CORE\.map/,'one optional core fetch failure must not abort the entire service-worker installation');
assert.doesNotMatch(sw,/cache\.addAll\(CORE\)/,'service worker must not use all-or-nothing cache.addAll for the storefront core');
assert.match(sw,/new Request\(url,\{cache:'no-store'\}\)/,'core warmup must bypass stale HTTP cache entries');
assert.match(sw,/fetch\(request,\{cache:'no-store'\}\)/,'network-first storefront assets must be fetched fresh');
assert.doesNotMatch(sw,/caches\.match\(/,'runtime fallback must not search stale data across unrelated/retired cache generations');
assert.match(sw,/currentMatch\(request\)/,'runtime fallback must read only the active storefront cache');
assert.match(sw,/key\.startsWith\(CACHE_PREFIX\)\|\|key\.startsWith\(LEGACY_CACHE_PREFIX\)/,'activation may remove only KHONCHAIHERB-owned cache generations');
assert.match(sw,/url\.pathname\.startsWith\('\/api\/'\)/,'service worker must never cache API responses');
assert.match(sw,/\.(?:html\|js\|css\|webmanifest)/,'HTML, JS, CSS and manifest requests must remain in the fresh/network-first class');
assert.match(coreJs,/navigator\.serviceWorker\.register\('\/sw\.js\?v=[^']+'\)/,'core storefront must explicitly register a versioned service-worker URL');

console.log(`PASS storefront cache contract: core generation ${jsMatch[2]} is exact in index/SW, resilient install, scoped cleanup and network-first code delivery`);
