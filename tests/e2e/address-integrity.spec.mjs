import {test,expect} from '@playwright/test';

const product={id:904,slug:'rang-jued-address-integrity-e2e',sku:'E2E-ADDRESS-904',name:'ชารางจืดสำหรับทดสอบที่อยู่จัดส่ง',description:'ข้อมูลสำหรับทดสอบระบบเท่านั้น',category:'ชาสมุนไพร',price:190,stock:5,featured:1,image_url:'/assets/products/rang-jued-tea-360.webp'};

async function installMocks(page,state){
  await page.route('https://fonts.googleapis.com/**',route=>route.fulfill({status:200,contentType:'text/css',body:''}));
  await page.route('https://fonts.gstatic.com/**',route=>route.fulfill({status:204,body:''}));
  await page.route('**/api/**',async route=>{
    const req=route.request(),u=new URL(req.url()),path=u.pathname,method=req.method();
    const fulfill=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
    if(path==='/api/products')return fulfill({products:[product],ready:true,count:1});
    if(path==='/api/payment-options')return fulfill({checkoutEnabled:true,capabilities:[{id:'COD',enabled:true}],methods:[{id:'COD',enabled:true}]});
    if(path==='/api/checkout-session'&&method==='POST')return fulfill({ok:true,sessionKey:'e2e-address-session',status:'active',lastStep:'address',subtotal:190,itemCount:1});
    if(path==='/api/checkout-quote'&&method==='POST')return fulfill({ok:true,lines:[{productId:904,variantId:null,name:product.name,unitPrice:190,qty:1,lineTotal:190,available:5}],subtotal:190,discount:0,promotionDiscount:0,promotionCode:null,promotionName:null,shipping:45,total:235,paymentMethods:['COD'],quoteSource:'server'});
    if(path==='/api/orders'&&method==='POST'){
      state.orderPosts+=1;
      state.orderPayloads.push(JSON.parse(req.postData()||'{}'));
      return fulfill({ok:true,orderNo:'KCH-E2E-ADDRESS-1',subtotal:190,discount:0,shipping:45,total:235,paymentStatus:'unpaid',fulfillmentStatus:'pending',status:'pending'});
    }
    return fulfill({ok:true});
  });
}

async function loadCanonicalModules(page){
  await page.addStyleTag({path:'public/storefront-v1-commerce.css'});
  await page.addStyleTag({path:'public/storefront-v1-checkout-recovery.css'});
  await page.addStyleTag({path:'public/storefront-v1-checkout-quote.css'});
  await page.addStyleTag({path:'public/storefront-v1-checkout-error-recovery.css'});
  await page.addScriptTag({path:'public/storefront-v1-checkout-recovery.js'});
  await page.addScriptTag({path:'public/storefront-v1-checkout-quote.js'});
  await page.addScriptTag({path:'public/storefront-v1-order-submit-safety.js'});
  await page.addScriptTag({path:'public/storefront-v1-phone-integrity.js'});
  await page.addScriptTag({path:'public/storefront-v1-address-integrity.js'});
  await page.addScriptTag({path:'public/storefront-v1-order-preflight.js'});
  await page.addScriptTag({path:'public/storefront-v1-checkout-error-recovery.js'});
}

async function openCheckout(page){
  await expect(page.locator('[data-product-card="rang-jued-address-integrity-e2e"]')).toBeVisible();
  await page.locator('[data-product-card="rang-jued-address-integrity-e2e"] [data-add-product]').click();
  await expect(page.locator('[data-cart-foot]')).toHaveAttribute('data-cart-quote-status','ready');
  await page.locator('[data-start-checkout]').click();
  await expect(page.locator('.kch-order-review')).toHaveAttribute('data-quote-status','ready');
  await page.locator('#customer-name').fill('ผู้รับสินค้า ทดสอบ');
  await page.locator('#customer-phone').fill('0812345678');
  await page.locator('#customer-address').fill('99 หมู่ 1 ถนนสุขใจ');
  await page.locator('#customer-subdistrict').fill('ในเมือง');
  await page.locator('#customer-district').fill('เมือง');
  await page.locator('#customer-province').fill('อุบลราชธานี');
  await page.locator('#customer-postal').fill('34000');
}

test.beforeEach(async({page})=>{await page.addInitScript(()=>{localStorage.clear();sessionStorage.clear()})});

test('Thai postal digits and harmless whitespace normalize before COD order submission',async({page})=>{
  const state={orderPosts:0,orderPayloads:[]};
  await installMocks(page,state);
  await page.goto('/?e2e=address-normalize',{waitUntil:'domcontentloaded'});
  await loadCanonicalModules(page);
  await openCheckout(page);

  await page.locator('#customer-address').fill('  99   หมู่  1   ถนนสุขใจ  ');
  await page.locator('#customer-subdistrict').fill('  ในเมือง  ');
  await page.locator('#customer-postal').fill('๓๔๐๐๐');
  await page.locator('[data-place-order]').click();

  await expect(page.locator('.kch-success').getByRole('heading',{name:'สั่งซื้อสำเร็จ'})).toBeVisible();
  expect(state.orderPosts).toBe(1);
  expect(state.orderPayloads[0]?.address).toEqual({
    addressLine:'99 หมู่ 1 ถนนสุขใจ',
    subdistrict:'ในเมือง',
    district:'เมือง',
    province:'อุบลราชธานี',
    postalCode:'34000'
  });
});

test('punctuation-only delivery address is blocked before order creation',async({page})=>{
  const state={orderPosts:0,orderPayloads:[]};
  await installMocks(page,state);
  await page.goto('/?e2e=address-invalid-line',{waitUntil:'domcontentloaded'});
  await loadCanonicalModules(page);
  await openCheckout(page);

  await page.locator('#customer-address').fill('/////');
  await page.locator('[data-place-order]').click();

  await expect(page.locator('[data-checkout-error]')).toContainText('รายละเอียดที่ช่วยให้ขนส่งพบสถานที่จัดส่ง');
  await expect(page.locator('#customer-address')).toHaveAttribute('aria-invalid','true');
  await expect(page.locator('#customer-address')).toBeFocused();
  expect(state.orderPosts).toBe(0);
  await expect(page.locator('#customer-phone')).toHaveValue('0812345678');
  await expect(page.locator('#customer-province')).toHaveValue('อุบลราชธานี');
});

test('invalid postal code is blocked and focuses the postal field without losing the form',async({page})=>{
  const state={orderPosts:0,orderPayloads:[]};
  await installMocks(page,state);
  await page.goto('/?e2e=address-invalid-postal',{waitUntil:'domcontentloaded'});
  await loadCanonicalModules(page);
  await openCheckout(page);

  await page.locator('#customer-postal').fill('34A00');
  await page.locator('[data-place-order]').click();

  await expect(page.locator('[data-checkout-error]')).toContainText('รหัสไปรษณีย์ 5 หลัก');
  await expect(page.locator('#customer-postal')).toHaveAttribute('aria-invalid','true');
  await expect(page.locator('#customer-postal')).toBeFocused();
  expect(state.orderPosts).toBe(0);
  await expect(page.locator('#customer-name')).toHaveValue('ผู้รับสินค้า ทดสอบ');
  await expect(page.locator('#customer-address')).toHaveValue('99 หมู่ 1 ถนนสุขใจ');
});
