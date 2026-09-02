import {test,expect} from '@playwright/test';

const products=[
  {id:933,slug:'readable-rang-jued',sku:'V133-TEA',name:'ชารางจืดสำหรับตรวจการอ่าน',description:'ข้อมูลทดสอบส่วนติดต่อผู้ใช้',category:'ชาสมุนไพร',price:190,compare_at_price:null,rating:0,sold_count:0,stock:8,featured:1,sale_verified:1,image_url:'/assets/products/rang-jued-tea-360.webp'},
  {id:934,slug:'readable-chiang-da',sku:'V133-CD',name:'ชาเชียงดาสำหรับตรวจการอ่าน',description:'ข้อมูลทดสอบส่วนติดต่อผู้ใช้',category:'ชาสมุนไพร',price:180,compare_at_price:null,rating:0,sold_count:0,stock:8,featured:1,sale_verified:1,image_url:'/assets/products/chiang-da-tea-360.webp'}
];
async function mock(page){
  await page.route('https://fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:''}));
  await page.route('https://fonts.gstatic.com/**',r=>r.fulfill({status:204,body:''}));
  await page.route('**/api/**',route=>{
    const p=new URL(route.request().url()).pathname;
    const out=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
    if(p==='/api/products')return out({products});
    if(p==='/api/coupons')return out({coupons:[]});
    if(p==='/api/recommendations')return out({products});
    if(p==='/api/social-feed')return out({items:[],creators:[],contents:[]});
    if(p.startsWith('/api/customer/'))return out({authenticated:false},401);
    if(p==='/api/health')return out({ok:true,d1:true,version:'1.18.2'});
    return out({ok:true});
  });
}
const px=async locator=>Number.parseFloat(await locator.evaluate(el=>getComputedStyle(el).fontSize));
const box=async locator=>locator.evaluate(el=>{const r=el.getBoundingClientRect();return {width:r.width,height:r.height}});

test.beforeEach(async({page})=>{await page.addInitScript(()=>localStorage.clear());await mock(page)});

test('v1.33.1 is readable at 100% zoom and places account in the correct navigation hierarchy',async({page})=>{
  await page.goto('/?e2e=v1331-readable',{waitUntil:'domcontentloaded'});
  await expect(page.locator('.kch-master-home')).toBeVisible();
  await page.addStyleTag({url:'/tshop-v133-readable-storefront.css?v=1.33.1'});
  await page.addScriptTag({url:'/kch-readable-storefront.js?v=1.33.1'});

  const shell=page.locator('.kch-master-shell').first();
  await expect(shell).toHaveClass(/kch-v133-readable-storefront/);
  await expect(shell).toHaveAttribute('data-kch-v133','1.33.1');
  const viewport=page.viewportSize();
  const shellBox=await box(shell);
  if(viewport.width>=1100)expect(shellBox.width).toBeGreaterThan(viewport.width*.9);

  const search=page.locator('#shop-search,.tshop-searchbox input,.kch-header-search input,.kch-ref-search input,.tshop-search input').filter({visible:true}).first();
  await expect(search).toBeVisible();
  expect(await px(search)).toBeGreaterThanOrEqual(16);
  expect((await box(search)).height).toBeGreaterThanOrEqual(44);

  const productName=page.locator('.kch-master-product-copy h3,.kch-master-product-name').filter({visible:true}).first();
  await expect(productName).toBeVisible();
  expect(await px(productName)).toBeGreaterThanOrEqual(17);

  const productMeta=page.locator('.kch-master-product-copy .meta,.kch-master-product-meta,.kch-v132-card-note,.kch-v132-unready-note').filter({visible:true}).first();
  if(await productMeta.count())expect(await px(productMeta)).toBeGreaterThanOrEqual(14);

  const filter=page.locator('.kch-master-filter,.kch-master-finder button,.cats button').filter({visible:true}).first();
  if(await filter.count()){
    expect(await px(filter)).toBeGreaterThanOrEqual(14);
    expect((await box(filter)).height).toBeGreaterThanOrEqual(44);
  }

  const trustTitle=page.locator('.kch-master-hero-benefits b').filter({visible:true}).first();
  const trustSmall=page.locator('.kch-master-hero-benefits small').filter({visible:true}).first();
  if(await trustTitle.count())expect(await px(trustTitle)).toBeGreaterThanOrEqual(15);
  if(await trustSmall.count())expect(await px(trustSmall)).toBeGreaterThanOrEqual(14);

  if(viewport.width>=700){
    const account=page.locator('.tshop-topbar [data-kch-v133-account],header [data-kch-v133-account]').filter({visible:true}).first();
    await expect(account).toBeVisible();
    await expect(account).toContainText(/บัญชี/);
    expect((await box(account)).height).toBeGreaterThanOrEqual(48);
    expect(await px(account.locator('.kch-v133-action-copy b'))).toBeGreaterThanOrEqual(15);

    const menu=page.locator('.kch-ref-menu button,.tshop-menu button,.tshop-nav button').filter({visible:true}).first();
    if(await menu.count()){
      expect(await px(menu)).toBeGreaterThanOrEqual(viewport.width>=1100?16:15);
      expect((await box(menu)).height).toBeGreaterThanOrEqual(48);
    }
  }else{
    const account=page.locator('[data-kch-v133-account]').first();
    if(await account.count())await expect(account).toBeHidden();
    const bottomAccount=page.locator('nav.tshop-bottom [data-go="account"],nav.bottom [data-go="account"]').filter({visible:true}).first();
    await expect(bottomAccount).toBeVisible();
    expect((await box(bottomAccount)).height).toBeGreaterThanOrEqual(44);
  }

  const legacy=page.locator('.kch-v133-legacy-account-strip');
  for(let i=0;i<await legacy.count();i++)await expect(legacy.nth(i)).toBeHidden();
});
