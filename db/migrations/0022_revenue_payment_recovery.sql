PRAGMA foreign_keys = ON;

-- Revenue / payment architecture. This migration does not enable any payment
-- provider by itself; providers remain gated by production secrets and webhooks.
CREATE TABLE IF NOT EXISTS payment_attempts(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  method TEXT NOT NULL CHECK(method IN ('COD','PROMPTPAY','GATEWAY')),
  provider TEXT,
  provider_intent_ref TEXT,
  amount REAL NOT NULL CHECK(amount >= 0),
  currency TEXT NOT NULL DEFAULT 'THB',
  status TEXT NOT NULL DEFAULT 'initiated' CHECK(status IN ('initiated','pending','paid','failed','cancelled','expired','refunded')),
  failure_code TEXT,
  expires_at TEXT,
  paid_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_attempt_provider_ref
ON payment_attempts(provider,provider_intent_ref)
WHERE provider_intent_ref IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payment_attempt_order_status
ON payment_attempts(order_id,status,created_at DESC);

CREATE TABLE IF NOT EXISTS payment_provider_events(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider TEXT NOT NULL,
  event_id TEXT NOT NULL,
  event_type TEXT,
  provider_intent_ref TEXT,
  order_id INTEGER,
  payload_hash TEXT,
  processed_at TEXT,
  status TEXT NOT NULL DEFAULT 'received' CHECK(status IN ('received','processed','ignored','failed')),
  error_code TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(provider,event_id),
  FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_payment_provider_event_intent
ON payment_provider_events(provider,provider_intent_ref,created_at DESC);

-- Checkout recovery stores commerce state, not raw payment credentials.
CREATE TABLE IF NOT EXISTS checkout_sessions(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_key TEXT UNIQUE NOT NULL,
  customer_id INTEGER,
  source_channel TEXT NOT NULL DEFAULT 'direct',
  cart_fingerprint TEXT NOT NULL,
  cart_json TEXT NOT NULL,
  subtotal REAL NOT NULL DEFAULT 0 CHECK(subtotal >= 0),
  last_step TEXT NOT NULL DEFAULT 'cart' CHECK(last_step IN ('cart','address','payment','review','complete')),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','converted','abandoned','expired')),
  recovery_allowed INTEGER NOT NULL DEFAULT 0 CHECK(recovery_allowed IN (0,1)),
  order_id INTEGER,
  last_activity_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  converted_at TEXT,
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_checkout_session_recovery
ON checkout_sessions(status,recovery_allowed,last_activity_at);
CREATE INDEX IF NOT EXISTS idx_checkout_session_customer
ON checkout_sessions(customer_id,last_activity_at DESC);

CREATE TABLE IF NOT EXISTS checkout_recovery_events(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  checkout_session_id INTEGER NOT NULL,
  event_type TEXT NOT NULL CHECK(event_type IN ('abandoned','queued','sent','opened','resumed','converted','suppressed','expired')),
  channel TEXT CHECK(channel IN ('line','sms','email','webhook')),
  provider_ref TEXT,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(checkout_session_id) REFERENCES checkout_sessions(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_checkout_recovery_session
ON checkout_recovery_events(checkout_session_id,created_at DESC);

-- Deterministic COD risk result. The decision is advisory until enforcement is
-- explicitly enabled, so existing COD checkout behavior is preserved.
CREATE TABLE IF NOT EXISTS cod_risk_assessments(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER UNIQUE NOT NULL,
  score INTEGER NOT NULL DEFAULT 0 CHECK(score BETWEEN 0 AND 100),
  risk_level TEXT NOT NULL DEFAULT 'low' CHECK(risk_level IN ('low','medium','high')),
  decision TEXT NOT NULL DEFAULT 'allow' CHECK(decision IN ('allow','review','block')),
  reasons_json TEXT,
  policy_version TEXT NOT NULL DEFAULT 'v1',
  assessed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_by TEXT,
  reviewed_at TEXT,
  review_note TEXT,
  FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_cod_risk_decision
ON cod_risk_assessments(decision,risk_level,assessed_at DESC);
