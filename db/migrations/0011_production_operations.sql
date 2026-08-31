PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS suppliers(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE,
  name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  tax_id TEXT,
  address TEXT,
  lead_time_days INTEGER NOT NULL DEFAULT 7 CHECK(lead_time_days >= 0),
  payment_terms TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE purchase_orders ADD COLUMN supplier_id INTEGER REFERENCES suppliers(id);
ALTER TABLE purchase_orders ADD COLUMN approval_status TEXT NOT NULL DEFAULT 'pending' CHECK(approval_status IN ('pending','approved','rejected'));
ALTER TABLE purchase_orders ADD COLUMN approved_by TEXT;
ALTER TABLE purchase_orders ADD COLUMN approved_at TEXT;
ALTER TABLE purchase_orders ADD COLUMN rejection_note TEXT;

UPDATE purchase_orders
SET approval_status='approved',
    approved_by=COALESCE(approved_by,'migration'),
    approved_at=COALESCE(approved_at,created_at)
WHERE status IN ('ordered','partial','received');

CREATE TABLE IF NOT EXISTS goods_receipts(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  receipt_no TEXT UNIQUE NOT NULL,
  purchase_order_id INTEGER NOT NULL,
  supplier_id INTEGER,
  external_ref TEXT,
  note TEXT,
  received_by TEXT,
  received_at TEXT DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(purchase_order_id) REFERENCES purchase_orders(id),
  FOREIGN KEY(supplier_id) REFERENCES suppliers(id)
);

CREATE TABLE IF NOT EXISTS goods_receipt_items(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  goods_receipt_id INTEGER NOT NULL,
  purchase_order_item_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  variant_id INTEGER,
  qty_received INTEGER NOT NULL CHECK(qty_received > 0),
  unit_cost REAL NOT NULL DEFAULT 0 CHECK(unit_cost >= 0),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(goods_receipt_id) REFERENCES goods_receipts(id) ON DELETE CASCADE,
  FOREIGN KEY(purchase_order_item_id) REFERENCES purchase_order_items(id),
  FOREIGN KEY(product_id) REFERENCES products(id),
  FOREIGN KEY(variant_id) REFERENCES product_variants(id)
);

CREATE TABLE IF NOT EXISTS inventory_lots(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  variant_id INTEGER,
  source_type TEXT NOT NULL DEFAULT 'purchase_order',
  source_ref TEXT NOT NULL,
  qty_received INTEGER NOT NULL CHECK(qty_received > 0),
  qty_remaining INTEGER NOT NULL CHECK(qty_remaining >= 0 AND qty_remaining <= qty_received),
  unit_cost REAL NOT NULL DEFAULT 0 CHECK(unit_cost >= 0),
  received_at TEXT DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(product_id) REFERENCES products(id),
  FOREIGN KEY(variant_id) REFERENCES product_variants(id)
);

CREATE TABLE IF NOT EXISTS picking_waves(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wave_no TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','picking','picked','closed','cancelled')),
  note TEXT,
  created_by TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS picking_wave_orders(
  wave_id INTEGER NOT NULL,
  order_id INTEGER NOT NULL,
  picked_at TEXT,
  PRIMARY KEY(wave_id,order_id),
  FOREIGN KEY(wave_id) REFERENCES picking_waves(id) ON DELETE CASCADE,
  FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notification_outbox(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER,
  customer_id INTEGER,
  channel TEXT NOT NULL DEFAULT 'sms' CHECK(channel IN ('sms','line','email','webhook')),
  template_key TEXT NOT NULL,
  payload_json TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sending','sent','failed','cancelled')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts >= 0),
  next_attempt_at TEXT,
  sent_at TEXT,
  last_error TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY(customer_id) REFERENCES customers(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_supplier_code ON suppliers(code);
CREATE INDEX IF NOT EXISTS idx_supplier_active ON suppliers(active,name);
CREATE INDEX IF NOT EXISTS idx_po_approval ON purchase_orders(approval_status,status,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_goods_receipts_po ON goods_receipts(purchase_order_id,received_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_lots_age ON inventory_lots(qty_remaining,received_at);
CREATE INDEX IF NOT EXISTS idx_picking_wave_status ON picking_waves(status,created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_picking_wave_order_unique ON picking_wave_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_notification_queue ON notification_outbox(status,next_attempt_at,created_at);

CREATE TRIGGER IF NOT EXISTS trg_order_events_notification_outbox
AFTER INSERT ON order_events
FOR EACH ROW
WHEN NEW.event_type IN ('order_created','packing','shipped','delivered','cancelled','shipping_update','return_update')
BEGIN
  INSERT INTO notification_outbox(order_id,customer_id,channel,template_key,payload_json,status)
  SELECT o.id,o.customer_id,'sms',NEW.event_type,
    json_object('orderNo',o.order_no,'eventType',NEW.event_type,'note',COALESCE(NEW.note,'')),
    'pending'
  FROM orders o WHERE o.id=NEW.order_id;
END;
