
export interface Customer {
  id: string;
  maKH: string;
  name: string;
  address: string;
  phoneLandlord: string; // SĐT Chủ nhà
  phoneTenant: string;   // SĐT Khách thuê (Dùng để liên lạc chính)
  phone: string;         // Alias cho phoneTenant để tương thích ngược
  newIndex: number;
  oldIndex: number;
  volume: number;
  amount: number;
  oldDebt: number;
  paid: number;
  balance: number;
  listType: 'list1' | 'list2';
  status: 'paid' | 'unpaid';
  isZalo?: boolean;       // Co tai khoan Zalo (tu Excel)
  isZaloFriend?: boolean; // Da ket ban Zalo (nguoi dung tu danh dau)
  isProcessed?: boolean;  // Da gui bill/copy bill trong ky nay
  note?: string;
  installDate?: string; // Ngay lap dat (YYYY-MM)
  updatedAt?: number; // Thoi diem cap nhat gan nhat (timestamp)
}

export interface GroupMember {
  maKH: string;
  source: 'list1' | 'list2';
}

export interface WaterGroup {
  id: string;
  name: string;
  masterSdt: string;
  members: GroupMember[]; // Danh sach thanh vien kem nguon du lieu
  oldIndex?: number;      // Chỉ số tổng nhóm (Cũ)
  newIndex?: number;      // Chỉ số tổng nhóm (Mới)
  updatedAt?: number;     // Ngày ghi chỉ số nhóm
}

export interface SystemConfig {
  waterRate: number;
  bankId: string;
  accountNo: string;
  accountName: string;
  // Group Bank Account
  groupBankId?: string;
  groupAccountNo?: string;
  groupAccountName?: string;
  sheetUrl: string;
  globalMessage: string;
  lastSyncTime?: number;
  // Opening readings for Loss Tracking
  master1Initial?: number;
  master2Initial?: number;
  masterInitialDate?: string;
}

export interface LossRecord {
  id: string;
  period: string; // e.g., "11"
  month: string;  // e.g., "Nov-25"
  master1New: number;
  master1Old: number;
  master2New: number;
  master2Old: number;
  list1Volume: number;
  list2Volume: number;
  createdAt: number;
}

export interface DailySupplyReading {
  id: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  master1: number;
  master2: number;
  consumption1?: number; // Calculated: reading today - reading yesterday (or initial)
  consumption2?: number; // Calculated: reading today - reading yesterday (or initial)
  notes?: string;
  updatedAt: number;
}

export type ViewState = 'list' | 'edit' | 'detail' | 'quick_record' | 'config' | 'stats' | 'edit_customer' | 'add_customer' | 'edit_message_template' | 'group_list' | 'group_detail' | 'verify' | 'loss_management' | 'loss_daily_record' | 'loss_daily_history';
