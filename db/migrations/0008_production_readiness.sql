PRAGMA foreign_keys = ON;

ALTER TABLE products ADD COLUMN barcode TEXT;
ALTER TABLE products ADD COLUMN weight_grams INTEGER NOT NULL DEFAULT 0 CHECK(weight_grams >= 0);
ALTER TABLE products ADD COLUMN seo_title TEXT;
ALTER TABLE products ADD COLUMN seo_description TEXT;

CREATE TABLE IF NOT EXISTS product_variants(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  sku TEXT UNIQUE NOT NULL,
  option_name TEXT NOT NULL DEFAULT 'รูปแบบ',
  option_value TEXT NOT NULL DEFAULT 'มาตรฐาน',
  price REAL NOT NULL CHECK(price >= 0),
  compare_at_price REAL,
  stock INTEGER NOT NULL DEFAULT 0 CHECK(stock >= 0),
  low_stock_threshold INTEGER NOT NULL DEFAULT 5 CHECK(low_stock_threshold >= 0),
  barcode TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS product_media(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  object_key TEXT UNIQUE NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'image' CHECK(media_type IN ('image')),
  alt_text TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_logs(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_type TEXT NOT NULL,
  actor_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  metadata_json TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE inventory_movements ADD COLUMN variant_id INTEGER REFERENCES product_variants(id);

CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants(product_id,active,stock);
CREATE INDEX IF NOT EXISTS idx_product_media_product ON product_media(product_id,active,sort_order,id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type,entity_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_variant ON inventory_movements(variant_id,created_at DESC);

INSERT OR IGNORE INTO product_variants(product_id,sku,option_name,option_value,price,compare_at_price,stock,low_stock_threshold,active)
SELECT id,sku,'รูปแบบ','มาตรฐาน',price,compare_at_price,stock,low_stock_threshold,active
FROM products
WHERE sku IS NOT NULL AND TRIM(sku) <> '';
