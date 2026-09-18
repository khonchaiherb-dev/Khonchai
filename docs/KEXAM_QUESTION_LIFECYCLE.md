# K-EXAM Question Lifecycle

มาตรฐานสถานะข้อสอบราย Question ID สำหรับคลังข้อสอบ K-EXAM

## 1. วัตถุประสงค์
แยกวงจรการจัดทำข้อสอบออกจากข้อความข้อสอบโดยตรง เพื่อให้สามารถพักข้อ แก้ไข ตรวจทาน และเผยแพร่ได้โดยไม่ต้องลบ Question ID หรือทำลายประวัติผลการใช้งานเดิม

## 2. สถานะหลัก
1. **Draft** — ร่างข้อสอบ ยังไม่อนุญาตให้แสดงต่อผู้ทำข้อสอบ
2. **Reviewed** — ผ่านการตรวจทานรูปแบบ ภาษา ตัวเลือก และเหตุผลเบื้องต้นแล้ว แต่ยังไม่พร้อมเผยแพร่
3. **Verified** — ผ่าน QA ตามมาตรฐานที่กำหนด และพร้อมเข้าสู่ขั้นเผยแพร่
4. **Published** — อนุญาตให้ Runtime นำข้อเข้าสู่ชุดข้อสอบ ชุดสุ่ม และชุดฝึกเฉพาะบุคคล
5. **Retired** — ถอนออกจากการใช้งานจริง แต่คง Question ID และประวัติทางสถิติไว้

Question ID หนึ่งรายการต้องอยู่ในสถานะหลักได้เพียงสถานะเดียวในเวลาเดียวกัน

## 3. Publication Manifest
ไฟล์ `tax-exam/question-publication-manifest.json` เป็นแหล่งควบคุมสถานะการเผยแพร่

Runtime ต้องโหลดเฉพาะ Question ID ที่อยู่ใน `published_ids` และมีนโยบาย QA ของ Published เป็น `verified`

การมีข้ออยู่ในไฟล์คลังเพียงอย่างเดียวไม่ทำให้ข้อดังกล่าวขึ้นเว็บได้

## 4. QA Verification กับ Source Verification
สถานะทั้งสองส่วนต้องแยกจากกัน

- `qa_state = verified` หมายถึง ผ่าน Gate ด้านโครงสร้าง รูปแบบ ความสมบูรณ์ และเงื่อนไข QA ที่ระบบตรวจได้
- `source_state = pending` หมายถึง ยังไม่ได้ผูกหลักฐานแหล่งอ้างอิงทางการรายข้อ
- `source_state = verified` หมายถึง มีแหล่งอ้างอิงที่ตรวจสอบได้ พร้อมวันที่ตรวจ
- `source_state = not-applicable` ใช้เฉพาะกรณีที่ข้อไม่มีข้อเท็จจริงภายนอกที่ต้องอ้างอิง และต้องใช้ด้วยความระมัดระวัง

ห้ามตีความ `Published` หรือ `qa_state = verified` ว่าเท่ากับการยืนยันความถูกต้องทางกฎหมายจากแหล่งทางการรายข้อ

## 5. Source Reference
เมื่อกำหนด `source_state = verified` ต้องมี `source_refs` อย่างน้อย 1 รายการ และแต่ละรายการต้องประกอบด้วย

- `title` ชื่อแหล่งอ้างอิง
- `url` ตำแหน่งแหล่งข้อมูล
- `checked_at` วันที่ตรวจในรูปแบบ YYYY-MM-DD
- `section` หรือรายละเอียดมาตรา/หัวข้อ สามารถเพิ่มได้เมื่อเกี่ยวข้อง

แหล่งอ้างอิงควรใช้ลำดับความน่าเชื่อถือดังนี้: กฎหมาย/พระราชกฤษฎีกา/กฎกระทรวง/ประกาศทางการ/กรมสรรพากร → แหล่งราชการรอง → ตำราหรือคำอธิบายที่เชื่อถือได้

## 6. กฎการเผยแพร่
- Draft, Reviewed, Verified และ Retired ห้ามถูกโหลดเข้า Runtime
- Published ต้องมี `qa_state = verified`
- Question ID ใน lifecycle ต้องตรงกับข้อที่มีอยู่ในคลัง
- Question ID ต้องไม่อยู่มากกว่า 1 สถานะ
- source-verified ID ต้องมี source reference จริง
- Retired ต้องไม่ถูกเลือกใน Fixed, Random, Wrong Practice, Weak Category หรือ Weak Subtopic

## 7. การแก้ไขข้อเดิม
หากแก้สาระสำคัญของโจทย์ ตัวเลือก คำตอบ หรือหลักกฎหมาย ให้ลดสถานะจาก Published ไป Reviewed หรือ Verified ตามระดับการเปลี่ยนแปลง แล้วผ่าน QA และ Content Verification ใหม่ก่อน Published

หากแก้เพียงคำสะกดหรือรูปแบบที่ไม่เปลี่ยนสาระ สามารถคง Question ID เดิมได้ แต่ควรบันทึกวันที่ตรวจล่าสุด

## 8. Legacy Source Backlog
คลังเดิมที่เผยแพร่ก่อนระบบ source metadata สามารถมี `source_state = pending` ได้ชั่วคราว โดยต้องแสดงจำนวน backlog ใน Admin อย่างชัดเจน และทยอยตรวจจากแหล่งทางการ

ห้ามเปลี่ยนสถานะเป็น source verified เพื่อให้ตัวเลขดูดีโดยไม่มีหลักฐานอ้างอิงจริง

