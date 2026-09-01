PRAGMA foreign_keys = ON;

ALTER TABLE products ADD COLUMN sale_verified INTEGER NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN sale_verified_at TEXT;
ALTER TABLE products ADD COLUMN sale_verified_by TEXT;

CREATE INDEX IF NOT EXISTS idx_products_sale_ready
ON products(active,sale_verified,featured);

-- Safety first: existing catalog rows remain unverified until price, stock and media are checked in production.
UPDATE products
SET sale_verified=0,
    sale_verified_at=NULL,
    sale_verified_by=NULL;
