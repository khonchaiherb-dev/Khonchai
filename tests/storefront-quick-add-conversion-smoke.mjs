import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const css=read('public/kch-quick-add-conversion.css');
const bridge=read('public/tshop-v17.css');
const master=read('public/tshop-v161-hotfix.js');
const variants=read('public/tshop-v17.js');

if(!bridge.startsWith("@import url('/kch-quick-add-conversion.css');"))throw new Error('consolidated quick-add module is not loaded by the current storefront stack');
for(const token of ['button[data-add]','min-height:44px!important','height:44px!important',"content:'เพิ่ม'",'touch-action:manipulation'])if(!css.includes(token))throw new Error(`quick-add accessibility/discoverability contract missing ${token}`);
for(const token of ['data-add="${Number(actual.id)}"','aria-label="เพิ่ม ${escHtml(name)} ลงตะกร้า"',"icon('shopping_cart')"])if(!master.includes(token))throw new Error(`master product card quick-add contract missing ${token}`);
for(const token of ['async function v17Purchase','required_variant_selection','กรุณาเลือกรูปแบบสินค้า','typeof add===\'function\''])if(!variants.includes(token))throw new Error(`variant-safe quick-add behavior missing ${token}`);
if(/data-buy/.test(css))throw new Error('quick-add visual slice must not alter Buy Now or checkout behavior');
console.log('storefront quick-add conversion smoke: ok');
