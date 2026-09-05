import {test,expect} from '@playwright/test';

const product={id:902,slug:'rang-jued-phone-e2e',sku:'E2E-PHONE-902',name:'ชารางจืดสำหรับทดสอบเบอร์โทร',description:'ข้อมูลสำหรับทดสอบระบบเท่านั้น',category:'ชาสมุนไพร',price:190,stock:5,featured:1,image_url:'/assets/products/rang-jued-tea-360.webp'};

async function mockCommerce(page,state){
  await page.route('https://fonts.googleapis.com/**',route=>route.fulfill({status:200,contentType:'text/css',body:''}));
  await page.route('https://fonts.gstatic.com/**',route=>route.fulfill({status:204,body:''}));
  await page.route('**/api/**',async route=>{
    const req=route.request(),u=new URL(req.url()),path=u.pathname,method=req.method();
    const fulfill=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
    if(path==='/api/products')return fulfill({products:[product],ready:true,count:1});
    if(path==='/api/payment-options')return fulfill({checkoutEnabled:true,capabilities:[{id:'COD',enabled:true}],methods:[{id:'COD',enabled:true}]});
    if(path==='/api/checkout-session'&&method==='POST')return fulfill({ok:true,sessionKey:'e2e-phone-session-0001',status:'active',lastStep:'address',subtotal:190,itemCount:1});
    if(path==='/api/checkout-quote'&&method==='POST'){
      state.quoteRequests+=1;
      return fulfill({ok:true,lines:[{productId:902,variantId:null,name:product.name,unitPrice:190,qty:1,lineTotal:190,available:5}],subtotal:190,discount:0,promotionDiscount:0,promotionCode:null,promotionName:null,shipping:45,total:235,paymentMethods:['COD'],quoteSource:'server'});
    }
    if(path==='/api/orders'&&method==='POST'){
      state.orderPosts+=1;
      state.orderPayload=JSON.parse(req.postData()||'{}');
      return fulfill({ok:true,orderNo:'KCH-E2E-PHONE-1',subtotal:190,discount:0,shipping:45,total:235,paymentStatus:'unpaid',fulfillmentStatus:'pending',status:'pending'});
    }
    return fulfill({ok:true});
  });
}

test.beforeEach(async({page})=>{await page.addInitScript(()=>localStorage.clear())});

test('invalid phone is blocked before quote/order and +66 is normalized before COD order',async({page})=>{
  const state={quoteRequests:0,orderPosts:0,orderPayload:null};
  await mockCommerce(page,state);
  await page.goto('/?e2e=phone-integrity',{waitUntil:'domcontentloaded'});

  // Static E2E loads the same canonical modules in production registration order.
  await page.addStyleTag({path:'public/storefront-v1-commerce.css'});
  await page.addStyleTag({path:'public/storefront-v1-checkout-recovery.css'});
  await page.addStyleTag({path:'public/storefront-v1-checkout-quote.css'});
  await page.addScriptTag({path:'public/storefront-v1-checkout-recovery.js'});
  await page.addScriptTag({path:'public/storefront-v1-checkout-quote.js'});
  await page.addScriptTag({path:'public/storefront-v1-phone-integrity.js'});
  await page.addScriptTag({path:'public/storefront-v1-order-preflight.js'});

  await expect(page.locator('[data-product-card="rang-jued-phone-e2e"]')).toBeVisible();
  await page.locator('[data-product-card="rang-jued-phone-e2e"] [data-add-product]').click();
  await expect(page.locator('[data-cart-foot]')).toHaveAttribute('data-cart-quote-status','ready');
  await page.locator('[data-start-checkout]').click();
  await expect(page.locator('.kch-order-review')).toHaveAttribute('data-quote-status','ready');

  await page.locator('#customer-name').fill('ผู้ทดสอบระบบ');
  await page.locator('#customer-address').fill('99 หมู่ 1 ถนนทดสอบ');
  await page.locator('#customer-subdistrict').fill('ในเมือง');
  await page.locator('#customer-district').fill('เมือง');
  await page.locator('#customer-province').fill('อุบลราชธานี');
  await page.locator('#customer-postal').fill('34000');

  expect(state.quoteRequests).toBe(2);
  await page.locator('#customer-phone').fill('123456789');
  await page.locator('[data-place-order]').click();
  await expect(page.locator('#customer-phone')).toHaveAttribute('aria-invalid','true');
  await expect(page.locator('[data-checkout-error]')).toContainText('กรุณากรอกเบอร์โทรศัพท์ไทยที่ติดต่อได้');
  expect(state.quoteRequests).toBe(2);
  expect(state.orderPosts).toBe(0);

  await page.locator('#customer-phone').fill('+66 81 234 5678');
  await page.locator('[data-place-order]').click();
  await expect(page.locator('#customer-phone')).toHaveValue('0812345678');
  await expect(page.locator('.kch-success').getByRole('heading',{name:'สั่งซื้อสำเร็จ'})).toBeVisible();
  expect(state.quoteRequests).toBe(3);
  expect(state.orderPosts).toBe(1);
  expect(state.orderPayload?.phone).toBe('0812345678');
  expect(state.orderPayload?.paymentMethod).toBe('COD');
});
