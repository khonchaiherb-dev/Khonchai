PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS staff_session_meta(
  token_hash TEXT PRIMARY KEY,
  session_ref TEXT NOT NULL UNIQUE,
  csrf_token_hash TEXT NOT NULL DEFAULT '',
  device_label TEXT,
  user_agent_hash TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(token_hash) REFERENCES staff_sessions(token_hash) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS approval_executions(
  approval_request_id INTEGER PRIMARY KEY,
  execution_status TEXT NOT NULL DEFAULT 'completed' CHECK(execution_status IN ('completed','reused','failed')),
  executed_by INTEGER,
  detail_json TEXT,
  executed_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(approval_request_id) REFERENCES approval_requests(id) ON DELETE CASCADE,
  FOREIGN KEY(executed_by) REFERENCES staff_users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_staff_session_meta_ref ON staff_session_meta(session_ref);
CREATE INDEX IF NOT EXISTS idx_approval_execution_status ON approval_executions(execution_status,executed_at DESC);
