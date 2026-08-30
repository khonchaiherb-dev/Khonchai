PRAGMA foreign_keys = ON;

INSERT OR IGNORE INTO promotions(code,name,type,value,min_spend,max_discount,stack_with_coupon,priority,active)
VALUES
('SHOP5','Shop Deal ลดเพิ่ม 5%','percent',5,499,50,1,10,1),
('CART100','ซื้อครบ 1,200 ลด 100','fixed',100,1200,100,0,20,1);

UPDATE social_contents
SET starts_at = COALESCE(starts_at, datetime('now','+1 day'))
WHERE id=4 AND content_type='live';
