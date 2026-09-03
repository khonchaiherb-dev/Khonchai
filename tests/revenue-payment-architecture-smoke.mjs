import fs from 'node:fs';

const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const migration=read('db/migrations/0022_revenue_payment_recovery.sql');
const options=read('functions/api/payment-options.js');
const readiness=read('functions/api/admin/revenue-readiness.js');
const sessionApi=read('functions/api/checkout-session.js');
const recoveryAdmin=read('functions/api/admin/checkout-recovery.js');
const codRiskLib=read('functions/_lib/cod-risk.js');
const codRiskAdmin=read('functions/api/admin/cod-risk.js');
const revenueClient=read('public/kch-revenue-core.js');
const revenuePage=read('public/seller-revenue.html');
const loader=read('public/app-admin-actions.js');

const requiredMigrationMarkers=[
  'CREATE TABLE IF NOT EXISTS payment_attempts',
  'CREATE TABLE IF NOT EXISTS payment_provider_events',
  'CREATE TABLE IF NOT EXISTS checkout_sessions',
  'recovery_allowed INTEGER NOT NULL DEFAULT 0',
  'CREATE TABLE IF NOT EXISTS checkout_recovery_events',
  'CREATE TABLE IF NOT EXISTS cod_risk_assessments'
];
for(const marker of requiredMigrationMarkers){
  if(!migration.includes(marker))throw new Error(`Missing revenue migration contract: ${marker}`);
}

const optionMarkers=[
  'PROMPTPAY_WEBHOOK_SECRET',
  'PAYMENT_GATEWAY_WEBHOOK_SECRET',
  'ONLINE_PAYMENTS_ENABLED',
  "methods:methods.filter(x=>x.enabled)",
  'providerVerifiedBeforeDisplay:true',
  'webhookRequiredForOnlinePayment:true'
];
for(const marker of optionMarkers){
  if(!options.includes(marker))throw new Error(`Payment capability safety gate missing: ${marker}`);
}
if(options.includes("enabled:true,\n      online:true"))throw new Error('Online payment must never be hard-enabled without production configuration.');

const readinessMarkers=[
  "key:'sale_catalog'",
  "key:'shipping_reconciliation'",
  "key:'payment_architecture'",
  "key:'online_payment'",
  "key:'checkout_recovery'",
  "key:'cod_risk'"
];
for(const marker of readinessMarkers){
  if(!readiness.includes(marker))throw new Error(`Revenue readiness check missing: ${marker}`);
}

const sessionMarkers=[
  'const customer=await getCustomer(request,env)',
  'marketing_consent',
  'body.recoveryAllowed===true',
  'customerId&&marketingConsent',
  "action==='complete'",
  'session_owner_mismatch'
];
for(const marker of sessionMarkers){
  if(!sessionApi.includes(marker))throw new Error(`Checkout-session privacy/ownership gate missing: ${marker}`);
}

const recoveryMarkers=[
  "s.recovery_allowed=1 AND c.marketing_consent=1",
  "template_key,payload_json,status",
  "'checkout_recovery'",
  "event_type IN ('queued','sent','converted')",
  'NOTIFICATION_WEBHOOK_URL'
];
for(const marker of recoveryMarkers){
  if(!recoveryAdmin.includes(marker))throw new Error(`Checkout recovery safety/notification contract missing: ${marker}`);
}

const codRiskMarkers=[
  "return level==='high'?'review':'allow'",
  "It intentionally never returns `block`",
  "policyVersion:'v1-advisory'",
  "mode:'advisory'",
  'enforcement:false',
  "action==='review'"
];
for(const marker of codRiskMarkers){
  const haystack=marker.includes('return level')||marker.includes('never returns')||marker.includes('policyVersion')?codRiskLib:codRiskAdmin;
  if(!haystack.includes(marker))throw new Error(`COD risk advisory safety contract missing: ${marker}`);
}
if(/decision\s*=\s*['"]block['"]/.test(codRiskLib)||/return\s+['"]block['"]/.test(codRiskLib))throw new Error('COD risk v1 must remain advisory and must not auto-block orders.');

if(!loader.includes("addScript('/kch-revenue-core.js?v=1.0.0','kch-revenue-core')"))throw new Error('Consolidated revenue client is not loaded by the storefront boot path.');
if(!revenueClient.includes("/api/checkout-session"))throw new Error('Revenue client is not connected to checkout-session API.');
if(!revenueClient.includes("/\\/api\\/orders(?:\\?|$)/"))throw new Error('Revenue client does not mark completed order flow.');
if(/\{id\s*:\s*1\s*,\s*qty\s*:\s*1\}/.test(revenueClient))throw new Error('Revenue client must never invent a fallback product when completing recovery sessions.');
if(!revenueClient.includes("recoveryAllowed:false"))throw new Error('Completed checkout must explicitly disable recovery.');

const pageMarkers=[
  'name="robots" content="noindex,nofollow,noarchive"',
  'Production & Revenue Control Center',
  '/api/admin/revenue-readiness',
  '/api/payment-options',
  '/api/admin/checkout-recovery',
  '/api/admin/cod-risk',
  "'X-KCH-CSRF':state.csrfToken",
  'คะแนนสูงส่งให้คนตรวจ ไม่บล็อกออเดอร์อัตโนมัติ'
];
for(const marker of pageMarkers){
  if(!revenuePage.includes(marker))throw new Error(`Seller revenue control center contract missing: ${marker}`);
}
if(/ADMIN_TOKEN|Authorization:\s*[`'"]Bearer/i.test(revenuePage))throw new Error('Seller revenue page must never expose or collect the legacy admin secret.');

console.log('Revenue/payment architecture smoke passed: truthful payment capability, consent-gated recovery, seller control center, order ownership and advisory COD-risk policy are protected.');
