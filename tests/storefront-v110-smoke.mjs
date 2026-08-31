import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const source=fs.readFileSync('public/tshop-v110.js','utf8');
const orders=fs.readFileSync('functions/api/orders.js','utf8');
const customerOrders=fs.readFileSync('functions/api/customer/orders.js','utf8');
const me=fs.readFileSync('functions/api/customer/me.js','utf8');
const html=fs.readFileSync('public/index.html','utf8');
const sw=fs.readFileSync('public/sw.js','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const build=(html.match(/name="kch-build" content="([^"]+)"/)||[])[1];assert.ok(build);assert.equal(pkg.version,build);const [major,minor]=build.split('.').map(Number);assert.ok(major>1||(major===1&&minor>=10),'storefront must remain >=1.10');

const document={querySelector(){return null},querySelectorAll(){return []}};
const context={console,document,window:null,setTimeout(){return 0},current:'home',checkout(){},bind(){},placeOrder(){},v08LoadMe:async()=>null,V08_ME:null,V08_ME_LOADED:true,cart:[],ordersLocal:[],checkoutKey:'',activeCoupon:'',api:async()=>({}),v17OrderItemsPayload(){return []},v06CurrentAttr(){return {source:'shop',creatorId:null,contentId:null}},v06ClearAttr(){},saveOrders(){},save(){},success(){},orderErrorMessage(){return 'error'},I:s=>s,esc:s=>String(s)};context.window=context;
vm.createContext(context);vm.runInContext(source,context,{filename:'tshop-v110.js'});const h=context.__KCH_V110_CHECKOUT_HELPERS__;assert.ok(h,'v1.10 checkout helpers must be exposed');
assert.equal(h.addressLabel({address_line:'99 หมู่ 1',subdistrict:'ในเมือง',district:'เมือง',province:'อุบลราชธานี',postal_code:'34000'}),'99 หมู่ 1 ในเมือง เมือง อุบลราชธานี 34000');
assert.match(source,/v08LoadMe\(\)/,'checkout must load signed-in member profile');assert.match(source,/data-v110-address/,'checkout must expose saved-address choices');assert.match(source,/v110AddressBlank/,'async member load must avoid overwriting a typed address');assert.match(source,/form\.insertAdjacentHTML\('beforebegin',html\);v110ApplyProfile\(me\.customer\);if\(applyDefault\)v110ApplyAddress\(def,\{profile:me\.customer,force:false\}\);bindV110\(\)/,'async address controls must be rebound after insertion');
assert.match(source,/id="customer-subdistrict"/,'checkout must capture subdistrict separately');assert.match(source,/address:\{addressLine,subdistrict,district,province,postalCode\}/,'order payload must preserve full Thai address structure');assert.match(source,/items:v17OrderItemsPayload\(\)/,'saved-address checkout must retain variant-safe order payload');
assert.match(orders,/import \{getCustomer\} from '\.\.\/_lib\/customer-auth\.js'/,'order creation must resolve authenticated customer session');assert.match(orders,/sessionCustomer=await getCustomer\(request,env\)/);assert.match(orders,/customer=\{id:Number\(sessionCustomer\.customer_id\)\}/,'recipient phone must not replace signed-in account ownership');assert.match(orders,/addressJson=JSON\.stringify\(\{addressLine,subdistrict,district,province,postalCode\}\)/);assert.match(orders,/COALESCE\(subdistrict,''\)=\?/,'address dedupe must include subdistrict');assert.match(orders,/address_line,subdistrict,district,province,postal_code/,'saved address insert must preserve subdistrict');
assert.match(me,/subdistrict/,'member profile must return saved subdistrict');assert.match(customerOrders,/o\.phone/,'member orders must return recipient phone for receipt verification');
assert.ok(html.includes(`tshop-v110.css?v=${build}`));assert.ok(html.includes(`tshop-v110.js?v=${build}`));assert.ok(html.indexOf(`tshop-v110.js?v=${build}`)>html.indexOf(`tshop-v19.js?v=${build}`));assert.ok(html.indexOf(`tshop-v110.js?v=${build}`)<html.indexOf(`tshop-v161-hotfix.js?v=${build}`));assert.ok(sw.includes(`khonchaiherb-v${build}`));assert.ok(sw.includes(`tshop-v110.js?v=${build}`));assert.match(pkg.scripts.check,/storefront-v110-smoke/);
console.log('storefront v1.10 saved-address checkout smoke: OK');
