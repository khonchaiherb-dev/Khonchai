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


## โหมด Source Review Batch

Workflow `K-EXAM Source Review Batch` รองรับ 2 โหมดแยกกันเพื่อไม่ให้การตรวจครั้งแรกปะปนกับการทบทวนแหล่งเดิม

### pending
ใช้สำหรับ Question ID ที่ `source_state = pending` และยังต้องตรวจแหล่งอ้างอิงทางการเป็นครั้งแรก ระบบเลือกตามลำดับความสำคัญจาก `source-verification-backlog.json`

### reverify
ใช้สำหรับ Question ID ที่เคย `source_state = verified` แล้ว แต่สถานะใน `source-reverification-watchlist.json` เป็น `ใกล้ครบกำหนด` หรือ `เกินกำหนด`

Batch แบบ reverify ต้องแสดงข้อมูลเดิมเพื่อให้ตรวจซ้ำได้ ได้แก่
- source reference เดิม
- content SHA-256 ปัจจุบัน
- วันที่ตรวจครั้งก่อน
- วันครบกำหนดทบทวน
- จำนวนวันที่เหลือหรือเกินกำหนด
- รอบทบทวน 90 / 180 / 365 วัน

หากยังไม่มีรายการที่ใกล้หรือเกินกำหนด โหมด reverify ต้องสร้าง artifact ว่างอย่างถูกต้องและไม่ถือเป็นข้อผิดพลาดของระบบ


## การผูกผลตรวจเข้ากับเนื้อหาที่ผู้ตรวจเห็น

Source Review Batch รุ่นใหม่ใส่ `reviewed_content_sha256` ให้แต่ละ Question ID อัตโนมัติจาก `question-content-integrity.json`

สำหรับ decision ใหม่ที่เป็น `verified`:
- ต้องส่ง `reviewed_content_sha256` กลับมาพร้อมผลตรวจ
- hash ต้องเป็น SHA-256 64 ตัวอักษร
- hash ต้องตรงกับ content baseline ปัจจุบันของ Question ID ในขณะ apply
- หากเนื้อหาถูกแก้หลังสร้าง batch ระบบต้องปฏิเสธ decision เดิมและให้สร้าง batch ใหม่เพื่อทบทวนเนื้อหาฉบับปัจจุบัน

decision เก่าที่ถูก apply และผูก `content_sha256` ไว้แล้วก่อนเปิดใช้นโยบายนี้ สามารถผ่านแบบ legacy grandfathering ได้เมื่อข้อมูลใน Manifest ตรงกับผลตรวจเดิม เพื่อไม่ทำลายประวัติการตรวจที่ผ่านมา


## Source Review Batch Registry

ระบบเก็บประวัติชุดตรวจใน `tax-exam/source-review-batch-registry.json` โดยเก็บเฉพาะ metadata ที่ปลอดภัยต่อการเผยแพร่ เช่น

- `batch_id`
- `batch_snapshot_sha256`
- วันที่สร้างและโหมดตรวจ
- จำนวนข้อ
- สรุปการกระจายตำแหน่ง/หัวข้อ
- รายการ Question ID
- สถานะ `generated` หรือ `applied`
- จำนวนผลตรวจเมื่อ apply แล้ว

Registry **ห้าม** เก็บ prompt, choices, คำตอบ, explanation, wrong reasons หรือ source references ของชุดตรวจ

เมื่อ decision ที่มี `batch_id` ถูก apply:
- ต้องพบ batch เดิมใน Registry
- snapshot ต้องตรงกัน
- Question ID ทั้งชุดต้องตรงกับ Registry
- หากสถานะเป็น `generated` ให้เปลี่ยนเป็น `applied` และบันทึก decision counts
- การ apply ซ้ำด้วยข้อมูลเดิมต้องเป็น idempotent
- หาก batch เดิมถูก apply แล้วแต่จำนวน decision ไม่ตรง ต้องหยุดการทำงาน

ไฟล์ review artifact ที่มีคำถามและคำตอบยังคงเป็น private GitHub Actions artifact และไม่ถูกย้ายเข้า Registry


## Batch Reservation

เมื่อ Source Review Batch ถูกสร้างและลงทะเบียนด้วยสถานะ `generated` ระบบจะจอง Question ID ใน batch นั้นเป็นเวลา **30 วัน** ซึ่งสอดคล้องกับอายุของ private GitHub Actions artifact

ระหว่างที่ reservation ยังมีผล:
- batch ใหม่ในโหมดเดียวกันต้องข้าม Question ID ที่ถูกจอง
- ระบบต้องตรวจว่า intersection ระหว่าง batch ใหม่กับ active reservations เท่ากับ 0
- ช่วยป้องกันทีมตรวจได้รับข้อเดิมซ้ำก่อน batch เดิมจะถูก apply

เมื่อ batch ถูก apply สถานะจะเปลี่ยนเป็น `applied` และ backlog/lifecycle จะเป็นตัวกำหนดการปรากฏของ Question ID ต่อไป

หาก batch ไม่ถูก apply และครบ 30 วัน:
- reservation ถือว่าหมดอายุ
- Question ID สามารถกลับมาอยู่ใน batch ใหม่ได้ หากยังคงอยู่ใน Source Verification Backlog
- Registry ยังคงเก็บประวัติ batch เดิมไว้ ไม่ลบย้อนหลัง


## Operational registration vs CI smoke test

การรัน `K-EXAM Source Review Batch` แยกเป็น 2 วัตถุประสงค์:

- **workflow_dispatch** — เป็นการสร้างชุดตรวจสำหรับใช้งานจริง ระบบจึงลงทะเบียน batch ใน Registry และเปิด reservation 30 วัน
- **push ที่เกิดจากการแก้ workflow/code** — ใช้เป็น CI smoke test เท่านั้น สามารถสร้าง private artifact เพื่อตรวจระบบ แต่ **ไม่ลงทะเบียน batch และไม่จอง Question ID**

หลักนี้ป้องกันไม่ให้การพัฒนาระบบหรือแก้ CI ไปจอง Source Verification Backlog โดยที่ทีมตรวจยังไม่ได้ตั้งใจเริ่มงาน

**CI push ไม่จอง Question ID** และไม่ควรเปลี่ยนสถานะ operational ของ Registry


## การปลด Batch Reservation ก่อนครบกำหนด

หาก operational batch ถูกสร้างแล้วแต่ทีมยกเลิกหรือไม่ต้องการดำเนินการต่อ สามารถใช้ workflow `K-EXAM Release Source Review Batch` เพื่อคืน Question ID สู่ backlog ก่อนครบ 30 วัน

ต้องระบุ:
- `batch_id`
- เหตุผลการปลด reservation

ระบบจะ:
- ปฏิเสธการปลด batch ที่ status เป็น `applied`
- บันทึก `reservation_released_at`
- ปรับ `reservation_expires_at` ให้สิ้นสุดทันที
- บันทึก `reservation_release_reason` และ run ID
- คง batch history ไว้ใน Registry ไม่ลบย้อนหลัง

การเรียกซ้ำด้วยเหตุผลเดิมเป็น idempotent แต่หาก batch เดิมถูกปลดด้วยเหตุผลอื่นแล้ว ระบบต้องหยุดเพื่อป้องกันการเขียนประวัติทับกัน
