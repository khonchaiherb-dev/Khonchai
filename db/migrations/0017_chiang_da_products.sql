PRAGMA foreign_keys = ON;

-- Staged catalog records. These products remain inactive until price, stock and sale readiness are confirmed.
INSERT OR IGNORE INTO products(
  id,slug,sku,name,description,category,price,compare_at_price,rating,sold_count,stock,low_stock_threshold,featured,active,weight_grams,seo_title,seo_description
) VALUES
(
  8,'chiang-da-tea','KCH-TEA-002','ชาเชียงดา','ชาเชียงดาแบบซองชง บรรจุ 30 ซอง','ชาสมุนไพร',0,NULL,0,0,0,5,0,0,0,
  'ชาเชียงดา 30 ซอง | คุณชายสมุนไพร','ชาเชียงดาแบบซองชง บรรจุ 30 ซอง ตรา คุณชายสมุนไพร'
),
(
  9,'gymnema-capsules-100','KCH-CAP-001','ผักเชียงดาแคปซูล 100 แคปซูล','ผลิตภัณฑ์ผักเชียงดาแบบแคปซูล บรรจุ 100 แคปซูล','แคปซูลสมุนไพร',0,NULL,0,0,0,5,0,0,0,
  'ผักเชียงดาแคปซูล 100 แคปซูล | คุณชายสมุนไพร','ผักเชียงดาแคปซูล บรรจุ 100 แคปซูล ตรา คุณชายสมุนไพร'
);

INSERT OR IGNORE INTO product_variants(
  product_id,sku,option_name,option_value,price,compare_at_price,stock,low_stock_threshold,active
)
SELECT id,'KCH-TEA-002-30','บรรจุ','30 ซอง',0,NULL,0,5,0 FROM products WHERE id=8 AND slug='chiang-da-tea';

INSERT OR IGNORE INTO product_variants(
  product_id,sku,option_name,option_value,price,compare_at_price,stock,low_stock_threshold,active
)
SELECT id,'KCH-CAP-001-100','บรรจุ','100 แคปซูล',0,NULL,0,5,0 FROM products WHERE id=9 AND slug='gymnema-capsules-100';
