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

INSERT OR IGNORE INTO products(id,slug,sku,name,description,category,price,compare_at_price,rating,sold_count,stock,featured,active) VALUES
(1,'rang-jued-tea','KCH-TEA-001','ชารางจืดคัดพิเศษ','ใบคัดคุณภาพ กลิ่นหอม ดื่มง่าย','ชาสมุนไพร',189,259,4.9,1248,86,1,1),
(2,'herbal-balm','KCH-BALM-001','บาล์มสมุนไพรสูตรเข้มข้น','กลิ่นสมุนไพรสดชื่น เนื้อสัมผัสดี','ดูแลร่างกาย',149,199,4.8,938,120,1,1),
(3,'herbal-set','KCH-SET-001','ชุดสมุนไพรดูแลสุขภาพ','รวมสินค้ายอดนิยมในชุดเดียว','ชุดของขวัญ',459,590,4.9,524,42,1,1),
(4,'herbal-drink','KCH-DRINK-001','เครื่องดื่มสมุนไพรสูตรดั้งเดิม','รสกลมกล่อม พกง่าย พร้อมดื่ม','เครื่องดื่ม',99,129,4.7,2201,210,1,1),
(5,'herbal-compress','KCH-COMP-001','ลูกประคบสมุนไพร','สมุนไพรคัดสรร กลิ่นธรรมชาติ','ดูแลร่างกาย',129,169,4.8,781,64,0,1),
(6,'herbal-gift','KCH-GIFT-001','กล่องของขวัญ KHONCHAIHERB','ของขวัญสุขภาพภาพลักษณ์พรีเมียม','ชุดของขวัญ',699,850,5.0,194,25,1,1),
(7,'dried-pandan-leaves','KCH-PANDAN-001','ใบเตยหอมอบแห้ง','ใบเตยหอมอบแห้งสำหรับชงดื่ม ทำขนม ทำน้ำใบเตย และใช้ประกอบเมนูต่าง ๆ','สมุนไพรอบแห้ง',0,NULL,0,0,0,1,0);
INSERT OR IGNORE INTO coupons(code,type,value,min_spend,max_discount,new_customer_only,usage_limit,active) VALUES
('WELCOME50','fixed',50,499,50,1,10000,1),
('HERB10','percent',10,799,120,0,5000,1);

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

INSERT OR IGNORE INTO promotions(code,name,type,value,min_spend,max_discount,stack_with_coupon,priority,active) VALUES
('SHOP5','Shop Deal ลดเพิ่ม 5%','percent',5,499,50,1,10,1),
('CART100','ซื้อครบ 1,200 ลด 100','fixed',100,1200,100,0,20,1);
UPDATE social_contents SET starts_at=COALESCE(starts_at,datetime('now','+1 day')) WHERE id=4 AND content_type='live';

INSERT OR IGNORE INTO product_variants(product_id,sku,option_name,option_value,price,compare_at_price,stock,low_stock_threshold,active)
SELECT id,sku,'รูปแบบ','มาตรฐาน',price,compare_at_price,stock,low_stock_threshold,active FROM products WHERE sku IS NOT NULL AND TRIM(sku) <> '';

SELECT
  (SELECT COUNT(*) FROM products) AS products,
  (SELECT COUNT(*) FROM product_variants) AS variants,
  (SELECT COUNT(*) FROM coupons) AS coupons,
  (SELECT COUNT(*) FROM creators) AS creators,
  (SELECT COUNT(*) FROM social_contents) AS social_contents,
  (SELECT COUNT(*) FROM promotions) AS promotions;