## 8.1 Content Integrity Baseline
ไฟล์ `tax-exam/question-content-integrity.json` เก็บ SHA-256 fingerprint ของสาระสำคัญราย Question ID ได้แก่ หมวด คำถาม ตัวเลือก คำตอบ เฉลย และเหตุผลตัวเลือกผิด

กฎการ refresh baseline:
- หาก hash ไม่เปลี่ยน ระบบต้องไม่สร้าง baseline ใหม่โดยไม่จำเป็น
- Question ID ที่ hash เปลี่ยนต้องถูกย้ายออกจาก Published ไปเป็น Reviewed หรือ Verified ก่อน
- หากข้อที่แก้เคยมี `source_state = verified` ต้องลดกลับเป็น `pending` ก่อน refresh และทำ Source Verification ใหม่หลังจากนั้น
- ห้ามเพิ่มหรือลด Question ID ผ่านการ refresh baseline; การเปลี่ยน identity ของข้อสอบต้องจัดการเป็นกระบวนการแยกต่างหาก
- การกด refresh เพียงอย่างเดียวไม่ถือเป็นการอนุมัติเนื้อหา และไม่สามารถข้าม Content Review หรือ Source Verification ได้

## 8.2 Lifecycle Decision Pipeline
การเปลี่ยนสถานะต้องดำเนินการผ่าน `data/kexam-lifecycle-decisions.json` และ workflow `K-EXAM Apply Lifecycle Decisions` เพื่อให้มีประวัติการตัดสินใจและป้องกันการเปลี่ยนสถานะแบบข้ามขั้น

Transition ที่อนุญาต:
- Draft → Reviewed
- Reviewed → Verified
- Verified → Published
- Published → Reviewed
- Reviewed → Retired
- Verified → Retired
- Published → Retired
- Retired → Reviewed

กฎสำคัญ:
- ทุก decision ต้องมี `decision_id` ที่ไม่ซ้ำ, Question ID, สถานะต้นทาง/ปลายทาง, วันที่ตัดสินใจ และเหตุผล
- ระบบเก็บ decision signature ใน manifest เพื่อป้องกัน decision เดิมถูกแก้แล้วนำกลับมาใช้ซ้ำ
- การย้ายไป Verified หรือ Published ต้องมี content SHA-256 ของคลังจริงตรงกับ Content Integrity Baseline
- Published → Reviewed สำหรับข้อที่ source-verified ต้องกำหนด `reset_source_verification = true` เพื่อกลับไปตรวจแหล่งอ้างอิงใหม่ก่อนแก้สาระ
- การ Retire ต้องนำข้อออกจาก source-verified active state แต่คงประวัติ Question ID ไว้
- ห้ามใช้ Lifecycle Decision เพื่อแก้เนื้อหาข้อสอบโดยตรง; การแก้เนื้อหาต้องผ่าน Content Review, Integrity Baseline และ QA ตามลำดับ

## 8.3 Atomic Remediation Transaction

สำหรับการแก้ข้อสอบจำนวนมากในคลังที่กำลังเผยแพร่และต้องคงจำนวนข้อให้ครบตลอดเวลา อนุญาตให้ใช้ workflow `K-EXAM Apply Tax Auditor Remediation` เป็นธุรกรรมแบบ atomic ได้ โดยมีข้อกำหนดดังนี้

- ใช้เฉพาะ record ที่ผ่านการทบทวนใน `data/kexam-tax-auditor-remediation-decisions.json`
- ต้องระบุ `remediation_id` ที่ไม่ซ้ำ, Question ID, SHA-256 เดิมที่คาดไว้, เนื้อหาใหม่, วันที่ตรวจ และเหตุผล
- Question ID ต้องอยู่สถานะ Published และ SHA-256 ก่อนแก้ต้องตรงทั้งคลังจริงและ Content Integrity Baseline
- workflow ถือว่าแต่ละข้อผ่านลำดับภายใน Published → Reviewed → Verified → Published ภายในธุรกรรมเดียว และต้องบันทึกลำดับนี้ใน `remediation_log`
- ห้ามเผยแพร่สถานะกลางของธุรกรรม; bank, content integrity และ publication manifest ต้องถูก commit พร้อมกัน
- ข้อที่เคย `source_state = verified` ต้องกำหนด `reset_source_verification = true` และกลับเป็น pending ก่อนตรวจแหล่งอ้างอิงใหม่
- เนื้อหาใหม่ต้องผ่าน QA ทั้งคลัง รวมถึง 4 ตัวเลือก คำตอบเดียว คำอธิบาย/เหตุผลสัมพันธ์กับตัวเลือก และโจทย์ใหม่ของข้อที่แก้ต้องไม่ซ้ำหลัง normalize
- จำนวน Published ของตำแหน่งต้องไม่ลดลงจาก 1,000 ข้อในผลลัพธ์สุดท้าย
- การใช้ atomic remediation ไม่ใช่ช่องทางข้าม QA, Source Verification หรือการควบคุม Content Integrity

## 9. QA Gate
Workflow `K-EXAM Publication Lifecycle Verify` ต้องตรวจอย่างน้อย
- lifecycle ครบทุก Question ID ในคลัง
- ไม่มี ID ซ้ำข้ามสถานะ
- Published ใช้ QA policy ที่กำหนด
- Retired ไม่ชน Published
- source verified มี source reference ครบ
- Runtime ใช้ Publication Manifest จริง
- Service Worker cache manifest
- Admin แสดง publication/source coverage

## 10. เป้าหมายระยะถัดไป
ทยอยเพิ่ม source reference ให้ข้อกฎหมายและข้อเท็จจริงที่เปลี่ยนแปลงได้ โดยเริ่มจากข้อที่มี risk score สูง รายงานจากผู้ใช้ หรือมีการแก้กฎหมาย/อัตรา/กำหนดเวลาบ่อย
