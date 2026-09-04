import fs from 'node:fs';
import assert from 'node:assert/strict';

const ui=fs.readFileSync('public/kch-canonical-commerce-ui.js','utf8');
const middleware=fs.readFileSync('functions/_middleware.js','utf8');
const legacy=fs.readFileSync('public/tshop-v118.js','utf8');
const legacyShop=fs.readFileSync('public/tshop-v04.js','utf8');

for(const token of ['/api/products','KCHCommerceIntegrity','canonicalizeHero','canonicalizeHomeFeed','canonicalizeProduct','canonicalizeCart','removeLegacyClaims','removeLegacyHomeMerchandising','data-go="account"','/member.html','data-go="seller"','stopImmediatePropagation','[data-add],[data-buy]','image_url','compare_at_price','state.promise','kch-live-hero-product','kchLiveHeroCount','showcase.replaceChildren()','grid.replaceChildren()','kch-live-product-card','kchCanonicalProductFeed','พร้อมสั่งซื้อ','/product/${encodeURIComponent(slug)}'])assert.ok(ui.includes(token),`canonical commerce UI missing: ${token}`);
for(const claim of ['WELCOME50','คูปองลูกค้าใหม่','ขายแล้ว','แพ็กดี จัดส่งเรียบร้อย'])assert.ok(ui.includes(claim),`legacy claim sanitizer missing: ${claim}`);
assert.ok(ui.includes("location.href='/member.html'"),'account route must use real member center');
assert.ok(!ui.includes("location.href='/seller-center-v2.html'"),'public customer UI must not expose seller center shortcut');
assert.ok(ui.includes('Number(p.available_stock??p.stock)>0'),'hero/feed must require live available stock');
assert.ok(ui.includes('Number(p.price)>0'),'hero/feed must require a live positive price');
assert.ok(ui.includes('clean(p.image_url||p.image)'),'hero/feed must require live product media');
assert.ok(legacy.includes('v118HeroFallback'),'legacy renderer still has fallback and therefore canonical hero override must remain enforced');
assert.ok(legacyShop.includes('ขายแล้ว ${p.sold.toLocaleString'),'legacy shop still contains demo sales copy and therefore canonical home feed override must remain enforced');
assert.ok(legacyShop.includes('TSHOP_LIVE'),'legacy shop still contains static live content and therefore source-aware cleanup must remain enforced');
assert.ok(!ui.includes('V118_LAUNCH_PRODUCTS'),'canonical hero must never depend on legacy launch-preview products');
assert.ok(!ui.includes('p.sold'),'canonical commerce UI must never render legacy sold metrics');
assert.ok(!ui.includes('p.rating'),'canonical commerce UI must never render legacy rating metrics');

const guided=middleware.indexOf('/kch-guided-sales.js?v=2026.09.05');
const canonical=middleware.indexOf('/kch-canonical-commerce-ui.js?v=2026.09.05');
assert.ok(guided>=0&&canonical>guided,'canonical commerce UI must load after guided sales');

console.log('storefront canonical commerce UI smoke: OK');
