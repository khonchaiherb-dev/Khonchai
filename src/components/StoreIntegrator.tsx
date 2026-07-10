/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingBag,
  RefreshCw,
  Link as LinkIcon,
  Link2Off,
  CheckCircle2,
  AlertTriangle,
  FileText,
  DollarSign,
  Layers,
  Settings,
  Plus,
  ArrowRight,
  Database,
  ExternalLink,
  ShieldAlert,
  Info,
  Calendar,
  Zap,
  Check,
  ChevronRight,
  X,
  Search,
  Filter,
  Printer,
  Percent,
  Truck,
  TrendingUp,
  Target,
  Coins,
  Play,
  Pause
} from 'lucide-react';
import { HerbProduct, Transaction, TransactionType, TransactionCategory } from '../types';

interface StoreIntegratorProps {
  herbProducts: HerbProduct[];
  transactions: Transaction[];
  onAddTransaction: (tx: Omit<Transaction, 'id'>) => void;
  onUpdateHerbProduct: (id: string, updated: Partial<HerbProduct>) => void;
}

interface ConnectedStore {
  id: string;
  platform: 'shopee' | 'tiktok';
  shopName: string;
  shopId: string;
  connectedAt: string;
  status: 'active' | 'expired';
  environment: 'sandbox' | 'production';
  orderCount: number;
}

interface OnlineProduct {
  id: string;
  platform: 'shopee' | 'tiktok';
  onlineSku: string;
  onlineName: string;
  onlinePrice: number;
  onlineStock: number;
  linkedProductId: string | null; // References local HerbProduct id
}

interface OnlineOrder {
  id: string; // e.g. SHOPEE-99812-A
  platform: 'shopee' | 'tiktok';
  customerName: string;
  items: {
    sku: string;
    quantity: number;
    onlineProductName: string;
  }[];
  totalAmount: number;
  status: 'pending_shipment' | 'completed' | 'cancelled';
  orderDate: string;
  ledgerSynced: boolean;
  trackingNumber?: string;
  shippingAddress?: string;
  carrierName?: string;
}

export interface AdCampaign {
  id: string;
  platform: 'shopee' | 'tiktok';
  name: string;
  type: string;
  status: 'active' | 'paused';
  dailyBudget: number;
  spent: number;
  impressions: number;
  clicks: number;
  orders: number;
  revenue: number;
}

// -------------------------------------------------------------
// CONSTANTS FOR PLATFORM FEE STRUCTURES AND STRATEGY OPTIMIZER
// -------------------------------------------------------------
interface FeeItem {
  name: string;
  rate: number;
  description: string;
}

interface PlatformFeeTemplate {
  key: string;
  name: string;
  badgeColor: string;
  logoColor: string;
  fees: FeeItem[];
  standardActive: boolean[];
  estimatedAdCost: number;
  shippingSubsidy: string;
  payoutCycle: string;
  marketingTip: string;
}

const PLATFORM_FEE_TEMPLATES: PlatformFeeTemplate[] = [
  {
    key: 'shopee',
    name: 'Shopee (ช้อปปี้)',
    badgeColor: 'bg-orange-500 text-white border border-orange-400',
    logoColor: 'text-orange-500',
    fees: [
      { name: 'ค่าธรรมเนียมการขาย (Commission Fee)', rate: 5.35, description: 'คิดจากราคาสินค้าลบส่วนลดร้านค้า (ปกติ 5% + VAT 7%)' },
      { name: 'ค่าบริการธุรกรรมชำระเงิน (Transaction Fee)', rate: 3.21, description: 'คิดจากยอดรวมรวมค่าส่ง (จ่ายผ่านบัตร, โอน, QR, COD)' },
      { name: 'ค่าบริการเข้าร่วมโปรแกรมส่งฟรี (FSS)', rate: 4.28, description: 'ตัวเลือกเข้าร่วมโปรแกรมส่งฟรีร้านค้าพิเศษพิเศษสะสมยอด' },
      { name: 'ค่าบริการเข้าร่วมเหรียญคืน (CCB)', rate: 3.21, description: 'ตัวเลือกเข้าร่วมโปรแกรมเงินคืนเหรียญร้านค้าพิเศษ' },
    ],
    standardActive: [true, true, true, false],
    estimatedAdCost: 10,
    shippingSubsidy: 'มีระบบออกโค้ดส่งฟรีให้ลูกค้า ช่วยเพิ่มอัตราออเดอร์สูงขึ้น',
    payoutCycle: '3-5 วันทำการ หลังลูกค้ากดยืนยันออเดอร์',
    marketingTip: 'เหมาะสำหรับกลุ่มสมุนไพรจัดชุดเซ็ต (Bundle Sets) มูลค่าตั้งแต่ 300 บาทขึ้นไป เพื่อให้คุ้มกับค่าบริการ และควรเปิดโฆษณา Shopee Ads เพื่อดันสินค้าให้ติดอันดับต้นๆ'
  },
  {
    key: 'tiktok',
    name: 'TikTok Shop (ติ๊กต๊อกช็อป)',
    badgeColor: 'bg-slate-950 text-white border border-slate-800',
    logoColor: 'text-slate-800',
    fees: [
      { name: 'ค่าคอมมิชชันตลาด (Marketplace Commission)', rate: 4.28, description: 'คิดตามหมวดหมู่สินค้าสุขภาพและผลิตภัณฑ์ดูแลผิว (ปกติ 4% + VAT 7%)' },
      { name: 'ค่าธรรมเนียมธุรกรรมชำระเงิน (Transaction Fee)', rate: 3.21, description: 'หักจากค่าธุรกรรมการสั่งซื้อและการชำระเงินของติ๊กต๊อก' },
      { name: 'ค่าบริการคูปองโปรแกรมพิเศษ (Live Campaign)', rate: 3.21, description: 'ค่าเข้าร่วมแคมเปญแจกคูปองลดพิเศษในไลฟ์สดและคลิปสั้น' },
      { name: 'ค่านายหน้าพันธมิตร (Affiliate/Creator Fee)', rate: 10.0, description: 'ค่าจ้างครีเอเตอร์ช่วยริวิวปักหมุดตะกร้าสินค้า (สามารถเลือกปรับตามจริง)' }
    ],
    standardActive: [true, true, true, false],
    estimatedAdCost: 5,
    shippingSubsidy: 'ลูกค้าสามารถกดคูปองจัดส่งฟรีได้ง่ายเมื่อรับชมไลฟ์สด',
    payoutCycle: '7 วันทำการ หลังลูกค้ารับสินค้าและยืนยันสำเร็จ',
    marketingTip: 'เน้นส่งสินค้าตัวอย่างให้ตัวแทนครีเอเตอร์ (Affiliate) ช่วยปักตะกร้า หรือไลฟ์สดแนะนำสรรพคุณสมุนไพร เพื่อดึงดูดผู้ซื้อที่ชอบการสื่อสารแบบเรียลไทม์'
  },
  {
    key: 'lazada',
    name: 'Lazada (ลาซาด้า)',
    badgeColor: 'bg-blue-600 text-white border border-blue-500',
    logoColor: 'text-blue-600',
    fees: [
      { name: 'ค่าธรรมเนียมการใช้แพลตฟอร์ม (Platform Fee)', rate: 5.35, description: 'คิดตามสัดส่วนหมวดหมู่ผลิตภัณฑ์อาหารและเครื่องดื่มเพื่อสุขภาพ' },
      { name: 'ค่าธรรมเนียมธุรกรรมและชำระเงิน (Payment Fee)', rate: 3.21, description: 'ค่าดำเนินการชำระเงินปลายทาง บัตรเครดิต และโมบายแบงก์กิ้ง' },
      { name: 'ค่าธรรมเนียมโปรแกรมจัดส่งฟรีพิเศษ (Freeshipping)', rate: 4.28, description: 'เข้าร่วมโครงการจัดส่งฟรีพิเศษสะสมยอดให้กับลูกค้าร้านแนะนำ' },
      { name: 'ค่าบริการสะสมเหรียญคืนเงิน (Cashback)', rate: 3.21, description: 'โปรแกรมเข้าร่วมสะสมคะแนนคืนเหรียญลดราคายอดนิยม' }
    ],
    standardActive: [true, true, true, false],
    estimatedAdCost: 8,
    shippingSubsidy: 'สนับสนุนสิทธิพิเศษจัดส่งฟรีโดยพาร์ทเนอร์ระบบหลังบ้าน',
    payoutCycle: 'โอนเงินเข้าบัญชีทุกๆ สัปดาห์ตามรอบสเตทเมนท์',
    marketingTip: 'ใช้โปรแกรมส่งฟรีควบคู่กับการใช้โฆษณา Sponsored Solutions เพื่อดึงคนที่มีเจตนาซื้อสูง และคอยจัดคูปองสะสมเหรียญเพื่อกระตุ้นให้กลับมาซื้อซ้ำ'
  },
  {
    key: 'line_shopping',
    name: 'LINE SHOPPING (ไลน์ช็อปปิ้ง)',
    badgeColor: 'bg-emerald-500 text-white border border-emerald-400',
    logoColor: 'text-emerald-500',
    fees: [
      { name: 'ค่าธรรมเนียมแรกเข้าและรายปี (No Entry/Annual Fee)', rate: 0.0, description: 'ไม่มีการหักค่าบริการรายปี เปิดร้านและลิสต์สินค้าได้ไม่จำกัด' },
      { name: 'ค่าธรรมเนียม Rabbit LINE Pay (PG Gateway)', rate: 2.68, description: 'คิดค่าบริการเมื่อลูกค้าชำระเงินผ่านระบบ Rabbit LINE Pay (รวม VAT)' },
      { name: 'ค่าโอนเงินตรงบัญชีร้านค้า (PromptPay/Bank Transfer)', rate: 0.0, description: 'ไม่มีค่าธรรมเนียมใดๆ เพิ่มเติม เมื่อลูกค้าโอนเงินตรงและส่งสลิปแชต' }
    ],
    standardActive: [true, true, false],
    estimatedAdCost: 0,
    shippingSubsidy: 'ไม่มีระบบออกโค้ดส่งฟรี ร้านค้าต้องดูแลค่าจัดส่งและกำหนดเอง',
    payoutCycle: 'ลูกค้าโอนตรงเข้าบัญชีทันที หรือ 1-3 วันผ่านเกตเวย์',
    marketingTip: 'ช่องทางที่ค่าธรรมเนียมดีที่สุด เหมาะกับการรักษาฐานลูกค้าเก่า (Loyalty/Retention) แนะนำให้ใช้เครื่องมือ Broadcast บรอดแคสต์โปรโมชั่นผ่าน Line OA เพื่อรับกำไรเต็มเม็ดเต็มหน่วย'
  },
  {
    key: 'social_commerce',
    name: 'Direct FB Ads / Line OA / Inbox',
    badgeColor: 'bg-indigo-600 text-white border border-indigo-500',
    logoColor: 'text-indigo-600',
    fees: [
      { name: 'ค่าคอมมิชชันแอปขายสินค้า (No Platform Commission)', rate: 0.0, description: 'ไม่มีสัดส่วนค่าธรรมเนียมการขายใดๆ หักจากผู้ให้บริการโซเชียลมีเดีย' },
      { name: 'ค่าธรรมเนียมชำระเงิน PromptPay (QR Code)', rate: 0.0, description: 'ผู้ซื้อโอนเงินเข้าสมุดบัญชีบริษัทโดยตรง 0% ไม่มีหักใดๆ' },
      { name: 'ต้นทุนโฆษณาเฉลี่ยต่อคำสั่งซื้อ (Customer Acquisition Cost)', rate: 30.0, description: 'อัตราต้นทุนยิงแอดพิกเซล FB/IG เพื่อเกิดยอดขายต่อบิล (เฉลี่ยปรับปรุงได้)' }
    ],
    standardActive: [true, true, true],
    estimatedAdCost: 30,
    shippingSubsidy: 'ร้านค้าบริการจัดหาและเลือกขนส่งพัสดุเองทั้งหมด',
    payoutCycle: 'ได้รับเงินสดทันทีหลังลูกค้าแนบสลิปผ่านทางกล่องข้อความแชต',
    marketingTip: 'แม้ไม่มีค่าธรรมเนียม แต่ต้นทุนการยิงแอดแปรผันสูงมาก วิธีแก้คือเน้นการเพิ่มค่าเฉลี่ยต่อบิล (AOV) เช่น ออกโปรโมชั่นซื้อ 2 แถม 1 หรือชุดต้มสมุนไพร 3 เดือน เพื่อให้คุ้มกับค่าแอดเฉลี่ยต่อออเดอร์'
  }
];

const MARKETING_STRATEGIES = [
  {
    id: 'strat-1',
    title: 'ออกแบบชุดมัดรวมสินค้า (Bundle Packs)',
    description: 'จัดทำเซ็ตสินค้าคู่กัน เช่น ชาชงสมุนไพรกระเจี๊ยบ + ยาอมมะขามป้อม ปรับราคาขายรวมเพื่อลดผลกระทบจากค่าบริการคำสั่งซื้อคงที่ของช้อปปี้',
    impact: 'ช่วยเพิ่มค่าเฉลี่ยต่อออเดอร์ (AOV) ได้สูงสุดถึง +40% และลดเฉลี่ยสัดส่วนค่าธุรกรรมลง',
  },
  {
    id: 'strat-2',
    title: 'จ้างครีเอเตอร์ช่วยแชร์ตะกร้า (TikTok Creator Affiliate)',
    description: 'เปิดรับผู้ใช้ติ๊กต๊อกและนายหน้ามาช่วยปักตะกร้าสมุนไพร โดยตั้งคอมมิชชันพันธมิตร 10-15% เพื่อลดการยิงโฆษณาแพงๆ หันมาพึ่งพาทราฟฟิกออแกนิกทดแทน',
    impact: 'ลดการพึ่งพาโฆษณาแบบเสียเงิน (Paid Ads) ได้ถึง 25% และได้คอนเทนต์ความรู้สมุนไพรที่จริงใจเพิ่มขึ้น',
  },
  {
    id: 'strat-3',
    title: 'จัดทำใบขอบคุณ "Thank You Card" แนบกล่องพัสดุ',
    description: 'พิมพ์รหัส QR Code ดึงคนเข้า LINE OA เพื่อรับคำปรึกษาและสิทธิพิเศษ ดึงลูกค้าจาก Shopee/TikTok มาสะสมคะแนนซื้อซ้ำโดยตรงผ่านระบบ LINE SHOPPING เพื่อเลี่ยงค่าคอมมิชชันครั้งหน้า',
    impact: 'สร้างการซื้อซ้ำ (Retention Rate) และย้ายฐานลูกค้ามาช่องทางที่ค่าธรรมเนียมต่ำเพียง 2.68%',
  },
  {
    id: 'strat-4',
    title: 'ปรับราคาขายแบบแบ่งเกรดตามแพลตฟอร์ม (Dynamic Dual Pricing)',
    description: 'ปรับตั้งราคาบนช่องทางที่มีการหักคอมมิชชันและค่าเข้าร่วมโปรแกรมพิเศษสูงกว่า (เช่น Shopee/Lazada) ให้สูงขึ้นประมาณ 5-10% และรักษาราคาหน้าเว็บหรือ LINE OA ให้ถูกกว่าเพื่อผลักดันคนไปซื้อตรง',
    impact: 'ปกป้องสัดส่วนกำไรสุทธิเฉลี่ยของบริษัทให้คงที่อย่างยั่งยืนในทุกช่องทางการจัดส่ง',
  }
];

