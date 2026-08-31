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
CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_reservation_line ON stock_reservations(order_id,product_id,IFNULL(variant_id,0));
CREATE INDEX IF NOT EXISTS idx_stock_reservations_active ON stock_reservations(status,product_id,variant_id,created_at);

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
CREATE UNIQUE INDEX IF NOT EXISTS idx_po_item_unique ON purchase_order_items(purchase_order_id,product_id,IFNULL(variant_id,0));
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status,created_at DESC);
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
CREATE INDEX IF NOT EXISTS idx_packing_verification_order ON packing_verifications(order_id,verified_at);
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
  SET cost_unit=CASE WHEN NEW.variant_id IS NOT NULL THEN COALESCE((SELECT cost_price FROM product_variants WHERE id=NEW.variant_id),0) ELSE COALESCE((SELECT cost_price FROM products WHERE id=NEW.product_id),0) END,
      cogs_total=ABS(NEW.qty)*CASE WHEN NEW.variant_id IS NOT NULL THEN COALESCE((SELECT cost_price FROM product_variants WHERE id=NEW.variant_id),0) ELSE COALESCE((SELECT cost_price FROM products WHERE id=NEW.product_id),0) END
  WHERE order_id=(SELECT id FROM orders WHERE order_no=NEW.reference_id)
    AND product_id=NEW.product_id
    AND ((NEW.variant_id IS NULL AND variant_id IS NULL) OR variant_id=NEW.variant_id);
END;

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
UPDATE purchase_orders SET approval_status='approved', approved_by=COALESCE(approved_by,'migration'), approved_at=COALESCE(approved_at,created_at) WHERE status IN ('ordered','partial','received');
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
  SELECT o.id,o.customer_id,'sms',NEW.event_type,json_object('orderNo',o.order_no,'eventType',NEW.event_type,'note',COALESCE(NEW.note,'')),'pending'
  FROM orders o WHERE o.id=NEW.order_id;
END;

CREATE TABLE IF NOT EXISTS staff_users(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK(role IN ('owner','admin','operations','warehouse','finance','support','viewer')),
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  password_iterations INTEGER NOT NULL DEFAULT 180000 CHECK(password_iterations >= 100000),
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  failed_login_count INTEGER NOT NULL DEFAULT 0 CHECK(failed_login_count >= 0),
  locked_until TEXT,
  last_login_at TEXT,
  password_changed_at TEXT DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS staff_sessions(
  token_hash TEXT PRIMARY KEY,
  staff_user_id INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  FOREIGN KEY(staff_user_id) REFERENCES staff_users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS rate_limit_buckets(
  bucket_key TEXT PRIMARY KEY,
  route_scope TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  hits INTEGER NOT NULL DEFAULT 1 CHECK(hits >= 0),
  expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS security_events(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  staff_user_id INTEGER,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK(severity IN ('info','warning','critical')),
  route TEXT,
  method TEXT,
  status_code INTEGER,
  detail_json TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(staff_user_id) REFERENCES staff_users(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS approval_requests(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action_key TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  requested_by INTEGER NOT NULL,
  required_approvals INTEGER NOT NULL DEFAULT 1 CHECK(required_approvals >= 1 AND required_approvals <= 3),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','cancelled')),
  payload_json TEXT,
  requested_at TEXT DEFAULT CURRENT_TIMESTAMP,
  resolved_at TEXT,
  resolution_note TEXT,
  FOREIGN KEY(requested_by) REFERENCES staff_users(id)
);
CREATE TABLE IF NOT EXISTS approval_decisions(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  approval_request_id INTEGER NOT NULL,
  staff_user_id INTEGER NOT NULL,
  decision TEXT NOT NULL CHECK(decision IN ('approved','rejected')),
  note TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(approval_request_id,staff_user_id),
  FOREIGN KEY(approval_request_id) REFERENCES approval_requests(id) ON DELETE CASCADE,
  FOREIGN KEY(staff_user_id) REFERENCES staff_users(id)
);
CREATE TABLE IF NOT EXISTS backup_snapshots(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  snapshot_no TEXT UNIQUE NOT NULL,
  schema_version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'verified' CHECK(status IN ('verified','warning','failed')),
  manifest_json TEXT NOT NULL,
  created_by TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_staff_active_role ON staff_users(active,role,username);
CREATE INDEX IF NOT EXISTS idx_staff_sessions_user ON staff_sessions(staff_user_id,expires_at,revoked_at);
CREATE INDEX IF NOT EXISTS idx_rate_limit_expiry ON rate_limit_buckets(expires_at);
CREATE INDEX IF NOT EXISTS idx_security_events_created ON security_events(created_at DESC,severity);
CREATE INDEX IF NOT EXISTS idx_approval_status ON approval_requests(status,requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_approval_entity ON approval_requests(action_key,entity_type,entity_id);