import {test,expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';

const products=[
  {id:1,slug:'rang-jued-tea',sku:'KCH-TEA-001',name:'ชารางจืดดีท็อกซ์',description:'ใบคัดคุณภาพ กลิ่นหอม ดื่มง่าย',category:'ชาสมุนไพร',price:189,compare_at_price:259,rating:4.9,sold_count:1248,stock:86,featured:1,image_url:null},
  {id:2,slug:'herbal-balm',sku:'KCH-BALM-001',name:'ยาหม่องสมุนไพรสูตรเข้มข้น',description:'กลิ่นสมุนไพรสดชื่น',category:'ดูแลร่างกาย',price:149,compare_at_price:199,rating:4.8,sold_count:938,stock:120,featured:1,image_url:null}
];

async function mockPreview(page){
  await page.route('**/api/**',route=>{
    const u=new URL(route.request().url()),path=u.pathname;
    const fulfill=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
    if(path==='/api/products')return fulfill({products});
    if(path==='/api/coupons')return fulfill({coupons:[{code:'WELCOME50',type:'fixed',value:50,min_spend:499,max_discount:50,new_customer_only:1}]});
    if(path==='/api/product-detail')return fulfill({product:{...products[0],available_stock:86,variants:[{id:101,product_id:1,sku:'KCH-TEA-001-STD',option_name:'ขนาด',option_value:'มาตรฐาน',price:189,compare_at_price:259,stock:86,reserved_stock:0,available_stock:86,active:1}],media:[],reviewSummary:{count:0,average:0}}});
    if(path==='/api/recommendations')return fulfill({products});
    if(path==='/api/social-feed')return fulfill({items:[],creators:[]});
    if(path.startsWith('/api/customer/'))return fulfill({authenticated:false},401);
    return fulfill({ok:true});
  });
}

test.beforeEach(async({page})=>{await page.addInitScript(()=>localStorage.clear())});

test('capture branded storefront home and product preview',async({page},testInfo)=>{
  await mockPreview(page);
  await page.goto('/?preview=1',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#product-grid [data-product]').first()).toBeVisible();
  const pandan=page.locator('#product-grid [data-product="dried-pandan-leaves"]');
  await expect(pandan).toBeVisible();
  await expect(pandan.locator('img')).toHaveAttribute('src','/assets/pandan-aromatic-dried.svg');
  await expect(pandan).toContainText('ใบเตยหอมอบแห้ง');
  await expect(pandan).toContainText('ราคาเร็ว ๆ นี้');
  await expect(pandan.locator('[data-add]')).toBeDisabled();
  await expect(page.locator('.category-strip [data-cat="สมุนไพรอบแห้ง"]')).toBeVisible();
  await expect(page.locator('.tshop-hero')).toContainText('คุณชายสมุนไพร');
  await expect(page.locator('.tshop-hero')).not.toContainText('Shop • Scroll • Buy');
  await expect(page.locator('.flash-logo')).toHaveText('ข้อเสนอพิเศษวันนี้');
  await expect(page.locator('.quick-icons button').nth(2).locator(':scope > span:last-child')).toHaveText('คูปอง');
  await expect(page.locator('.v05-creator-section .tshop-section-head h2')).toHaveText('เรื่องราวจากคุณชายสมุนไพร');
  await page.evaluate(async()=>{if(document.fonts?.ready)await document.fonts.ready});
  await page.waitForTimeout(500);
  await mkdir('preview-screenshots',{recursive:true});
  await page.screenshot({path:`preview-screenshots/${testInfo.project.name}-home.png`,fullPage:true});

  await page.evaluate(()=>{const p=Array.isArray(PRODUCTS)?PRODUCTS.find(x=>x.slug==='rang-jued-tea'):null;if(p&&typeof product==='function')product(p)});
  await expect(page.locator('.pdp-title')).toContainText('ชารางจืด');
  await expect(page.locator('.shop-profile-copy')).toContainText('คุณชายสมุนไพร');
  await expect(page.locator('.v115-pdp-brandnote')).toContainText('จัดจำหน่ายโดย คุณชายสมุนไพร');
  await expect(page.locator('.v115-pdp-trust')).toContainText('เก็บเงินปลายทาง');
  await expect(page.locator('.v115-pdp-trust')).toContainText('ออกใบเสร็จได้');
  await expect(page.locator('.v07-recommend-block [data-product="rang-jued-tea"]')).toHaveCount(0);
  if(testInfo.project.name==='desktop-1440'){
    const zone=page.locator('.v115-pdp-recommend-zone');
    await expect(zone).toBeVisible();
    await expect(zone).toContainText('คัดมาให้คุณ');
    await expect(zone.locator('.recommend-head')).toBeHidden();
    await expect(zone.locator('.tshop-grid')).toBeHidden();
    await expect(zone.locator('[data-product="herbal-balm"]')).toBeVisible();
  }else{
    await expect(page.locator('.v115-pdp-recommend-zone')).toHaveCount(0);
    await expect(page.locator('.recommend-head')).toBeVisible();
  }
  await page.waitForTimeout(350);
  await page.screenshot({path:`preview-screenshots/${testInfo.project.name}-product.png`,fullPage:true});
});
