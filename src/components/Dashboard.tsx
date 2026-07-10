/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  Wallet,
  AlertCircle,
  Plus,
  DollarSign,
  ArrowRight,
  Sprout,
  Sparkles
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Employee, LeaveRequest, Transaction, PayrollRecord, LeaveStatus, PayrollStatus } from '../types';
import ReceiptScanner from './ReceiptScanner';

interface DashboardProps {
  employees: Employee[];
  leaveRequests: LeaveRequest[];
  transactions: Transaction[];
  payrollRecords: PayrollRecord[];
  setActiveTab: (tab: string) => void;
  onQuickAddTx: () => void;
  onQuickAddLeave: () => void;
  onAddTransaction: (tx: Omit<Transaction, 'id'>) => void;
}

export default function Dashboard({
  employees,
  leaveRequests,
  transactions,
  payrollRecords,
  setActiveTab,
  onQuickAddTx,
  onQuickAddLeave,
  onAddTransaction
}: DashboardProps) {
  // 1. Calculate high-level financial aggregates
  const financials = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    transactions.forEach(tx => {
      if (tx.type === 'income') {
        totalIncome += tx.amount;
      } else {
        totalExpense += tx.amount;
      }
    });
    return {
      totalIncome,
      totalExpense,
      netProfit: totalIncome - totalExpense,
      marginRate: totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0
    };
  }, [transactions]);

  // 2. Prepare chart data (Group transactions by Month)
  const chartData = useMemo(() => {
    const monthlyMap: Record<string, { month: string; income: number; expense: number }> = {};
    
    // Fill last 4 months with default values to look good
    const monthsThai = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const currentYear = new Date().getFullYear();

    // Group actual transactions
    transactions.forEach(tx => {
      const dateParts = tx.date.split('-');
      if (dateParts.length >= 2) {
        const y = parseInt(dateParts[0]);
        const m = parseInt(dateParts[1]) - 1; // 0-indexed
        if (y === currentYear || y === currentYear - 1) {
          const key = `${monthsThai[m]} ${y}`;
          if (!monthlyMap[key]) {
            monthlyMap[key] = { month: key, income: 0, expense: 0 };
          }
          if (tx.type === 'income') {
            monthlyMap[key].income += tx.amount;
          } else {
            monthlyMap[key].expense += tx.amount;
          }
        }
      }
    });

    // Convert map to sorted list based on date sequence
    const sortedKeys = Object.keys(monthlyMap).sort((a, b) => {
      // Very basic sort helper (just putting June before July etc)
      const aMonthIdx = monthsThai.indexOf(a.split(' ')[0]);
      const bMonthIdx = monthsThai.indexOf(b.split(' ')[0]);
      return aMonthIdx - bMonthIdx;
    });

    if (sortedKeys.length === 0) {
      // Fallback dummy chart data if empty
      return [
        { month: 'พ.ค. 2026', income: 140000, expense: 95000 },
        { month: 'มิ.ย. 2026', income: 310000, expense: 296200 },
        { month: 'ก.ค. 2026', income: 220000, expense: 0 }
      ];
    }

    return sortedKeys.map(k => monthlyMap[k]);
  }, [transactions]);

  // 2.5 Prepare pie chart data
  const pieData = useMemo(() => {
    const { totalIncome, totalExpense } = financials;
    if (totalIncome === 0 && totalExpense === 0) {
      return [
        { name: 'รายรับ (Income)', value: 1, color: '#10b981' },
        { name: 'รายจ่าย (Expense)', value: 0, color: '#f43f5e' }
      ];
    }
    return [
      { name: 'รายรับ (Income)', value: totalIncome, color: '#10b981' },
      { name: 'รายจ่าย (Expense)', value: totalExpense, color: '#f43f5e' }
    ];
  }, [financials]);

  // 3. Alerts & Quick Statistics
  const stats = useMemo(() => {
    const pendingLeaves = leaveRequests.filter(l => l.status === LeaveStatus.PENDING).length;
    const unpaidPayrolls = payrollRecords.filter(p => p.status === PayrollStatus.PENDING).length;
    const probationEmployees = employees.filter(e => e.status === 'probation').length;
    
    return {
      pendingLeaves,
      unpaidPayrolls,
      probationEmployees,
      totalEmployees: employees.length
    };
  }, [employees, leaveRequests, payrollRecords]);

  return (
    <div className="space-y-6" id="dashboard-container">
      {/* Upper Alerts & Welcome */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950 text-white rounded-3xl p-6 shadow-md border border-slate-800/80">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-sans font-bold tracking-tight">ระบบบริหาร บริษัท คุณชายสมุนไพร จำกัด</h2>
            <p className="text-emerald-300 mt-1 text-sm font-sans">
              สวัสดีผู้ดูแลระบบ | วันนี้วันที่ {new Date().toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={onQuickAddTx}
              className="bg-emerald-700 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" /> บันทึกบัญชีด่วน
            </button>
            <button
              onClick={onQuickAddLeave}
              className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
            >
              <Calendar className="w-4 h-4" /> ยื่นลางานด่วน
            </button>
          </div>
        </div>

        {/* Dynamic Warning Badges */}
        {(stats.pendingLeaves > 0 || stats.unpaidPayrolls > 0) && (
          <div className="mt-4 flex flex-wrap gap-2 pt-4 border-t border-slate-800">
            {stats.pendingLeaves > 0 && (
              <span className="inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-300 border border-amber-500/30 px-3 py-1 rounded-full text-xs">
                <AlertCircle className="w-3.5 h-3.5" />
                มีคำขอลาหยุดรออนุมัติ {stats.pendingLeaves} รายการ
              </span>
            )}
            {stats.unpaidPayrolls > 0 && (
              <span className="inline-flex items-center gap-1.5 bg-rose-500/10 text-rose-300 border border-rose-500/30 px-3 py-1 rounded-full text-xs">
                <AlertCircle className="w-3.5 h-3.5" />
                มีเงินเดือนรอจ่ายและทำรายการ {stats.unpaidPayrolls} รายการ
              </span>
            )}
            {stats.probationEmployees > 0 && (
              <span className="inline-flex items-center gap-1.5 bg-sky-500/10 text-sky-300 border border-sky-500/30 px-3 py-1 rounded-full text-xs">
                <Users className="w-3.5 h-3.5" />
                พนักงานอยู่ในช่วงทดลองงาน {stats.probationEmployees} คน
              </span>
            )}
          </div>
        )}
      </div>

      {/* Quick Navigation Cards */}
      <div className="space-y-2" id="quick-navigation-section">
        <h3 className="text-xs font-sans font-extrabold text-slate-400 uppercase tracking-wider">เมนูทางลัดที่สำคัญ (Quick Access Menus)</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {/* Herb Inventory */}
          <button
            onClick={() => setActiveTab('herb_inventory')}
            className="bg-white hover:bg-slate-50 border border-slate-100 hover:border-emerald-500 rounded-2xl p-4 text-left shadow-xs transition-all hover:scale-[1.02] hover:-translate-y-0.5 active:scale-95 cursor-pointer group flex flex-col justify-between h-28"
          >
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-colors self-start">
              <Sprout className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">วัตถุดิบและตำรับสมุนไพร</p>
              <p className="text-[10px] text-slate-400">สต็อก & สูตรยา</p>
            </div>
          </button>

          {/* Ledger Accounting */}
          <button
            onClick={() => setActiveTab('accounting')}
            className="bg-white hover:bg-slate-50 border border-slate-100 hover:border-emerald-500 rounded-2xl p-4 text-left shadow-xs transition-all hover:scale-[1.02] hover:-translate-y-0.5 active:scale-95 cursor-pointer group flex flex-col justify-between h-28"
          >
            <div className="p-2 bg-blue-50 text-blue-700 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors self-start">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">สมุดบัญชีแยกประเภท</p>
              <p className="text-[10px] text-slate-400">รายรับ-รายจ่าย & P&L</p>
            </div>
          </button>

          {/* HR Management */}
          <button
            onClick={() => setActiveTab('hr')}
            className="bg-white hover:bg-slate-50 border border-slate-100 hover:border-emerald-500 rounded-2xl p-4 text-left shadow-xs transition-all hover:scale-[1.02] hover:-translate-y-0.5 active:scale-95 cursor-pointer group flex flex-col justify-between h-28"
          >
            <div className="p-2 bg-teal-50 text-teal-700 rounded-xl group-hover:bg-teal-600 group-hover:text-white transition-colors self-start">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">ระบบบริหารบุคคล & ใบลา</p>
              <p className="text-[10px] text-slate-400">ข้อมูลพนักงาน & การลาหยุด</p>
            </div>
          </button>

          {/* Payroll Hub */}
          <button
            onClick={() => setActiveTab('payroll')}
            className="bg-white hover:bg-slate-50 border border-slate-100 hover:border-emerald-500 rounded-2xl p-4 text-left shadow-xs transition-all hover:scale-[1.02] hover:-translate-y-0.5 active:scale-95 cursor-pointer group flex flex-col justify-between h-28"
          >
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors self-start">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">คำนวณและจ่ายเงินเดือน</p>
              <p className="text-[10px] text-slate-400">สลิปเงินเดือน & ภาษีหัก ณ ที่จ่าย</p>
            </div>
          </button>

          {/* AI Advisor */}
          <button
            onClick={() => setActiveTab('ai')}
            className="bg-white hover:bg-slate-50 border border-slate-100 hover:border-emerald-500 rounded-2xl p-4 text-left shadow-xs transition-all hover:scale-[1.02] hover:-translate-y-0.5 active:scale-95 cursor-pointer group flex flex-col justify-between h-28 col-span-2 md:col-span-1"
          >
            <div className="p-2 bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 rounded-xl group-hover:from-emerald-600 group-hover:to-green-500 group-hover:text-white transition-colors self-start">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">ที่ปรึกษา AI อัจฉริยะ</p>
              <p className="text-[10px] text-emerald-600 font-bold">แชทบอท & วิเคราะห์งบ</p>
            </div>
          </button>
        </div>
      </div>

      {/* Main Aggregates Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric Income */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-medium">รายได้สะสมทั้งหมด</span>
            <h3 className="text-2xl font-sans font-bold text-emerald-600">
              ฿{financials.totalIncome.toLocaleString()}
            </h3>
            <span className="text-[11px] text-emerald-500 font-medium flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" /> ขาเข้าบริษัท
            </span>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Metric Expense */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-medium">ค่าใช้จ่ายสะสมทั้งหมด</span>
            <h3 className="text-2xl font-sans font-bold text-rose-600">
              ฿{financials.totalExpense.toLocaleString()}
            </h3>
            <span className="text-[11px] text-rose-400 font-medium flex items-center gap-0.5">
              <TrendingDown className="w-3 h-3" /> ขาออกบริษัท
            </span>
          </div>
          <div className="p-3 bg-rose-50 rounded-xl text-rose-600">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        {/* Metric Profits */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-medium">กำไรสุทธิการดำเนินการ</span>
            <h3 className={`text-2xl font-sans font-bold ${financials.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              ฿{financials.netProfit.toLocaleString()}
            </h3>
            <span className="text-[11px] text-slate-500 font-medium">
              อัตรากำไรขั้นต้น {financials.marginRate.toFixed(1)}%
            </span>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-700">
            <Wallet className="w-6 h-6" />
          </div>
        </div>

        {/* Metric Staff */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-medium">พนักงานในบริษัท</span>
            <h3 className="text-2xl font-sans font-bold text-slate-800">
              {stats.totalEmployees} <span className="text-sm font-normal text-slate-500">คน</span>
            </h3>
            <span className="text-[11px] text-emerald-700 font-medium">
              ฝ่ายบุคคลและแมนเนจเมนต์
            </span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl text-slate-700">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* AI Receipt Scanning Center Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="ai-receipt-scanning-section">
        <div className="lg:col-span-2">
          <ReceiptScanner onAddTransaction={onAddTransaction} />
        </div>
        <div className="bg-gradient-to-br from-emerald-950 to-slate-900 text-white rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-500/15 rounded-xl text-emerald-400">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">ระบบบูรณาการบัญชีอัจฉริยะ</span>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-bold tracking-tight">การบันทึกบัญชีอัตโนมัติ 100%</h4>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                เมื่อท่านอัปโหลดหรือถ่ายรูปใบเสร็จ บิลค่าวัตถุดิบ หรือบิลค่าน้ำค่าไฟ:
              </p>
              <ul className="text-[10px] text-slate-400 space-y-1.5 list-disc pl-4 leading-relaxed">
                <li><strong className="text-white">ปรับยอดทันที:</strong> ดึงชื่อร้านค้า ยอดเงินสุทธิ และวันที่ลงสมุดบัญชีแยกประเภทหลัก</li>
                <li><strong className="text-white">จำแนกภาษี:</strong> วิเคราะห์หมวดหมู่บัญชีตามสรรพากรและงบกำไรขาดทุนจำลอง</li>
                <li><strong className="text-white">ส่งต่อข้อมูล AI:</strong> ทำงานร่วมกับที่ปรึกษา AI ทันทีเพื่อออกรายงานสรุปและนโยบายการจัดซื้อถัดไป</li>
              </ul>
            </div>
          </div>
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <span className="text-[10px] text-emerald-400 font-mono font-bold">● Gemini 3.5-flash OCR</span>
            <button
              onClick={() => setActiveTab('accounting')}
              className="text-[11px] text-white hover:text-emerald-400 font-bold flex items-center gap-0.5 transition-colors cursor-pointer"
            >
              ดูสมุดบัญชีแยกประเภท <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Charts & Interactive Rows */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cash Flow Chart */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-slate-800 font-bold font-sans">แนวโน้มงบประมาณกระแสเงินสด</h4>
              <p className="text-xs text-slate-400 font-sans">เปรียบเทียบระหว่าง รายรับ และ รายจ่าย ขององค์กรแต่ละเดือน</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-mono">
              ปีปัจจุบัน {new Date().getFullYear()}
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `฿${v / 1000}k`} />
                <Tooltip
                  formatter={(value: any) => [`฿${Number(value).toLocaleString()}`, '']}
                  contentStyle={{ background: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Area name="รายรับ (Income)" type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" />
                <Area name="รายจ่าย (Expense)" type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart Card */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <h4 className="text-slate-800 font-bold font-sans">สัดส่วนรายรับและรายจ่าย</h4>
            <p className="text-xs text-slate-400 font-sans">เปรียบเทียบโครงสร้างการเงินสะสมแบบเรียลไทม์</p>
          </div>

          <div className="h-48 w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => [`฿${Number(value).toLocaleString()}`, '']}
                  contentStyle={{ background: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Center Text inside Donut */}
            <div className="absolute text-center flex flex-col items-center">
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">สุทธิ</span>
              <span className={`text-sm font-bold font-sans ${financials.netProfit >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
                ฿{financials.netProfit >= 0 ? '+' : ''}{(financials.netProfit / 1000).toFixed(1)}k
              </span>
            </div>
          </div>

          {/* Custom Custom Legend */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-50 text-xs">
            {pieData.map((entry, idx) => {
              const total = financials.totalIncome + financials.totalExpense;
              const percent = total > 0 ? ((entry.value / total) * 100).toFixed(1) : '0.0';
              const isZero = financials.totalIncome === 0 && financials.totalExpense === 0;
              return (
                <div key={idx} className="flex flex-col space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                    <span className="text-slate-500 text-[11px] font-medium truncate">{entry.name.split(' ')[0]}</span>
                  </div>
                  <span className="font-sans font-bold text-slate-800">
                    {isZero && idx === 1 ? '฿0' : `฿${entry.value.toLocaleString()}`}
                    <span className="text-slate-400 font-normal text-[10px] ml-1">({isZero ? '0' : percent}%)</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Overview Tasks & Short Links */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
          <h4 className="text-slate-800 font-bold font-sans">คิวงานและเรื่องรอดำเนินการ</h4>

          <div className="space-y-3">
            {/* Leaves approvals link */}
            <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors flex items-start gap-3">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs text-slate-400">คำขอใบลาค้างพิจารณา</span>
                <p className="text-sm font-bold text-slate-800 mt-0.5">{stats.pendingLeaves} คำขอ</p>
                <button
                  onClick={() => setActiveTab('hr')}
                  className="text-xs text-indigo-600 font-medium flex items-center gap-0.5 mt-1 hover:underline cursor-pointer"
                >
                  เปิดฝ่ายบุคคลอนุมัติ <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Payrolls processing link */}
            <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors flex items-start gap-3">
              <div className="p-2 bg-rose-50 text-rose-600 rounded-lg shrink-0">
                <DollarSign className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs text-slate-400">เงินเดือนรอเบิกจ่ายรอบถัดไป</span>
                <p className="text-sm font-bold text-slate-800 mt-0.5">{stats.unpaidPayrolls} รายการ</p>
                <button
                  onClick={() => setActiveTab('payroll')}
                  className="text-xs text-indigo-600 font-medium flex items-center gap-0.5 mt-1 hover:underline cursor-pointer"
                >
                  จัดการสรุปเงินเดือน <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* AI Assistant Insight promotion */}
            <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100 space-y-2">
              <h5 className="text-xs font-bold text-indigo-900 uppercase tracking-wider">วิเคราะห์ด้วย AI อัจฉริยะ</h5>
              <p className="text-xs text-indigo-700 leading-relaxed">
                คีย์ข้อมูลเสร็จแล้วใช่ไหม? ถาม AI เพื่อทำนโยบายองค์กร หรือวิเคราะห์ความมั่นคงทางการเงินรอบสัปดาห์ได้ทันที
              </p>
              <button
                onClick={() => setActiveTab('ai')}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-1.5 px-3 rounded-lg text-center block transition-all cursor-pointer"
              >
                เปิดสนทนากับผู้ช่วย AI
              </button>
            </div>
          </div>
        </div>

        {/* Recents Transaction Ledger table */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-slate-800 font-bold font-sans">ประวัติการทำธุรกรรมการเงินล่าสุด</h4>
              <p className="text-xs text-slate-400 font-sans">รายการรายรับรายจ่ายบริษัท 5 รายการล่าสุด</p>
            </div>
            <button
              onClick={() => setActiveTab('accounting')}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-0.5 cursor-pointer"
            >
              เปิดสมุดบัญชีทั้งหมด <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 text-xs font-medium">
                  <th className="py-2 pb-3">วันที่</th>
                  <th className="py-2 pb-3">ประเภท</th>
                  <th className="py-2 pb-3">หมวดหมู่</th>
                  <th className="py-2 pb-3">คำอธิบาย</th>
                  <th className="py-2 pb-3 text-right">จำนวนเงิน (฿)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {transactions.slice(0, 5).map((tx) => (
                  <tr key={tx.id} className="text-slate-700 hover:bg-slate-50/50 transition-colors">
                    <td className="py-2.5 font-mono text-xs text-slate-500">{tx.date}</td>
                    <td className="py-2.5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        tx.type === 'income' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                      }`}>
                        {tx.type === 'income' ? 'รายรับ' : 'รายจ่าย'}
                      </span>
                    </td>
                    <td className="py-2.5 font-medium text-slate-600 text-xs">{tx.category}</td>
                    <td className="py-2.5 max-w-xs truncate text-xs text-slate-600" title={tx.description}>
                      {tx.description}
                    </td>
                    <td className={`py-2.5 text-right font-sans font-bold text-xs ${
                      tx.type === 'income' ? 'text-emerald-600' : 'text-slate-700'
                    }`}>
                      {tx.type === 'income' ? '+' : '-'}{tx.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
