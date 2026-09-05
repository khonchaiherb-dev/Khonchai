import {test,expect} from '@playwright/test';

const product={id:903,slug:'rang-jued-error-recovery-e2e',sku:'E2E-RECOVERY-903',name:'ชารางจืดสำหรับทดสอบการกู้คืนคำสั่งซื้อ',description:'ข้อมูลสำหรับทดสอบระบบเท่านั้น',category:'ชาสมุนไพร',price:190,stock:5,featured:1,image_url:'/assets/products/rang-jued-tea-360.webp'};

async function installMocks(page,state){
  await page.route('https://fonts.googleapis.com/**',route=>route.fulfill({status:200,contentType:'text/css',body:''}));
  await page.route('https://fonts.gstatic.com/**',route=>route.fulfill({status:204,body:''}));
  await page.route('**/api/**',async route=>{
    const req=route.request(),u=new URL(req.url()),path=u.pathname,method=req.method();
    const fulfill=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
    if(path==='/api/products')return fulfill({products:[product],ready:true,count:1});
    if(path==='/api/payment-options')return fulfill({checkoutEnabled:true,capabilities:[{id:'COD',enabled:true}],methods:[{id:'COD',enabled:true}]});
    if(path==='/api/checkout-session'&&method==='POST')return fulfill({ok:true,sessionKey:'e2e-error-recovery-session',status:'active',lastStep:'address',subtotal:190,itemCount:1});
    if(path==='/api/checkout-quote'&&method==='POST')return fulfill({ok:true,lines:[{productId:903,variantId:null,name:product.name,unitPrice:190,qty:1,lineTotal:190,available:5}],subtotal:190,discount:0,promotionDiscount:0,promotionCode:null,promotionName:null,shipping:45,total:235,paymentMethods:['COD'],quoteSource:'server'});
    if(path==='/api/orders'&&method==='POST'){
      state.orderPosts+=1;
      const payload=JSON.parse(req.postData()||'{}');
      state.orderPayloads.push(payload);
      if(state.mode==='invalid_phone')return fulfill({error:'invalid_phone'},400);
      if(state.mode==='stock')return fulfill({error:'insufficient_stock',productId:903,available:1},409);
      if(state.mode==='network-once'&&state.orderPosts===1)return route.abort('failed');
      return fulfill({ok:true,orderNo:'KCH-E2E-RECOVERY-1',subtotal:190,discount:0,shipping:45,total:235,paymentStatus:'unpaid',fulfillmentStatus:'pending',status:'pending'});
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
  await page.addScriptTag({path:'public/storefront-v1-order-preflight.js'});
  await page.addScriptTag({path:'public/storefront-v1-checkout-error-recovery.js'});
}

async function openValidCheckout(page){
  await expect(page.locator('[data-product-card="rang-jued-error-recovery-e2e"]')).toBeVisible();
  await page.locator('[data-product-card="rang-jued-error-recovery-e2e"] [data-add-product]').click();
  await expect(page.locator('[data-cart-foot]')).toHaveAttribute('data-cart-quote-status','ready');
  await page.locator('[data-start-checkout]').click();
  await expect(page.locator('.kch-order-review')).toHaveAttribute('data-quote-status','ready');
  await page.locator('#customer-name').fill('ผู้ทดสอบระบบ');
  await page.locator('#customer-phone').fill('0812345678');
  await page.locator('#customer-address').fill('99 หมู่ 1 ถนนทดสอบ');
  await page.locator('#customer-subdistrict').fill('ในเมือง');
  await page.locator('#customer-district').fill('เมือง');
  await page.locator('#customer-province').fill('อุบลราชธานี');
  await page.locator('#customer-postal').fill('34000');
}

test.beforeEach(async({page})=>{await page.addInitScript(()=>{localStorage.clear();sessionStorage.clear()})});

test('server phone rejection becomes a targeted Thai field error',async({page})=>{
  const state={mode:'invalid_phone',orderPosts:0,orderPayloads:[]};
  await installMocks(page,state);
  await page.goto('/?e2e=checkout-error-phone',{waitUntil:'domcontentloaded'});
  await loadCanonicalModules(page);
  await openValidCheckout(page);

  await page.locator('[data-place-order]').click();
  await expect(page.locator('[data-checkout-error]')).toContainText('เบอร์โทรศัพท์ไม่ถูกต้อง');
  await expect(page.locator('[data-checkout-error]')).toHaveAttribute('data-checkout-recovery-error','invalid_phone');
  await expect(page.locator('#customer-phone')).toHaveAttribute('aria-invalid','true');
  await expect(page.locator('#customer-phone')).toBeFocused();
  await expect(page.locator('[data-place-order]')).toBeEnabled();
  expect(state.orderPosts).toBe(1);
  await expect(page.locator('#customer-name')).toHaveValue('ผู้ทดสอบระบบ');
  await expect(page.locator('#customer-address')).toHaveValue('99 หมู่ 1 ถนนทดสอบ');
});

test('stock change gives a direct route back to cart without clearing checkout draft',async({page})=>{
  const state={mode:'stock',orderPosts:0,orderPayloads:[]};
  await installMocks(page,state);
  await page.goto('/?e2e=checkout-error-stock',{waitUntil:'domcontentloaded'});
  await loadCanonicalModules(page);
  await openValidCheckout(page);

  await page.locator('[data-place-order]').click();
  await expect(page.locator('[data-checkout-error]')).toContainText('ขณะนี้เหลือ 1 ชิ้น');
  await expect(page.locator('[data-checkout-recovery-action="cart"]')).toBeVisible();
  await page.locator('[data-checkout-recovery-action="cart"]').click();
  await expect(page.locator('[data-layer="cart"]')).toHaveClass(/is-open/);
  await page.locator('[data-start-checkout]').click();
  await expect(page.locator('#customer-name')).toHaveValue('ผู้ทดสอบระบบ');
  await expect(page.locator('#customer-phone')).toHaveValue('0812345678');
  await expect(page.locator('#customer-address')).toHaveValue('99 หมู่ 1 ถนนทดสอบ');
  expect(state.orderPosts).toBe(1);
});

test('network uncertainty keeps form values and retries with the same idempotency key',async({page})=>{
  const state={mode:'network-once',orderPosts:0,orderPayloads:[]};
  await installMocks(page,state);
  await page.goto('/?e2e=checkout-error-network',{waitUntil:'domcontentloaded'});
  await loadCanonicalModules(page);
  await openValidCheckout(page);

  await page.locator('[data-place-order]').click();
  await expect(page.locator('[data-checkout-error]')).toContainText('การเชื่อมต่อสะดุด');
  await expect(page.locator('[data-checkout-error]')).toContainText('ลดความเสี่ยงออเดอร์ซ้ำ');
  await expect(page.locator('[data-place-order]')).toBeEnabled();
  await expect(page.locator('#customer-name')).toHaveValue('ผู้ทดสอบระบบ');
  await expect(page.locator('#customer-phone')).toHaveValue('0812345678');
  await expect(page.locator('#customer-address')).toHaveValue('99 หมู่ 1 ถนนทดสอบ');

  await page.locator('[data-place-order]').click();
  await expect(page.locator('.kch-success').getByRole('heading',{name:'สั่งซื้อสำเร็จ'})).toBeVisible();
  expect(state.orderPosts).toBe(2);
  expect(state.orderPayloads[0]?.idempotencyKey).toBeTruthy();
  expect(state.orderPayloads[1]?.idempotencyKey).toBe(state.orderPayloads[0]?.idempotencyKey);
});
