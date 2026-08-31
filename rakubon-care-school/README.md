# โรงเรียนรักษ์อุบลการบริบาล
## RUKUBON HEALTHCARE SCHOOL

เว็บไซต์ประชาสัมพันธ์และรับข้อมูลผู้สนใจหลักสูตรผู้ช่วยการพยาบาล ออกแบบสำหรับ Cloudflare Pages และรองรับมือถือ

## ข้อมูลหลัก
- ระยะเวลาเรียน: 4–6 เดือน
- สาขาอุบลราชธานี: 39 หมู่ 15 ต.ขามใหญ่ อ.เมือง จ.อุบลราชธานี
- สาขาหาดใหญ่: อาคารจุลดิส พลาซ่า ชั้น 5 สาย 3 ต.หาดใหญ่ อ.หาดใหญ่ จ.สงขลา
- โทร: 088-5807909
- LINE: 0885807909

## สวัสดิการฟรี
- หอพัก
- ชุดเรียน
- ชุดฝึกปฏิบัติงาน
- อุปกรณ์การเรียน
- อุปกรณ์การแพทย์

## Cloudflare Pages settings
- Repository: `khonchaiherb-dev/Khonchai`
- Production branch: `rakubon-care-school`
- Root directory: `rakubon-care-school`
- Framework preset: `None`
- Build command: เว้นว่าง
- Build output directory: `.`

หลังเชื่อม GitHub กับ Cloudflare Pages สำเร็จ การอัปเดตที่ push เข้า branch `rakubon-care-school` สามารถใช้เป็นต้นทางสำหรับ deployment เวอร์ชันใหม่ได้

## Production readiness
- `index.html` หน้าเว็บไซต์หลัก
- `privacy.html` นโยบายความเป็นส่วนตัว
- `_headers` security headers และ cache policy สำหรับ Cloudflare Pages
- `wrangler.toml` การตั้งค่า Cloudflare
- `robots.txt` อนุญาต search engine เข้าถึงเว็บไซต์
- `manifest.webmanifest` metadata สำหรับเว็บแอป
- `404.html` หน้าไม่พบข้อมูล
- `assets/` โลโก้ ภาพโรงเรียน CSS และ JavaScript

> หลังได้ production domain จริง ควรเพิ่ม canonical URL และ sitemap.xml ให้ตรงกับโดเมนที่ใช้งานจริง
