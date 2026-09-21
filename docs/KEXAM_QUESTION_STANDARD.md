# K-EXAM Question Standard

มาตรฐานกลางของคลังข้อสอบ K-EXAM

## Gate 1: Blueprint
- กำหนดหมวดใหญ่ หัวข้อย่อย และระดับการคิดก่อนสร้างข้อสอบ
- ชุดมาตรฐานต้องรักษาสัดส่วนเนื้อหาตามขอบเขตสอบจริง
- ใช้ระดับความยากเป็นข้อมูลหลังบ้าน ไม่แสดงต่อผู้ทำข้อสอบ

## Gate 2: Content Accuracy
- ข้อกฎหมาย ภาษี อัตรา กำหนดเวลา และอำนาจหน้าที่ต้องตรวจจากแหล่งที่เชื่อถือได้
- ข้อคำนวณต้องตรวจฐานคำนวณ หน่วย การปัดเศษ และผลลัพธ์
- เมื่อโครงข้อมูลรองรับ ให้เก็บแหล่งอ้างอิงและวันที่ตรวจสอบล่าสุดรายข้อ

## Gate 3: Question Quality
- 4 ตัวเลือก ก ข ค ง และมีคำตอบที่ถูกชัดเจน
- โจทย์ต้องมีข้อมูลเพียงพอ ไม่กำกวม และหลีกเลี่ยงคำปฏิเสธซ้อน
- คำถามความจำใช้ได้ตามขอบเขตสอบ แต่ต้องมีข้อประยุกต์และข้อวิเคราะห์ร่วมด้วย

## Gate 4: Distractor Quality
- ตัวลวงต้องอยู่ในประเด็นเดียวกับคำตอบจริงและสะท้อนความเข้าใจผิดที่เป็นไปได้
- คำตอบถูกต้องต้องไม่เด่นผิดสังเกตเพราะยาวกว่า ละเอียดกว่า หรือสมบูรณ์กว่าตัวลวง
- ไม่บังคับให้ตัวเลือกยาวเท่ากันทุกตัว แต่ตรวจ outlier ที่เด่นผิดธรรมชาติ

## Gate 5: Distribution and Pattern
- ชุด 100 ข้อให้แต่ละตัวเลือกอยู่ช่วง 22–28 ข้อ
- ห้ามคำตอบตัวเดียวติดกันเกิน 4 ข้อ
- ห้าม pattern ซ้ำเชิงกล
- ห้ามคำถามซ้ำตรงข้อความ และต้องตรวจโครงคำถามที่เปลี่ยนเพียงตัวเลขหรือชื่อ
- กลุ่มโครงคำถามหรือชุดตัวเลือกซ้ำ 9–10 ครั้งเป็น Warning และมากกว่า 10 ครั้งเป็น Fail

## Gate 6: Explanation and Publication
- ทุกข้อมีคำอธิบายคำตอบที่ถูกและเหตุผลตัวเลือกผิด
- เฉลยต้องสัมพันธ์กับโจทย์และตัวเลือกจริง ไม่ใช้ข้อความสำเร็จรูปซ้ำจำนวนมาก
- ก่อนเผยแพร่ต้องผ่าน Blueprint, Content Accuracy, Question Quality, Distractor Quality, Duplicate/Pattern และ Deployment checks
- ใช้ lifecycle บังคับ: Draft → Reviewed → Verified → Published → Retired ตาม `docs/KEXAM_QUESTION_LIFECYCLE.md`
- เฉพาะ Question ID ที่อยู่สถานะ Published และผ่าน QA state จึงอนุญาตให้ Runtime โหลดได้
- แยก QA Verification ออกจาก Source Verification อย่างชัดเจน; Published ไม่ได้หมายความว่ามีแหล่งอ้างอิงทางการรายข้อครบแล้ว

## Post-exam QA
เมื่อมีข้อมูลผู้ใช้จริง ให้ติดตามร้อยละตอบถูก ตัวเลือกที่แทบไม่มีผู้เลือก เวลาเฉลี่ยต่อข้อ และข้อที่มีสถิติผิดปกติ เพื่อนำกลับเข้าคิวตรวจทาน


## Gate 4.1: Answer Conspicuousness
ระบบต้องตรวจว่าคำตอบถูกมีความยาวหรือระดับรายละเอียดเด่นผิดธรรมชาติเมื่อเทียบกับตัวลวงหรือไม่ โดยใช้รายงาน `answer-conspicuousness-audit.json` เป็นสัญญาณ QA เพิ่มเติม

