import {test,expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';

const products=[
  {id:1,slug:'rang-jued-tea',sku:'KCH-TEA-001',name:'ชารางจืดดีท็อกซ์',description:'ใบคัดคุณภาพ กลิ่นหอม ดื่มง่าย',category:'ชาสมุนไพร',price:189,compare_at_price:259,rating:4.9,sold_count:1248,stock:86,featured:1,image_url:null},
  {id:2,slug:'herbal-balm',sku:'KCH-BALM-001',name:'ยาหม่องสมุนไพรสูตรเข้มข้น',description:'กลิ่นสมุนไพรสดชื่น',category:'ดูแลร่างกาย',price:149,compare_at_price:199,rating:4.8,sold_count:938,stock:120,featured:1,image_url:null}
];

async function mockPreview(page){
  await page.route('https://fonts.googleapis.com/**',route=>route.fulfill({status:200,contentType:'text/css',body:''}));
  await page.route('https://fonts.gstatic.com/**',route=>route.fulfill({status:204,body:''}));
  await page.route('**/api/**',route=>{
    const u=new URL(route.request().url()),path=u.pathname;
    const fulfill=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
    if(path==='/api/products')return fulfill({products});
    if(path==='/api/coupons')return fulfill({coupons:[{code:'WELCOME50',type:'fixed',value:50,min_spend:499,max_discount:50,new_customer_only:1}]});
    if(path==='/api/recommendations')return fulfill({products});
    if(path==='/api/social-feed')return fulfill({items:[],creators:[]});
    if(path.startsWith('/api/customer/'))return fulfill({authenticated:false},401);
    return fulfill({ok:true});
  });
}

test.beforeEach(async({page})=>{await page.addInitScript(()=>localStorage.clear())});

test('capture storefront home preview',async({page},testInfo)=>{
  await mockPreview(page);
  await page.goto('/?preview=1',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#product-grid [data-product]').first()).toBeVisible();
  await page.waitForTimeout(500);
  await mkdir('preview-screenshots',{recursive:true});
  await page.screenshot({path:`preview-screenshots/${testInfo.project.name}-home.png`,fullPage:true});
});
