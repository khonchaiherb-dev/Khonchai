/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import {
  Employee,
  EmployeeStatus,
  Department,
  LeaveRequest,
  LeaveType,
  LeaveStatus,
  Transaction,
  TransactionType,
  TransactionCategory,
  PayrollRecord,
  PayrollStatus,
  HerbMaterial,
  HerbProduct,
  ProductionLog
} from '../types';

// Real-looking Thai business initial database
const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: 'EMP001',
    firstName: 'วิทยา',
    lastName: 'รักดี',
    email: 'wittaya.r@company.co.th',
    phone: '081-234-5678',
    role: 'ผู้จัดการทั่วไป (CEO & General Manager)',
    department: Department.ADMIN,
    salary: 85000,
    status: EmployeeStatus.ACTIVE,
    startDate: '2024-01-15',
    bankAccount: 'กสิกรไทย 123-4-56789-0',
    taxId: '1-1002-34567-89-0'
  },
  {
    id: 'EMP002',
    firstName: 'ปิยพร',
    lastName: 'เกียรติเกื้อกูล',
    email: 'piyaporn.k@company.co.th',
    phone: '089-876-5432',
    role: 'นักพัฒนาอาวุโส (Senior Full Stack Developer)',
    department: Department.DEVELOPMENT,
    salary: 62000,
    status: EmployeeStatus.ACTIVE,
    startDate: '2024-03-01',
    bankAccount: 'ไทยพาณิชย์ 987-6-54321-0',
    taxId: '1-2003-45678-90-1'
  },
  {
    id: 'EMP003',
    firstName: 'สมศักดิ์',
    lastName: 'สุขใจ',
    email: 'somsak.s@company.co.th',
    phone: '085-555-1234',
    role: 'หัวหน้าฝ่ายการตลาด (Marketing Lead)',
    department: Department.MARKETING,
    salary: 45000,
    status: EmployeeStatus.ACTIVE,
    startDate: '2024-06-10',
    bankAccount: 'กรุงเทพ 456-7-89012-3',
    taxId: '1-3004-56789-01-2'
  },
  {
    id: 'EMP004',
    firstName: 'นภา',
    lastName: 'ใจใส',
    email: 'napa.j@company.co.th',
    phone: '082-111-9999',
    role: 'ผู้ประสานงานบุคคล (HR Coordinator)',
    department: Department.HR,
    salary: 32000,
    status: EmployeeStatus.ACTIVE,
    startDate: '2024-09-01',
    bankAccount: 'กรุงไทย 321-0-98765-4',
    taxId: '1-4005-67890-12-3'
  },
  {
    id: 'EMP005',
    firstName: 'อนุรักษ์',
    lastName: 'มั่นคง',
    email: 'anurak.m@company.co.th',
    phone: '084-222-3333',
    role: 'ฝ่ายสนับสนุนลูกค้า (Customer Support Specialist)',
    department: Department.SUPPORT,
    salary: 26000,
    status: EmployeeStatus.PROBATION,
    startDate: '2026-05-01',
    bankAccount: 'กรุงศรีอยุธยา 789-0-12345-6',
    taxId: '1-5006-78901-23-4'
  }
];

const INITIAL_LEAVES: LeaveRequest[] = [
  {
    id: 'LV001',
    employeeId: 'EMP003',
    employeeName: 'สมศักดิ์ สุขใจ',
    type: LeaveType.PERSONAL,
    startDate: '2026-06-15',
    endDate: '2026-06-15',
    durationDays: 1,
    reason: 'ทำธุรกรรมโอนที่ดินและต่อทะเบียนรถยนต์ ณ กรมที่ดิน',
    status: LeaveStatus.APPROVED,
    createdAt: '2026-06-12T09:00:00Z'
  },
  {
    id: 'LV002',
    employeeId: 'EMP002',
    employeeName: 'ปิยพร เกียรติเกื้อกูล',
    type: LeaveType.SICK,
    startDate: '2026-07-02',
    endDate: '2026-07-04',
    durationDays: 3,
    reason: 'มีอาการไข้สูง ปวดศีรษะ และไอ แพทย์วินิจฉัยเป็นไข้หวัดใหญ่สายพันธุ์ A',
    status: LeaveStatus.APPROVED,
    createdAt: '2026-07-02T08:30:00Z'
  },
  {
    id: 'LV003',
    employeeId: 'EMP005',
    employeeName: 'อนุรักษ์ มั่นคง',
    type: LeaveType.ANNUAL,
    startDate: '2026-07-15',
    endDate: '2026-07-17',
    durationDays: 3,
    reason: 'ขอลากิจลาพักร้อนไปท่องเที่ยวต่างจังหวัดกับครอบครัวประจำปี',
    status: LeaveStatus.PENDING,
    createdAt: '2026-07-08T14:15:00Z'
  }
];