ระดับสัญญาณของ `answer-conspicuousness-v1`
- **Strong** — คำตอบถูกอยู่นอกช่วงความยาวตัวลวงอย่างน้อย 18 ตัวอักษร และมีสัดส่วนต่อมัธยฐานตัวลวงตั้งแต่ 1.55 ขึ้นไป หรือไม่เกิน 0.65
- **Moderate** — อยู่นอกช่วงอย่างน้อย 12 ตัวอักษร และมีสัดส่วนตั้งแต่ 1.35 ขึ้นไป หรือไม่เกิน 0.74
- **Watch** — อยู่นอกช่วงอย่างน้อย 8 ตัวอักษร และมีสัดส่วนตั้งแต่ 1.25 ขึ้นไป หรือไม่เกิน 0.80

สัญญาณดังกล่าวไม่ใช่คำตัดสินว่าข้อสอบผิด แต่ Strong และ Moderate ต้องเข้าสู่คิวตรวจรูปแบบตัวเลือกเป็นลำดับต้น

### หลักการแก้ไข
- ห้ามแก้ด้วยการเติมคำฟุ่มเฟือยให้ตัวลวงยาวขึ้นเพียงเพื่อให้จำนวนตัวอักษรใกล้กัน
- ตัวลวงต้องคงความสมเหตุผล อยู่ในประเด็นเดียวกับคำตอบ และสะท้อนความเข้าใจผิดที่เป็นไปได้
- ไม่จำเป็นต้องทำตัวเลือกทั้ง 4 ให้ยาวเท่ากัน แต่หลังแก้คำตอบถูกต้องต้องไม่เด่นจากระดับรายละเอียด
- หากการแก้เปลี่ยนสาระทางกฎหมาย อัตรา เกณฑ์ กำหนดเวลา หรือคำตอบ ต้องทบทวน Content Accuracy และ Source Verification ใหม่ตามความเสี่ยง
- Question ID เดิมต้องคงอยู่เพื่อรักษาประวัติสถิติรายข้อ

## Gate 4.2: Academic Answer Remediation
คลังนักวิชาการสรรพากรใช้กระบวนการเฉพาะสำหรับการแก้ Answer Conspicuousness ดังนี้

1. `academic-answer-remediation-backlog.json` เป็นคิว public-safe ที่มีเฉพาะ Question ID และสถิติความยาว
2. `K-EXAM Academic Answer Remediation Batch` สร้าง artifact ส่วนตัวสำหรับผู้ตรวจ โดยมีโจทย์ ตัวเลือก คำตอบ และคำอธิบายจริง
3. ผู้ตรวจบันทึกการตัดสินใจลง `data/kexam-academic-answer-remediation-decisions.json`
4. `K-EXAM Apply Academic Answer Remediation` ตรวจ SHA-256 เดิมและ QA ทั้งคลังก่อนทำ atomic update
5. ข้อที่แก้ต้องไม่เหลือระดับ Strong หรือ Moderate ก่อนอนุญาตให้เขียนกลับคลัง
6. ข้อ source-verified ที่ถูกแก้ต้อง reset source verification ก่อน และเข้าสู่คิวตรวจแหล่งอ้างอิงใหม่
7. หลัง apply ต้องสร้าง Answer Conspicuousness Audit และ Remediation Backlog ใหม่เพื่อวัดผลหลังแก้

ห้ามแก้ Published bank โดยตรงนอกกระบวนการนี้

### Batch Reservation และ Atomic Binding
การแก้ Answer Conspicuousness ของคลังนักวิชาการสรรพากรต้องใช้ Batch ที่มีตัวตนชัดเจน

