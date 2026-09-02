import {test,expect} from '@playwright/test';

// Browser-only fixtures use non-production IDs and zero social proof.
const products=[
  {id:901,slug:'rang-jued-tea-e2e',sku:'E2E-TEA-901',name:'ชารางจืดสำหรับทดสอบระบบ',description:'ข้อมูลสำหรับทดสอบเส้นทางเลือกซื้อเท่านั้น',category:'ชาสมุนไพร',price:190,compare_at_price:null,rating:0,sold_count:0,stock:5,featured:1,image_url:'/assets/products/rang-jued-tea-360.webp'},
  {id:902,slug:'chiang-da-tea-e2e',sku:'E2E-TEA-902',name:'ชาเชียงดาสำหรับทดสอบระบบ',description:'ข้อมูลสำหรับทดสอบเส้นทางเลือกซื้อเท่านั้น',category:'ชาสมุนไพร',price:220,compare_at_price:null,rating:0,sold_count:0,stock:5,featured:1,image_url:'/assets/products/chiang-da-tea-360.webp'}
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

test.beforeEach(async({page})=>{await page.addInitScript(()=>localStorage.clear())});

test('master storefront discovery is readable, Thai-first and stable across viewports',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await mockStore(page);
  await page.goto('/?flagship=master',{waitUntil:'domcontentloaded'});

  await expect(page.locator('.shell')).toHaveClass(/kch-master-shell/);
  await expect(page.locator('.kch-master-home')).toBeVisible();
  await expect(page.getByRole('heading',{level:1})).toContainText('KHONCHAIHERB');
  await expect(page.getByRole('heading',{level:1})).toContainText('คุณชายสมุนไพร');

  const nav=page.locator('.kch-ref-menu');
  if((page.viewportSize()?.width||0)>=700){
    await expect(nav).toBeVisible();
    for(const label of ['หน้าแรก','สินค้าทั้งหมด','สินค้าแนะนำ','สินค้าใหม่','โปรโมชั่น','เกี่ยวกับเรา','ติดต่อเรา'])await expect(nav.getByRole('button',{name:label})).toBeVisible();
  }

  const hero=page.locator('.kch-master-hero');
  await expect(hero).toContainText('ภูมิปัญญาสมุนไพรไทย');
  await expect(page.locator('.kch-master-showcase')).toHaveCount(3);
  await expect(page.locator('.kch-master-showcase img[src="/assets/products/chiang-da-tea-360.webp"]')).toBeVisible();
  await expect(page.locator('.kch-master-showcase img[src="/assets/products/gymnema-capsules-100-512.webp"]')).toBeVisible();

  const grid=page.locator('.kch-master-products');
  await expect(grid).toBeVisible();
  await expect(grid.locator('[data-product="rang-jued-tea-e2e"]')).toContainText('ชารางจืด');

  const search=page.locator('.tshop-searchbox input');
  await search.fill('ชารางจืด');
  await expect(grid.locator('[data-product="rang-jued-tea-e2e"]')).toBeVisible();
  await expect(grid.locator('[data-product="chiang-da-tea-e2e"]')).toBeHidden();
  await search.fill('');

  const bodyText=await page.locator('body').innerText();
  expect(bodyText).not.toContain('ขายแล้ว 0');
  expect(bodyText).not.toContain('Verified Purchase');
  expect(bodyText).not.toContain('FLASH DEAL');
  expect(bodyText).not.toContain('สินค้าขายดี');
  expect(bodyText).not.toContain('088-5807909');
  expect(bodyText).not.toContain('0885807909');

  const metrics=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth}));
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth+1);
  expect(errors).toEqual([]);
});
