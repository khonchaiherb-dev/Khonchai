PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS order_request_registry(
  idempotency_key TEXT PRIMARY KEY,
  request_fingerprint TEXT NOT NULL,
  order_no TEXT UNIQUE,
  reuse_count INTEGER NOT NULL DEFAULT 0 CHECK(reuse_count >= 0),
  conflict_count INTEGER NOT NULL DEFAULT 0 CHECK(conflict_count >= 0),
  first_seen_at TEXT DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS maintenance_runs(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_no TEXT UNIQUE NOT NULL,
  job_key TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('completed','warning','failed')),
  affected_rows INTEGER NOT NULL DEFAULT 0 CHECK(affected_rows >= 0),
  detail_json TEXT,
  run_by TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_integrity_snapshots(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  status TEXT NOT NULL CHECK(status IN ('healthy','warning','critical')),
  score INTEGER NOT NULL CHECK(score >= 0 AND score <= 100),
  anomalies_count INTEGER NOT NULL DEFAULT 0 CHECK(anomalies_count >= 0),
  detail_json TEXT NOT NULL,
  created_by TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_order_request_registry_order ON order_request_registry(order_no);
CREATE INDEX IF NOT EXISTS idx_order_request_registry_last_seen ON order_request_registry(last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_maintenance_runs_job ON maintenance_runs(job_key,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_integrity_snapshots_created ON system_integrity_snapshots(created_at DESC,status);
