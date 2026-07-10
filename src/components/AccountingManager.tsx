/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  Calendar,
  DollarSign,
  FileSpreadsheet,
  PieChart as PieIcon,
  BookOpen,
  X,
  Sparkles,
  Download,
  Edit,
  Receipt,
  Percent
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import {
  Transaction,
  TransactionType,
  TransactionCategory
} from '../types';
import ReceiptScanner from './ReceiptScanner';

interface AccountingManagerProps {
  transactions: Transaction[];
  onAddTransaction: (tx: Omit<Transaction, 'id'>) => void;
  onDeleteTransaction: (id: string) => void;
  onUpdateTransaction: (id: string, updated: Partial<Transaction>) => void;
}

export default function AccountingManager({
  transactions,
  onAddTransaction,
  onDeleteTransaction,
  onUpdateTransaction
}: AccountingManagerProps) {
  const [subTab, setSubTab] = useState<'ledger' | 'statement' | 'charts' | 'vat'>('ledger');
  
  // Transaction Ledger state
  const [txTypeFilter, setTxTypeFilter] = useState<'ALL' | 'income' | 'expense'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Form state
  const [isAddingTx, setIsAddingTx] = useState(false);
  const [isScanningReceipt, setIsScanningReceipt] = useState(false);
  const [newTx, setNewTx] = useState<Omit<Transaction, 'id'>>({
    date: new Date().toISOString().split('T')[0],
    type: TransactionType.INCOME,
    category: TransactionCategory.SALES,
    amount: 1000,
    description: '',
    referenceNo: '',
    hasVat: true,
    vatAmount: undefined
  });

  // Editing state
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  // Categories lists
  const incomeCategories = [
    TransactionCategory.SALES,
    TransactionCategory.SERVICES,
    TransactionCategory.INVESTMENT,
    TransactionCategory.OTHER_INCOME
  ];

  const expenseCategories = [
    TransactionCategory.SALARIES,
    TransactionCategory.RENT,
    TransactionCategory.UTILITIES,
    TransactionCategory.MARKETING_EXP,
    TransactionCategory.OFFICE_SUPPLIES,
    TransactionCategory.TRAVEL,
    TransactionCategory.TAX_EXP,
    TransactionCategory.OTHER_EXPENSE
  ];

  // Helper for automated categories list on type switch
  const currentCategoryList = newTx.type === TransactionType.INCOME ? incomeCategories : expenseCategories;

  // Filtered list
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const matchesType = txTypeFilter === 'ALL' || tx.type === txTypeFilter;
      const matchesCat = categoryFilter === 'ALL' || tx.category === categoryFilter;
      return matchesType && matchesCat;
    });
  }, [transactions, txTypeFilter, categoryFilter]);

  // VAT Report States (defaulting to June 2026 to align with seeded data)
  const [vatMonth, setVatMonth] = useState<number>(6);
  const [vatYear, setVatYear] = useState<number>(2026);

  // Filter transactions for the selected month and year for VAT calculation
  const monthlyVatTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const parts = tx.date.split('-');
      if (parts.length < 2) return false;
      const yr = parseInt(parts[0], 10);
      const mo = parseInt(parts[1], 10);
      return yr === vatYear && mo === vatMonth;
    });
  }, [transactions, vatMonth, vatYear]);

  // Compute base and VAT for each transaction in the selected month
  const vatCalculations = useMemo(() => {
    let totalSalesBase = 0;
    let totalSalesTax = 0;
    let totalPurchaseBase = 0;
    let totalPurchaseTax = 0;

    const salesList: Array<Transaction & { activeHasVat: boolean; base: number; vat: number }> = [];
    const purchaseList: Array<Transaction & { activeHasVat: boolean; base: number; vat: number }> = [];

    monthlyVatTransactions.forEach(tx => {
      // Determine if subject to VAT (using explicit toggle, or defaulting to true for valid categories)
      let activeHasVat = false;
      if (tx.hasVat !== undefined) {
        activeHasVat = tx.hasVat;
      } else {
        // Default to true for standard business operations (exclude salaries and corporate taxes)
        if (tx.category !== TransactionCategory.SALARIES && tx.category !== TransactionCategory.TAX_EXP) {
          activeHasVat = true;
        }
      }

      const totalAmount = tx.amount;
      let base = totalAmount;
      let vat = 0;

      if (activeHasVat) {
        vat = (totalAmount * 7) / 107;
        base = totalAmount - vat;
      }

      const txWithVatDetails = {
        ...tx,
        activeHasVat,
        base,
        vat
      };

      if (tx.type === 'income') {
        salesList.push(txWithVatDetails);
        totalSalesBase += base;
        totalSalesTax += vat;
      } else {
        // Purchases VAT report only includes operational costs (excludes salaries/taxes)
        if (tx.category !== TransactionCategory.SALARIES && tx.category !== TransactionCategory.TAX_EXP) {
          purchaseList.push(txWithVatDetails);
          totalPurchaseBase += base;
          totalPurchaseTax += vat;
        }
      }
    });

    const netVat = totalSalesTax - totalPurchaseTax;

    return {
      salesList,
      purchaseList,
      totalSalesBase,
      totalSalesTax,
      totalPurchaseBase,
      totalPurchaseTax,
      netVat
    };
  }, [monthlyVatTransactions]);

  // Export Monthly VAT Report to CSV
  const handleExportVatCSV = () => {
    const BOM = '\uFEFF';
    const headers = ['ประเภทภาษี', 'วันที่ทำรายการ', 'เลขที่ใบกำกับภาษี/อ้างอิง', 'รายละเอียดรายการ', 'จำนวนเงินรวม (Gross)', 'ฐานภาษี (Base)', 'ภาษีมูลค่าเพิ่ม (VAT 7%)'];
    
    const rows: string[] = [];
    
    // Sales Tax entries
    vatCalculations.salesList.forEach(item => {
      rows.push([
        'ภาษีขาย (Sales Tax)',
        item.date,
        item.referenceNo || '-',
        `"${item.description.replace(/"/g, '""')}"`,
        item.amount,
        item.base.toFixed(2),
        item.vat.toFixed(2)
      ].join(','));
    });
    
    // Purchase Tax entries
    vatCalculations.purchaseList.forEach(item => {
      rows.push([
        'ภาษีซื้อ (Purchase Tax)',
        item.date,
        item.referenceNo || '-',
        `"${item.description.replace(/"/g, '""')}"`,
        item.amount,
        item.base.toFixed(2),
        item.vat.toFixed(2)
      ].join(','));
    });
    
    rows.push('');
    rows.push(['สรุปยอดรวมประจำเดือน', '', '', '', '', '', ''].join(','));
    rows.push([`ยอดรวมฐานภาษีขาย: ${vatCalculations.totalSalesBase.toFixed(2)}`, `ภาษีขายรวม: ${vatCalculations.totalSalesTax.toFixed(2)}`, '', '', '', '', ''].join(','));
    rows.push([`ยอดรวมฐานภาษีซื้อ: ${vatCalculations.totalPurchaseBase.toFixed(2)}`, `ภาษีซื้อรวม: ${vatCalculations.totalPurchaseTax.toFixed(2)}`, '', '', '', '', ''].join(','));
    rows.push([`ภาษีมูลค่าเพิ่มสุทธิที่ต้องนำส่ง (หรือเครดิตภาษี): ${vatCalculations.netVat.toFixed(2)} (${vatCalculations.netVat >= 0 ? 'ชำระภาษี' : 'สิทธิ์ขอคืนภาษี'})`, '', '', '', '', '', ''].join(','));

    const csvContent = BOM + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `รายงานสรุปภาษีซื้อขาย_คุณชายสมุนไพร_ปี${vatYear}_เดือน${vatMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle transaction creation
  const handleCreateTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTx.description || newTx.amount <= 0) {
      alert('กรุณากรอกคำอธิบายและจำนวนเงินที่ถูกต้อง');
      return;
    }
    onAddTransaction(newTx);
    setIsAddingTx(false);
    // Reset form
    setNewTx({
      date: new Date().toISOString().split('T')[0],
      type: TransactionType.INCOME,
      category: TransactionCategory.SALES,
      amount: 1000,
      description: '',
      referenceNo: '',
      hasVat: true,
      vatAmount: undefined
    });
  };

  const startEditTransaction = (tx: Transaction) => {
    setEditingTxId(tx.id);
    setEditingTx({ ...tx });
  };

  const handleUpdateTransactionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx || !editingTxId) return;
    if (!editingTx.description || editingTx.amount <= 0) {
      alert('กรุณากรอกคำอธิบายและจำนวนเงินที่ถูกต้อง');
      return;
    }
    onUpdateTransaction(editingTxId, editingTx);
    setEditingTxId(null);
    setEditingTx(null);
  };

  // Export current filtered transactions to CSV file with Thai language support
  const handleExportCSV = () => {
    // UTF-8 Byte Order Mark (BOM) to support Excel reading Thai characters correctly
    const BOM = '\uFEFF';
    
    // Headers list
    const headers = ['วันที่ (Date)', 'ประเภท (Type)', 'หมวดหมู่ (Category)', 'จำนวนเงิน (Amount)', 'เลขที่อ้างอิง (Reference No)', 'รายละเอียด (Description)'];
    
    // Convert transaction rows
    const rows = filteredTransactions.map(tx => {
      const typeText = tx.type === 'income' ? 'รายรับ' : 'รายจ่าย';
      // Escaping quotes for CSV safety
      const cleanDesc = tx.description ? `"${tx.description.replace(/"/g, '""')}"` : '""';
      const cleanRef = tx.referenceNo ? `"${tx.referenceNo.replace(/"/g, '""')}"` : '""';
      const cleanCategory = `"${tx.category.replace(/"/g, '""')}"`;
      
      return [
        tx.date,
        typeText,
        cleanCategory,
        tx.amount,
        cleanRef,
        cleanDesc
      ].join(',');
    });
    
    const csvContent = BOM + [headers.join(','), ...rows].join('\n');
    
    // Download trigger
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `รายงานบัญชี_คุณชายสมุนไพร_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 1. Expense Breakdown chart data
  const expenseChartData = useMemo(() => {
    const expenseMap: Record<string, number> = {};
    
    // Initialize standard expense categories
    expenseCategories.forEach(cat => {
      expenseMap[cat] = 0;
    });

    transactions.forEach(tx => {
      if (tx.type === 'expense') {
        expenseMap[tx.category] = (expenseMap[tx.category] || 0) + tx.amount;
      }
    });

    return Object.keys(expenseMap)
      .map(cat => ({ name: cat, value: expenseMap[cat] }))
      .filter(item => item.value > 0); // Only keep categories with spending
  }, [transactions]);

  // 2. Profit and Loss statement structure
  const profitLossStatement = useMemo(() => {
    let totalRevenue = 0;
    let salariesCost = 0;
    let rentCost = 0;
    let utilitiesCost = 0;
    let marketingCost = 0;
    let otherExpenses = 0;

    transactions.forEach(tx => {
      if (tx.type === 'income') {
        totalRevenue += tx.amount;
      } else {
        switch (tx.category) {
          case TransactionCategory.SALARIES:
            salariesCost += tx.amount;
            break;
          case TransactionCategory.RENT:
            rentCost += tx.amount;
            break;
          case TransactionCategory.UTILITIES:
            utilitiesCost += tx.amount;
            break;
          case TransactionCategory.MARKETING_EXP:
            marketingCost += tx.amount;
            break;
          default:
            otherExpenses += tx.amount;
            break;
        }
      }
    });

    const totalExpenses = salariesCost + rentCost + utilitiesCost + marketingCost + otherExpenses;
    const grossIncome = totalRevenue - salariesCost; // Direct labor expense subtracted
    const operatingProfit = totalRevenue - totalExpenses;
    
    // Estimated Tax Calculations (Thailand SME bracket example: 15% on profits over 300,000 THB)
    const taxableIncome = Math.max(0, operatingProfit);
    const estimatedTax = taxableIncome > 300000 ? (taxableIncome - 300000) * 0.15 : 0;
    const netIncomeAfterTax = operatingProfit - estimatedTax;

    return {
      totalRevenue,
      salariesCost,
      rentCost,
      utilitiesCost,
      marketingCost,
      otherExpenses,
      totalExpenses,
      grossIncome,
      operatingProfit,
      estimatedTax,
      netIncomeAfterTax
    };
  }, [transactions]);

  // Colors for Recharts pie chart
  const COLORS = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#64748b'];

  return (
    <div className="space-y-6" id="accounting-manager-container">
      {/* Sub navigation tabs */}
      <div className="flex border-b border-slate-100 pb-px gap-6">
        <button
          onClick={() => setSubTab('ledger')}
          className={`pb-3 font-sans font-bold text-sm tracking-tight cursor-pointer transition-all border-b-2 px-1 ${
            subTab === 'ledger'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <span className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" /> สมุดบันทึกบัญชี (Ledger)
          </span>
        </button>
        <button
          onClick={() => setSubTab('statement')}
          className={`pb-3 font-sans font-bold text-sm tracking-tight cursor-pointer transition-all border-b-2 px-1 ${
            subTab === 'statement'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <span className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4" /> งบกำไรขาดทุนจำลอง (P&L Simulator)
          </span>
        </button>
        <button
          onClick={() => setSubTab('charts')}
          className={`pb-3 font-sans font-bold text-sm tracking-tight cursor-pointer transition-all border-b-2 px-1 ${
            subTab === 'charts'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <span className="flex items-center gap-2">
            <PieIcon className="w-4 h-4" /> โครงสร้างและสัดส่วนค่าใช้จ่าย
          </span>
        </button>
        <button
          onClick={() => setSubTab('vat')}
          className={`pb-3 font-sans font-bold text-sm tracking-tight cursor-pointer transition-all border-b-2 px-1 ${
            subTab === 'vat'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <span className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-emerald-600" /> สรุปรายงานภาษีซื้อ-ขาย (VAT)
          </span>
        </button>
      </div>

      {subTab === 'ledger' ? (
        <div className="space-y-4">
          {/* Filters & Control bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              {/* Type selector */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400 font-medium">ประเภทธุรกรรม:</span>
                <select
                  value={txTypeFilter}
                  onChange={(e) => {
                    setTxTypeFilter(e.target.value as any);
                    setCategoryFilter('ALL'); // Reset category because it depends on type
                  }}
                  className="py-2 px-3 border border-slate-200 rounded-xl text-xs bg-white text-slate-600 focus:outline-none"
                >
                  <option value="ALL">ทั้งหมด (รายรับ/จ่าย)</option>
                  <option value="income">รายรับพอร์ทัล</option>
                  <option value="expense">รายจ่ายบริษัท</option>
                </select>
              </div>

              {/* Category list filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400 font-medium">หมวดหมู่บัญชี:</span>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="py-2 px-3 border border-slate-200 rounded-xl text-xs bg-white text-slate-600 focus:outline-none"
                >
                  <option value="ALL">ทุกหมวดหมู่</option>
                  {txTypeFilter !== 'expense' && incomeCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                  {txTypeFilter !== 'income' && expenseCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              <button
                onClick={handleExportCSV}
                title="ส่งออกรายงานธุรกรรมเป็นไฟล์ CSV (Excel)"
                className="px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors md:w-auto w-full cursor-pointer"
              >
                <Download className="w-4 h-4" /> ส่งออก CSV
              </button>
              <button
                onClick={() => {
                  setIsScanningReceipt(!isScanningReceipt);
                  setIsAddingTx(false);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm cursor-pointer transition-colors md:w-auto w-full ${
                  isScanningReceipt
                    ? 'bg-emerald-800 text-white'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                <Sparkles className="w-4 h-4" /> สแกนบิลด้วย AI
              </button>
              <button
                onClick={() => {
                  setIsAddingTx(!isAddingTx);
                  setIsScanningReceipt(false);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm cursor-pointer transition-colors md:w-auto w-full ${
                  isAddingTx ? 'bg-indigo-800 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                }`}
              >
                <Plus className="w-4 h-4" /> บันทึกรายการใหม่
              </button>
            </div>
          </div>

          {/* AI OCR Receipt Scanner section */}
          {isScanningReceipt && (
            <div className="bg-emerald-50/10 border border-emerald-100/50 rounded-2xl p-1 shadow-xs">
              <ReceiptScanner
                onAddTransaction={onAddTransaction}
                onSuccess={() => setIsScanningReceipt(false)}
              />
            </div>
          )}

          {/* Add Transaction Drawer */}
          {isAddingTx && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-inner">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200">
                <h4 className="text-sm font-bold text-slate-800 font-sans">ลงสมุดบัญชีรายรับ-รายจ่ายรายวัน</h4>
                <button onClick={() => setIsAddingTx(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCreateTransaction} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1">ประเภทการลงบัญชี</label>
                  <div className="flex border border-slate-200 rounded-lg overflow-hidden h-8.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setNewTx({
                        ...newTx,
                        type: TransactionType.INCOME,
                        category: TransactionCategory.SALES
                      })}
                      className={`flex-1 text-center font-bold font-sans cursor-pointer ${
                        newTx.type === TransactionType.INCOME ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600'
                      }`}
                    >
                      รายรับ (+)
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewTx({
                        ...newTx,
                        type: TransactionType.EXPENSE,
                        category: TransactionCategory.SALARIES
                      })}
                      className={`flex-1 text-center font-bold font-sans cursor-pointer ${
                        newTx.type === TransactionType.EXPENSE ? 'bg-rose-600 text-white' : 'bg-white text-slate-600'
                      }`}
                    >
                      รายจ่าย (-)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1">หมวดหมู่รายการ</label>
                  <select
                    value={newTx.category}
                    onChange={(e) => setNewTx({ ...newTx, category: e.target.value as TransactionCategory })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white"
                  >
                    {currentCategoryList.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1">จำนวนเงิน (บาท) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newTx.amount}
                    onChange={(e) => setNewTx({ ...newTx, amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white font-mono"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[11px] text-slate-500 font-bold mb-1">คำอธิบายรายละเอียดรายการ *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ได้รับรายได้จากการเซ็นสัญญากลุ่มบริษัทคู่ค้าเฟสแรก"
                    value={newTx.description}
                    onChange={(e) => setNewTx({ ...newTx, description: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white font-sans"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1">เลขที่อ้างอิงใบเสร็จ/ใบกำกับ</label>
                  <input
                    type="text"
                    placeholder="e.g. IV-2026-003"
                    value={newTx.referenceNo}
                    onChange={(e) => setNewTx({ ...newTx, referenceNo: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1">วันที่ทำธุรกรรม</label>
                  <input
                    type="date"
                    value={newTx.date}
                    onChange={(e) => setNewTx({ ...newTx, date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white"
                  />
                </div>

                {/* VAT Setup Section */}
                <div className="md:col-span-3 bg-white/60 p-3 rounded-lg border border-slate-200 text-xs space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="new-tx-has-vat"
                      checked={!!newTx.hasVat && newTx.category !== TransactionCategory.SALARIES && newTx.category !== TransactionCategory.TAX_EXP}
                      disabled={newTx.category === TransactionCategory.SALARIES || newTx.category === TransactionCategory.TAX_EXP}
                      onChange={(e) => setNewTx({ ...newTx, hasVat: e.target.checked })}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer w-4 h-4"
                    />
                    <label htmlFor="new-tx-has-vat" className="font-bold text-slate-700 cursor-pointer flex items-center gap-1.5">
                      <Percent className="w-3.5 h-3.5 text-indigo-500" />
                      เปิดใช้งานการบันทึกภาษีมูลค่าเพิ่ม (7% VAT) สำหรับรายการนี้
                    </label>
                  </div>
                  
                  {newTx.hasVat && newTx.category !== TransactionCategory.SALARIES && newTx.category !== TransactionCategory.TAX_EXP && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-6 pt-1">
                      <div>
                        <span className="block text-[10px] text-slate-400 font-medium mb-1">รูปแบบภาษี</span>
                        <div className="flex gap-2">
                          <label className="flex items-center gap-1 cursor-pointer font-bold text-slate-600">
                            <input
                              type="radio"
                              name="new-vat-type"
                              defaultChecked
                              className="text-indigo-600 focus:ring-indigo-500"
                            />
                            <span>รวมในราคาสินค้า (Vat Included)</span>
                          </label>
                        </div>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-400 font-medium mb-1">จำนวนภาษี (คำนวณอัตโนมัติ: 7%)</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-indigo-600">
                            ฿{((newTx.amount * 7) / 107).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="text-slate-400 text-[10px]">
                            (จากยอดฐานเงินก่อนภาษี ฿{((newTx.amount * 100) / 107).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  {(newTx.category === TransactionCategory.SALARIES || newTx.category === TransactionCategory.TAX_EXP) && (
                    <p className="text-[10px] text-slate-400 pl-6">
                      * รายการหมวดหมู่ '{newTx.category}' ไม่ได้รับอนุญาตให้คำนวณภาษีมูลค่าเพิ่มตามประมวลรัษฎากร
                    </p>
                  )}
                </div>

                <div className="flex gap-2 justify-end md:col-span-3 mt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingTx(false)}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg text-xs text-slate-700 cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs text-white font-bold cursor-pointer"
                  >
                    ลงรายการบัญชี
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Edit Transaction Drawer */}
          {editingTxId && editingTx && (
            <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-5 shadow-inner mb-4 animate-fadeIn">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-amber-200">
                <div className="flex items-center gap-1.5 text-amber-800">
                  <Edit className="w-4 h-4 text-amber-600" />
                  <h4 className="text-sm font-bold font-sans">แก้ไขรายละเอียดรายการบัญชี ({editingTxId})</h4>
                </div>
                <button onClick={() => { setEditingTxId(null); setEditingTx(null); }} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleUpdateTransactionSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1">ประเภทการลงบัญชี</label>
                  <div className="flex border border-slate-200 rounded-lg overflow-hidden h-8.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setEditingTx({
                        ...editingTx,
                        type: TransactionType.INCOME,
                        category: TransactionCategory.SALES
                      })}
                      className={`flex-1 text-center font-bold font-sans cursor-pointer ${
                        editingTx.type === TransactionType.INCOME ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600'
                      }`}
                    >
                      รายรับ (+)
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingTx({
                        ...editingTx,
                        type: TransactionType.EXPENSE,
                        category: TransactionCategory.SALARIES
                      })}
                      className={`flex-1 text-center font-bold font-sans cursor-pointer ${
                        editingTx.type === TransactionType.EXPENSE ? 'bg-rose-600 text-white' : 'bg-white text-slate-600'
                      }`}
                    >
                      รายจ่าย (-)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1">หมวดหมู่รายการ</label>
                  <select
                    value={editingTx.category}
                    onChange={(e) => setEditingTx({ ...editingTx, category: e.target.value as TransactionCategory })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white"
                  >
                    {(editingTx.type === TransactionType.INCOME ? incomeCategories : expenseCategories).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1">จำนวนเงิน (บาท) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={editingTx.amount}
                    onChange={(e) => setEditingTx({ ...editingTx, amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white font-mono font-bold text-slate-800"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[11px] text-slate-500 font-bold mb-1">คำอธิบายรายละเอียดรายการ *</label>
                  <input
                    type="text"
                    required
                    value={editingTx.description}
                    onChange={(e) => setEditingTx({ ...editingTx, description: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white font-sans"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1">เลขที่อ้างอิงใบเสร็จ/ใบกำกับ</label>
                  <input
                    type="text"
                    value={editingTx.referenceNo || ''}
                    onChange={(e) => setEditingTx({ ...editingTx, referenceNo: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1">วันที่ทำธุรกรรม</label>
                  <input
                    type="date"
                    value={editingTx.date}
                    onChange={(e) => setEditingTx({ ...editingTx, date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white"
                  />
                </div>

                {/* VAT Setup Section for Edit */}
                <div className="md:col-span-3 bg-white/60 p-3 rounded-lg border border-slate-200 text-xs space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="edit-tx-has-vat"
                      checked={!!editingTx.hasVat && editingTx.category !== TransactionCategory.SALARIES && editingTx.category !== TransactionCategory.TAX_EXP}
                      disabled={editingTx.category === TransactionCategory.SALARIES || editingTx.category === TransactionCategory.TAX_EXP}
                      onChange={(e) => setEditingTx({ ...editingTx, hasVat: e.target.checked })}
                      className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer w-4 h-4"
                    />
                    <label htmlFor="edit-tx-has-vat" className="font-bold text-slate-700 cursor-pointer flex items-center gap-1.5">
                      <Percent className="w-3.5 h-3.5 text-amber-500" />
                      เปิดใช้งานการบันทึกภาษีมูลค่าเพิ่ม (7% VAT) สำหรับรายการนี้
                    </label>
                  </div>
                  
                  {editingTx.hasVat && editingTx.category !== TransactionCategory.SALARIES && editingTx.category !== TransactionCategory.TAX_EXP && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-6 pt-1">
                      <div>
                        <span className="block text-[10px] text-slate-400 font-medium mb-1">รูปแบบภาษี</span>
                        <div className="flex gap-2">
                          <label className="flex items-center gap-1 cursor-pointer font-bold text-slate-600">
                            <input
                              type="radio"
                              name="edit-vat-type"
                              defaultChecked
                              className="text-amber-600 focus:ring-amber-500"
                            />
                            <span>รวมในราคาสินค้า (Vat Included)</span>
                          </label>
                        </div>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-400 font-medium mb-1">จำนวนภาษี (คำนวณอัตโนมัติ: 7%)</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-amber-700">
                            ฿{((editingTx.amount * 7) / 107).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="text-slate-400 text-[10px]">
                            (จากยอดฐานเงินก่อนภาษี ฿{((editingTx.amount * 100) / 107).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  {(editingTx.category === TransactionCategory.SALARIES || editingTx.category === TransactionCategory.TAX_EXP) && (
                    <p className="text-[10px] text-slate-400 pl-6">
                      * รายการหมวดหมู่ '{editingTx.category}' ไม่ได้รับอนุญาตให้คำนวณภาษีมูลค่าเพิ่มตามประมวลรัษฎากร
                    </p>
                  )}
                </div>

                <div className="flex gap-2 justify-end md:col-span-3 mt-1">
                  <button
                    type="button"
                    onClick={() => { setEditingTxId(null); setEditingTx(null); }}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg text-xs text-slate-700 cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg text-xs text-white font-bold cursor-pointer"
                  >
                    อัปเดตข้อมูลรายการ
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Transactions Ledger Book */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 text-xs font-medium">
                    <th className="py-2 pb-3">วันที่</th>
                    <th className="py-2 pb-3">เลขที่อ้างอิง</th>
                    <th className="py-2 pb-3">ประเภท</th>
                    <th className="py-2 pb-3">หมวดหมู่บัญชี</th>
                    <th className="py-2 pb-3">รายละเอียดคำอธิบาย</th>
                    <th className="py-2 pb-3 text-right">จำนวนเงิน (฿)</th>
                    <th className="py-2 pb-3 text-right">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="text-slate-700 hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 font-mono text-xs text-slate-500">{tx.date}</td>
                      <td className="py-3 font-mono text-xs text-slate-400 font-medium">{tx.referenceNo || '-'}</td>
                      <td className="py-3 text-xs">
                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                          tx.type === 'income' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}>
                          {tx.type === 'income' ? 'รายรับ' : 'รายจ่าย'}
                        </span>
                      </td>
                      <td className="py-3 text-xs font-bold text-slate-700">
                        {tx.category}
                      </td>
                      <td className="py-3 max-w-xs text-xs text-slate-600 truncate" title={tx.description}>
                        {tx.description}
                      </td>
                      <td className={`py-3 text-right font-sans font-bold text-xs ${
                        tx.type === 'income' ? 'text-emerald-600' : 'text-slate-800'
                      }`}>
                        {tx.type === 'income' ? '+' : '-'}{tx.amount.toLocaleString()}
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => startEditTransaction(tx)}
                            title="แก้ไขรายการ"
                            className="text-slate-400 hover:text-amber-600 p-1 rounded hover:bg-amber-50 transition-colors cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteTransaction(tx.id)}
                            title="ลบรายการ"
                            className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredTransactions.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 text-xs font-sans">
                        ไม่พบรายการงวดและกิจกรรมการเงินที่ระบุ
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : subTab === 'statement' ? (
        /* Dynamic Profit & Loss statement simulation */
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-800 font-sans">งบกำไรขาดทุนจำลอง (SME P&L Statement Simulator)</h3>
                <p className="text-xs text-slate-400">คำนวณกำไรตามกิจกรรมทางการเงินและหักพารามิเตอร์ภาษีประมาณการ</p>
              </div>
              <span className="text-xs px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg font-mono font-bold">
                รอบปีบัญชี 2026
              </span>
            </div>

            <div className="space-y-4 font-sans max-w-3xl">
              {/* Revenue section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm font-bold text-slate-800">
                  <span>1. รายได้จากการประกอบกิจการ (Total Revenue)</span>
                  <span className="text-emerald-600">฿{profitLossStatement.totalRevenue.toLocaleString()}</span>
                </div>
                <div className="pl-4 text-xs text-slate-500 space-y-1">
                  <div className="flex justify-between">
                    <span>- รายได้จากการจัดจำหน่ายหลัก (Sales)</span>
                    <span>฿{transactions.filter(tx => tx.category === TransactionCategory.SALES).reduce((acc, c) => acc + c.amount, 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>- รายได้ค่าบริการให้คำปรึกษา/สัญญาจ้าง (Services)</span>
                    <span>฿{transactions.filter(tx => tx.category === TransactionCategory.SERVICES).reduce((acc, c) => acc + c.amount, 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Direct salary labor cost */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between text-sm text-slate-700">
                  <span>หัก ต้นทุนทางตรง - เงินเดือนและค่าจ้างพนักงาน (Labor Cost)</span>
                  <span className="font-mono">- ฿{profitLossStatement.salariesCost.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm font-bold text-slate-800 bg-slate-50/50 p-2 rounded-lg">
                  <span>กำไรขั้นต้นจำลอง (Simulated Gross Profit)</span>
                  <span className={profitLossStatement.grossIncome >= 0 ? 'text-indigo-600' : 'text-rose-600'}>
                    ฿{profitLossStatement.grossIncome.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Overhead operating expenses */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="text-sm font-bold text-slate-800 block">2. ค่าใช้จ่ายในการบริหารและการตลาด (OPEX)</span>
                <div className="pl-4 text-xs text-slate-500 space-y-1">
                  <div className="flex justify-between">
                    <span>- ค่าเช่าอาคารสำนักงาน (Rent Expense)</span>
                    <span>฿{profitLossStatement.rentCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>- ค่าสาธารณูปโภคและสื่อสาร (Utilities & Internet)</span>
                    <span>฿{profitLossStatement.utilitiesCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>- ค่าโฆษณาและการตลาด (Marketing / Ad Spend)</span>
                    <span>฿{profitLossStatement.marketingCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>- ค่าใช้จ่ายจิปาถะ / ภาษีธรรมเนียมอื่น ๆ</span>
                    <span>฿{profitLossStatement.otherExpenses.toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm font-medium text-slate-700">
                  <span>รวมค่าใช้จ่ายในการบริหารจัดการสะสม (Total OPEX)</span>
                  <span className="font-mono text-slate-800">฿{(profitLossStatement.totalExpenses - profitLossStatement.salariesCost).toLocaleString()}</span>
                </div>
              </div>

              {/* Operating income */}
              <div className="space-y-2 pt-4 border-t-2 border-slate-200">
                <div className="flex items-center justify-between text-sm font-bold text-slate-900 bg-indigo-50 p-2.5 rounded-xl">
                  <span>กำไรจากการดำเนินงานก่อนหักภาษี (EBIT)</span>
                  <span className={profitLossStatement.operatingProfit >= 0 ? 'text-indigo-700' : 'text-rose-700'}>
                    ฿{profitLossStatement.operatingProfit.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Taxes computation */}
              <div className="space-y-2 pl-2 text-xs text-slate-500">
                <div className="flex justify-between">
                  <span>หัก ภาษีเงินได้นิติบุคคลประมาณการ (SME Tax Bracket 15% on profits &gt; ฿300k)</span>
                  <span className="font-mono text-rose-600">- ฿{profitLossStatement.estimatedTax.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-slate-800 pt-2 border-t border-dashed border-slate-200">
                  <span>กำไรสุทธิหลังหักภาษีจำลอง (Simulated Net Profit)</span>
                  <span className="text-emerald-600">฿{profitLossStatement.netIncomeAfterTax.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : subTab === 'charts' ? (
        /* Expenses Structure and Distribution */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Recharts Pie Chart */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div>
              <h4 className="text-sm font-bold text-slate-800 font-sans">โครงสร้างการจัดสรรงบประมาณรายจ่าย</h4>
              <p className="text-xs text-slate-400 font-sans">สรุปการลงทุนในพาร์ทต่างๆ ของกิจการ</p>
            </div>

            {expenseChartData.length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {expenseChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => `฿${Number(value).toLocaleString()}`} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs">
                ไม่มีรายจ่ายในงวดบัญชีนี้ให้แสดงโครงสร้างการลงทุน
              </div>
            )}
          </div>

          {/* Table representation with precise values */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div>
              <h4 className="text-sm font-bold text-slate-800 font-sans">ตารางจำแนกรายจ่ายบริษัทสะสม</h4>
              <p className="text-xs text-slate-400 font-sans">แจกแจงเม็ดเงินแต่ละหมวดหมู่บัญชีตามจริง</p>
            </div>

            <div className="space-y-3">
              {expenseCategories.map((cat, idx) => {
                const total = transactions
                  .filter(tx => tx.type === 'expense' && tx.category === cat)
                  .reduce((sum, current) => sum + current.amount, 0);

                const percent = profitLossStatement.totalExpenses > 0 
                  ? (total / profitLossStatement.totalExpenses) * 100 
                  : 0;

                return (
                  <div key={cat} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-sans">
                      <span className="font-semibold text-slate-600 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                        {cat}
                      </span>
                      <span className="font-mono text-slate-800 font-bold">
                        ฿{total.toLocaleString()} ({percent.toFixed(1)}%)
                      </span>
                    </div>
                    {/* Visual Progress Bar */}
                    <div className="w-full bg-slate-50 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${percent}%`, backgroundColor: COLORS[idx % COLORS.length] }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* VAT Monthly Summary Report Tab (ภาษีซื้อ-ภาษีขาย รายเดือน สรุปยอดอัตโนมัติ) */
        <div className="space-y-6 animate-fadeIn">
          {/* Header Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <span className="text-xs text-slate-500 font-bold font-sans">รอบบัญชีภาษีประจำเดือน:</span>
              </div>
              
              <div className="flex items-center gap-2">
                <select
                  value={vatMonth}
                  onChange={(e) => setVatMonth(Number(e.target.value))}
                  className="py-1.5 px-3 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 font-bold font-sans cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value={1}>มกราคม (Jan)</option>
                  <option value={2}>กุมภาพันธ์ (Feb)</option>
                  <option value={3}>มีนาคม (Mar)</option>
                  <option value={4}>เมษายน (Apr)</option>
                  <option value={5}>พฤษภาคม (May)</option>
                  <option value={6}>มิถุนายน (Jun)</option>
                  <option value={7}>กรกฎาคม (Jul)</option>
                  <option value={8}>สิงหาคม (Aug)</option>
                  <option value={9}>กันยายน (Sep)</option>
                  <option value={10}>ตุลาคม (Oct)</option>
                  <option value={11}>พฤศจิกายน (Nov)</option>
                  <option value={12}>ธันวาคม (Dec)</option>
                </select>

                <select
                  value={vatYear}
                  onChange={(e) => setVatYear(Number(e.target.value))}
                  className="py-1.5 px-3 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 font-bold font-sans cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value={2024}>2024 (พ.ศ. 2567)</option>
                  <option value={2025}>2025 (พ.ศ. 2568)</option>
                  <option value={2026}>2026 (พ.ศ. 2569)</option>
                  <option value={2027}>2027 (พ.ศ. 2570)</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 w-full md:w-auto">
              <button
                onClick={handleExportVatCSV}
                className="px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors md:w-auto w-full cursor-pointer"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                ส่งออกรายงานภาษีสรุป (CSV)
              </button>
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Sales VAT Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 opacity-10">
                <TrendingUp className="w-16 h-16 text-indigo-600" />
              </div>
              <span className="text-xs text-slate-400 font-bold font-sans block mb-1">ฝั่งภาษีขาย (Sales Tax Summary)</span>
              <h3 className="text-2xl font-bold text-slate-800 font-sans tracking-tight">
                ฿{vatCalculations.totalSalesTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <div className="mt-2 text-xs text-slate-500 flex justify-between font-mono">
                <span>ฐานภาษีขายรวม:</span>
                <span className="font-bold text-indigo-600">฿{vatCalculations.totalSalesBase.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">* คำนวณจากยอดรับชำระค่าสมุนไพรและค่าบริการ 7% VAT</p>
            </div>

            {/* Purchase VAT Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 opacity-10">
                <TrendingDown className="w-16 h-16 text-rose-600" />
              </div>
              <span className="text-xs text-slate-400 font-bold font-sans block mb-1">ฝั่งภาษีซื้อ (Purchase Tax Summary)</span>
              <h3 className="text-2xl font-bold text-slate-800 font-sans tracking-tight">
                ฿{vatCalculations.totalPurchaseTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <div className="mt-2 text-xs text-slate-500 flex justify-between font-mono">
                <span>ฐานภาษีซื้อรวม:</span>
                <span className="font-bold text-rose-600">฿{vatCalculations.totalPurchaseBase.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">* หักเฉพาะรายจ่ายที่ได้รับใบกำกับภาษีเต็มรูปแบบ (ไม่รวมเงินเดือน)</p>
            </div>

            {/* Net VAT Balance Card */}
            <div className={`p-5 rounded-2xl border shadow-sm relative overflow-hidden transition-all ${
              vatCalculations.netVat >= 0
                ? 'bg-amber-50/50 border-amber-200 text-amber-900'
                : 'bg-emerald-50/50 border-emerald-200 text-emerald-900'
            }`}>
              <div className="absolute top-0 right-0 p-3 opacity-10">
                <Receipt className="w-16 h-16 text-slate-600" />
              </div>
              <span className="text-xs font-bold font-sans block mb-1">
                {vatCalculations.netVat >= 0 ? 'ภาษีมูลค่าเพิ่มที่ต้องชำระ (Net VAT Payable)' : 'ภาษีซื้อคงเหลือเครดิตสะสม (Net VAT Refundable)'}
              </span>
              <h3 className="text-2xl font-bold font-sans tracking-tight">
                ฿{Math.abs(vatCalculations.netVat).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <div className="mt-2 text-xs flex justify-between font-sans">
                <span>ผลสรุปดุลบัญชี:</span>
                <span className={`font-bold font-mono px-2 py-0.5 rounded-full text-[10px] ${
                  vatCalculations.netVat >= 0 ? 'bg-amber-200 text-amber-800' : 'bg-emerald-200 text-emerald-800'
                }`}>
                  {vatCalculations.netVat >= 0 ? 'ต้องนำส่งกรมสรรพากร' : 'เครดิตภาษีใช้เดือนถัดไป'}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                {vatCalculations.netVat >= 0 
                  ? '* ยอดภาษีขายมากกว่าภาษีซื้อ ต้องยื่นส่งแบบ ภ.พ. 30' 
                  : '* ยอดภาษีซื้อสะสมมากกว่าภาษีขาย ได้สิทธิ์ลดหย่อนเครดิตภาษี'}
              </p>
            </div>
          </div>

          {/* Simulated ภ.พ.30 Thai Revenue Department Form */}
          <div className="bg-amber-50/20 border border-amber-100 rounded-2xl p-6 shadow-sm space-y-4 max-w-4xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/60 pb-3">
              <div>
                <span className="text-[10px] bg-amber-600 text-white font-bold px-2 py-0.5 rounded font-sans">แบบยื่นรายการ ภ.พ. 30</span>
                <h4 className="text-sm font-bold text-slate-800 font-sans mt-1">ใบจำลองแบบแสดงรายการภาษีมูลค่าเพิ่ม (กรมสรรพากร)</h4>
                <p className="text-[11px] text-slate-500">คุณชายสมุนไพร - ทะเบียนภาษีมูลค่าเพิ่มผู้ประกอบการ</p>
              </div>
              <div className="text-right text-xs">
                <span className="font-sans text-slate-500 block">รอบระยะเวลาภาษี</span>
                <span className="font-bold text-indigo-700 font-sans">เดือนที่ {vatMonth} ปีพ.ศ. {vatYear + 543}</span>
              </div>
            </div>

            <div className="space-y-2 text-xs font-sans">
              <div className="grid grid-cols-12 gap-2 py-1.5 border-b border-slate-100 font-bold text-slate-700">
                <div className="col-span-8">รายการคำนวณฐานภาษีและภาษีมูลค่าเพิ่ม</div>
                <div className="col-span-4 text-right">จำนวนเงิน (บาท)</div>
              </div>

              {/* Row 1 */}
              <div className="grid grid-cols-12 gap-2 py-2 border-b border-slate-50 text-slate-600">
                <div className="col-span-8 flex items-start gap-1">
                  <span>1.</span>
                  <span>ยอดขายทั้งสิ้นในเดือนนี้ (ฐานภาษีขาย)</span>
                </div>
                <div className="col-span-4 text-right font-mono font-bold text-slate-800">
                  {vatCalculations.totalSalesBase.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>

              {/* Row 2 */}
              <div className="grid grid-cols-12 gap-2 py-2 border-b border-slate-50 text-slate-600">
                <div className="col-span-8 flex items-start gap-1">
                  <span>2.</span>
                  <span>ภาษีขายในเดือนนี้ (7% ของยอดขายที่ต้องเสียภาษี)</span>
                </div>
                <div className="col-span-4 text-right font-mono font-bold text-indigo-600">
                  {vatCalculations.totalSalesTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>

              {/* Row 3 */}
              <div className="grid grid-cols-12 gap-2 py-2 border-b border-slate-50 text-slate-600">
                <div className="col-span-8 flex items-start gap-1">
                  <span>3.</span>
                  <span>ยอดซื้อทั้งสิ้นที่นำมาคำนวณภาษีซื้อได้ (ฐานภาษีซื้อ)</span>
                </div>
                <div className="col-span-4 text-right font-mono font-bold text-slate-800">
                  {vatCalculations.totalPurchaseBase.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>

              {/* Row 4 */}
              <div className="grid grid-cols-12 gap-2 py-2 border-b border-slate-50 text-slate-600">
                <div className="col-span-8 flex items-start gap-1">
                  <span>4.</span>
                  <span>ภาษีซื้อในเดือนนี้ (ที่มีสิทธิ์หักภาษีซื้อตามจริง)</span>
                </div>
                <div className="col-span-4 text-right font-mono font-bold text-rose-600">
                  {vatCalculations.totalPurchaseTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>

              {/* Row 5 - Results */}
              <div className="grid grid-cols-12 gap-2 py-3 bg-slate-50/60 rounded-lg px-2 text-slate-800 font-bold border border-slate-100">
                <div className="col-span-8 flex items-start gap-1">
                  <span>5.</span>
                  <span>
                    {vatCalculations.netVat >= 0 
                      ? 'ภาษีมูลค่าเพิ่มที่ต้องชำระในเดือนนี้ (ภาษีขายมากกว่าภาษีซื้อ)' 
                      : 'ภาษีชำระเกินคงเหลือสะสมยกไปเครดิตในเดือนถัดไป (ภาษีซื้อมากกว่าภาษีขาย)'}
                  </span>
                </div>
                <div className={`col-span-4 text-right font-mono text-sm font-bold ${
                  vatCalculations.netVat >= 0 ? 'text-amber-700' : 'text-emerald-700'
                }`}>
                  {Math.abs(vatCalculations.netVat).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 border-t border-slate-100 pt-3 flex flex-col sm:flex-row justify-between gap-2 font-sans">
              <span>* สรุปตามข้อบังคับมาตรา 82/3 และ 83 แห่งประมวลรัษฎากร สรุปดุลภาษีอัตโนมัติ</span>
              <span className="text-slate-500 font-semibold font-sans bg-amber-50 border border-amber-200/50 px-2 py-1 rounded">
                สถานะภาษี: {vatCalculations.netVat >= 0 ? '✓ รอนำส่ง (ภ.พ.30)' : '✓ สะสมเครดิตอัตโนมัติ'}
              </span>
            </div>
          </div>

          {/* Detailed VAT Tables (Interactive Toggles) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sales Tax Details Table */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 font-sans flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                    รายการภาษีขาย (Sales Tax Ledger)
                  </h4>
                  <p className="text-[11px] text-slate-400">รายการรับชำระรายได้สำหรับเดือนนี้</p>
                </div>
                <span className="text-xs font-bold font-mono px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full">
                  {vatCalculations.salesList.length} รายการ
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-medium">
                      <th className="py-2">วันที่</th>
                      <th className="py-2">เลขที่อ้างอิง</th>
                      <th className="py-2">คำอธิบาย</th>
                      <th className="py-2 text-right">ยอดรวม (฿)</th>
                      <th className="py-2 text-right">ภาษีขาย (฿)</th>
                      <th className="py-2 text-center">คิด VAT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {vatCalculations.salesList.map((item) => (
                      <tr key={item.id} className="text-slate-600 hover:bg-slate-50/50 transition-colors">
                        <td className="py-2.5 font-mono text-[10px] text-slate-400">{item.date}</td>
                        <td className="py-2.5 font-mono text-[10px] font-bold text-slate-500">{item.referenceNo || '-'}</td>
                        <td className="py-2.5 max-w-[120px] truncate" title={item.description}>{item.description}</td>
                        <td className="py-2.5 text-right font-mono font-medium text-slate-700">
                          {item.amount.toLocaleString()}
                        </td>
                        <td className="py-2.5 text-right font-mono font-bold text-indigo-600">
                          {item.vat > 0 ? item.vat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                        </td>
                        <td className="py-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={item.activeHasVat}
                            onChange={() => {
                              onUpdateTransaction(item.id, { hasVat: !item.activeHasVat });
                            }}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer w-3.5 h-3.5"
                          />
                        </td>
                      </tr>
                    ))}

                    {vatCalculations.salesList.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-400 text-[10px] font-sans">
                          ไม่พบรายการรายได้ในงวดบัญชีนี้
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Purchase Tax Details Table */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 font-sans flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    รายการภาษีซื้อ (Purchase Tax Ledger)
                  </h4>
                  <p className="text-[11px] text-slate-400">ค่าใช้จ่ายและต้นทุนในการจัดซื้อจัดจ้างรายเดือน</p>
                </div>
                <span className="text-xs font-bold font-mono px-2 py-0.5 bg-rose-50 text-rose-700 rounded-full">
                  {vatCalculations.purchaseList.length} รายการ
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-medium">
                      <th className="py-2">วันที่</th>
                      <th className="py-2">เลขที่อ้างอิง</th>
                      <th className="py-2">คำอธิบาย</th>
                      <th className="py-2 text-right">ยอดรวม (฿)</th>
                      <th className="py-2 text-right">ภาษีซื้อ (฿)</th>
                      <th className="py-2 text-center">คิด VAT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {vatCalculations.purchaseList.map((item) => (
                      <tr key={item.id} className="text-slate-600 hover:bg-slate-50/50 transition-colors">
                        <td className="py-2.5 font-mono text-[10px] text-slate-400">{item.date}</td>
                        <td className="py-2.5 font-mono text-[10px] font-bold text-slate-500">{item.referenceNo || '-'}</td>
                        <td className="py-2.5 max-w-[120px] truncate" title={item.description}>{item.description}</td>
                        <td className="py-2.5 text-right font-mono font-medium text-slate-700">
                          {item.amount.toLocaleString()}
                        </td>
                        <td className="py-2.5 text-right font-mono font-bold text-rose-600">
                          {item.vat > 0 ? item.vat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                        </td>
                        <td className="py-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={item.activeHasVat}
                            onChange={() => {
                              onUpdateTransaction(item.id, { hasVat: !item.activeHasVat });
                            }}
                            className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer w-3.5 h-3.5"
                          />
                        </td>
                      </tr>
                    ))}

                    {vatCalculations.purchaseList.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-400 text-[10px] font-sans">
                          ไม่พบรายการรายจ่ายที่พ่วงภาษีมูลค่าเพิ่มในงวดบัญชีนี้
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
