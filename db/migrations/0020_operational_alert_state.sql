-- KHONCHAIHERB operational alert workflow state
-- This migration is deployment-safe to keep separate from the live alert detector.
-- The Staff Portal can continue reading live alerts before this migration is applied;
-- acknowledge/assignment/resolution becomes persistent after the table exists.

CREATE TABLE IF NOT EXISTS operational_alert_state (
  alert_key TEXT PRIMARY KEY,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info','warning','critical')),
  entity_type TEXT,
  entity_id TEXT,
  title TEXT NOT NULL,
  snapshot_json TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','acknowledged','resolved')),
  assigned_to INTEGER REFERENCES staff_users(id),
  acknowledged_by INTEGER REFERENCES staff_users(id),
  acknowledged_at TEXT,
  resolved_by INTEGER REFERENCES staff_users(id),
  resolved_at TEXT,
  note TEXT,
  first_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_operational_alert_state_status
  ON operational_alert_state(status, severity, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_operational_alert_state_assigned
  ON operational_alert_state(assigned_to, status, updated_at DESC);
