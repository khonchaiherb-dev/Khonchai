import {test,expect} from '@playwright/test';

const products=[
  {id:901,slug:'rang-jued-tea-e2e',sku:'E2E-TEA-901',name:'ชารางจืดสำหรับทดสอบระบบ',description:'ข้อมูลสำหรับทดสอบเส้นทางสั่งซื้อเท่านั้น',category:'ชาสมุนไพร',price:190,compare_at_price:null,stock:5,featured:1,image_url:'/assets/products/rang-jued-tea-360.webp'},
  {id:902,slug:'herbal-tea-e2e',sku:'E2E-TEA-902',name:'ชาสมุนไพรสำหรับทดสอบระบบ',description:'ข้อมูลสำหรับทดสอบการแสดงสินค้าเท่านั้น',category:'ชาสมุนไพร',price:150,compare_at_price:null,stock:5,featured:0,image_url:'/assets/products/chiang-da-tea-360.webp'}
];

async function mockCommerce(page,state){
  await page.route('https://fonts.googleapis.com/**',route=>route.fulfill({status:200,contentType:'text/css',body:''}));
  await page.route('https://fonts.gstatic.com/**',route=>route.fulfill({status:204,body:''}));
  await page.route('**/api/**',async route=>{
    const req=route.request(),u=new URL(req.url()),path=u.pathname,method=req.method();
    const fulfill=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
    if(path==='/api/products')return fulfill({products,ready:true,count:products.length});
    if(path==='/api/payment-options')return fulfill({checkoutEnabled:true,capabilities:[{id:'COD',enabled:true}],methods:[{id:'COD',enabled:true}]});
    if(path==='/api/product-detail')return fulfill({product:{...products[0],available_stock:5,variants:[{id:9101,product_id:901,sku:'E2E-TEA-901-STD',option_name:'ขนาด',option_value:'มาตรฐาน',price:190,stock:5,reserved_stock:0,available_stock:5,active:1}],media:[{url:'/assets/products/rang-jued-tea-360.webp'}]}});
    if(path==='/api/checkout-session'&&method==='POST'){
      state.checkoutSessions+=1;
      return fulfill({ok:true,sessionKey:'e2e-checkout-session-000000000001',status:'active',lastStep:'address',subtotal:190,itemCount:1});
    }
    if(path==='/api/checkout-quote'&&method==='POST'){
      state.quotePayload=JSON.parse(req.postData()||'{}');
      state.quoteRequests+=1;
      return fulfill({
        ok:true,
        lines:[{productId:901,variantId:9101,name:'ชารางจืดสำหรับทดสอบระบบ (ขนาด: มาตรฐาน)',unitPrice:190,qty:1,lineTotal:190,available:5}],
        subtotal:190,discount:0,promotionDiscount:0,promotionCode:null,promotionName:null,
        shipping:45,total:235,paymentMethods:['COD'],quoteSource:'server'
      });
    }
    if(path==='/api/orders'&&method==='POST'){
      state.orderPayload=JSON.parse(req.postData()||'{}');
      state.orderPosts+=1;
      return fulfill({ok:true,orderNo:'KCH-E2E-0001',subtotal:190,discount:0,shipping:45,total:235,paymentStatus:'unpaid',fulfillmentStatus:'pending',status:'pending'});
    }
    if(path==='/api/order-status'&&method==='GET'){
      state.lookup={orderNo:u.searchParams.get('orderNo'),phone:u.searchParams.get('phone')};
      if(state.lookup.orderNo!=='KCH-E2E-0001'||state.lookup.phone!=='0812345678')return fulfill({error:'order_not_found'},404);
      return fulfill({
        orderNo:'KCH-E2E-0001',total:235,subtotal:190,discountTotal:0,shippingTotal:45,
        paymentMethod:'COD',paymentStatus:'unpaid',fulfillmentStatus:'shipped',status:'processing',createdAt:'2026-09-05T07:00:00.000Z',
        carrier:'E2E Carrier',trackingNo:'E2E-TRACK-0001',shipmentStatus:'in_transit',shippedAt:'2026-09-05T08:00:00.000Z',deliveredAt:null,
        items:[{product_id:901,variant_id:9101,sku:'E2E-TEA-901-STD',product_name:'ชารางจืดสำหรับทดสอบระบบ',unit_price:190,qty:1,line_total:190,option_name:'ขนาด',option_value:'มาตรฐาน'}],
        events:[],shipmentEvents:[]
      });
    }
    return fulfill({ok:true});
  });
}

test.beforeEach(async({page})=>{await page.addInitScript(()=>localStorage.clear())});

