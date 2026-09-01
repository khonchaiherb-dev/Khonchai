import {test,expect} from '@playwright/test';

const products=[
  {id:1,slug:'rang-jued-tea',sku:'KCH-TEA-001',name:'ชารางจืดคัดพิเศษ',description:'ใบคัดคุณภาพ กลิ่นหอม ดื่มง่าย',category:'ชาสมุนไพร',price:189,compare_at_price:259,rating:4.9,sold_count:1248,stock:86,featured:1,image_url:null},
  {id:2,slug:'herbal-balm',sku:'KCH-BALM-001',name:'บาล์มสมุนไพรสูตรเข้มข้น',description:'กลิ่นสมุนไพรสดชื่น',category:'ดูแลร่างกาย',price:149,compare_at_price:199,rating:4.8,sold_count:938,stock:120,featured:1,image_url:null}
];

async function mockStore(page){
  await page.route('**/api/**',route=>{
    const path=new URL(route.request().url()).pathname;
    const fulfill=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
    if(path==='/api/products')return fulfill({products});
    if(path==='/api/coupons')return fulfill({coupons:[]});
    if(path==='/api/recommendations')return fulfill({products});
    if(path==='/api/social-feed')return fulfill({items:[],contents:[],creators:[]});
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
  await expect(launch).toContainText('เตรียมพบสินค้าใหม่จากคุณชายสมุนไพร');
  await expect(launch).toContainText('ราคาเร็ว ๆ นี้');
  await expect(launch.locator('.kch-launch-card')).toHaveCount(2);
  await expect(launch.locator('img[src="/assets/products/chiang-da-tea-360.webp"]')).toBeVisible();
  await expect(launch.locator('img[src="/assets/products/gymnema-capsules-100-512.webp"]')).toBeVisible();
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
