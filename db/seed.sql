INSERT OR IGNORE INTO products(id,slug,sku,name,description,category,price,compare_at_price,rating,sold_count,stock,featured,active) VALUES
(1,'rang-jued-tea','KCH-TEA-001','ชารางจืดคัดพิเศษ','ใบคัดคุณภาพ กลิ่นหอม ดื่มง่าย','ชาสมุนไพร',189,259,4.9,1248,86,1,1),
(2,'herbal-balm','KCH-BALM-001','บาล์มสมุนไพรสูตรเข้มข้น','กลิ่นสมุนไพรสดชื่น เนื้อสัมผัสดี','ดูแลร่างกาย',149,199,4.8,938,120,1,1),
(3,'herbal-set','KCH-SET-001','ชุดสมุนไพรดูแลสุขภาพ','รวมสินค้ายอดนิยมในชุดเดียว','ชุดของขวัญ',459,590,4.9,524,42,1,1),
(4,'herbal-drink','KCH-DRINK-001','เครื่องดื่มสมุนไพรสูตรดั้งเดิม','รสกลมกล่อม พกง่าย พร้อมดื่ม','เครื่องดื่ม',99,129,4.7,2201,210,1,1),
(5,'herbal-compress','KCH-COMP-001','ลูกประคบสมุนไพร','สมุนไพรคัดสรร กลิ่นธรรมชาติ','ดูแลร่างกาย',129,169,4.8,781,64,0,1),
(6,'herbal-gift','KCH-GIFT-001','กล่องของขวัญ KHONCHAIHERB','ของขวัญสุขภาพภาพลักษณ์พรีเมียม','ชุดของขวัญ',699,850,5.0,194,25,1,1);

INSERT OR IGNORE INTO coupons(code,type,value,min_spend,max_discount,new_customer_only,usage_limit,active) VALUES
('WELCOME50','fixed',50,499,50,1,10000,1),
('HERB10','percent',10,799,120,0,5000,1);