const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'TX001',
    date: '2026-06-05',
    type: TransactionType.INCOME,
    category: TransactionCategory.SERVICES,
    amount: 185000,
    description: 'ค่าบริการให้คำปรึกษาไอทีและออกแบบระบบซอฟต์แวร์เฟส 1 - บจก.ไทยก้าวไกล',
    referenceNo: 'IV-202606-001'
  },
  {
    id: 'TX002',
    date: '2026-06-10',
    type: TransactionType.INCOME,
    category: TransactionCategory.SALES,
    amount: 125000,
    description: 'รายรับจากการจัดจำหน่ายระบบบริหารคลังสินค้าพรีเมียม (License)',
    referenceNo: 'INV-202606-002'
  },
  {
    id: 'TX003',
    date: '2026-06-15',
    type: TransactionType.EXPENSE,
    category: TransactionCategory.RENT,
    amount: 25000,
    description: 'ค่าเช่าพื้นที่สำนักงานและบำรุงรักษาอาคารรอบเดือนมิถุนายน',
    referenceNo: 'RE-202606-05'
  },
  {
    id: 'TX004',
    date: '2026-06-18',
    type: TransactionType.EXPENSE,
    category: TransactionCategory.UTILITIES,
    amount: 6200,
    description: 'ค่าน้ำค่าไฟฟ้า ค่าน้ำประปา และบริการอินเทอร์เน็ตความเร็วสูงไฟเบอร์',
    referenceNo: 'UT-202606-12'
  },
  {
    id: 'TX005',
    date: '2026-06-25',
    type: TransactionType.EXPENSE,
    category: TransactionCategory.MARKETING_EXP,
    amount: 15000,
    description: 'ชำระค่าโฆษณาโปรโมทโพสต์บริการผ่าน Google Ads และ Facebook Ads',
    referenceNo: 'FB-202606-33'
  },
  {
    id: 'TX006',
    date: '2026-06-28',
    type: TransactionType.EXPENSE,
    category: TransactionCategory.SALARIES,
    amount: 250000,
    description: 'จ่ายเงินเดือนและค่าตอบแทนพนักงานบริษัทรอบเดือนมิถุนายน',
    referenceNo: 'PY-202606-ALL'
  },
  {
    id: 'TX007',
    date: '2026-07-05',
    type: TransactionType.INCOME,
    category: TransactionCategory.SERVICES,
    amount: 220000,
    description: 'ค่าจ้างโปรเจกต์พัฒนาแอปพลิเคชันมือถือเฟสถัดไป - บจก.โกลบอลคอมเมิร์ซ',
    referenceNo: 'IV-202607-001'
  }
];

const INITIAL_PAYROLLS: PayrollRecord[] = [
  {
    id: 'PR001',
    employeeId: 'EMP001',
    employeeName: 'วิทยา รักดี',
    month: 6,
    year: 2026,
    baseSalary: 85000,
    bonus: 5000,
    taxDeduction: 4250,
    socialSecurity: 750,
    otherDeductions: 0,
    netSalary: 85000 + 5000 - 4250 - 750,
    status: PayrollStatus.PAID,
    paymentDate: '2026-06-28'
  },
  {
    id: 'PR002',
    employeeId: 'EMP002',
    employeeName: 'ปิยพร เกียรติเกื้อกูล',
    month: 6,
    year: 2026,
    baseSalary: 62000,
    bonus: 0,
    taxDeduction: 1860,
    socialSecurity: 750,
    otherDeductions: 0,
    netSalary: 62000 - 1860 - 750,
    status: PayrollStatus.PAID,
    paymentDate: '2026-06-28'
  },
  {
    id: 'PR003',
    employeeId: 'EMP003',
    employeeName: 'สมศักดิ์ สุขใจ',
    month: 6,
    year: 2026,
    baseSalary: 45000,
    bonus: 1500,
    taxDeduction: 900,
    socialSecurity: 750,
    otherDeductions: 0,
    netSalary: 45000 + 1500 - 900 - 750,
    status: PayrollStatus.PAID,
    paymentDate: '2026-06-28'
  }
];