test('clean storefront browse → cart server total → checkout server total → recovery-safe COD → secure tracking',async({page},testInfo)=>{
  const state={orderPayload:null,lookup:null,quotePayload:null,orderPosts:0,checkoutSessions:0,quoteRequests:0},errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await mockCommerce(page,state);
  await page.goto('/?e2e=clean-v1',{waitUntil:'domcontentloaded'});
  // Static E2E server does not execute Cloudflare middleware; load the exact production
  // clean V1 modules that middleware adds to the canonical home.
  await page.addStyleTag({path:'public/storefront-v1-commerce.css'});
  await page.addStyleTag({path:'public/storefront-v1-checkout-recovery.css'});
  await page.addStyleTag({path:'public/storefront-v1-checkout-quote.css'});
  await page.addScriptTag({path:'public/storefront-v1-postpurchase.js'});
  await page.addScriptTag({path:'public/storefront-v1-checkout-recovery.js'});
  await page.addScriptTag({path:'public/storefront-v1-checkout-quote.js'});

  await expect(page.locator('.kch-hero')).toBeVisible();
  await expect(page.getByRole('heading',{level:1})).toContainText('คัดสรรสมุนไพรไทย');
  await expect(page.locator('[data-product-card="rang-jued-tea-e2e"]')).toBeVisible();
  await expect(page.getByText('FLASH DEAL')).toHaveCount(0);
  await expect(page.getByText(/ขายแล้ว/)).toHaveCount(0);
  await expect(page.getByText('Verified Purchase')).toHaveCount(0);
  await expect(page.locator('[data-open-order-status]:visible').first()).toBeVisible();

  const metrics=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth}));
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth+1);
  if((page.viewportSize()?.width||0)<840)await expect(page.locator('.kch-mobile-nav')).toBeVisible();
  else await expect(page.locator('.kch-mobile-nav')).toBeHidden();

  await page.locator('[data-product-card="rang-jued-tea-e2e"] [data-open-product]').first().click();
  await expect(page.locator('.kch-detail-copy h2')).toContainText('ชารางจืด');
  await expect(page.locator('[data-variant="9101"]')).toBeVisible();
  await expect(page.locator('[data-variant="9101"]')).toHaveClass(/is-active/);
  await expect(page.locator('[data-detail-buy]')).toBeEnabled();
  const buyHeight=await page.locator('[data-detail-buy]').evaluate(el=>el.getBoundingClientRect().height);
  expect(buyHeight).toBeGreaterThanOrEqual(55);

  await page.locator('[data-detail-add]').click();
  await expect(page.locator('[data-layer="cart"]')).toHaveClass(/is-open/);
  await expect(page.locator('[data-cart-count]').first()).toHaveText('1');
  await expect(page.locator('[data-cart-body]')).toContainText('มาตรฐาน');
  await expect(page.locator('[data-cart-foot]')).toHaveAttribute('data-cart-quote-status','ready');
  await expect(page.locator('[data-cart-server-total]')).toContainText('฿235');
  await expect(page.locator('[data-cart-quote-breakdown]')).toContainText('จัดส่ง ฿45');
  await expect(page.locator('[data-start-checkout]')).toContainText('฿235');
  await expect(page.locator('[data-start-checkout]')).toBeEnabled();
  await page.waitForTimeout(75);
  expect(state.quoteRequests).toBe(1);
  const checkoutHeight=await page.locator('[data-start-checkout]').evaluate(el=>el.getBoundingClientRect().height);
  expect(checkoutHeight).toBeGreaterThanOrEqual(55);

  await page.locator('[data-start-checkout]').click();
  await expect(page.locator('[data-layer="checkout"]')).toHaveClass(/is-open/);
  await expect(page.locator('#customer-name')).toBeVisible();
  await expect(page.locator('[data-checkout-recovery-note]')).toBeVisible();
  await expect(page.locator('.kch-order-review')).toHaveAttribute('data-quote-status','ready');
  await expect(page.locator('[data-quote-final-total]')).toContainText('฿235');
  await expect(page.locator('.kch-order-review')).toContainText('ค่าจัดส่ง');
  await expect(page.locator('[data-place-order]')).toContainText('฿235');
  await page.waitForTimeout(75);
  expect(state.quoteRequests).toBe(2);
  expect(state.quotePayload?.items?.[0]).toEqual({id:901,variantId:9101,qty:1});
  expect(state.quotePayload?.customerName).toBeUndefined();
  expect(state.quotePayload?.phone).toBeUndefined();

  // Fill a partial checkout, return to the cart, then reopen checkout. PII must survive only
  // within the active page so an accidental back-to-cart action does not force re-entry.
  await page.locator('#customer-name').fill('ผู้ทดสอบระบบ');
  await page.locator('#customer-phone').fill('0812345678');
  await page.locator('#customer-address').fill('99 หมู่ 1 ถนนทดสอบ');
  await page.locator('[data-back-cart]').click();
  await expect(page.locator('[data-layer="cart"]')).toHaveClass(/is-open/);
  await expect(page.locator('[data-cart-foot]')).toHaveAttribute('data-cart-quote-status','ready');
  await expect(page.locator('[data-cart-server-total]')).toContainText('฿235');
  await page.waitForTimeout(75);
  expect(state.quoteRequests).toBe(3);

  // openCheckout awaits payment capabilities before replacing/reopening the checkout layer.
  // Wait for that transition before inspecting the new quote so this test cannot pass on stale DOM.
  await page.locator('[data-start-checkout]').click();
  await expect(page.locator('[data-layer="checkout"]')).toHaveClass(/is-open/);
  await expect(page.locator('#customer-name')).toHaveValue('ผู้ทดสอบระบบ');
  await expect(page.locator('#customer-phone')).toHaveValue('0812345678');
  await expect(page.locator('#customer-address')).toHaveValue('99 หมู่ 1 ถนนทดสอบ');
  await expect(page.locator('.kch-order-review')).toHaveAttribute('data-quote-status','ready');
  await expect(page.locator('[data-quote-final-total]')).toContainText('฿235');
  await expect(page.locator('[data-place-order]')).toContainText('฿235');
  await page.waitForTimeout(75);
  expect(state.quoteRequests).toBe(4);

  await page.locator('#customer-district').fill('เมือง');
  await page.locator('#customer-province').fill('อุบลราชธานี');
  await page.locator('#customer-postal').fill('34000');
  await expect(page.getByText('เก็บเงินปลายทาง (COD)')).toBeVisible();
  await expect(page.locator('[data-place-order]')).toBeEnabled();
  const orderHeight=await page.locator('[data-place-order]').evaluate(el=>el.getBoundingClientRect().height);
  expect(orderHeight).toBeGreaterThanOrEqual(55);

  // Subdistrict is required by the order payload/backend. The recovery guard must block
  // submission before /api/orders when it is missing, then focus/highlight that field.
  await page.locator('[data-place-order]').click();
  await expect(page.locator('[data-checkout-error]')).toContainText('ตำบล/แขวง');
  await expect(page.locator('#customer-subdistrict')).toHaveAttribute('aria-invalid','true');
  expect(state.orderPosts).toBe(0);
  expect(state.orderPayload).toBeNull();

  await page.locator('#customer-subdistrict').fill('ในเมือง');
  await expect(page.locator('#customer-subdistrict')).not.toHaveAttribute('aria-invalid','true');
  await page.locator('[data-place-order]').click();

  const success=page.locator('.kch-success');
  await expect(success.getByRole('heading',{name:'สั่งซื้อสำเร็จ'})).toBeVisible();
  await expect(success).toContainText('KCH-E2E-0001');
  await expect(success.locator('.kch-success-order')).toContainText('฿235');
  await expect(page.locator('[data-success-track]')).toBeVisible();

  expect(state.orderPosts).toBe(1);
  expect(state.checkoutSessions).toBeGreaterThanOrEqual(2);
  expect(state.orderPayload).not.toBeNull();
  expect(state.orderPayload.paymentMethod).toBe('COD');
  expect(state.orderPayload.items?.[0]?.variantId).toBe(9101);
  expect(String(state.orderPayload.idempotencyKey||'').length).toBeGreaterThan(10);
  expect(state.orderPayload.address?.subdistrict).toBe('ในเมือง');

  await page.locator('[data-success-track]').click();
  await expect(page.locator('[data-layer="order-status"]')).toHaveClass(/is-open/);
  await expect(page.locator('[data-order-no]')).toHaveValue('KCH-E2E-0001');
  await expect(page.locator('[data-order-phone]')).toHaveValue('');
  await page.locator('[data-order-phone]').fill('081-234-5678');
  await page.locator('[data-order-lookup]').click();
  await expect(page.getByText('อยู่ระหว่างจัดส่ง')).toBeVisible();
  await expect(page.getByText('E2E-TRACK-0001')).toBeVisible();
  await expect(page.locator('.kch-track-items')).toContainText('ชารางจืดสำหรับทดสอบระบบ');
  expect(state.lookup).toEqual({orderNo:'KCH-E2E-0001',phone:'0812345678'});

  const privacy=await page.evaluate(()=>({
    order:JSON.parse(localStorage.getItem('kch-last-order')||'{}'),
    localKeys:Object.keys(localStorage),
    sessionKeys:Object.keys(sessionStorage)
  }));
  expect(privacy.order.orderNo).toBe('KCH-E2E-0001');
  expect(privacy.order.phone).toBeUndefined();
  expect(privacy.localKeys.some(k=>/checkout.*(?:name|phone|address)|customer.*(?:name|phone|address)/i.test(k))).toBe(false);
  expect(privacy.sessionKeys.some(k=>/checkout.*(?:name|phone|address)|customer.*(?:name|phone|address)/i.test(k))).toBe(false);
  expect(errors).toEqual([]);

  const finalMetrics=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth}));
  expect(finalMetrics.scrollWidth).toBeLessThanOrEqual(finalMetrics.clientWidth+1);
  console.log(`PASS ${testInfo.project.name}: server totals in cart + checkout, transition-aware single-flight quote checks, recovery-safe COD + secure tracking journey`);
});
