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
ALTER TABLE orders ADD COLUMN idempotency_key TEXT;
ALTER TABLE reviews ADD COLUMN admin_replied_at TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_idempotency ON orders(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE TRIGGER IF NOT EXISTS trg_products_stock_nonnegative
BEFORE UPDATE OF stock ON products
FOR EACH ROW WHEN NEW.stock < 0
BEGIN
  SELECT RAISE(ABORT,'insufficient_stock');
END;
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
('shipping_fee','45'),
('free_shipping_threshold','699'),
('currency','THB'),
('timezone','Asia/Bangkok');
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
CREATE INDEX IF NOT EXISTS idx_commerce_events_creator_created ON commerce_events(creator_id,created_at DESC)