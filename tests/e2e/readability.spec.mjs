import {test,expect} from '@playwright/test';

const products=[
  {id:933,slug:'readable-rang-jued',sku:'V134-TEA',name:'ชารางจืดสำหรับตรวจการอ่าน',description:'ข้อมูลทดสอบส่วนติดต่อผู้ใช้',category:'ชาสมุนไพร',price:190,compare_at_price:null,rating:0,sold_count:0,stock:8,featured:1,sale_verified:1,image_url:'/assets/products/rang-jued-tea-360.webp'},
  {id:934,slug:'readable-chiang-da',sku:'V134-CD',name:'ชาเชียงดาสำหรับตรวจการอ่าน',description:'ข้อมูลทดสอบส่วนติดต่อผู้ใช้',category:'ชาสมุนไพร',price:180,compare_at_price:null,rating:0,sold_count:0,stock:8,featured:1,sale_verified:1,image_url:'/assets/products/chiang-da-tea-360.webp'}
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

test('v1.34 structural header is readable at 100% zoom and puts account in the correct hierarchy',async({page})=>{
  await page.goto('/?e2e=v134-structural',{waitUntil:'domcontentloaded'});
  await expect(page.locator('.kch-master-home')).toBeVisible();
  await page.addStyleTag({url:'/tshop-v134-structural-storefront.css?v=1.34.0'});
  await page.addStyleTag({url:'/kch-storefront-stability.css?v=1.0.0'});
  await page.addScriptTag({url:'/kch-v134-structural-storefront.js?v=1.34.0'});

  const shell=page.locator('.kch-master-shell').first();
  await expect(shell).toHaveClass(/kch-v134-active/);
  await expect(shell).toHaveAttribute('data-kch-ui','1.34.0');
  const viewport=page.viewportSize();
  const shellBox=await box(shell);
  if(viewport.width>=1100)expect(shellBox.width).toBeGreaterThan(viewport.width*.9);

  const header=page.locator('#kch-v134-header');
  await expect(header).toBeVisible();
  await expect(header).toHaveAttribute('data-kch-v134','1.34.0');

  const search=page.locator('#kch-v134-search');
  await expect(search).toBeVisible();
  expect(await px(search)).toBeGreaterThanOrEqual(16);
  expect((await box(search)).height).toBeGreaterThanOrEqual(44);

  const productName=page.locator('.kch-master-product-copy h3,.kch-master-product-name,.card-info h3,article.card h3').filter({visible:true}).first();
  await expect(productName).toBeVisible();
  expect(await px(productName)).toBeGreaterThanOrEqual(17);

  const productMeta=page.locator('.kch-master-product-copy .meta,.kch-master-product-meta,.kch-v132-card-note,.kch-v132-unready-note,.rating,.card-foot').filter({visible:true}).first();
  if(await productMeta.count())expect(await px(productMeta)).toBeGreaterThanOrEqual(14);

  const filter=page.locator('.kch-master-filter,.kch-master-finder button,.cats button').filter({visible:true}).first();
  if(await filter.count()){
    expect(await px(filter)).toBeGreaterThanOrEqual(14);
    expect((await box(filter)).height).toBeGreaterThanOrEqual(44);
  }

  const trustTitle=page.locator('.kch-master-hero-benefits b,.trust b').filter({visible:true}).first();
  const trustSmall=page.locator('.kch-master-hero-benefits small,.trust small').filter({visible:true}).first();
  if(await trustTitle.count())expect(await px(trustTitle)).toBeGreaterThanOrEqual(15);
  if(await trustSmall.count())expect(await px(trustSmall)).toBeGreaterThanOrEqual(14);

  if(viewport.width>=700){
    const account=page.locator('#kch-v134-header [data-v134-go="account"]');
    await expect(account).toBeVisible();
    await expect(account).toContainText(/บัญชี/);
    expect((await box(account)).height).toBeGreaterThanOrEqual(48);
    expect(await px(account.locator('.kch-v134-action-copy b'))).toBeGreaterThanOrEqual(15);

    const menu=page.locator('#kch-v134-nav button').first();
    await expect(menu).toBeVisible();
    expect(await px(menu)).toBeGreaterThanOrEqual(viewport.width>=1100?16:15);
    expect((await box(menu)).height).toBeGreaterThanOrEqual(48);
  }else{
    const topActions=page.locator('#kch-v134-header .kch-v134-actions');
    await expect(topActions).toBeHidden();
    const bottomAccount=page.locator('nav.tshop-bottom [data-go="account"],nav.bottom [data-go="account"]').filter({visible:true}).first();
    await expect(bottomAccount).toBeVisible();
    expect((await box(bottomAccount)).height).toBeGreaterThanOrEqual(44);
  }

  for(const selector of ['.kch-v134-obsolete-header','.kch-v134-obsolete-menu','.kch-v134-obsolete-account-strip']){
    const rows=page.locator(selector);
    for(let i=0;i<await rows.count();i++)await expect(rows.nth(i)).toBeHidden();
  }
});
