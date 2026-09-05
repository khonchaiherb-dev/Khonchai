import {test,expect} from '@playwright/test';

const product={id:903,slug:'rang-jued-submit-safety-e2e',sku:'E2E-SUBMIT-903',name:'ชารางจืดสำหรับทดสอบการส่งคำสั่งซื้อ',description:'ข้อมูลสำหรับทดสอบระบบเท่านั้น',category:'ชาสมุนไพร',price:190,stock:5,featured:1,image_url:'/assets/products/rang-jued-tea-360.webp'};

async function mockCommerce(page,state){
  await page.route('https://fonts.googleapis.com/**',route=>route.fulfill({status:200,contentType:'text/css',body:''}));
  await page.route('https://fonts.gstatic.com/**',route=>route.fulfill({status:204,body:''}));
  await page.route('**/api/**',async route=>{
    const req=route.request(),u=new URL(req.url()),path=u.pathname,method=req.method();
    const fulfill=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
    if(path==='/api/products')return fulfill({products:[product],ready:true,count:1});
    if(path==='/api/payment-options')return fulfill({checkoutEnabled:true,capabilities:[{id:'COD',enabled:true}],methods:[{id:'COD',enabled:true}]});
    if(path==='/api/checkout-session'&&method==='POST')return fulfill({ok:true,sessionKey:'e2e-submit-session-0001',status:'active',lastStep:'address',subtotal:190,itemCount:1});
    if(path==='/api/checkout-quote'&&method==='POST'){
      state.quoteRequests+=1;
      if(state.delayQuote)await new Promise(resolve=>setTimeout(resolve,120));
      return fulfill({ok:true,lines:[{productId:903,variantId:null,name:product.name,unitPrice:190,qty:1,lineTotal:190,available:5}],subtotal:190,discount:0,promotionDiscount:0,promotionCode:null,promotionName:null,shipping:45,total:235,paymentMethods:['COD'],quoteSource:'server'});
    }
    if(path==='/api/orders'&&method==='POST'){
      state.orderPosts+=1;
      const payload=JSON.parse(req.postData()||'{}');
      state.orderPayloads.push(payload);
      if(state.orderPosts===1){
        await new Promise(resolve=>setTimeout(resolve,120));
        return fulfill({error:'temporary_server_error'},503);
      }
      return fulfill({ok:true,orderNo:'KCH-E2E-SUBMIT-1',subtotal:190,discount:0,shipping:45,total:235,paymentStatus:'unpaid',fulfillmentStatus:'pending',status:'pending'});
    }
    return fulfill({ok:true});
  });
}

async function fillCheckout(page){
  await page.locator('#customer-name').fill('ผู้ทดสอบระบบ');
  await page.locator('#customer-phone').fill('0812345678');
  await page.locator('#customer-address').fill('99 หมู่ 1 ถนนทดสอบ');
  await page.locator('#customer-subdistrict').fill('ในเมือง');
  await page.locator('#customer-district').fill('เมือง');
  await page.locator('#customer-province').fill('อุบลราชธานี');
  await page.locator('#customer-postal').fill('34000');
}

test.beforeEach(async({page})=>{await page.addInitScript(()=>{localStorage.clear();sessionStorage.clear()})});

test('double click sends one order request and uncertain retry reuses the same idempotency key',async({page})=>{
  const state={quoteRequests:0,orderPosts:0,orderPayloads:[],delayQuote:false};
  await mockCommerce(page,state);
  await page.goto('/?e2e=order-submit-safety',{waitUntil:'domcontentloaded'});

  await page.addStyleTag({path:'public/storefront-v1-commerce.css'});
  await page.addStyleTag({path:'public/storefront-v1-checkout-recovery.css'});
  await page.addStyleTag({path:'public/storefront-v1-checkout-quote.css'});
  await page.addScriptTag({path:'public/storefront-v1-checkout-recovery.js'});
  await page.addScriptTag({path:'public/storefront-v1-checkout-quote.js'});
  await page.addScriptTag({path:'public/storefront-v1-order-submit-safety.js'});
  await page.addScriptTag({path:'public/storefront-v1-phone-integrity.js'});
  await page.addScriptTag({path:'public/storefront-v1-order-preflight.js'});

  await expect(page.locator('[data-product-card="rang-jued-submit-safety-e2e"]')).toBeVisible();
  await page.locator('[data-product-card="rang-jued-submit-safety-e2e"] [data-add-product]').click();
  await expect(page.locator('[data-cart-foot]')).toHaveAttribute('data-cart-quote-status','ready');
  await page.locator('[data-start-checkout]').click();
  await expect(page.locator('.kch-order-review')).toHaveAttribute('data-quote-status','ready');
  await fillCheckout(page);

  const quoteBeforeSubmit=state.quoteRequests;
  state.delayQuote=true;
  const button=page.locator('[data-place-order]');
  await button.dblclick({delay:10});
  await expect(button).toBeEnabled({timeout:5000});
  await expect(page.locator('[data-checkout-error]')).toContainText('ยังสร้างคำสั่งซื้อไม่ได้');

  expect(state.quoteRequests).toBe(quoteBeforeSubmit+1);
  expect(state.orderPosts).toBe(1);
  expect(state.orderPayloads[0]?.idempotencyKey).toBeTruthy();
  await expect(page.locator('#customer-name')).toHaveValue('ผู้ทดสอบระบบ');
  await expect(page.locator('#customer-phone')).toHaveValue('0812345678');
  await expect(page.locator('#customer-address')).toHaveValue('99 หมู่ 1 ถนนทดสอบ');
  await expect(page.locator('#customer-subdistrict')).toHaveValue('ในเมือง');
  await expect(page.locator('#customer-district')).toHaveValue('เมือง');
  await expect(page.locator('#customer-province')).toHaveValue('อุบลราชธานี');
  await expect(page.locator('#customer-postal')).toHaveValue('34000');

  state.delayQuote=false;
  await button.click();
  await expect(page.locator('.kch-success').getByRole('heading',{name:'สั่งซื้อสำเร็จ'})).toBeVisible({timeout:5000});
  expect(state.orderPosts).toBe(2);
  expect(state.orderPayloads[1]?.idempotencyKey).toBe(state.orderPayloads[0]?.idempotencyKey);
  expect(state.orderPayloads[1]?.paymentMethod).toBe('COD');

  const pending=await page.evaluate(()=>sessionStorage.getItem('kch-order-submit-attempts-v1'));
  expect(pending===null||pending==='{}').toBeTruthy();
});
