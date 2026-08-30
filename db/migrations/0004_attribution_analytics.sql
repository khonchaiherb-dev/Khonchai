PRAGMA foreign_keys = ON;

ALTER TABLE orders ADD COLUMN source_channel TEXT NOT NULL DEFAULT 'direct';
ALTER TABLE orders ADD COLUMN creator_id INTEGER;
ALTER TABLE orders ADD COLUMN content_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_orders_source_created ON orders(source_channel,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_creator_created ON orders(creator_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_content_created ON orders(content_id,created_at DESC);

CREATE TABLE IF NOT EXISTS commerce_events(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  source_channel TEXT NOT NULL DEFAULT 'direct',
  creator_id INTEGER,
  content_id INTEGER,
  product_id INTEGER,
  order_no TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_commerce_events_type_created ON commerce_events(event_type,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_commerce_events_source_created ON commerce_events(source_channel,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_commerce_events_content_created ON commerce_events(content_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_commerce_events_creator_created ON commerce_events(creator_id,created_at DESC);
