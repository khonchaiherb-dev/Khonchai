import {test,expect} from '@playwright/test';

const products=[
  {id:901,slug:'rang-jued-tea-e2e',sku:'E2E-TEA-901',name:'ชารางจืดสำหรับทดสอบระบบ',description:'ข้อมูลสำหรับทดสอบเส้นทางสั่งซื้อเท่านั้น',category:'ชาสมุนไพร',price:190,compare_at_price:null,rating:0,sold_count:0,stock:5,featured:1,image_url:'/assets/products/rang-jued-tea-360.webp'},
  {id:902,slug:'herbal-balm-e2e',sku:'E2E-BALM-902',name:'สินค้าสมุนไพรสำหรับทดสอบระบบ',description:'ข้อมูลสำหรับทดสอบเส้นทางสั่งซื้อเท่านั้น',category:'ดูแลร่างกาย',price:150,compare_at_price:null,rating:0,sold_count:0,stock:5,featured:1,image_url:'/assets/products/chiang-da-tea-360.webp'}
];

async function mockCommerce(page,state){
  await page.route('https://fonts.googleapis.com/**',route=>route.fulfill({status:200,contentType:'text/css',body:''}));
  await page.route('https://fonts.gstatic.com/**',route=>route.fulfill({status:204,body:''}));
  await page.route('**/api/**',async route=>{
    const req=route.request(),u=new URL(req.url()),path=u.pathname,method=req.method();
    const fulfill=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
    if(path==='/api/products')return fulfill({products});
    if(path==='/api/coupons')return fulfill({coupons:[]});
    if(path==='/api/product-detail')return fulfill({product:{...products[0],available_stock:5,variants:[{id:9101,product_id:901,sku:'E2E-TEA-901-STD',option_name:'ขนาด',option_value:'มาตรฐาน',price:190,compare_at_price:null,stock:5,reserved_stock:0,available_stock:5,active:1}],media:[],review:{count:0,average:0},reviewSummary:{count:0,average:0}}});
    if(path==='/api/health')return fulfill({ok:true,d1:true,version:'1.18.2'});
    if(path==='/api/customer/me'||path==='/api/customer/favorites'||path==='/api/customer/personalized'||path==='/api/customer/recent'||path==='/api/customer/rewards')return fulfill({authenticated:false},401);
    if(path==='/api/recommendations')return fulfill({products});
    if(path==='/api/social-feed')return fulfill({items:[],creators:[],contents:[]});
    if(path==='/api/commerce-event'&&method==='POST')return fulfill({ok:true});
    if(path==='/api/orders'&&method==='POST'){
      state.orderPayload=JSON.parse(req.postData()||'{}');
      return fulfill({orderNo:'KCH-E2E-0001',subtotal:190,discount:0,shipping:45,total:235,paymentStatus:'unpaid',fulfillmentStatus:'pending',status:'pending',attribution:{source:'shop'}});
    }
    return fulfill({ok:true});
  });
}

test.beforeEach(async({page})=>{await page.addInitScript(()=>localStorage.clear())});

test('master browse → variant-safe cart → checkout → COD confirmation on real browser',async({page})=>{
  const state={orderPayload:null},errors=[];page.on('pageerror',e=>errors.push(e.message));
  await mockCommerce(page,state);
  await page.goto('/?e2e=master-commerce',{waitUntil:'domcontentloaded'});

  const viewport=page.viewportSize();
  const shell=page.locator('.shell').first();
  await expect(shell).toHaveClass(/kch-master-shell/);
  await expect(page.locator('.kch-master-home')).toBeVisible();
  const shellWidth=await shell.evaluate(el=>el.getBoundingClientRect().width);
  expect(shellWidth).toBeGreaterThan(0);
  expect(shellWidth).toBeLessThanOrEqual(viewport.width+1);
  if(viewport.width>=700)await expect(page.locator('nav.tshop-bottom')).toBeHidden();
  else await expect(page.locator('nav.tshop-bottom')).toBeVisible();

  const productCard=page.locator('.kch-master-product[data-product="rang-jued-tea-e2e"]');
  await expect(productCard).toBeVisible();
  await expect(productCard.locator('h3')).toContainText('ชารางจืด');
  await productCard.click();

  await expect(page.locator('.pdp-title')).toContainText('ชารางจืด');
  await expect(page.locator('[data-v17-variant="9101"]')).toBeVisible();
  await expect(page.locator('.rating')).toHaveCount(0);
  await expect(page.getByText(/ขายแล้ว/)).toHaveCount(0);

  await page.locator('button[data-add="901"]:visible').last().click();
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
  await expect(page.locator('[data-place]')).toBeEnabled();
  await page.locator('[data-place]').click();

  await expect(page.getByRole('heading',{name:'สั่งซื้อสำเร็จ'})).toBeVisible();
  await expect(page.getByText('KCH-E2E-0001')).toBeVisible();
  expect(state.orderPayload).not.toBeNull();
  expect(state.orderPayload.paymentMethod).toBe('COD');
  expect(state.orderPayload.items?.[0]?.variantId).toBe(9101);
  expect(String(state.orderPayload.idempotencyKey||'').length).toBeGreaterThan(10);
  expect(errors).toEqual([]);
});
