/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API Route: AI Insight & Helper using Gemini API
  app.post("/api/ai/analyze", async (req, res) => {
    try {
      const { prompt, context } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(400).json({
          error: "กรุณากำหนดคีย์ GEMINI_API_KEY ในหัวข้อ Settings > Secrets ก่อนเริ่มต้นใช้งานฟังก์ชัน AI"
        });
      }

      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const systemInstruction = `คุณคือผู้ช่วยบริหารจัดการบริษัทและที่ปรึกษาบัญชี-การเงิน-บุคคล (HR & Accounting Specialist) ที่เชี่ยวชาญกฎหมายไทย
หน้าที่ของคุณคือตอบคำถาม วิเคราะห์งบการเงิน งบกระแสเงินสด วางแผนภาษี ร่างระเบียบข้อบังคับพนักงาน หรือทำสัญญาจ้าง สรุปข้อมูลพนักงานและการลาหยุด
โปรดตอบคำถามของผู้ใช้ด้วยความสุภาพ กระชับ เป็นขั้นเป็นตอน และแม่นยำทางหลักการบัญชีและกฎหมายแรงงานไทย
ตอบกลับด้วยรูปแบบ Markdown เสมอ ใช้ตารางประกอบหากจำเป็น และใช้หน่วยเงินบาท (฿) เสมอ`;

      const contents = `ข้อมูลสภาพแวดล้อมและข้อมูลบริษัทในปัจจุบัน:
${JSON.stringify(context, null, 2)}

คำขอหรือข้อซักถามจากผู้ใช้งาน:
${prompt}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
        }
      });

      res.json({ text: response.text });
    } catch (err: any) {
      console.error("Gemini Error:", err);
      res.status(500).json({
        error: err.message || "เกิดข้อผิดพลาดจากเซิร์ฟเวอร์ AI กรุณาลองใหม่อีกครั้ง"
      });
    }
  });

  // API Route: Scan Receipt / Bill using Gemini Vision API
  app.post("/api/ai/scan-receipt", async (req, res) => {
    try {
      const { image } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(400).json({
          error: "กรุณากำหนดคีย์ GEMINI_API_KEY ในหัวข้อ Settings > Secrets ก่อนเริ่มต้นใช้งานฟังก์ชันสแกนใบเสร็จ"
        });
      }

      if (!image) {
        return res.status(400).json({
          error: "กรุณาอัปโหลดรูปภาพใบเสร็จก่อนสแกน"
        });
      }

      // Handle raw base64 or DataURI
      let base64Data = image;
      let mimeType = "image/jpeg";
      if (image.includes(";base64,")) {
        const parts = image.split(";base64,");
        mimeType = parts[0].replace("data:", "");
        base64Data = parts[1];
      }

      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      // Query Gemini 3.5-flash with image and JSON schema
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          },
          "วิเคราะห์รูปภาพบิลหรือใบเสร็จรับเงิน ใบกำกับภาษี หรือเอกสารทางการเงินนี้ และดึงข้อมูลสรุปออกมาเพื่อใช้สำหรับระบบบัญชีแยกประเภท โดยวิเคราะห์ให้ตรงกับหมวดหมู่ค่าใช้จ่าย/รายรับไทย"
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT" as any, // Type.OBJECT from SDK is parsed as "OBJECT" in JSON
            properties: {
              date: {
                type: "STRING" as any,
                description: "วันที่ทำรายการ คศ. ในรูปแบบ YYYY-MM-DD เช่น 2026-07-09 หากไม่สามารถอ่านระบุได้อย่างแน่ชัด ให้ใช้วันที่ปัจจุบัน"
              },
              vendor: {
                type: "STRING" as any,
                description: "ชื่อร้านค้า บริษัท หรือผู้ให้บริการรับเงิน"
              },
              totalAmount: {
                type: "NUMBER" as any,
                description: "จำนวนเงินรวมสุทธิที่เป็นตัวเลข (เช่น 450 หรือ 1250.50)"
              },
              category: {
                type: "STRING" as any,
                description: "หมวดหมู่รายการที่สอดคล้องที่สุด โดยต้องเลือกจากหนึ่งในนี้เท่านั้น: 'รายได้จากการขาย', 'รายได้ค่าบริการ', 'รายได้จากการลงทุน', 'รายรับอื่นๆ', 'เงินเดือนและค่าจ้าง', 'ค่าเช่าสถานที่', 'ค่าน้ำค่าไฟ/อินเทอร์เน็ต', 'ค่าการตลาด/โฆษณา', 'อุปกรณ์สำนักงาน', 'ค่าเดินทาง/ขนส่ง', 'ภาษี/ธรรมเนียม', 'รายจ่ายอื่นๆ'"
              },
              type: {
                type: "STRING" as any,
                description: "ประเภทของรายการ เป็น 'expense' (สำหรับบิลรายจ่าย) หรือ 'income' (สำหรับใบเสร็จรับเงิน/ใบส่งของของบริษัทเรา) เท่านั้น"
              },
              description: {
                type: "STRING" as any,
                description: "สรุปรายการสั้นๆ เป็นภาษาไทย เช่น ซื้อสมุนไพรสดและขวดสเปรย์ หรือ ชำระค่าไฟประจำเดือน"
              }
            },
            required: ["date", "vendor", "totalAmount", "category", "type", "description"]
          }
        }
      });

      if (!response.text) {
        throw new Error("ไม่มีข้อมูลการตอบกลับจาก AI");
      }

      const scanResult = JSON.parse(response.text.trim());
      res.json({ success: true, data: scanResult });
    } catch (err: any) {
      console.error("Scan Receipt Error:", err);
      res.status(500).json({
        error: err.message || "เกิดข้อผิดพลาดขณะส่งรูปภาพสแกนด้วย AI กรุณาลองใหม่อีกครั้ง"
      });
    }
  });

  // Serve static assets or mount Vite dev middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
