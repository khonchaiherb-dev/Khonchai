import {test,expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';

// Customer preview mirrors production sale-readiness: no unverified price, stock,
// rating or sold count is injected into screenshots.
async function mockPreview(page){
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

async function waitForLatestShell(page){
  await expect(page.locator('#app')).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>Boolean(window.__KCH_MEMBER_PERSONALIZATION__))).toBe(true);
  await expect(page.locator('.shell')).toHaveClass(/v118-signature-home/);
  await expect(page.locator('.tshop-hero')).toHaveAttribute('data-v118-signature','1');
  await expect(page.locator('.v118-hero-copy')).toBeVisible();
  await expect(page.locator('.v118-smart-helper')).toBeVisible();
}

test.beforeEach(async({page})=>{await page.addInitScript(()=>localStorage.clear())});

test('capture latest customer-facing storefront without unverified commerce data',async({page},testInfo)=>{
  const pageErrors=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  await mockPreview(page);
  await page.goto('/?preview=latest',{waitUntil:'domcontentloaded'});
  await waitForLatestShell(page);

  await expect(page.locator('.tshop-hero')).toContainText('คุณชายสมุนไพร');
  await expect(page.locator('.tshop-hero')).toContainText('สมุนไพรไทยยุคใหม่');
  await expect(page.locator('.tshop-hero')).toContainText('รองรับเก็บเงินปลายทาง');
  await expect(page.locator('.v118-launch-preview')).toHaveCount(3);
  await expect(page.locator('.v118-hero-showcase')).toContainText('กำลังเตรียมเปิดจำหน่าย');
  await expect(page.locator('.kch-flagship-launch')).toBeVisible();
  await expect(page.locator('.kch-flagship-launch')).toContainText('เตรียมพบสินค้าใหม่จากคุณชายสมุนไพร');
  await expect(page.locator('.kch-flagship-launch')).toContainText('ราคาเร็ว ๆ นี้');

  // Preview must not leak known seed/demo price or social proof into a customer-facing image.
  const bodyText=await page.locator('body').innerText();
  expect(bodyText).not.toContain('฿189');
  expect(bodyText).not.toContain('ขายแล้ว 1,248');
  expect(bodyText).not.toContain('ขายแล้ว 938');
  expect(bodyText).not.toContain('WELCOME50');
  expect(bodyText).not.toContain('HERB10');

  const metrics=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth}));
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth+1);
  expect(pageErrors).toEqual([]);

  await page.evaluate(async()=>{if(document.fonts?.ready)await document.fonts.ready});
  await page.waitForTimeout(300);
  await mkdir('preview-screenshots',{recursive:true});
  await page.screenshot({path:`preview-screenshots/${testInfo.project.name}-latest-home.png`,fullPage:true});
});

test('desktop latest storefront remains fluid at common commercial widths',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='desktop-1440','desktop viewport matrix runs once');
  await mockPreview(page);
  const widths=[1024,1280,1440,1920];
  await mkdir('preview-screenshots',{recursive:true});

  for(const width of widths){
    await page.setViewportSize({width,height:Math.round(width*0.66)});
    await page.goto(`/?preview=latest-${width}`,{waitUntil:'domcontentloaded'});
    await waitForLatestShell(page);
    const m=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth,hero:document.querySelector('.tshop-hero')?.getBoundingClientRect().width||0}));
    expect(m.scrollWidth).toBeLessThanOrEqual(width+1);
    expect(m.clientWidth).toBe(width);
    expect(m.hero).toBeGreaterThan(Math.min(760,width*0.68));
    if(width===1440)await page.screenshot({path:'preview-screenshots/desktop-1440-latest-viewport.png',fullPage:false});
  }
});