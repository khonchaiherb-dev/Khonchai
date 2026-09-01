# KHONCHAIHERB Commerce v1.19 — Go-live checklist

## เปิดขายให้เร็วที่สุดโดยไม่เสี่ยงรับออเดอร์ผิด

1. Cloudflare Pages ใช้ production branch `storefront-social-commerce` และ build output `public`.
2. ตรวจว่า D1 binding ชื่อ `DB` เชื่อมกับฐาน `khonchaiherb-commerce` และ apply migrations `0001` ถึง `0017` ตามลำดับ รวมทั้ง seed ที่จำเป็น.
3. ก่อนเปิดรับเงินจริง ให้ตรวจราคาขาย สต็อก รูปสินค้า SKU และ variant ของสินค้าที่จะเปิดขายทุกตัว ห้ามใช้ข้อมูล demo เป็นข้อมูลขายจริง.
4. ตรวจ `/api/health` ให้ `version` เป็น `1.19.0`, `d1=true` และตรวจ production security flags ที่เกี่ยวข้อง.
5. ตั้ง secrets ฝั่ง production ได้แก่ `ADMIN_TOKEN`, `AUTH_PEPPER`, `RATE_LIMIT_PEPPER`, `SHIPPING_WEBHOOK_SECRET` ตามระบบที่เปิดใช้ และห้าม commit secret ลง repository.
6. หากใช้สื่อรีวิว/สื่อสินค้าแบบ R2 ให้ bind `MEDIA_BUCKET` และ `PRODUCT_MEDIA_BUCKET` ให้ถูกต้อง.
7. เปิดขายด้วย COD ได้ก่อน QR/PromptPay แต่ต้องมีขั้นตอนแพ็กสินค้า จัดส่ง ติดตามพัสดุ และกระทบยอด COD ที่ใช้งานได้จริง.
8. QR/PromptPay ต้องคงสถานะปิดจนกว่าจะเชื่อม payment gateway จริงและ signed payment webhook เรียบร้อย.
9. ทดสอบ production แบบ end-to-end อย่างน้อย 1 ออเดอร์: สินค้า → ตะกร้า → Checkout → COD → ออเดอร์เข้าฐานข้อมูล → หลังร้านเห็นออเดอร์ → อัปเดตแพ็ก/จัดส่ง → ลูกค้าติดตามได้ → ยืนยันรับเงิน COD → ออกใบเสร็จ.
10. ตรวจ privacy, terms, shipping/returns, production domain, backup, monitoring, WAF/rate limiting และ alert ก่อนเปิดแคมเปญโฆษณาขนาดใหญ่.
11. ไม่แสดงยอดขาย คะแนน รีวิว LIVE viewers หรือความเร่งด่วนแบบ countdown หากข้อมูลนั้นไม่ได้มาจากข้อมูลจริงที่ตรวจสอบได้.
12. หลัง deploy ให้ทดสอบมือถือจริงอย่างน้อย Android และ iPhone ในหน้า Home, Product, Cart, Checkout และ Order Tracking.
