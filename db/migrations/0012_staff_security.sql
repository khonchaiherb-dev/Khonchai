PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS staff_users(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK(role IN ('owner','admin','operations','warehouse','finance','support','viewer')),
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  password_iterations INTEGER NOT NULL DEFAULT 180000 CHECK(password_iterations >= 100000),
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  failed_login_count INTEGER NOT NULL DEFAULT 0 CHECK(failed_login_count >= 0),
  locked_until TEXT,
  last_login_at TEXT,
  password_changed_at TEXT DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS staff_sessions(
  token_hash TEXT PRIMARY KEY,
  staff_user_id INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  FOREIGN KEY(staff_user_id) REFERENCES staff_users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rate_limit_buckets(
  bucket_key TEXT PRIMARY KEY,
  route_scope TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  hits INTEGER NOT NULL DEFAULT 1 CHECK(hits >= 0),
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS security_events(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  staff_user_id INTEGER,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK(severity IN ('info','warning','critical')),
  route TEXT,
  method TEXT,
  status_code INTEGER,
  detail_json TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(staff_user_id) REFERENCES staff_users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS approval_requests(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action_key TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  requested_by INTEGER NOT NULL,
  required_approvals INTEGER NOT NULL DEFAULT 1 CHECK(required_approvals >= 1 AND required_approvals <= 3),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','cancelled')),
  payload_json TEXT,
  requested_at TEXT DEFAULT CURRENT_TIMESTAMP,
  resolved_at TEXT,
  resolution_note TEXT,
  FOREIGN KEY(requested_by) REFERENCES staff_users(id)
);

CREATE TABLE IF NOT EXISTS approval_decisions(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  approval_request_id INTEGER NOT NULL,
  staff_user_id INTEGER NOT NULL,
  decision TEXT NOT NULL CHECK(decision IN ('approved','rejected')),
  note TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(approval_request_id,staff_user_id),
  FOREIGN KEY(approval_request_id) REFERENCES approval_requests(id) ON DELETE CASCADE,
  FOREIGN KEY(staff_user_id) REFERENCES staff_users(id)
);

CREATE TABLE IF NOT EXISTS backup_snapshots(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  snapshot_no TEXT UNIQUE NOT NULL,
  schema_version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'verified' CHECK(status IN ('verified','warning','failed')),
  manifest_json TEXT NOT NULL,
  created_by TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_staff_active_role ON staff_users(active,role,username);
CREATE INDEX IF NOT EXISTS idx_staff_sessions_user ON staff_sessions(staff_user_id,expires_at,revoked_at);
CREATE INDEX IF NOT EXISTS idx_rate_limit_expiry ON rate_limit_buckets(expires_at);
CREATE INDEX IF NOT EXISTS idx_security_events_created ON security_events(created_at DESC,severity);
CREATE INDEX IF NOT EXISTS idx_approval_status ON approval_requests(status,requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_approval_entity ON approval_requests(action_key,entity_type,entity_id);
