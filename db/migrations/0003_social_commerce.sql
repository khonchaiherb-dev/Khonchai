PRAGMA foreign_keys = ON;

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
