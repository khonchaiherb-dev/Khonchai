import fs from 'node:fs';

const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const migration=read('db/migrations/0022_revenue_payment_recovery.sql');
const options=read('functions/api/payment-options.js');
const readiness=read('functions/api/admin/revenue-readiness.js');

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

console.log('Revenue/payment architecture smoke passed: truthful payment capability, recovery consent gate, COD-risk schema and readiness checks are protected.');
