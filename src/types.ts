/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum EmployeeStatus {
  ACTIVE = 'active',
  PROBATION = 'probation',
  RESIGNED = 'resigned'
}

export enum Department {
  HR = 'HR (ทรัพยากรบุคคล)',
  DEVELOPMENT = 'Development (พัฒนาผลิตภัณฑ์)',
  MARKETING = 'Marketing (การตลาด)',
  SALES = 'Sales (ฝ่ายขาย)',
  SUPPORT = 'Support (บริการลูกค้า)',
  ADMIN = 'Management/Admin (บริหาร)'
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  department: Department;
  salary: number;
  status: EmployeeStatus;
  startDate: string;
  bankAccount: string;
  taxId: string;
}

export enum LeaveType {
  ANNUAL = 'annual', // ลาพักร้อน
  SICK = 'sick', // ลาป่วย
  PERSONAL = 'personal', // ลากิจ
  MATERNITY = 'maternity' // ลาคลอด
}

export enum LeaveStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  durationDays: number;
  reason: string;
  status: LeaveStatus;
  createdAt: string;
}

export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense'
}

export enum TransactionCategory {
  // Income
  SALES = 'รายได้จากการขาย',
  SERVICES = 'รายได้ค่าบริการ',
  INVESTMENT = 'รายได้จากการลงทุน',
  OTHER_INCOME = 'รายรับอื่นๆ',
  // Expense
  SALARIES = 'เงินเดือนและค่าจ้าง',
  RENT = 'ค่าเช่าสถานที่',
  UTILITIES = 'ค่าน้ำค่าไฟ/อินเทอร์เน็ต',
  MARKETING_EXP = 'ค่าการตลาด/โฆษณา',
  OFFICE_SUPPLIES = 'อุปกรณ์สำนักงาน',
  TRAVEL = 'ค่าเดินทาง/ขนส่ง',
  TAX_EXP = 'ภาษี/ธรรมเนียม',
  OTHER_EXPENSE = 'รายจ่ายอื่นๆ'
}

export interface Transaction {
  id: string;
  date: string;
  type: TransactionType;
  category: TransactionCategory;
  amount: number;
  description: string;
  referenceNo: string;
  hasVat?: boolean;
  vatAmount?: number;
}

export enum PayrollStatus {
  PENDING = 'pending',
  PAID = 'paid'
}

export interface PayrollRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  month: number; // 1-12
  year: number;
  baseSalary: number;
  bonus: number;
  taxDeduction: number;
  socialSecurity: number;
  otherDeductions: number;
  netSalary: number;
  status: PayrollStatus;
  paymentDate?: string;
  diligenceAllowance?: number;
  otHours?: number;
  otPay?: number;
  otherBonus?: number;
}

export interface HerbMaterial {
  id: string;
  name: string;
  stock: number;
  unit: string;
  unitCost: number;
  safetyStock: number;
  category: 'herb_dried' | 'herb_powder' | 'extract' | 'packaging';
}

export interface FormulationIngredient {
  materialId: string;
  amount: number; // in grams or units
}

export interface HerbProduct {
  id: string;
  name: string;
  category: string;
  sellPrice: number;
  stock: number;
  ingredients: FormulationIngredient[];
}

export interface ProductionLog {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  date: string;
  costEstimate: number;
}

