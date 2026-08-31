PRAGMA foreign_keys = ON;

ALTER TABLE products ADD COLUMN reserved_stock INTEGER NOT NULL DEFAULT 0 CHECK(reserved_stock >= 0);
ALTER TABLE products ADD COLUMN cost_price REAL NOT NULL DEFAULT 0 CHECK(cost_price >= 0);
ALTER TABLE product_variants ADD COLUMN reserved_stock INTEGER NOT NULL DEFAULT 0 CHECK(reserved_stock >= 0);
ALTER TABLE product_variants ADD COLUMN cost_price REAL NOT NULL DEFAULT 0 CHECK(cost_price >= 0);
ALTER TABLE order_items ADD COLUMN variant_id INTEGER REFERENCES product_variants(id);

CREATE TRIGGER IF NOT EXISTS trg_products_reserved_valid
BEFORE UPDATE OF stock,reserved_stock ON products
FOR EACH ROW WHEN NEW.reserved_stock < 0 OR NEW.reserved_stock > NEW.stock
BEGIN
  SELECT RAISE(ABORT,'insufficient_available_stock');
END;

CREATE TRIGGER IF NOT EXISTS trg_variants_reserved_valid
BEFORE UPDATE OF stock,reserved_stock ON product_variants
FOR EACH ROW WHEN NEW.reserved_stock < 0 OR NEW.reserved_stock > NEW.stock
BEGIN
  SELECT RAISE(ABORT,'insufficient_available_stock');
END;

CREATE TABLE IF NOT EXISTS stock_reservations(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  variant_id INTEGER,
  qty INTEGER NOT NULL CHECK(qty > 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','committed','released','expired')),
  expires_at TEXT,
  committed_at TEXT,
  released_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY(product_id) REFERENCES products(id),
  FOREIGN KEY(variant_id) REFERENCES product_variants(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_reservation_line
ON stock_reservations(order_id,product_id,IFNULL(variant_id,0));
CREATE INDEX IF NOT EXISTS idx_stock_reservations_active
ON stock_reservations(status,product_id,variant_id,created_at);

CREATE TABLE IF NOT EXISTS fulfillment_batches(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_no TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','picking','packed','closed','cancelled')),
  note TEXT,
  created_by TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fulfillment_batch_orders(
  batch_id INTEGER NOT NULL,
  order_id INTEGER NOT NULL,
  picked_at TEXT,
  packed_at TEXT,
  PRIMARY KEY(batch_id,order_id),
  FOREIGN KEY(batch_id) REFERENCES fulfillment_batches(id) ON DELETE CASCADE,
  FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS cod_reconciliations(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  shipment_id INTEGER,
  provider TEXT NOT NULL,
  provider_ref TEXT NOT NULL,
  gross_amount REAL NOT NULL CHECK(gross_amount >= 0),
  fee_amount REAL NOT NULL DEFAULT 0 CHECK(fee_amount >= 0),
  net_amount REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','matched','exception','settled')),
  note TEXT,
  received_at TEXT DEFAULT CURRENT_TIMESTAMP,
  settled_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(order_id) REFERENCES orders(id),
  FOREIGN KEY(shipment_id) REFERENCES shipments(id),
  UNIQUE(provider,provider_ref)
);

CREATE TABLE IF NOT EXISTS financial_ledger(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entry_date TEXT NOT NULL DEFAULT (date('now')),
  order_id INTEGER,
  refund_id INTEGER,
  entry_type TEXT NOT NULL CHECK(entry_type IN ('cod_collection','cod_fee','refund','cogs','adjustment')),
  amount REAL NOT NULL,
  reference_type TEXT,
  reference_id TEXT,
  description TEXT,
  dedupe_key TEXT UNIQUE,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(order_id) REFERENCES orders(id),
  FOREIGN KEY(refund_id) REFERENCES refunds(id)
);

CREATE TABLE IF NOT EXISTS daily_closings(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  closing_date TEXT UNIQUE NOT NULL,
  orders_count INTEGER NOT NULL DEFAULT 0,
  gross_collected REAL NOT NULL DEFAULT 0,
  cod_fees REAL NOT NULL DEFAULT 0,
  refunds_total REAL NOT NULL DEFAULT 0,
  cogs_total REAL NOT NULL DEFAULT 0,
  net_cash REAL NOT NULL DEFAULT 0,
  gross_profit REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'closed' CHECK(status IN ('closed','reopened')),
  closed_by TEXT,
  closed_at TEXT DEFAULT CURRENT_TIMESTAMP,
  snapshot_json TEXT
);

ALTER TABLE refunds ADD COLUMN provider_ref TEXT;
ALTER TABLE refunds ADD COLUMN updated_at TEXT;

CREATE INDEX IF NOT EXISTS idx_fulfillment_batches_status ON fulfillment_batches(status,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cod_reconciliation_status ON cod_reconciliations(status,received_at DESC);
CREATE INDEX IF NOT EXISTS idx_financial_ledger_date ON financial_ledger(entry_date,entry_type,id);
CREATE INDEX IF NOT EXISTS idx_financial_ledger_order ON financial_ledger(order_id,id);
