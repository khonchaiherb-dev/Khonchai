import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const seller=read('public/seller-center.html');
const center=read('functions/api/admin/commerce-command-center.js');
const customer=read('functions/api/admin/customer-360.js');
const sale=read('functions/api/admin/sale-readiness.js');

const checks=[
  ['seller center title',seller.includes('KHONCHAIHERB Seller Center')],
  ['seller center uses command center',seller.includes('/api/admin/commerce-command-center')],
  ['seller center uses sale readiness',seller.includes('/api/admin/sale-readiness')],
  ['seller center uses customer 360',seller.includes('/api/admin/customer-360')],
  ['seller center uses product profit',seller.includes('/api/admin/product-profit')],
  ['seller center does not hardcode demo price',!seller.includes('฿189')&&!seller.includes('WELCOME50')],
  ['command center protected',center.includes('adminAuthorized(request,env)')],
  ['command center sale verified gate',center.includes('sale_verified')&&center.includes('product_media')],
  ['command center profit metrics',center.includes('grossProfit')&&center.includes('marginPct')],
  ['customer 360 protected',customer.includes('adminAuthorized(request,env)')],
  ['customer 360 segments',customer.includes("segment='vip'")&&customer.includes("segment='repeat'")&&customer.includes("segment='at_risk'")],
  ['sale readiness remains protected',sale.includes('adminAuthorized(request,env)')&&sale.includes('product.sale_verified')]
];

const failed=checks.filter(([,ok])=>!ok);
for(const [name,ok] of checks)console.log(`${ok?'PASS':'FAIL'} ${name}`);
if(failed.length){console.error(`Commerce OS smoke failed: ${failed.map(x=>x[0]).join(', ')}`);process.exit(1)}
console.log('KHONCHAIHERB Commerce OS smoke passed');
