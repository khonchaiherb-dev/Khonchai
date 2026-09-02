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
const visibleCount=async locator=>{let n=0;for(let i=0;i<await locator.count();i++)if(await locator.nth(i).isVisible())n++;return n};

test.beforeEach(async({page})=>{await page.addInitScript(()=>localStorage.clear());await mock(page)});

test('v1.34.6 exposes exactly one readable storefront chrome at 100% zoom',async({page})=>{
  await page.goto('/?e2e=v1346-urgent',{waitUntil:'domcontentloaded'});
  await expect(page.locator('.kch-master-home')).toBeVisible();
  await page.addStyleTag({url:'/tshop-v134-structural-storefront.css?v=1.34.6'});
  await page.addScriptTag({url:'/kch-v134-structural-storefront.js?v=1.34.6'});
  await expect.poll(()=>page.evaluate(()=>window.__KCH_V134_STRUCTURAL__)).toBe('1.34.6');

  const shell=page.locator('.kch-master-shell').first();
  await expect(shell).toHaveAttribute('data-kch-ui','1.34.6');
  const viewport=page.viewportSize();
  if(viewport.width>=1100)expect((await box(shell)).width).toBeGreaterThan(viewport.width*.9);

  const header=page.locator('#kch-v134-header');
  await expect(header).toHaveCount(1);
  await expect(header).toBeVisible();
  await expect(header).toHaveAttribute('data-kch-v134','1.34.6');

  const search=page.locator('#kch-v134-search');
  await expect(search).toHaveCount(1);
  await expect(search).toBeVisible();
  expect(await px(search)).toBeGreaterThanOrEqual(16);
  expect((await box(search)).height).toBeGreaterThanOrEqual(44);

  const legacyChrome=page.locator('.tshop-topbar,.topbar,.kch-master-topbar,.kch-ref-menu,.tshop-menu,.tshop-nav');
  expect(await visibleCount(legacyChrome)).toBe(0);
  expect(await visibleCount(page.locator('.kch-master-shell input[type="search"]'))).toBe(1);

  const nav=page.locator('#kch-v134-nav');
  if(viewport.width>=700){
    await expect(nav).toBeVisible();
    expect(await visibleCount(page.locator('#kch-v134-nav'))).toBe(1);
    const first=nav.locator('button').first();await expect(first).toBeVisible();expect(await px(first)).toBeGreaterThanOrEqual(viewport.width>=1100?16:15);expect((await box(first)).height).toBeGreaterThanOrEqual(48);
    const account=header.locator('[data-v134-go="account"]');await expect(account).toBeVisible();expect((await box(account)).height).toBeGreaterThanOrEqual(48);
    const loginText=page.getByText(/เข้าสู่ระบบ\s*\/\s*สมัครสมาชิก/);expect(await visibleCount(loginText)).toBe(1);
  }else{
    await expect(nav).toBeHidden();
    await expect(header.locator('.kch-v134-actions')).toBeHidden();
    const bottomAccount=page.locator('nav.tshop-bottom [data-go="account"],nav.bottom [data-go="account"]').filter({visible:true}).first();
    if(await bottomAccount.count())expect((await box(bottomAccount)).height).toBeGreaterThanOrEqual(44);
  }

  const productName=page.locator('.kch-master-product-copy h3,.kch-master-product-name,.card-info h3,article.card h3').filter({visible:true}).first();
  await expect(productName).toBeVisible();expect(await px(productName)).toBeGreaterThanOrEqual(17);

  const iconTokens=['shopping_cart','person_add','receipt_long','assignment_turned_in','payments','local_shipping','verified_user'];
  const bodyText=await page.locator('body').innerText();for(const token of iconTokens)expect(bodyText).not.toContain(token);

  await page.waitForTimeout(350);
  await expect(header).toBeVisible();
  expect(await visibleCount(page.locator('#kch-v134-header'))).toBe(1);
  expect(await visibleCount(legacyChrome)).toBe(0);
  expect(await visibleCount(page.locator('.kch-master-shell input[type="search"]'))).toBe(1);

  await page.screenshot({path:`preview-screenshots/urgent-structural-${viewport.width}.png`,fullPage:true});
});
