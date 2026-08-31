PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS customer_favorites(
  customer_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(customer_id,product_id),
  FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_customer_favorites_customer_updated ON customer_favorites(customer_id,updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_favorites_product ON customer_favorites(product_id,updated_at DESC);
