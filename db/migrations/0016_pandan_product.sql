PRAGMA foreign_keys = ON;

INSERT OR IGNORE INTO products(
  id,slug,sku,name,description,category,price,compare_at_price,rating,sold_count,stock,low_stock_threshold,featured,active,weight_grams,seo_title,seo_description
) VALUES (
  7,'dried-pandan-leaves','KCH-PANDAN-001','ใบเตยหอมอบแห้ง','ใบเตยหอมอบแห้งสำหรับชงดื่ม ทำขนม ทำน้ำใบเตย และใช้ประกอบเมนูต่าง ๆ','สมุนไพรอบแห้ง',0,NULL,0,0,0,5,1,0,0,
  'ใบเตยหอมอบแห้ง | คุณชายสมุนไพร','ใบเตยหอมอบแห้ง คุณชายสมุนไพร สำหรับชงดื่ม ทำขนม ทำน้ำใบเตย และใช้ประกอบเมนูต่าง ๆ'
);

INSERT OR IGNORE INTO product_variants(
  product_id,sku,option_name,option_value,price,compare_at_price,stock,low_stock_threshold,active
)
SELECT id,'KCH-PANDAN-001-STD','รูปแบบ','มาตรฐาน',0,NULL,0,5,0
FROM products WHERE id=7 AND slug='dried-pandan-leaves';
