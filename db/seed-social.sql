PRAGMA foreign_keys = ON;

INSERT OR IGNORE INTO creators(id,handle,display_name,bio,avatar_url,follower_count,rating,active) VALUES
(1,'khonchaiherb.official','KHONCHAIHERB Official','ร้านทางการและทีมดูแลสินค้า','K',12800,4.9,1),
(2,'khonchaiherb.live','KHONCHAIHERB LIVE','ไลฟ์แนะนำสินค้าและดีลจากร้าน','LIVE',6400,4.9,1),
(3,'khonchaiherb.guide','Herbal Product Guide','คอนเทนต์แนะนำการเลือกผลิตภัณฑ์ของแบรนด์','HG',3900,4.8,1);

INSERT OR IGNORE INTO creator_products(creator_id,product_id,commission_rate,featured) VALUES
(1,1,0,1),(1,3,0,1),(1,6,0,1),
(2,1,0,1),(2,2,0,1),(2,4,0,1),
(3,2,0,1),(3,5,0,1),(3,6,0,1);

INSERT OR IGNORE INTO social_contents(id,creator_id,content_type,title,caption,status,viewer_count,like_count) VALUES
(1,2,'live','LIVE ดีลสมุนไพรขายดี','รวมสินค้าขายดีและคูปองช่วง LIVE','live',1280,940),
(2,1,'video','เลือกชารางจืดให้เหมาะกับคุณ','ดูรายละเอียดสินค้าและดีลจากร้านทางการ','published',18400,2800),
(3,3,'video','บาล์มสมุนไพรและลูกประคบ ต่างกันอย่างไร','เปรียบเทียบรูปแบบสินค้าเพื่อเลือกซื้อได้ง่ายขึ้น','published',9200,1100),
(4,2,'live','LIVE Gift Set & โปรของขวัญ','ดูชุดของขวัญและโปรจากร้าน','scheduled',0,0),
(5,1,'video','จัด Gift Set แบบพรีเมียม','ไอเดียเลือกชุดของขวัญจาก KHONCHAIHERB','published',7600,860);

INSERT OR IGNORE INTO content_products(content_id,product_id,pin_label,sort_order) VALUES
(1,1,'สินค้าหลัก',1),(1,2,'ดีลใน LIVE',2),(1,4,'ขายดี',3),
(2,1,'สินค้าในวิดีโอ',1),
(3,2,'เปรียบเทียบ',1),(3,5,'เปรียบเทียบ',2),
(4,3,'ชุดแนะนำ',1),(4,6,'พรีเมียม',2),
(5,6,'สินค้าในวิดีโอ',1),(5,3,'สินค้าแนะนำ',2);
