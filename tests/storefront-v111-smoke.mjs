import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const source=fs.readFileSync('public/tshop-v111.js','utf8');
const css=fs.readFileSync('public/tshop-v111.css','utf8');
const html=fs.readFileSync('public/index.html','utf8');
const sw=fs.readFileSync('public/sw.js','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const health=fs.readFileSync('functions/api/health.js','utf8');
const orderStatus=fs.readFileSync('functions/api/order-status.js','utf8');
const customerOrders=fs.readFileSync('functions/api/customer/orders.js','utf8');
const build=(html.match(/name="kch-build" content="([^"]+)"/)||[])[1];
assert.equal(build,'1.11.0');assert.equal(pkg.version,build);assert.ok(pkg.scripts.check.includes('storefront-v111-smoke.mjs'));

const document={querySelector(){return null},querySelectorAll(){return []}};
const context={console,document,window:null,Date,ordersLocal:[],PRODUCTS:[],V19_ORDER_MODE:'device',V19_ORDER_CACHE:[],V19_ORDER_FETCHED_AT:0,v19OrderCard(){return '<div class="orderactions"></div>'},v19DetailHtml(){return '<section class="v19-timeline"></section>'},v19ResolveDetail:async()=>null,v19NormalizeOrder(o,source){return {...o,source,orderNo:o.orderNo||o.order_no||'',items:o.items||[]}},v19MergeOrders(a,b){return [...a,...b]},saveOrders(){},v17Purchase:async()=>true,cartPage(){},toast(){},lookupOrder:async()=>{},bind(){},bindV19(){},api:async()=>({}),I:s=>`[${s}]`,esc:s=>String(s),statusText(){return 'กำลังจัดส่ง'}};context.window=context;
vm.createContext(context);vm.runInContext(source,context,{filename:'tshop-v111.js'});
const h=context.__KCH_V111_ORDER_HELPERS__;assert.ok(h,'v1.11 helpers must be exposed');
assert.equal(h.rank({fulfillmentStatus:'pending'}),0);assert.equal(h.rank({fulfillmentStatus:'packing'}),1);assert.equal(h.rank({fulfillmentStatus:'shipping'}),2);assert.equal(h.rank({fulfillmentStatus:'delivered'}),3);assert.equal(h.rank({status:'cancelled'}),-1);
assert.equal(h.eventTime({createdAt:'2026-08-31 10:00:00'},'created'),'2026-08-31 10:00:00');
assert.equal(h.eventTime({orderEvents:[{event_type:'shipped',created_at:'2026-08-31 12:00:00'}]},'shipping'),'2026-08-31 12:00:00');
const guest=h.persistGuest({orderNo:'KCH-GUEST-111',total:199,items:[{product_id:1,variant_id:11}]},'0812345678');assert.equal(guest.orderNo,'KCH-GUEST-111');assert.equal(context.ordersLocal[0].phone,'0812345678');assert.equal(context.ordersLocal[0].source,'device');

assert.match(source,/v17Purchase\(productId,qty,false,variantId\)/,'reorder must preserve the ordered variant');
assert.doesNotMatch(source,/v08Reorder\(/,'v1.11 reorder must not fall back to variant-unsafe legacy reorder');
assert.match(source,/v111PersistGuestOrder/);assert.match(source,/\/api\/order-status\?orderNo=/);assert.match(source,/saveOrders\(\)/);assert.match(source,/v111ProgressHtml/);assert.match(css,/\.v111-steps/);
assert.ok(html.includes(`tshop-v111.css?v=${build}`));assert.ok(html.includes(`tshop-v111.js?v=${build}`));assert.ok(html.indexOf(`tshop-v111.js?v=${build}`)>html.indexOf(`tshop-v110.js?v=${build}`));assert.ok(html.indexOf(`tshop-v111.js?v=${build}`)<html.indexOf(`tshop-v161-hotfix.js?v=${build}`));
assert.ok(sw.includes(`khonchaiherb-v${build}`));assert.ok(sw.includes(`/tshop-v111.js?v=${build}`));assert.ok(sw.includes(`/tshop-v111.css?v=${build}`));assert.match(health,/version:'1\.11\.0'/);
assert.match(orderStatus,/shippedAt:shipment\?\.shipped_at/);assert.match(orderStatus,/deliveredAt:shipment\?\.delivered_at/);assert.match(customerOrders,/s\.shipped_at/);assert.match(customerOrders,/s\.delivered_at/);
console.log('storefront v1.11 tracking + guest Order Center smoke: OK');
