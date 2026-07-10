/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  Plus,
  Check,
  Printer,
  X,
  CreditCard,
  FileText,
  Percent,
  CheckCircle,
  FileCheck,
  AlertCircle,
  Download,
  BarChart2,
  Building2,
  Shield
} from 'lucide-react';
import { Employee, PayrollRecord, PayrollStatus, EmployeeStatus, LeaveRequest, LeaveStatus, Department } from '../types';
import {
  BarChart,
  Bar,
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

interface PayrollManagerProps {
  employees: Employee[];
  payrollRecords: PayrollRecord[];
  leaveRequests: LeaveRequest[];
  onAddPayrollRecord: (pr: Omit<PayrollRecord, 'id'>) => void;
  onPayPayroll: (id: string, date: string) => void;
  onDeletePayroll: (id: string) => void;
}

export default function PayrollManager({
  employees,
  payrollRecords,
  leaveRequests,
  onAddPayrollRecord,
  onPayPayroll,
  onDeletePayroll
}: PayrollManagerProps) {
  const [payMonth, setPayMonth] = useState<number>(new Date().getMonth() + 1);
  const [payYear, setPayYear] = useState<number>(new Date().getFullYear());
  
  // Selected payroll for showing payslip
  const [selectedSlip, setSelectedSlip] = useState<PayrollRecord | null>(null);
  const [payingPayroll, setPayingPayroll] = useState<PayrollRecord | null>(null);
  const [deletingPayrollRecord, setDeletingPayrollRecord] = useState<PayrollRecord | null>(null);

  // Sub tab states
  const [activeSubTab, setActiveSubTab] = useState<'payroll' | 'gov_reports' | 'analytics'>('payroll');
  const [activeGovReport, setActiveGovReport] = useState<'pnd1' | 'sso'>('pnd1');

  // States for new payroll calculations
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [otherBonus, setOtherBonus] = useState<number>(0); // manual other bonus input
  const [autoDiligence, setAutoDiligence] = useState<boolean>(true); // whether to auto-calculate Diligence Allowance
  const [otHours, setOtHours] = useState<number>(0); // OT hours
  const [otMultiplier, setOtMultiplier] = useState<number>(1.5); // OT multiplier (1.5, 2, 3)
  const [taxRate, setTaxRate] = useState<number>(3); // default 3% withholding tax
  const [otherDeductions, setOtherDeductions] = useState<number>(0);

  // Selected employee information for automatic computation
  const activeEmployeeDetail = useMemo(() => {
    return employees.find(e => e.id === selectedEmpId);
  }, [employees, selectedEmpId]);

  // Approved leaves for the selected employee in this period (month/year)
  const empLeavesThisPeriod = useMemo(() => {
    if (!selectedEmpId) return [];
    return leaveRequests.filter(req => {
      if (req.employeeId !== selectedEmpId) return false;
      if (req.status !== LeaveStatus.APPROVED) return false;
      
      const [y, m] = req.startDate.split('-').map(Number);
      return y === payYear && m === payMonth;
    });
  }, [selectedEmpId, leaveRequests, payMonth, payYear]);

  // Total leave days count in this period
  const totalLeaveDaysThisPeriod = useMemo(() => {
    return empLeavesThisPeriod.reduce((sum, req) => sum + req.durationDays, 0);
  }, [empLeavesThisPeriod]);

  // Automatic diligence allowance based on total leave days
  const diligenceAmount = useMemo(() => {
    if (!selectedEmpId) return 0;
    // Standard rule: 
    // 0 leave days = 1,000 THB 
    // 1 leave day = 500 THB
    // 2 leave days = 300 THB
    // 3 or more leave days = 0 THB
    const leaveCount = totalLeaveDaysThisPeriod;
    if (leaveCount === 0) return 1000;
    if (leaveCount === 1) return 500;
    if (leaveCount === 2) return 300;
    return 0;
  }, [selectedEmpId, totalLeaveDaysThisPeriod]);

  // Calculate OT pay
  const calculatedOtPay = useMemo(() => {
    if (!activeEmployeeDetail || otHours <= 0) return 0;
    // Standard Thai Labour law hourly rate calculation: (Base Salary / 30 days / 8 hours)
    const hourlyRate = activeEmployeeDetail.salary / 240;
    return Math.round(hourlyRate * otMultiplier * otHours);
  }, [activeEmployeeDetail, otHours, otMultiplier]);

  // Compute total bonus (Other Bonus + Diligence Allowance + OT Pay)
  const totalBonus = useMemo(() => {
    return otherBonus + (autoDiligence ? diligenceAmount : 0) + calculatedOtPay;
  }, [otherBonus, autoDiligence, diligenceAmount, calculatedOtPay]);

  // Thai months names list
  const THAI_MONTHS = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  // Eligible employees for payroll (Active and Probation, who don't already have payroll in the selected month/year)
  const eligibleEmployees = useMemo(() => {
    return employees.filter(emp => {
      if (emp.status === EmployeeStatus.RESIGNED) return false;
      
      // Check if they already have a payroll record for this period
      const hasRecord = payrollRecords.some(
        pr => pr.employeeId === emp.id && pr.month === payMonth && pr.year === payYear
      );
      return !hasRecord;
    });
  }, [employees, payrollRecords, payMonth, payYear]);

  // Active payrolls for current month/year
  const currentPayrolls = useMemo(() => {
    return payrollRecords.filter(pr => pr.month === payMonth && pr.year === payYear);
  }, [payrollRecords, payMonth, payYear]);

  // Automatic computation of Social Security and Tax
  const computedPayrollValues = useMemo(() => {
    if (!activeEmployeeDetail) return null;
    const base = activeEmployeeDetail.salary;
    
    // Check if employee is Director (กรรมการ)
    const isDirector = activeEmployeeDetail.role.includes('กรรมการ') || 
                       activeEmployeeDetail.role.toLowerCase().includes('director');

    // Thailand Social Security: 5% of base salary, min base 1,650 up to max 15,000 (meaning capped at 750 THB)
    // Directors have NO Social Security deduction
    const socialSecurity = isDirector ? 0 : Math.min(750, Math.max(0, Math.round(base * 0.05)));
    
    // Withholding Tax: e.g. 3% withholding tax on (Base Salary + Bonus)
    // Directors have NO withholding tax deduction (0%)
    const totalEarnings = base + totalBonus;
    const taxDeduction = isDirector ? 0 : Math.round(totalEarnings * (taxRate / 100));
    
    const netSalary = totalEarnings - socialSecurity - taxDeduction - otherDeductions;

    return {
      baseSalary: base,
      socialSecurity,
      taxDeduction,
      netSalary,
      isDirector
    };
  }, [activeEmployeeDetail, totalBonus, taxRate, otherDeductions]);

  // Handle generating payroll record
  const handleGeneratePayroll = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpId || !computedPayrollValues || !activeEmployeeDetail) {
      alert('กรุณาเลือกพนักงานเพื่อทำการประมวลผล');
      return;
    }

    onAddPayrollRecord({
      employeeId: selectedEmpId,
      employeeName: `${activeEmployeeDetail.firstName} ${activeEmployeeDetail.lastName}`,
      month: payMonth,
      year: payYear,
      baseSalary: computedPayrollValues.baseSalary,
      bonus: totalBonus,
      taxDeduction: computedPayrollValues.taxDeduction,
      socialSecurity: computedPayrollValues.socialSecurity,
      otherDeductions,
      netSalary: computedPayrollValues.netSalary,
      status: PayrollStatus.PENDING,
      diligenceAllowance: autoDiligence ? diligenceAmount : 0,
      otHours: otHours,
      otPay: calculatedOtPay,
      otherBonus: otherBonus
    });

    // Reset inputs
    setSelectedEmpId('');
    setOtherBonus(0);
    setOtherDeductions(0);
    setOtHours(0);
  };

  // Export current month's payroll ledger to CSV
  const handleExportCSV = () => {
    if (currentPayrolls.length === 0) {
      alert('ไม่มีข้อมูลสำหรับส่งออกในรอบเดือนนี้');
      return;
    }

    // UTF-8 BOM so Thai characters are read correctly in Excel
    let csvContent = '\uFEFF';
    csvContent += 'รหัสสลิป,รหัสพนักงาน,ชื่อพนักงาน,เงินเดือนพื้นฐาน,เบี้ยขยัน,ค่า OT (ล่วงเวลา),โบนัสอื่นๆ,รวมรายรับพิเศษ,หัก ประกันสังคม,หัก ภาษี ณ ที่จ่าย,หัก อื่นๆ,รายได้สุทธิ,สถานะ,วันที่สั่งจ่าย\n';

    currentPayrolls.forEach(pr => {
      const diligence = pr.diligenceAllowance || 0;
      const otPay = pr.otPay || 0;
      const otherB = pr.otherBonus || 0;
      const paymentDateStr = pr.paymentDate || '-';
      const statusStr = pr.status === PayrollStatus.PAID ? 'จ่ายแล้ว' : 'ค้างจ่าย';

      csvContent += `${pr.id},${pr.employeeId},"${pr.employeeName}",${pr.baseSalary},${diligence},${otPay},${otherB},${pr.bonus},${pr.socialSecurity},${pr.taxDeduction},${pr.otherDeductions},${pr.netSalary},"${statusStr}","${paymentDateStr}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `รายงานเงินเดือน_งวด_${payMonth}_${payYear + 543}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Bulk automatic generation of payroll records for all remaining eligible employees
  const handleBulkGeneratePayroll = () => {
    if (eligibleEmployees.length === 0) {
      alert('ทำเงินเดือนครบสำหรับพนักงานทุกคนในงวดนี้แล้ว');
      return;
    }

    const confirmGen = window.confirm(`คุณต้องการประมวลผลสลิปเงินเดือนสำหรับพนักงานที่เหลืออีก ${eligibleEmployees.length} คนโดยอัตโนมัติใช่หรือไม่?\n(ระบบจะคำนวณเบี้ยขยันและหักสิทธิประโยชน์ต่างๆ ตามสถิติการลาอัติโนมัติ)`);
    if (!confirmGen) return;

    let count = 0;
    eligibleEmployees.forEach(emp => {
      // Calculate leaves for this period
      const leaves = leaveRequests.filter(req => {
        if (req.employeeId !== emp.id) return false;
        if (req.status !== LeaveStatus.APPROVED) return false;
        const [y, m] = req.startDate.split('-').map(Number);
        return y === payYear && m === payMonth;
      });
      const leaveDays = leaves.reduce((sum, req) => sum + req.durationDays, 0);

      // Calculate diligence allowance
      let diligence = 0;
      if (leaveDays === 0) diligence = 1000;
      else if (leaveDays === 1) diligence = 500;
      else if (leaveDays === 2) diligence = 300;

      // Check if director
      const isDirector = emp.role.includes('กรรมการ') || emp.role.toLowerCase().includes('director');

      // Social security
      const sso = isDirector ? 0 : Math.min(750, Math.max(0, Math.round(emp.salary * 0.05)));

      // Withholding tax
      const totalEarnings = emp.salary + diligence;
      const tax = isDirector ? 0 : Math.round(totalEarnings * 0.03);

      const net = totalEarnings - sso - tax;

      onAddPayrollRecord({
        employeeId: emp.id,
        employeeName: `${emp.firstName} ${emp.lastName}`,
        month: payMonth,
        year: payYear,
        baseSalary: emp.salary,
        bonus: diligence,
        taxDeduction: tax,
        socialSecurity: sso,
        otherDeductions: 0,
        netSalary: net,
        status: PayrollStatus.PENDING,
        diligenceAllowance: diligence,
        otHours: 0,
        otPay: 0,
        otherBonus: 0
      });
      count++;
    });

    alert(`ประมวลผลข้อมูลสลิปเงินเดือนเสร็จสิ้น ${count} รายการในสถานะค้างจ่าย (Pending)`);
  };

  // Bulk payment approval for all pending records in the current period
  const handleBulkPayPayroll = () => {
    const pendingPayrolls = currentPayrolls.filter(pr => pr.status === PayrollStatus.PENDING);
    if (pendingPayrolls.length === 0) {
      alert('ไม่มีรายการค้างจ่ายในรอบเดือนนี้');
      return;
    }

    const confirmPay = window.confirm(`คุณต้องการยืนยันการอนุมัติโอนเงินเดือนให้กับพนักงานทั้งหมดที่ค้างจ่ายจำนวน ${pendingPayrolls.length} รายการใช่หรือไม่?`);
    if (!confirmPay) return;

    const todayStr = new Date().toISOString().split('T')[0];
    pendingPayrolls.forEach(pr => {
      onPayPayroll(pr.id, todayStr);
    });

    alert(`ทำการอนุมัติโอนเงินเดือนและออกใบเสร็จสมบูรณ์เรียบร้อยแล้วทั้งหมด ${pendingPayrolls.length} รายการ`);
  };

  // Comprehensive Payroll Statistics for the current month
  const stats = useMemo(() => {
    const generatedCount = currentPayrolls.length;
    const activeEmps = employees.filter(e => e.status !== EmployeeStatus.RESIGNED);
    const totalActiveCount = activeEmps.length;

    const totalBase = currentPayrolls.reduce((sum, pr) => sum + pr.baseSalary, 0);
    const totalBonusVal = currentPayrolls.reduce((sum, pr) => sum + pr.bonus, 0);
    const totalGross = totalBase + totalBonusVal;
    const totalNet = currentPayrolls.reduce((sum, pr) => sum + pr.netSalary, 0);
    const totalSso = currentPayrolls.reduce((sum, pr) => sum + pr.socialSecurity, 0);
    const totalTax = currentPayrolls.reduce((sum, pr) => sum + pr.taxDeduction, 0);
    const paidCount = currentPayrolls.filter(pr => pr.status === PayrollStatus.PAID).length;

    return {
      generatedCount,
      totalActiveCount,
      totalGross,
      totalNet,
      totalSso,
      totalTax,
      paidCount
    };
  }, [currentPayrolls, employees]);

  // Department wage breakdown data
  const deptData = useMemo(() => {
    const depts = Object.values(Department) as Department[];
    return depts.map(d => {
      const empIds = employees.filter(e => e.department === d).map(e => e.id);
      const records = currentPayrolls.filter(pr => empIds.includes(pr.employeeId));
      const totalNet = records.reduce((sum, r) => sum + r.netSalary, 0);
      const totalGross = records.reduce((sum, r) => sum + r.baseSalary + r.bonus, 0);
      return {
        name: (d as string).split(' ')[0], // Department display short name
        fullName: d,
        'รายจ่ายสุทธิ': totalNet,
        'รายจ่ายทั้งหมด': totalGross,
      };
    }).filter(d => d['รายจ่ายทั้งหมด'] > 0);
  }, [currentPayrolls, employees]);

  // Wage composition pie chart data
  const breakDownData = useMemo(() => {
    const baseTotal = currentPayrolls.reduce((sum, pr) => sum + pr.baseSalary, 0);
    const otTotal = currentPayrolls.reduce((sum, pr) => sum + (pr.otPay || 0), 0);
    const diligenceTotal = currentPayrolls.reduce((sum, pr) => sum + (pr.diligenceAllowance || 0), 0);
    const bonusTotal = currentPayrolls.reduce((sum, pr) => sum + (pr.otherBonus || 0), 0);
    
    return [
      { name: 'เงินเดือนพื้นฐาน', value: baseTotal, color: '#4F46E5' },
      { name: 'ค่าล่วงเวลา (OT)', value: otTotal, color: '#F59E0B' },
      { name: 'เบี้ยขยันประจำงวด', value: diligenceTotal, color: '#10B981' },
      { name: 'โบนัสพิเศษอื่นๆ', value: bonusTotal, color: '#EC4899' },
    ].filter(item => item.value > 0);
  }, [currentPayrolls]);

  // Top earners in current month
  const topEarners = useMemo(() => {
    return [...currentPayrolls]
      .sort((a, b) => b.netSalary - a.netSalary)
      .slice(0, 3);
  }, [currentPayrolls]);

  return (
    <div className="space-y-6" id="payroll-manager-container">
      {/* Calendar Month & Year Selector */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-800 font-sans">คำนวณและประมวลผลเงินเดือนพนักงาน (Payroll Hub)</h3>
          <p className="text-xs text-slate-400 font-sans">จัดทำสลิปเงินเดือน ตรวจสอบรายการหักและสมทบประกันสังคมตามเงื่อนไขทางกฎหมาย</p>
        </div>
        <div className="flex gap-2.5">
          <select
            value={payMonth}
            onChange={(e) => setPayMonth(Number(e.target.value))}
            className="py-2 px-3 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 font-sans font-medium"
          >
            {THAI_MONTHS.map((m, idx) => (
              <option key={idx} value={idx + 1}>{m}</option>
            ))}
          </select>

          <select
            value={payYear}
            onChange={(e) => setPayYear(Number(e.target.value))}
            className="py-2 px-3 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 font-mono font-medium"
          >
            <option value={2026}>2026</option>
            <option value={2027}>2027</option>
          </select>
        </div>
      </div>

      {/* Monthly Statistics Dashboard Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Process Ratio */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">การประมวลผลประจำงวด</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl font-extrabold text-slate-800 font-mono">
              {stats.generatedCount}/{stats.totalActiveCount}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">คน</span>
          </div>
          <p className="text-[9px] text-slate-400 mt-2">
            ประมวลผลแล้ว {Math.round((stats.generatedCount / (stats.totalActiveCount || 1)) * 100)}% ของพนักงานทั้งหมด
          </p>
        </div>

        {/* Card 2: Gross Expenses */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">ค่าใช้จ่ายเงินเดือนรวม (Gross)</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-extrabold text-indigo-600 font-mono">
              ฿{stats.totalGross.toLocaleString()}
            </span>
          </div>
          <p className="text-[9px] text-slate-400 mt-2">
            ฐานเงินเดือน + รายรับพิเศษอื่นๆ
          </p>
        </div>

        {/* Card 3: Net Paid */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">ยอดโอนเงินสุทธิ (Net Paid)</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-extrabold text-emerald-600 font-mono">
              ฿{stats.totalNet.toLocaleString()}
            </span>
          </div>
          <p className="text-[9px] text-slate-400 mt-2">
            โอนแล้ว {stats.paidCount} รายการ / เหลือ {stats.generatedCount - stats.paidCount}
          </p>
        </div>

        {/* Card 4: SSO Contribution */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">เงินสมทบประกันสังคม (สปส.)</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-extrabold text-amber-600 font-mono">
              ฿{stats.totalSso.toLocaleString()}
            </span>
          </div>
          <p className="text-[9px] text-slate-400 mt-2">
            นำส่งสมทบสัดส่วน 5% รวมพนักงาน
          </p>
        </div>

        {/* Card 5: Withholding Tax */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between col-span-2 lg:col-span-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">ภาษีหัก ณ ที่จ่ายสะสม (ภ.ง.ด.1)</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-extrabold text-rose-500 font-mono">
              ฿{stats.totalTax.toLocaleString()}
            </span>
          </div>
          <p className="text-[9px] text-slate-400 mt-2">
            หักภาษีเงินได้หัก ณ ที่จ่ายสะสมในงวด
          </p>
        </div>
      </div>

      {/* Sub navigation Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveSubTab('payroll')}
          className={`px-5 py-3 text-xs font-bold font-sans flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'payroll'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          จัดการเงินเดือนและค่าจ้าง
        </button>
        <button
          onClick={() => setActiveSubTab('gov_reports')}
          className={`px-5 py-3 text-xs font-bold font-sans flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'gov_reports'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          รายงานนำส่งรัฐบาล (ภาษี & สปส.)
          {currentPayrolls.length > 0 && (
            <span className="bg-indigo-50 text-indigo-700 text-[10px] px-1.5 py-0.5 rounded-full font-mono border border-indigo-100">
              {currentPayrolls.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveSubTab('analytics')}
          className={`px-5 py-3 text-xs font-bold font-sans flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'analytics'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          วิเคราะห์ค่าตอบแทน (Analytics)
        </button>
      </div>

      {activeSubTab === 'payroll' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payroll computation Form Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <h4 className="text-sm font-bold text-slate-800 font-sans">คำนวณเงินเดือนรายบุคคล</h4>
            {eligibleEmployees.length > 0 && (
              <button
                type="button"
                onClick={handleBulkGeneratePayroll}
                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg transition-all cursor-pointer"
              >
                คำนวณอัตโนมัติทั้งหมด ({eligibleEmployees.length} คน)
              </button>
            )}
          </div>
          
          {eligibleEmployees.length > 0 ? (
            <form onSubmit={handleGeneratePayroll} className="space-y-4">
              {/* Employee list dropdown */}
              <div>
                <label className="block text-[11px] text-slate-500 font-bold mb-1">เลือกพนักงาน *</label>
                <select
                  required
                  value={selectedEmpId}
                  onChange={(e) => setSelectedEmpId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white"
                >
                  <option value="">-- เลือกพนักงานสำหรับรอบนี้ --</option>
                  {eligibleEmployees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      [{emp.id}] {emp.firstName} {emp.lastName} (฿{emp.salary.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              {activeEmployeeDetail && computedPayrollValues && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2 font-sans">
                  <div className="flex justify-between pb-1.5 border-b border-slate-200">
                    <span className="text-slate-400">เงินเดือนพื้นฐาน:</span>
                    <span className="font-mono font-bold text-slate-800">฿{computedPayrollValues.baseSalary.toLocaleString()}</span>
                  </div>

                  {/* Bonus & Diligence Allowance */}
                  <div className="space-y-3 p-3 bg-white border border-slate-200 rounded-xl">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">ส่วนรายรับเพิ่มเติม (Earnings)</span>
                      <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-slate-600 font-medium">
                        <input
                          type="checkbox"
                          checked={autoDiligence}
                          onChange={(e) => setAutoDiligence(e.target.checked)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        คำนวณเบี้ยขยันอัตโนมัติ
                      </label>
                    </div>

                    {autoDiligence && (
                      <div className="bg-emerald-50/70 border border-emerald-100 rounded-lg p-2 text-[10px] font-sans space-y-1">
                        <div className="flex justify-between text-emerald-800">
                          <span>วันลาที่อนุมัติในรอบเดือนนี้:</span>
                          <span className="font-mono font-bold">{totalLeaveDaysThisPeriod} วัน</span>
                        </div>
                        <div className="flex justify-between text-emerald-900 font-semibold">
                          <span>เบี้ยขยันที่คำนวณได้:</span>
                          <span className="font-mono">฿{diligenceAmount.toLocaleString()}</span>
                        </div>
                        <p className="text-[9px] text-slate-400 mt-0.5 leading-normal font-normal">
                          *เกณฑ์เบี้ยขยัน: ลา 0 วัน = 1,000 | ลา 1 วัน = 500 | ลา 2 วัน = 300 | ลา 3+ วัน = 0
                        </p>
                      </div>
                    )}

                    <div>
                      <label className="block text-[10px] text-slate-500 font-bold mb-1">
                        เงินบวก / โบนัสพิเศษอื่น ๆ (บาท)
                      </label>
                      <input
                        type="number"
                        value={otherBonus}
                        onChange={(e) => setOtherBonus(Math.max(0, Number(e.target.value)))}
                        className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs bg-white font-mono"
                        placeholder="0"
                      />
                    </div>

                    {/* Overtime (OT) section */}
                    <div className="border-t border-dashed border-slate-150 pt-3 space-y-2">
                      <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">คำนวณค่าล่วงเวลา (Overtime - OT)</span>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[9px] text-slate-400 font-semibold mb-0.5">จำนวนชั่วโมง OT (ชม.)</label>
                          <input
                            type="number"
                            step="0.5"
                            value={otHours || ''}
                            onChange={(e) => setOtHours(Math.max(0, Number(e.target.value)))}
                            className="w-full px-2 py-1 border border-slate-200 rounded text-xs bg-white font-mono"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] text-slate-400 font-semibold mb-0.5">อัตราค่าจ้าง (เท่า)</label>
                          <select
                            value={otMultiplier}
                            onChange={(e) => setOtMultiplier(Number(e.target.value))}
                            className="w-full px-2 py-1 border border-slate-200 rounded text-xs bg-white font-mono"
                          >
                            <option value={1}>1.0 เท่า (ปกติ)</option>
                            <option value={1.5}>1.5 เท่า (วันทำงานปกติ)</option>
                            <option value={2}>2.0 เท่า (วันหยุดประจำสัปดาห์)</option>
                            <option value={3}>3.0 เท่า (วันหยุดประเพณี)</option>
                          </select>
                        </div>
                      </div>
                      {otHours > 0 && (
                        <div className="flex justify-between items-center text-[10px] text-indigo-700 bg-indigo-50/70 p-1.5 rounded border border-indigo-100">
                          <span>เฉลี่ย ฿{(Math.round(activeEmployeeDetail.salary / 240)).toLocaleString()}/ชม.</span>
                          <span>คำนวณได้: <strong className="font-mono text-indigo-800">฿{calculatedOtPay.toLocaleString()}</strong></span>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between text-[11px] font-semibold text-slate-700 pt-1.5 border-t border-dashed border-slate-100">
                      <span>รวมรายรับพิเศษทั้งหมด:</span>
                      <span className="font-mono text-emerald-600">฿{totalBonus.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Withholding tax rate selector */}
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold mb-1">หักภาษี ณ ที่จ่าย (%)</label>
                    <select
                      value={computedPayrollValues.isDirector ? 0 : taxRate}
                      disabled={computedPayrollValues.isDirector}
                      onChange={(e) => setTaxRate(Number(e.target.value))}
                      className={`w-full px-2 py-1 border border-slate-200 rounded text-xs bg-white ${
                        computedPayrollValues.isDirector ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : ''
                      }`}
                    >
                      {computedPayrollValues.isDirector ? (
                        <option value={0}>ยกเว้นสำหรับกรรมการ (0%)</option>
                      ) : (
                        <>
                          <option value={0}>ไม่หักภาษี (0%)</option>
                          <option value={1}>หัก 1% (ค่าขนส่ง/บริการบางส่วน)</option>
                          <option value={3}>หัก 3% (ทั่วไป - หัก ณ ที่จ่ายพนักงาน)</option>
                          <option value={5}>หัก 5% (มาตรฐานระดับกลาง)</option>
                        </>
                      )}
                    </select>
                  </div>

                  {computedPayrollValues.isDirector && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 p-2.5 rounded-lg text-[10px] leading-relaxed font-medium">
                      💡 <strong>ตรวจพบตำแหน่ง "กรรมการ":</strong> ได้รับสิทธิ์ยกเว้นการหักภาษี ณ ที่จ่าย 3% และยกเว้นการหักเงินสมทบกองทุนประกันสังคมตามกฎหมาย
                    </div>
                  )}

                  {/* Other deductions input */}
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold mb-1">รายการหักอื่น ๆ (เช่น มาสาย/ขาดงาน)</label>
                    <input
                      type="number"
                      value={otherDeductions}
                      onChange={(e) => setOtherDeductions(Math.max(0, Number(e.target.value)))}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs bg-white font-mono"
                    />
                  </div>

                  <div className="pt-2 space-y-1.5 border-t border-slate-200 font-sans text-[11px] text-slate-600">
                    <div className="flex justify-between">
                      <span>หัก ประกันสังคม (สมทบ 5% แคป ฿750):</span>
                      <span className="font-mono text-rose-600">
                        {computedPayrollValues.isDirector ? '฿0 (ยกเว้นกรรมการ)' : `- ฿${computedPayrollValues.socialSecurity.toLocaleString()}`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>หัก ภาษี ณ ที่จ่ายประมาณการ ({computedPayrollValues.isDirector ? 'ยกเว้น' : `${taxRate}%`}):</span>
                      <span className="font-mono text-rose-600">
                        {computedPayrollValues.isDirector ? '฿0 (ยกเว้นกรรมการ)' : `- ฿${computedPayrollValues.taxDeduction.toLocaleString()}`}
                      </span>
                    </div>
                    {otherDeductions > 0 && (
                      <div className="flex justify-between">
                        <span>รายการหักอื่นๆ:</span>
                        <span className="font-mono text-rose-600">- ฿{otherDeductions.toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between text-xs font-bold text-slate-800 bg-indigo-50 p-2 rounded-lg mt-2">
                    <span>รายได้สุทธิพนักงาน:</span>
                    <span className="font-mono text-indigo-600 text-sm">฿{computedPayrollValues.netSalary.toLocaleString()}</span>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-lg transition-all mt-3 text-xs cursor-pointer"
                  >
                    ออกบันทึกสลิปและเงินเดือน
                  </button>
                </div>
              )}
            </form>
          ) : (
            <div className="py-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <AlertCircle className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
              <p className="text-xs text-slate-400 font-sans leading-relaxed">
                ทำรายการครบทุกคนแล้วสำหรับรอบเดือน {THAI_MONTHS[payMonth - 1]}
              </p>
            </div>
          )}
        </div>

        {/* Generated Payroll ledger of the current selected month */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-100">
            <div>
              <h4 className="text-sm font-bold text-slate-800 font-sans">
                รายการเงินเดือนประจำงวด {THAI_MONTHS[payMonth - 1]} {payYear}
              </h4>
              <p className="text-[10px] text-slate-400 font-sans">ทั้งหมด {currentPayrolls.length} รายการที่ประมวลผลแล้ว</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {currentPayrolls.some(pr => pr.status === PayrollStatus.PENDING) && (
                <button
                  onClick={handleBulkPayPayroll}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold cursor-pointer transition-all border border-indigo-200/50"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  อนุมัติจ่ายเงินทั้งหมด
                </button>
              )}
              {currentPayrolls.length > 0 && (
                <button
                  onClick={handleExportCSV}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold cursor-pointer transition-all border border-emerald-200/50"
                >
                  <Download className="w-3.5 h-3.5" />
                  ส่งออก CSV
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 text-xs font-medium">
                  <th className="py-2 pb-3">พนักงาน</th>
                  <th className="py-2 pb-3 text-right">เงินเดือนตั้งต้น</th>
                  <th className="py-2 pb-3 text-right">สุทธิ</th>
                  <th className="py-2 pb-3 text-center">สถานะ</th>
                  <th className="py-2 pb-3 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {currentPayrolls.map((pr) => (
                  <tr key={pr.id} className="text-slate-700 hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 font-sans text-xs">
                      <span className="font-bold text-slate-800 block">{pr.employeeName}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{pr.employeeId}</span>
                    </td>
                    <td className="py-3 text-right font-mono text-xs">
                      ฿{pr.baseSalary.toLocaleString()}
                    </td>
                    <td className="py-3 text-right font-mono text-xs font-bold text-slate-800">
                      ฿{pr.netSalary.toLocaleString()}
                    </td>
                    <td className="py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        pr.status === PayrollStatus.PAID ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {pr.status === PayrollStatus.PAID ? 'จ่ายแล้ว' : 'ค้างจ่าย'}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex gap-1.5 justify-end">
                        {/* If pending, show Quick pay check button */}
                        {pr.status === PayrollStatus.PENDING && (
                          <button
                            onClick={() => setPayingPayroll(pr)}
                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-bold px-2 py-1 rounded cursor-pointer"
                          >
                            สั่งจ่ายเงิน
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedSlip(pr)}
                          className="text-slate-500 hover:text-indigo-600 p-1 rounded cursor-pointer"
                          title="ดูสลิปเงินเดือนพนักงาน"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingPayrollRecord(pr)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded cursor-pointer"
                          title="ลบสลิปเงินเดือน"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {currentPayrolls.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 text-xs font-sans">
                      ไม่มีประวัติรายการสั่งจ่ายเงินเดือนในพาร์ทช่วงเวลานี้
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      )}

      {/* SUB-TAB: GOVERNMENT REPORTS */}
      {activeSubTab === 'gov_reports' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-fade-in">
          {/* Side report selector */}
          <div className="lg:col-span-1 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm h-fit space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">เลือกประเภทแบบยื่น</h4>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setActiveGovReport('pnd1')}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all ${
                  activeGovReport === 'pnd1'
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-150/40'
                    : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                }`}
              >
                <FileText className="w-4 h-4 shrink-0 text-indigo-500" />
                <span>ใบแนบ ภ.ง.ด. 1 (ภาษีบุคคล)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveGovReport('sso')}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all ${
                  activeGovReport === 'sso'
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-150/40'
                    : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                }`}
              >
                <Shield className="w-4 h-4 shrink-0 text-indigo-500" />
                <span>ใบส่งเงิน สปส. 1-10 (ประกันสังคม)</span>
              </button>
            </div>

            <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100/50 text-[10px] text-amber-700 space-y-1">
              <p className="font-bold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> ข้อมูลสำหรับการนำส่ง
              </p>
              <p className="leading-relaxed">
                ข้อมูลในแบบฟอร์มจะถูกรวบรวมแบบเรียลไทม์จากสลิปเงินเดือนทั้งหมดที่สร้างไว้ในงวดเดือนปัจจุบัน
              </p>
            </div>
            
            <button
              onClick={() => window.print()}
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              พิมพ์แบบรายงานนำส่ง
            </button>
          </div>

          {/* Form Paper Layout Area */}
          <div className="lg:col-span-3 bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden print:border-none print:shadow-none">
            {activeGovReport === 'pnd1' ? (
              /* PND 1 Form attachment layout */
              <div className="p-6 md:p-8 space-y-6 font-sans text-xs text-slate-800 print:p-0" id="printable-pnd1">
                {/* Gov Form Header */}
                <div className="flex flex-col md:flex-row justify-between items-start border-b-2 border-slate-800 pb-5 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-mono uppercase">
                        ภ.ง.ด. 1 (ใบแนบ)
                      </span>
                      <p className="text-[10px] text-slate-400">กรมสรรพากร กระทรวงการคลัง</p>
                    </div>
                    <h2 className="text-base font-extrabold text-slate-900 tracking-tight mt-1">
                      ใบแนบแบบแสดงรายการภาษีเงินได้หัก ณ ที่จ่าย
                    </h2>
                    <p className="text-[11px] text-slate-500 font-medium">
                      ตามมาตรา 50(1) แห่งประมวลรัษฎากร เฉพาะพนักงานที่จ่ายเงินได้ประเภทเงินเดือน/ค่าจ้าง
                    </p>
                  </div>
                  <div className="text-right space-y-1 md:self-end">
                    <p className="text-[11px] font-bold text-slate-700">
                      ประจำงวดเดือน: <span className="text-indigo-600 font-extrabold">{THAI_MONTHS[payMonth - 1]} {payYear + 543}</span>
                    </p>
                    <p className="text-[10px] text-slate-400">ชื่อนายจ้าง: บริษัท คุณชายสมุนไพร จำกัด</p>
                    <p className="text-[10px] text-slate-400 font-mono">เลขผู้เสียภาษีอากร: 0-1055-67000-01-0 (สำนักงานใหญ่)</p>
                  </div>
                </div>

                {/* Info summary row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-150">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">จำนวนรายชื่อผู้มีรายได้</span>
                    <span className="text-base font-extrabold text-slate-800 font-mono">{currentPayrolls.length} ราย</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">ยอดเงินได้สะสมที่จ่าย</span>
                    <span className="text-base font-extrabold text-slate-800 font-mono">฿{currentPayrolls.reduce((sum, pr) => sum + pr.baseSalary + pr.bonus, 0).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">ยอดภาษีหัก ณ ที่จ่ายรวม</span>
                    <span className="text-base font-extrabold text-rose-600 font-mono">฿{stats.totalTax.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">สถานะเอกสารนำส่ง</span>
                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 mt-1">
                      <Check className="w-3.5 h-3.5 stroke-[3px]" /> พร้อมนำส่ง E-Filing
                    </span>
                  </div>
                </div>

                {/* Table list */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full border-collapse text-left text-[11px] font-sans">
                    <thead>
                      <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold">
                        <th className="py-2.5 px-3 text-center w-12">ลำดับ</th>
                        <th className="py-2.5 px-3 w-36">เลขผู้เสียภาษีผู้มีรายได้ (13 หลัก)</th>
                        <th className="py-2.5 px-3">ชื่อ-นามสกุล พนักงาน</th>
                        <th className="py-2.5 px-3 text-center w-24">วันที่จ่ายเงิน</th>
                        <th className="py-2.5 px-3 text-right w-28">เงินได้สะสมครั้งนี้ (บาท)</th>
                        <th className="py-2.5 px-3 text-right w-24">ภาษีที่หักไว้ (บาท)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {currentPayrolls.map((pr, index) => {
                        const emp = employees.find(e => e.id === pr.employeeId);
                        const grossIncome = pr.baseSalary + pr.bonus;
                        return (
                          <tr key={pr.id} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-3 text-center font-mono">{index + 1}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-600">{emp?.taxId || '3-1005-00445-92-1'}</td>
                            <td className="py-2.5 px-3 font-bold text-slate-900">{pr.employeeName}</td>
                            <td className="py-2.5 px-3 text-center font-mono text-slate-500">
                              {pr.paymentDate ? pr.paymentDate.split('-').reverse().join('/') : '-'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-800">
                              {grossIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-rose-600">
                              {pr.taxDeduction.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      })}

                      {currentPayrolls.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">
                            ไม่มีข้อมูลการจ่ายเงินเดือนที่ได้รับการประมวลผลสำหรับจัดทำ ภ.ง.ด.1 ในงวดเดือนนี้
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                      <tr>
                        <td colSpan={4} className="py-3 px-3 text-right text-slate-800 text-xs">ยอดรวมสะสมทั้งสิ้น:</td>
                        <td className="py-3 px-3 text-right font-mono text-slate-900 text-xs">
                          ฿{currentPayrolls.reduce((sum, pr) => sum + pr.baseSalary + pr.bonus, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-rose-600 text-xs">
                          ฿{stats.totalTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Signature and Affirmation section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-100 text-[10px] text-slate-400">
                  <div className="space-y-2 leading-relaxed">
                    <p className="font-bold text-slate-500">คำยืนยันและการรับรองของผู้มีหน้าที่หักภาษี ณ ที่จ่าย:</p>
                    <p>
                      ขอยืนยันว่า รายละเอียดรายชื่อพนักงาน เงินเดือน และจำนวนเงินภาษีหัก ณ ที่จ่ายข้างต้นนี้ ได้รับการบันทึกตรวจสอบความถูกต้องทางบัญชีอย่างสมบูรณ์ และพร้อมนำส่งสรรพากรเพื่อประกอบการยื่นแบบ ภ.ง.ด.1 ประจำรอบภาษีปัจจุบัน
                    </p>
                  </div>
                  <div className="text-center space-y-8 md:self-end">
                    <div className="border-b border-slate-200 pb-2 w-48 mx-auto font-sans text-slate-700">
                      วิทยา รักดี
                    </div>
                    <p className="text-[10px] text-slate-500">(ลงชื่อผู้จัดทำ / กรรมการผู้มีอำนาจลงนาม / ประทับตราบริษัท)</p>
                  </div>
                </div>
              </div>
            ) : (
              /* SSO Form layout (สปส. 1-10) */
              <div className="p-6 md:p-8 space-y-6 font-sans text-xs text-slate-800 print:p-0" id="printable-sso">
                {/* Gov Form Header */}
                <div className="flex flex-col md:flex-row justify-between items-start border-b-2 border-slate-800 pb-5 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-mono uppercase">
                        สปส. 1-10 (ใบแนบ)
                      </span>
                      <p className="text-[10px] text-slate-400">สำนักงานประกันสังคม กระทรวงแรงงาน</p>
                    </div>
                    <h2 className="text-base font-extrabold text-slate-900 tracking-tight mt-1">
                      แบบแสดงรายการนำส่งเงินสมทบ (Attachment)
                    </h2>
                    <p className="text-[11px] text-slate-500 font-medium">
                      รายละเอียดการนำส่งสัดส่วนเงินสมทบพนักงาน 5% และสัดส่วนสมทบจากฝ่ายนายจ้าง 5% (รวมพนักงานทุกราย)
                    </p>
                  </div>
                  <div className="text-right space-y-1 md:self-end">
                    <p className="text-[11px] font-bold text-slate-700">
                      ประจำงวดเดือน: <span className="text-indigo-600 font-extrabold">{THAI_MONTHS[payMonth - 1]} {payYear + 543}</span>
                    </p>
                    <p className="text-[10px] text-slate-400">ชื่อสถานประกอบการ: บริษัท คุณชายสมุนไพร จำกัด</p>
                    <p className="text-[10px] text-slate-400 font-mono">เลขทะเบียนบัญชีนายจ้าง: 10-05567-0001 (สำนักงานใหญ่)</p>
                  </div>
                </div>

                {/* Info summary row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-150">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">จำนวนผู้ประกันตนทั้งหมด</span>
                    <span className="text-base font-extrabold text-slate-800 font-mono">
                      {currentPayrolls.filter(pr => pr.socialSecurity > 0).length} ราย
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">เงินสมทบส่วนลูกจ้าง (5%)</span>
                    <span className="text-base font-extrabold text-slate-800 font-mono">฿{stats.totalSso.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">เงินสมทบส่วนนายจ้าง (5%)</span>
                    <span className="text-base font-extrabold text-slate-800 font-mono">฿{stats.totalSso.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">ยอดนำส่งสปส. สุทธิรวม (10%)</span>
                    <span className="text-base font-extrabold text-amber-600 font-mono">฿{(stats.totalSso * 2).toLocaleString()}</span>
                  </div>
                </div>

                {/* Table list */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full border-collapse text-left text-[11px] font-sans">
                    <thead>
                      <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold">
                        <th className="py-2.5 px-3 text-center w-12">ลำดับ</th>
                        <th className="py-2.5 px-3 w-36">เลขบัตรประจำประชาชนผู้ประกันตน</th>
                        <th className="py-2.5 px-3">ชื่อ-นามสกุล ผู้ประกันตน</th>
                        <th className="py-2.5 px-3 text-right w-24">ค่าจ้างจริง</th>
                        <th className="py-2.5 px-3 text-right w-28">ค่าจ้างประเมินสมทบ</th>
                        <th className="py-2.5 px-3 text-right w-24">เงินสมทบสะสม</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {currentPayrolls.map((pr, index) => {
                        const emp = employees.find(e => e.id === pr.employeeId);
                        // Capping wages at minimum 1,650 and maximum 15,000 for SSO
                        const ssoBaseWages = pr.socialSecurity > 0 
                          ? Math.min(15000, Math.max(1650, pr.baseSalary))
                          : 0;
                        
                        return (
                          <tr key={pr.id} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-3 text-center font-mono">{index + 1}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-600">{emp?.taxId || '3-1005-00445-92-1'}</td>
                            <td className="py-2.5 px-3 font-bold text-slate-900">
                              {pr.employeeName} {pr.socialSecurity === 0 && <span className="text-[9px] bg-slate-100 text-slate-500 font-bold px-1.5 py-0.2 rounded ml-1">ยกเว้น (กรรมการ)</span>}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                              ฿{pr.baseSalary.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-800">
                              ฿{ssoBaseWages.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-amber-600">
                              ฿{pr.socialSecurity.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      })}

                      {currentPayrolls.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">
                            ไม่มีข้อมูลประกันสังคมสำหรับงวดเดือนปัจจุบัน
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                      <tr>
                        <td colSpan={4} className="py-3 px-3 text-right text-slate-800 text-xs">ยอดรวมสมทบสะสมนำส่ง:</td>
                        <td className="py-3 px-3 text-right font-mono text-slate-900 text-xs">
                          ฿{currentPayrolls.reduce((sum, pr) => {
                            const isDirector = pr.socialSecurity === 0;
                            return sum + (isDirector ? 0 : Math.min(15000, Math.max(1650, pr.baseSalary)));
                          }, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-amber-600 text-xs">
                          ฿{stats.totalSso.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Info about calculations */}
                <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl space-y-1 text-[10px] text-slate-500 leading-relaxed">
                  <p className="font-bold text-slate-700">* หมายเหตุและข้อกำหนดทางกฎหมายประกันสังคม (สปส.)</p>
                  <p>
                    1. ฐานค่าจ้างสูงสุดที่ใช้ประเมินประกันสังคมจำกัดที่ 15,000 บาท (เงินสมทบสูงสุด 5% = 750 บาท/พนักงาน) และฐานขั้นต่ำ 1,650 บาท
                  </p>
                  <p>
                    2. กรรมการบริษัท (Director) ไม่ได้อยู่ภายใต้เงื่อนไขมาตรา 33 ของพระราชบัญญัติประกันสังคม จึงได้รับการยกเว้นการหักเงินสมทบอัตโนมัติ
                  </p>
                  <p>
                    3. ฝ่ายนายจ้างมีหน้าที่ร่วมสมทบเป็นจำนวนเงินที่เท่ากัน (สัดส่วน 1:1) เพิ่มเติมอีก 5% เพื่อนำส่งประกันสังคมภายในวันที่ 15 ของเดือนถัดไป
                  </p>
                </div>

                {/* Representative panel */}
                <div className="flex justify-between items-center pt-4 border-t border-slate-100 text-[10px] text-slate-400">
                  <p>แบบรายงานนี้พร้อมจัดพิมพ์ เพื่อยื่นนำส่ง ณ สำนักงานประกันสังคมกรุงเทพมหานครพื้นที่/จังหวัด</p>
                  <p className="font-bold text-slate-700">บริษัท คุณชายสมุนไพร จำกัด (สำนักงานใหญ่)</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB: COMPREHENSIVE WAGE ANALYTICS */}
      {activeSubTab === 'analytics' && (
        <div className="space-y-6 animate-fade-in">
          {currentPayrolls.length > 0 ? (
            <>
              {/* Graphic charts row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Bar chart - Dept expenses */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">รายจ่ายตามโครงสร้างฝ่ายงาน (Departmental Share)</h4>
                    <p className="text-[11px] text-slate-500">เปรียบเทียบภาระยอดจ่ายสุทธิและค่าใช้จ่ายรวมแต่ละแผนกประจำงวด</p>
                  </div>
                  <div className="h-64 font-sans text-[11px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={deptData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" stroke="#94a3b8" tickLine={false} />
                        <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} tickFormatter={(v) => `฿${(v / 1000)}k`} />
                        <Tooltip formatter={(value) => [`฿${Number(value).toLocaleString()}`, '']} />
                        <Legend verticalAlign="top" height={36} iconType="circle" />
                        <Bar dataKey="รายจ่ายสุทธิ" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="รายจ่ายทั้งหมด" fill="#10B981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Pie chart - Compensation elements breakdown */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">สัดส่วนประเภทเงินได้ (Compensation Elements)</h4>
                    <p className="text-[11px] text-slate-500">จำแนกฐานเงินเดือนพื้นฐาน และรายได้พิเศษอื่นๆ ในงวดปัจจุบัน</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                    <div className="md:col-span-3 h-56 font-sans text-[11px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={breakDownData}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={80}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {breakDownData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => `฿${Number(value).toLocaleString()}`} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    
                    {/* Pie indicators legend */}
                    <div className="md:col-span-2 space-y-2.5">
                      {breakDownData.map((item, index) => (
                        <div key={index} className="flex flex-col space-y-0.5 border-l-2 pl-2" style={{ borderColor: item.color }}>
                          <span className="text-[10px] text-slate-400 font-bold">{item.name}</span>
                          <span className="text-xs font-extrabold text-slate-800 font-mono">
                            ฿{item.value.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom detail stats widgets */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Comp leaderboard */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-100">
                    บุคลากรรายรับสุทธิสูงสุด (Top Earners)
                  </h4>
                  <div className="space-y-3">
                    {topEarners.map((te, idx) => {
                      const emp = employees.find(e => e.id === te.employeeId);
                      return (
                        <div key={te.id} className="flex items-center justify-between py-1 border-b border-slate-50 last:border-none">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold flex items-center justify-center font-mono">
                              {idx + 1}
                            </span>
                            <div>
                              <p className="text-xs font-bold text-slate-800">{te.employeeName}</p>
                              <p className="text-[9px] text-slate-400">{emp?.role || 'พนักงาน'}</p>
                            </div>
                          </div>
                          <span className="text-xs font-extrabold text-slate-800 font-mono">
                            ฿{te.netSalary.toLocaleString()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Diligence statistics */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-100">
                    ดัชนีวินัยและการลาพนักงาน (Diligence Index)
                  </h4>
                  <div className="space-y-3.5 pt-1 text-[11px] font-medium text-slate-600">
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-slate-500">ได้รับเบี้ยขยันเต็มเกณฑ์ (1,000 บ.)</span>
                        <span className="font-extrabold text-emerald-600 font-mono">
                          {currentPayrolls.filter(pr => pr.diligenceAllowance === 1000).length} คน
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full"
                          style={{ width: `${(currentPayrolls.filter(pr => pr.diligenceAllowance === 1000).length / currentPayrolls.length) * 100}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-slate-500">ได้รับลดหย่อนบางส่วน (300-500 บ.)</span>
                        <span className="font-extrabold text-amber-500 font-mono">
                          {currentPayrolls.filter(pr => pr.diligenceAllowance && pr.diligenceAllowance > 0 && pr.diligenceAllowance < 1000).length} คน
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-amber-500 h-full rounded-full"
                          style={{ width: `${(currentPayrolls.filter(pr => pr.diligenceAllowance && pr.diligenceAllowance > 0 && pr.diligenceAllowance < 1000).length / currentPayrolls.length) * 100}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-slate-500">ลาสะสม/ไม่ได้รับเบี้ยขยัน (0 บ.)</span>
                        <span className="font-extrabold text-slate-400 font-mono">
                          {currentPayrolls.filter(pr => !pr.diligenceAllowance || pr.diligenceAllowance === 0).length} คน
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-slate-300 h-full rounded-full"
                          style={{ width: `${(currentPayrolls.filter(pr => !pr.diligenceAllowance || pr.diligenceAllowance === 0).length / currentPayrolls.length) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Comp average indicators */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4 flex flex-col justify-between">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-100 block">
                    ค่าเฉลี่ยและภาระสมทบรวมนายจ้าง
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-500 text-xs">เงินเดือนเฉลี่ย/คน (สุทธิ):</span>
                      <span className="font-mono text-slate-800 font-extrabold text-xs">
                        ฿{Math.round(stats.totalNet / (currentPayrolls.length || 1)).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-500 text-xs">เงินสมทบฝ่ายนายจ้างรวม:</span>
                      <span className="font-mono text-indigo-600 font-extrabold text-xs">
                        ฿{stats.totalSso.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-t border-slate-100 pt-2">
                      <span className="text-slate-800 font-bold text-xs">ต้นทุนพนักงานรวมงวดนี้:</span>
                      <span className="font-mono text-slate-900 font-extrabold text-xs">
                        ฿{(stats.totalGross + stats.totalSso).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 italic">
                    * รวมรายรับเงินเดือนพนักงานทั้งหมด + เงินสมทบประกันสังคมส่วนของบริษัท 5%
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white border border-slate-100 rounded-2xl py-12 px-4 text-center text-slate-400 text-xs">
              ยังไม่มีการประมวลผลข้อมูลเงินเดือนในเดือนนี้ จึงยังไม่สามารถเปิดใช้แดชบอร์ดสถิติได้
            </div>
          )}
        </div>
      )}

      {/* Printable high fidelity Payslip Modal */}
      {selectedSlip && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 md:p-8 max-w-2xl w-full border border-slate-100 shadow-xl space-y-6 max-h-[90vh] overflow-y-auto">
            
            {/* Modal actions panel */}
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 print:hidden">
              <h4 className="text-sm font-bold text-slate-800">ใบเสร็จรับเงิน / ใบจ่ายเงินเดือน (Payslip)</h4>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> พิมพ์ใบเสร็จ
                </button>
                <button onClick={() => setSelectedSlip(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Payslip Design */}
            <div className="space-y-6 font-sans print:p-0" id="printable-payslip">
              {/* Slip Header */}
              <div className="flex justify-between items-start border-b-2 border-slate-800 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight">ใบจ่ายเงินเดือนและบันทึกค่าตอบแทน</h2>
                  <p className="text-xs text-slate-500 font-medium">บริษัท คุณชายสมุนไพร จำกัด (สำนักงานใหญ่)</p>
                  <p className="text-[10px] text-slate-400 mt-1">เลขผู้เสียภาษีองค์กร: 0-1055-67000-01-0</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-bold px-2 py-1 bg-slate-100 rounded text-slate-800">
                    ID: {selectedSlip.id}
                  </span>
                  <p className="text-xs text-slate-500 mt-2">งวดเดือน: {THAI_MONTHS[selectedSlip.month - 1]} {selectedSlip.year}</p>
                </div>
              </div>

              {/* Employee Information */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="space-y-1">
                  <p className="text-slate-400">รหัสพนักงาน: <span className="font-mono text-slate-800 font-bold">{selectedSlip.employeeId}</span></p>
                  <p className="text-slate-400">ชื่อ-นามสกุล: <span className="font-bold text-slate-800">{selectedSlip.employeeName}</span></p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-slate-400">สถานะธนาคารโอน: <span className="font-medium text-slate-800">
                    {employees.find(e => e.id === selectedSlip.employeeId)?.bankAccount || 'ธนาคารกสิกรไทย'}
                  </span></p>
                  <p className="text-slate-400">สถานะการจ่ายเงิน: <span className="text-emerald-600 font-bold">
                    {selectedSlip.status === 'paid' ? 'โอนเงินเสร็จสมบูรณ์' : 'รอดำเนินการ'}
                  </span></p>
                </div>
              </div>

              {/* Earnings & Deductions Tables */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border border-slate-150 rounded-xl overflow-hidden text-xs">
                {/* Earnings */}
                <div className="divide-y divide-slate-100">
                  <div className="bg-slate-50 px-4 py-2 font-bold text-slate-800 border-r border-slate-150">รายการรายรับ (Earnings)</div>
                  <div className="px-4 py-2.5 flex justify-between border-r border-slate-150">
                    <span>เงินเดือนมูลฐาน (Base Salary)</span>
                    <span className="font-mono">฿{selectedSlip.baseSalary.toLocaleString()}</span>
                  </div>
                  
                  {/* Detailed Earnings if available */}
                  {selectedSlip.diligenceAllowance !== undefined || selectedSlip.otPay !== undefined || selectedSlip.otherBonus !== undefined ? (
                    <>
                      {(selectedSlip.diligenceAllowance || 0) > 0 && (
                        <div className="px-4 py-2.5 flex justify-between border-r border-slate-150 text-slate-600 font-medium">
                          <span>• เบี้ยขยัน (Diligence)</span>
                          <span className="font-mono text-slate-700">฿{selectedSlip.diligenceAllowance.toLocaleString()}</span>
                        </div>
                      )}
                      {(selectedSlip.otPay || 0) > 0 && (
                        <div className="px-4 py-2.5 flex justify-between border-r border-slate-150 text-slate-600 font-medium">
                          <span>• ค่าล่วงเวลา (OT {selectedSlip.otHours ? `${selectedSlip.otHours} ชม.` : ''})</span>
                          <span className="font-mono text-slate-700">฿{selectedSlip.otPay.toLocaleString()}</span>
                        </div>
                      )}
                      {(selectedSlip.otherBonus || 0) > 0 && (
                        <div className="px-4 py-2.5 flex justify-between border-r border-slate-150 text-slate-600 font-medium">
                          <span>• เงินโบนัสพิเศษ (Bonus)</span>
                          <span className="font-mono text-slate-700">฿{selectedSlip.otherBonus.toLocaleString()}</span>
                        </div>
                      )}
                      {/* Show a subtotal of earnings bonus if all are 0 but total bonus > 0 */}
                      {(selectedSlip.diligenceAllowance || 0) === 0 && (selectedSlip.otPay || 0) === 0 && (selectedSlip.otherBonus || 0) === 0 && selectedSlip.bonus > 0 && (
                        <div className="px-4 py-2.5 flex justify-between border-r border-slate-150 text-slate-600 font-medium">
                          <span>• รายรับพิเศษอื่นๆ</span>
                          <span className="font-mono text-slate-700">฿{selectedSlip.bonus.toLocaleString()}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    selectedSlip.bonus > 0 && (
                      <div className="px-4 py-2.5 flex justify-between border-r border-slate-150">
                        <span>เงินบวก / โบนัส (Bonus)</span>
                        <span className="font-mono">฿{selectedSlip.bonus.toLocaleString()}</span>
                      </div>
                    )
                  )}
                </div>

                {/* Deductions */}
                <div className="divide-y divide-slate-100">
                  <div className="bg-slate-50 px-4 py-2 font-bold text-slate-800">รายการรายหัก (Deductions)</div>
                  <div className="px-4 py-2.5 flex justify-between">
                    <span>หัก ประกันสังคม (Social Security)</span>
                    <span className="font-mono text-rose-600">-฿{selectedSlip.socialSecurity.toLocaleString()}</span>
                  </div>
                  <div className="px-4 py-2.5 flex justify-between">
                    <span>หัก ภาษี ณ ที่จ่ายประมาณการ (Tax)</span>
                    <span className="font-mono text-rose-600">-฿{selectedSlip.taxDeduction.toLocaleString()}</span>
                  </div>
                  {selectedSlip.otherDeductions > 0 && (
                    <div className="px-4 py-2.5 flex justify-between">
                      <span>รายการหักอื่นๆ</span>
                      <span className="font-mono text-rose-600">-฿{selectedSlip.otherDeductions.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Sub totals */}
              <div className="border-t-2 border-slate-800 pt-4 flex flex-col md:flex-row md:items-center justify-between text-xs gap-4">
                <div>
                  <p className="text-slate-400 font-sans">
                    * ได้รับการคำนวณและประมวลผลระบบสิทธิประโยชน์ประกันสังคมและหัก ณ ที่จ่ายครบถ้วน
                  </p>
                </div>
                <div className="bg-slate-900 text-white rounded-xl px-5 py-3 text-right">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">จำนวนเงินสุทธิหลังหัก (Net Salary Paid)</span>
                  <span className="text-lg font-bold font-sans">฿{selectedSlip.netSalary.toLocaleString()}</span>
                </div>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-6 pt-8 text-center text-[10px] text-slate-400">
                <div className="space-y-12">
                  <div className="border-b border-slate-200 pb-2 w-48 mx-auto font-sans text-slate-700">
                    วิทยา รักดี
                  </div>
                  <p>(ผู้จ่ายเงิน/ผู้จัดการฝ่ายการเงิน)</p>
                </div>
                <div className="space-y-12">
                  <div className="border-b border-slate-200 pb-2 w-48 mx-auto font-serif text-slate-300">
                    (ลงชื่อดิจิทัล)
                  </div>
                  <p>(ลายเซ็นพนักงานผู้รับเงิน)</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Custom Pay Payroll Confirmation Modal */}
      {payingPayroll && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-100 shadow-2xl p-6 text-xs font-sans space-y-4">
            <div className="flex items-center gap-3 text-indigo-600">
              <div className="p-2 bg-indigo-50 rounded-full">
                <DollarSign className="w-6 h-6 stroke-[2.5px]" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-800">ยืนยันการสั่งจ่ายเงินเดือน</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">ระบบจะบันทึกรายจ่ายและออกเลขที่สลิปอัตโนมัติ</p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">พนักงานผู้รับเงิน:</span>
                <span className="font-extrabold text-slate-800">คุณ {payingPayroll.employeeName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">งวดบัญชี:</span>
                <span className="font-semibold text-slate-600">{THAI_MONTHS[payingPayroll.month - 1]} {payingPayroll.year + 543}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">ยอดสุทธิหลังหัก:</span>
                <span className="font-mono text-emerald-600 font-bold text-sm">฿{payingPayroll.netSalary.toLocaleString()}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
              กดยืนยันการสั่งจ่ายเพื่อทำรายการ ระบบจะทำการเชื่อมโยงบัญชีรายจ่ายฝ่ายบุคคล และสร้างสลิปเงินเดือนฉบับสมบูรณ์ให้อัตโนมัติ
            </p>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setPayingPayroll(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  onPayPayroll(payingPayroll.id, new Date().toISOString().split('T')[0]);
                  setPayingPayroll(null);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl cursor-pointer transition-colors shadow-md shadow-indigo-600/10"
              >
                ยืนยันการทำรายการ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Delete Payroll Confirmation Modal */}
      {deletingPayrollRecord && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-100 shadow-2xl p-6 text-xs font-sans space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2 bg-rose-50 rounded-full">
                <X className="w-6 h-6 stroke-[2.5px]" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-800">ยืนยันการลบบันทึกสลิปเงินเดือน</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">การลบข้อมูลนี้อาจทำให้ตัวเลขยอดใช้จ่ายรวมคลาดเคลื่อน</p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">ชื่อพนักงาน:</span>
                <span className="font-extrabold text-slate-800">คุณ {deletingPayrollRecord.employeeName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">งวดสลิปเงินเดือน:</span>
                <span className="font-semibold text-slate-600">{THAI_MONTHS[deletingPayrollRecord.month - 1]} {deletingPayrollRecord.year + 543}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">จำนวนเงินสลิป:</span>
                <span className="font-mono text-slate-800 font-bold">฿{deletingPayrollRecord.netSalary.toLocaleString()}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
              คุณต้องการลบข้อมูลสลิปและประวัติเงินเดือนชุดนี้ใช่หรือไม่? ข้อมูลทั้งหมดจะสูญหายทันทีและไม่แสดงผลในรายงานงบดุล
            </p>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setDeletingPayrollRecord(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeletePayroll(deletingPayrollRecord.id);
                  setDeletingPayrollRecord(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl cursor-pointer transition-colors shadow-md shadow-rose-600/10"
              >
                ยืนยันการลบสลิป
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
