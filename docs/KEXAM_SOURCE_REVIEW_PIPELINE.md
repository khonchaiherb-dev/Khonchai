# K-EXAM Source Review Pipeline

ระบบนี้ใช้สำหรับบันทึกผลการตรวจแหล่งอ้างอิงราย Question ID และเชื่อมผลตรวจเข้ากับ Question Lifecycle โดยไม่เปลี่ยนสถานะเป็น `source verified` หากไม่มีหลักฐาน

## ผลการตรวจที่รองรับ

### 1. verified
ใช้เมื่อได้ตรวจข้อเท็จจริง คำตอบ และหลักที่ใช้อ้างอิงกับแหล่งทางการแล้ว

ต้องมี
- `question_id`
- `decision: "verified"`
- `reviewed_at` รูปแบบ YYYY-MM-DD
- `review_note` สรุปสิ่งที่ตรวจ
- `source_refs` อย่างน้อย 1 รายการ

แต่ละ source reference ต้องมี
- `title`
- `url` ต้องเป็น HTTPS
- `checked_at` รูปแบบ YYYY-MM-DD
- `section` เมื่อตรวจจากมาตรา/ข้อ/หัวข้อเฉพาะ

ตัวอย่าง

```json
{
  "question_id": "RA-S01-Q001",
  "decision": "verified",
  "reviewed_at": "2026-09-18",
  "review_note": "ตรวจหลักเกณฑ์และคำตอบกับแหล่งทางการแล้ว",
  "source_refs": [
    {
      "title": "กรมสรรพากร — ชื่อเอกสารหรือหน้าข้อมูล",
      "url": "https://www.rd.go.th/...",
      "checked_at": "2026-09-18",
      "section": "มาตรา/หัวข้อที่เกี่ยวข้อง"
    }
  ]
}
```

### 2. needs_revision
ใช้เมื่อพบว่าข้อต้องแก้ก่อนเผยแพร่ต่อ

Workflow จะ
- ถอน Question ID ออกจาก Published
- ย้ายไป Reviewed
- ลบออกจาก `source_verified_ids`
- คง Question ID และสถิติเดิมไว้
- บันทึกเหตุผลใน `source_overrides`

ต้องมี `review_note` ที่ระบุประเด็นที่ต้องแก้

### 3. retired
ใช้เมื่อข้อไม่ควรใช้ต่อ เช่น กฎหมาย/อัตรา/บริบทเปลี่ยนจนไม่เหมาะกับคลังปัจจุบัน

Workflow จะ
- ถอนออกจากสถานะเดิม
- ย้ายไป Retired
- ลบออกจาก `source_verified_ids`
- บันทึกเหตุผลและวันที่ถอน

## การผูก Source Verification กับเนื้อหาที่ตรวจ

สถานะ `source_state = verified` ต้องผูกกับเนื้อหาฉบับที่ผู้ตรวจใช้พิจารณาจริง ไม่ผูกกับ Question ID เพียงอย่างเดียว

เมื่ออนุมัติ `decision = verified` ระบบต้องบันทึก
- `content_hash_algorithm = sha256`
- `content_sha256` ซึ่งต้องตรงกับ `tax-exam/question-content-integrity.json` ของ Question ID นั้น

หากภายหลังสาระสำคัญของโจทย์ ตัวเลือก คำตอบ เฉลย หรือเหตุผลตัวเลือกผิดเปลี่ยนแปลง ต้องลด `source_state` กลับเป็น `pending` และดำเนินการ Source Verification ใหม่หลัง Content Review/QA เสร็จแล้ว

เมื่อมี decision เป็น `needs_revision` หรือ `retired` ระบบต้องล้าง content hash binding เดิม เพื่อป้องกันการตีความว่าแหล่งอ้างอิงเดิมยังยืนยันเนื้อหาฉบับใหม่อยู่


## หลักความปลอดภัย

- Question ID หนึ่งรายการมีคำตัดสินได้ครั้งละหนึ่งรายการในไฟล์
- `verified` ต้องมี source reference จริง
- URL ต้องเป็น HTTPS
- วันที่ตรวจต้องไม่อยู่ในอนาคต
- ID ต้องมีอยู่ใน Publication Manifest และคลังจริง
- `needs_revision` และ `retired` จะไม่คงอยู่ใน Published
- Workflow ต้องผ่าน Publication Lifecycle Verify หลังปรับ Manifest
- ห้ามใช้คำตัดสิน `verified` เพียงเพื่อให้ตัวเลข backlog ลดลง


## Source Freshness / Re-verification

การยืนยันแหล่งอ้างอิงไม่ใช่สถานะถาวรตลอดไป ระบบจึงมีคิวทบทวนซ้ำจากไฟล์ `tax-exam/source-reverification-watchlist.json`

หลักเกณฑ์รอบทบทวนเป็นการจัดคิวเชิงบริหาร ไม่ใช่ข้อสรุปว่าข้อสอบผิด:
- ข้อมูลที่เปลี่ยนแปลงเร็ว เช่น สถานการณ์ เศรษฐกิจ อัตราแลกเปลี่ยน หรือข้อความที่อ้างว่า “ปัจจุบัน/ล่าสุด” ใช้รอบทบทวน 90 วัน
- อัตรา เกณฑ์ จำนวนเงิน กำหนดเวลา การจดทะเบียน เบี้ยปรับ เงินเพิ่ม และข้อยกเว้น ใช้รอบทบทวน 180 วัน
- กฎหมายและหลักเกณฑ์ทั่วไป ใช้รอบทบทวน 365 วัน

สถานะใน watchlist:
- `ยังสดใหม่` — ยังไม่ใกล้กำหนดทบทวน
- `ใกล้ครบกำหนด` — เหลือไม่เกิน 30 วัน
- `เกินกำหนด` — ควรนำกลับมาตรวจแหล่งทางการอีกครั้ง

การเป็น `เกินกำหนด` ไม่ทำให้ข้อสอบถูก Retired อัตโนมัติ และไม่ถือว่าข้อผิด การเปลี่ยนสถานะข้อสอบต้องผ่านกระบวนการ Content Review/Lifecycle แยกต่างหาก
