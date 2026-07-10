/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Building2,
  LayoutDashboard,
  Users,
  Wallet,
  DollarSign,
  Sparkles,
  Menu,
  X,
  Plus,
  PlusCircle,
  Calendar,
  AlertCircle,
  Sprout,
  ShoppingBag
} from 'lucide-react';
import { useCompanyData } from './hooks/useCompanyData';
import Dashboard from './components/Dashboard';
import HRManager from './components/HRManager';
import AccountingManager from './components/AccountingManager';
import PayrollManager from './components/PayrollManager';
import AIAssistant from './components/AIAssistant';
import HerbInventoryManager from './components/HerbInventoryManager';
import StoreIntegrator from './components/StoreIntegrator';
import {
  TransactionType,
  TransactionCategory,
  LeaveType,
  LeaveStatus,
  EmployeeStatus,
  Department
} from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Load custom state manager hooks
  const {
    employees,
    leaveRequests,
    transactions,
    payrollRecords,
    herbMaterials,
    herbProducts,
    productionLogs,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    addLeaveRequest,
    updateLeaveStatus,
    deleteLeaveRequest,
    addTransaction,
    deleteTransaction,
    updateTransaction,
    addPayrollRecord,
    payPayroll,
    deletePayroll,
    addHerbMaterial,
    deleteHerbMaterial,
    updateHerbMaterial,
    updateHerbMaterialStock,
    addHerbProduct,
    deleteHerbProduct,
    updateHerbProduct,
    produceProduct
  } = useCompanyData();

  // Dialog / Modal Overlay states for Quick Dashboard shortcuts
  const [showQuickTxModal, setShowQuickTxModal] = useState(false);
  const [showQuickLeaveModal, setShowQuickLeaveModal] = useState(false);

  // Quick form states
  const [quickTx, setQuickTx] = useState({
    type: TransactionType.INCOME,
    category: TransactionCategory.SALES,
    amount: 1000,
    description: '',
    referenceNo: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [quickLeave, setQuickLeave] = useState({
    employeeId: '',
    type: LeaveType.ANNUAL,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    reason: ''
  });

  // Automatically adjust sidebar on small screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // trigger initially
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Quick transaction form submit
  const handleQuickTxSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTx.description || quickTx.amount <= 0) {
      alert('กรุณากรอกคำอธิบายและจำนวนเงินสะสมให้ครบถ้วน');
      return;
    }
    addTransaction(quickTx);
    setShowQuickTxModal(false);
    // Reset
    setQuickTx({
      type: TransactionType.INCOME,
      category: TransactionCategory.SALES,
      amount: 1000,
      description: '',
      referenceNo: '',
      date: new Date().toISOString().split('T')[0]
    });
    // Direct user to accounting tab to see changes
    setActiveTab('accounting');
  };

  // Quick leave request submit
  const handleQuickLeaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickLeave.employeeId || !quickLeave.reason) {
      alert('กรุณาเลือกพนักงานและระบุจุดประสงค์ใบลา');
      return;
    }
    const emp = employees.find(e => e.id === quickLeave.employeeId);
    if (!emp) return;

    const start = new Date(quickLeave.startDate);
    const end = new Date(quickLeave.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const durationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    addLeaveRequest({
      employeeId: quickLeave.employeeId,
      employeeName: `${emp.firstName} ${emp.lastName}`,
      type: quickLeave.type,
      startDate: quickLeave.startDate,
      endDate: quickLeave.endDate,
      durationDays,
      reason: quickLeave.reason
    });

    setShowQuickLeaveModal(false);
    // Reset
    setQuickLeave({
      employeeId: '',
      type: LeaveType.ANNUAL,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      reason: ''
    });
    // Direct user to HR tab to see leave requests
    setActiveTab('hr');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex" id="main-container">
      
      {/* Sidebar Navigation */}
      <aside
        className={`bg-slate-900 text-slate-300 w-64 fixed inset-y-0 left-0 transform ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 lg:static transition-transform duration-300 ease-in-out z-30 flex flex-col border-r border-slate-800 shadow-xl`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center px-5 gap-2.5 border-b border-slate-800 bg-slate-950">
          <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-950/50 shrink-0">
            <Sprout className="w-5 h-5 text-emerald-100" />
          </div>
          <div>
            <h1 className="text-xs font-sans font-extrabold text-white tracking-tight leading-none">คุณชายสมุนไพร</h1>
            <span className="text-[9px] text-emerald-500 font-bold uppercase tracking-wider font-mono">KHON CHAI HERB</span>
          </div>
          {/* Mobile close sidebar button */}
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden ml-auto p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sidebar Tabs Links */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {/* Dashboard */}
          <button
            onClick={() => {
              setActiveTab('dashboard');
              if (window.innerWidth < 1024) setIsSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold font-sans tracking-tight transition-all text-left cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-emerald-700 text-white shadow-md shadow-emerald-700/10'
                : 'hover:bg-slate-800 hover:text-slate-100'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" /> ภาพรวมบริษัท (Dashboard)
          </button>

          {/* HR Management */}
          <button
            onClick={() => {
              setActiveTab('hr');
              if (window.innerWidth < 1024) setIsSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold font-sans tracking-tight transition-all text-left cursor-pointer ${
              activeTab === 'hr'
                ? 'bg-emerald-700 text-white shadow-md shadow-emerald-700/10'
                : 'hover:bg-slate-800 hover:text-slate-100'
            }`}
          >
            <Users className="w-4 h-4" /> ระบบบุคคล (HR & Leaves)
          </button>

          {/* Herb Inventory & Recipes */}
          <button
            onClick={() => {
              setActiveTab('herb_inventory');
              if (window.innerWidth < 1024) setIsSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold font-sans tracking-tight transition-all text-left cursor-pointer ${
              activeTab === 'herb_inventory'
                ? 'bg-emerald-700 text-white shadow-md shadow-emerald-700/10'
                : 'hover:bg-slate-800 hover:text-slate-100'
            }`}
          >
            <Sprout className="w-4 h-4" /> คลังวัตถุดิบและตำรับสมุนไพร
          </button>

          {/* E-commerce Stores Integration */}
          <button
            onClick={() => {
              setActiveTab('ecommerce');
              if (window.innerWidth < 1024) setIsSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold font-sans tracking-tight transition-all text-left cursor-pointer ${
              activeTab === 'ecommerce'
                ? 'bg-emerald-700 text-white shadow-md shadow-emerald-700/10'
                : 'hover:bg-slate-800 hover:text-slate-100'
            }`}
          >
            <ShoppingBag className="w-4 h-4" /> เชื่อมต่อร้านค้าออนไลน์ (Shopee/TikTok)
          </button>

          {/* Accounting ledger */}
          <button
            onClick={() => {
              setActiveTab('accounting');
              if (window.innerWidth < 1024) setIsSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold font-sans tracking-tight transition-all text-left cursor-pointer ${
              activeTab === 'accounting'
                ? 'bg-emerald-700 text-white shadow-md shadow-emerald-700/10'
                : 'hover:bg-slate-800 hover:text-slate-100'
            }`}
          >
            <Wallet className="w-4 h-4" /> สมุดบันทึกบัญชี (Ledger & P&L)
          </button>

          {/* Payroll records */}
          <button
            onClick={() => {
              setActiveTab('payroll');
              if (window.innerWidth < 1024) setIsSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold font-sans tracking-tight transition-all text-left cursor-pointer ${
              activeTab === 'payroll'
                ? 'bg-emerald-700 text-white shadow-md shadow-emerald-700/10'
                : 'hover:bg-slate-800 hover:text-slate-100'
            }`}
          >
            <DollarSign className="w-4 h-4" /> ระบบเงินเดือน (Payroll Hub)
          </button>

          {/* AI Advisor Chatbot */}
          <button
            onClick={() => {
              setActiveTab('ai');
              if (window.innerWidth < 1024) setIsSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold font-sans tracking-tight transition-all text-left cursor-pointer ${
              activeTab === 'ai'
                ? 'bg-gradient-to-r from-emerald-700 to-green-600 text-white shadow-md'
                : 'hover:bg-slate-800 hover:text-slate-100'
            }`}
          >
            <Sparkles className="w-4 h-4" /> ที่ปรึกษา AI (AI Specialist)
          </button>
        </nav>

        {/* Footer Credit */}
        <div className="p-4 border-t border-slate-800 text-[10px] text-slate-500 font-sans text-center">
          ระบบรวมศูนย์เพื่อวิสาหกิจขนาดกลาง
        </div>
      </aside>

      {/* Main content frame */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Dynamic header */}
        <header className="h-16 bg-white border-b border-slate-150 px-6 flex items-center justify-between shadow-xs shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-sm font-sans font-bold text-slate-800 capitalize tracking-tight">
              {activeTab === 'dashboard' && 'แดชบอร์ดสรุปวิเคราะห์ข้อมูลบริษัท'}
              {activeTab === 'hr' && 'ระบบบริหารจัดการทรัพยากรบุคคลและคำขอลาหยุด'}
              {activeTab === 'herb_inventory' && 'ระบบบริหารจัดการคลังวัตถุดิบและตำรับสมุนไพร - คุณชายสมุนไพร'}
              {activeTab === 'ecommerce' && 'ระบบเชื่อมต่อร้านค้าออนไลน์ Shopee & TikTok Shop'}
              {activeTab === 'accounting' && 'ระบบการเงิน บันทึกบัญชีแยกประเภท และงบกำไรขาดทุนจำลอง'}
              {activeTab === 'payroll' && 'ระบบคำนวณและสั่งจ่ายเงินเดือน (Payslips)'}
              {activeTab === 'ai' && 'ผู้ช่วย AI ที่ปรึกษาการเงินและบริหารงานไทย'}
            </h2>
          </div>

          <div className="text-right text-slate-400 text-xs font-mono font-bold hidden sm:block">
            {new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
          </div>
        </header>

        {/* Active viewport component render */}
        <main className="flex-1 overflow-y-auto p-6 max-w-7xl w-full mx-auto space-y-6">
          {activeTab === 'dashboard' && (
            <Dashboard
              employees={employees}
              leaveRequests={leaveRequests}
              transactions={transactions}
              payrollRecords={payrollRecords}
              setActiveTab={setActiveTab}
              onQuickAddTx={() => setShowQuickTxModal(true)}
              onQuickAddLeave={() => setShowQuickLeaveModal(true)}
              onAddTransaction={addTransaction}
            />
          )}

          {activeTab === 'hr' && (
            <HRManager
              employees={employees}
              leaveRequests={leaveRequests}
              onAddEmployee={addEmployee}
              onUpdateEmployee={updateEmployee}
              onDeleteEmployee={deleteEmployee}
              onAddLeaveRequest={addLeaveRequest}
              onUpdateLeaveStatus={updateLeaveStatus}
            />
          )}

          {activeTab === 'herb_inventory' && (
            <HerbInventoryManager
              herbMaterials={herbMaterials}
              herbProducts={herbProducts}
              productionLogs={productionLogs}
              onAddHerbMaterial={addHerbMaterial}
              onUpdateHerbMaterialStock={updateHerbMaterialStock}
              onAddHerbProduct={addHerbProduct}
              onProduceProduct={produceProduct}
              onDeleteHerbMaterial={deleteHerbMaterial}
              onUpdateHerbMaterial={updateHerbMaterial}
              onDeleteHerbProduct={deleteHerbProduct}
              onUpdateHerbProduct={updateHerbProduct}
            />
          )}

          {activeTab === 'ecommerce' && (
            <StoreIntegrator
              herbProducts={herbProducts}
              transactions={transactions}
              onAddTransaction={addTransaction}
              onUpdateHerbProduct={updateHerbProduct}
            />
          )}

          {activeTab === 'accounting' && (
            <AccountingManager
              transactions={transactions}
              onAddTransaction={addTransaction}
              onDeleteTransaction={deleteTransaction}
              onUpdateTransaction={updateTransaction}
            />
          )}

          {activeTab === 'payroll' && (
            <PayrollManager
              employees={employees}
              payrollRecords={payrollRecords}
              leaveRequests={leaveRequests}
              onAddPayrollRecord={addPayrollRecord}
              onPayPayroll={payPayroll}
              onDeletePayroll={deletePayroll}
            />
          )}

          {activeTab === 'ai' && (
            <AIAssistant
              employees={employees}
              leaveRequests={leaveRequests}
              transactions={transactions}
              payrollRecords={payrollRecords}
            />
          )}
        </main>
      </div>

      {/* Floating Modal for QUICK TRANSACTION */}
      {showQuickTxModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-slate-100 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="text-sm font-sans font-bold text-slate-800">ลงบัญชีรายรับ-รายจ่ายบริษัทด่วน</h4>
              <button onClick={() => setShowQuickTxModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleQuickTxSubmit} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-[11px] text-slate-500 font-bold mb-1">ประเภท</label>
                <div className="flex border border-slate-200 rounded-lg overflow-hidden h-8.5">
                  <button
                    type="button"
                    onClick={() => setQuickTx({
                      ...quickTx,
                      type: TransactionType.INCOME,
                      category: TransactionCategory.SALES
                    })}
                    className={`flex-1 text-center font-bold cursor-pointer ${
                      quickTx.type === TransactionType.INCOME ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600'
                    }`}
                  >
                    รายรับ (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickTx({
                      ...quickTx,
                      type: TransactionType.EXPENSE,
                      category: TransactionCategory.RENT
                    })}
                    className={`flex-1 text-center font-bold cursor-pointer ${
                      quickTx.type === TransactionType.EXPENSE ? 'bg-rose-600 text-white' : 'bg-white text-slate-600'
                    }`}
                  >
                    รายจ่าย (-)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 font-bold mb-1">หมวดหมู่</label>
                <select
                  value={quickTx.category}
                  onChange={(e) => setQuickTx({ ...quickTx, category: e.target.value as TransactionCategory })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                >
                  {quickTx.type === TransactionType.INCOME ? (
                    <>
                      <option value={TransactionCategory.SALES}>รายได้จากการขาย</option>
                      <option value={TransactionCategory.SERVICES}>รายได้ค่าบริการ</option>
                      <option value={TransactionCategory.INVESTMENT}>รายได้จากการลงทุน</option>
                      <option value={TransactionCategory.OTHER_INCOME}>รายรับอื่นๆ</option>
                    </>
                  ) : (
                    <>
                      <option value={TransactionCategory.SALARIES}>เงินเดือนและค่าจ้าง</option>
                      <option value={TransactionCategory.RENT}>ค่าเช่าสถานที่</option>
                      <option value={TransactionCategory.UTILITIES}>ค่าน้ำค่าไฟ/อินเทอร์เน็ต</option>
                      <option value={TransactionCategory.MARKETING_EXP}>ค่าการตลาด/โฆษณา</option>
                      <option value={TransactionCategory.OFFICE_SUPPLIES}>อุปกรณ์สำนักงาน</option>
                      <option value={TransactionCategory.TRAVEL}>ค่าเดินทาง/ขนส่ง</option>
                      <option value={TransactionCategory.TAX_EXP}>ภาษี/ธรรมเนียม</option>
                      <option value={TransactionCategory.OTHER_EXPENSE}>รายจ่ายอื่นๆ</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 font-bold mb-1">จำนวนเงิน (บาท) *</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={quickTx.amount}
                  onChange={(e) => setQuickTx({ ...quickTx, amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 font-bold mb-1">คำอธิบายรายการ *</label>
                <input
                  type="text"
                  required
                  placeholder="คำอธิบายสั้นๆ..."
                  value={quickTx.description}
                  onChange={(e) => setQuickTx({ ...quickTx, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowQuickTxModal(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg cursor-pointer"
                >
                  บันทึกด่วน
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Modal for QUICK LEAVE REQUEST */}
      {showQuickLeaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-slate-100 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="text-sm font-sans font-bold text-slate-800">ยื่นแบบฟอร์มลาหยุดพักผ่อนด่วน</h4>
              <button onClick={() => setShowQuickLeaveModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickLeaveSubmit} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-[11px] text-slate-500 font-bold mb-1">พนักงานผู้ยื่นขอลา *</label>
                <select
                  required
                  value={quickLeave.employeeId}
                  onChange={(e) => setQuickLeave({ ...quickLeave, employeeId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                >
                  <option value="">-- เลือกพนักงานในระบบ --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      [{emp.id}] {emp.firstName} {emp.lastName} ({emp.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 font-bold mb-1">ประเภทใบลา</label>
                <select
                  value={quickLeave.type}
                  onChange={(e) => setQuickLeave({ ...quickLeave, type: e.target.value as LeaveType })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                >
                  <option value={LeaveType.ANNUAL}>ลาพักร้อนประจำปี</option>
                  <option value={LeaveType.SICK}>ลาป่วย</option>
                  <option value={LeaveType.PERSONAL}>ลากิจจำเป็น</option>
                  <option value={LeaveType.MATERNITY}>ลาคลอดบุตร</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1">ตั้งแต่วันที่</label>
                  <input
                    type="date"
                    value={quickLeave.startDate}
                    onChange={(e) => setQuickLeave({ ...quickLeave, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1">ถึงวันที่</label>
                  <input
                    type="date"
                    value={quickLeave.endDate}
                    onChange={(e) => setQuickLeave({ ...quickLeave, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 font-bold mb-1">จุดประสงค์/เหตุผลการขอลาหยุด *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="ระบุความจำเป็น เช่น เดินทางต่างจังหวัด หรือแพทย์นัดรักษาตัว..."
                  value={quickLeave.reason}
                  onChange={(e) => setQuickLeave({ ...quickLeave, reason: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-sans"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowQuickLeaveModal(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg cursor-pointer"
                >
                  ยื่นใบลาหยุด
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
