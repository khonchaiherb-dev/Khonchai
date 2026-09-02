import {test,expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';

async function mockPreview(page){
  await page.route('https://fonts.googleapis.com/**',route=>route.fulfill({status:200,contentType:'text/css',body:''}));
  await page.route('https://fonts.gstatic.com/**',route=>route.fulfill({status:204,body:''}));
  await page.route('**/api/**',route=>{
    const path=new URL(route.request().url()).pathname;
    const fulfill=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
    if(path==='/api/products')return fulfill({products:[]});
    if(path==='/api/coupons')return fulfill({coupons:[]});
    if(path==='/api/recommendations')return fulfill({products:[]});
    if(path==='/api/social-feed')return fulfill({items:[],contents:[],creators:[]});
    if(path==='/api/health')return fulfill({ok:true,d1:true,version:'1.18.2'});
    if(path.startsWith('/api/customer/'))return fulfill({authenticated:false},401);
    return fulfill({ok:true});
  });
}

async function waitForMaster(page){
  await expect(page.locator('#app')).toBeVisible();
  await expect(page.locator('.shell')).toHaveClass(/kch-master-shell/);
  await expect(page.locator('.kch-master-home')).toBeVisible();
  await expect(page.locator('.kch-master-hero')).toBeVisible();
  await expect(page.locator('.kch-master-products')).toBeVisible();
}

test.beforeEach(async({page})=>{await page.addInitScript(()=>localStorage.clear())});

test('capture current customer-facing storefront without unverified commerce data',async({page},testInfo)=>{
  const pageErrors=[];page.on('pageerror',error=>pageErrors.push(error.message));
  await mockPreview(page);
  await page.goto('/?preview=master',{waitUntil:'domcontentloaded'});
  await waitForMaster(page);

  await expect(page.getByRole('heading',{level:1})).toContainText('KHONCHAIHERB');
  await expect(page.getByRole('heading',{level:1})).toContainText('คุณชายสมุนไพร');
  await expect(page.locator('.kch-master-showcase')).toHaveCount(3);
  await expect(page.locator('.kch-master-product')).toHaveCount(3);
  await expect(page.locator('.kch-master-price')).toHaveCount(0);
  await expect(page.locator('.kch-master-no-price')).toHaveCount(3);

  const bodyText=await page.locator('body').innerText();
  expect(bodyText).not.toContain('ขายแล้ว');
  expect(bodyText).not.toContain('Verified Purchase');
  expect(bodyText).not.toContain('FLASH DEAL');
  expect(bodyText).not.toContain('WELCOME50');
  expect(bodyText).not.toContain('HERB10');
  expect(bodyText).not.toContain('สินค้าขายดี');
  expect(bodyText).not.toContain('088-5807909');
  expect(bodyText).not.toContain('0885807909');
  await expect(page.locator('.rating')).toHaveCount(0);
  await expect(page.locator('.review-promo')).toHaveCount(0);
  await expect(page.locator('.kch-master-newsletter:visible')).toHaveCount(0);

  const jsonLd=page.locator('#kch-store-jsonld');
  await expect(jsonLd).toHaveCount(1);
  const structured=JSON.parse(await jsonLd.textContent());
  expect(JSON.stringify(structured)).not.toContain('aggregateRating');
  expect(JSON.stringify(structured)).not.toContain('reviewRating');

  const metrics=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth}));
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth+1);
  expect(pageErrors).toEqual([]);

  await page.evaluate(async()=>{if(document.fonts?.ready)await document.fonts.ready});
  await page.waitForTimeout(150);
  await mkdir('preview-screenshots',{recursive:true});
  await page.screenshot({path:`preview-screenshots/${testInfo.project.name}-master-home.png`,fullPage:true});
});

test('desktop master storefront remains fluid at common commercial widths',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='desktop-1440','desktop viewport matrix runs once');
  await mockPreview(page);
  const widths=[1024,1280,1440,1920];
  await mkdir('preview-screenshots',{recursive:true});

  for(const width of widths){
    await page.setViewportSize({width,height:Math.round(width*.66)});
    await page.goto(`/?preview=master-${width}`,{waitUntil:'domcontentloaded'});
    await waitForMaster(page);
    const m=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth,hero:document.querySelector('.kch-master-hero')?.getBoundingClientRect().width||0,shell:document.querySelector('.shell')?.getBoundingClientRect().width||0}));
    expect(m.scrollWidth).toBeLessThanOrEqual(width+1);
    expect(m.clientWidth).toBe(width);
    expect(m.shell).toBeLessThanOrEqual(width+1);
    expect(m.hero).toBeGreaterThan(Math.min(760,width*.68));
    if(width===1440)await page.screenshot({path:'preview-screenshots/desktop-1440-master-viewport.png',fullPage:false});
  }
});
