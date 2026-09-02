import assert from 'node:assert/strict';
import fs from 'node:fs';

const adminLib=fs.readFileSync('functions/_lib/admin.js','utf8');
const adminMiddleware=fs.readFileSync('functions/api/admin/_middleware.js','utf8');
const receiving=fs.readFileSync('functions/api/admin/receiving.js','utf8');
const orderAction=fs.readFileSync('functions/api/admin/order-action.js','utf8');
const lotsApi=fs.readFileSync('functions/api/admin/inventory-lots.js','utf8');
const ops=fs.readFileSync('functions/api/admin/ops-monitoring.js','utf8');
const migration=fs.readFileSync('db/migrations/0019_inventory_fefo.sql','utf8');

// Staff Portal must authenticate through the server-side staff session bridge, not an Admin Token.
assert.match(adminLib,/X-KCH-Internal-Admin/);
assert.match(adminLib,/staff-session/);
assert.match(adminLib,/LEGACY_ADMIN_ENABLED/);
assert.match(adminMiddleware,/headers\.delete\('Authorization'\)/);
assert.match(adminMiddleware,/X-KCH-Internal-Admin','staff-session'/);
assert.doesNotMatch(adminMiddleware,/Bearer \$\{env\.ADMIN_TOKEN\}/);
assert.doesNotMatch(adminMiddleware,/admin_bridge_not_configured/);

// Lot traceability and FEFO allocation schema.
for(const token of ['lot_code','manufactured_at','quarantined','quarantine_note','inventory_lot_allocations','idx_inventory_lots_fefo']){
  assert.match(migration,new RegExp(token));
}
assert.match(migration,/opening_balance/);

// Goods receiving must accept traceability dates and lot codes while remaining migration-aware.
assert.match(receiving,/lotCode/);
assert.match(receiving,/manufacturedAt/);
assert.match(receiving,/expiresAt/);
assert.match(receiving,/enhancedLotSchema/);
assert.match(receiving,/manufactured_after_expiry/);

// Shipping must consume eligible lots using FEFO and record per-order lot allocation.
assert.match(orderAction,/fefoReady/);
assert.match(orderAction,/inventory_lot_allocations/);
assert.match(orderAction,/quarantined=0/);
assert.match(orderAction,/date\(expires_at\)>=date\('now'\)/);
assert.match(orderAction,/date\(expires_at\) ASC,received_at ASC,id ASC/);
assert.match(orderAction,/fefo_insufficient_lot_stock/);
assert.match(orderAction,/lotsAllocated/);

// Warehouse operators need explicit lot controls and operational expiry visibility.
assert.match(lotsApi,/update_traceability/);
assert.match(lotsApi,/quarantine/);
assert.match(lotsApi,/expiring30dUnits/);
assert.match(lotsApi,/days_to_expiry/);

// Operations center surfaces real order/COD/expiry exceptions instead of only infrastructure status.
for(const token of ['stale_fulfillment','cod_settlement_overdue','cod_delivered_uncollected','expired_lot_units','expiring_30d_units','approvals_pending','riskLevel','staleOrders','codIssues','expiringLots']){
  assert.match(ops,new RegExp(token));
}

console.log('admin operations FEFO smoke: OK');