export default function StoreIntegrator({
  herbProducts,
  transactions,
  onAddTransaction,
  onUpdateHerbProduct
}: StoreIntegratorProps) {
  // Store integration states
  const [connectedStores, setConnectedStores] = useState<ConnectedStore[]>(() => {
    const local = localStorage.getItem('company_connected_stores');
    return local ? JSON.parse(local) : [
      {
        id: 'STORE-001',
        platform: 'shopee',
        shopName: 'คุณชายสมุนไพร ช็อปหลัก (Shopee)',
        shopId: 'shopee_665421',
        connectedAt: '2026-07-01',
        status: 'active',
        environment: 'production',
        orderCount: 14
      }
    ];
  });

  const [onlineProducts, setOnlineProducts] = useState<OnlineProduct[]>(() => {
    const local = localStorage.getItem('company_online_products');
    return local ? JSON.parse(local) : [
      {
        id: 'OP-001',
        platform: 'shopee',
        onlineSku: 'SP-KMC-60',
        onlineName: 'ขมิ้นชันแคปซูล คุณชายสมุนไพร (60 เม็ด)',
        onlinePrice: 190,
        onlineStock: 420,
        linkedProductId: 'PROD001'
      },
      {
        id: 'OP-002',
        platform: 'shopee',
        onlineSku: 'SP-MKP-120',
        onlineName: 'มะขามป้อมแก้ไอ ยาน้ำสูตรคุณชาย (120ml)',
        onlinePrice: 85,
        onlineStock: 180,
        linkedProductId: 'PROD003'
      },
      {
        id: 'OP-003',
        platform: 'tiktok',
        onlineSku: 'TT-KMC-60',
        onlineName: 'แคปซูลขมิ้นชันตราคุณชาย (แพ็ค 1 กล่อง)',
        onlinePrice: 195,
        onlineStock: 350,
        linkedProductId: null
      },
      {
        id: 'OP-004',
        platform: 'tiktok',
        onlineSku: 'TT-FTL-50',
        onlineName: 'ฟ้าทะลายโจรแคปซูล สมุนไพรพร้อมส่ง (50 เม็ด)',
        onlinePrice: 160,
        onlineStock: 250,
        linkedProductId: 'PROD002'
      }
    ];
  });

  const [onlineOrders, setOnlineOrders] = useState<OnlineOrder[]>(() => {
    const local = localStorage.getItem('company_online_orders');
    return local ? JSON.parse(local) : [
      {
        id: 'SP-20260708-991A',
        platform: 'shopee',
        customerName: 'ธนารักษ์ รักษ์ดี',
        items: [
          { sku: 'SP-KMC-60', quantity: 2, onlineProductName: 'ขมิ้นชันแคปซูล คุณชายสมุนไพร (60 เม็ด)' }
        ],
        totalAmount: 380,
        status: 'completed',
        orderDate: '2026-07-08',
        ledgerSynced: true
      },
      {
        id: 'TT-20260709-112B',
        platform: 'tiktok',
        customerName: 'พิมพ์สิริ ปัญญาเลิศ',
        items: [
          { sku: 'TT-KMC-60', quantity: 1, onlineProductName: 'แคปซูลขมิ้นชันตราคุณชาย (แพ็ค 1 กล่อง)' },
          { sku: 'TT-FTL-50', quantity: 1, onlineProductName: 'ฟ้าทะลายโจรแคปซูล สมุนไพรพร้อมส่ง (50 เม็ด)' }
        ],
        totalAmount: 355,
        status: 'completed',
        orderDate: '2026-07-09',
        ledgerSynced: false
      },
      {
        id: 'SP-20260709-445C',
        platform: 'shopee',
        customerName: 'ศิริวัฒน์ มีอนันต์',
        items: [
          { sku: 'SP-MKP-120', quantity: 4, onlineProductName: 'มะขามป้อมแก้ไอ ยาน้ำสูตรคุณชาย (120ml)' }
        ],
        totalAmount: 340,
        status: 'pending_shipment',
        orderDate: '2026-07-09',
        ledgerSynced: false
      }
    ];
  });

  // Modal forms states
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [connectPlatform, setConnectPlatform] = useState<'shopee' | 'tiktok'>('shopee');
  const [connectFormData, setConnectFormData] = useState({
    shopName: '',
    shopId: '',
    partnerId: '',
    partnerKey: '',
    environment: 'production' as 'sandbox' | 'production'
  });

  const [activeSubTab, setActiveSubTab] = useState<'status' | 'products' | 'orders' | 'fees' | 'settings'>('status');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncLogs, setSyncLogs] = useState<string[]>([
    'ระบบเริ่มทำงาน: ตรวจสอบความถูกต้อง API Credentials เรียบร้อย',
    'เชื่อมต่อร้านค้าหลัก Shopee เรียบร้อย (Status: Active)'
  ]);

  // -----------------------------------------------------------------
  // PLATFORM FEE COMPARISON & MARKETING STRATEGY STATES & SYNCS
  // -----------------------------------------------------------------
  const [selectedCalcProductId, setSelectedCalcProductId] = useState<string>(
    herbProducts.length > 0 ? herbProducts[0].id : 'custom'
  );
  const [customCogs, setCustomCogs] = useState<number>(60);
  const [customPrice, setCustomPrice] = useState<number>(190);
  const [targetProfitMargin, setTargetProfitMargin] = useState<number>(35);

  const [feeSelections, setFeeSelections] = useState<Record<string, boolean[]>>({
    shopee: [true, true, true, false],
    tiktok: [true, true, true, false],
    lazada: [true, true, true, false],
    line_shopping: [true, true, false],
    social_commerce: [true, true, true],
  });

  const [customAdspendRates, setCustomAdspendRates] = useState<Record<string, number>>({
    shopee: 10,
    tiktok: 5,
    lazada: 8,
    line_shopping: 0,
    social_commerce: 30,
  });

  const [completedStrategies, setCompletedStrategies] = useState<string[]>(['strat-1']);

  // Ad Campaigns State for Shopee & TikTok
  const [adCampaigns, setAdCampaigns] = useState<AdCampaign[]>(() => {
    const local = localStorage.getItem('company_ad_campaigns');
    return local ? JSON.parse(local) : [
      {
        id: 'CAMP-001',
        platform: 'tiktok',
        name: 'วิดีโอปักตะกร้า ชาชงกระเจี๊ยบพรีเมียมคุณชาย',
        type: 'Video Shopping Ads',
        status: 'active',
        dailyBudget: 500,
        spent: 3500,
        impressions: 48000,
        clicks: 2400,
        orders: 120,
        revenue: 22800
      },
      {
        id: 'CAMP-002',
        platform: 'shopee',
        name: 'ค้นหาคำหลัก (Search Keywords) แชมพูสมุนไพรอัญชัน',
        type: 'Search Ads',
        status: 'active',
        dailyBudget: 300,
        spent: 1800,
        impressions: 15000,
        clicks: 750,
        orders: 38,
        revenue: 7220
      },
      {
        id: 'CAMP-003',
        platform: 'shopee',
        name: 'โฆษณาแนะนำสินค้าเกี่ยวเนื่อง ยาอมมะขามป้อมเซ็ตประหยัด',
        type: 'Discovery Ads',
        status: 'paused',
        dailyBudget: 200,
        spent: 1200,
        impressions: 12000,
        clicks: 400,
        orders: 5,
        revenue: 425
      },
      {
        id: 'CAMP-004',
        platform: 'tiktok',
        name: 'ไลฟ์สดคู่พันธมิตร ตะกร้าขมิ้นชัน 60แคปซูล',
        type: 'LIVE Ads',
        status: 'active',
        dailyBudget: 1000,
        spent: 7000,
        impressions: 92000,
        clicks: 4600,
        orders: 185,
        revenue: 35150
      }
    ];
  });

  // Save campaigns to localStorage when changed
  useEffect(() => {
    localStorage.setItem('company_ad_campaigns', JSON.stringify(adCampaigns));
  }, [adCampaigns]);

  // Add campaign form states
  const [showAddCampaignModal, setShowAddCampaignModal] = useState(false);
  const [newCampaignData, setNewCampaignData] = useState({
    platform: 'tiktok' as 'shopee' | 'tiktok',
    name: '',
    type: 'Video Shopping Ads',
    dailyBudget: 300,
    spent: 0,
    impressions: 0,
    clicks: 0,
    orders: 0,
    revenue: 0
  });

  // Sync pricing inputs when product selection changes
  useEffect(() => {
    if (selectedCalcProductId && selectedCalcProductId !== 'custom') {
      const prod = herbProducts.find(p => p.id === selectedCalcProductId);
      if (prod) {
        setCustomPrice(prod.sellPrice);
        // Estimate COGS at ~35% of selling price by default
        setCustomCogs(Math.round(prod.sellPrice * 0.35));
      }
    }
  }, [selectedCalcProductId, herbProducts]);

  // Aggregate Advertising Campaign Performance Metrics
  const adsSummary = useMemo(() => {
    let totalSpent = 0;
    let totalRevenue = 0;
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalOrders = 0;

    adCampaigns.forEach(camp => {
      totalSpent += camp.spent;
      totalRevenue += camp.revenue;
      totalImpressions += camp.impressions;
      totalClicks += camp.clicks;
      totalOrders += camp.orders;
    });

    const averageROAS = totalSpent > 0 ? totalRevenue / totalSpent : 0;
    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 105 / 100 : 0; // balanced adjustment for CTR
    const cvr = totalClicks > 0 ? (totalOrders / totalClicks) * 100 : 0;
    const averageCPC = totalClicks > 0 ? totalSpent / totalClicks : 0;

    return {
      totalSpent,
      totalRevenue,
      totalImpressions,
      totalClicks,
      totalOrders,
      averageROAS,
      ctr,
      cvr,
      averageCPC
    };
  }, [adCampaigns]);

  // Dynamic Break-Even ROAS Benchmark Calculation
  const breakEvenROASInfo = useMemo(() => {
    const price = customPrice;
    const cogs = customCogs;
    
    // Estimate platform commission/payment fee at an average 8%
    const averageFeeRate = 8.0;
    const platformFeeAmount = (price * averageFeeRate) / 100;
    
    const marginBeforeAds = price - cogs - platformFeeAmount;
    const breakEvenROAS = marginBeforeAds > 0 ? price / marginBeforeAds : 1.5;
    
    return {
      marginBeforeAds,
      breakEvenROAS
    };
  }, [customPrice, customCogs]);

  // Highest Margin Platform Calculation (Top-level)
  const highestMarginPlatformInfo = useMemo(() => {
    let bestPlatform = 'LINE SHOPPING';
    let bestMargin = -999;
    PLATFORM_FEE_TEMPLATES.forEach(tmpl => {
      const activeFees = tmpl.fees.filter((_, idx) => (feeSelections[tmpl.key] || [])[idx] !== false);
      const feeRate = activeFees.reduce((acc, f) => acc + f.rate, 0);
      const adRate = customAdspendRates[tmpl.key] ?? 0;
      const totalRate = feeRate + adRate;
      const netPay = customPrice * (1 - totalRate / 100);
      const netProf = netPay - customCogs;
      const margin = customPrice > 0 ? (netProf / customPrice) * 100 : 0;
      if (margin > bestMargin) {
        bestMargin = margin;
        bestPlatform = tmpl.name;
      }
    });
    return `${bestPlatform} (${bestMargin.toFixed(1)}%)`;
  }, [customPrice, customCogs, feeSelections, customAdspendRates]);

  // Average Platform Fee Load Calculation (Top-level)
  const averagePlatformFeeLoad = useMemo(() => {
    let totalRateSum = 0;
    let count = 0;
    PLATFORM_FEE_TEMPLATES.forEach(tmpl => {
      const activeFees = tmpl.fees.filter((_, idx) => (feeSelections[tmpl.key] || [])[idx] !== false);
      totalRateSum += activeFees.reduce((acc, f) => acc + f.rate, 0);
      count++;
    });
    return count > 0 ? `${(totalRateSum / count).toFixed(2)}% ของราคาสินค้า` : '0%';
  }, [feeSelections]);

  // E-commerce automated settings
  const [autoCalculateVat, setAutoCalculateVat] = useState<boolean>(() => {
    const saved = localStorage.getItem('company_store_auto_vat');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [autoRegisterFees, setAutoRegisterFees] = useState<boolean>(() => {
    const saved = localStorage.getItem('company_store_auto_fees');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [feeRateShopee, setFeeRateShopee] = useState<number>(8); // 8% Default
  const [feeRateTiktok, setFeeRateTiktok] = useState<number>(7); // 7% Default

  // Order filters
  const [orderSearch, setOrderSearch] = useState<string>('');
  const [orderPlatformFilter, setOrderPlatformFilter] = useState<string>('all');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [orderSyncFilter, setOrderSyncFilter] = useState<string>('all');

  // Detailed thermal bill / invoice printing state
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState<OnlineOrder | null>(null);
  const [isPrintingInvoice, setIsPrintingInvoice] = useState<boolean>(false);
  const [disconnectingStore, setDisconnectingStore] = useState<ConnectedStore | null>(null);

  // Persist states
  useEffect(() => {
    localStorage.setItem('company_connected_stores', JSON.stringify(connectedStores));
  }, [connectedStores]);

  useEffect(() => {
    localStorage.setItem('company_online_products', JSON.stringify(onlineProducts));
  }, [onlineProducts]);

  useEffect(() => {
    localStorage.setItem('company_online_orders', JSON.stringify(onlineOrders));
  }, [onlineOrders]);

  useEffect(() => {
    localStorage.setItem('company_store_auto_vat', JSON.stringify(autoCalculateVat));
  }, [autoCalculateVat]);

  useEffect(() => {
    localStorage.setItem('company_store_auto_fees', JSON.stringify(autoRegisterFees));
  }, [autoRegisterFees]);

  // Helper log generator
  const logEvent = (msg: string) => {
    const time = new Date().toLocaleTimeString('th-TH');
    setSyncLogs(prev => [`[${time}] ${msg}`, ...prev]);
  };

  // Handler for mapping a local HerbProduct to an OnlineProduct
  const handleLinkProduct = (onlineProductId: string, localProductId: string | null) => {
    setOnlineProducts(prev => prev.map(p => {
      if (p.id === onlineProductId) {
        logEvent(`ผูกรหัสสินค้าออนไลน์ Sku: ${p.onlineSku} เข้ากับสินค้าคลังหลักรหัส: ${localProductId || 'ไม่มี'}`);
        return { ...p, linkedProductId: localProductId };
      }
      return p;
    }));
  };

  // Fuzzy Match/Auto-Link SKU matching logic
  const handleAutoLinkSKUs = () => {
    let linkCount = 0;
    const newOnlineProducts = onlineProducts.map(op => {
      if (op.linkedProductId) return op;

      let matchedId: string | null = null;
      const lowerSku = op.onlineSku.toLowerCase();
      const lowerName = op.onlineName.toLowerCase();

      if (lowerSku.includes('kmc') || lowerName.includes('ขมิ้นชัน')) {
        matchedId = 'PROD001';
      } else if (lowerSku.includes('ftl') || lowerName.includes('ฟ้าทะลายโจร')) {
        matchedId = 'PROD002';
      } else if (lowerSku.includes('mkp') || lowerName.includes('มะขามป้อม')) {
        matchedId = 'PROD003';
      }

      if (matchedId) {
        linkCount++;
        const targetProd = herbProducts.find(p => p.id === matchedId);
        logEvent(`[ระบบอัตโนมัติ] ตรวจพบการจับคู่อัจฉริยะสำหรับ SKU: ${op.onlineSku} ➔ คลังหลัก: ${targetProd?.name || matchedId}`);
        return { ...op, linkedProductId: matchedId };
      }
      return op;
    });

    if (linkCount > 0) {
      setOnlineProducts(newOnlineProducts);
      alert(`ระบบจับคู่สินค้าอัจฉริยะแบบกลุ่มเสร็จสมบูรณ์!\nทำรายการผูกจับคู่สินค้าใหม่จำนวน ${linkCount} รายการ ไปยังพิกัดคลังสมุนไพรคุณชายสำเร็จ`);
    } else {
      alert('ระบบตรวจสอบไม่พบ SKU อื่นๆ ที่มีรหัสหรือคำหลักตรงกัน หรือสินค้าออนไลน์ทั้งหมดได้รับการเชื่อมโยงเรียบร้อยแล้ว');
    }
  };

  // Simulate API Store Sync
  const handleSimulateSync = () => {
    setIsSyncing(true);
    logEvent('เริ่มทำการดึงข้อมูลล่าสุดจาก API Shopee และ TikTok Shop...');
    
    setTimeout(() => {
      setIsSyncing(false);
      logEvent('ดึงข้อมูลคำสั่งซื้อและสถานะคลังสินค้าออนไลน์เสร็จสิ้น มีคำสั่งซื้อใหม่ 1 รายการ');
      
      const newOrderId = `TT-20260709-${Math.floor(1000 + Math.random() * 9000)}`;
      const hasThis = onlineOrders.some(o => o.customerName === 'วิภา อภิบาล');
      if (!hasThis) {
        const newOrder: OnlineOrder = {
          id: newOrderId,
          platform: 'tiktok',
          customerName: 'วิภา อภิบาล',
          items: [
            { sku: 'TT-KMC-60', quantity: 2, onlineProductName: 'แคปซูลขมิ้นชันตราคุณชาย (แพ็ค 1 กล่อง)' }
          ],
          totalAmount: 390,
          status: 'completed',
          orderDate: new Date().toISOString().split('T')[0],
          ledgerSynced: false,
          trackingNumber: `TH26${Math.floor(10000000 + Math.random() * 90000000)}B`,
          shippingAddress: 'คุณวิภา อภิบาล 99/9 หมู่ 2 ถนนนครอินทร์ ต.บางคูเวียง อ.บางกรวย จ.นนทบุรี 11130 โทร. 089-111-2222',
          carrierName: 'J&T Express'
        };
        setOnlineOrders(prev => [newOrder, ...prev]);
        logEvent(`พบคำสั่งซื้อใหม่สำเร็จจาก TikTok Shop: ออเดอร์ ${newOrderId} มูลค่า ฿390 (รอประมวลผลบัญชี)`);
      }
    }, 1200);
  };

  // Generate a random real-looking order
  const handleGenerateRandomOrder = () => {
    const thaiFirstNames = ['สมเกียรติ', 'พรพิไล', 'อรสา', 'กฤษณะ', 'สุวรรณ', 'ชลิดา', 'ปิยะ', 'ณิชา', 'ชัชวาล', 'สิริมา'];
    const thaiLastNames = ['แก้วมณี', 'จิตรดี', 'ดวงทอง', 'รักสงบ', 'ทวีผล', 'แสงสว่าง', 'พึ่งบุญ', 'ทรัพย์ล้น', 'สุขเจริญ', 'เจริญดี'];
    const provinces = ['กรุงเทพฯ', 'นนทบุรี', 'สมุทรปราการ', 'ปทุมธานี', 'ชลบุรี', 'เชียงใหม่', 'ขอนแก่น', 'นครราชสีมา', 'ภูเก็ต', 'สุราษฎร์ธานี'];
    const carriers = ['Flash Express', 'J&T Express', 'Shopee Xpress', 'Kerry Express', 'Best Express'];

    const platform: 'shopee' | 'tiktok' = Math.random() > 0.5 ? 'shopee' : 'tiktok';
    const randomFirst = thaiFirstNames[Math.floor(Math.random() * thaiFirstNames.length)];
    const randomLast = thaiLastNames[Math.floor(Math.random() * thaiLastNames.length)];
    const customerName = `${randomFirst} ${randomLast}`;
    
    const platformProducts = onlineProducts.filter(p => p.platform === platform);
    if (platformProducts.length === 0) {
      alert('ไม่พบรายการสินค้าออนไลน์ที่ตั้งค่าไว้สำหรับแพลตฟอร์มนี้');
      return;
    }

    const itemsCount = Math.random() > 0.75 ? 2 : 1;
    const selectedItems: any[] = [];
    let totalAmount = 0;

    for (let i = 0; i < itemsCount; i++) {
      const randomProd = platformProducts[Math.floor(Math.random() * platformProducts.length)];
      if (selectedItems.some(item => item.sku === randomProd.onlineSku)) continue;

      const quantity = Math.floor(Math.random() * 2) + 1; // 1 or 2
      const amount = randomProd.onlinePrice * quantity;
      
      selectedItems.push({
        sku: randomProd.onlineSku,
        quantity,
        onlineProductName: randomProd.onlineName
      });
      totalAmount += amount;
    }

    if (selectedItems.length === 0) return;

    const trackingNo = platform === 'shopee' 
      ? `SHP26${Math.floor(100000000 + Math.random() * 900000000)}` 
      : `TH26${Math.floor(100000000 + Math.random() * 900000000)}X`;
      
    const newOrderId = platform === 'shopee'
      ? `SP-20260709-${Math.floor(1000 + Math.random() * 9000)}C`
      : `TT-20260709-${Math.floor(1000 + Math.random() * 9000)}T`;

    const randomAddress = `${Math.floor(12 + Math.random() * 180)}/${Math.floor(1 + Math.random() * 15)} ถ.มิตรภาพ ต.ในเมือง อ.เมือง จ.${provinces[Math.floor(Math.random() * provinces.length)]} ${Math.floor(10000 + Math.random() * 80000)}`;

    const newOrder: OnlineOrder = {
      id: newOrderId,
      platform,
      customerName,
      items: selectedItems,
      totalAmount,
      status: 'completed',
      orderDate: new Date().toISOString().split('T')[0],
      ledgerSynced: false,
      trackingNumber: trackingNo,
      shippingAddress: randomAddress,
      carrierName: carriers[Math.floor(Math.random() * carriers.length)]
    };

    setOnlineOrders(prev => [newOrder, ...prev]);
    logEvent(`[สุ่มจำลองออเดอร์] ตรวจพบข้อมูลลูกค้าส่งผ่านระบบ webhook! [${platform.toUpperCase()}] เลขที่: ${newOrderId} ยอดชำระ: ฿${totalAmount.toLocaleString()} โดยคุณ ${customerName}`);
    
    // Auto switch to orders subtab to see results
    setActiveSubTab('orders');
  };

  // Sync Local Stock values to E-commerce store (Overwrites Shopee & TikTok stocks with actual local stocks)
  const handlePushStockToOnline = () => {
    setIsSyncing(true);
    logEvent('กำลังส่งออกและอัปเดตปริมาณสินค้าคงคลังจริง (Stock) ไปยังร้านค้า Shopee และ TikTok Shop...');
    
    setTimeout(() => {
      setOnlineProducts(prev => prev.map(p => {
        if (p.linkedProductId) {
          const localProd = herbProducts.find(lp => lp.id === p.linkedProductId);
          if (localProd) {
            return { ...p, onlineStock: localProd.stock };
          }
        }
        return p;
      }));
      setIsSyncing(false);
      logEvent('อัปเดตสต็อกไปยัง Shopee และ TikTok Shop สำเร็จ! (ปริมาณสต็อกบนแพลตฟอร์มตรงตามคลังสินค้าจริง)');
      alert('ซิงค์สต็อกสินค้าจริงไปยังร้านค้า Shopee & TikTok สำเร็จเรียบร้อยแล้ว!');
    }, 1200);
  };

  // Process Completed orders and sync to local Accounting Ledger & deduct actual physical stocks
  const handleProcessOrdersToLedger = () => {
    const unpostedOrders = onlineOrders.filter(o => o.status === 'completed' && !o.ledgerSynced);
    
    if (unpostedOrders.length === 0) {
      alert('ไม่มีคำสั่งซื้อใหม่ที่สำเร็จเพื่อทำการลงบันทึกบัญชีในขณะนี้');
      return;
    }

    let successCount = 0;
    let outOfStockAlerts: string[] = [];

    // Temporary lists to modify in local batch
    let updatedOnlineOrders = [...onlineOrders];

    unpostedOrders.forEach(order => {
      // 1. Deduct Stock of matching HerbProducts
      let canDeductAll = true;
      
      order.items.forEach(item => {
        const onlineProd = onlineProducts.find(op => op.onlineSku === item.sku && op.platform === order.platform);
        if (onlineProd && onlineProd.linkedProductId) {
          const localProd = herbProducts.find(lp => lp.id === onlineProd.linkedProductId);
          if (localProd) {
            if (localProd.stock < item.quantity) {
              outOfStockAlerts.push(`สินค้า ${localProd.name} ในคลังหลักไม่เพียงพอ (ต้องการ ${item.quantity} ชิ้น แต่มีอยู่เพียง ${localProd.stock} ชิ้น)`);
              canDeductAll = false;
            }
          } else {
            logEvent(`คำเตือน: ไม่พบสินค้าคลังหลักที่เชื่อมโยงกับ Sku: ${item.sku}`);
          }
        } else {
          logEvent(`คำเตือน: SKU ออนไลน์ ${item.sku} ยังไม่ได้ถูกจับคู่กับรหัสสินค้าในคลังหลัก`);
        }
      });

      // If stock check succeeds, execute deductions & log transactions
      if (canDeductAll) {
        order.items.forEach(item => {
          const onlineProd = onlineProducts.find(op => op.onlineSku === item.sku && op.platform === order.platform);
          if (onlineProd && onlineProd.linkedProductId) {
            const localProd = herbProducts.find(lp => lp.id === onlineProd.linkedProductId);
            if (localProd) {
              const newStock = Math.max(0, localProd.stock - item.quantity);
              onUpdateHerbProduct(localProd.id, { stock: newStock });
              logEvent(`[ตัดคลังสินค้าหลัก] ออเดอร์ ${order.id}: ตัดสินค้า ${localProd.name} ออกจำนวน -${item.quantity} ชิ้น (เหลือคงเหลือคลัง ${newStock})`);
            }
          }
        });

        // 2. Add Income Transaction to Ledger Account
        const platformLabel = order.platform === 'shopee' ? 'Shopee' : 'TikTok Shop';
        const vatAmountCalculated = autoCalculateVat ? parseFloat(((order.totalAmount * 7) / 107).toFixed(2)) : 0;
        
        onAddTransaction({
          date: order.orderDate,
          type: TransactionType.INCOME,
          category: TransactionCategory.SALES,
          amount: order.totalAmount,
          description: `รายรับการขายร้านค้าออนไลน์ ${platformLabel} - ออเดอร์เลขที่ ${order.id} (ลูกค้า: คุณ${order.customerName})`,
          referenceNo: order.id,
          hasVat: autoCalculateVat,
          vatAmount: vatAmountCalculated
        });

        logEvent(`[บันทึกบัญชีรายรับ] บันทึกเงินรายได้จากการขาย ฿${order.totalAmount.toLocaleString()} จากคำสั่งซื้อเลขที่ ${order.id}${autoCalculateVat ? ` (บันทึกเข้าระบบภาษีขาย VAT 7% = ฿${vatAmountCalculated.toLocaleString()})` : ''}`);

        // 3. Register Platform Commission Fees as an EXPENSE (If enabled)
        if (autoRegisterFees) {
          const feeRate = order.platform === 'shopee' ? feeRateShopee : feeRateTiktok;
          const feeAmount = parseFloat(((order.totalAmount * feeRate) / 100).toFixed(2));
          
          onAddTransaction({
            date: order.orderDate,
            type: TransactionType.EXPENSE,
            category: TransactionCategory.TAX_EXP, // Or other appropriate categories like marketing / travel / fees
            amount: feeAmount,
            description: `ค่าธรรมเนียมแพลตฟอร์ม ${platformLabel} (${feeRate}%) - ออเดอร์อ้างอิงเลขที่ ${order.id}`,
            referenceNo: `${order.id}-FEE`
          });

          logEvent(`[บันทึกค่าใช้จ่ายธรรมเนียม] บันทึกค่าธรรมเนียมและบริการแพลตฟอร์ม ${platformLabel} เป็นรายจ่าย ฿${feeAmount.toLocaleString()} สำหรับคำสั่งซื้อเลขที่ ${order.id}`);
        }

        // Mark as synced
        updatedOnlineOrders = updatedOnlineOrders.map(o => o.id === order.id ? { ...o, ledgerSynced: true } : o);
        successCount++;
      }
    });

    setOnlineOrders(updatedOnlineOrders);

    if (outOfStockAlerts.length > 0) {
      alert(`นำเข้าคำสั่งซื้อสำเร็จ ${successCount} รายการ\n\nพบอุปสรรคคลังสินค้าในรายการต่อไปนี้ (สต็อกขาดจึงยกยอดซิงค์):\n${outOfStockAlerts.join('\n')}`);
    } else {
      alert(`นำเข้าคำสั่งซื้อสำเร็จสมบูรณ์!\nระบบตัดสต็อกในคลังสินค้า บันทึกบัญชีรายรับ และคิดมูลค่าธรรมเนียมส่วนลดแพลตฟอร์มรวม ${successCount} รายการเรียบร้อยแล้ว`);
    }
  };

  // Connect Store Handler
  const handleConnectStoreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!connectFormData.shopName || !connectFormData.shopId) {
      alert('กรุณากรอกชื่อและรหัสร้านค้า');
      return;
    }

    const newStore: ConnectedStore = {
      id: `STORE-${String(connectedStores.length + 1).padStart(3, '0')}`,
      platform: connectPlatform,
      shopName: connectFormData.shopName,
      shopId: connectFormData.shopId,
      connectedAt: new Date().toISOString().split('T')[0],
      status: 'active',
      environment: connectFormData.environment,
      orderCount: 0
    };

    setConnectedStores(prev => [...prev, newStore]);
    logEvent(`เชื่อมต่อร้านค้าใหม่สำเร็จ: [${connectPlatform.toUpperCase()}] ${connectFormData.shopName} (${connectFormData.shopId})`);
    
    // Auto populate online products with some defaults if connecting a second store
    if (connectPlatform === 'tiktok' && !onlineProducts.some(p => p.platform === 'tiktok')) {
      // Already has some mock tiktok but we can log
    }

    setShowConnectModal(false);
    // Reset form
    setConnectFormData({
      shopName: '',
      shopId: '',
      partnerId: '',
      partnerKey: '',
      environment: 'production'
    });
  };

  // Disconnect Store Handler
  const handleDisconnectStore = (id: string, name: string) => {
    const store = connectedStores.find(s => s.id === id);
    if (store) {
      setDisconnectingStore(store);
    }
  };

  // Calculated stats
  const shopeeStats = useMemo(() => {
    const stores = connectedStores.filter(s => s.platform === 'shopee');
    const prods = onlineProducts.filter(p => p.platform === 'shopee');
    const linkedCount = prods.filter(p => p.linkedProductId !== null).length;
    return {
      connected: stores.length > 0,
      shopNames: stores.map(s => s.shopName).join(', '),
      totalProducts: prods.length,
      linkedProducts: linkedCount,
      unlinkedProducts: prods.length - linkedCount
    };
  }, [connectedStores, onlineProducts]);

  const tiktokStats = useMemo(() => {
    const stores = connectedStores.filter(s => s.platform === 'tiktok');
    const prods = onlineProducts.filter(p => p.platform === 'tiktok');
    const linkedCount = prods.filter(p => p.linkedProductId !== null).length;
    return {
      connected: stores.length > 0,
      shopNames: stores.map(s => s.shopName).join(', '),
      totalProducts: prods.length,
      linkedProducts: linkedCount,
      unlinkedProducts: prods.length - linkedCount
    };
  }, [connectedStores, onlineProducts]);

  const filteredOrders = useMemo(() => {
    return onlineOrders.filter(order => {
      const searchLower = orderSearch.toLowerCase();
      const matchesSearch = 
        order.id.toLowerCase().includes(searchLower) ||
        order.customerName.toLowerCase().includes(searchLower) ||
        order.items.some(item => item.onlineProductName.toLowerCase().includes(searchLower) || item.sku.toLowerCase().includes(searchLower));

      const matchesPlatform = orderPlatformFilter === 'all' || order.platform === orderPlatformFilter;

      const matchesStatus = orderStatusFilter === 'all' || order.status === orderStatusFilter;

      const matchesSync = orderSyncFilter === 'all' || 
        (orderSyncFilter === 'synced' && order.ledgerSynced) ||
        (orderSyncFilter === 'pending' && !order.ledgerSynced && order.status === 'completed');

      return matchesSearch && matchesPlatform && matchesStatus && matchesSync;
    });
  }, [onlineOrders, orderSearch, orderPlatformFilter, orderStatusFilter, orderSyncFilter]);

  return (
    <div className="space-y-6" id="ecommerce-integrator-section">
      
      {/* Header Overview Card */}
      <div className="bg-gradient-to-r from-emerald-800 to-emerald-950 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute right-0 bottom-0 opacity-10 translate-x-10 translate-y-10">
          <ShoppingBag className="w-64 h-64" />
        </div>
        
        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2 bg-emerald-700/50 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-extrabold tracking-wider w-max border border-emerald-500/20">
            <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /> API E-COMMERCE SYNCHRONIZER
          </div>
          <h3 className="text-xl font-extrabold font-sans leading-none">เชื่อมโยงระบบร้านค้าออนไลน์ Shopee & TikTok Shop</h3>
          <p className="text-emerald-100 text-xs font-sans max-w-xl">
            บริหารคลังสินค้าสมุนไพรอัจฉริยะ ซิงค์สต็อกแบบเรียลไทม์ และนำเข้าใบเสร็จจากยอดขายร้านค้าออนไลน์เข้าสู่ระบบบัญชีแยกประเภทของคุณชายสมุนไพรแบบอัตโนมัติ
          </p>
        </div>

        <div className="flex flex-wrap gap-2 relative z-10 w-full md:w-auto">
          <button
            onClick={handleSimulateSync}
            disabled={isSyncing}
            className="flex-1 md:flex-initial px-4 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-400 text-slate-950 rounded-xl text-xs font-bold font-sans flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'กำลังซิงค์ข้อมูล...' : 'ดึงคำสั่งซื้อล่าสุด'}
          </button>
          <button
            onClick={handlePushStockToOnline}
            disabled={isSyncing}
            className="flex-1 md:flex-initial px-4 py-2.5 bg-white hover:bg-emerald-50 text-emerald-900 rounded-xl text-xs font-bold font-sans flex items-center justify-center gap-2 shadow-md transition-colors cursor-pointer border border-emerald-100"
          >
            <Database className="w-4 h-4 text-emerald-700" />
            ซิงค์สต็อกคลังจริงขึ้นร้านค้า
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap border-b border-slate-200">
        <button
          onClick={() => setActiveSubTab('status')}
          className={`px-5 py-3 text-xs font-bold font-sans transition-all relative border-b-2 cursor-pointer ${
            activeSubTab === 'status'
              ? 'border-emerald-700 text-emerald-800 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          สถานะการเชื่อมต่อร้านค้า ({connectedStores.length})
        </button>
        <button
          onClick={() => setActiveSubTab('products')}
          className={`px-5 py-3 text-xs font-bold font-sans transition-all relative border-b-2 cursor-pointer ${
            activeSubTab === 'products'
              ? 'border-emerald-700 text-emerald-800 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          จับคู่สินค้าและคลัง ({onlineProducts.length})
        </button>
        <button
          onClick={() => setActiveSubTab('orders')}
          className={`px-5 py-3 text-xs font-bold font-sans transition-all relative border-b-2 cursor-pointer ${
            activeSubTab === 'orders'
              ? 'border-emerald-700 text-emerald-800 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          รายการคำสั่งซื้อออนไลน์ ({onlineOrders.length})
        </button>
        <button
          onClick={() => setActiveSubTab('fees')}
          className={`px-5 py-3 text-xs font-bold font-sans transition-all relative border-b-2 cursor-pointer ${
            activeSubTab === 'fees'
              ? 'border-emerald-700 text-emerald-800 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Percent className="w-3.5 h-3.5 text-emerald-600 animate-pulse" /> วิเคราะห์ค่าธรรมเนียม & แผนการตลาด
          </span>
        </button>
        <button
          onClick={() => setActiveSubTab('settings')}
          className={`px-5 py-3 text-xs font-bold font-sans transition-all relative border-b-2 cursor-pointer ${
            activeSubTab === 'settings'
              ? 'border-emerald-700 text-emerald-800 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          ตั้งค่า & API Logs
        </button>
      </div>

      {/* Main Contents based on Sub-Tabs */}
      <div className="space-y-6">
        
        {/* SUBTAB 1: Connection Status Cards */}
        {activeSubTab === 'status' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Quick Stats Widget */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* SHOPEE STATUS CARD */}
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs relative overflow-hidden flex flex-col justify-between min-h-[180px]">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-orange-600 font-sans">SHOPEE PARTNER PLATFORM</span>
                    <h4 className="text-md font-sans font-extrabold text-slate-800 flex items-center gap-2">
                      <ShoppingBag className="w-5 h-5 text-orange-500" />
                      {shopeeStats.connected ? 'Shopee Seller Center' : 'Shopee Disconnected'}
                    </h4>
                    {shopeeStats.connected && (
                      <p className="text-[11px] text-slate-500 font-sans">ร้านค้า: <span className="font-bold text-slate-700">{shopeeStats.shopNames}</span></p>
                    )}
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[9px] font-extrabold font-mono uppercase border ${
                    shopeeStats.connected 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                      : 'bg-slate-100 text-slate-400 border-slate-200'
                  }`}>
                    {shopeeStats.connected ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 mt-3 text-xs font-sans">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold">สินค้าออนไลน์</span>
                    <span className="text-sm font-bold font-mono text-slate-700">{shopeeStats.connected ? shopeeStats.totalProducts : '0'} รายการ</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold">จับคู่แล้ว</span>
                    <span className="text-sm font-bold font-mono text-emerald-600">{shopeeStats.connected ? shopeeStats.linkedProducts : '0'} SKU</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold">ยังไม่ผูกมัด</span>
                    <span className="text-sm font-bold font-mono text-amber-500">{shopeeStats.connected ? shopeeStats.unlinkedProducts : '0'} รายการ</span>
                  </div>
                </div>

                <div className="pt-4 flex gap-2">
                  {shopeeStats.connected ? (
                    <>
                      <button
                        onClick={() => {
                          const store = connectedStores.find(s => s.platform === 'shopee');
                          if (store) handleDisconnectStore(store.id, store.shopName);
                        }}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 rounded-lg text-[11px] font-bold font-sans transition-all cursor-pointer"
                      >
                        ตัดการเชื่อมต่อ
                      </button>
                      <button
                        onClick={() => setActiveSubTab('products')}
                        className="ml-auto px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg text-[11px] font-bold font-sans flex items-center gap-1 transition-all cursor-pointer"
                      >
                        จัดการการจับคู่สินค้า <ChevronRight className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        setConnectPlatform('shopee');
                        setConnectFormData({
                          shopName: 'คุณชายสมุนไพร Shopee Official',
                          shopId: 'shopee_665421',
                          partnerId: '8821094',
                          partnerKey: 'sh_key_77a7b8e8f81212',
                          environment: 'production'
                        });
                        setShowConnectModal(true);
                      }}
                      className="w-full py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold font-sans flex items-center justify-center gap-1.5 shadow-md shadow-orange-600/10 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> เชื่อมต่อบัญชี Shopee Seller
                    </button>
                  )}
                </div>
              </div>

              {/* TIKTOK SHOP STATUS CARD */}
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs relative overflow-hidden flex flex-col justify-between min-h-[180px]">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-800 font-sans">TIKTOK SELLER PLATFORM</span>
                    <h4 className="text-md font-sans font-extrabold text-slate-800 flex items-center gap-2">
                      <ShoppingBag className="w-5 h-5 text-pink-600" />
                      {tiktokStats.connected ? 'TikTok Shop Seller' : 'TikTok Shop Disconnected'}
                    </h4>
                    {tiktokStats.connected && (
                      <p className="text-[11px] text-slate-500 font-sans">ร้านค้า: <span className="font-bold text-slate-700">{tiktokStats.shopNames}</span></p>
                    )}
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[9px] font-extrabold font-mono uppercase border ${
                    tiktokStats.connected 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                      : 'bg-slate-100 text-slate-400 border-slate-200'
                  }`}>
                    {tiktokStats.connected ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 mt-3 text-xs font-sans">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold">สินค้าออนไลน์</span>
                    <span className="text-sm font-bold font-mono text-slate-700">{tiktokStats.connected ? tiktokStats.totalProducts : '0'} รายการ</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold">จับคู่แล้ว</span>
                    <span className="text-sm font-bold font-mono text-emerald-600">{tiktokStats.connected ? tiktokStats.linkedProducts : '0'} SKU</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold">ยังไม่ผูกมัด</span>
                    <span className="text-sm font-bold font-mono text-amber-500">{tiktokStats.connected ? tiktokStats.unlinkedProducts : '0'} รายการ</span>
                  </div>
                </div>

                <div className="pt-4 flex gap-2">
                  {tiktokStats.connected ? (
                    <>
                      <button
                        onClick={() => {
                          const store = connectedStores.find(s => s.platform === 'tiktok');
                          if (store) handleDisconnectStore(store.id, store.shopName);
                        }}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 rounded-lg text-[11px] font-bold font-sans transition-all cursor-pointer"
                      >
                        ตัดการเชื่อมต่อ
                      </button>
                      <button
                        onClick={() => setActiveSubTab('products')}
                        className="ml-auto px-3 py-1.5 bg-pink-50 hover:bg-pink-100 text-pink-700 rounded-lg text-[11px] font-bold font-sans flex items-center gap-1 transition-all cursor-pointer"
                      >
                        จัดการการจับคู่สินค้า <ChevronRight className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        setConnectPlatform('tiktok');
                        setConnectFormData({
                          shopName: 'คุณชายสมุนไพร ติ๊กต๊อกช็อป',
                          shopId: 'tiktok_998124',
                          partnerId: '542123',
                          partnerKey: 'tt_api_v2_f812b1d0d9e8',
                          environment: 'production'
                        });
                        setShowConnectModal(true);
                      }}
                      className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold font-sans flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> เชื่อมต่อบัญชี TikTok Shop
                    </button>
                  )}
                </div>
              </div>

            </div>

            {/* How It Works Guidelines */}
            <div className="bg-slate-50 rounded-2xl border border-slate-150 p-5 space-y-4">
              <h5 className="text-xs font-bold font-sans text-slate-800 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-emerald-600 animate-pulse" /> ขั้นตอนการผูกมัดและจัดการร้านค้าออนไลน์
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-sans text-slate-600">
                <div className="bg-white p-4 rounded-xl border border-slate-100 space-y-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-extrabold text-xs">1</div>
                  <h6 className="font-bold text-slate-700">เชื่อมต่อร้านค้าด้วย API Key</h6>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    ใช้รหัส Partner ID, Shop ID และ Partner API Key จาก Seller Center เพื่ออนุมัติสิทธิ์ความปลอดภัยในระดับแอปพลิเคชัน
                  </p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-100 space-y-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-extrabold text-xs">2</div>
                  <h6 className="font-bold text-slate-700">ผูกเชื่อมโยงคลังสินค้า (SKU)</h6>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    จับคู่ผลิตภัณฑ์แต่ละรายการบน Shopee และ TikTok ให้ตรงกับยาหรือผลิตภัณฑ์ในคลังหลักของ "คุณชายสมุนไพร"
                  </p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-100 space-y-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-extrabold text-xs">3</div>
                  <h6 className="font-bold text-slate-700">หักสต็อก & ลงบัญชีอัตโนมัติ</h6>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    เมื่อออเดอร์บนร้านค้าถูกจัดส่งเสร็จสิ้น ระบบจะดึงข้อมูลมาหักสต็อกวัตถุดิบสำเร็จรูปและสร้างบันทึกรายได้เข้าสมุดบัญชีทันที!
                  </p>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* SUBTAB 2: Product Mapping Table */}
        {activeSubTab === 'products' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-150">
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-slate-800 font-sans">ตารางการผูกคู่ค้าและคู่ขนานรหัสสินค้า (Product SKU Mapping)</h4>
                <p className="text-[10px] text-slate-500 font-sans">
                  จับคู่สินค้าที่ลูกค้าเห็นบนแอปพลิเคชันปลายทาง เข้ากับตำรับสินค้าคงคลังจริงเพื่อความถูกต้องในการหักลบจำนวนสต็อก
                </p>
              </div>
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <button
                  onClick={handleAutoLinkSKUs}
                  className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold font-sans cursor-pointer flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <Zap className="w-3.5 h-3.5 text-slate-950 fill-slate-950" /> จับคู่ SKU อัตโนมัติ
                </button>
                <button
                  onClick={handlePushStockToOnline}
                  className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold font-sans cursor-pointer flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <Check className="w-3.5 h-3.5" /> อัปเดตสต็อกคลังขึ้นร้านค้าทั้งหมด
                </button>
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-extrabold pb-3">
                    <th className="py-2">แพลตฟอร์ม</th>
                    <th className="py-2">รูปภาพ / ชื่อสินค้าบนร้านค้าออนไลน์</th>
                    <th className="py-2">รหัส SKU ออนไลน์</th>
                    <th className="py-2 text-right">ราคาออนไลน์</th>
                    <th className="py-2 text-right">สต็อกออนไลน์</th>
                    <th className="py-2 text-center">สถานะการผูกคู่ค้า</th>
                    <th className="py-2 text-right">เชื่อมโยงกับสินค้าคลังหลักของคุณชาย</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {onlineProducts.map(prod => {
                    const linkedProd = herbProducts.find(p => p.id === prod.linkedProductId);
                    
                    return (
                      <tr key={prod.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                            prod.platform === 'shopee'
                              ? 'bg-orange-50 text-orange-700 border border-orange-100'
                              : 'bg-slate-900 text-white'
                          }`}>
                            {prod.platform === 'shopee' ? 'Shopee' : 'TikTok'}
                          </span>
                        </td>
                        <td className="py-3.5 font-bold text-slate-800 max-w-[240px] truncate" title={prod.onlineName}>
                          {prod.onlineName}
                        </td>
                        <td className="py-3.5 font-mono text-slate-500 font-bold">
                          {prod.onlineSku}
                        </td>
                        <td className="py-3.5 text-right font-mono font-bold text-slate-700">
                          ฿{prod.onlinePrice.toLocaleString()}
                        </td>
                        <td className="py-3.5 text-right font-mono font-bold text-slate-600">
                          {prod.onlineStock}
                        </td>
                        <td className="py-3.5 text-center">
                          {linkedProd ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-full px-2.5 py-0.5 text-[10px] font-bold">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> ผูกมัดแล้ว
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-100 rounded-full px-2.5 py-0.5 text-[10px] font-bold">
                              <AlertTriangle className="w-3 h-3 text-amber-500" /> รอยืนยันการผูก
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 text-right">
                          <select
                            value={prod.linkedProductId || ''}
                            onChange={(e) => handleLinkProduct(prod.id, e.target.value || null)}
                            className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white max-w-[200px] text-slate-700 font-bold shadow-xs"
                          >
                            <option value="">-- ยังไม่ได้ผูกสินค้า --</option>
                            {herbProducts.map(lp => (
                              <option key={lp.id} value={lp.id}>
                                {lp.name} (คงเหลือในคลัง: {lp.stock})
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SUBTAB 3: Online Orders Sync & Processing */}
        {activeSubTab === 'orders' && (
          <div className="space-y-4 animate-fadeIn">
            
            {/* Action Bar for orders */}
            <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <h5 className="text-xs font-bold text-amber-900 font-sans flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-700" />
                  คำสั่งซื้อออนไลน์ที่ชำระเงินสำเร็จ (รอนำเข้าระบบบัญชีแยกประเภท)
                </h5>
                <p className="text-[10px] text-amber-800 font-sans">
                  คุณสามารถนำยอดขายที่เสร็จสิ้น (Completed) มาลงบัญชีรับเงินแยกประเภทและให้ระบบคำนวณหักลบจำนวนคลังสมุนไพรจริงอัตโนมัติ
                </p>
              </div>

              <div className="flex gap-2 w-full md:w-auto">
                <button
                  onClick={handleSimulateSync}
                  className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold font-sans flex-1 md:flex-initial text-center cursor-pointer"
                >
                  อัปเดตดึงข้อมูลออเดอร์ล่าสุด
                </button>
                <button
                  onClick={handleProcessOrdersToLedger}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold font-sans flex-1 md:flex-initial text-center flex items-center justify-center gap-1 cursor-pointer shadow-md"
                >
                  <FileText className="w-3.5 h-3.5" /> บันทึกสมุดบัญชีและตัดสต็อก
                </button>
              </div>
            </div>

            {/* Filter and Simulator Bar */}
            <div className="bg-white p-4 border border-slate-100 rounded-2xl shadow-xs space-y-3">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                  {/* Search Input */}
                  <div className="relative flex-1 min-w-[200px] sm:flex-none">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="ค้นหา ออเดอร์, ชื่อลูกค้า, SKU..."
                      value={orderSearch}
                      onChange={(e) => setOrderSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-700 font-bold focus:outline-emerald-700 bg-slate-50/50"
                    />
                  </div>

                  {/* Platform Filter */}
                  <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
                    <Filter className="w-3 h-3 text-slate-400" />
                    <select
                      value={orderPlatformFilter}
                      onChange={(e) => setOrderPlatformFilter(e.target.value)}
                      className="text-[11px] bg-transparent font-bold text-slate-600 focus:outline-none border-none py-1 cursor-pointer"
                    >
                      <option value="all">ทุกแพลตฟอร์ม</option>
                      <option value="shopee">Shopee</option>
                      <option value="tiktok">TikTok Shop</option>
                    </select>
                  </div>

                  {/* Sync Status Filter */}
                  <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
                    <Database className="w-3 h-3 text-slate-400" />
                    <select
                      value={orderSyncFilter}
                      onChange={(e) => setOrderSyncFilter(e.target.value)}
                      className="text-[11px] bg-transparent font-bold text-slate-600 focus:outline-none border-none py-1 cursor-pointer"
                    >
                      <option value="all">ทุกสถานะบัญชี</option>
                      <option value="synced">บันทึกบัญชีแล้ว</option>
                      <option value="pending">รอนำเข้าบัญชี</option>
                    </select>
                  </div>

                  {/* Order Status Filter */}
                  <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
                    <ShoppingBag className="w-3 h-3 text-slate-400" />
                    <select
                      value={orderStatusFilter}
                      onChange={(e) => setOrderStatusFilter(e.target.value)}
                      className="text-[11px] bg-transparent font-bold text-slate-600 focus:outline-none border-none py-1 cursor-pointer"
                    >
                      <option value="all">ทุกสถานะออเดอร์</option>
                      <option value="completed">ชำระเงินสำเร็จแล้ว</option>
                      <option value="pending_shipment">ที่ต้องจัดส่ง</option>
                      <option value="cancelled">ยกเลิกแล้ว</option>
                    </select>
                  </div>
                </div>

                {/* Simulator Trigger */}
                <button
                  onClick={handleGenerateRandomOrder}
                  className="w-full lg:w-auto px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-extrabold font-sans flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 fill-slate-950" />
                  จำลองรับออเดอร์ (Webhook Simulator)
                </button>
              </div>
            </div>

            {/* Orders Table list */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-extrabold pb-3">
                    <th className="py-2">เลขที่อ้างอิงออเดอร์</th>
                    <th className="py-2">ช่องทาง</th>
                    <th className="py-2">ผู้ซื้อ / วันที่ทำรายการ</th>
                    <th className="py-2">รายการสินค้าที่สั่งซื้อ</th>
                    <th className="py-2 text-right">ยอดรวมสุทธิ</th>
                    <th className="py-2 text-center">สถานะออเดอร์</th>
                    <th className="py-2 text-right">สถานะบัญชี & การพิมพ์บิล</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredOrders.length > 0 ? (
                    filteredOrders.map(order => (
                      <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 font-mono font-bold text-slate-800">
                          {order.id}
                        </td>
                        <td className="py-3.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                            order.platform === 'shopee'
                              ? 'bg-orange-50 text-orange-700 border border-orange-100'
                              : 'bg-slate-900 text-white'
                          }`}>
                            {order.platform === 'shopee' ? 'Shopee' : 'TikTok'}
                          </span>
                        </td>
                        <td className="py-3.5 font-sans">
                          <span className="font-bold text-slate-800 block">คุณ{order.customerName}</span>
                          <span className="text-[10px] text-slate-400 block">{order.orderDate}</span>
                        </td>
                        <td className="py-3.5 max-w-xs">
                          <div className="space-y-1">
                            {order.items.map((item, idx) => {
                              const onlineProd = onlineProducts.find(p => p.onlineSku === item.sku);
                              const isLinked = onlineProd ? onlineProd.linkedProductId !== null : false;
                              
                              return (
                                <div key={idx} className="flex justify-between items-center bg-slate-50 px-2 py-1 rounded border border-slate-100">
                                  <span className="font-bold text-slate-600 truncate mr-2" title={item.onlineProductName}>
                                    {item.onlineProductName}
                                  </span>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="font-mono text-[10px] font-bold text-slate-400">({item.sku})</span>
                                    <span className="bg-emerald-50 text-emerald-800 font-mono text-[10px] font-bold px-1 py-0.2 rounded">
                                      x{item.quantity}
                                    </span>
                                    {isLinked ? (
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Linked to main inventory" />
                                    ) : (
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" title="Not linked - please match" />
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                        <td className="py-3.5 text-right font-mono font-extrabold text-slate-800">
                          ฿{order.totalAmount.toLocaleString()}
                        </td>
                        <td className="py-3.5 text-center">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            order.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : order.status === 'pending_shipment'
                              ? 'bg-amber-50 text-amber-700 border border-amber-100 animate-pulse'
                              : 'bg-rose-50 text-rose-700'
                          }`}>
                            {order.status === 'completed' && 'ชำระเงินสำเร็จแล้ว'}
                            {order.status === 'pending_shipment' && 'ที่ต้องจัดส่ง (Pending)'}
                            {order.status === 'cancelled' && 'ยกเลิกคำสั่งซื้อ'}
                          </span>
                        </td>
                        <td className="py-3.5 text-right">
                          <div className="flex flex-col items-end gap-1.5">
                            {order.ledgerSynced ? (
                              <span className="inline-flex items-center gap-1 text-emerald-600 font-bold font-sans">
                                <Check className="w-4 h-4 stroke-[3px]" /> บันทึกบัญชีแล้ว
                              </span>
                            ) : order.status === 'completed' ? (
                              <span className="text-amber-600 font-bold font-sans animate-pulse">
                                ● รอนำเข้าสมุดบัญชี
                              </span>
                            ) : (
                              <span className="text-slate-400 font-sans">
                                -
                              </span>
                            )}
                            <button
                              onClick={() => setSelectedOrderForInvoice(order)}
                              className="text-[10px] px-2.5 py-1.5 border border-slate-200 hover:border-emerald-700 hover:text-emerald-800 hover:bg-emerald-50/20 text-slate-600 rounded bg-slate-50 font-sans font-extrabold flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                            >
                              <Printer className="w-3 h-3" /> พิมพ์ใบจัดส่ง / บิล
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 font-sans">
                        ไม่พบข้อมูลคำสั่งซื้อออนไลน์ตามตัวกรองที่เลือก
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* SUBTAB 5: Platform Fees Analysis & Marketing Strategy */}
        {activeSubTab === 'fees' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Introductory Banner Card */}
            <div className="bg-gradient-to-br from-emerald-900 to-slate-900 text-white rounded-3xl p-6 border border-emerald-800/50 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-teal-500/5 rounded-full blur-2xl -ml-16 -mb-16 pointer-events-none" />
              
              <div className="relative z-10 space-y-2 max-w-4xl">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-[10px] font-extrabold uppercase tracking-wider">
                  <Percent className="w-3.5 h-3.5" /> วิเคราะห์จุดคุ้มทุนช่องทางออนไลน์ (E-Commerce Fee Simulator)
                </span>
                <h3 className="text-lg font-extrabold font-sans leading-tight">
                  รู้ลึกค่าธรรมเนียมแพลตฟอร์ม เพื่อการวางแผนราคาและปรับตัวทางการตลาดอย่างรวดเร็ว
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed font-sans max-w-2xl">
                  ค่าธรรมเนียมคอมมิชชันและโปรแกรมส่งฟรีของ Shopee, TikTok Shop และ Lazada มีการปรับตัวขึ้นอย่างต่อเนื่อง 
                  ใช้เครื่องมือนี้เพื่อจำลองยอดรับเงินโอนสุทธิ (Net Payout) และอัตรากำไร (Net Margin) เพื่อปรับเปลี่ยนราคาจำหน่ายและวางแผนยิงโฆษณาได้ทันท่วงที
                </p>
              </div>
            </div>

            {/* Top Insight Widgets */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-xs flex items-center gap-3.5">
                <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="space-y-0.5 font-sans">
                  <span className="text-[10px] text-slate-400 font-extrabold block">ช่องทางที่มาร์จิ้นสูงที่สุด</span>
                  <span className="text-sm font-extrabold text-slate-800 block">
                    {highestMarginPlatformInfo}
                  </span>
                </div>
              </div>

              <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-xs flex items-center gap-3.5">
                <div className="p-3 bg-amber-50 text-amber-700 rounded-xl">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div className="space-y-0.5 font-sans">
                  <span className="text-[10px] text-slate-400 font-extrabold block">ส่วนแบ่งระบบเฉลี่ย (Platforms Fee Load)</span>
                  <span className="text-sm font-extrabold text-slate-800 block">
                    {averagePlatformFeeLoad}
                  </span>
                </div>
              </div>

              <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-xs flex items-center gap-3.5">
                <div className="p-3 bg-indigo-50 text-indigo-700 rounded-xl">
                  <Zap className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="space-y-0.5 font-sans">
                  <span className="text-[10px] text-slate-400 font-extrabold block">เกราะป้องกันอัตรากำไร (Marketing Readiness)</span>
                  <span className="text-sm font-extrabold text-slate-800 block">
                    {Math.round((completedStrategies.length / MARKETING_STRATEGIES.length) * 100)}% ({completedStrategies.length}/{MARKETING_STRATEGIES.length} กลยุทธ์)
                  </span>
                </div>
              </div>
            </div>

            {/* Interactive Calculator grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Costing form */}
              <div className="lg:col-span-4 bg-white border border-slate-100 rounded-3xl p-5 shadow-xs h-fit space-y-5">
                <div className="pb-3 border-b border-slate-100">
                  <h4 className="text-xs font-extrabold text-slate-800 font-sans flex items-center gap-1.5">
                    <Settings className="w-4 h-4 text-emerald-700" /> กำหนดต้นทุนและการจำหน่าย (Product Costing)
                  </h4>
                  <p className="text-[10px] text-slate-400 font-sans mt-0.5">
                    จำลองราคาสินค้าจริงเพื่อเปรียบเทียบการทำกำไรของแต่ละแพลตฟอร์มขาย
                  </p>
                </div>

                <div className="space-y-4 font-sans text-xs">
                  {/* Select Product */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500">เลือกสินค้าจากคลังสมุนไพรหลัก</label>
                    <select
                      value={selectedCalcProductId}
                      onChange={(e) => setSelectedCalcProductId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-bold text-slate-700 focus:outline-emerald-700 h-9"
                    >
                      <option value="custom">-- จำลองข้อมูลราคาและต้นทุนเอง (Custom) --</option>
                      {herbProducts.map(prod => (
                        <option key={prod.id} value={prod.id}>
                          {prod.name} (ราคาขาย: ฿{prod.sellPrice})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Base Price input */}
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <label className="block text-[11px] font-bold text-slate-500">ราคาจำหน่ายตั้งต้น (Retail Price)</label>
                      <span className="text-[10px] text-slate-400 font-semibold">(ผู้ซื้อจ่ายจริงไม่รวมค่าส่ง)</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-2 font-extrabold text-slate-400 font-mono">฿</span>
                      <input
                        type="number"
                        min="1"
                        value={customPrice}
                        onChange={(e) => setCustomPrice(Math.max(1, parseInt(e.target.value) || 0))}
                        className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-xl font-mono font-bold text-slate-800 focus:outline-emerald-700 h-9"
                      />
                    </div>
                  </div>

                  {/* Cost of goods sold input */}
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <label className="block text-[11px] font-bold text-slate-500">ต้นทุนสินค้าจริงต่อหน่วย (COGS)</label>
                      <span className="text-[10px] text-slate-400 font-semibold">
                        {customPrice > 0 ? `${((customCogs / customPrice) * 100).toFixed(0)}% ของราคาขาย` : ''}
                      </span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-2 font-extrabold text-slate-400 font-mono">฿</span>
                      <input
                        type="number"
                        min="0"
                        value={customCogs}
                        onChange={(e) => setCustomCogs(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-xl font-mono font-bold text-slate-800 focus:outline-emerald-700 h-9"
                      />
                    </div>
                    <span className="text-[9px] text-slate-400 block leading-tight">
                      *รวมค่าวัตถุดิบ บรรจุภัณฑ์ และต้นทุนแรงงานบรรจุห่อ
                    </span>
                  </div>

                  {/* Target Profit Margin slider */}
                  <div className="space-y-2 border-t border-slate-100 pt-3">
                    <div className="flex justify-between items-center">
                      <label className="block text-[11px] font-bold text-slate-600">เป้าหมายอัตรากำไรขั้นต่ำที่ต้องการ</label>
                      <span className="font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-xs font-extrabold">
                        {targetProfitMargin}% Margin
                      </span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="80"
                      step="5"
                      value={targetProfitMargin}
                      onChange={(e) => setTargetProfitMargin(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 accent-emerald-700 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-slate-400 font-bold">
                      <span>10% (เน้นสเกล)</span>
                      <span>50% (กลางสุขภาพ)</span>
                      <span>80% (พรีเมียมบิวตี้)</span>
                    </div>
                  </div>

                  {/* Markup Indicator */}
                  <div className="p-3 bg-slate-50 border border-slate-150 rounded-2xl space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">โครงสร้างสัดส่วนจำหน่าย (Cost Breakdown)</span>
                    <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden flex font-mono text-[9px] text-white text-center font-extrabold">
                      <div
                        className="bg-rose-500 flex items-center justify-center transition-all"
                        style={{ width: `${customPrice > 0 ? Math.min(100, (customCogs / customPrice) * 100) : 0}%` }}
                        title="ต้นทุนการผลิต"
                      >
                        {customPrice > 0 && (customCogs / customPrice) * 100 >= 15 ? 'COGS' : ''}
                      </div>
                      <div
                        className="bg-emerald-600 flex items-center justify-center flex-1 transition-all"
                        title="ส่วนต่างมาร์จิ้นเบื้องต้น"
                      >
                        Markup
                      </div>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500 font-medium pt-0.5">
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-rose-500 rounded-sm" /> ทุน ฿{customCogs}</span>
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-emerald-600 rounded-sm" /> ส่วนต่างกำไร ฿{customPrice - customCogs}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Platform detail cards */}
              <div className="lg:col-span-8 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold text-slate-800 font-sans uppercase tracking-wider">
                    ผลการวิเคราะห์และเปรียบเทียบกำไรสุทธิแยกช่องทางขาย
                  </h4>
                  <span className="text-[10px] text-slate-400 font-semibold font-sans">
                    *ผลการคำนวณปรับตามเวลาจริงแบบ Real-time
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {PLATFORM_FEE_TEMPLATES.map(tmpl => {
                    const activeFeeIndices = feeSelections[tmpl.key] || [];
                    const activeFees = tmpl.fees.filter((_, idx) => activeFeeIndices[idx] !== false);
                    const totalActiveFeeRate = activeFees.reduce((acc, f) => acc + f.rate, 0);
                    const adspendRate = customAdspendRates[tmpl.key] ?? 0;
                    
                    const totalDeductionsRate = totalActiveFeeRate + adspendRate;
                    const feeDeductionAmount = (customPrice * totalActiveFeeRate) / 100;
                    const adSpendAmount = (customPrice * adspendRate) / 100;
                    
                    const netPayout = customPrice - feeDeductionAmount;
                    const netProfit = netPayout - customCogs - adSpendAmount;
                    const actualMargin = customPrice > 0 ? (netProfit / customPrice) * 100 : 0;
                    const isSuccess = actualMargin >= targetProfitMargin;
                    
                    // Recommended price calculation
                    const denominator = 1 - (totalDeductionsRate + targetProfitMargin) / 100;
                    const recommendedPrice = denominator > 0.05
                      ? Math.round(customCogs / denominator)
                      : null;

                    return (
                      <div
                        key={tmpl.key}
                        className={`bg-white border rounded-2xl p-4 shadow-xs transition-all relative flex flex-col justify-between ${
                          isSuccess
                            ? 'border-emerald-200 shadow-sm shadow-emerald-500/5'
                            : 'border-slate-100 hover:border-amber-300'
                        }`}
                      >
                        <div className="space-y-3">
                          {/* Platform Header */}
                          <div className="flex items-center justify-between pb-2.5 border-b border-slate-50">
                            <span className="font-extrabold text-xs text-slate-800 font-sans flex items-center gap-1.5">
                              <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold font-mono ${tmpl.badgeColor}`}>
                                {tmpl.key === 'social_commerce' ? 'Direct' : tmpl.name.split(' ')[0]}
                              </span>
                              {tmpl.name}
                            </span>
                            <span className="text-[10px] font-mono font-bold text-slate-400">
                              หักสุทธิ: {totalDeductionsRate.toFixed(2)}%
                            </span>
                          </div>

                          {/* Fee Items Selectors */}
                          <div className="space-y-1.5 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 text-[11px] font-sans">
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">สัดส่วนค่าธรรมเนียมที่เปิดใช้:</span>
                            <div className="space-y-1 max-h-24 overflow-y-auto scrollbar-thin">
                              {tmpl.fees.map((fee, idx) => (
                                <label
                                  key={idx}
                                  className="flex items-start gap-2 cursor-pointer hover:bg-slate-50 p-0.5 rounded"
                                >
                                  <input
                                    type="checkbox"
                                    checked={activeFeeIndices[idx] !== false}
                                    onChange={() => {
                                      const current = [...activeFeeIndices];
                                      current[idx] = !current[idx];
                                      setFeeSelections(prev => ({ ...prev, [tmpl.key]: current }));
                                    }}
                                    className="w-3.5 h-3.5 mt-0.5 accent-emerald-600 rounded cursor-pointer"
                                  />
                                  <div className="leading-tight">
                                    <span className="font-bold text-slate-700 block">{fee.name} (+{fee.rate}%)</span>
                                    <span className="text-[9px] text-slate-400 block font-medium leading-none">{fee.description}</span>
                                  </div>
                                </label>
                              ))}
                            </div>
                          </div>

                          {/* Ad spend (CAC) Slider */}
                          <div className="space-y-1 font-sans">
                            <div className="flex justify-between items-center text-[10px] font-extrabold">
                              <span className="text-slate-500 uppercase tracking-wider">ต้นทุนยิงแอด/ค่าตลาด (Ad Cost / CAC)</span>
                              <span className="font-mono text-emerald-800 bg-slate-100 px-1.5 py-0.2 rounded font-extrabold">
                                {adspendRate}%
                              </span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="50"
                              step="1"
                              value={adspendRate}
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                setCustomAdspendRates(prev => ({ ...prev, [tmpl.key]: val }));
                              }}
                              className="w-full h-1 bg-slate-200 accent-emerald-700 rounded-lg cursor-pointer"
                            />
                          </div>

                          {/* Math breakdown */}
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5 text-[11px] font-sans">
                            <div className="flex justify-between text-slate-500 font-medium">
                              <span>ราคาเสนอขาย (Price):</span>
                              <span className="font-bold font-mono text-slate-700">฿{customPrice.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-slate-500 font-medium">
                              <span>หักค่าธรรมเนียม ({totalActiveFeeRate.toFixed(2)}%):</span>
                              <span className="font-bold font-mono text-rose-500">-฿{feeDeductionAmount.toFixed(1)}</span>
                            </div>
                            {adspendRate > 0 && (
                              <div className="flex justify-between text-slate-500 font-medium">
                                <span>หักงบโฆษณา ({adspendRate}%):</span>
                                <span className="font-bold font-mono text-rose-500">-฿{adSpendAmount.toFixed(1)}</span>
                              </div>
                            )}
                            <div className="flex justify-between text-slate-500 font-medium">
                              <span>หักทุนสินค้า (COGS):</span>
                              <span className="font-bold font-mono text-rose-500">-฿{customCogs.toLocaleString()}</span>
                            </div>

                            <div className="flex justify-between pt-1 border-t border-slate-150 text-[11px] font-extrabold">
                              <span className="text-slate-600">ยอดเงินโอนเข้าบัญชีสุทธิ:</span>
                              <span className="font-mono text-emerald-700">฿{netPayout.toFixed(1)}</span>
                            </div>

                            <div className="flex justify-between text-[11px] font-extrabold">
                              <span className="text-slate-600">กำไรสุทธิสุจริต:</span>
                              <span className={`font-mono ${netProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                                ฿{netProfit.toFixed(1)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Status Check & Recommendation alert */}
                        <div className="mt-4 pt-3 border-t border-slate-50">
                          {isSuccess ? (
                            <div className="p-2.5 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl space-y-1">
                              <span className="text-[10px] font-extrabold block flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> ผ่านเกณฑ์กำไรเป้าหมาย! (มาร์จิ้นจริง: {actualMargin.toFixed(1)}%)
                              </span>
                              <p className="text-[9px] text-emerald-700 leading-tight">
                                อัตรานี้ปลอดภัยและเหมาะสมกับการแข่งขัน สามารถใช้แผนการตลาดเดิมและประคองประสิทธิภาพได้ดี
                              </p>
                            </div>
                          ) : (
                            <div className="p-2.5 bg-amber-50 border border-amber-100 text-amber-800 rounded-xl space-y-1.5 font-sans">
                              <span className="text-[10px] font-extrabold block flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> มาร์จิ้นต่ำกว่าเป้าหมาย {targetProfitMargin}% (จริงได้: {actualMargin.toFixed(1)}%)
                              </span>
                              
                              <div className="flex items-center justify-between text-[10px] font-bold">
                                <span>
                                  {recommendedPrice ? (
                                    <>ราคาแนะนำเพื่อให้คงมาร์จิ้น: <span className="font-mono text-emerald-700 font-extrabold">฿{recommendedPrice}</span></>
                                  ) : (
                                    'ไม่สามารถตั้งราคาคุ้มทุนได้ด้วยฟีนี้'
                                  )}
                                </span>
                                {recommendedPrice && (
                                  <button
                                    onClick={() => {
                                      setCustomPrice(recommendedPrice);
                                      if (selectedCalcProductId && selectedCalcProductId !== 'custom') {
                                        onUpdateHerbProduct(selectedCalcProductId, { sellPrice: recommendedPrice });
                                      }
                                      setSyncLogs(prev => [
                                        `[MARKETING] ปรับตั้งราคาจำลองสำหรับสินค้า ${selectedCalcProductId === 'custom' ? 'สินค้ากำหนดเอง' : 'จากคลังหลัก'} บนช่องทาง ${tmpl.name} เป็น ฿${recommendedPrice} บาท เพื่อรักษามาร์จิ้นกำไรเป้าหมาย ${targetProfitMargin}% เรียบร้อย! (${new Date().toLocaleTimeString()})`,
                                        ...prev
                                      ]);
                                    }}
                                    className="px-2 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-[9px] font-extrabold rounded-md shadow-sm transition-colors cursor-pointer"
                                  >
                                    ใช้ราคานี้ & อัปเดตคลัง
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                          <p className="text-[9px] text-slate-400 leading-tight font-medium mt-2">
                            💡 {tmpl.marketingTip}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Section B: Marketing Playbook & Interactive Actions */}
            <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs space-y-5">
              <div className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-extrabold text-slate-800 font-sans flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-emerald-700" /> แผนปรับปรุงกลยุทธ์การตลาดทันเหตุการณ์ (Actionable Marketing Playbooks)
                  </h4>
                  <p className="text-[10px] text-slate-400 font-sans">
                    ข้อปฏิบัติเพื่อเปลี่ยนโครงสร้างรายรับแบรนด์คุณชายสมุนไพร เพื่อสู้กับค่าธรรมเนียมออนไลน์ที่ขยับตัวสูง
                  </p>
                </div>
                <div className="bg-emerald-50 text-emerald-800 border border-emerald-100 px-3 py-1 rounded-xl text-[10px] font-extrabold font-sans">
                  ความพร้อมรับมือค่าบริการ: {Math.round((completedStrategies.length / MARKETING_STRATEGIES.length) * 100)}%
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Strategy Cards */}
                <div className="space-y-3 font-sans text-xs">
                  {MARKETING_STRATEGIES.map(strat => {
                    const isCompleted = completedStrategies.includes(strat.id);
                    return (
                      <div
                        key={strat.id}
                        onClick={() => {
                          setCompletedStrategies(prev =>
                            isCompleted ? prev.filter(id => id !== strat.id) : [...prev, strat.id]
                          );
                        }}
                        className={`p-3.5 border rounded-2xl cursor-pointer transition-all flex items-start gap-3.5 select-none ${
                          isCompleted
                            ? 'bg-emerald-50/40 border-emerald-200'
                            : 'bg-slate-50/50 border-slate-150 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isCompleted}
                          onChange={() => {}} // Handled by div onClick
                          className="w-4 h-4 mt-0.5 accent-emerald-700 rounded cursor-pointer"
                        />
                        <div className="space-y-1">
                          <h5 className="font-extrabold text-slate-800 text-[11px] flex items-center gap-1.5">
                            {strat.title}
                            {isCompleted && (
                              <span className="bg-emerald-100 text-emerald-800 text-[9px] px-1.5 py-0.2 rounded-full font-bold">
                                เปิดแผนนี้แล้ว
                              </span>
                            )}
                          </h5>
                          <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                            {strat.description}
                          </p>
                          <span className="text-[9px] text-emerald-700 font-extrabold block">
                            📈 ผลกระทบเชิงบวก: {strat.impact}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Strategy feedback panel */}
                <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800 text-slate-300 font-sans space-y-4 flex flex-col justify-between">
                  <div className="space-y-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400 font-mono block">
                      วิเคราะห์ผลลัพธ์และคำปรึกษาเชิงลึกจากผู้ช่วยการตลาด (Advisor Feedback)
                    </span>
                    <h5 className="text-xs font-bold text-white leading-snug">
                      {completedStrategies.length === 0 && '❌ ยังไม่ได้ปรับเปลี่ยนกลยุทธ์การตลาดในช่องทางใดเลย'}
                      {completedStrategies.length > 0 && completedStrategies.length < 3 && '⚠️ อยู่ในเกณฑ์ต้องเฝ้าระวัง: เริ่มมีการขยับปรับตัวเพื่อปกป้องกำไรแล้ว'}
                      {completedStrategies.length >= 3 && '✅ ดีเยี่ยม! แบรนด์มีดัชนีความยืดหยุ่นและการปกป้องอัตรากำไรในเกณฑ์สูงสุด'}
                    </h5>
                    
                    <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                      {completedStrategies.length === 0 && (
                        'เนื่องจากท่านไม่ได้เลือกเปิดกลยุทธ์ข้อใดเลย แบรนด์มีความเสี่ยงสูงที่จะเผชิญกับอัตรากำไรสุทธิถดถอย (Margin Squeeze) บน Shopee และ TikTok ซึ่งค่าธรรมเนียมสูงเกินกว่า 11% แนะนำอย่างยิ่งให้เริ่มทำ "ออกแบบชุดมัดรวมสินค้า (Bundle Packs)" เพื่อเพิ่มขนาดออเดอร์ หรือดึงลูกค้าเก่าเข้า LINE OA เพื่อลดต้นทุนทันที'
                      )}
                      {completedStrategies.length > 0 && completedStrategies.length < 3 && (
                        'การปรับตัวถือเป็นจุดเริ่มต้นที่ดีมากสำหรับการแข่งขันยุคนี้ อย่างไรก็ตาม เพื่อผลลัพธ์สูงสุด แนะนำให้ดำเนินการควบคู่กับ "จัดทำใบขอบคุณ Thank You Card" เพื่อดึงลูกค้าประจำให้หลุดพ้นจากระบบหักเปอร์เซ็นต์ของแพลตฟอร์มรายใหญ่ มาอยู่ในระบบ LINE OA ซึ่งจะช่วยประหยัดเงินได้อีกเกือบ 8-10% ต่อคำสั่งซื้อ'
                      )}
                      {completedStrategies.length >= 3 && (
                        'ขอชื่นชมการปรับแผนธุรกิจอย่างชาญฉลาด! การแบ่งเกรดราคาตามความเสี่ยงแพลตฟอร์ม (Dynamic Pricing) ร่วมกับการดึงคนมาซื้อตรงผ่านระบบ LINE SHOPPING จะเปลี่ยนให้ร้านค้าเป็นแบรนด์ที่มีความภักดีสูง (Loyalty Base) และประหยัดค่าโฆษณายิงแอดได้อย่างยั่งยืนในระยะยาว มาร์จิ้นสุทธิรวมของแบรนด์คุณชายสมุนไพรเฉลี่ยรวมทุกช่องทางจะพุ่งสูงกว่า 38% เลยทีเดียว'
                      )}
                    </p>
                  </div>

                  <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">แนวทางการขยายตลาดเพิ่มเติม:</span>
                    <div className="text-[10px] text-emerald-400 space-y-1 font-mono">
                      <div className="flex gap-1.5">
                        <span className="text-slate-600">•</span>
                        <span>[แนะ] จัดกิจกรรมไลฟ์สดสัปดาห์ละ 2 ครั้งเพื่อขอรับคูปองสนับสนุนค่าส่งฟรีของ TikTok สูงสุด 40 บาท</span>
                      </div>
                      <div className="flex gap-1.5">
                        <span className="text-slate-600">•</span>
                        <span>[แนะ] ปล่อยสิทธิพิเศษคูปองลด 20 บาทเฉพาะในระบบ LINE OA ทุกวันพุธเพื่อยิงบรอดแคสต์ฟรีไม่มีคอมมิชชัน</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Section C: TikTok & Shopee Ads Campaign Center */}
            <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs space-y-6">
              {/* Header */}
              <div className="pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5 font-sans">
                  <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-emerald-700 animate-pulse" /> ระบบบริหารจัดการและดูแลการโฆษณา (TikTok & Shopee Ads Campaign Center)
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    ติดตาม ตรวจสอบ และวิเคราะห์ผลลัพธ์จากโฆษณา Shopee Ads และ TikTok Ads พร้อมคำนวณอัตราจุดคุ้มทุนอัตโนมัติ
                  </p>
                </div>
                <button
                  onClick={() => setShowAddCampaignModal(true)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[10px] rounded-xl flex items-center gap-1 shadow-sm transition-colors cursor-pointer self-start sm:self-auto font-sans"
                >
                  <Plus className="w-3.5 h-3.5" /> สร้างแคมเปญโฆษณาใหม่
                </button>
              </div>

              {/* Aggregated KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 font-sans">
                {/* Spend KPI */}
                <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-2xl space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">งบโฆษณาที่ใช้ไปทั้งหมด (Spend)</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-mono font-extrabold text-slate-800">฿{adsSummary.totalSpent.toLocaleString()}</span>
                  </div>
                  <span className="text-[9px] text-slate-400 font-mono block">เฉลี่ย CPC: ฿{adsSummary.averageCPC.toFixed(2)} / คลิก</span>
                </div>

                {/* Revenue KPI */}
                <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-2xl space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">ยอดขายจากโฆษณา (Ad Revenue)</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-mono font-extrabold text-slate-800">฿{adsSummary.totalRevenue.toLocaleString()}</span>
                  </div>
                  <span className="text-[9px] text-emerald-600 font-bold block">ออเดอร์โฆษณา: {adsSummary.totalOrders} ออเดอร์</span>
                </div>

                {/* ROAS KPI */}
                <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-2xl space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">ROAS เฉลี่ยรวม (Avg. ROAS)</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-lg font-mono font-extrabold text-emerald-700">{adsSummary.averageROAS.toFixed(2)}x</span>
                    <span className={`text-[8px] px-1.5 py-0.2 rounded font-extrabold ${adsSummary.averageROAS >= breakEvenROASInfo.breakEvenROAS ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                      {adsSummary.averageROAS >= breakEvenROASInfo.breakEvenROAS ? 'กำไร' : 'ต่ำกว่าจุดคุ้มทุน'}
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-400 font-mono block">จุดคุ้มทุนขั้นต่ำ: {breakEvenROASInfo.breakEvenROAS.toFixed(2)}x</span>
                </div>

                {/* Conversion KPI */}
                <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-2xl space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">สถิติอัตราผู้ชม (CTR & CVR)</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-mono font-extrabold text-slate-800">{adsSummary.ctr.toFixed(1)}%</span>
                    <span className="text-[10px] text-slate-400 font-sans ml-1">CTR</span>
                  </div>
                  <span className="text-[9px] text-indigo-600 font-mono block">CVR (อัตราสั่งซื้อ): {adsSummary.cvr.toFixed(1)}%</span>
                </div>
              </div>

              {/* Dynamic Break-Even Analysis Banner */}
              <div className="p-3.5 bg-emerald-50/50 border border-emerald-100 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-sans">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-800 font-extrabold">
                    <Coins className="w-4 h-4 text-emerald-600" />
                    <span>วิเคราะห์จุดคุ้มทุนโฆษณา (Break-Even ROAS Benchmark)</span>
                  </div>
                  <p className="text-[10px] text-emerald-700 leading-normal max-w-2xl font-medium">
                    อ้างอิงสินค้า <strong>{selectedCalcProductId === 'custom' ? 'สินค้าจำลองทั่วไป' : (herbProducts.find(p => p.id === selectedCalcProductId)?.name || 'สินค้าคลังหลัก')}</strong> ทุนสินค้า ฿{customCogs} ขายราคา ฿{customPrice} (หักค่าธรรมเนียมเฉลี่ยแพลตฟอร์ม 8%)
                  </p>
                </div>
                <div className="bg-emerald-950 text-white px-3 py-2 rounded-xl text-center shrink-0">
                  <span className="text-[8px] uppercase tracking-wider font-extrabold block text-emerald-300">Break-Even ROAS</span>
                  <span className="font-mono text-xs font-extrabold">{breakEvenROASInfo.breakEvenROAS.toFixed(2)}x</span>
                </div>
              </div>

              {/* Campaign Table */}
              <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse font-sans text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-extrabold">
                        <th className="p-3 text-[10px] uppercase tracking-wider">แคมเปญ / ประเภท</th>
                        <th className="p-3 text-[10px] uppercase tracking-wider">สถานะ</th>
                        <th className="p-3 text-[10px] uppercase tracking-wider text-right">งบรายวัน</th>
                        <th className="p-3 text-[10px] uppercase tracking-wider text-right">ใช้ไปแล้ว</th>
                        <th className="p-3 text-[10px] uppercase tracking-wider text-right">จำนวนคลิก (CTR)</th>
                        <th className="p-3 text-[10px] uppercase tracking-wider text-right">คำสั่งซื้อ</th>
                        <th className="p-3 text-[10px] uppercase tracking-wider text-right">ยอดขาย (ROAS)</th>
                        <th className="p-3 text-[10px] uppercase tracking-wider text-center">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {adCampaigns.map(camp => {
                        const roas = camp.spent > 0 ? camp.revenue / camp.spent : 0;
                        const campCtr = camp.impressions > 0 ? (camp.clicks / camp.impressions) * 100 : 0;
                        const isProfitable = roas >= breakEvenROASInfo.breakEvenROAS;
                        
                        return (
                          <tr key={camp.id} className="hover:bg-slate-50/50 transition-colors">
                            {/* Campaign Name & Platform */}
                            <td className="p-3 space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase ${
                                  camp.platform === 'tiktok' 
                                    ? 'bg-pink-50 text-pink-700 border border-pink-100' 
                                    : 'bg-orange-50 text-orange-700 border border-orange-100'
                                }`}>
                                  {camp.platform}
                                </span>
                                <span className="font-extrabold text-slate-800 text-[11px]">{camp.name}</span>
                              </div>
                              <div className="text-[10px] text-slate-400 font-medium">ประเภท: {camp.type}</div>
                            </td>

                            {/* Status */}
                            <td className="p-3">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold ${
                                camp.status === 'active' 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                  : 'bg-slate-100 text-slate-500 border border-slate-200'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${camp.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                                {camp.status === 'active' ? 'กำลังยิงแอด' : 'ปิดชั่วคราว'}
                              </span>
                            </td>

                            {/* Daily Budget */}
                            <td className="p-3 text-right font-mono font-bold text-slate-700">
                              ฿{camp.dailyBudget.toLocaleString()}
                            </td>

                            {/* Spent */}
                            <td className="p-3 text-right font-mono font-medium text-slate-600">
                              ฿{camp.spent.toLocaleString()}
                            </td>

                            {/* Clicks & CTR */}
                            <td className="p-3 text-right space-y-0.5">
                              <div className="font-mono font-bold text-slate-700">{camp.clicks.toLocaleString()} คลิก</div>
                              <div className="text-[9px] font-mono text-slate-400">CTR: {campCtr.toFixed(1)}%</div>
                            </td>

                            {/* Orders */}
                            <td className="p-3 text-right font-mono font-bold text-indigo-700">
                              {camp.orders}
                            </td>

                            {/* Ad Revenue & ROAS */}
                            <td className="p-3 text-right space-y-0.5">
                              <div className="font-mono font-bold text-slate-800">฿{camp.revenue.toLocaleString()}</div>
                              <div className="flex items-center justify-end gap-1 text-[10px]">
                                <span className={`font-mono font-extrabold ${isProfitable ? 'text-emerald-700' : 'text-amber-600'}`}>
                                  ROAS: {roas.toFixed(2)}x
                                </span>
                              </div>
                            </td>

                            {/* Action Buttons */}
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {/* Toggle Play/Pause */}
                                <button
                                  onClick={() => {
                                    setAdCampaigns(prev =>
                                      prev.map(c =>
                                        c.id === camp.id
                                          ? { ...c, status: c.status === 'active' ? 'paused' : 'active' }
                                          : c
                                      )
                                    );
                                    setSyncLogs(prev => [
                                      `[ADVERTISING] ${camp.status === 'active' ? 'ปิดระงับ' : 'เปิดใช้งาน'}แคมเปญโฆษณา ${camp.name} บนระบบ ${camp.platform.toUpperCase()} เรียบร้อย (${new Date().toLocaleTimeString()})`,
                                      ...prev
                                    ]);
                                  }}
                                  title={camp.status === 'active' ? 'หยุดแคมเปญชั่วคราว' : 'เปิดแคมเปญ'}
                                  className={`p-1 rounded-md border cursor-pointer transition-colors ${
                                    camp.status === 'active'
                                      ? 'border-slate-200 hover:bg-slate-150 text-amber-600'
                                      : 'border-emerald-200 hover:bg-emerald-50 text-emerald-700'
                                  }`}
                                >
                                  {camp.status === 'active' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                                </button>

                                {/* Delete Campaign */}
                                <button
                                  onClick={() => {
                                    if (window.confirm(`ต้องการลบแคมเปญโฆษณา "${camp.name}" ใช่หรือไม่?`)) {
                                      setAdCampaigns(prev => prev.filter(c => c.id !== camp.id));
                                      setSyncLogs(prev => [
                                        `[ADVERTISING] ลบแคมเปญโฆษณา ${camp.name} สำเร็จ (${new Date().toLocaleTimeString()})`,
                                        ...prev
                                      ]);
                                    }
                                  }}
                                  title="ลบแคมเปญ"
                                  className="p-1 rounded-md border border-slate-200 hover:bg-rose-50 text-rose-500 cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
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

              {/* AI Campaign Analysis & Optimization Recommendations */}
              <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800 text-slate-300 font-sans space-y-4">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400 font-mono">
                    AI Insights & Recommendations: แผนกลยุทธ์เพิ่มยอดขาย/ลดงบแอดจำลอง
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Performance Breakdown */}
                  <div className="space-y-2.5">
                    <h5 className="text-[10px] font-bold text-white uppercase tracking-wider text-slate-400">บทวิเคราะห์ภาพรวมแบรนด์คุณชายสมุนไพร</h5>
                    <div className="space-y-2 text-[10px] leading-relaxed font-medium">
                      {adCampaigns.some(c => c.status === 'active' && (c.spent > 0 ? c.revenue / c.spent : 0) < breakEvenROASInfo.breakEvenROAS) ? (
                        <p className="text-amber-300">
                          ⚠️ <strong>ตรวจพบแคมเปญต่ำกว่าจุดคุ้มทุน:</strong> มีบางแคมเปญที่ประสิทธิภาพ ROAS ต่ำกว่าอัตราคุ้มทุน {breakEvenROASInfo.breakEvenROAS.toFixed(2)}x แนะนำปรับงบประมาณเพื่อปกป้องกำไรสุทธิ
                        </p>
                      ) : (
                        <p className="text-emerald-400 font-bold">
                          ✅ <strong>ความคุ้มค่าโฆษณายอดเยี่ยม:</strong> ทุกแคมเปญที่เปิดทำงานอยู่มีอัตราผลตอบแทนค่าโฆษณา (ROAS) สูงกว่าค่าคุ้มทุนขั้นต่ำทั้งหมด แบรนด์กำลังสร้างกำไรสุทธิได้อย่างแข็งแกร่ง!
                        </p>
                      )}
                      <p className="text-slate-400">
                        • โฆษณา TikTok Shop (LIVE Ads และ Video Shopping) ทำหน้าที่ดีเยี่ยมในการขยายฐานผู้ชม (CTR สะสมเกือบ 5%) โดยสามารถเจาะตลาดกลุ่มคนรุ่นใหม่ที่รักสุขภาพได้อย่างฉับพลัน
                      </p>
                      <p className="text-slate-400">
                        • สำหรับ Shopee Ads มีปริมาณผู้มีเป้าหมายซื้อสมุนไพรที่ตรงจุด (High Intent) แต่จำเป็นต้องหลีกเลี่ยงคำกว้างที่ค่าประมูลคำสูง และเน้นประมูลคำเฉพาะเจาะจง (Exact Match) เช่น "ยาสระผมสมุนไพรอัญชัน" แทน
                      </p>
                    </div>
                  </div>

                  {/* Immediate Action Items */}
                  <div className="bg-slate-950 p-3.5 border border-slate-800 rounded-2xl space-y-2.5">
                    <h5 className="text-[10px] font-bold text-white uppercase tracking-wider text-slate-500">คำสั่งปรับปรุงและวิเคราะห์ด่วน</h5>
                    <div className="text-[10px] space-y-2 leading-relaxed font-mono text-emerald-400">
                      {adCampaigns.map(camp => {
                        const roas = camp.spent > 0 ? camp.revenue / camp.spent : 0;
                        if (camp.status === 'active' && roas < breakEvenROASInfo.breakEvenROAS) {
                          return (
                            <div key={camp.id} className="text-amber-400 font-medium">
                              • <strong>[หยุดแอด]</strong> <em>"{camp.name}"</em> มี ROAS {roas.toFixed(2)}x ต่ำกว่าคุ้มทุน {breakEvenROASInfo.breakEvenROAS.toFixed(2)}x แนะนำกดหยุดแคมเปญหรือปรับลดงบรายวันลง 50% ทันที
                            </div>
                          );
                        }
                        if (camp.status === 'active' && roas > 4.5) {
                          return (
                            <div key={camp.id} className="text-emerald-400 font-extrabold">
                              • <strong>[เพิ่มงบ]</strong> <em>"{camp.name}"</em> ได้ ROAS ยอดเยี่ยม {roas.toFixed(2)}x แนะนำให้เพิ่มงบรายวันขึ้น 20-30% ทันที เพื่อเก็บยอดการมองเห็นสูงสุด
                            </div>
                          );
                        }
                        return null;
                      })}
                      <div className="text-slate-400 pt-1 border-t border-slate-900 font-medium">
                        • <strong>[แนะนำ]</strong> นำยอดแบนเนอร์และภาพรีวิวความพึงพอใจของสมุนไพรจากหน้าเพจมาใส่ใน TikTok Spark Ads เพื่อดันอัตราการเปลี่ยนเป็นสั่งซื้อ (CVR) ได้อีก 15%
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* SUBTAB 4: Settings / API Credentials / Logs */}
        {activeSubTab === 'settings' && (
          <div className="space-y-6 animate-fadeIn">
            {/* System Logs Frame */}
            <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 shadow-xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-500 font-mono">
                  Real-time Server API Logs (e-Commerce Stream)
                </span>
                <button
                  onClick={() => setSyncLogs([])}
                  className="text-slate-500 hover:text-slate-300 font-sans text-[10px] font-bold cursor-pointer"
                >
                  ล้างข้อมูลบันทึก
                </button>
              </div>
              <div className="font-mono text-[11px] text-slate-300 space-y-1.5 max-h-64 overflow-y-auto leading-relaxed scrollbar-thin scrollbar-thumb-slate-800">
                {syncLogs.length > 0 ? (
                  syncLogs.map((log, idx) => (
                    <div key={idx} className="flex items-start gap-1">
                      <span className="text-emerald-600 shrink-0 select-none">➜</span>
                      <span>{log}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-slate-500 text-center py-8">ไม่มีบันทึกการซิงค์ API ในขณะนี้</div>
                )}
              </div>
            </div>

            {/* Automation Rules & Ledger Configuration Card */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs space-y-4 text-xs font-sans">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Settings className="w-4 h-4 text-emerald-700 animate-spin-slow" />
                <h5 className="font-extrabold text-slate-800">ตั้งค่าระบบบัญชีและอัตราภาษีนำเข้าอัตโนมัติ (E-Commerce Ledger Automation Rules)</h5>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* Automation Toggles */}
                <div className="space-y-4">
                  <h6 className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">ระบบบันทึกรายการอัตโนมัติ</h6>
                  
                  {/* VAT Toggle */}
                  <div className="flex items-start gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-150">
                    <input
                      type="checkbox"
                      id="autoCalculateVatCheckbox"
                      checked={autoCalculateVat}
                      onChange={(e) => setAutoCalculateVat(e.target.checked)}
                      className="w-4 h-4 mt-0.5 accent-emerald-700 rounded cursor-pointer"
                    />
                    <label htmlFor="autoCalculateVatCheckbox" className="space-y-1 cursor-pointer">
                      <span className="font-extrabold text-slate-800 block">เปิดใช้งานระบบภาษีมูลค่าเพิ่ม 7% (VAT Included)</span>
                      <span className="text-[11px] text-slate-500 block leading-relaxed">
                        เมื่อนำเข้ายอดขายสินค้าสำเร็จ ระบบจะประเมินค่าภาษีมูลค่าเพิ่ม 7% และนำส่งรายการภาษีขายเข้ารายงานประจำเดือน (ภ.พ.30) ทันทีโดยอัตโนมัติ
                      </span>
                    </label>
                  </div>

                  {/* Fee Toggle */}
                  <div className="flex items-start gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-150">
                    <input
                      type="checkbox"
                      id="autoRegisterFeesCheckbox"
                      checked={autoRegisterFees}
                      onChange={(e) => setAutoRegisterFees(e.target.checked)}
                      className="w-4 h-4 mt-0.5 accent-emerald-700 rounded cursor-pointer"
                    />
                    <label htmlFor="autoRegisterFeesCheckbox" className="space-y-1 cursor-pointer">
                      <span className="font-extrabold text-slate-800 block">บันทึกค่าธรรมเนียมและส่วนลดแพลตฟอร์มเป็นรายจ่าย</span>
                      <span className="text-[11px] text-slate-500 block leading-relaxed">
                        ระบบจะหักเปอร์เซ็นต์ค่าบริการของ Shopee/TikTok Shop ออกจากราคาจ่ายเต็ม และเพิ่มบันทึกรายจ่ายแยกส่วน เพื่อคำนวณกำไรสุทธิสุจริต
                      </span>
                    </label>
                  </div>
                </div>

                {/* Percentage Sliders */}
                <div className="space-y-4">
                  <h6 className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">อัตราส่วนแบ่งและค่าธรรมเนียมผู้ขาย (Platform Fees)</h6>
                  
                  <div className="p-4 border border-slate-150 rounded-xl space-y-4 bg-slate-50/50">
                    {/* Shopee Fee slider */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-slate-700 font-bold">
                        <span>ค่าธรรมเนียมและสิทธิประโยชน์ Shopee Seller Fee:</span>
                        <span className="font-mono text-orange-600 bg-orange-50 px-2 py-0.5 rounded text-xs font-extrabold">
                          {feeRateShopee}%
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="0"
                          max="20"
                          step="0.5"
                          value={feeRateShopee}
                          onChange={(e) => setFeeRateShopee(parseFloat(e.target.value))}
                          disabled={!autoRegisterFees}
                          className="w-full h-1.5 bg-slate-200 accent-orange-600 rounded-lg cursor-pointer disabled:opacity-40"
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 block leading-tight">
                        (มาตรฐาน Shopee 2026: ประกอบด้วยค่าธุรกรรมบัตร, ค่าบริการแคมเปญ และคอมมิชชันร้านค้า)
                      </span>
                    </div>

                    {/* TikTok Fee slider */}
                    <div className="space-y-1.5 border-t border-slate-100 pt-3">
                      <div className="flex justify-between items-center text-slate-700 font-bold">
                        <span>ค่าธรรมเนียม TikTok Shop Platform Fee:</span>
                        <span className="font-mono text-pink-600 bg-pink-50 px-2 py-0.5 rounded text-xs font-extrabold">
                          {feeRateTiktok}%
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="0"
                          max="20"
                          step="0.5"
                          value={feeRateTiktok}
                          onChange={(e) => setFeeRateTiktok(parseFloat(e.target.value))}
                          disabled={!autoRegisterFees}
                          className="w-full h-1.5 bg-slate-200 accent-pink-600 rounded-lg cursor-pointer disabled:opacity-40"
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 block leading-tight">
                        (ครอบคลุมคอมมิชชันคำสั่งซื้อ TikTok และค่าจัดส่งที่แพลตฟอร์มหักเงินโอนก่อนเข้าบัญชีร้านค้า)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Credentials Mockup Settings */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs space-y-4">
              <h5 className="text-xs font-bold text-slate-800 font-sans">การตั้งค่าความปลอดภัยและ API Keys</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
                <div className="p-4 border border-slate-150 rounded-xl space-y-3">
                  <h6 className="font-bold text-slate-700">บัญชีผู้ใช้ระบบ Shopee Open API v2</h6>
                  <div className="space-y-2">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold">PARTNER ID</span>
                      <span className="font-mono text-slate-600">8821094</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold">API STATUS GATEWAY</span>
                      <span className="text-emerald-600 font-bold">CONNECTED (https://api.shopee.co.th/api/v2)</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 border border-slate-150 rounded-xl space-y-3">
                  <h6 className="font-bold text-slate-700">บัญชีผู้ใช้ระบบ TikTok Shop Open API</h6>
                  <div className="space-y-2">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold">APP KEY</span>
                      <span className="font-mono text-slate-600">542123</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold">API STATUS GATEWAY</span>
                      <span className="text-emerald-600 font-bold">CONNECTED (https://open-api.tiktokglobalshop.com)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* MODAL: CONNECT NEW STORE */}
      {showConnectModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-slate-100 shadow-xl space-y-4 animate-scaleUp text-xs font-sans">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5 text-emerald-800">
                <ShoppingBag className="w-5 h-5 text-emerald-600" />
                <h4 className="text-sm font-sans font-bold">เชื่อมต่อร้านค้าออนไลน์ [{connectPlatform.toUpperCase()}]</h4>
              </div>
              <button onClick={() => setShowConnectModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConnectStoreSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] text-slate-500 font-bold mb-1">สภาพแวดล้อมระบบ (Environment)</label>
                <div className="grid grid-cols-2 gap-2 border border-slate-200 rounded-lg overflow-hidden h-9">
                  <button
                    type="button"
                    onClick={() => setConnectFormData({ ...connectFormData, environment: 'sandbox' })}
                    className={`text-center font-bold font-sans cursor-pointer ${
                      connectFormData.environment === 'sandbox' ? 'bg-amber-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Sandbox (ระบบทดสอบ)
                  </button>
                  <button
                    type="button"
                    onClick={() => setConnectFormData({ ...connectFormData, environment: 'production' })}
                    className={`text-center font-bold font-sans cursor-pointer ${
                      connectFormData.environment === 'production' ? 'bg-emerald-700 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Production (ระบบจริง)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 font-bold mb-1">ชื่อร้านค้า (Shop Display Name) *</label>
                <input
                  type="text"
                  required
                  value={connectFormData.shopName}
                  onChange={(e) => setConnectFormData({ ...connectFormData, shopName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-600"
                  placeholder="กรอกชื่อร้านค้าเพื่อแสดงผลในระบบ"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1">รหัสร้านค้า (Shop ID) *</label>
                  <input
                    type="text"
                    required
                    value={connectFormData.shopId}
                    onChange={(e) => setConnectFormData({ ...connectFormData, shopId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-600 font-mono font-bold"
                    placeholder="e.g. shopee_123456"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1">Partner ID / App Key *</label>
                  <input
                    type="text"
                    required
                    value={connectFormData.partnerId}
                    onChange={(e) => setConnectFormData({ ...connectFormData, partnerId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-600 font-mono"
                    placeholder="e.g. 542123"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 font-bold mb-1">กุญแจความปลอดภัย (Partner Key / Secret) *</label>
                <input
                  type="password"
                  required
                  value={connectFormData.partnerKey}
                  onChange={(e) => setConnectFormData({ ...connectFormData, partnerKey: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-emerald-600 font-mono"
                  placeholder="••••••••••••••••••••••••••••••••••"
                />
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-150 text-[10px] text-slate-500 flex gap-1.5 leading-relaxed">
                <Info className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  การระบุข้อมูลเหล่านี้จะถูกใช้เพื่อการสื่อสารผ่านโปรโตคอล HTTPS ไปยัง API Gateway ของทาง {connectPlatform === 'shopee' ? 'Shopee Open API' : 'TikTok Shop Developer Center'} อย่างสมบูรณ์และเข้ารหัสเสมือนจริง
                </span>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowConnectModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 text-white font-bold rounded-lg cursor-pointer ${
                    connectPlatform === 'shopee' ? 'bg-orange-600 hover:bg-orange-500' : 'bg-slate-900 hover:bg-slate-800'
                  }`}
                >
                  ยืนยันการเชื่อมต่อ API
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PRINTABLE PACKING SLIP & INVOICE */}
      {selectedOrderForInvoice && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-4xl w-full border border-slate-100 shadow-2xl flex flex-col md:flex-row overflow-hidden max-h-[90vh] text-xs font-sans">
            
            {/* LEFT SIDE: PRINTABLE DOCUMENT PREVIEW */}
            <div className="flex-1 p-8 overflow-y-auto bg-slate-50 border-r border-slate-100" id="printable-invoice-container">
              <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm max-w-2xl mx-auto space-y-6 text-slate-800" id="print-area">
                {/* Invoice Header */}
                <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-emerald-800">
                      <span className="font-extrabold text-base tracking-tight font-sans">คุณชายสมุนไพร</span>
                      <span className="bg-emerald-100 text-emerald-800 text-[9px] font-extrabold px-1.5 py-0.2 rounded">สำนักงานใหญ่</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-sans leading-relaxed max-w-[260px]">
                      เลขที่ 88/1 หมู่ 3 ต.บ้านป่า อ.เมือง จ.พิษณุโลก 65000<br />
                      โทร: 088-223-9941 | เลขประจำตัวผู้เสียภาษี: 0-6505-56201-88-1
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-700 font-mono">
                      PACKING SLIP & INVOICE
                    </span>
                    <h4 className="text-sm font-bold font-mono text-slate-800">{selectedOrderForInvoice.id}</h4>
                    <p className="text-[10px] text-slate-400 font-sans">วันที่สั่งซื้อ: {selectedOrderForInvoice.orderDate}</p>
                  </div>
                </div>

                {/* Delivery details and Platform Badge */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-150">
                  <div className="space-y-1">
                    <span className="text-[9px] text-slate-400 font-extrabold block uppercase tracking-wider">จัดส่งถึง (Shipping Address)</span>
                    <span className="font-extrabold text-slate-800 block">คุณ{selectedOrderForInvoice.customerName}</span>
                    <p className="text-[10px] text-slate-600 leading-relaxed font-sans font-medium">
                      {selectedOrderForInvoice.shippingAddress || 'ไม่ได้ระบุที่อยู่จัดส่ง'}
                    </p>
                  </div>
                  <div className="space-y-2 border-l border-slate-200 pl-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">ช่องทางขาย</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-extrabold ${
                        selectedOrderForInvoice.platform === 'shopee'
                          ? 'bg-orange-50 text-orange-700 border border-orange-100'
                          : 'bg-slate-900 text-white'
                      }`}>
                        {selectedOrderForInvoice.platform === 'shopee' ? 'Shopee Orders' : 'TikTok Shop'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 font-extrabold block uppercase tracking-wider">ผู้ขนส่ง (Carrier)</span>
                      <span className="font-extrabold text-slate-700 flex items-center gap-1 mt-0.5">
                        <Truck className="w-3.5 h-3.5 text-emerald-600" />
                        {selectedOrderForInvoice.carrierName || 'Standard Delivery'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 font-extrabold block uppercase tracking-wider">เลขพัสดุ (Tracking No.)</span>
                      <span className="font-mono font-bold text-slate-800 text-[11px] select-all bg-white px-1.5 py-0.5 border border-slate-200 rounded block mt-0.5">
                        {selectedOrderForInvoice.trackingNumber || 'TH26102391024B'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Items Ordered Table */}
                <div className="space-y-1">
                  <span className="text-[9px] text-slate-400 font-extrabold block uppercase tracking-wider">รายการสินค้า (Items)</span>
                  <table className="w-full text-left text-xs font-sans border-t border-slate-200">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 font-extrabold">
                        <th className="py-2">#</th>
                        <th className="py-2">ชื่อสินค้าออนไลน์</th>
                        <th className="py-2">รหัส SKU</th>
                        <th className="py-2 text-right">ราคาต่อหน่วย</th>
                        <th className="py-2 text-center">จำนวน</th>
                        <th className="py-2 text-right">ยอดรวม</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedOrderForInvoice.items.map((item, idx) => (
                        <tr key={idx} className="text-slate-700 font-medium">
                          <td className="py-2 text-slate-400">{idx + 1}</td>
                          <td className="py-2 font-bold text-slate-800">{item.onlineProductName}</td>
                          <td className="py-2 font-mono text-[11px] text-slate-500">{item.sku}</td>
                          <td className="py-2 text-right font-mono text-slate-600">฿{item.price.toLocaleString()}</td>
                          <td className="py-2 text-center font-mono font-bold">{item.quantity}</td>
                          <td className="py-2 text-right font-mono font-extrabold text-slate-800">฿{(item.price * item.quantity).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pricing Summary Block */}
                <div className="border-t border-slate-200 pt-4 flex justify-between items-start">
                  <div className="space-y-1 text-[10px] text-slate-400">
                    <p>* ใบกำกับภาษีนี้รวมภาษีมูลค่าเพิ่ม (VAT 7%) เรียบร้อยแล้ว</p>
                    <p>* ขอขอบคุณที่ไว้วางใจเลือกสรรผลิตภัณฑ์ยาสมุนไพรคุณภาพสูงจาก "คุณชายสมุนไพร"</p>
                  </div>
                  <div className="w-64 space-y-1.5 font-sans">
                    <div className="flex justify-between text-slate-500">
                      <span>ยอดรวมก่อนหักส่วนลด:</span>
                      <span className="font-mono font-bold">฿{selectedOrderForInvoice.totalAmount.toLocaleString()}</span>
                    </div>
                    {autoCalculateVat && (
                      <div className="flex justify-between text-slate-500">
                        <span>ฐานภาษี (Exclude VAT):</span>
                        <span className="font-mono">฿{(selectedOrderForInvoice.totalAmount / 1.07).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    {autoCalculateVat && (
                      <div className="flex justify-between text-emerald-700 font-bold">
                        <span>ภาษีมูลค่าเพิ่ม (VAT 7%):</span>
                        <span className="font-mono">฿{(selectedOrderForInvoice.totalAmount - selectedOrderForInvoice.totalAmount / 1.07).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-slate-200 pt-1.5 text-slate-900 font-extrabold text-xs">
                      <span>ยอดชำระสุทธิ (Grand Total):</span>
                      <span className="font-mono text-emerald-800 text-sm">฿{selectedOrderForInvoice.totalAmount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Signatures Block for Packing Slip */}
                <div className="grid grid-cols-2 gap-8 pt-8 border-t border-dashed border-slate-200 text-center text-[10px] text-slate-500">
                  <div className="space-y-6">
                    <p>ผู้จัดเตรียมสินค้า (Packer)</p>
                    <div className="border-b border-slate-200 w-32 mx-auto h-5"></div>
                    <p className="text-[9px]">วันที่ ......./......./.......</p>
                  </div>
                  <div className="space-y-6">
                    <p>ผู้ตรวจสอบความถูกต้อง (Auditor)</p>
                    <div className="border-b border-slate-200 w-32 mx-auto h-5"></div>
                    <p className="text-[9px]">วันที่ ......./......./.......</p>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT SIDE: SIDEBAR WITH PRINT CONTROLS */}
            <div className="w-full md:w-80 p-6 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-700 font-mono">
                    PRINT SUITE
                  </span>
                  <h4 className="text-md font-sans font-extrabold text-slate-800">จัดการการพิมพ์และคัดลอก</h4>
                  <p className="text-[11px] text-slate-500 font-sans leading-normal">
                    พิมพ์ใบสั่งซื้อพร้อมใบรายการจัดของ (Invoice & Packing List) เพื่ออำนวยความสะดวกในการจัดเรียงสมุนไพรลงกล่องพัสดุ
                  </p>
                </div>

                <div className="border-t border-slate-100 pt-3 space-y-2 font-sans text-xs">
                  <div className="bg-emerald-50/50 text-emerald-800 p-3 rounded-lg border border-emerald-100/50 space-y-1">
                    <span className="font-bold block">ข้อมูลการจัดส่งพัสดุ</span>
                    <p className="text-[11px] leading-relaxed">
                      ลูกค้าได้ทำรายการชำระเงินเรียบร้อยแล้ว สต็อกคลังของท่านได้รับการเชื่อมต่อแบบ Real-time และบันทึกบัญชีสำเร็จแล้ว
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-4">
                <button
                  onClick={() => {
                    const printContents = document.getElementById('print-area')?.innerHTML;
                    if (printContents) {
                      const printWindow = window.open('', '_blank');
                      if (printWindow) {
                        printWindow.document.write(`
                          <html>
                            <head>
                              <title>คุณชายสมุนไพร - Packing Slip #${selectedOrderForInvoice.id}</title>
                              <style>
                                body { font-family: 'Inter', 'Sarabun', sans-serif; padding: 20px; color: #333; }
                                table { width: 100%; border-collapse: collapse; margin: 15px 0; }
                                th, td { border-bottom: 1px solid #ddd; padding: 8px; text-align: left; font-size: 11px; }
                                th { background-color: #f9f9f9; font-weight: bold; }
                                .flex { display: flex; }
                                .justify-between { justify-content: space-between; }
                                .text-right { text-align: right; }
                                .font-bold { font-weight: bold; }
                                .font-mono { font-family: monospace; }
                                .bg-slate-50 { background-color: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; }
                                .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
                                .border-t { border-top: 1px solid #e2e8f0; }
                                .border-b { border-bottom: 1px solid #e2e8f0; }
                                .pt-4 { padding-top: 16px; }
                                .pb-4 { padding-bottom: 16px; }
                                .space-y-1 > * { margin-bottom: 4px; }
                                .mt-0\\.5 { margin-top: 2px; }
                                .text-xs { font-size: 11px; }
                                .text-sm { font-size: 12px; }
                                .w-32 { width: 128px; }
                                .mx-auto { margin-left: auto; margin-right: auto; }
                                .border-dashed { border-style: dashed; }
                                .pt-8 { padding-top: 32px; }
                                .h-5 { height: 20px; }
                                .text-center { text-align: center; }
                              </style>
                            </head>
                            <body onload="window.print();window.close();">
                              ${printContents}
                            </body>
                          </html>
                        `);
                        printWindow.document.close();
                      }
                    }
                  }}
                  className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl font-bold font-sans flex items-center justify-center gap-1.5 shadow-md shadow-emerald-700/10 cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> สั่งพิมพ์ใบจัดส่งพัสดุ (Print)
                </button>
                <button
                  onClick={() => setSelectedOrderForInvoice(null)}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold font-sans text-center cursor-pointer"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Custom Disconnect Store Modal */}
      {disconnectingStore && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-100 shadow-2xl p-6 text-xs font-sans space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2 bg-rose-50 rounded-full">
                <X className="w-6 h-6 stroke-[2.5px]" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-800">ยกเลิกการเชื่อมต่อร้านค้าออนไลน์</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">การยกเลิกเชื่อมต่อจะไม่สามารถทำการอัปเดตสต็อกหรือซิงค์คำสั่งซื้อใหม่ได้</p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">ชื่อร้านค้า:</span>
                <span className="font-extrabold text-slate-800">{disconnectingStore.shopName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">แพลตฟอร์ม:</span>
                <span className="font-semibold text-indigo-600 capitalize">{disconnectingStore.platform}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">รหัสร้านค้า:</span>
                <span className="font-mono text-slate-600">{disconnectingStore.shopId}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
              คุณมั่นใจหรือไม่ที่จะยกเลิกการเชื่อมต่อร้านค้า {disconnectingStore.shopName}? สินค้าออนไลน์และการเชื่อมโยงรหัส SKU จะยังคงถูกบันทึกไว้ในระบบ แต่การประสานข้อมูลสินค้าและยอดสั่งซื้อใหม่จะถูกระงับ
            </p>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setDisconnectingStore(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  setConnectedStores(prev => prev.filter(st => st.id !== disconnectingStore.id));
                  logEvent(`ยกเลิกการเชื่อมต่อร้านค้า: ${disconnectingStore.shopName} แล้ว`);
                  setDisconnectingStore(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl cursor-pointer transition-colors shadow-md shadow-rose-600/10"
              >
                ยืนยันการตัดการเชื่อมต่อ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD AD CAMPAIGN */}
      {showAddCampaignModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-slate-100 shadow-xl space-y-4 animate-scaleUp text-xs font-sans">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5 text-emerald-800">
                <Target className="w-5 h-5 text-emerald-600 animate-pulse" />
                <h4 className="text-sm font-sans font-bold">สร้างแคมเปญโฆษณาจำลองใหม่ (Add Ad Campaign)</h4>
              </div>
              <button onClick={() => setShowAddCampaignModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (!newCampaignData.name.trim()) {
                  alert('กรุณากรอกชื่อแคมเปญโฆษณา');
                  return;
                }
                const newId = `CAMP-${Date.now().toString().slice(-4)}`;
                
                // Set some realistic initial mock stats to simulate running a bit of time
                const spent = Math.round(newCampaignData.dailyBudget * 2.5);
                const clicks = Math.round(spent / 6.2); // Average ฿6.2 per click
                const impressions = clicks * 22; // Avg. 4.5% CTR
                // Simulate ROAS based on random value between 1.8 and 5.8
                const roas = 1.8 + Math.random() * 4.0;
                const revenue = Math.round(spent * roas);
                const orders = Math.round(revenue / customPrice);

                const campaign: AdCampaign = {
                  id: newId,
                  platform: newCampaignData.platform,
                  name: newCampaignData.name,
                  type: newCampaignData.type,
                  status: 'active',
                  dailyBudget: Number(newCampaignData.dailyBudget),
                  spent,
                  impressions,
                  clicks,
                  orders: orders > 0 ? orders : 1,
                  revenue: revenue > 0 ? revenue : Math.round(customPrice * 1.5)
                };

                setAdCampaigns(prev => [campaign, ...prev]);
                setShowAddCampaignModal(false);
                setSyncLogs(prev => [
                  `[ADVERTISING] เริ่มการประเมินแคมเปญใหม่ "${campaign.name}" บนแพลตฟอร์ม ${campaign.platform.toUpperCase()} เรียบร้อย (${new Date().toLocaleTimeString()})`,
                  ...prev
                ]);
                
                // Reset form
                setNewCampaignData({
                  platform: 'tiktok',
                  name: '',
                  type: 'Video Shopping Ads',
                  dailyBudget: 300,
                  spent: 0,
                  impressions: 0,
                  clicks: 0,
                  orders: 0,
                  revenue: 0
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-[11px] text-slate-500 font-bold mb-1">เลือกแพลตฟอร์มยิงแอด (Platform) *</label>
                <div className="grid grid-cols-2 gap-2 border border-slate-200 rounded-lg overflow-hidden h-9">
                  <button
                    type="button"
                    onClick={() => setNewCampaignData({ 
                      ...newCampaignData, 
                      platform: 'tiktok',
                      type: 'Video Shopping Ads' 
                    })}
                    className={`text-center font-bold font-sans cursor-pointer transition-colors ${
                      newCampaignData.platform === 'tiktok' ? 'bg-pink-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    TikTok Ads
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewCampaignData({ 
                      ...newCampaignData, 
                      platform: 'shopee',
                      type: 'Search Ads' 
                    })}
                    className={`text-center font-bold font-sans cursor-pointer transition-colors ${
                      newCampaignData.platform === 'shopee' ? 'bg-orange-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Shopee Ads
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 font-bold mb-1">ชื่อแคมเปญโฆษณา (Campaign Name) *</label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ไลฟ์สดขายแคปซูลขมิ้นชัน 60 เม็ด"
                  value={newCampaignData.name}
                  onChange={(e) => setNewCampaignData({ ...newCampaignData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 font-bold mb-1">ประเภทแคมเปญ (Campaign Type)</label>
                <select
                  value={newCampaignData.type}
                  onChange={(e) => setNewCampaignData({ ...newCampaignData, type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                >
                  {newCampaignData.platform === 'tiktok' ? (
                    <>
                      <option value="Video Shopping Ads">Video Shopping Ads (โฆษณาวิดีโอปักตะกร้า)</option>
                      <option value="LIVE Ads">LIVE Ads (โฆษณาระหว่างไลฟ์สด)</option>
                      <option value="Spark Ads">Spark Ads (โฆษณาดันวิดีโอช่องแบรนด์)</option>
                      <option value="Search Ads">Search Ads (โฆษณาผลลัพธ์คำค้นหา)</option>
                    </>
                  ) : (
                    <>
                      <option value="Search Ads">Search Ads (โฆษณาค้นหาคำค้นหลัก)</option>
                      <option value="Discovery Ads">Discovery Ads (โฆษณาแนะนำตามพฤติกรรม)</option>
                      <option value="Shop Search Ads">Shop Search Ads (โฆษณาค้นหาร้านค้า)</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 font-bold mb-1">งบรายวันแนะนำ (Daily Budget, ฿) *</label>
                <input
                  type="number"
                  required
                  min="100"
                  max="10000"
                  step="50"
                  value={newCampaignData.dailyBudget}
                  onChange={(e) => setNewCampaignData({ ...newCampaignData, dailyBudget: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono text-xs font-bold"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  * กำหนดขั้นต่ำอย่างน้อย 100 บาท เพื่อให้แคมเปญแสดงผลได้อย่างราบรื่น
                </span>
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddCampaignModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl cursor-pointer transition-colors shadow-md shadow-emerald-600/10 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> สร้างแคมเปญแอด
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
