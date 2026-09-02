import assert from 'node:assert/strict';
import fs from 'node:fs';

const portal=fs.readFileSync('public/seller-center-v2.html','utf8');
const alerts=fs.readFileSync('functions/api/admin/operational-alerts.js','utf8');
const approvals=fs.readFileSync('functions/api/admin/approvals.js','utf8');
const middleware=fs.readFileSync('functions/api/admin/_middleware.js','utf8');
const migration=fs.readFileSync('db/migrations/0020_operational_alert_state.sql','utf8');
const migrationWorkflow=fs.readFileSync('.github/workflows/d1-production-migration.yml','utf8');

// Portal exposes two actionable staff-only work centers while preserving session/CSRF security.
for(const token of ['ศูนย์แจ้งเตือน','ศูนย์อนุมัติ','/api/admin/operational-alerts','/api/admin/approvals','data-alert-action','data-approval-decision','X-KCH-CSRF',"credentials:'same-origin'"]){
  assert.match(portal,new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
}
assert.doesNotMatch(portal,/Admin token/i);
assert.doesNotMatch(portal,/sessionStorage/);
assert.match(portal,/state\.view=view;buildNav\(\);view=state\.view;/);

// Live alerts are generated from operational facts, not fabricated counters.
for(const token of ['fulfillment-stale','settlement-overdue','delivered-uncollected','days_to_expiry','stateReady','acknowledge','assign','resolve','reopen','MANAGE_ROLES','operational_alert.manage']){
  assert.match(alerts,new RegExp(token));
}
assert.match(alerts,/alert_not_current/);
assert.match(alerts,/assigned_staff_not_active/);
assert.match(alerts,/operational_alert_state_not_ready/);
assert.match(alerts,/securityEvent/);

// Alert endpoint is readable by order-reading staff; mutation is restricted again in the endpoint by role.
assert.match(middleware,/name==='operational-alerts'\)return 'orders\.read'/);

// Persistent alert state keeps assignment, acknowledgement and resolution traceability.
for(const token of ['operational_alert_state','alert_key','assigned_to','acknowledged_by','acknowledged_at','resolved_by','resolved_at','first_seen_at','last_seen_at','idx_operational_alert_state_status','idx_operational_alert_state_assigned']){
  assert.match(migration,new RegExp(token));
}

// Existing dual approval remains separated from the requester and executes controlled actions only after threshold is met.
assert.match(approvals,/requester_cannot_approve/);
assert.match(approvals,/approval_decisions/);
assert.match(approvals,/executionStatements/);
assert.match(approvals,/required_approvals/);
assert.match(approvals,/approval_execution_failed/);

// Production migration remains explicit/manual and verifies the new schema before/after execution.
assert.match(migrationWorkflow,/0020_operational_alert_state\.sql/);
assert.match(migrationWorkflow,/APPLY-PRODUCTION-D1/);
assert.match(migrationWorkflow,/Verify production operational alert schema/);

console.log('admin alert + approval smoke: OK');