- Private Remediation Batch ต้องสร้าง `batch_id` และ `batch_snapshot_sha256`
- Question ID ใน Batch ต้องถูกจองใน `academic-answer-remediation-batch-registry.json` เป็นเวลา 14 วัน
- Batch ใหม่ต้องข้าม Question ID ที่มี reservation ใช้งานอยู่ มี remediation decision แล้ว หรือเคย apply แล้ว
- Decision ที่จะ Apply ต้องมี Question ID ตรงกับ Batch ที่ลงทะเบียนทั้งชุด และ snapshot ต้องคำนวณจาก Question ID + expected content SHA-256 แล้วตรงกับ Registry
- Batch ที่หมดอายุห้าม Apply ต้องสร้าง Batch ใหม่เพื่อยืนยันว่าเนื้อหาปัจจุบันยังตรงกับรายการตรวจ
- เมื่อ Apply สำเร็จ Registry ต้องเปลี่ยนสถานะเป็น `applied` ในธุรกรรมเดียวกับการอัปเดต bank, Content Integrity และ Publication Manifest
- Registry เป็นข้อมูล public-safe และห้ามเก็บโจทย์ ตัวเลือก คำตอบ คำอธิบาย หรือ source refs ภายใน Registry

### Style-only กับ Substantive Change
การตัดสินใจแก้ต้องระบุ `substantive_change` อย่างชัดเจน

**style-only (`substantive_change=false`)**
- ห้ามเปลี่ยนข้อความโจทย์
- ห้ามเปลี่ยนตำแหน่งคำตอบที่ถูก
- ห้ามเปลี่ยนข้อความคำตอบที่ถูก
- อนุญาตให้ปรับตัวลวงและคำอธิบายเพื่อให้ระดับรายละเอียดสมดุลขึ้น โดยตัวลวงต้องยังสมเหตุผลและอยู่ในประเด็นเดียวกัน
- หลังแก้ต้องไม่เหลือสัญญาณ Strong หรือ Moderate

**substantive change (`substantive_change=true`)**
- ใช้เมื่อโจทย์ คำตอบที่ถูก หลักกฎหมาย อัตรา เกณฑ์ กำหนดเวลา หรือสาระสำคัญเปลี่ยน
- ต้องผ่าน QA ทั้งข้อใหม่และ Content Integrity ใหม่
- หาก Source Risk ตั้งแต่ 70 คะแนนขึ้นไป ต้องมี `source_refs` ที่ตรวจแล้วก่อน Apply
- หากข้อเดิมเป็น `source_state=verified` ต้อง reset source verification ภายในธุรกรรม และ re-verify กับ SHA-256 ใหม่ก่อนคงสถานะ Published
- source refs ต้องมีชื่อแหล่ง URL และวันที่ตรวจที่ไม่อยู่ในอนาคต
- Atomic Apply ต้องผูก `content_sha256` และ `reviewed_content_sha256` ของ source verification กับเนื้อหาใหม่

### No-regression Gate
`K-EXAM Answer Conspicuousness Audit` ต้องเปรียบเทียบผลกับ Audit รอบก่อนหน้าทีละ Question ID

ระบบต้อง Fail เมื่อ
- Question ID เดิมมีระดับสัญญาณสูงขึ้น เช่น Watch → Moderate หรือ Strong
- มี Question ID ใหม่ถูก Flag ซึ่งไม่อยู่ใน Audit รอบก่อน
- ข้อที่เคย Apply แล้วกลับเป็น Strong หรือ Moderate

การลด Strong → Moderate/Watch/OK ถือเป็นความก้าวหน้า แต่เป้าหมายของ Atomic Remediation คือหลัง Apply ต้องไม่เหลือ Strong หรือ Moderate

### Progress Ledger
`academic-answer-remediation-status.json` ใช้ติดตามสถานะ public-safe ของงานแก้ โดยไม่เก็บข้อความข้อสอบ

สถานะหลัก
- `waiting_review` — ยังไม่อยู่ใน Batch และยังไม่มี Decision
- `reserved_for_review` — ถูกจองใน Private Batch ที่ยังไม่หมดอายุ
- `decision_incomplete` — มี Decision record แต่ยังไม่พร้อม Apply
- `ready_to_apply` — Decision พร้อมเข้า Atomic Apply
- `applied_watch` — Apply ผ่าน Gate แล้วแต่ Audit ยังอยู่ระดับ Watch
- `resolved` — Apply แล้วและไม่ถูก Flag ใน Audit ปัจจุบัน
- `needs_rework` — เคย Apply แล้วแต่กลับเป็น Strong/Moderate ซึ่งต้องถือเป็น regression

Dashboard ต้องแสดงความคืบหน้า, Strong/Moderate/Watch ที่เหลือ, Active Reservation, Regression Guard และ Next Batch Preview โดยไม่เปิดเผยคำตอบ
