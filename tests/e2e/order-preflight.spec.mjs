import {test,expect} from '@playwright/test';

const product={id:901,slug:'rang-jued-tea-e2e',sku:'E2E-TEA-901',name:'ชารางจืดสำหรับทดสอบระบบ',description:'ข้อมูลสำหรับทดสอบเส้นทางสั่งซื้อเท่านั้น',category:'ชาสมุนไพร',price:190,compare_at_price:null,stock:5,featured:1,image_url:'/assets/products/rang-jued-tea-360.webp'};

async function mockCommerce(page,state){
  await page.route('https://fonts.googleapis.com/**',route=>route.fulfill({status:200,contentType:'text/css',body:''}));
  await page.route('https://fonts.gstatic.com/**',route=>route.fulfill({status:204,body:''}));
  await page.route('**/api/**',async route=>{
    const req=route.request(),u=new URL(req.url()),path=u.pathname,method=req.method();
    const fulfill=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
    if(path==='/api/products')return fulfill({products:[product],ready:true,count:1});
    if(path==='/api/payment-options')return fulfill({checkoutEnabled:true,capabilities:[{id:'COD',enabled:true}],methods:[{id:'COD',enabled:true}]});
    if(path==='/api/checkout-session'&&method==='POST')return fulfill({ok:true,sessionKey:'e2e-preflight-session-0001',status:'active',lastStep:'address',subtotal:190,itemCount:1});
    if(path==='/api/checkout-quote'&&method==='POST'){
      const payload=JSON.parse(req.postData()||'{}');
      state.quotePayloads.push(payload);
      state.quoteRequests+=1;
      if(Number.isFinite(state.nextQuoteShipping)){
        state.quoteShipping=state.nextQuoteShipping;
        state.nextQuoteShipping=null;
      }
      const shipping=Number.isFinite(state.quoteShipping)?state.quoteShipping:45;
      return fulfill({
        ok:true,
        lines:[{productId:901,variantId:null,name:product.name,unitPrice:190,qty:1,lineTotal:190,available:5}],
        subtotal:190,discount:0,promotionDiscount:0,promotionCode:null,promotionName:null,
        shipping,total:190+shipping,paymentMethods:['COD'],quoteSource:'server'
      });
    }
    if(path==='/api/orders'&&method==='POST'){
      state.orderPosts+=1;
      state.orderPayload=JSON.parse(req.postData()||'{}');
      const shipping=Number.isFinite(state.quoteShipping)?state.quoteShipping:45;
      return fulfill({ok:true,orderNo:'KCH-E2E-PREFLIGHT-1',subtotal:190,discount:0,shipping,total:190+shipping,paymentStatus:'unpaid',fulfillmentStatus:'pending',status:'pending'});
    }
    return fulfill({ok:true});
  });
}

test.beforeEach(async({page})=>{await page.addInitScript(()=>localStorage.clear())});

test('fresh server quote blocks a changed total before order POST and requires reconfirmation',async({page})=>{
  const state={quoteRequests:0,quotePayloads:[],quoteShipping:45,nextQuoteShipping:null,orderPosts:0,orderPayload:null};
  await mockCommerce(page,state);
  await page.goto('/?e2e=order-preflight',{waitUntil:'domcontentloaded'});

  // Static E2E does not run Cloudflare HTMLRewriter, so load the exact clean modules
  // injected on the canonical home in their production registration order.
  await page.addStyleTag({path:'public/storefront-v1-commerce.css'});
  await page.addStyleTag({path:'public/storefront-v1-checkout-recovery.css'});
  await page.addStyleTag({path:'public/storefront-v1-checkout-quote.css'});
  await page.addScriptTag({path:'public/storefront-v1-checkout-recovery.js'});
  await page.addScriptTag({path:'public/storefront-v1-checkout-quote.js'});
  await page.addScriptTag({path:'public/storefront-v1-order-preflight.js'});

  await expect(page.locator('[data-product-card="rang-jued-tea-e2e"]')).toBeVisible();
  await page.locator('[data-product-card="rang-jued-tea-e2e"] [data-add-product]').click();
  await expect(page.locator('[data-layer="cart"]')).toHaveClass(/is-open/);
  await expect(page.locator('[data-cart-foot]')).toHaveAttribute('data-cart-quote-status','ready');
  await expect(page.locator('[data-cart-server-total]')).toContainText('฿235');

  await page.locator('[data-start-checkout]').click();
  await expect(page.locator('[data-layer="checkout"]')).toHaveClass(/is-open/);
  await expect(page.locator('.kch-order-review')).toHaveAttribute('data-quote-status','ready');
  await expect(page.locator('[data-quote-final-total]')).toContainText('฿235');

  await page.locator('#customer-name').fill('ผู้ทดสอบระบบ');
  await page.locator('#customer-phone').fill('0812345678');
  await page.locator('#customer-address').fill('99 หมู่ 1 ถนนทดสอบ');
  await page.locator('#customer-subdistrict').fill('ในเมือง');
  await page.locator('#customer-district').fill('เมือง');
  await page.locator('#customer-province').fill('อุบลราชธานี');
  await page.locator('#customer-postal').fill('34000');

  expect(state.quoteRequests).toBe(2);
  state.nextQuoteShipping=55;
  await page.locator('[data-place-order]').click();

  await expect(page.locator('[data-checkout-error]')).toContainText('ยอดคำสั่งซื้อมีการอัปเดตเป็น');
  await expect(page.locator('[data-quote-final-total]')).toContainText('฿245');
  await expect(page.locator('[data-place-order]')).toContainText('฿245');
  expect(state.quoteRequests).toBe(3);
  expect(state.orderPosts).toBe(0);
  expect(state.orderPayload).toBeNull();

  // The second click revalidates the newly displayed amount. Only when it is still stable
  // may the one-shot bypass reach the core /api/orders handler.
  await page.locator('[data-place-order]').click();
  const success=page.locator('.kch-success');
  await expect(success.getByRole('heading',{name:'สั่งซื้อสำเร็จ'})).toBeVisible();
  await expect(success.locator('.kch-success-order')).toContainText('฿245');
  expect(state.quoteRequests).toBe(4);
  expect(state.orderPosts).toBe(1);
  expect(state.orderPayload?.paymentMethod).toBe('COD');
  expect(state.orderPayload?.address?.subdistrict).toBe('ในเมือง');

  // Every quote request is deliberately free of customer PII.
  for(const payload of state.quotePayloads){
    expect(payload.items?.[0]).toEqual({id:901,qty:1});
    expect(payload.customerName).toBeUndefined();
    expect(payload.phone).toBeUndefined();
    expect(payload.address).toBeUndefined();
  }
});
