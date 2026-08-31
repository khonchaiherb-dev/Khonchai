import {test,expect} from '@playwright/test';

const products=[
  {id:1,slug:'rang-jued-tea',sku:'KCH-TEA-001',name:'ชารางจืดดีท็อกซ์',description:'ใบคัดคุณภาพ กลิ่นหอม ดื่มง่าย',category:'ชาสมุนไพร',price:189,compare_at_price:259,rating:4.9,sold_count:1248,stock:86,featured:1,image_url:null},
  {id:2,slug:'herbal-balm',sku:'KCH-BALM-001',name:'ยาหม่องสมุนไพรสูตรเข้มข้น',description:'กลิ่นสมุนไพรสดชื่น',category:'ดูแลร่างกาย',price:149,compare_at_price:199,rating:4.8,sold_count:938,stock:120,featured:1,image_url:null}
];
const coupons=[{code:'WELCOME50',type:'fixed',value:50,min_spend:499,max_discount:50,new_customer_only:1}];

async function mockCommerce(page,state){
  await page.route('https://fonts.googleapis.com/**',route=>route.fulfill({status:200,contentType:'text/css',body:''}));
  await page.route('https://fonts.gstatic.com/**',route=>route.fulfill({status:204,body:''}));
  await page.route('**/api/**',async route=>{
    const req=route.request(),u=new URL(req.url()),path=u.pathname,method=req.method();
    const fulfill=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
    if(path==='/api/products')return fulfill({products});
    if(path==='/api/coupons')return fulfill({coupons});
    if(path==='/api/product-detail')return fulfill({product:{...products[0],available_stock:86,variants:[{id:101,product_id:1,sku:'KCH-TEA-001-STD',option_name:'ขนาด',option_value:'มาตรฐาน',price:189,compare_at_price:259,stock:86,reserved_stock:0,available_stock:86,active:1}],media:[],reviewSummary:{count:0,average:0}}});
    if(path==='/api/customer/me'||path==='/api/customer/favorites'||path==='/api/customer/personalized'||path==='/api/customer/recent'||path==='/api/customer/rewards')return fulfill({authenticated:false},401);
    if(path==='/api/recommendations')return fulfill({products});
    if(path==='/api/social-feed')return fulfill({items:[],creators:[]});
    if(path==='/api/commerce-event'&&method==='POST')return fulfill({ok:true});
    if(path==='/api/orders'&&method==='POST'){
      state.orderPayload=JSON.parse(req.postData()||'{}');
      return fulfill({orderNo:'KCH-E2E-0001',subtotal:189,discount:0,shipping:45,total:234,paymentStatus:'unpaid',fulfillmentStatus:'pending',status:'pending',attribution:{source:'shop'}});
    }
    return fulfill({ok:true});
  });
}

test.beforeEach(async({page})=>{
  await page.addInitScript(()=>localStorage.clear());
});

test('browse → variant-safe cart → checkout → COD confirmation on real browser',async({page},testInfo)=>{
  const state={orderPayload:null};
  await mockCommerce(page,state);
  await page.goto('/?e2e=stability',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#product-grid [data-product]').first()).toBeVisible();

  const viewport=page.viewportSize();
  const shell=await page.locator('.shell').first().boundingBox();
  expect(shell).not.toBeNull();
  expect(shell.width).toBeLessThanOrEqual(viewport.width+1);
  if(viewport.width>=1024){
    expect(shell.width).toBeGreaterThan(900);
    await expect(page.locator('.v115-desktop-nav')).toBeVisible();
    await expect(page.locator('nav.tshop-bottom')).toBeHidden();
  }else{
    await expect(page.locator('nav.tshop-bottom')).toBeVisible();
    expect(shell.width).toBeGreaterThan(viewport.width*0.9);
  }

  const productCard=page.locator('#product-grid [data-product="rang-jued-tea"]');
  await expect(productCard.locator('.tshop-card-info')).toBeVisible();
  await productCard.click();
  await expect(page.locator('.pdp-title')).toContainText('ชารางจืด');
  await expect(page.locator('[data-v17-variant="101"]')).toBeVisible();

  await page.locator('button[data-add="1"]:visible').last().click();
  await expect(page.locator('header .badge').first()).toHaveText('1');

  await page.locator('header button[data-go="cart"]').click();
  await expect(page.locator('.page-title')).toHaveText('ตะกร้าสินค้า');
  await expect(page.locator('.v17-line-variant')).toContainText('มาตรฐาน');

  await page.locator('button[data-go="checkout"]:visible').last().click();
  await expect(page.locator('#customer-name')).toBeVisible();
  await page.locator('#customer-name').fill('ผู้ทดสอบระบบ');
  await page.locator('#customer-phone').fill('0812345678');
  await page.locator('#customer-address').fill('99 หมู่ 1 ถนนทดสอบ');
  if(await page.locator('#customer-subdistrict').count())await page.locator('#customer-subdistrict').fill('ในเมือง');
  await page.locator('#customer-district').fill('เมือง');
  await page.locator('#customer-province').fill('อุบลราชธานี');
  await page.locator('#customer-postal').fill('34000');
  await expect(page.locator('input[name="pay"][value="COD"]')).toBeChecked();

  await page.locator('[data-place]').click();
  await expect(page.getByRole('heading',{name:'สั่งซื้อสำเร็จ'})).toBeVisible();
  await expect(page.getByText('KCH-E2E-0001')).toBeVisible();
  expect(state.orderPayload).not.toBeNull();
  expect(state.orderPayload.paymentMethod).toBe('COD');
  expect(state.orderPayload.items?.[0]?.variantId).toBe(101);
  expect(String(state.orderPayload.idempotencyKey||'').length).toBeGreaterThan(10);

  await testInfo.attach('viewport',{body:Buffer.from(JSON.stringify(viewport)),contentType:'application/json'});
});
