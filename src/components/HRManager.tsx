/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Filter,
  Plus,
  Mail,
  Phone,
  Briefcase,
  Check,
  X,
  Trash2,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  FileText
} from 'lucide-react';
import {
  Employee,
  EmployeeStatus,
  Department,
  LeaveRequest,
  LeaveType,
  LeaveStatus
} from '../types';

interface HRManagerProps {
  employees: Employee[];
  leaveRequests: LeaveRequest[];
  onAddEmployee: (emp: Omit<Employee, 'id'>) => void;
  onUpdateEmployee: (id: string, emp: Partial<Employee>) => void;
  onDeleteEmployee: (id: string) => void;
  onAddLeaveRequest: (req: Omit<LeaveRequest, 'id' | 'createdAt' | 'status'>) => void;
  onUpdateLeaveStatus: (id: string, status: LeaveStatus) => void;
}

export default function HRManager({
  employees,
  leaveRequests,
  onAddEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
  onAddLeaveRequest,
  onUpdateLeaveStatus
}: HRManagerProps) {
  const [subTab, setSubTab] = useState<'employees' | 'leaves'>('employees');
  
  // Search and filter states for employees
  const [empSearch, setEmpSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [deletingEmp, setDeletingEmp] = useState<Employee | null>(null);

  // New Employee Form States
  const [isAddingEmp, setIsAddingEmp] = useState(false);
  const [newEmp, setNewEmp] = useState<Omit<Employee, 'id'>>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: '',
    department: Department.DEVELOPMENT,
    salary: 25000,
    status: EmployeeStatus.ACTIVE,
    startDate: new Date().toISOString().split('T')[0],
    bankAccount: '',
    taxId: ''
  });

  // Edit Employee State
  const [editingEmpId, setEditingEmpId] = useState<string | null>(null);

  // New Leave Request States
  const [isAddingLeave, setIsAddingLeave] = useState(false);
  const [newLeave, setNewLeave] = useState({
    employeeId: '',
    type: LeaveType.ANNUAL,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    reason: ''
  });

  // Department labels in Thai helper
  const getDeptLabel = (dept: Department) => dept;

  // Filter employees
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchesSearch = `${emp.firstName} ${emp.lastName} ${emp.role} ${emp.email}`
        .toLowerCase()
        .includes(empSearch.toLowerCase());
      
      const matchesDept = deptFilter === 'ALL' || emp.department === deptFilter;
      const matchesStatus = statusFilter === 'ALL' || emp.status === statusFilter;

      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [employees, empSearch, deptFilter, statusFilter]);

  // Handle adding employee
  const handleCreateEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmp.firstName || !newEmp.lastName || !newEmp.email) {
      alert('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน (ชื่อ, นามสกุล, อีเมล)');
      return;
    }
    onAddEmployee(newEmp);
    setIsAddingEmp(false);
    // Reset form
    setNewEmp({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      role: '',
      department: Department.DEVELOPMENT,
      salary: 25000,
      status: EmployeeStatus.ACTIVE,
      startDate: new Date().toISOString().split('T')[0],
      bankAccount: '',
      taxId: ''
    });
  };

  // Handle editing employee
  const handleSaveEditEmployee = (emp: Employee) => {
    onUpdateEmployee(emp.id, emp);
    setEditingEmpId(null);
  };

  // Handle adding leave request
  const handleCreateLeaveRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeave.employeeId || !newLeave.reason) {
      alert('กรุณาเลือกพนักงานและระบุเหตุผลการลา');
      return;
    }

    const selectedEmp = employees.find(emp => emp.id === newLeave.employeeId);
    if (!selectedEmp) return;

    // Calculate days duration
    const start = new Date(newLeave.startDate);
    const end = new Date(newLeave.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const durationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    onAddLeaveRequest({
      employeeId: newLeave.employeeId,
      employeeName: `${selectedEmp.firstName} ${selectedEmp.lastName}`,
      type: newLeave.type,
      startDate: newLeave.startDate,
      endDate: newLeave.endDate,
      durationDays,
      reason: newLeave.reason
    });

    setIsAddingLeave(false);
    // Reset form
    setNewLeave({
      employeeId: '',
      type: LeaveType.ANNUAL,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      reason: ''
    });
  };

  const getLeaveTypeLabel = (type: LeaveType) => {
    switch (type) {
      case LeaveType.ANNUAL: return 'ลาพักร้อน';
      case LeaveType.SICK: return 'ลาป่วย';
      case LeaveType.PERSONAL: return 'ลากิจ';
      case LeaveType.MATERNITY: return 'ลาคลอด';
      default: return 'ลาหยุด';
    }
  };

  return (
    <div className="space-y-6" id="hr-manager-container">
      {/* Sub tabs selector */}
      <div className="flex border-b border-slate-100 pb-px gap-6">
        <button
          onClick={() => setSubTab('employees')}
          className={`pb-3 font-sans font-bold text-sm tracking-tight cursor-pointer transition-all border-b-2 px-1 ${
            subTab === 'employees'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <span className="flex items-center gap-2">
            <Users className="w-4 h-4" /> ทำเนียบและแฟ้มประวัติพนักงาน
          </span>
        </button>
        <button
          onClick={() => setSubTab('leaves')}
          className={`pb-3 font-sans font-bold text-sm tracking-tight cursor-pointer transition-all border-b-2 px-1 ${
            subTab === 'leaves'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <span className="flex items-center gap-2">
            <Calendar className="w-4 h-4" /> รายการลาหยุดพนักงาน
          </span>
        </button>
      </div>

      {subTab === 'employees' ? (
        <div className="space-y-4">
          {/* Controls row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              {/* Search */}
              <div className="relative min-w-[220px] flex-1 max-w-sm">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อ, ตำแหน่ง, อีเมล..."
                  value={empSearch}
                  onChange={(e) => setEmpSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none font-sans"
                />
              </div>

              {/* Department Filter */}
              <div className="flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-slate-400" />
                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="py-2 px-3 border border-slate-200 rounded-xl text-xs bg-white text-slate-600 focus:outline-none"
                >
                  <option value="ALL">ทุกแผนก</option>
                  {Object.values(Department).map(dept => (
                    <option key={dept} value={dept}>{getDeptLabel(dept)}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="py-2 px-3 border border-slate-200 rounded-xl text-xs bg-white text-slate-600 focus:outline-none"
                >
                  <option value="ALL">ทุกสถานะ</option>
                  <option value={EmployeeStatus.ACTIVE}>ทำงานอยู่</option>
                  <option value={EmployeeStatus.PROBATION}>ทดลองงาน</option>
                  <option value={EmployeeStatus.RESIGNED}>ลาออกแล้ว</option>
                </select>
              </div>
            </div>

            <button
              onClick={() => setIsAddingEmp(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer text-center md:w-auto w-full justify-center"
            >
              <Plus className="w-4 h-4" /> เพิ่มพนักงานใหม่
            </button>
          </div>

          {/* Add Employee Form Drawer/Card */}
          {isAddingEmp && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-inner">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200">
                <h4 className="text-sm font-bold text-slate-800 font-sans">เพิ่มข้อมูลบุคลากรใหม่เข้าระบบ</h4>
                <button onClick={() => setIsAddingEmp(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCreateEmployee} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1">ชื่อจริง *</label>
                  <input
                    type="text"
                    required
                    value={newEmp.firstName}
                    onChange={(e) => setNewEmp({ ...newEmp, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1">นามสกุล *</label>
                  <input
                    type="text"
                    required
                    value={newEmp.lastName}
                    onChange={(e) => setNewEmp({ ...newEmp, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1">อีเมลพนักงาน *</label>
                  <input
                    type="email"
                    required
                    value={newEmp.email}
                    onChange={(e) => setNewEmp({ ...newEmp, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1">เบอร์โทรศัพท์</label>
                  <input
                    type="text"
                    placeholder="e.g. 081-xxxxxxx"
                    value={newEmp.phone}
                    onChange={(e) => setNewEmp({ ...newEmp, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1">บทบาท/ตำแหน่ง</label>
                  <input
                    type="text"
                    placeholder="e.g. UX Designer"
                    value={newEmp.role}
                    onChange={(e) => setNewEmp({ ...newEmp, role: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1">แผนก</label>
                  <select
                    value={newEmp.department}
                    onChange={(e) => setNewEmp({ ...newEmp, department: e.target.value as Department })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white"
                  >
                    {Object.values(Department).map(dept => (
                      <option key={dept} value={dept}>{getDeptLabel(dept)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1">ฐานเงินเดือน (บาท)</label>
                  <input
                    type="number"
                    value={newEmp.salary}
                    onChange={(e) => setNewEmp({ ...newEmp, salary: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1">เลขบัญชีธนาคาร</label>
                  <input
                    type="text"
                    placeholder="e.g. กสิกรไทย 123-x-xxxxx-x"
                    value={newEmp.bankAccount}
                    onChange={(e) => setNewEmp({ ...newEmp, bankAccount: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1">เลขประจำตัวผู้เสียภาษี</label>
                  <input
                    type="text"
                    placeholder="13 หลัก"
                    value={newEmp.taxId}
                    onChange={(e) => setNewEmp({ ...newEmp, taxId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1">วันที่เริ่มงาน</label>
                  <input
                    type="date"
                    value={newEmp.startDate}
                    onChange={(e) => setNewEmp({ ...newEmp, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1">สถานะบุคลากร</label>
                  <select
                    value={newEmp.status}
                    onChange={(e) => setNewEmp({ ...newEmp, status: e.target.value as EmployeeStatus })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white"
                  >
                    <option value={EmployeeStatus.ACTIVE}>ทำงานปกติ (Active)</option>
                    <option value={EmployeeStatus.PROBATION}>ช่วงทดลองงาน (Probation)</option>
                    <option value={EmployeeStatus.RESIGNED}>ลาออกแล้ว (Resigned)</option>
                  </select>
                </div>
                <div className="flex items-end justify-end gap-2 md:col-span-3 mt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingEmp(false)}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg text-xs text-slate-700 cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs text-white font-bold cursor-pointer"
                  >
                    บันทึกข้อมูล
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Directory Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEmployees.map((emp) => {
              const isEditing = editingEmpId === emp.id;
              
              return (
                <div key={emp.id} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4 hover:border-slate-200 transition-colors">
                  {/* Card Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">{emp.id}</span>
                      <h4 className="text-sm font-bold text-slate-800 font-sans mt-0.5">
                        {emp.firstName} {emp.lastName}
                      </h4>
                      <p className="text-xs text-slate-500 font-sans">{emp.role || 'ไม่ได้กำหนดตำแหน่ง'}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      emp.status === 'active' ? 'bg-emerald-50 text-emerald-700' :
                      emp.status === 'probation' ? 'bg-amber-50 text-amber-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {emp.status === 'active' ? 'ทำงานอยู่' :
                       emp.status === 'probation' ? 'ทดลองงาน' : 'พ้นสภาพ'}
                    </span>
                  </div>

                  {/* Employee Details / Edit Form */}
                  {isEditing ? (
                    <div className="space-y-3 bg-slate-50 p-3 rounded-xl border border-slate-150">
                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold">ตำแหน่ง</label>
                        <input
                          type="text"
                          defaultValue={emp.role}
                          id={`edit-role-${emp.id}`}
                          className="w-full px-2.5 py-1 border border-slate-200 rounded bg-white text-xs"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] text-slate-500 font-bold">ฐานเงินเดือน (฿)</label>
                          <input
                            type="number"
                            defaultValue={emp.salary}
                            id={`edit-salary-${emp.id}`}
                            className="w-full px-2.5 py-1 border border-slate-200 rounded bg-white text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 font-bold">สถานะ</label>
                          <select
                            defaultValue={emp.status}
                            id={`edit-status-${emp.id}`}
                            className="w-full px-2 py-1 border border-slate-200 rounded bg-white text-xs"
                          >
                            <option value="active">ทำงานปกติ</option>
                            <option value="probation">ทดลองงาน</option>
                            <option value="resigned">พ้นสภาพ</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold">ธนาคาร & เลขบัญชี</label>
                        <input
                          type="text"
                          defaultValue={emp.bankAccount}
                          id={`edit-bank-${emp.id}`}
                          className="w-full px-2.5 py-1 border border-slate-200 rounded bg-white text-xs"
                        />
                      </div>
                      <div className="flex gap-2 justify-end mt-2">
                        <button
                          onClick={() => setEditingEmpId(null)}
                          className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs rounded"
                        >
                          ยกเลิก
                        </button>
                        <button
                          onClick={() => {
                            const role = (document.getElementById(`edit-role-${emp.id}`) as HTMLInputElement)?.value;
                            const salary = Number((document.getElementById(`edit-salary-${emp.id}`) as HTMLInputElement)?.value);
                            const status = (document.getElementById(`edit-status-${emp.id}`) as HTMLSelectElement)?.value as EmployeeStatus;
                            const bankAccount = (document.getElementById(`edit-bank-${emp.id}`) as HTMLInputElement)?.value;
                            handleSaveEditEmployee({
                              ...emp,
                              role,
                              salary,
                              status,
                              bankAccount
                            });
                          }}
                          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded"
                        >
                          บันทึก
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 text-xs text-slate-600 font-sans border-t border-slate-50 pt-3">
                      <div className="flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                        <span>แผนก: <span className="font-medium text-slate-800">{emp.department}</span></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate">{emp.email}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{emp.phone || 'ไม่ได้ระบุเบอร์โทร'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 justify-between">
                        <span className="text-slate-400">เงินเดือนพื้นฐาน:</span>
                        <span className="font-mono font-bold text-slate-800">฿{emp.salary.toLocaleString()}</span>
                      </div>
                    </div>
                  )}

                  {/* Card Footer Actions */}
                  {!isEditing && (
                    <div className="flex items-center justify-between border-t border-slate-50 pt-3 text-xs">
                      <button
                        onClick={() => setEditingEmpId(emp.id)}
                        className="text-indigo-600 hover:text-indigo-700 font-semibold cursor-pointer"
                      >
                        แก้ไขประวัติ
                      </button>
                      <button
                        onClick={() => setDeletingEmp(emp)}
                        className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                        title="ลบพนักงาน"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {filteredEmployees.length === 0 && (
              <div className="col-span-full py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-400 font-sans">ไม่พบข้อมูลพนักงานที่ค้นหา</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Leaves section */
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-slate-800 font-sans">คำขอหยุดพักผ่อนและลางานของพนักงาน</h3>
              <p className="text-xs text-slate-400 font-sans">พิจารณาอนุมัติคำขอลาประเภทต่างๆ ตามนโยบายและระเบียบบริษัท</p>
            </div>
            <button
              onClick={() => setIsAddingLeave(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" /> บันทึกใบลาหยุดพนักงาน
            </button>
          </div>

          {/* Add Leave Request Drawer */}
          {isAddingLeave && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-inner">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200">
                <h4 className="text-sm font-bold text-slate-800 font-sans">ยื่นคำขอการลาหยุดพนักงาน</h4>
                <button onClick={() => setIsAddingLeave(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCreateLeaveRequest} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1">พนักงานผู้ขอลา *</label>
                  <select
                    required
                    value={newLeave.employeeId}
                    onChange={(e) => setNewLeave({ ...newLeave, employeeId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white"
                  >
                    <option value="">-- เลือกพนักงาน --</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        [{emp.id}] {emp.firstName} {emp.lastName} ({emp.role})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1">ประเภทการลาหยุด</label>
                  <select
                    value={newLeave.type}
                    onChange={(e) => setNewLeave({ ...newLeave, type: e.target.value as LeaveType })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white"
                  >
                    <option value={LeaveType.ANNUAL}>ลาพักร้อนประจำปี</option>
                    <option value={LeaveType.SICK}>ลาป่วย</option>
                    <option value={LeaveType.PERSONAL}>ลากิจจำเป็น</option>
                    <option value={LeaveType.MATERNITY}>ลาคลอดบุตร</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1">วันที่เริ่มต้นการลา</label>
                  <input
                    type="date"
                    value={newLeave.startDate}
                    onChange={(e) => setNewLeave({ ...newLeave, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1">วันที่สิ้นสุดการลา</label>
                  <input
                    type="date"
                    value={newLeave.endDate}
                    onChange={(e) => setNewLeave({ ...newLeave, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[11px] text-slate-500 font-bold mb-1">เหตุผลหรือวัตถุประสงค์การลา *</label>
                  <textarea
                    required
                    rows={2}
                    placeholder="ระบุคำอธิบายสั้นๆ เช่น ได้รับใบรับรองแพทย์ หรือมีความจำเป็นอย่างไร..."
                    value={newLeave.reason}
                    onChange={(e) => setNewLeave({ ...newLeave, reason: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white font-sans"
                  />
                </div>
                <div className="flex gap-2 justify-end md:col-span-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingLeave(false)}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg text-xs text-slate-700 cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs text-white font-bold cursor-pointer"
                  >
                    ส่งใบขอลาหยุด
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Leaves list ledger */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 text-xs font-medium">
                    <th className="py-2 pb-3">ผู้ยื่นคำขอ</th>
                    <th className="py-2 pb-3">ประเภท</th>
                    <th className="py-2 pb-3">ระยะเวลา</th>
                    <th className="py-2 pb-3">จำนวน</th>
                    <th className="py-2 pb-3">เหตุผลการลา</th>
                    <th className="py-2 pb-3">สถานะใบอนุมัติ</th>
                    <th className="py-2 pb-3 text-right">ดำเนินการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {leaveRequests.map((req) => (
                    <tr key={req.id} className="text-slate-700 hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 font-sans text-xs">
                        <span className="font-bold text-slate-800 block">{req.employeeName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{req.employeeId}</span>
                      </td>
                      <td className="py-3 text-xs">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          req.type === LeaveType.ANNUAL ? 'bg-sky-50 text-sky-700' :
                          req.type === LeaveType.SICK ? 'bg-amber-50 text-amber-700' :
                          req.type === LeaveType.PERSONAL ? 'bg-indigo-50 text-indigo-700' :
                          'bg-fuchsia-50 text-fuchsia-700'
                        }`}>
                          {getLeaveTypeLabel(req.type)}
                        </span>
                      </td>
                      <td className="py-3 font-mono text-xs text-slate-600">
                        {req.startDate} ถึง {req.endDate}
                      </td>
                      <td className="py-3 font-sans text-xs font-bold text-slate-800">
                        {req.durationDays} วัน
                      </td>
                      <td className="py-3 max-w-xs text-xs text-slate-500 truncate" title={req.reason}>
                        {req.reason}
                      </td>
                      <td className="py-3">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${
                          req.status === LeaveStatus.APPROVED ? 'text-emerald-600 bg-emerald-50 border border-emerald-200/50 px-2 py-0.5 rounded-full' :
                          req.status === LeaveStatus.REJECTED ? 'text-rose-600 bg-rose-50 border border-rose-200/50 px-2 py-0.5 rounded-full' :
                          'text-amber-600 bg-amber-50 border border-amber-200/50 px-2 py-0.5 rounded-full'
                        }`}>
                          {req.status === LeaveStatus.PENDING && <Clock className="w-3 h-3" />}
                          {req.status === LeaveStatus.APPROVED && <CheckCircle className="w-3 h-3" />}
                          {req.status === LeaveStatus.REJECTED && <XCircle className="w-3 h-3" />}
                          {req.status === LeaveStatus.PENDING ? 'รออนุมัติ' :
                           req.status === LeaveStatus.APPROVED ? 'อนุมัติแล้ว' : 'ปฏิเสธ'}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        {req.status === LeaveStatus.PENDING ? (
                          <div className="flex gap-1 justify-end">
                            <button
                              onClick={() => onUpdateLeaveStatus(req.id, LeaveStatus.APPROVED)}
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                              title="อนุมัติ"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onUpdateLeaveStatus(req.id, LeaveStatus.REJECTED)}
                              className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                              title="ปฏิเสธ"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 font-sans">พิจารณาแล้ว</span>
                        )}
                      </td>
                    </tr>
                  ))}

                  {leaveRequests.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 text-xs font-sans">
                        ไม่มีรายการยื่นลาหยุดพักร้อนในระบบขณะนี้
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {deletingEmp && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-100 shadow-2xl p-6 text-xs font-sans space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2 bg-rose-50 rounded-full">
                <Trash2 className="w-6 h-6 stroke-[2.5px]" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-800">ยืนยันการลบพนักงานออกจากระบบ</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">การดำเนินการนี้ไม่สามารถยกเลิกภายหลังได้</p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">ชื่อ-นามสกุล:</span>
                <span className="font-extrabold text-slate-800">คุณ {deletingEmp.firstName} {deletingEmp.lastName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">ตำแหน่ง:</span>
                <span className="font-semibold text-slate-600">{deletingEmp.role || '-'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">แผนก:</span>
                <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold text-[10px]">{deletingEmp.department}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
              คุณมั่นใจที่จะลบข้อมูลบุคลากรรายนี้ใช่หรือไม่? ข้อมูลประวัติและช่องทางการติดต่อของพนักงานทั้งหมดจะถูกลบออกจากระบบทันที
            </p>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setDeletingEmp(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteEmployee(deletingEmp.id);
                  setDeletingEmp(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl cursor-pointer transition-colors shadow-md shadow-rose-600/10"
              >
                ยืนยันการลบข้อมูล
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
