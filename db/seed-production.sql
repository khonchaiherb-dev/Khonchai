PRAGMA foreign_keys = ON;

INSERT OR IGNORE INTO product_variants(product_id,sku,option_name,option_value,price,compare_at_price,stock,low_stock_threshold,active)
SELECT id,sku,'รูปแบบ','มาตรฐาน',price,compare_at_price,stock,low_stock_threshold,active
FROM products
WHERE sku IS NOT NULL AND TRIM(sku) <> '';
