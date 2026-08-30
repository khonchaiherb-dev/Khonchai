PRAGMA foreign_keys = ON;

ALTER TABLE orders ADD COLUMN promotion_code TEXT;

CREATE TABLE IF NOT EXISTS promotions(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('percent','fixed')),
  value REAL NOT NULL CHECK(value >= 0),
  min_spend REAL DEFAULT 0,
  max_discount REAL,
  stack_with_coupon INTEGER DEFAULT 0,
  priority INTEGER DEFAULT 0,
  usage_limit INTEGER,
  used_count INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  starts_at TEXT,
  ends_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS promotion_redemptions(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  promotion_id INTEGER NOT NULL,
  order_id INTEGER NOT NULL,
  customer_id INTEGER,
  discount_amount REAL NOT NULL CHECK(discount_amount >= 0),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(promotion_id) REFERENCES promotions(id),
  FOREIGN KEY(order_id) REFERENCES orders(id),
  FOREIGN KEY(customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS review_media(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  review_id INTEGER,
  order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  object_key TEXT UNIQUE NOT NULL,
  media_type TEXT NOT NULL CHECK(media_type IN ('image','video')),
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(review_id) REFERENCES reviews(id) ON DELETE SET NULL,
  FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY(product_id) REFERENCES products(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_order_product
ON reviews(order_id,product_id) WHERE order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_promotions_active_window
ON promotions(active,starts_at,ends_at,priority);

CREATE INDEX IF NOT EXISTS idx_promotion_redemptions_order
ON promotion_redemptions(order_id);

CREATE INDEX IF NOT EXISTS idx_review_media_review
ON review_media(review_id,status);

CREATE INDEX IF NOT EXISTS idx_reviews_product_created
ON reviews(product_id,created_at);
