import fs from 'node:fs';
import assert from 'node:assert/strict';

const js=fs.readFileSync('public/tshop-v18.js','utf8');
const html=fs.readFileSync('public/index.html','utf8');
const sw=fs.readFileSync('public/sw.js','utf8');
const build=(html.match(/name="kch-build" content="([^"]+)"/)||[])[1];
const swBuild=(sw.match(/const CACHE='khonchaiherb-v([^']+)'/)||[])[1];
const parts=v=>String(v||'').split('.').map(n=>Number.parseInt(n,10)||0);
const atLeast=(actual,minimum)=>{
  const a=parts(actual),b=parts(minimum),len=Math.max(a.length,b.length);
  for(let i=0;i<len;i++){
    const av=a[i]||0,bv=b[i]||0;
    if(av>bv)return true;
    if(av<bv)return false;
  }
  return true;
};
assert.ok(build,'index must expose a storefront build version');
assert.ok(swBuild,'service worker must expose a cache release version');
assert.match(js,/v17Purchase\(id,q,buyNow\)/,'global Add/Buy must pass through variant-safe purchase resolver');
assert.match(js,/data-v18-drawer-variant/,'social drawer must expose variant choices');
assert.match(js,/v17Purchase\(id,1,false,vid\)/,'drawer add-to-cart must pass explicit variantId');
assert.match(js,/v17Purchase\(id,1,true,vid\)/,'drawer buy-now must pass explicit variantId');
assert.match(js,/price-asc/,'search must support price sorting');
assert.match(js,/stockOnly/,'search must support in-stock filtering');
assert.match(js,/cancelled','ยกเลิก/,'order center must expose cancelled orders');
assert.match(js,/pay!==\'COD\'/,'COD unpaid state must not be misclassified as waiting for payment');
assert.ok(html.includes(`tshop-v18.js?v=${build}`),'v1.8 commerce layer must use current legacy-core build cache key');
assert.ok(html.indexOf(`tshop-v18.js?v=${build}`)>html.indexOf(`tshop-v17.js?v=${build}`),'v1.8 must load after v1.7');
assert.ok(html.indexOf(`tshop-v18.js?v=${build}`)<html.indexOf(`tshop-v161-hotfix.js?v=${build}`),'v1.8 capture guard must load before legacy hotfix');
assert.ok(atLeast(swBuild,build),`service worker release ${swBuild} must not be older than legacy core build ${build}`);
assert.ok(sw.includes(`tshop-v18.js?v=${build}`),'service worker must preserve v1.8 JS in the core cache');
assert.ok(sw.includes('/tshop-v134-structural-storefront.css?v=1.34.2'),'service worker must cache current structural CSS');
assert.ok(sw.includes('/kch-v134-structural-storefront.js?v=1.34.2'),'service worker must cache current structural runtime');
console.log('storefront v1.8 commerce smoke: OK');