// Initial Herb database for คุณชายสมุนไพร
const INITIAL_MATERIALS: HerbMaterial[] = [
  {
    id: 'MAT001',
    name: 'ขมิ้นชันอบแห้งบดผง',
    stock: 120, // 120 kg
    unit: 'กิโลกรัม (kg)',
    unitCost: 150, // ฿150 per kg
    safetyStock: 30,
    category: 'herb_powder'
  },
  {
    id: 'MAT002',
    name: 'ฟ้าทะลายโจรแห้งบดผง',
    stock: 85,
    unit: 'กิโลกรัม (kg)',
    unitCost: 180,
    safetyStock: 25,
    category: 'herb_powder'
  },
  {
    id: 'MAT003',
    name: 'สารสกัดกระชายดำเข้มข้น',
    stock: 15,
    unit: 'ลิตร (L)',
    unitCost: 1200,
    safetyStock: 5,
    category: 'extract'
  },
  {
    id: 'MAT004',
    name: 'มะขามป้อมอบแห้ง',
    stock: 200,
    unit: 'กิโลกรัม (kg)',
    unitCost: 90,
    safetyStock: 40,
    category: 'herb_dried'
  },
  {
    id: 'MAT005',
    name: 'ขวดแก้วสีชา 100ml พร้อมฝา',
    stock: 1500,
    unit: 'ใบ (pcs)',
    unitCost: 8,
    safetyStock: 300,
    category: 'packaging'
  },
  {
    id: 'MAT006',
    name: 'แคปซูลเปล่าเบอร์ 0 (บรรจุผง)',
    stock: 50000,
    unit: 'เม็ด (pcs)',
    unitCost: 0.15,
    safetyStock: 10000,
    category: 'packaging'
  }
];

const INITIAL_PRODUCTS: HerbProduct[] = [
  {
    id: 'PROD001',
    name: 'แคปซูลขมิ้นชันตราคุณชาย (60 แคปซูล)',
    category: 'ยาแคปซูลสมุนไพร',
    sellPrice: 190,
    stock: 420,
    ingredients: [
      { materialId: 'MAT001', amount: 0.03 }, // 30g = 0.03 kg
      { materialId: 'MAT006', amount: 60 }, // 60 capsules
      { materialId: 'MAT005', amount: 1 } // 1 bottle
    ]
  },
  {
    id: 'PROD002',
    name: 'แคปซูลฟ้าทะลายโจรตราคุณชาย (50 แคปซูล)',
    category: 'ยาแคปซูลสมุนไพร',
    sellPrice: 160,
    stock: 250,
    ingredients: [
      { materialId: 'MAT002', amount: 0.025 }, // 25g
      { materialId: 'MAT006', amount: 50 },
      { materialId: 'MAT005', amount: 1 }
    ]
  },
  {
    id: 'PROD003',
    name: 'น้ำเชื่อมสมุนไพรมะขามป้อมแก้ไอ (120ml)',
    category: 'น้ำเชื่อม/ยาน้ำ',
    sellPrice: 85,
    stock: 180,
    ingredients: [
      { materialId: 'MAT004', amount: 0.05 }, // 50g
      { materialId: 'MAT005', amount: 1 }
    ]
  }
];

const INITIAL_PRODUCTION_LOGS: ProductionLog[] = [
  {
    id: 'PL001',
    productId: 'PROD001',
    productName: 'แคปซูลขมิ้นชันตราคุณชาย (60 แคปซูล)',
    quantity: 100,
    date: '2026-06-20',
    costEstimate: 1350 // approx raw cost
  },
  {
    id: 'PL002',
    productId: 'PROD003',
    productName: 'น้ำเชื่อมสมุนไพรมะขามป้อมแก้ไอ (120ml)',
    quantity: 50,
    date: '2026-07-01',
    costEstimate: 625
  }
];

