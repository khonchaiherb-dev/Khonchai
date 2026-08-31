-- KHONCHAIHERB Commerce v1.6
-- One-shot bootstrap for a FRESH Cloudflare D1 database only.
-- Order mirrors CI: migrations 0001-0014, then seed.sql, seed-social.sql, seed-growth.sql, seed-production.sql.
-- Do not rerun this complete file on an already-initialized database because ALTER TABLE migrations are intentionally one-way.

PRAGMA foreign_keys = ON;

-- 0001_init.sql
CREATE TABLE IF NOT EXISTS products(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  sku TEXT UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  price REAL NOT NULL CHECK(price >= 0),
  compare_at_price REAL,
  rating REAL DEFAULT 5,
  sold_count INTEGER DEFAULT 0,
  stock INTEGER DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 5,
  featured INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE,
  phone TEXT UNIQUE,
  full_name TEXT,
  marketing_consent INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS addresses(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER,
  recipient_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address_line TEXT NOT NULL,
  subdistrict TEXT,
  district TEXT,
  province TEXT,
  postal_code TEXT,
  is_default INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS orders(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_no TEXT UNIQUE NOT NULL,
  customer_id INTEGER,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address_json TEXT NOT NULL,
  subtotal REAL NOT NULL DEFAULT 0,
  discount_total REAL NOT NULL DEFAULT 0,
  shipping_total REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'COD',
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  fulfillment_status TEXT NOT NULL DEFAULT 'pending',
  status TEXT NOT NULL DEFAULT 'pending',
  coupon_code TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS order_items(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  sku TEXT,
  product_name TEXT NOT NULL,
  unit_price REAL NOT NULL,
  qty INTEGER NOT NULL CHECK(qty > 0),
  line_total REAL NOT NULL,
  FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY(product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS payments(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  method TEXT NOT NULL,
  provider TEXT,
  amount REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  provider_ref TEXT,
  paid_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS shipments(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  carrier TEXT,
  tracking_no TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  shipped_at TEXT,
  delivered_at TEXT,
  cod_collected_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS coupons(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  value REAL NOT NULL,
  min_spend REAL DEFAULT 0,
  max_discount REAL,
  new_customer_only INTEGER DEFAULT 0,
  usage_limit INTEGER,
  used_count INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  starts_at TEXT,
  ends_at TEXT
);

CREATE TABLE IF NOT EXISTS coupon_redemptions(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  coupon_id INTEGER NOT NULL,
  order_id INTEGER NOT NULL,
  customer_id INTEGER,
  discount_amount REAL NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(coupon_id) REFERENCES coupons(id),
  FOREIGN KEY(order_id) REFERENCES orders(id),
  FOREIGN KEY(customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS inventory_movements(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  movement_type TEXT NOT NULL,
  qty INTEGER NOT NULL,
  reference_type TEXT,
  reference_id TEXT,
  note TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS reviews(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  order_id INTEGER,
  customer_id INTEGER,
  rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
  body TEXT,
  media_json TEXT,
  verified_purchase INTEGER DEFAULT 0,
  reward_coupon_issued INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(product_id) REFERENCES products(id),
  FOREIGN KEY(order_id) REFERENCES orders(id),
  FOREIGN KEY(customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS refunds(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  amount REAL NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'requested',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  FOREIGN KEY(order_id) REFERENCES orders(id)
);

CREATE TABLE IF NOT EXISTS receipts(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER UNIQUE NOT NULL,
  receipt_no TEXT UNIQUE NOT NULL,
  amount REAL NOT NULL,
  issued_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(order_id) REFERENCES orders(id)
);

CREATE INDEX IF NOT EXISTS idx_products_active_featured ON products(active,featured,sold_count);
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status,created_at);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(phone);
CREATE INDEX IF NOT EXISTS idx_shipments_tracking ON shipments(tracking_no);

-- 0002_production_hardening.sql
ALTER TABLE orders ADD COLUMN idempotency_key TEXT;
ALTER TABLE reviews ADD COLUMN admin_replied_at TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_idempotency ON orders(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE TRIGGER IF NOT EXISTS trg_products_stock_nonnegative BEFORE UPDATE OF stock ON products FOR EACH ROW WHEN NEW.stock < 0 BEGIN SELECT RAISE(ABORT,'insufficient_stock'); END;
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
('shipping_fee','45'),('free_shipping_threshold','699'),('currency','THB'),('timezone','Asia/Bangkok');

-- 0003_social_commerce.sql
CREATE TABLE IF NOT EXISTS creators(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  handle TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  follower_count INTEGER NOT NULL DEFAULT 0 CHECK(follower_count >= 0),
  rating REAL NOT NULL DEFAULT 5 CHECK(rating >= 0 AND rating <= 5),
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS creator_products(
  creator_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  commission_rate REAL NOT NULL DEFAULT 0 CHECK(commission_rate >= 0 AND commission_rate <= 100),
  featured INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(creator_id,product_id),
  FOREIGN KEY(creator_id) REFERENCES creators(id) ON DELETE CASCADE,
  FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS social_contents(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  creator_id INTEGER NOT NULL,
  content_type TEXT NOT NULL CHECK(content_type IN ('video','live')),
  title TEXT NOT NULL,
  caption TEXT,
  media_url TEXT,
  poster_url TEXT,
  status TEXT NOT NULL DEFAULT 'published' CHECK(status IN ('draft','scheduled','published','live','ended','archived')),
  viewer_count INTEGER NOT NULL DEFAULT 0 CHECK(viewer_count >= 0),
  like_count INTEGER NOT NULL DEFAULT 0 CHECK(like_count >= 0),
  starts_at TEXT,
  ended_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(creator_id) REFERENCES creators(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS content_products(
  content_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  pin_label TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(content_id,product_id),
  FOREIGN KEY(content_id) REFERENCES social_contents(id) ON DELETE CASCADE,
  FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_creators_active_followers ON creators(active,follower_count DESC);
CREATE INDEX IF NOT EXISTS idx_social_contents_status_type ON social_contents(status,content_type,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_creator_products_creator ON creator_products(creator_id,featured DESC);
CREATE INDEX IF NOT EXISTS idx_content_products_content ON content_products(content_id,sort_order);

-- 0004_attribution_analytics.sql
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

-- 0005_growth_engine.sql
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
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_order_product ON reviews(order_id,product_id) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_promotions_active_window ON promotions(active,starts_at,ends_at,priority);
CREATE INDEX IF NOT EXISTS idx_promotion_redemptions_order ON promotion_redemptions(order_id);
CREATE INDEX IF NOT EXISTS idx_review_media_review ON review_media(review_id,status);
CREATE INDEX IF NOT EXISTS idx_reviews_product_created ON reviews(product_id,created_at);

-- 0006_customer_platform.sql
ALTER TABLE customers ADD COLUMN last_login_at TEXT;
ALTER TABLE customers ADD COLUMN updated_at TEXT;
ALTER TABLE addresses ADD COLUMN label TEXT;
ALTER TABLE addresses ADD COLUMN updated_at TEXT;
ALTER TABLE shipments ADD COLUMN provider TEXT;
ALTER TABLE shipments ADD COLUMN provider_ref TEXT;
CREATE TABLE IF NOT EXISTS customer_auth_challenges(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  consumed_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS customer_sessions(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  token_hash TEXT UNIQUE NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT,
  FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS customer_recent_products(
  customer_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  viewed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(customer_id,product_id),
  FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS creator_commissions(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  creator_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  commission_rate REAL NOT NULL DEFAULT 0 CHECK(commission_rate >= 0 AND commission_rate <= 100),
  base_amount REAL NOT NULL CHECK(base_amount >= 0),
  amount REAL NOT NULL CHECK(amount >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','eligible','paid','void')),
  eligible_at TEXT,
  paid_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(order_id,creator_id,product_id),
  FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY(creator_id) REFERENCES creators(id),
  FOREIGN KEY(product_id) REFERENCES products(id)
);
CREATE TABLE IF NOT EXISTS shipment_events(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shipment_id INTEGER NOT NULL,
  provider TEXT NOT NULL,
  event_id TEXT NOT NULL,
  event_code TEXT,
  status TEXT NOT NULL,
  note TEXT,
  occurred_at TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(provider,event_id),
  FOREIGN KEY(shipment_id) REFERENCES shipments(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_customer_auth_phone_created ON customer_auth_challenges(phone,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_sessions_token ON customer_sessions(token_hash,expires_at);
CREATE INDEX IF NOT EXISTS idx_customer_sessions_customer ON customer_sessions(customer_id,expires_at);
CREATE INDEX IF NOT EXISTS idx_customer_recent_viewed ON customer_recent_products(customer_id,viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_creator_commissions_creator_status ON creator_commissions(creator_id,status,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_creator_commissions_order ON creator_commissions(order_id);
CREATE INDEX IF NOT EXISTS idx_shipment_events_shipment_time ON shipment_events(shipment_id,occurred_at DESC);

-- 0007_customer_service.sql
ALTER TABLE creator_commissions ADD COLUMN payout_ref TEXT;
ALTER TABLE creator_commissions ADD COLUMN updated_at TEXT;
CREATE TABLE IF NOT EXISTS return_requests(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  customer_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  qty INTEGER NOT NULL DEFAULT 1 CHECK(qty > 0),
  reason_code TEXT NOT NULL CHECK(reason_code IN ('damaged','wrong_item','not_as_described','other')),
  detail TEXT,
  status TEXT NOT NULL DEFAULT 'requested' CHECK(status IN ('requested','reviewing','approved','rejected','cancelled','completed')),
  resolution_note TEXT,
  requested_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT,
  resolved_at TEXT,
  FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY(product_id) REFERENCES products(id)
);
CREATE INDEX IF NOT EXISTS idx_return_requests_customer ON return_requests(customer_id,requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_return_requests_status ON return_requests(status,requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_return_requests_order_product ON return_requests(order_id,product_id,status);

-- 0008_production_readiness.sql
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
SELECT id,sku,'รูปแบบ','มาตรฐาน',price,compare_at_price,stock,low_stock_threshold,active FROM products WHERE sku IS NOT NULL AND TRIM(sku) <> '';

-- 0009_fulfillment_finance.sql
ALTER TABLE products ADD COLUMN reserved_stock INTEGER NOT NULL DEFAULT 0 CHECK(reserved_stock >= 0);
ALTER TABLE products ADD COLUMN cost_price REAL NOT NULL DEFAULT 0 CHECK(cost_price >= 0);
ALTER TABLE product_variants ADD COLUMN reserved_stock INTEGER NOT NULL DEFAULT 0 CHECK(reserved_stock >= 0);
ALTER TABLE product_variants ADD COLUMN cost_price REAL NOT NULL DEFAULT 0 CHECK(cost_price >= 0);
ALTER TABLE order_items ADD COLUMN variant_id INTEGER REFERENCES product_variants(id);
CREATE TRIGGER IF NOT EXISTS trg_products_reserved_valid BEFORE UPDATE OF stock,reserved_stock ON products FOR EACH ROW WHEN NEW.reserved_stock < 0 OR NEW.reserved_stock > NEW.stock BEGIN SELECT RAISE(ABORT,'insufficient_available_stock'); END;
CREATE TRIGGER IF NOT EXISTS trg_variants_reserved_valid BEFORE UPDATE OF stock,reserved_stock ON product_variants FOR EACH ROW WHEN NEW.reserved_stock < 0 OR NEW.reserved_stock > NEW.stock BEGIN SELECT RAISE(ABORT,'insufficient_available_stock'); END;
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

-- 0010_warehouse_customer_experience.sql
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
CREATE TRIGGER IF NOT EXISTS trg_order_item_cogs_snapshot AFTER INSERT ON inventory_movements FOR EACH ROW WHEN NEW.movement_type='sale' AND NEW.reference_type='order' BEGIN
  UPDATE order_items
  SET cost_unit=CASE WHEN NEW.variant_id IS NOT NULL THEN COALESCE((SELECT cost_price FROM product_variants WHERE id=NEW.variant_id),0) ELSE COALESCE((SELECT cost_price FROM products WHERE id=NEW.product_id),0) END,
      cogs_total=ABS(NEW.qty)*CASE WHEN NEW.variant_id IS NOT NULL THEN COALESCE((SELECT cost_price FROM product_variants WHERE id=NEW.variant_id),0) ELSE COALESCE((SELECT cost_price FROM products WHERE id=NEW.product_id),0) END
  WHERE order_id=(SELECT id FROM orders WHERE order_no=NEW.reference_id)
    AND product_id=NEW.product_id
    AND ((NEW.variant_id IS NULL AND variant_id IS NULL) OR variant_id=NEW.variant_id);
END;

-- 0011_production_operations.sql
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
UPDATE purchase_orders SET approval_status='approved',approved_by=COALESCE(approved_by,'migration'),approved_at=COALESCE(approved_at,created_at) WHERE status IN ('ordered','partial','received');
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
CREATE TRIGGER IF NOT EXISTS trg_order_events_notification_outbox AFTER INSERT ON order_events FOR EACH ROW WHEN NEW.event_type IN ('order_created','packing','shipped','delivered','cancelled','shipping_update','return_update') BEGIN
  INSERT INTO notification_outbox(order_id,customer_id,channel,template_key,payload_json,status)
  SELECT o.id,o.customer_id,'sms',NEW.event_type,json_object('orderNo',o.order_no,'eventType',NEW.event_type,'note',COALESCE(NEW.note,'')),'pending' FROM orders o WHERE o.id=NEW.order_id;
END;

-- 0012_staff_security.sql
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

-- 0013_session_launch_hardening.sql
CREATE TABLE IF NOT EXISTS staff_session_meta(
  token_hash TEXT PRIMARY KEY,
  session_ref TEXT NOT NULL UNIQUE,
  csrf_token_hash TEXT NOT NULL DEFAULT '',
  device_label TEXT,
  user_agent_hash TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(token_hash) REFERENCES staff_sessions(token_hash) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS approval_executions(
  approval_request_id INTEGER PRIMARY KEY,
  execution_status TEXT NOT NULL DEFAULT 'completed' CHECK(execution_status IN ('completed','reused','failed')),
  executed_by INTEGER,
  detail_json TEXT,
  executed_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(approval_request_id) REFERENCES approval_requests(id) ON DELETE CASCADE,
  FOREIGN KEY(executed_by) REFERENCES staff_users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_staff_session_meta_ref ON staff_session_meta(session_ref);
CREATE INDEX IF NOT EXISTS idx_approval_execution_status ON approval_executions(execution_status,executed_at DESC);

-- 0014_resilience_recovery.sql
CREATE TABLE IF NOT EXISTS order_request_registry(
  idempotency_key TEXT PRIMARY KEY,
  request_fingerprint TEXT NOT NULL,
  order_no TEXT UNIQUE,
  reuse_count INTEGER NOT NULL DEFAULT 0 CHECK(reuse_count >= 0),
  conflict_count INTEGER NOT NULL DEFAULT 0 CHECK(conflict_count >= 0),
  first_seen_at TEXT DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS maintenance_runs(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_no TEXT UNIQUE NOT NULL,
  job_key TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('completed','warning','failed')),
  affected_rows INTEGER NOT NULL DEFAULT 0 CHECK(affected_rows >= 0),
  detail_json TEXT,
  run_by TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS system_integrity_snapshots(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  status TEXT NOT NULL CHECK(status IN ('healthy','warning','critical')),
  score INTEGER NOT NULL CHECK(score >= 0 AND score <= 100),
  anomalies_count INTEGER NOT NULL DEFAULT 0 CHECK(anomalies_count >= 0),
  detail_json TEXT NOT NULL,
  created_by TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_order_request_registry_order ON order_request_registry(order_no);
CREATE INDEX IF NOT EXISTS idx_order_request_registry_last_seen ON order_request_registry(last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_maintenance_runs_job ON maintenance_runs(job_key,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_integrity_snapshots_created ON system_integrity_snapshots(created_at DESC,status);

-- seed.sql
INSERT OR IGNORE INTO products(id,slug,sku,name,description,category,price,compare_at_price,rating,sold_count,stock,featured,active) VALUES
(1,'rang-jued-tea','KCH-TEA-001','ชารางจืดคัดพิเศษ','ใบคัดคุณภาพ กลิ่นหอม ดื่มง่าย','ชาสมุนไพร',189,259,4.9,1248,86,1,1),
(2,'herbal-balm','KCH-BALM-001','บาล์มสมุนไพรสูตรเข้มข้น','กลิ่นสมุนไพรสดชื่น เนื้อสัมผัสดี','ดูแลร่างกาย',149,199,4.8,938,120,1,1),
(3,'herbal-set','KCH-SET-001','ชุดสมุนไพรดูแลสุขภาพ','รวมสินค้ายอดนิยมในชุดเดียว','ชุดของขวัญ',459,590,4.9,524,42,1,1),
(4,'herbal-drink','KCH-DRINK-001','เครื่องดื่มสมุนไพรสูตรดั้งเดิม','รสกลมกล่อม พกง่าย พร้อมดื่ม','เครื่องดื่ม',99,129,4.7,2201,210,1,1),
(5,'herbal-compress','KCH-COMP-001','ลูกประคบสมุนไพร','สมุนไพรคัดสรร กลิ่นธรรมชาติ','ดูแลร่างกาย',129,169,4.8,781,64,0,1),
(6,'herbal-gift','KCH-GIFT-001','กล่องของขวัญ KHONCHAIHERB','ของขวัญสุขภาพภาพลักษณ์พรีเมียม','ชุดของขวัญ',699,850,5.0,194,25,1,1);
INSERT OR IGNORE INTO coupons(code,type,value,min_spend,max_discount,new_customer_only,usage_limit,active) VALUES
('WELCOME50','fixed',50,499,50,1,10000,1),('HERB10','percent',10,799,120,0,5000,1);

-- seed-social.sql
INSERT OR IGNORE INTO creators(id,handle,display_name,bio,avatar_url,follower_count,rating,active) VALUES
(1,'khonchaiherb.official','KHONCHAIHERB Official','ร้านทางการและทีมดูแลสินค้า','K',12800,4.9,1),
(2,'khonchaiherb.live','KHONCHAIHERB LIVE','ไลฟ์แนะนำสินค้าและดีลจากร้าน','LIVE',6400,4.9,1),
(3,'khonchaiherb.guide','Herbal Product Guide','คอนเทนต์แนะนำการเลือกผลิตภัณฑ์ของแบรนด์','HG',3900,4.8,1);
INSERT OR IGNORE INTO creator_products(creator_id,product_id,commission_rate,featured) VALUES
(1,1,0,1),(1,3,0,1),(1,6,0,1),(2,1,0,1),(2,2,0,1),(2,4,0,1),(3,2,0,1),(3,5,0,1),(3,6,0,1);
INSERT OR IGNORE INTO social_contents(id,creator_id,content_type,title,caption,status,viewer_count,like_count) VALUES
(1,2,'live','LIVE ดีลสมุนไพรขายดี','รวมสินค้าขายดีและคูปองช่วง LIVE','live',1280,940),
(2,1,'video','เลือกชารางจืดให้เหมาะกับคุณ','ดูรายละเอียดสินค้าและดีลจากร้านทางการ','published',18400,2800),
(3,3,'video','บาล์มสมุนไพรและลูกประคบ ต่างกันอย่างไร','เปรียบเทียบรูปแบบสินค้าเพื่อเลือกซื้อได้ง่ายขึ้น','published',9200,1100),
(4,2,'live','LIVE Gift Set & โปรของขวัญ','ดูชุดของขวัญและโปรจากร้าน','scheduled',0,0),
(5,1,'video','จัด Gift Set แบบพรีเมียม','ไอเดียเลือกชุดของขวัญจาก KHONCHAIHERB','published',7600,860);
INSERT OR IGNORE INTO content_products(content_id,product_id,pin_label,sort_order) VALUES
(1,1,'สินค้าหลัก',1),(1,2,'ดีลใน LIVE',2),(1,4,'ขายดี',3),(2,1,'สินค้าในวิดีโอ',1),(3,2,'เปรียบเทียบ',1),(3,5,'เปรียบเทียบ',2),(4,3,'ชุดแนะนำ',1),(4,6,'พรีเมียม',2),(5,6,'สินค้าในวิดีโอ',1),(5,3,'สินค้าแนะนำ',2);

-- seed-growth.sql
INSERT OR IGNORE INTO promotions(code,name,type,value,min_spend,max_discount,stack_with_coupon,priority,active) VALUES
('SHOP5','Shop Deal ลดเพิ่ม 5%','percent',5,499,50,1,10,1),('CART100','ซื้อครบ 1,200 ลด 100','fixed',100,1200,100,0,20,1);
UPDATE social_contents SET starts_at = COALESCE(starts_at, datetime('now','+1 day')) WHERE id=4 AND content_type='live';

-- seed-production.sql
INSERT OR IGNORE INTO product_variants(product_id,sku,option_name,option_value,price,compare_at_price,stock,low_stock_threshold,active)
SELECT id,sku,'รูปแบบ','มาตรฐาน',price,compare_at_price,stock,low_stock_threshold,active FROM products WHERE sku IS NOT NULL AND TRIM(sku) <> '';
