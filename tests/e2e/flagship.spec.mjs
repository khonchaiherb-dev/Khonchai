import {test,expect} from '@playwright/test';

// Browser-only fixtures intentionally use non-production IDs and zero social proof.
// They verify interaction paths without presenting seed/demo metrics as real store data.
const products=[
  {id:901,slug:'rang-jued-tea-e2e',sku:'E2E-TEA-901',name:'ชารางจืดสำหรับทดสอบระบบ',description:'ข้อมูลสำหรับทดสอบเส้นทางเลือกซื้อเท่านั้น',category:'ชาสมุนไพร',price:190,compare_at_price:null,rating:0,sold_count:0,stock:5,featured:1,image_url:'/assets/products/rang-jued-tea-360.webp'},
  {id:902,slug:'chiang-da-tea-e2e',sku:'E2E-TEA-902',name:'ชาเชียงดาสำหรับทดสอบระบบ',description:'ข้อมูลสำหรับทดสอบเส้นทางเลือกซื้อเท่านั้น',category:'ชาสมุนไพร',price:220,compare_at_price:null,rating:0,sold_count:0,stock:5,featured:1,image_url:'/assets/products/chiang-da-tea-360.webp'}
];

async function mockStore(page){
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

test('digital flagship discovery and verified launch preview work across viewports',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await mockStore(page);
  await page.goto('/?flagship=1',{waitUntil:'domcontentloaded'});
  await expect(page.locator('.v118-smart-helper')).toBeVisible();
  await expect(page.locator('.kch-shop-assistant-form')).toBeVisible();
  await expect(page.locator('.kch-shop-assistant-form input[type="search"]')).toBeVisible();
  const launch=page.locator('.kch-flagship-launch');
  await expect(launch).toBeVisible();
  await launch.scrollIntoViewIfNeeded();
  await expect(launch).toContainText('เตรียมพบสินค้าใหม่จากคุณชายสมุนไพร');
  await expect(launch).toContainText('ราคาเร็ว ๆ นี้');
  await expect(launch.locator('.kch-launch-card')).toHaveCount(2);
  const teaImage=launch.locator('img[src="/assets/products/chiang-da-tea-360.webp"]');
  const capsuleImage=launch.locator('img[src="/assets/products/gymnema-capsules-100-512.webp"]');
  await expect(teaImage).toBeVisible();
  await expect(capsuleImage).toBeVisible();
  await expect.poll(()=>teaImage.evaluate(img=>({complete:img.complete,width:img.naturalWidth}))).toMatchObject({complete:true,width:360});
  await expect.poll(()=>capsuleImage.evaluate(img=>({complete:img.complete,width:img.naturalWidth}))).toMatchObject({complete:true,width:512});
  await expect(launch).toContainText('30 ซอง');
  await expect(launch).toContainText('100 แคปซูล');

  const search=page.locator('.kch-shop-assistant-form input[type="search"]');
  await search.fill('ชารางจืด');
  await page.locator('.kch-shop-assistant-submit').click();
  await expect(page.locator('.kch-shop-assistant-status')).toContainText('ชารางจืด');
  await expect(page.locator('#product-grid')).toContainText('ชารางจืด');

  const metrics=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth}));
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth+1);
  expect(errors).toEqual([]);
});
