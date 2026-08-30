PRAGMA foreign_keys = ON;

ALTER TABLE customers ADD COLUMN last_login_at TEXT;
ALTER TABLE customers ADD COLUMN updated_at TEXT;
ALTER TABLE addresses ADD COLUMN label TEXT;
ALTER TABLE addresses ADD COLUMN updated_at TEXT;
ALTER TABLE shipments ADD COLUMN provider TEXT;
ALTER TABLE shipments ADD COLUMN provider_ref TEXT;

CREATE TABLE IF NOT EXISTS customer_auth_challenges(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  consumed_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer_sessions(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  token_hash TEXT UNIQUE NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT,
  FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS customer_recent_products(
  customer_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  viewed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(customer_id,product_id),
  FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS creator_commissions(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  creator_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  commission_rate REAL NOT NULL DEFAULT 0 CHECK(commission_rate >= 0 AND commission_rate <= 100),
  base_amount REAL NOT NULL CHECK(base_amount >= 0),
  amount REAL NOT NULL CHECK(amount >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','eligible','paid','void')),
  eligible_at TEXT,
  paid_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(order_id,creator_id,product_id),
  FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY(creator_id) REFERENCES creators(id),
  FOREIGN KEY(product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS shipment_events(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shipment_id INTEGER NOT NULL,
  provider TEXT NOT NULL,
  event_id TEXT NOT NULL,
  event_code TEXT,
  status TEXT NOT NULL,
  note TEXT,
  occurred_at TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(provider,event_id),
  FOREIGN KEY(shipment_id) REFERENCES shipments(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_customer_auth_phone_created ON customer_auth_challenges(phone,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_sessions_token ON customer_sessions(token_hash,expires_at);
CREATE INDEX IF NOT EXISTS idx_customer_sessions_customer ON customer_sessions(customer_id,expires_at);
CREATE INDEX IF NOT EXISTS idx_customer_recent_viewed ON customer_recent_products(customer_id,viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_creator_commissions_creator_status ON creator_commissions(creator_id,status,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_creator_commissions_order ON creator_commissions(order_id);
CREATE INDEX IF NOT EXISTS idx_shipment_events_shipment_time ON shipment_events(shipment_id,occurred_at DESC);
