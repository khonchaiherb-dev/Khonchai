PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS commerce_sources(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform TEXT NOT NULL,
  shop_code TEXT NOT NULL,
  shop_name TEXT NOT NULL,
  authorization_scope TEXT NOT NULL DEFAULT 'owner_authorized',
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(platform,shop_code)
);

INSERT OR IGNORE INTO commerce_sources(platform,shop_code,shop_name,authorization_scope,active)
VALUES('tiktok_shop','THLCRLWLHR','Koonchaishop','owner_authorized_media_content_reviews',1);

CREATE TABLE IF NOT EXISTS source_assets(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id INTEGER NOT NULL,
  external_id TEXT NOT NULL,
  product_id INTEGER,
  asset_type TEXT NOT NULL CHECK(asset_type IN ('image','video','text')),
  title TEXT,
  caption TEXT,
  source_url TEXT,
  media_url TEXT,
  poster_url TEXT,
  rights_basis TEXT NOT NULL DEFAULT 'owner_authorized',
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','hidden')),
  source_created_at TEXT,
  metadata_json TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(source_id,external_id),
  FOREIGN KEY(source_id) REFERENCES commerce_sources(id) ON DELETE CASCADE,
  FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS source_reviews(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id INTEGER NOT NULL,
  external_id TEXT NOT NULL,
  product_id INTEGER,
  rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
  author_display TEXT,
  review_text TEXT NOT NULL,
  media_json TEXT,
  source_created_at TEXT,
  source_verified INTEGER NOT NULL DEFAULT 0 CHECK(source_verified IN (0,1)),
  verified_on_site INTEGER NOT NULL DEFAULT 0 CHECK(verified_on_site = 0),
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','hidden')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(source_id,external_id),
  FOREIGN KEY(source_id) REFERENCES commerce_sources(id) ON DELETE CASCADE,
  FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS source_product_links(
  source_id INTEGER NOT NULL,
  external_product_id TEXT NOT NULL,
  product_id INTEGER NOT NULL,
  external_title TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(source_id,external_product_id),
  FOREIGN KEY(source_id) REFERENCES commerce_sources(id) ON DELETE CASCADE,
  FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_source_assets_public ON source_assets(source_id,status,product_id,source_created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS idx_source_reviews_public ON source_reviews(source_id,status,product_id,source_created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS idx_source_product_links_product ON source_product_links(product_id,source_id);
