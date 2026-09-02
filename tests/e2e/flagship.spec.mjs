import {test,expect} from '@playwright/test';

const products=[
  {id:901,slug:'rang-jued-tea-e2e',sku:'E2E-TEA-901',name:'ชารางจืดสำหรับทดสอบระบบ',description:'ข้อมูลสำหรับทดสอบเส้นทางเลือกซื้อเท่านั้น',category:'ชาสมุนไพร',price:190,compare_at_price:null,rating:0,sold_count:0,stock:5,featured:1,sale_verified:1,image_url:'/assets/products/rang-jued-tea-360.webp'},
  {id:902,slug:'chiang-da-tea-e2e',sku:'E2E-TEA-902',name:'ชาเชียงดาสำหรับทดสอบระบบ',description:'ข้อมูลสำหรับทดสอบเส้นทางเลือกซื้อเท่านั้น',category:'ชาสมุนไพร',price:220,compare_at_price:null,rating:0,sold_count:0,stock:5,featured:1,sale_verified:1,image_url:'/assets/products/chiang-da-tea-360.webp'}
];

async function mockStore(page){
  await page.route('https://fonts.googleapis.com/**',route=>route.fulfill({status:200,contentType:'text/css',body:''}));
  await page.route('https://fonts.gstatic.com/**',route=>route.fulfill({status:204,body:''}));
  await page.route('**/api/**',route=>{
    const path=new URL(route.request().url()).pathname;
    const fulfill=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
    if(path==='/api/products')return fulfill({products});
    if(path==='/api/coupons')return fulfill({coupons:[]});
    if(path==='/api/recommendations')return fulfill({products});
    if(path==='/api/social-feed')return fulfill({items:[],contents:[],creators:[]});
    if(path==='/api/health')return fulfill({ok:true,d1:true,version:'1.18.2'});
    if(path.startsWith('/api/customer/'))return fulfill({authenticated:false},401);
    return fulfill({ok:true});
  });
}

async function loadProductionLayers(page){
  await page.addStyleTag({path:'public/tshop-v131-top-conversion.css'});
  await page.addScriptTag({path:'public/kch-top-conversion.js'});
  await expect.poll(()=>page.evaluate(()=>window.__KCH_TOP_CONVERSION__)).toBe('1.31.2');
  await page.addStyleTag({path:'public/tshop-v132-conversion-storefront.css'});
  await page.addStyleTag({path:'public/tshop-v1321-search-visibility-fix.css'});
  await page.addScriptTag({path:'public/kch-conversion-storefront.js'});
  await expect.poll(()=>page.evaluate(()=>window.__KCH_CONVERSION_STOREFRONT__)).toBe('1.32.0');
  await page.addStyleTag({path:'public/tshop-v134-structural-storefront.css'});
  await page.addScriptTag({path:'public/kch-v134-structural-storefront.js'});
  await expect.poll(()=>page.evaluate(()=>window.__KCH_V134_STRUCTURAL__)).toBe('1.34.6');
}

const visibleCount=async locator=>{let n=0;for(let i=0;i<await locator.count();i++)if(await locator.nth(i).isVisible())n++;return n};

test.beforeEach(async({page})=>{await page.addInitScript(()=>localStorage.clear())});

