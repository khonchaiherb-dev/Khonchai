import {test,expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';

// Visual preview intentionally mirrors the current production truth: a sparse catalogue
// with one sale-ready product. It must look intentional without inventing filler products.
const products=[
  {id:901,slug:'rang-jued-tea-e2e',sku:'E2E-TEA-901',name:'ชารางจืด 30 ซอง',description:'ผลิตภัณฑ์สำหรับตรวจภาพหน้าเว็บเท่านั้น',category:'ชาสมุนไพร',price:120,stock:5,featured:1,image_url:'/assets/products/rang-jued-tea-360.webp'}
];

async function mockPreview(page){
  await page.route('https://fonts.googleapis.com/**',route=>route.fulfill({status:200,contentType:'text/css',body:''}));
  await page.route('https://fonts.gstatic.com/**',route=>route.fulfill({status:204,body:''}));
  await page.route('**/api/**',route=>{
    const path=new URL(route.request().url()).pathname;
    const fulfill=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
    if(path==='/api/products')return fulfill({products,ready:true,count:products.length});
    if(path==='/api/payment-options')return fulfill({checkoutEnabled:true,capabilities:[{id:'COD',enabled:true}],methods:[{id:'COD',enabled:true}]});
    if(path==='/api/product-detail')return fulfill({product:{...products[0],available_stock:5,variants:[],media:[{url:'/assets/products/rang-jued-tea-360.webp'}]}});
    if(path==='/api/checkout-session')return fulfill({ok:true,sessionKey:'preview-session-000000000000000001',status:'active'});
    return fulfill({ok:true});
  });
}

async function openSellNowPreview(page,url){
  await page.goto(url,{waitUntil:'domcontentloaded'});
  // Browser E2E uses a static file server, while production receives this clean layer
  // from Cloudflare middleware. Load the exact same file here so screenshots verify it.
  await page.addStyleTag({path:'public/storefront-v1-commerce.css'});
}

test.beforeEach(async({page})=>{await page.addInitScript(()=>localStorage.clear())});

test('one-product production-like visual baseline is premium, truthful and bounded',async({page},testInfo)=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await mockPreview(page);
  await openSellNowPreview(page,'/?preview=sell-now-one-product');
  await expect(page.locator('.kch-hero')).toBeVisible();
  await expect(page.locator('.kch-trust')).toBeVisible();
  await expect(page.locator('[data-product-grid] .kch-product-card')).toHaveCount(1);
  await expect(page.locator('#about .kch-story')).toBeVisible();
  await expect(page.locator('#how-to-order .kch-guide')).toBeVisible();

  const bodyText=await page.locator('body').innerText();
  for(const banned of ['FLASH DEAL','Verified Purchase','WELCOME50','HERB10','ขายแล้ว 1','auto_awesome','local_shipping','payments','verified'])expect(bodyText).not.toContain(banned);

  const metrics=await page.evaluate(()=>{
    const grid=document.querySelector('.kch-products');
    const card=document.querySelector('.kch-product-card');
    return {
      scrollWidth:document.documentElement.scrollWidth,
      clientWidth:document.documentElement.clientWidth,
      heroWidth:document.querySelector('.kch-hero')?.getBoundingClientRect().width||0,
      headerWidth:document.querySelector('.kch-header-inner')?.getBoundingClientRect().width||0,
      gridWidth:grid?.getBoundingClientRect().width||0,
      cardWidth:card?.getBoundingClientRect().width||0,
      cardDisplay:card?getComputedStyle(card).display:''
    };
  });
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth+1);
  expect(metrics.heroWidth).toBeGreaterThan(Math.min(340,metrics.clientWidth*.75));
  expect(metrics.headerWidth).toBeLessThanOrEqual(metrics.clientWidth+1);
  expect(metrics.cardWidth).toBeGreaterThan(metrics.gridWidth*.94);
  if((page.viewportSize()?.width||0)>840)expect(metrics.cardDisplay).toBe('grid');
  expect(errors).toEqual([]);

  await mkdir('preview-screenshots',{recursive:true});
  await page.screenshot({path:`preview-screenshots/${testInfo.project.name}-storefront-v1-full.png`,fullPage:true});
  await page.screenshot({path:`preview-screenshots/${testInfo.project.name}-storefront-v1-viewport.png`,fullPage:false});
});

test('desktop one-product sell-now baseline stays bounded at commercial widths',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='desktop-1440','desktop width matrix runs once');
  await mockPreview(page);
  await mkdir('preview-screenshots',{recursive:true});
  for(const width of [1024,1280,1440,1920]){
    await page.setViewportSize({width,height:Math.max(800,Math.round(width*.64))});
    await openSellNowPreview(page,`/?preview=sell-now-one-product-${width}`);
    await expect(page.locator('.kch-hero')).toBeVisible();
    const m=await page.evaluate(()=>({
      scrollWidth:document.documentElement.scrollWidth,
      clientWidth:document.documentElement.clientWidth,
      hero:document.querySelector('.kch-hero')?.getBoundingClientRect().width||0,
      products:document.querySelector('.kch-products')?.getBoundingClientRect().width||0,
      card:document.querySelector('.kch-product-card')?.getBoundingClientRect().width||0
    }));
    expect(m.scrollWidth).toBeLessThanOrEqual(width+1);
    expect(m.clientWidth).toBe(width);
    expect(m.hero).toBeLessThanOrEqual(1282);
    expect(m.products).toBeLessThanOrEqual(982);
    expect(m.card).toBeGreaterThan(m.products*.94);
    if(width===1440)await page.screenshot({path:'preview-screenshots/desktop-1440-storefront-v1.png',fullPage:true});
  }
});
