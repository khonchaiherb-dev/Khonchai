/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Send,
  Bot,
  User,
  ArrowRight,
  TrendingUp,
  FileText,
  Percent,
  HelpCircle,
  AlertCircle
} from 'lucide-react';
import { Employee, LeaveRequest, Transaction, PayrollRecord } from '../types';

interface AIAssistantProps {
  employees: Employee[];
  leaveRequests: LeaveRequest[];
  transactions: Transaction[];
  payrollRecords: PayrollRecord[];
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AIAssistant({
  employees,
  leaveRequests,
  transactions,
  payrollRecords
}: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `สวัสดีครับ! ผมคือ **ผู้ช่วยวิเคราะห์แผนงานและระบบบัญชีบริษัทอัจฉริยะ** (AI Corporate Specialist) 

ผมได้นำเข้าข้อมูลพนักงานปัจจุบัน บัญชีรายรับ-รายจ่าย และคำขอการลาหยุดทั้งหมดขององค์กรเข้ามาเรียบร้อยแล้ว คุณสามารถคลิกตัวอย่างคำขอระบบด่วนด้านล่าง หรือพิมพ์คำถามที่คุณต้องการได้ทันที เช่น:
- *ช่วยวิเคราะห์ความสมดุลของกระแสเงินสดบริษัทในขณะนี้*
- *ร่างสัญญาจ้างงานมาตรฐานพนักงานแบบทดลองงาน*
- *แนะนำนโยบายและวิธียื่นสิทธิประโยชน์ประกันสังคม*`
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Pre-compiled contextual information to send alongside the prompt
  const companyContext = useMemo(() => {
    return {
      employeesSummary: employees.map(e => ({
        id: e.id,
        name: `${e.firstName} ${e.lastName}`,
        department: e.department,
        role: e.role,
        salary: e.salary,
        status: e.status
      })),
      financialTransactionsSummary: transactions.map(t => ({
        date: t.date,
        type: t.type,
        category: t.category,
        amount: t.amount,
        description: t.description
      })),
      unpaidLeavesCount: leaveRequests.filter(l => l.status === 'pending').length,
      recentLeaves: leaveRequests.slice(0, 5).map(l => ({
        employee: l.employeeName,
        type: l.type,
        days: l.durationDays,
        reason: l.reason,
        status: l.status
      }))
    };
  }, [employees, leaveRequests, transactions]);

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || input;
    if (!textToSend.trim()) return;

    // Append user message
    const updatedMessages = [...messages, { role: 'user', content: textToSend } as Message];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToSend,
          context: companyContext
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'เกิดข้อผิดพลาดในการรับข้อมูลจากระบบ AI');
      }

      setMessages([...updatedMessages, { role: 'assistant', content: data.text }]);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'ไม่สามารถติดต่อ AI เซิร์ฟเวอร์ได้ กรุณาตรวจสอบ Settings > Secrets');
    } finally {
      setLoading(false);
    }
  };

  // Pre-packaged Thai short-cut prompts for immediate value
  const quickPrompts = [
    {
      label: 'วิเคราะห์ความมั่นคงกระแสเงินสด',
      icon: <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />,
      text: 'โปรดสรุปและวิเคราะห์สุขภาพงบกระแสเงินสดของบริษัทในปัจจุบัน แนะนำจุดเสี่ยงและทิศทางการจัดสรรงบประมาณ'
    },
    {
      label: 'ร่างโครงร่างระเบียบบริษัท',
      icon: <FileText className="w-3.5 h-3.5 text-indigo-600" />,
      text: 'ช่วยเขียนระเบียบข้อบังคับเกี่ยวกับการลาป่วย การลากิจ และการลาพักร้อนประจำปีตามกฎหมายคุ้มครองแรงงานไทยฉบับล่าสุด'
    },
    {
      label: 'แนวทางวางแผนภาษี SME',
      icon: <Percent className="w-3.5 h-3.5 text-amber-600" />,
      text: 'ช่วยแนะนำกลยุทธ์การวางแผนภาษีเงินได้นิติบุคคลสำหรับธุรกิจ SME ไทย และค่าใช้จ่ายประเภทใดบ้างที่สามารถหักลดหย่อนได้สองเท่า'
    },
    {
      label: 'ร่างตัวอย่างสัญญาจ้างงาน',
      icon: <HelpCircle className="w-3.5 h-3.5 text-sky-600" />,
      text: 'ช่วยร่างโครงสร้างร่างสัญญาจ้างพนักงานไอที (Software Engineer) ที่ระบุนโยบายการทำงานระยะไกล (Remote), เวลาปฏิบัติงาน, ประกันสังคม และเงื่อนไขการทำงานล่วงเวลา (OT)'
    }
  ];

  // Custom regex-based high performance renderer for Markdown to prevent layout failures
  const formatMarkdownText = (text: string) => {
    return text.split('\n').map((line, index) => {
      // 1. Headers
      if (line.startsWith('### ')) {
        return <h5 key={index} className="text-sm font-bold text-slate-800 mt-3 mb-1.5 font-sans">{line.replace('### ', '')}</h5>;
      }
      if (line.startsWith('## ')) {
        return <h4 key={index} className="text-base font-bold text-slate-900 mt-4 mb-2 border-b border-slate-100 pb-1 font-sans">{line.replace('## ', '')}</h4>;
      }
      if (line.startsWith('# ')) {
        return <h3 key={index} className="text-lg font-bold text-indigo-900 mt-5 mb-2 border-b-2 border-indigo-100 pb-1.5 font-sans">{line.replace('# ', '')}</h3>;
      }

      // 2. Unordered lists
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        const cleanText = line.replace(/^[\s]*[\-\*]\s+/, '');
        return (
          <ul key={index} className="list-disc list-inside pl-3 space-y-1 my-1 text-slate-600 text-xs">
            <li>{parseInlineMarkdown(cleanText)}</li>
          </ul>
        );
      }

      // 3. Numbered lists
      const numberRegex = /^\d+\.\s+/;
      if (numberRegex.test(line.trim())) {
        const cleanText = line.trim().replace(numberRegex, '');
        return (
          <ol key={index} className="list-decimal list-inside pl-3 space-y-1 my-1 text-slate-600 text-xs">
            <li>{parseInlineMarkdown(cleanText)}</li>
          </ol>
        );
      }

      // 4. Code Blocks / Quotes
      if (line.startsWith('>') || line.startsWith('`')) {
        const cleanText = line.replace(/^>\s*/, '').replace(/`/g, '');
        return (
          <div key={index} className="bg-slate-50 border-l-4 border-slate-400 p-2.5 rounded-r-lg font-mono text-xs text-slate-600 my-1.5 whitespace-pre-wrap">
            {cleanText}
          </div>
        );
      }

      // 5. Normal text lines
      if (!line.trim()) return <div key={index} className="h-2" />;
      return <p key={index} className="text-xs text-slate-600 leading-relaxed font-sans">{parseInlineMarkdown(line)}</p>;
    });
  };

  // Helper to parse bold text **bold** and inline `code`
  const parseInlineMarkdown = (text: string) => {
    const parts = [];
    let currentText = text;
    
    // Replace bold ** and inline `
    const regex = /(\*\*|`)(.*?)\1/g;
    let match;
    let lastIndex = 0;

    while ((match = regex.exec(currentText)) !== null) {
      const matchIndex = match.index;
      // Add plain text before match
      if (matchIndex > lastIndex) {
        parts.push(currentText.substring(lastIndex, matchIndex));
      }
      
      // Add formatted element
      const type = match[1];
      const val = match[2];
      if (type === '**') {
        parts.push(<strong key={matchIndex} className="font-bold text-slate-900">{val}</strong>);
      } else {
        parts.push(<code key={matchIndex} className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px] text-slate-800">{val}</code>);
      }
      
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < currentText.length) {
      parts.push(currentText.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col h-[600px] overflow-hidden" id="ai-assistant-container">
      {/* AI Assistant Header */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 px-6 py-4 flex items-center justify-between border-b border-indigo-900">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white font-sans flex items-center gap-1.5">
              ผู้ช่วยที่ปรึกษา AI และบัญชีภาษีอัจฉริยะ
            </h3>
            <p className="text-[10px] text-indigo-300">ความปลอดภัยของข้อมูล: ทำงานผ่านระบบ API หลังบ้านแบบปิดซ่อนกุญแจ</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] bg-indigo-500/20 px-2.5 py-1 rounded-full text-indigo-200 border border-indigo-500/20 font-bold uppercase">
          <Bot className="w-3.5 h-3.5" /> ONLINE
        </div>
      </div>

      {/* Messages Window */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-3.5 max-w-3xl ${
              msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''
            }`}
          >
            {/* Avatar icon */}
            <div className={`p-2 rounded-xl shrink-0 ${
              msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-150 text-indigo-600 shadow-xs'
            }`}>
              {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            {/* Bubble content */}
            <div className={`rounded-2xl p-4 shadow-xs space-y-2 ${
              msg.role === 'user'
                ? 'bg-indigo-600 text-white font-sans'
                : 'bg-white border border-slate-100 text-slate-800 font-sans'
            }`}>
              {msg.role === 'user' ? (
                <p className="text-xs leading-relaxed">{msg.content}</p>
              ) : (
                <div className="space-y-1.5">
                  {formatMarkdownText(msg.content)}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* AI Thinking indicator */}
        {loading && (
          <div className="flex items-start gap-3.5 max-w-lg">
            <div className="p-2 rounded-xl bg-white border border-slate-150 text-indigo-600 shadow-xs">
              <Bot className="w-4 h-4 animate-bounce" />
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping"></span>
                กำลังประมวลผลคำนวณภาษีและเรียบเรียงข้อมูลพอร์ทัลบริษัท...
              </div>
            </div>
          </div>
        )}

        {/* Secret Key missing error message block */}
        {errorMsg && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2 max-w-2xl">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">ไม่พบคีย์ระบบ AI ในการตั้งค่า (Secret Key Required)</p>
              <p className="mt-1 leading-relaxed">{errorMsg}</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested prompts dock */}
      {messages.length === 1 && (
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-2">
          {quickPrompts.map((qp, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(qp.text)}
              className="bg-white hover:bg-slate-50 text-slate-700 hover:text-indigo-600 border border-slate-150 px-3 py-1.5 rounded-xl text-[11px] font-medium flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              {qp.icon} {qp.label} <ArrowRight className="w-3 h-3 text-slate-300" />
            </button>
          ))}
        </div>
      )}

      {/* Text input footer */}
      <div className="p-4 border-t border-slate-100 bg-white">
        <div className="flex items-center gap-2 max-w-4xl mx-auto">
          <input
            type="text"
            placeholder="พิมพ์สอบถามกฎหมายแรงงาน, ยอดขายขาดทุน, หรือร่างสัญญาจ้างงานภาษาไทย..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            disabled={loading}
            className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none font-sans"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={loading || !input.trim()}
            className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
