
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
}

export interface SystemConfig {
  waterRate: number;
  bankId: string;
  accountNo: string;
  accountName: string;
  sheetUrl: string;
  globalMessage: string;
  lastSyncTime?: number;
}

export type ViewState = 'list' | 'edit' | 'detail' | 'quick_record' | 'config' | 'stats' | 'edit_customer' | 'add_customer' | 'edit_message_template' | 'group_list' | 'group_detail' | 'verify';
