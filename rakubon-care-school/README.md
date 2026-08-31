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
- Cloudflare Pages project: `rukubon-healthcare-school`
- Framework preset: `None`
- Build command: เว้นว่าง
- Build output directory: `.`

## Auto Deploy จาก GitHub
Workflow: `.github/workflows/rukubon-cloudflare-pages.yml`

ระบบถูกตั้งให้ทำงานดังนี้:
1. ตรวจว่ามี Cloudflare credentials ครบหรือไม่
2. ติดตั้ง Wrangler
3. ตรวจหา Cloudflare Pages project ชื่อ `rukubon-healthcare-school`
4. หากยังไม่มี project ระบบจะสร้างให้อัตโนมัติ
5. Deploy โฟลเดอร์ `rakubon-care-school` ไปยัง Cloudflare Pages
6. แสดง Deployment URL ใน GitHub Actions Summary

GitHub repository ต้องมี Actions secrets 2 ค่า:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

API Token ควรมีสิทธิ์ที่เพียงพอสำหรับจัดการ Cloudflare Pages ของบัญชีที่ต้องการใช้ deploy เว็บไซต์

### สถานะการทดสอบล่าสุด
GitHub Actions เริ่มทำงานได้แล้ว แต่ deployment ยังหยุดที่ขั้น Cloudflare เพราะ repository ยังไม่ได้รับค่า `CLOUDFLARE_API_TOKEN` และ `CLOUDFLARE_ACCOUNT_ID` จากบัญชี Cloudflare

หลังเพิ่ม secrets ทั้งสองค่าแล้ว สามารถกด Re-run workflow เดิมได้ทันที โดยไม่ต้องแก้โค้ดเว็บไซต์ใหม่

## Production readiness
- `index.html` หน้าเว็บไซต์หลัก
- `privacy.html` นโยบายความเป็นส่วนตัว
- `_headers` security headers และ cache policy สำหรับ Cloudflare Pages
- `wrangler.toml` การตั้งค่า Cloudflare project `rukubon-healthcare-school`
- `robots.txt` อนุญาต search engine เข้าถึงเว็บไซต์
- `manifest.webmanifest` metadata สำหรับเว็บแอป
- `404.html` หน้าไม่พบข้อมูล
- `assets/` โลโก้ ภาพโรงเรียน CSS และ JavaScript
- GitHub Actions auto-deploy สำหรับ Cloudflare Pages

> หลังได้ production domain จริง ควรเพิ่ม canonical URL, Open Graph URL และ sitemap.xml ให้ตรงกับโดเมนที่ใช้งานจริง
