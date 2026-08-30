PRAGMA foreign_keys = ON;

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
