/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Sprout,
  Package,
  Wrench,
  History,
  AlertTriangle,
  Plus,
  ArrowRight,
  TrendingUp,
  Scale,
  Activity,
  CheckCircle2,
  X,
  FileSpreadsheet,
  Edit,
  Trash2
} from 'lucide-react';
import { HerbMaterial, HerbProduct, ProductionLog } from '../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface HerbInventoryManagerProps {
  herbMaterials: HerbMaterial[];
  herbProducts: HerbProduct[];
  productionLogs: ProductionLog[];
  onAddHerbMaterial: (mat: Omit<HerbMaterial, 'id'>) => void;
  onUpdateHerbMaterialStock: (id: string, amountChange: number, purpose: string, isPurchase?: boolean) => void;
  onAddHerbProduct: (prod: Omit<HerbProduct, 'id'>) => void;
  onProduceProduct: (productId: string, quantity: number) => { success: boolean; error?: string };
  onDeleteHerbMaterial: (id: string) => void;
  onUpdateHerbMaterial: (id: string, updated: Partial<HerbMaterial>) => void;
  onDeleteHerbProduct: (id: string) => void;
  onUpdateHerbProduct: (id: string, updated: Partial<HerbProduct>) => void;
}

export default function HerbInventoryManager({
  herbMaterials,
  herbProducts,
  productionLogs,
  onAddHerbMaterial,
  onUpdateHerbMaterialStock,
  onAddHerbProduct,
  onProduceProduct,
  onDeleteHerbMaterial,
  onUpdateHerbMaterial,
  onDeleteHerbProduct,
  onUpdateHerbProduct
}: HerbInventoryManagerProps) {
  const [activeSubTab, setActiveSubTab] = useState<'materials' | 'products' | 'compounding' | 'logs'>('materials');

  // Modal controls
  const [showAddMaterialModal, setShowAddMaterialModal] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showRefillStockModal, setShowRefillStockModal] = useState(false);

  // Selected item for stock refill
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [refillAmount, setRefillAmount] = useState<number>(10);

  // New material form
  const [newMat, setNewMat] = useState({
    name: '',
    stock: 50,
    unit: 'กิโลกรัม (kg)',
    unitCost: 100,
    safetyStock: 10,
    category: 'herb_powder' as any
  });

  // New product form
  const [newProd, setNewProd] = useState({
    name: '',
    category: 'ยาแคปซูลสมุนไพร',
    sellPrice: 150,
    stock: 100,
    ingredients: [] as { materialId: string; amount: number }[]
  });

  const [ingredientSelection, setIngredientSelection] = useState({
    materialId: '',
    amount: 1
  });

  // Compounding Form state
  const [compoundingProductId, setCompoundingProductId] = useState('');
  const [compoundingQuantity, setCompoundingQuantity] = useState<number>(10);
  const [compoundingMessage, setCompoundingMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Editing states
  const [showEditMaterialModal, setShowEditMaterialModal] = useState(false);
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [editingMaterialData, setEditingMaterialData] = useState({
    name: '',
    stock: 0,
    unit: 'กิโลกรัม (kg)',
    unitCost: 100,
    safetyStock: 10,
    category: 'herb_powder' as any
  });
  const [deletingMaterial, setDeletingMaterial] = useState<HerbMaterial | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<HerbProduct | null>(null);

  const [showEditProductModal, setShowEditProductModal] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingProductData, setEditingProductData] = useState({
    name: '',
    category: 'ยาแคปซูลสมุนไพร',
    sellPrice: 150,
    stock: 100,
    ingredients: [] as { materialId: string; amount: number }[]
  });
  const [editProductIngredientSelection, setEditProductIngredientSelection] = useState({
    materialId: '',
    amount: 1
  });

  // Safety Stock Alerts
  const lowStockItems = useMemo(() => {
    return herbMaterials.filter(mat => mat.stock <= mat.safetyStock);
  }, [herbMaterials]);

  // Handle Add material submission
  const handleAddMaterialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMat.name) {
      alert('กรุณากรอกชื่อวัตถุดิบ');
      return;
    }
    onAddHerbMaterial(newMat);
    setShowAddMaterialModal(false);
    // Reset
    setNewMat({
      name: '',
      stock: 50,
      unit: 'กิโลกรัม (kg)',
      unitCost: 100,
      safetyStock: 10,
      category: 'herb_powder'
    });
  };

  // Handle Add Ingredient to new product recipe
  const handleAddIngredientToRecipe = () => {
    if (!ingredientSelection.materialId || ingredientSelection.amount <= 0) {
      alert('กรุณาเลือกวัตถุดิบและใส่ปริมาณที่ถูกต้อง');
      return;
    }
    // Check if already exists
    if (newProd.ingredients.some(i => i.materialId === ingredientSelection.materialId)) {
      alert('วัตถุดิบนี้อยู่ในสูตรแล้ว');
      return;
    }
    setNewProd({
      ...newProd,
      ingredients: [...newProd.ingredients, { ...ingredientSelection }]
    });
    setIngredientSelection({ materialId: '', amount: 1 });
  };

  const handleRemoveIngredientFromRecipe = (idx: number) => {
    const updated = [...newProd.ingredients];
    updated.splice(idx, 1);
    setNewProd({ ...newProd, ingredients: updated });
  };

  // Handle Add Product submission
  const handleAddProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProd.name || newProd.ingredients.length === 0) {
      alert('กรุณากรอกชื่อผลิตภัณฑ์และระบุสูตรวัตถุดิบอย่างน้อย 1 รายการ');
      return;
    }
    onAddHerbProduct(newProd);
    setShowAddProductModal(false);
    // Reset
    setNewProd({
      name: '',
      category: 'ยาแคปซูลสมุนไพร',
      sellPrice: 150,
      stock: 100,
      ingredients: []
    });
  };

  // Handle Refill stock submission
  const handleRefillStockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaterialId || refillAmount <= 0) {
      alert('กรุณากรอกข้อมูลให้ถูกต้อง');
      return;
    }
    onUpdateHerbMaterialStock(selectedMaterialId, refillAmount, 'จัดซื้อเพิ่มสต็อกวัตถุดิบสมุนไพร', true);
    setShowRefillStockModal(false);
    setSelectedMaterialId('');
    setRefillAmount(10);
  };

  // Handle Edit material submission
  const handleEditMaterialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMaterialId || !editingMaterialData.name) {
      alert('กรุณากรอกชื่อวัตถุดิบ');
      return;
    }
    onUpdateHerbMaterial(editingMaterialId, editingMaterialData);
    setShowEditMaterialModal(false);
    setEditingMaterialId(null);
  };

  // Handle Edit product submission
  const handleEditProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProductId || !editingProductData.name || editingProductData.ingredients.length === 0) {
      alert('กรุณากรอกชื่อผลิตภัณฑ์และระบุสูตรวัตถุดิบอย่างน้อย 1 รายการ');
      return;
    }
    onUpdateHerbProduct(editingProductId, editingProductData);
    setShowEditProductModal(false);
    setEditingProductId(null);
  };

  const handleAddIngredientToEditRecipe = () => {
    if (!editProductIngredientSelection.materialId || editProductIngredientSelection.amount <= 0) {
      alert('กรุณาเลือกวัตถุดิบและใส่ปริมาณที่ถูกต้อง');
      return;
    }
    if (editingProductData.ingredients.some(i => i.materialId === editProductIngredientSelection.materialId)) {
      alert('วัตถุดิบนี้อยู่ในสูตรแล้ว');
      return;
    }
    setEditingProductData({
      ...editingProductData,
      ingredients: [...editingProductData.ingredients, { ...editProductIngredientSelection }]
    });
    setEditProductIngredientSelection({ materialId: '', amount: 1 });
  };

  const handleRemoveIngredientFromEditRecipe = (idx: number) => {
    const updated = [...editingProductData.ingredients];
    updated.splice(idx, 1);
    setEditingProductData({ ...editingProductData, ingredients: updated });
  };

  // Handle Production compounding submission
  const handleCompoundingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!compoundingProductId || compoundingQuantity <= 0) {
      alert('กรุณาระบุผลิตภัณฑ์และจำนวนที่ต้องการผลิต');
      return;
    }

    const res = onProduceProduct(compoundingProductId, compoundingQuantity);
    if (res.success) {
      setCompoundingMessage({
        type: 'success',
        text: `ปรุงตำรับยาและผลิตสำเร็จ! เพิ่มเข้าสู่คลังสินค้าสำเร็จรูป ${compoundingQuantity} ชิ้น และหักลดคลังวัตถุดิบตามอัตราสูตรผสมแล้ว`
      });
      // Clear message after 6s
      setTimeout(() => setCompoundingMessage(null), 6000);
      setCompoundingQuantity(10);
    } else {
      setCompoundingMessage({
        type: 'error',
        text: res.error || 'เกิดข้อผิดพลาดในการปรุงตำรับยา'
      });
    }
  };

  // Prepare chart data for Raw Materials
  const rawMaterialChartData = useMemo(() => {
    return herbMaterials.map(mat => ({
      name: mat.name,
      'สต็อกคงเหลือ': mat.stock,
      'ระดับความปลอดภัย': mat.safetyStock,
      unit: mat.unit.split(' ')[0]
    }));
  }, [herbMaterials]);

  // Calculate stats
  const totalMaterialValue = useMemo(() => {
    return herbMaterials.reduce((sum, mat) => sum + mat.stock * mat.unitCost, 0);
  }, [herbMaterials]);

  const totalProductValue = useMemo(() => {
    return herbProducts.reduce((sum, p) => sum + p.stock * p.sellPrice, 0);
  }, [herbProducts]);

  return (
    <div className="space-y-6">
      
      {/* Brand Header Banner with Green Nature Theme */}
      <div className="bg-gradient-to-r from-emerald-800 via-green-700 to-emerald-900 rounded-3xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center justify-center translate-x-12">
          <Sprout className="w-80 h-80 text-white" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="bg-white/20 px-3 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border border-white/15">
                ORGANIC ERP SYSTEM
              </span>
              {lowStockItems.length > 0 && (
                <span className="bg-rose-500 text-white px-2.5 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 animate-pulse">
                  <AlertTriangle className="w-3 h-3" /> วัตถุดิบต่ำกว่าเกณฑ์ {lowStockItems.length} รายการ
                </span>
              )}
            </div>
            <h3 className="text-xl font-bold font-sans tracking-tight">ระบบบริหารคลังตำรับสมุนไพรและวัตถุดิบพรีเมียม</h3>
            <p className="text-xs text-emerald-100 font-light leading-relaxed max-w-2xl">
              จัดการวัตถุดิบสมุนไพรแห้ง สารสกัดเข้มข้น และแพ็กเกจจิ้ง ควบคุมความสอดคล้องของสูตรตำรับยา 
              คำนวณสัดส่วนและควบคุมสิทธิ์สั่งปรุงยา (Compounding Engine) อัตโนมัติเพื่อเชื่อมต่อยอดสะสมรายจ่ายจัดซื้อ
            </p>
          </div>
          <button
            onClick={() => {
              setActiveSubTab('compounding');
              setCompoundingMessage(null);
            }}
            className="shrink-0 bg-white hover:bg-emerald-50 text-emerald-800 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer self-start md:self-auto"
          >
            <Wrench className="w-4 h-4 text-emerald-700" /> เข้าสู่วิซาร์ดปรุงตำรับยา <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Statistics Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Card 1: Value of Raw Materials */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-700 shrink-0">
            <Sprout className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">มูลค่าวัตถุดิบในคลัง</span>
            <span className="text-lg font-bold font-sans text-slate-800">฿{totalMaterialValue.toLocaleString()}</span>
            <span className="text-[10px] text-emerald-600 block font-medium mt-0.5">{herbMaterials.length} รายการรวมสะสม</span>
          </div>
        </div>

        {/* Card 2: Value of Finished Goods */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-teal-50 rounded-xl text-teal-700 shrink-0">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">มูลค่าสินค้าพร้อมจำหน่าย</span>
            <span className="text-lg font-bold font-sans text-slate-800">฿{totalProductValue.toLocaleString()}</span>
            <span className="text-[10px] text-teal-600 block font-medium mt-0.5">{herbProducts.reduce((s, p) => s + p.stock, 0).toLocaleString()} ชิ้นรวมในระบบ</span>
          </div>
        </div>

        {/* Card 3: Production Runs */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-indigo-50 rounded-xl text-indigo-700 shrink-0">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">ประวัติสั่งผลิตรวม</span>
            <span className="text-lg font-bold font-sans text-slate-800">{productionLogs.length} ครั้ง</span>
            <span className="text-[10px] text-indigo-600 block font-medium mt-0.5">ผลิตล่าสุด: {productionLogs[0]?.date || 'ไม่มี'}</span>
          </div>
        </div>

        {/* Card 4: Safety Status */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-xl shrink-0 bg-amber-50 text-amber-700">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">วัตถุดิบต่ำกว่าเกณฑ์ภัย</span>
            <span className={`text-lg font-bold font-sans ${lowStockItems.length > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {lowStockItems.length} รายการ
            </span>
            <span className="text-[10px] text-slate-400 block font-medium mt-0.5">
              {lowStockItems.length > 0 ? 'ต้องการจัดซื้อเพื่อผลิตด่วน' : 'ทุกรายการอยู่ในเกณฑ์ปกติ'}
            </span>
          </div>
        </div>
      </div>

      {/* Secondary Sub-Tabs for Inventory Module */}
      <div className="bg-white rounded-2xl border border-slate-100 p-3 shadow-xs flex flex-wrap gap-1.5 items-center justify-between">
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setActiveSubTab('materials')}
            className={`px-4 py-2 rounded-xl text-xs font-bold font-sans tracking-tight transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'materials'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'hover:bg-slate-100 text-slate-600 hover:text-slate-800'
            }`}
          >
            <Sprout className="w-4 h-4" /> วัตถุดิบสมุนไพร
          </button>
          <button
            onClick={() => setActiveSubTab('products')}
            className={`px-4 py-2 rounded-xl text-xs font-bold font-sans tracking-tight transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'products'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'hover:bg-slate-100 text-slate-600 hover:text-slate-800'
            }`}
          >
            <Package className="w-4 h-4" /> ตำรับยาและสินค้า
          </button>
          <button
            onClick={() => setActiveSubTab('compounding')}
            className={`px-4 py-2 rounded-xl text-xs font-bold font-sans tracking-tight transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'compounding'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'hover:bg-slate-100 text-slate-600 hover:text-slate-800'
            }`}
          >
            <Wrench className="w-4 h-4" /> สั่งปรุงตำรับยา
          </button>
          <button
            onClick={() => setActiveSubTab('logs')}
            className={`px-4 py-2 rounded-xl text-xs font-bold font-sans tracking-tight transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'logs'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'hover:bg-slate-100 text-slate-600 hover:text-slate-800'
            }`}
          >
            <History className="w-4 h-4" /> ประวัติการปรุงยา
          </button>
        </div>

        {/* Contextual Action Buttons */}
        <div className="flex gap-2">
          {activeSubTab === 'materials' && (
            <>
              <button
                onClick={() => setShowRefillStockModal(true)}
                className="px-3.5 py-2 border border-emerald-600 hover:bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> ซื้อเพิ่มสต็อกวัตถุดิบ
              </button>
              <button
                onClick={() => setShowAddMaterialModal(true)}
                className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> เพิ่มวัตถุดิบใหม่
              </button>
            </>
          )}

          {activeSubTab === 'products' && (
            <button
              onClick={() => setShowAddProductModal(true)}
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> จดขึ้นทะเบียนตำรับใหม่
            </button>
          )}
        </div>
      </div>

      {/* Alert Panel for Low Stock Items */}
      {lowStockItems.length > 0 && activeSubTab === 'materials' && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex gap-2.5 items-start">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h5 className="text-xs font-bold text-slate-800">คำแจ้งเตือน: วัตถุดิบยาต่ำกว่าเกณฑ์ความปลอดภัย</h5>
              <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                วัตถุดิบจำนวน {lowStockItems.length} รายการ (
                {lowStockItems.map(m => `${m.name} เหลือ ${m.stock} ${m.unit.split(' ')[0]}`).join(', ')}
                ) ต่ำกว่าระดับเกณฑ์การเตือนภัยที่ปลอดภัย กรุณากดปุ่ม <strong>"ซื้อเพิ่มสต็อกวัตถุดิบ"</strong> เพื่อเพิ่มปริมาณวัตถุดิบ
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowRefillStockModal(true)}
            className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-3 py-1.5 rounded-lg text-[10px] cursor-pointer transition-all shrink-0 uppercase tracking-wide"
          >
            สั่งซื้อสต็อกเติมด่วน
          </button>
        </div>
      )}

      {/* Viewport Content Rendering */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Content Area (2 columns wide on large screens) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Sub-tab 1: RAW MATERIALS LIST */}
          {activeSubTab === 'materials' && (
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
              <div className="mb-4">
                <h4 className="text-slate-800 font-bold font-sans">สต็อกวัตถุดิบสมุนไพรและแพ็กเกจจิ้ง</h4>
                <p className="text-xs text-slate-400 font-sans">คลังสารสกัด ตำรับสมุนไพรบด และภาชนะบรรจุภัณฑ์หลักของบริษัท</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 text-xs font-bold">
                      <th className="py-2 pb-3">รหัสวัตถุดิบ</th>
                      <th className="py-2 pb-3">ชื่อวัตถุดิบ</th>
                      <th className="py-2 pb-3">ประเภท</th>
                      <th className="py-2 pb-3 text-right">จำนวนคงคลัง</th>
                      <th className="py-2 pb-3 text-right">เกณฑ์ปลอดภัย</th>
                      <th className="py-2 pb-3 text-right">ต้นทุนเฉลี่ย</th>
                      <th className="py-2 pb-3 text-right">มูลค่ารวม</th>
                      <th className="py-2 pb-3 text-right">การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {herbMaterials.map((mat) => {
                      const isLow = mat.stock <= mat.safetyStock;
                      return (
                        <tr key={mat.id} className="text-slate-700 hover:bg-slate-50/50 transition-colors text-xs">
                          <td className="py-3 font-mono text-[11px] text-slate-400 font-bold">{mat.id}</td>
                          <td className="py-3">
                            <span className="font-bold text-slate-800">{mat.name}</span>
                          </td>
                          <td className="py-3">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              mat.category === 'herb_powder' ? 'bg-emerald-50 text-emerald-700' :
                              mat.category === 'herb_dried' ? 'bg-amber-50 text-amber-700' :
                              mat.category === 'extract' ? 'bg-teal-50 text-teal-700' : 'bg-slate-50 text-slate-700'
                            }`}>
                              {mat.category === 'herb_powder' && 'สมุนไพรบดผง'}
                              {mat.category === 'herb_dried' && 'สมุนไพรอบแห้ง'}
                              {mat.category === 'extract' && 'สารสกัดเข้มข้น'}
                              {mat.category === 'packaging' && 'บรรจุภัณฑ์/กล่อง'}
                            </span>
                          </td>
                          <td className="py-3 text-right font-sans">
                            <span className={`font-bold ${isLow ? 'text-rose-600 animate-pulse' : 'text-slate-800'}`}>
                              {mat.stock.toLocaleString()}
                            </span>
                            <span className="text-slate-400 text-[10px] ml-1">{mat.unit.split(' ')[0]}</span>
                          </td>
                          <td className="py-3 text-right font-sans text-slate-500">
                            {mat.safetyStock} <span className="text-[10px] text-slate-400">{mat.unit.split(' ')[0]}</span>
                          </td>
                          <td className="py-3 text-right font-sans text-slate-600">฿{mat.unitCost}</td>
                          <td className="py-3 text-right font-sans font-bold text-slate-800">
                            ฿{(mat.stock * mat.unitCost).toLocaleString()}
                          </td>
                          <td className="py-3 text-right">
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setEditingMaterialId(mat.id);
                                  setEditingMaterialData({
                                    name: mat.name,
                                    stock: mat.stock,
                                    unit: mat.unit,
                                    unitCost: mat.unitCost,
                                    safetyStock: mat.safetyStock,
                                    category: mat.category
                                  });
                                  setShowEditMaterialModal(true);
                                }}
                                title="แก้ไขวัตถุดิบ"
                                className="text-slate-400 hover:text-amber-600 p-1 rounded hover:bg-amber-50 transition-colors cursor-pointer"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeletingMaterial(mat)}
                                title="ลบวัตถุดิบ"
                                className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sub-tab 2: PRODUCTS & FORMULATION RECIPES */}
          {activeSubTab === 'products' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {herbProducts.map((p) => (
                <div key={p.id} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md text-[10px] font-extrabold font-mono uppercase border border-emerald-100">
                        {p.id}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-400 font-bold">{p.category}</span>
                        <button
                          onClick={() => {
                            setEditingProductId(p.id);
                            setEditingProductData({
                              name: p.name,
                              category: p.category,
                              sellPrice: p.sellPrice,
                              stock: p.stock,
                              ingredients: [...p.ingredients]
                            });
                            setShowEditProductModal(true);
                          }}
                          title="แก้ไขตำรับยา"
                          className="text-slate-400 hover:text-amber-600 p-1 rounded hover:bg-amber-50 transition-colors cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingProduct(p)}
                          title="ลบตำรับยา"
                          className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <h4 className="text-sm font-bold text-slate-800 leading-tight font-sans">{p.name}</h4>
                  </div>

                  {/* Formulation Recipe Card */}
                  <div className="bg-slate-50 rounded-xl p-3 space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">สัดส่วนส่วนประกอบต่อ 1 หน่วยการผลิต:</span>
                    <div className="space-y-1.5 text-xs">
                      {p.ingredients.map((ing, idx) => {
                        const mat = herbMaterials.find(m => m.id === ing.materialId);
                        return (
                          <div key={idx} className="flex justify-between items-center text-slate-600 font-sans">
                            <span className="text-slate-500 font-medium">{mat ? mat.name : 'วัตถุดิบรหัสหาย'}</span>
                            <span className="font-bold text-slate-800">
                              {ing.amount} <span className="text-[10px] text-slate-400">{mat ? mat.unit.split(' ')[0] : ''}</span>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Stock and pricing controls */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">สต็อกในคลังยา</span>
                      <span className="text-sm font-sans font-extrabold text-slate-800">{p.stock.toLocaleString()} ชิ้น</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">ราคาขายปลีก</span>
                      <span className="text-sm font-sans font-extrabold text-emerald-700">฿{p.sellPrice} / ชิ้น</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Sub-tab 3: COMPOUNDING ENGINE WORKBENCH */}
          {activeSubTab === 'compounding' && (
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-6">
              <div>
                <h4 className="text-slate-800 font-bold font-sans">เวิร์กเบนช์สั่งปรุงและผสมยาแปรรูป</h4>
                <p className="text-xs text-slate-400 font-sans">คำนวณสัดส่วน อนุมัติเบิกจ่ายวัตถุดิบเพื่อผลิตเป็นยาหรือผลิตภัณฑ์สมุนไพรสำเร็จรูป</p>
              </div>

              {compoundingMessage && (
                <div className={`p-4 rounded-xl text-xs flex items-start gap-2 ${
                  compoundingMessage.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-rose-50 border border-rose-200 text-rose-800'
                }`}>
                  {compoundingMessage.type === 'success' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h5 className="font-bold">{compoundingMessage.type === 'success' ? 'สั่งผลิตสัดส่วนสำเร็จ' : 'การสั่งผลิตล้มเหลว'}</h5>
                    <p className="mt-0.5 leading-relaxed whitespace-pre-wrap">{compoundingMessage.text}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleCompoundingSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-slate-500 font-bold mb-1">เลือกตำรับสินค้าที่ต้องการผลิต</label>
                    <select
                      value={compoundingProductId}
                      onChange={(e) => {
                        setCompoundingProductId(e.target.value);
                        setCompoundingMessage(null);
                      }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-sans h-9.5"
                      required
                    >
                      <option value="">-- กรุณาเลือกตำรับยา --</option>
                      {herbProducts.map(p => (
                        <option key={p.id} value={p.id}>
                          [{p.id}] {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-500 font-bold mb-1">จำนวนหน่วยที่ผลิต (ชิ้น)</label>
                    <input
                      type="number"
                      min={1}
                      value={compoundingQuantity}
                      onChange={(e) => {
                        setCompoundingQuantity(Number(e.target.value));
                        setCompoundingMessage(null);
                      }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs font-mono h-9.5"
                      required
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={!compoundingProductId || compoundingQuantity <= 0}
                      className="w-full bg-emerald-700 hover:bg-emerald-600 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Wrench className="w-4 h-4" /> ตกลงสั่งปรุงตำรับและผลิตด่วน
                    </button>
                  </div>
                </div>

                {/* Live Ingredients Verification Panel */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-4">
                  <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2">
                    <Scale className="w-4 h-4 text-emerald-700" />
                    <span className="text-xs font-extrabold text-slate-700">ตรวจสอบสัดส่วนและยอดวัตถุดิบคงสต็อก</span>
                  </div>

                  {compoundingProductId ? (
                    <div className="space-y-3.5">
                      {herbProducts.find(p => p.id === compoundingProductId)?.ingredients.map((ing, index) => {
                        const mat = herbMaterials.find(m => m.id === ing.materialId);
                        const totalNeeded = ing.amount * compoundingQuantity;
                        const hasEnough = mat ? mat.stock >= totalNeeded : false;
                        return (
                          <div key={index} className="text-xs space-y-1">
                            <div className="flex justify-between items-center text-slate-600 font-sans">
                              <span className="font-bold text-slate-800">{mat ? mat.name : 'วัตถุดิบสูญหาย'}</span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                hasEnough ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                              }`}>
                                {hasEnough ? 'วัตถุดิบเพียงพอ' : 'วัตถุดิบไม่พอ!'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-[11px] text-slate-500 font-mono">
                              <span>ต้องการรวม: {totalNeeded.toFixed(2)} {mat ? mat.unit.split(' ')[0] : ''}</span>
                              <span>คงคลังจริง: {mat ? mat.stock.toFixed(2) : '0'} {mat ? mat.unit.split(' ')[0] : ''}</span>
                            </div>
                          </div>
                        );
                      })}
                      <div className="pt-2 border-t border-slate-200 text-[10px] text-slate-400 leading-relaxed font-sans">
                        * ปริมาณวัตถุดิบจะถูกปรับปรุงทันทีหลังจากกระบวนการปรุงตำรับยาเสร็จสิ้น และประวัติจะบันทึกไว้ในสมุดล็อก
                      </div>
                    </div>
                  ) : (
                    <div className="h-36 flex items-center justify-center text-center text-slate-400 text-xs px-6">
                      กรุณาเลือกตำรับและใส่จำนวนด้านซ้ายเพื่อทำการคำนวณและประเมินวัตถุดิบแบบเรียลไทม์
                    </div>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* Sub-tab 4: PRODUCTION RUN LOGS */}
          {activeSubTab === 'logs' && (
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
              <div className="mb-4">
                <h4 className="text-slate-800 font-bold font-sans">สมุดบันทึกประวัติการปรุงและผลิตสมุนไพร</h4>
                <p className="text-xs text-slate-400 font-sans">ประวัติการเบิกใช้วัตถุดิบและขึ้นทะเบียนสต็อกสินค้าแปรรูปสำเร็จรูป</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 text-xs font-bold">
                      <th className="py-2 pb-3">เลขที่การสั่งผลิต</th>
                      <th className="py-2 pb-3">วันที่</th>
                      <th className="py-2 pb-3">ตำรับยา/สินค้าที่ผลิต</th>
                      <th className="py-2 pb-3 text-right">จำนวนที่ผลิตได้ (ชิ้น)</th>
                      <th className="py-2 pb-3 text-right">ประมาณการมูลค่าวัตถุดิบ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-xs">
                    {productionLogs.map((log) => (
                      <tr key={log.id} className="text-slate-700 hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 font-mono font-bold text-slate-500">{log.id}</td>
                        <td className="py-3 font-mono text-slate-500">{log.date}</td>
                        <td className="py-3">
                          <span className="font-bold text-slate-800">{log.productName}</span>
                        </td>
                        <td className="py-3 text-right font-sans font-bold text-slate-800">
                          {log.quantity.toLocaleString()} ชิ้น
                        </td>
                        <td className="py-3 text-right font-sans font-bold text-emerald-700">
                          ฿{log.costEstimate.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Information Panel (1 column wide on large screens) */}
        <div className="space-y-6">
          
          {/* Chart Card of Raw Materials */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
            <div>
              <h4 className="text-slate-800 font-bold font-sans text-xs">สัดส่วนและระดับวัตถุดิบคงสต็อก</h4>
              <p className="text-[10px] text-slate-400 font-sans">เปรียบเทียบปริมาณวัตถุดิบและระดับเกณฑ์เตือนภัยความปลอดภัย</p>
            </div>

            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rawMaterialChartData} margin={{ top: 10, right: 0, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748b' }} stroke="#cbd5e1" />
                  <YAxis tick={{ fontSize: 9, fill: '#64748b' }} stroke="#cbd5e1" />
                  <Tooltip
                    contentStyle={{ background: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '10px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 9, paddingTop: 10 }} />
                  <Bar dataKey="สต็อกคงเหลือ" fill="#047857" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="ระดับความปลอดภัย" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Business Formulation Guide (Educational Content for users) */}
          <div className="bg-gradient-to-br from-emerald-50 to-green-100/50 rounded-2xl p-5 border border-emerald-100/50 space-y-4">
            <div className="flex items-center gap-2 text-emerald-800">
              <Scale className="w-5 h-5" />
              <h5 className="text-xs font-bold font-sans">แนวปฏิบัติการควบคุมสูตรบำรุง</h5>
            </div>
            <p className="text-[11px] text-emerald-950 font-sans leading-relaxed">
              การบริหารจัดการตำรับสมุนไพรที่ดีของ <strong>"บริษัท คุณชายสมุนไพร จำกัด"</strong> ต้องคำนึงถึงระดับสูญเสียระหว่างกระบวนการบดผสมและขึ้นรูป (Yield Loss) เสมอ 
              โดยระบบจะยึดหลักสูตรสมุนไพรบดที่ได้ขึ้นทะเบียนอย.ไว้
            </p>
            <div className="space-y-2 text-[10px] text-emerald-900 font-sans">
              <div className="flex gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>รักษาระดับความชื้นต่ำกว่า 8% เพื่อความปลอดภัยและยืดอายุสต็อกแห้ง</span>
              </div>
              <div className="flex gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>จัดกลุ่มบรรจุภัณฑ์ให้อยู่ใกล้เคียงกับความต้องการของสัดส่วนเม็ดยาหลัก</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: ADD NEW RAW MATERIAL */}
      {showAddMaterialModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-slate-100 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="text-sm font-sans font-bold text-slate-800">จดรายการวัตถุดิบสมุนไพร/แพ็กเกจใหม่</h4>
              <button onClick={() => setShowAddMaterialModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddMaterialSubmit} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-[11px] text-slate-500 font-bold mb-1">ชื่อวัตถุดิบ *</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ตะไคร้หอมแห้งบด, ขวดยาน้ำ 60ml"
                  value={newMat.name}
                  onChange={(e) => setNewMat({ ...newMat, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1">หมวดหมู่</label>
                  <select
                    value={newMat.category}
                    onChange={(e) => setNewMat({ ...newMat, category: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="herb_powder">สมุนไพรบดผง</option>
                    <option value="herb_dried">สมุนไพรอบแห้ง</option>
                    <option value="extract">สารสกัดเข้มข้น</option>
                    <option value="packaging">บรรจุภัณฑ์/กล่อง</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1">หน่วยนับ</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น กิโลกรัม (kg), เม็ด (pcs)"
                    value={newMat.unit}
                    onChange={(e) => setNewMat({ ...newMat, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1">สต็อกเริ่มแรก</label>
                  <input
                    type="number"
                    min={0}
                    value={newMat.stock}
                    onChange={(e) => setNewMat({ ...newMat, stock: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1">ต้นทุนจัดซื้อ/หน่วย</label>
                  <input
                    type="number"
                    min={0}
                    value={newMat.unitCost}
                    onChange={(e) => setNewMat({ ...newMat, unitCost: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1">จุดเตือนภัยต่ำ</label>
                  <input
                    type="number"
                    min={0}
                    value={newMat.safetyStock}
                    onChange={(e) => setNewMat({ ...newMat, safetyStock: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddMaterialModal(false)}
                  className="px-4 py-2 bg-slate-150 hover:bg-slate-200 text-slate-700 font-bold rounded-lg cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-lg cursor-pointer"
                >
                  บันทึกวัตถุดิบ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: BUY STOCK REFILL (INTEGRATED WITH ACCOUNTING EXPENSES) */}
      {showRefillStockModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-slate-100 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="text-sm font-sans font-bold text-slate-800">จัดซื้อวัตถุดิบและลงบันทึกบัญชีรายจ่ายด่วน</h4>
              <button onClick={() => setShowRefillStockModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRefillStockSubmit} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-[11px] text-slate-500 font-bold mb-1">เลือกวัตถุดิบสมุนไพร *</label>
                <select
                  required
                  value={selectedMaterialId}
                  onChange={(e) => setSelectedMaterialId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                >
                  <option value="">-- กรุณาเลือกรายการ --</option>
                  {herbMaterials.map(m => (
                    <option key={m.id} value={m.id}>
                      [{m.id}] {m.name} (ต้นทุน ฿{m.unitCost} / {m.unit.split(' ')[0]})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 font-bold mb-1">ปริมาณที่จัดซื้อเพิ่มเติม *</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    required
                    min={1}
                    value={refillAmount}
                    onChange={(e) => setRefillAmount(Number(e.target.value))}
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg font-mono"
                  />
                  <span className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg font-bold text-slate-500 flex items-center shrink-0">
                    {herbMaterials.find(m => m.id === selectedMaterialId)?.unit.split(' ')[0] || '-'}
                  </span>
                </div>
              </div>

              {selectedMaterialId && (
                <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100 space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wide">คำนวณราคาจัดซื้อและบันทึกสมุดบัญชีแยกประเภท</span>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">รวมราคาจ่ายสั่งซื้อวัตถุดิบ:</span>
                    <span className="font-extrabold text-slate-800">
                      ฿{((herbMaterials.find(m => m.id === selectedMaterialId)?.unitCost || 0) * refillAmount).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-[10px] text-rose-600 font-sans leading-relaxed mt-1">
                    * เมื่อทำรายการ ระบบจะสร้างประวัติธุรกรรมจ่าย (Expense) ของบริษัทในบัญชีแยกประเภทโดยอัตโนมัติ เพื่อเชื่อมงบแสดงกำไรขาดทุนสะสมทันที
                  </div>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowRefillStockModal(false)}
                  className="px-4 py-2 bg-slate-150 hover:bg-slate-200 text-slate-700 font-bold rounded-lg cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={!selectedMaterialId || refillAmount <= 0}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold rounded-lg cursor-pointer"
                >
                  ชำระจัดซื้อวัตถุดิบ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD NEW PRODUCT RECIPE / REGISTRATION */}
      {showAddProductModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full border border-slate-100 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="text-sm font-sans font-bold text-slate-800">จดขึ้นทะเบียนตำรับยาและตำราสมุนไพรสำเร็จรูปใหม่</h4>
              <button onClick={() => setShowAddProductModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddProductSubmit} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-[11px] text-slate-500 font-bold mb-1">ชื่อตำรับ/ผลิตภัณฑ์สำเร็จรูป *</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ยาหม่องกระชายดำตราคุณชาย, ชาเกสรดอกไม้เบญจพรรณ"
                  value={newProd.name}
                  onChange={(e) => setNewProd({ ...newProd, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1">หมวดหมู่ยา</label>
                  <select
                    value={newProd.category}
                    onChange={(e) => setNewProd({ ...newProd, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="ยาแคปซูลสมุนไพร">ยาแคปซูลสมุนไพร</option>
                    <option value="น้ำเชื่อม/ยาน้ำ">น้ำเชื่อม/ยาน้ำ</option>
                    <option value="ยาดม/ยาทาภายนอก">ยาดม/ยาทาภายนอก</option>
                    <option value="ชาและเกล็ดสมุนไพร">ชาและเกล็ดสมุนไพร</option>
                    <option value="สารสกัดแปรรูป">สารสกัดแปรรูป</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1">ราคาจำหน่ายขายปลีก (บาท) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newProd.sellPrice}
                    onChange={(e) => setNewProd({ ...newProd, sellPrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
              </div>

              {/* Formulation Ingredients Constructor Panel */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-3">
                <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wide">ประกอบสัดส่วนตำรับ (Formulation Builder) *</span>
                
                {/* Ingredient selection inputs */}
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="block text-[10px] text-slate-400 mb-0.5">เลือกสารตั้งต้น/วัตถุดิบ</label>
                    <select
                      value={ingredientSelection.materialId}
                      onChange={(e) => setIngredientSelection({ ...ingredientSelection, materialId: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-xs"
                    >
                      <option value="">-- เลือกวัตถุดิบ --</option>
                      {herbMaterials.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.unit.split(' ')[0]})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-24">
                    <label className="block text-[10px] text-slate-400 mb-0.5">ปริมาณต่อ 1 ชิ้น</label>
                    <input
                      type="number"
                      step="any"
                      min="0.0001"
                      value={ingredientSelection.amount}
                      onChange={(e) => setIngredientSelection({ ...ingredientSelection, amount: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-mono text-xs"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddIngredientToRecipe}
                    className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold h-8.5 px-3 rounded-lg text-[11px] cursor-pointer shrink-0"
                  >
                    เพิ่มลงสูตร
                  </button>
                </div>

                {/* Recipe ingredients table */}
                <div className="space-y-1.5 pt-1.5 border-t border-slate-200 max-h-28 overflow-y-auto">
                  {newProd.ingredients.length > 0 ? (
                    newProd.ingredients.map((ing, idx) => {
                      const mat = herbMaterials.find(m => m.id === ing.materialId);
                      return (
                        <div key={idx} className="flex justify-between items-center text-xs bg-white border border-slate-100 p-2 rounded-lg">
                          <span className="font-bold text-slate-700">{mat ? mat.name : 'วัตถุดิบ'}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-slate-800">
                              {ing.amount} <span className="text-[10px] text-slate-400">{mat ? mat.unit.split(' ')[0] : ''}</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveIngredientFromRecipe(idx)}
                              className="text-rose-500 hover:text-rose-700 font-bold cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center text-slate-400 text-[10px] py-4">
                      กรุณาเพิ่มสัดส่วนวัตถุดิบข้างต้นเพื่อให้ขึ้นรูปยาสำเร็จรูปได้ถูกต้อง
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  className="px-4 py-2 bg-slate-150 hover:bg-slate-200 text-slate-700 font-bold rounded-lg cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleAddProductSubmit}
                  disabled={newProd.ingredients.length === 0 || !newProd.name}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold rounded-lg cursor-pointer"
                >
                  บันทึกตำรับยา
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT MATERIAL */}
      {showEditMaterialModal && editingMaterialId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-slate-100 shadow-xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5 text-emerald-800">
                <Edit className="w-5 h-5 text-emerald-600" />
                <h4 className="text-sm font-sans font-bold">แก้ไขข้อมูลวัตถุดิบ ({editingMaterialId})</h4>
              </div>
              <button onClick={() => { setShowEditMaterialModal(false); setEditingMaterialId(null); }} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditMaterialSubmit} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-[11px] text-slate-500 font-bold mb-1">ชื่อวัตถุดิบ/บรรจุภัณฑ์ *</label>
                <input
                  type="text"
                  required
                  value={editingMaterialData.name}
                  onChange={(e) => setEditingMaterialData({ ...editingMaterialData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1">หมวดหมู่</label>
                  <select
                    value={editingMaterialData.category}
                    onChange={(e) => setEditingMaterialData({ ...editingMaterialData, category: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="herb_powder">สมุนไพรบดผง</option>
                    <option value="herb_dried">สมุนไพรอบแห้ง</option>
                    <option value="extract">สารสกัดเข้มข้น</option>
                    <option value="packaging">บรรจุภัณฑ์/กล่อง</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1">หน่วยนับ</label>
                  <input
                    type="text"
                    required
                    value={editingMaterialData.unit}
                    onChange={(e) => setEditingMaterialData({ ...editingMaterialData, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1">จำนวนคงคลัง</label>
                  <input
                    type="number"
                    min={0}
                    value={editingMaterialData.stock}
                    onChange={(e) => setEditingMaterialData({ ...editingMaterialData, stock: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1">ต้นทุนจัดซื้อ/หน่วย</label>
                  <input
                    type="number"
                    min={0}
                    value={editingMaterialData.unitCost}
                    onChange={(e) => setEditingMaterialData({ ...editingMaterialData, unitCost: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1">จุดเตือนภัยต่ำ</label>
                  <input
                    type="number"
                    min={0}
                    value={editingMaterialData.safetyStock}
                    onChange={(e) => setEditingMaterialData({ ...editingMaterialData, safetyStock: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => { setShowEditMaterialModal(false); setEditingMaterialId(null); }}
                  className="px-4 py-2 bg-slate-150 hover:bg-slate-200 text-slate-700 font-bold rounded-lg cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-lg cursor-pointer"
                >
                  อัปเดตข้อมูลวัตถุดิบ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT PRODUCT */}
      {showEditProductModal && editingProductId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-slate-100 shadow-xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5 text-emerald-800">
                <Edit className="w-5 h-5 text-emerald-600" />
                <h4 className="text-sm font-sans font-bold">แก้ไขข้อมูลตำรับสินค้า ({editingProductId})</h4>
              </div>
              <button onClick={() => { setShowEditProductModal(false); setEditingProductId(null); }} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditProductSubmit} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-[11px] text-slate-500 font-bold mb-1">ชื่อผลิตภัณฑ์สมุนไพร *</label>
                <input
                  type="text"
                  required
                  value={editingProductData.name}
                  onChange={(e) => setEditingProductData({ ...editingProductData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1">หมวดหมู่ผลิตภัณฑ์</label>
                  <select
                    value={editingProductData.category}
                    onChange={(e) => setEditingProductData({ ...editingProductData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="ยาแคปซูลสมุนไพร">ยาแคปซูลสมุนไพร</option>
                    <option value="น้ำเชื่อม/ยาน้ำ">น้ำเชื่อม/ยาน้ำ</option>
                    <option value="ยาดม/ยาทาภายนอก">ยาดม/ยาทาภายนอก</option>
                    <option value="ชาและเกล็ดสมุนไพร">ชาและเกล็ดสมุนไพร</option>
                    <option value="สารสกัดแปรรูป">สารสกัดแปรรูป</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1">ราคาจำหน่ายขายปลีก (บาท) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={editingProductData.sellPrice}
                    onChange={(e) => setEditingProductData({ ...editingProductData, sellPrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
              </div>

              {/* Formulation Ingredients Constructor Panel */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-3">
                <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wide">สัดส่วนสูตรยา (Formulation) *</span>
                
                {/* Ingredient selection inputs */}
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="block text-[10px] text-slate-400 mb-0.5">เลือกสารตั้งต้น/วัตถุดิบ</label>
                    <select
                      value={editProductIngredientSelection.materialId}
                      onChange={(e) => setEditProductIngredientSelection({ ...editProductIngredientSelection, materialId: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-xs"
                    >
                      <option value="">-- เลือกวัตถุดิบ --</option>
                      {herbMaterials.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.unit.split(' ')[0]})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-20">
                    <label className="block text-[10px] text-slate-400 mb-0.5">ปริมาณ</label>
                    <input
                      type="number"
                      step="any"
                      min="0.0001"
                      value={editProductIngredientSelection.amount}
                      onChange={(e) => setEditProductIngredientSelection({ ...editProductIngredientSelection, amount: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-mono text-xs"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddIngredientToEditRecipe}
                    className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold h-8.5 px-2.5 rounded-lg text-[11px] cursor-pointer shrink-0"
                  >
                    เพิ่ม
                  </button>
                </div>

                {/* Recipe ingredients table */}
                <div className="space-y-1.5 pt-1.5 border-t border-slate-200 max-h-24 overflow-y-auto">
                  {editingProductData.ingredients.length > 0 ? (
                    editingProductData.ingredients.map((ing, idx) => {
                      const mat = herbMaterials.find(m => m.id === ing.materialId);
                      return (
                        <div key={idx} className="flex justify-between items-center text-xs bg-white border border-slate-100 p-2 rounded-lg">
                          <span className="font-bold text-slate-700">{mat ? mat.name : 'วัตถุดิบ'}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-slate-800">
                              {ing.amount} <span className="text-[10px] text-slate-400">{mat ? mat.unit.split(' ')[0] : ''}</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveIngredientFromEditRecipe(idx)}
                              className="text-rose-500 hover:text-rose-700 font-bold cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center text-slate-400 text-[10px] py-4">
                      กรุณาเพิ่มสัดส่วนวัตถุดิบข้างต้นเพื่อให้ขึ้นรูปยาสำเร็จรูปได้ถูกต้อง
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => { setShowEditProductModal(false); setEditingProductId(null); }}
                  className="px-4 py-2 bg-slate-150 hover:bg-slate-200 text-slate-700 font-bold rounded-lg cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={editingProductData.ingredients.length === 0 || !editingProductData.name}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold rounded-lg cursor-pointer"
                >
                  อัปเดตข้อมูลสินค้า
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Delete Material Modal */}
      {deletingMaterial && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-100 shadow-2xl p-6 text-xs font-sans space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2 bg-rose-50 rounded-full">
                <Trash2 className="w-6 h-6 stroke-[2.5px]" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-800">ยืนยันการลบวัตถุดิบสมุนไพร</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">การดำเนินการนี้จะลบรายการวัตถุดิบออกจากสต็อกถาวร</p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">ชื่อวัตถุดิบ:</span>
                <span className="font-extrabold text-slate-800">{deletingMaterial.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">คงเหลือในคลัง:</span>
                <span className="font-semibold text-slate-800">{deletingMaterial.stock} {deletingMaterial.unit.split(' ')[0]}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">มูลค่ารวมคลัง:</span>
                <span className="font-mono text-slate-800 font-bold">฿{(deletingMaterial.stock * deletingMaterial.unitCost).toLocaleString()}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
              คุณมั่นใจที่จะลบวัตถุดิบสมุนไพรนี้ออกจากคลังหรือไม่? การลบข้อมูลนี้อาจทำให้ตำรับผลิตภัณฑ์สมุนไพรที่เชื่อมโยงกับวัตถุดิบชิ้นนี้เกิดข้อผิดพลาดในการประเมินสัดส่วนได้
            </p>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setDeletingMaterial(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteHerbMaterial(deletingMaterial.id);
                  setDeletingMaterial(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl cursor-pointer transition-colors shadow-md shadow-rose-600/10"
              >
                ยืนยันการลบวัตถุดิบ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Delete Product Modal */}
      {deletingProduct && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-100 shadow-2xl p-6 text-xs font-sans space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2 bg-rose-50 rounded-full">
                <Trash2 className="w-6 h-6 stroke-[2.5px]" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-800">ยืนยันการลบตำรับยาสมุนไพร</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">ลบชื่อสินค้าและสูตรสัดส่วนยาสำเร็จรูปฉบับนี้</p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">ชื่อผลิตภัณฑ์:</span>
                <span className="font-extrabold text-slate-800">{deletingProduct.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">หมวดหมู่ยา:</span>
                <span className="font-semibold text-slate-800">{deletingProduct.category}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">ราคาจำหน่าย:</span>
                <span className="font-mono text-emerald-600 font-bold">฿{deletingProduct.sellPrice.toLocaleString()}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
              คุณมั่นใจที่จะลบตำรับสินค้าสำเร็จรูปและส่วนผสมของยาตราคุณชายชุดนี้ออกอย่างถาวรหรือไม่? การกระทำนี้ไม่สามารถย้อนคืนได้
            </p>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setDeletingProduct(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteHerbProduct(deletingProduct.id);
                  setDeletingProduct(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl cursor-pointer transition-colors shadow-md shadow-rose-600/10"
              >
                ยืนยันการลบตำรับสินค้า
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
