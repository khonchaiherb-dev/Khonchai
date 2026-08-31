PRAGMA foreign_keys = ON;

ALTER TABLE order_items ADD COLUMN cost_unit REAL NOT NULL DEFAULT 0 CHECK(cost_unit >= 0);
ALTER TABLE order_items ADD COLUMN cogs_total REAL NOT NULL DEFAULT 0 CHECK(cogs_total >= 0);

CREATE TABLE IF NOT EXISTS purchase_orders(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  po_no TEXT UNIQUE NOT NULL,
  supplier_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','ordered','partial','received','cancelled')),
  expected_at TEXT,
  note TEXT,
  created_by TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchase_order_items(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  purchase_order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  variant_id INTEGER,
  sku TEXT,
  qty_ordered INTEGER NOT NULL CHECK(qty_ordered > 0),
  qty_received INTEGER NOT NULL DEFAULT 0 CHECK(qty_received >= 0 AND qty_received <= qty_ordered),
  unit_cost REAL NOT NULL DEFAULT 0 CHECK(unit_cost >= 0),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
  FOREIGN KEY(product_id) REFERENCES products(id),
  FOREIGN KEY(variant_id) REFERENCES product_variants(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_po_item_unique
ON purchase_order_items(purchase_order_id,product_id,IFNULL(variant_id,0));
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status
ON purchase_orders(status,created_at DESC);

CREATE TABLE IF NOT EXISTS packing_verifications(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  order_item_id INTEGER UNIQUE NOT NULL,
  expected_qty INTEGER NOT NULL CHECK(expected_qty > 0),
  verified_qty INTEGER NOT NULL DEFAULT 0 CHECK(verified_qty >= 0 AND verified_qty <= expected_qty),
  last_code TEXT,
  verified_at TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY(order_item_id) REFERENCES order_items(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_packing_verification_order
ON packing_verifications(order_id,verified_at);

CREATE TABLE IF NOT EXISTS return_refund_links(
  return_request_id INTEGER PRIMARY KEY,
  refund_id INTEGER UNIQUE NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(return_request_id) REFERENCES return_requests(id) ON DELETE CASCADE,
  FOREIGN KEY(refund_id) REFERENCES refunds(id) ON DELETE CASCADE
);

CREATE TRIGGER IF NOT EXISTS trg_order_item_cogs_snapshot
AFTER INSERT ON inventory_movements
FOR EACH ROW
WHEN NEW.movement_type='sale' AND NEW.reference_type='order'
BEGIN
  UPDATE order_items
  SET cost_unit=CASE
      WHEN NEW.variant_id IS NOT NULL THEN COALESCE((SELECT cost_price FROM product_variants WHERE id=NEW.variant_id),0)
      ELSE COALESCE((SELECT cost_price FROM products WHERE id=NEW.product_id),0)
    END,
    cogs_total=ABS(NEW.qty)*CASE
      WHEN NEW.variant_id IS NOT NULL THEN COALESCE((SELECT cost_price FROM product_variants WHERE id=NEW.variant_id),0)
      ELSE COALESCE((SELECT cost_price FROM products WHERE id=NEW.product_id),0)
    END
  WHERE order_id=(SELECT id FROM orders WHERE order_no=NEW.reference_id)
    AND product_id=NEW.product_id
    AND ((NEW.variant_id IS NULL AND variant_id IS NULL) OR variant_id=NEW.variant_id);
END;
