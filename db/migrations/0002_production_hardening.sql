PRAGMA foreign_keys = ON;

ALTER TABLE orders ADD COLUMN idempotency_key TEXT;
ALTER TABLE reviews ADD COLUMN admin_replied_at TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_idempotency ON orders(idempotency_key) WHERE idempotency_key IS NOT NULL;

CREATE TRIGGER IF NOT EXISTS trg_products_stock_nonnegative
BEFORE UPDATE OF stock ON products
FOR EACH ROW WHEN NEW.stock < 0
BEGIN
  SELECT RAISE(ABORT,'insufficient_stock');
END;

CREATE TABLE IF NOT EXISTS order_events(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  note TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_order_events_order ON order_events(order_id,id);

CREATE TABLE IF NOT EXISTS store_settings(
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO store_settings(key,value) VALUES
('shipping_fee','45'),
('free_shipping_threshold','699'),
('currency','THB'),
('timezone','Asia/Bangkok');