test('master storefront keeps conversion content while exposing one canonical commerce header',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await mockStore(page);
  await page.goto('/?flagship=master',{waitUntil:'domcontentloaded'});
  await loadProductionLayers(page);

  const shell=page.locator('.kch-master-shell').first();
  await expect(shell).toBeVisible();
  await expect(shell).toHaveAttribute('data-kch-ui','1.34.6');
  await expect(page.locator('.kch-master-home')).toBeVisible();

  const header=page.locator('#kch-v134-header');
  await expect(header).toHaveCount(1);
  await expect(header).toBeVisible();
  await expect(header).toHaveAttribute('data-kch-v134','1.34.6');
  expect(await visibleCount(page.locator('.tshop-topbar,.topbar,.kch-master-topbar,.kch-ref-menu,.tshop-menu,.tshop-nav'))).toBe(0);
  expect(await visibleCount(page.locator('.kch-master-shell input[type="search"]'))).toBe(1);

  const viewportWidth=page.viewportSize()?.width||0;
  if(viewportWidth>=700){
    const nav=page.locator('#kch-v134-nav');
    await expect(nav).toBeVisible();
    for(const label of ['หน้าหลัก','สินค้าทั้งหมด','สินค้าแนะนำ','สินค้าใหม่','โปรโมชั่น','เกี่ยวกับเรา','ติดต่อเรา'])await expect(nav.getByRole('button',{name:label})).toBeVisible();
    expect(await visibleCount(page.getByText(/เข้าสู่ระบบ\s*\/\s*สมัครสมาชิก/))).toBe(1);
  }

  const hero=page.locator('.kch-master-hero');
  await expect(hero).toContainText('สมุนไพรไทยที่คัดสรร');
  await expect(hero).toContainText('เพื่อการดูแลสุขภาพในทุกวัน');
  await expect(hero).toContainText('เก็บเงินปลายทาง');
  await expect(page.locator('.kch-master-showcase')).toHaveCount(3);
  await expect(page.locator('.kch-master-showcase img[src="/assets/products/chiang-da-tea-360.webp"]')).toBeVisible();
  await expect(page.locator('.kch-master-showcase img[src="/assets/products/gymnema-capsules-100-512.webp"]')).toBeVisible();

  const memberInterrupt=page.locator('.kch-v131-member-interrupt');
  await expect(memberInterrupt).toHaveCount(1);
  await expect(memberInterrupt).toBeHidden();
  await expect(page.locator('.kch-master-range')).toBeHidden();

  const grid=page.locator('.kch-master-products');
  await expect(grid).toBeVisible();
  const rangJued=grid.locator('[data-product="rang-jued-tea-e2e"]');
  const chiangDa=grid.locator('[data-product="chiang-da-tea-e2e"]');
  await expect(rangJued).toContainText('ชารางจืด');
  await expect(rangJued).toHaveAttribute('data-kch-v132-ready','1');
  await expect(rangJued.getByRole('button',{name:/สั่งซื้อ ชารางจืด/})).toBeVisible();
  await expect(rangJued).toContainText('฿190');

  const mediaHeight=await rangJued.locator('.kch-master-product-media').evaluate(el=>Math.round(el.getBoundingClientRect().height));
  if(viewportWidth<=520)expect(mediaHeight).toBeLessThanOrEqual(170);
  else if(viewportWidth<=899)expect(mediaHeight).toBeLessThanOrEqual(180);
  else expect(mediaHeight).toBeLessThanOrEqual(215);

  const search=header.locator('#kch-v134-search');
  await search.fill('ชารางจืด');
  await expect(rangJued).toBeVisible();
  await expect(chiangDa).toBeHidden();
  await expect(chiangDa).toHaveAttribute('data-kch-urgent-search','0');
  await search.fill('');
  await expect(chiangDa).toBeVisible();
  await expect(chiangDa).not.toHaveAttribute('data-kch-urgent-search');

  const bodyText=await page.locator('body').innerText();
  for(const forbidden of ['ขายแล้ว 0','Verified Purchase','FLASH DEAL','สินค้าขายดี','088-5807909','0885807909','shopping_cart','inventory_2','schedule','payments','local_shipping','verified_user','receipt_long','person_add','assignment_turned_in'])expect(bodyText).not.toContain(forbidden);

  await page.waitForTimeout(350);
  expect(await visibleCount(page.locator('#kch-v134-header'))).toBe(1);
  expect(await visibleCount(page.locator('.tshop-topbar,.topbar,.kch-master-topbar,.kch-ref-menu,.tshop-menu,.tshop-nav'))).toBe(0);
  expect(await visibleCount(page.locator('.kch-master-shell input[type="search"]'))).toBe(1);

  const metrics=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth}));
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth+1);
  expect(errors).toEqual([]);
});
