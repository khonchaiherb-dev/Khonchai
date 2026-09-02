import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const sellerEntry=read('public/seller-center.html');
const sellerTarget=sellerEntry.includes('seller-center-v2.html')?'public/seller-center-v2.html':'public/seller-center.html';
const seller=read(sellerTarget);
const center=read('functions/api/admin/commerce-command-center.js');
const customer=read('functions/api/admin/customer-360.js');
const sale=read('functions/api/admin/sale-readiness.js');
const profit=read('functions/api/admin/product-profit.js');
const middleware=read('functions/api/admin/_middleware.js');

const checks=[
  ['seller center entrypoint resolves',sellerTarget==='public/seller-center.html'||sellerEntry.includes('/seller-center-v2.html')],
  ['seller center title',seller.includes('KHONCHAIHERB | ศูนย์บริหารร้านค้า')],
  ['seller center uses command center',seller.includes('/api/admin/commerce-command-center')],
  ['seller center uses staff session',seller.includes('/api/staff/login')&&seller.includes('/api/staff/me')],
  ['seller center uses RBAC-aware views',seller.includes("can('finance.read')")&&seller.includes("can('inventory.read')")],
  ['seller center does not hardcode demo price',!seller.includes('฿189')&&!seller.includes('WELCOME50')],
  ['command center protected',center.includes('adminAuthorized(request,env)')],
  ['command center sale readiness metrics',center.includes('sale_verified')&&center.includes('product_media')&&center.includes('saleReady')],
  ['command center customer metrics',center.includes('repeat_customers')&&center.includes('avgCustomerValue')],
  ['command center profit metrics',center.includes('grossProfit')&&center.includes('marginPct')],
  ['customer 360 protected',customer.includes('adminAuthorized(request,env)')],
  ['customer 360 segments',customer.includes("segment='vip'")&&customer.includes("segment='repeat'")&&customer.includes("segment='at_risk'")],
  ['sale readiness remains protected',sale.includes('adminAuthorized(request,env)')&&sale.includes('product.sale_verified')],
  ['product profit remains protected',profit.includes('adminAuthorized(request,env)')],
  ['admin routes protected by staff middleware',middleware.includes('getStaffSession')&&middleware.includes('hasPermission')&&middleware.includes('verifyStaffCsrf')]
];

const failed=checks.filter(([,ok])=>!ok);
for(const [name,ok] of checks)console.log(`${ok?'PASS':'FAIL'} ${name}`);
if(failed.length){console.error(`Commerce OS smoke failed: ${failed.map(x=>x[0]).join(', ')}`);process.exit(1)}
console.log('KHONCHAIHERB Commerce OS smoke passed');
