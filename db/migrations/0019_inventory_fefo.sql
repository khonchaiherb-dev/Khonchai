PRAGMA foreign_keys = ON;

ALTER TABLE inventory_lots ADD COLUMN lot_code TEXT;
ALTER TABLE inventory_lots ADD COLUMN manufactured_at TEXT;
ALTER TABLE inventory_lots ADD COLUMN quarantined INTEGER NOT NULL DEFAULT 0 CHECK(quarantined IN (0,1));
ALTER TABLE inventory_lots ADD COLUMN quarantine_note TEXT;
ALTER TABLE inventory_lots ADD COLUMN updated_at TEXT DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS inventory_lot_allocations(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  reservation_id INTEGER NOT NULL,
  inventory_lot_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  variant_id INTEGER,
  qty INTEGER NOT NULL CHECK(qty > 0),
  unit_cost REAL NOT NULL DEFAULT 0 CHECK(unit_cost >= 0),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY(reservation_id) REFERENCES stock_reservations(id),
  FOREIGN KEY(inventory_lot_id) REFERENCES inventory_lots(id),
  FOREIGN KEY(product_id) REFERENCES products(id),
  FOREIGN KEY(variant_id) REFERENCES product_variants(id),
  UNIQUE(reservation_id,inventory_lot_id)
);

CREATE INDEX IF NOT EXISTS idx_inventory_lots_fefo
ON inventory_lots(product_id,IFNULL(variant_id,0),quarantined,qty_remaining,expires_at,received_at,id);
CREATE INDEX IF NOT EXISTS idx_inventory_lots_expiry
ON inventory_lots(quarantined,qty_remaining,expires_at);
CREATE INDEX IF NOT EXISTS idx_inventory_lot_alloc_order
ON inventory_lot_allocations(order_id,product_id,variant_id,id);
CREATE INDEX IF NOT EXISTS idx_inventory_lot_alloc_lot
ON inventory_lot_allocations(inventory_lot_id,id);

INSERT INTO inventory_lots(product_id,variant_id,source_type,source_ref,qty_received,qty_remaining,unit_cost,lot_code)
SELECT p.id,NULL,'opening_balance','migration-0019',
       p.stock-COALESCE((SELECT SUM(l.qty_remaining) FROM inventory_lots l WHERE l.product_id=p.id AND l.variant_id IS NULL),0),
       p.stock-COALESCE((SELECT SUM(l.qty_remaining) FROM inventory_lots l WHERE l.product_id=p.id AND l.variant_id IS NULL),0),
       COALESCE(p.cost_price,0),
       'OPEN-'||p.id
FROM products p
WHERE p.stock>COALESCE((SELECT SUM(l.qty_remaining) FROM inventory_lots l WHERE l.product_id=p.id AND l.variant_id IS NULL),0);

INSERT INTO inventory_lots(product_id,variant_id,source_type,source_ref,qty_received,qty_remaining,unit_cost,lot_code)
SELECT v.product_id,v.id,'opening_balance','migration-0019',
       v.stock-COALESCE((SELECT SUM(l.qty_remaining) FROM inventory_lots l WHERE l.variant_id=v.id),0),
       v.stock-COALESCE((SELECT SUM(l.qty_remaining) FROM inventory_lots l WHERE l.variant_id=v.id),0),
       COALESCE(v.cost_price,0),
       'OPEN-V'||v.id
FROM product_variants v
WHERE v.stock>COALESCE((SELECT SUM(l.qty_remaining) FROM inventory_lots l WHERE l.variant_id=v.id),0);
