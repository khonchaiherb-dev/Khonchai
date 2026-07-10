/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  Sparkles,
  Check,
  AlertCircle,
  Loader2,
  RefreshCw,
  Plus,
  ArrowRight,
  Trash2,
  Calendar,
  Wallet,
  Coins
} from 'lucide-react';
import { Transaction, TransactionType, TransactionCategory } from '../types';

interface ReceiptScannerProps {
  onAddTransaction: (tx: Omit<Transaction, 'id'>) => void;
  onSuccess?: () => void;
}

export default function ReceiptScanner({ onAddTransaction, onSuccess }: ReceiptScannerProps) {
  const [image, setImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<{
    date: string;
    vendor: string;
    totalAmount: number;
    category: TransactionCategory;
    type: TransactionType;
    description: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('กรุณาเลือกไฟล์รูปภาพใบเสร็จหรือบิลเท่านั้น (PNG, JPG, WEBP)');
      return;
    }

    setFileName(file.name);
    setError(null);
    setScanResult(null);

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImage(reader.result);
      }
    };
    reader.onerror = () => {
      setError('ไม่สามารถอ่านไฟล์รูปภาพได้');
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const startScan = async () => {
    if (!image) return;

    setIsScanning(true);
    setError(null);
    setScanStep('กำลังประมวลผลข้อมูลภาพ...');

    // Simulate scanning steps for high-quality UX
    const steps = [
      'กำลังเชื่อมต่อกับผู้ช่วยบัญชี Gemini AI...',
      'กำลังวิเคราะห์โครงสร้างใบเสร็จรับเงิน...',
      'กำลังอ่านยอดเงิน ตัวเลข และสลักหลังบิล...',
      'กำลังจำแนกหมวดหมู่ภาษีตามมาตรฐานบัญชีไทย...'
    ];

    let stepIdx = 0;
    const interval = setInterval(() => {
      if (stepIdx < steps.length) {
        setScanStep(steps[stepIdx]);
        stepIdx++;
      }
    }, 1200);

    try {
      const response = await fetch('/api/ai/scan-receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ image })
      });

      const resData = await response.json();
      clearInterval(interval);

      if (!response.ok || !resData.success) {
        throw new Error(resData.error || 'เกิดข้อผิดพลาดในการจำแนกบิลด้วย AI');
      }

      const data = resData.data;
      
      // Map category back to TransactionCategory safely
      let matchedCategory = TransactionCategory.OTHER_EXPENSE;
      if (Object.values(TransactionCategory).includes(data.category as TransactionCategory)) {
        matchedCategory = data.category as TransactionCategory;
      }

      setScanResult({
        date: data.date || new Date().toISOString().split('T')[0],
        vendor: data.vendor || 'ร้านค้าไม่ระบุ',
        totalAmount: Number(data.totalAmount) || 0,
        category: matchedCategory,
        type: data.type === 'income' ? TransactionType.INCOME : TransactionType.EXPENSE,
        description: data.description || 'สแกนใบเสร็จจากรูปภาพ'
      });
    } catch (err: any) {
      clearInterval(interval);
      console.error(err);
      setError(err.message || 'เกิดข้อผิดพลาดในการสื่อสารกับเซิร์ฟเวอร์ AI กรุณาลองอีกครั้ง');
    } finally {
      setIsScanning(false);
      setScanStep('');
    }
  };

  const saveScannedTransaction = () => {
    if (!scanResult) return;

    if (!scanResult.vendor || scanResult.totalAmount <= 0 || !scanResult.description) {
      setError('กรุณากรอกข้อมูลในฟอร์มผลการสแกนให้ครบถ้วนและถูกต้อง');
      return;
    }

    onAddTransaction({
      date: scanResult.date,
      type: scanResult.type,
      category: scanResult.category,
      amount: scanResult.totalAmount,
      description: `[สแกนบิล AI - ${scanResult.vendor}] ${scanResult.description}`,
      referenceNo: 'OCR-' + Math.random().toString(36).substr(2, 6).toUpperCase()
    });

    // Clear state after success
    setImage(null);
    setFileName('');
    setScanResult(null);
    if (onSuccess) {
      onSuccess();
    }
  };

  return (
    <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4" id="receipt-scanner-card">
      <div className="flex items-center justify-between border-b border-slate-50 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-sans font-extrabold text-slate-800">ระบบสแกนบิลและใบเสร็จรับเงินด้วย AI</h4>
            <p className="text-[11px] text-slate-400">อัปโหลดภาพบิลหรือค่าใช้จ่ายเพื่อจำแนกลงบัญชีอัตโนมัติ</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 text-rose-700 border border-rose-100 p-3 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!image ? (
        // Drop Zone
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-2xl p-8 text-center cursor-pointer transition-all hover:bg-slate-50 group flex flex-col items-center justify-center space-y-2.5"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
          <div className="p-3 bg-slate-50 text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 rounded-2xl transition-colors">
            <UploadCloud className="w-8 h-8" />
          </div>
          <div className="space-y-0.5">
            <p className="text-xs font-bold text-slate-700">ลากไฟล์บิลใบเสร็จมาวางที่นี่ หรือ คลิกเพื่อเลือกไฟล์</p>
            <p className="text-[10px] text-slate-400">รองรับไฟล์รูปภาพ PNG, JPG, WEBP หรือถ่ายรูปสลักหลังใบสำคัญจ่าย</p>
          </div>
        </div>
      ) : (
        // Preview Screen
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left: Image Preview & Trigger */}
          <div className="space-y-3">
            <div className="relative rounded-2xl overflow-hidden border border-slate-100 bg-slate-900 aspect-video md:aspect-auto md:h-56 flex items-center justify-center">
              <img
                src={image}
                alt="Receipt Preview"
                className="w-full h-full object-contain"
              />
              <button
                onClick={() => {
                  setImage(null);
                  setFileName('');
                  setScanResult(null);
                  setError(null);
                }}
                className="absolute top-2.5 right-2.5 p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-sm transition-colors cursor-pointer"
                title="ลบรูปภาพ"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-400 max-w-[180px] truncate">{fileName}</span>
              {!isScanning && !scanResult && (
                <button
                  onClick={startScan}
                  className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" /> วิเคราะห์ด้วย AI
                </button>
              )}
            </div>
          </div>

          {/* Right: Results or Scanner State */}
          <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 flex flex-col justify-center min-h-[200px]">
            {isScanning ? (
              // Scanning State
              <div className="text-center py-6 space-y-4">
                <div className="relative flex justify-center">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700 animate-pulse">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-700">กำลังสแกนใบเสร็จด้วยระบบวิสัยทัศน์ AI</p>
                  <p className="text-[10px] text-emerald-600 font-medium animate-pulse">{scanStep}</p>
                </div>
              </div>
            ) : scanResult ? (
              // Result Form Edit State
              <div className="space-y-3 text-xs font-sans">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-800">ยืนยันความถูกต้องพอร์ทัลบัญชี</span>
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-bold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-md">
                    <Check className="w-3 h-3" /> ดึงข้อมูลสำเร็จ
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold mb-0.5">วันที่ทำรายการ *</label>
                    <input
                      type="date"
                      value={scanResult.date}
                      onChange={(e) => setScanResult({ ...scanResult, date: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-sans"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold mb-0.5">ยอดเงินรวมสุทธิ *</label>
                    <div className="relative">
                      <span className="absolute left-2 top-2 text-[10px] font-bold text-slate-400">฿</span>
                      <input
                        type="number"
                        step="any"
                        value={scanResult.totalAmount}
                        onChange={(e) => setScanResult({ ...scanResult, totalAmount: Number(e.target.value) })}
                        className="w-full pl-5 pr-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-sans font-bold"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-0.5">ชื่อคู่ค้า / แหล่งรับเงิน *</label>
                  <input
                    type="text"
                    value={scanResult.vendor}
                    onChange={(e) => setScanResult({ ...scanResult, vendor: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-sans font-medium"
                    placeholder="เช่น เซเว่น อีเลฟเว่น, บมจ.ปตท"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold mb-0.5">ประเภทรายการ</label>
                    <select
                      value={scanResult.type}
                      onChange={(e) => setScanResult({ ...scanResult, type: e.target.value as TransactionType })}
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-sans font-medium"
                    >
                      <option value={TransactionType.EXPENSE}>รายจ่าย (-)</option>
                      <option value={TransactionType.INCOME}>รายรับ (+)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold mb-0.5">หมวดหมู่รายการ</label>
                    <select
                      value={scanResult.category}
                      onChange={(e) => setScanResult({ ...scanResult, category: e.target.value as TransactionCategory })}
                      className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-sans font-medium"
                    >
                      {Object.values(TransactionCategory).map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-0.5">รายละเอียดคำอธิบายเพิ่มเติม *</label>
                  <textarea
                    value={scanResult.description}
                    onChange={(e) => setScanResult({ ...scanResult, description: e.target.value })}
                    rows={2}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-sans leading-relaxed"
                    placeholder="ระบุวัตถุประสงค์สลักหลังรายการ"
                  />
                </div>

                <div className="flex gap-2 pt-1.5">
                  <button
                    onClick={() => {
                      setScanResult(null);
                      setError(null);
                    }}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-1.5 px-3 rounded-xl transition-colors cursor-pointer"
                  >
                    เริ่มสแกนใหม่
                  </button>
                  <button
                    onClick={saveScannedTransaction}
                    className="flex-1 bg-emerald-700 hover:bg-emerald-600 text-white font-bold py-1.5 px-3 rounded-xl flex items-center justify-center gap-1 shadow-sm transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> บันทึกเข้าสมุดบัญชี
                  </button>
                </div>
              </div>
            ) : (
              // Idle State prior to scan
              <div className="text-center py-8 space-y-2">
                <div className="flex justify-center text-slate-300">
                  <FileText className="w-10 h-10" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-slate-500">เลือกภาพและคลิก "วิเคราะห์ด้วย AI"</p>
                  <p className="text-[10px] text-slate-400 leading-relaxed max-w-[200px] mx-auto">
                    Gemini จะช่วยคำนวณภาษี บันทึกราคา และเลือกหมวดหมู่ให้โดยอัตโนมัติ
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