export function useCompanyData() {
  const [employees, setEmployees] = useState<Employee[]>(() => {
    const local = localStorage.getItem('company_employees');
    return local ? JSON.parse(local) : INITIAL_EMPLOYEES;
  });

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(() => {
    const local = localStorage.getItem('company_leaves');
    return local ? JSON.parse(local) : INITIAL_LEAVES;
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const local = localStorage.getItem('company_transactions');
    return local ? JSON.parse(local) : INITIAL_TRANSACTIONS;
  });

  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>(() => {
    const local = localStorage.getItem('company_payrolls');
    return local ? JSON.parse(local) : INITIAL_PAYROLLS;
  });

  // Save to local storage whenever state changes
  useEffect(() => {
    localStorage.setItem('company_employees', JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    localStorage.setItem('company_leaves', JSON.stringify(leaveRequests));
  }, [leaveRequests]);

  useEffect(() => {
    localStorage.setItem('company_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('company_payrolls', JSON.stringify(payrollRecords));
  }, [payrollRecords]);

  // Employee actions
  const addEmployee = (emp: Omit<Employee, 'id'>) => {
    const id = `EMP${String(employees.length + 1).padStart(3, '0')}`;
    const newEmp = { ...emp, id };
    setEmployees(prev => [...prev, newEmp]);
    return newEmp;
  };

  const updateEmployee = (id: string, updated: Partial<Employee>) => {
    setEmployees(prev => prev.map(emp => emp.id === id ? { ...emp, ...updated } : emp));
  };

  const deleteEmployee = (id: string) => {
    setEmployees(prev => prev.filter(emp => emp.id !== id));
  };

  // Leave actions
  const addLeaveRequest = (req: Omit<LeaveRequest, 'id' | 'createdAt' | 'status'>) => {
    const id = `LV${String(leaveRequests.length + 1).padStart(3, '0')}`;
    const newReq: LeaveRequest = {
      ...req,
      id,
      status: LeaveStatus.PENDING,
      createdAt: new Date().toISOString()
    };
    setLeaveRequests(prev => [newReq, ...prev]);
    return newReq;
  };

  const updateLeaveStatus = (id: string, status: LeaveStatus) => {
    setLeaveRequests(prev => prev.map(req => req.id === id ? { ...req, status } : req));
  };

  const deleteLeaveRequest = (id: string) => {
    setLeaveRequests(prev => prev.filter(req => req.id !== id));
  };

  // Financial actions
  const addTransaction = (tx: Omit<Transaction, 'id'>) => {
    const id = `TX${String(transactions.length + 1).padStart(3, '0')}`;
    const newTx = { ...tx, id };
    setTransactions(prev => [newTx, ...prev]);
    return newTx;
  };

  const deleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(tx => tx.id !== id));
  };

  const updateTransaction = (id: string, updated: Partial<Transaction>) => {
    setTransactions(prev => prev.map(tx => tx.id === id ? { ...tx, ...updated } : tx));
  };

  // Payroll actions
  const addPayrollRecord = (pr: Omit<PayrollRecord, 'id'>) => {
    const id = `PR${String(payrollRecords.length + 1).padStart(3, '0')}`;
    const newRecord = { ...pr, id };
    setPayrollRecords(prev => [newRecord, ...prev]);

    // Automatically log expense transaction if paid
    if (pr.status === PayrollStatus.PAID) {
      addTransaction({
        date: pr.paymentDate || new Date().toISOString().split('T')[0],
        type: TransactionType.EXPENSE,
        category: TransactionCategory.SALARIES,
        amount: pr.netSalary,
        description: `จ่ายเงินเดือน (${pr.month}/${pr.year}) ของคุณ ${pr.employeeName}`,
        referenceNo: id
      });
    }
    return newRecord;
  };

  const payPayroll = (id: string, paymentDate: string) => {
    setPayrollRecords(prev => prev.map(pr => {
      if (pr.id === id && pr.status !== PayrollStatus.PAID) {
        const paidPr = { ...pr, status: PayrollStatus.PAID, paymentDate };
        // Log transaction
        addTransaction({
          date: paymentDate,
          type: TransactionType.EXPENSE,
          category: TransactionCategory.SALARIES,
          amount: pr.netSalary,
          description: `จ่ายเงินเดือน (${pr.month}/${pr.year}) ของคุณ ${pr.employeeName}`,
          referenceNo: id
        });
        return paidPr;
      }
      return pr;
    }));
  };

  const deletePayroll = (id: string) => {
    setPayrollRecords(prev => prev.filter(pr => pr.id !== id));
  };

  // Herb inventory states
  const [herbMaterials, setHerbMaterials] = useState<HerbMaterial[]>(() => {
    const local = localStorage.getItem('company_herb_materials');
    return local ? JSON.parse(local) : INITIAL_MATERIALS;
  });

  const [herbProducts, setHerbProducts] = useState<HerbProduct[]>(() => {
    const local = localStorage.getItem('company_herb_products');
    return local ? JSON.parse(local) : INITIAL_PRODUCTS;
  });

  const [productionLogs, setProductionLogs] = useState<ProductionLog[]>(() => {
    const local = localStorage.getItem('company_production_logs');
    return local ? JSON.parse(local) : INITIAL_PRODUCTION_LOGS;
  });

  // Save herb inventory to localStorage
  useEffect(() => {
    localStorage.setItem('company_herb_materials', JSON.stringify(herbMaterials));
  }, [herbMaterials]);

  useEffect(() => {
    localStorage.setItem('company_herb_products', JSON.stringify(herbProducts));
  }, [herbProducts]);

  useEffect(() => {
    localStorage.setItem('company_production_logs', JSON.stringify(productionLogs));
  }, [productionLogs]);

  // Herb Actions
  const addHerbMaterial = (mat: Omit<HerbMaterial, 'id'>) => {
    const id = `MAT${String(herbMaterials.length + 1).padStart(3, '0')}`;
    const newMat = { ...mat, id };
    setHerbMaterials(prev => [...prev, newMat]);
    return newMat;
  };

  const deleteHerbMaterial = (id: string) => {
    setHerbMaterials(prev => prev.filter(mat => mat.id !== id));
  };

  const updateHerbMaterial = (id: string, updated: Partial<HerbMaterial>) => {
    setHerbMaterials(prev => prev.map(mat => mat.id === id ? { ...mat, ...updated } : mat));
  };

  const updateHerbMaterialStock = (id: string, amountChange: number, purpose: string, isPurchase = false) => {
    setHerbMaterials(prev => prev.map(mat => {
      if (mat.id === id) {
        const newStock = Math.max(0, mat.stock + amountChange);
        
        // If it's a purchase of raw materials, let's log an expense transaction!
        if (isPurchase && amountChange > 0) {
          const totalCost = amountChange * mat.unitCost;
          addTransaction({
            date: new Date().toISOString().split('T')[0],
            type: TransactionType.EXPENSE,
            category: TransactionCategory.OFFICE_SUPPLIES, // Or raw materials
            amount: totalCost,
            description: `จัดซื้อวัตถุดิบ ${mat.name} จำนวน ${amountChange} ${mat.unit.split(' ')[0]}`,
            referenceNo: `PO-${id}-${Date.now().toString().slice(-4)}`
          });
        }

        return { ...mat, stock: newStock };
      }
      return mat;
    }));
  };

  const addHerbProduct = (prod: Omit<HerbProduct, 'id'>) => {
    const id = `PROD${String(herbProducts.length + 1).padStart(3, '0')}`;
    const newProd = { ...prod, id };
    setHerbProducts(prev => [...prev, newProd]);
    return newProd;
  };

  const deleteHerbProduct = (id: string) => {
    setHerbProducts(prev => prev.filter(prod => prod.id !== id));
  };

  const updateHerbProduct = (id: string, updated: Partial<HerbProduct>) => {
    setHerbProducts(prev => prev.map(prod => prod.id === id ? { ...prod, ...updated } : prod));
  };

  const produceProduct = (productId: string, quantity: number) => {
    const prod = herbProducts.find(p => p.id === productId);
    if (!prod) return { success: false, error: 'ไม่พบสินค้าในระบบ' };

    // Check if enough raw materials
    const missing: string[] = [];
    prod.ingredients.forEach(ing => {
      const mat = herbMaterials.find(m => m.id === ing.materialId);
      const needed = ing.amount * quantity;
      if (!mat || mat.stock < needed) {
        const matName = mat ? mat.name : 'วัตถุดิบไร้ชื่อ';
        const inStock = mat ? mat.stock : 0;
        const unitLabel = mat ? mat.unit.split(' ')[0] : '';
        missing.push(`${matName} (ต้องการ ${needed.toFixed(2)} แต่มีเพียง ${inStock.toFixed(2)} ${unitLabel})`);
      }
    });

    if (missing.length > 0) {
      return { success: false, error: `วัตถุดิบไม่เพียงพอ:\n- ${missing.join('\n- ')}` };
    }

    // Deduct raw materials
    setHerbMaterials(prev => prev.map(mat => {
      const ing = prod.ingredients.find(i => i.materialId === mat.id);
      if (ing) {
        return { ...mat, stock: mat.stock - (ing.amount * quantity) };
      }
      return mat;
    }));

    // Add product stock
    setHerbProducts(prev => prev.map(p => {
      if (p.id === productId) {
        return { ...p, stock: p.stock + quantity };
      }
      return p;
    }));

    // Log production run
    const logId = `PL${String(productionLogs.length + 1).padStart(3, '0')}`;
    let costEstimate = 0;
    prod.ingredients.forEach(ing => {
      const mat = herbMaterials.find(m => m.id === ing.materialId);
      if (mat) {
        costEstimate += ing.amount * mat.unitCost * quantity;
      }
    });

    const newLog: ProductionLog = {
      id: logId,
      productId,
      productName: prod.name,
      quantity,
      date: new Date().toISOString().split('T')[0],
      costEstimate: Math.round(costEstimate)
    };

    setProductionLogs(prev => [newLog, ...prev]);

    return { success: true };
  };

  return {
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
  };
}
