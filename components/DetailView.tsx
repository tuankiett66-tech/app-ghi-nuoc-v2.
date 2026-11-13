
import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronDown, Calendar, Pencil, QrCode, X, MessageCircle, Plus, CheckCheck, Copy, Trash2, FileText, Users, Search, ArrowRight } from 'lucide-react';
import { Customer, SystemConfig, WaterGroup } from '../types';
import { formatCurrency, parseSafe, copyToClipboard, getMeterStatus, normalizePhoneForZalo, openZaloChat, generateVietQrUrl, normalizeString } from '../utils';
import { AlertTriangle, Clock } from 'lucide-react';

interface DetailViewProps {
  customer: Customer;
  config: SystemConfig;
  groups?: WaterGroup[];
  onBack: () => void;
  onNavigate: (dir: 'next' | 'prev' | 'next10' | 'prev10') => void;
  onUpdate: (updates: Partial<Customer>) => void;
  onUpdateConfig?: (updates: Partial<SystemConfig>) => void;
  onClearAllRecordDates?: () => void;
  onShowQr: () => void;
  onEditInfo: () => void;
  onDelete: () => void;
  onAddAfter: () => void;
  onCopyBill?: (msg: string) => void;
  onSendZalo: (msg?: string) => void;
  onShowCutoffNotice?: (customerId: string) => void;
  onQuickCreateGroup?: (customer: Customer, groupName: string) => void;
  onQuickAddToGroup?: (customer: Customer, groupId: string) => void;
  onOpenGroup?: (groupId: string) => void;
  generateMsg: (c: Customer, ni: string, pi: string) => string;
}

export const DetailView: React.FC<DetailViewProps> = ({ 
  customer, config, groups = [], onBack, onNavigate, onUpdate, onUpdateConfig, onClearAllRecordDates, onShowQr, onEditInfo, onDelete, onAddAfter, onCopyBill, onSendZalo, onShowCutoffNotice, onQuickCreateGroup, onQuickAddToGroup, onOpenGroup, generateMsg 
}) => {
  // Khoi tao state tu du lieu khach hang
  const [ni, setNi] = useState(customer.newIndex > 0 ? customer.newIndex.toString() : "");
  const [pi, setPi] = useState(customer.paid > 0 ? Math.round(customer.paid).toString() : "");
  const [showPreview, setShowPreview] = useState(false);
  const [showQrInline, setShowQrInline] = useState(false);
  const [showDatePickerInline, setShowDatePickerInline] = useState(false);
  const [isEditingInstallDate, setIsEditingInstallDate] = useState(false);
  const [tempInstallDate, setTempInstallDate] = useState(customer.installDate || "");
  const [tempRecordDate, setTempRecordDate] = useState(customer.recordDate || config.globalRecordDate || new Date().toISOString().slice(0, 10));
  const [copiedName, setCopiedName] = useState(false);
  const [copiedTax, setCopiedTax] = useState(false);
  const [copiedCompany, setCopiedCompany] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedBill, setCopiedBill] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showQuickGroupModal, setShowQuickGroupModal] = useState(false);
  const [quickGroupName, setQuickGroupName] = useState(customer.name.toUpperCase());
  const [quickGroupSearch, setQuickGroupSearch] = useState("");

  const customerGroups = useMemo(() => {
    return groups.filter(g =>
      (g.members || []).some(m => m.maKH === customer.maKH && m.source === customer.listType)
    );
  }, [groups, customer.maKH, customer.listType]);

  const filteredQuickGroups = useMemo(() => {
    const q = normalizeString(quickGroupSearch).trim();
    if (!q) return groups;
    return groups.filter(g =>
      normalizeString(g.name).includes(q) ||
      (g.members || []).some(m => normalizeString(m.maKH).includes(q))
    );
  }, [groups, quickGroupSearch]);

  // Kéo ngang để chuyển đổi khách hàng trên điện thoại (Swipe gesture)
  const [touchStartX, setTouchStartX] = useState<number>(0);
  const [touchStartY, setTouchStartY] = useState<number>(0);
  const [touchEndX, setTouchEndX] = useState<number>(0);
  const [touchEndY, setTouchEndY] = useState<number>(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' || 
      target.tagName === 'TEXTAREA' || 
      target.closest('button') || 
      target.closest('a')
    ) {
      return;
    }
    setTouchStartX(e.targetTouches[0].clientX);
    setTouchStartY(e.targetTouches[0].clientY);
    setTouchEndX(e.targetTouches[0].clientX);
    setTouchEndY(e.targetTouches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' || 
      target.tagName === 'TEXTAREA' || 
      target.closest('button') || 
      target.closest('a')
    ) {
      return;
    }
    setTouchEndX(e.targetTouches[0].clientX);
    setTouchEndY(e.targetTouches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' || 
      target.tagName === 'TEXTAREA' || 
      target.closest('button') || 
      target.closest('a')
    ) {
      return;
    }
    const diffX = touchStartX - touchEndX;
    const diffY = touchStartY - touchEndY;
    
    // Vuốt ngang tối thiểu 70px và góc vuốt ngang nổi trội so với dọc (1.8x) để không kích hoạt nhầm khi cuộn dọc
    if (Math.abs(diffX) > 70 && Math.abs(diffX) > Math.abs(diffY) * 1.8) {
      if (diffX > 0) {
        // Vuốt từ phải qua trái -> Sang khách hàng kế tiếp
        onNavigate('next');
      } else {
        // Vuốt từ trái qua phải -> Quay lại khách hàng trước
        onNavigate('prev');
      }
    }

    // Luôn reset tọa độ sau khi kết thúc thao tác chạm vuốt để tránh giữ tọa độ cũ
    setTouchStartX(0);
    setTouchEndX(0);
    setTouchStartY(0);
    setTouchEndY(0);
  };

  // QUAN TRONG: Reset o nhap lieu moi khi chuyen sang khach hang khac (customer.id thay doi)
  useEffect(() => {
    setNi(customer.newIndex > 0 ? customer.newIndex.toString() : "");
    setPi(customer.paid > 0 ? Math.round(customer.paid).toString() : "");
    setShowPreview(false);
    setShowQrInline(false);
    setShowDatePickerInline(false);
    setIsEditingInstallDate(false);
    setTempInstallDate(customer.installDate || "");
    setTempRecordDate(customer.recordDate || config.globalRecordDate || new Date().toISOString().slice(0, 10));
    setCopiedName(false);
    setCopiedBill(false);
    setShowQuickGroupModal(false);
    setQuickGroupName(customer.name.toUpperCase());
    setQuickGroupSearch("");
    setCopiedTax(false);
    setCopiedCompany(false);
    setCopiedEmail(false);
  }, [customer.id, config.globalRecordDate]);

  // Cap nhat du lieu len store khi nguoi dung nhap lieu
  useEffect(() => {
    onUpdate({ newIndex: parseSafe(ni), paid: parseSafe(pi) });
  }, [ni, pi]);

  const handleThuDu = () => {
    const vol = (parseSafe(ni) > 0 && parseSafe(ni) >= customer.oldIndex) ? (parseSafe(ni) - customer.oldIndex) : 0;
    const totalAmount = (vol * config.waterRate) + customer.oldDebt;
    setPi(Math.round(totalAmount).toString());
    onUpdate({ newIndex: parseSafe(ni), paid: Math.round(totalAmount) });
  };

  const qrUrl = generateVietQrUrl(config.bankId, config.accountNo, customer.balance, customer.name);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Phím Enter là Lưu số mới và Qua KH Tiếp Theo - Không Thu Đủ
      onUpdate({ newIndex: parseSafe(ni), paid: parseSafe(pi) });
      onNavigate('next');
    } else if (e.key === '+') {
      e.preventDefault();
      // Phím + Là Vừa Thu Đủ vừa Qua KH Tiếp Theo
      const vol = (parseSafe(ni) > 0 && parseSafe(ni) >= customer.oldIndex) ? (parseSafe(ni) - customer.oldIndex) : 0;
      const totalAmount = Math.round((vol * config.waterRate) + customer.oldDebt);
      
      setPi(totalAmount.toString());
      onUpdate({ newIndex: parseSafe(ni), paid: totalAmount });
      onNavigate('next');
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-white z-[150] flex flex-col p-4 pt-[calc(1rem+var(--sat))] animate-in slide-in-from-right duration-200"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <header className="flex justify-between items-center mb-5 shrink-0 gap-1">
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onBack} className="p-1.5 text-slate-800 active:scale-90"><ChevronLeft size={28}/></button>
          <div className="flex bg-slate-100 rounded-xl p-0.5 border border-slate-200">
            <button onClick={() => onNavigate('prev10')} className="px-1.5 py-2 text-slate-400 font-black text-[10px] active:scale-90 border-r border-slate-200">«10</button>
            <button onClick={() => onNavigate('prev')} className="px-1.5 py-2 text-slate-700 active:scale-90 border-r border-slate-200"><ChevronLeft size={18}/></button>
            <button onClick={() => onNavigate('next')} className="px-1.5 py-2 text-slate-700 active:scale-90 border-r border-slate-200"><ChevronLeft className="rotate-180" size={18}/></button>
            <button onClick={() => onNavigate('next10')} className="px-1.5 py-2 text-slate-400 font-black text-[10px] active:scale-90">10»</button>
          </div>
        </div>
        <div className="flex gap-1 items-center">
          <button onClick={() => setShowQrInline(!showQrInline)} className={`p-2.5 rounded-xl shadow-lg active:scale-90 shrink-0 transition-all ${showQrInline ? 'bg-rose-600 text-white' : 'bg-blue-600 text-white'}`}><QrCode size={20}/></button>
          <button 
            onClick={() => setShowDatePickerInline(!showDatePickerInline)} 
            className={`p-2.5 rounded-xl border transition-all shrink-0 active:scale-90 ${
              customer.recordDate || config.globalRecordDate
                ? 'bg-amber-500 text-white border-amber-500 shadow-md' 
                : showDatePickerInline 
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                  : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
            title="Sửa ngày ghi nước"
          >
            <Calendar size={20}/>
          </button>
          <button onClick={onEditInfo} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 active:scale-90 shrink-0" title="Chỉnh sửa"><Pencil size={20}/></button>
          <button onClick={onDelete} className="p-2.5 bg-rose-50 rounded-xl border border-rose-200 text-rose-600 active:scale-90 shrink-0" title="Xóa khách hàng"><Trash2 size={20}/></button>
        </div>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-1 pb-8">
        <div className="border-l-[6px] border-blue-700 pl-4 py-1 relative">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="bg-amber-400 text-slate-950 text-[16px] font-black px-3.5 py-1 rounded-lg uppercase shadow-md border border-amber-500">Mã KH: {customer.maKH}</span>
            {customer.isSubMeter && (
              <span className="bg-purple-600 text-white text-[11px] font-black px-2.5 py-1 rounded-lg uppercase shadow-sm animate-pulse">Đồng hồ phụ</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <h2 className="font-black uppercase text-[22px] text-slate-900 leading-tight">{customer.name}</h2>
            <button 
              onClick={async () => {
                await copyToClipboard(customer.name);
                setCopiedName(true);
                setTimeout(() => setCopiedName(false), 2000);
              }}
              className={`p-1.5 rounded-lg active:scale-90 transition-all ${copiedName ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
              title="Copy tên"
            >
              {copiedName ? <CheckCheck size={16}/> : <Copy size={16}/>}
            </button>
          </div>
          <p className="text-sm text-slate-600 font-bold mt-1">ĐC: {customer.address || '---'}</p>
          <div className="flex items-center gap-1.5 mt-2 text-xs font-bold text-slate-500 flex-wrap">
            <Clock size={13} className={customer.recordDate || config.globalRecordDate ? "text-amber-500" : "text-emerald-500"} />
            <span>Ngày ghi nước:</span>
            {customer.recordDate || config.globalRecordDate ? (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md text-[11px] font-black flex items-center gap-1 shadow-sm">
                  {(() => {
                    const dStr = customer.recordDate || config.globalRecordDate || "";
                    const parts = dStr.split('-');
                    return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dStr;
                  })()} (Cố định)
                </span>
                <button 
                  onClick={() => {
                    if (onClearAllRecordDates) {
                      onClearAllRecordDates();
                    } else {
                      onUpdate({ recordDate: "" });
                      if (onUpdateConfig) {
                        onUpdateConfig({ globalRecordDate: "" });
                      }
                    }
                  }}
                  className="bg-rose-100 hover:bg-rose-200 text-rose-800 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm border border-rose-200"
                  title="Xoá tất cả ngày cố định, chuyển sang tự động"
                >
                  Xoá ghim ngày (Auto)
                </button>
              </div>
            ) : (
              <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md text-[11px] font-black flex items-center gap-1 shadow-sm">
                Hôm nay (Tự động)
              </span>
            )}
          </div>
        </div>

        {showQrInline && (
          <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 shadow-xl animate-in zoom-in-95 duration-200 flex flex-col items-center">
            <div className="w-full flex justify-between items-center mb-2 px-2">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Mã QR Thanh toán</span>
              <button onClick={() => setShowQrInline(false)} className="text-slate-400"><X size={18}/></button>
            </div>
            <img 
              src={qrUrl} 
              alt="QR Thanh Toan" 
              className="w-full max-w-[240px] aspect-square rounded-xl shadow-inner border-4 border-slate-50"
              referrerPolicy="no-referrer"
            />
            <p className="mt-3 text-[11px] font-black text-blue-700 uppercase tracking-tighter">Quét để thanh toán {formatCurrency(customer.balance)}</p>
          </div>
        )}

        {showDatePickerInline && (
          <div className="bg-slate-100 border border-slate-200 rounded-2xl p-4 shadow-inner animate-in zoom-in-95 duration-200 space-y-3">
            <div className="flex justify-between items-center px-1">
              <span className="text-[12px] font-black uppercase text-slate-700">Chỉnh sửa Ngày Ghi Chỉ Số</span>
              <button onClick={() => setShowDatePickerInline(false)} className="text-slate-400 active:scale-90"><X size={18}/></button>
            </div>
            <div className="flex flex-col gap-2.5">
              <input 
                type="date" 
                className="w-full bg-white p-3 rounded-xl border border-slate-200 font-black text-slate-800 text-base focus:outline-none focus:border-blue-500 outline-none shadow-sm" 
                value={tempRecordDate} 
                onChange={e => setTempRecordDate(e.target.value)} 
              />
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    onUpdate({ recordDate: tempRecordDate });
                    if (onUpdateConfig) {
                      onUpdateConfig({ globalRecordDate: tempRecordDate });
                    }
                    setShowDatePickerInline(false);
                  }}
                  className="flex-1 bg-blue-700 text-white font-black uppercase text-[11px] py-2.5 rounded-xl shadow-md border-b-2 border-blue-900 active:scale-95"
                >
                  Xác nhận ngày
                </button>
                {(customer.recordDate || config.globalRecordDate) && (
                  <button 
                    onClick={() => {
                      if (onClearAllRecordDates) {
                        onClearAllRecordDates();
                      } else {
                        onUpdate({ recordDate: "" });
                        if (onUpdateConfig) {
                          onUpdateConfig({ globalRecordDate: "" });
                        }
                      }
                      setTempRecordDate(new Date().toISOString().slice(0, 10));
                      setShowDatePickerInline(false);
                    }}
                    className="px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl border border-rose-200 transition-all active:scale-95 text-[11px] font-black uppercase"
                  >
                    Dùng Ngày Tự Động
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* THẺ 1 - SỐ CŨ & SỐ MỚI (TĂNG KÍCH THƯỚC) */}
        <div className="bg-slate-100 rounded-2xl p-4 border border-slate-200 shadow-inner">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <p className="text-[12px] font-black text-slate-700 uppercase ml-1">Số cũ</p>
              <div className="bg-white py-3 px-4 rounded-xl border border-slate-100 font-black text-2xl text-slate-400">{customer.oldIndex}</div>
            </div>
            <div className="space-y-1.5">
              <p className="text-[12px] font-black text-blue-700 uppercase ml-1">Số mới</p>
              <input 
                autoFocus 
                type="number" 
                className="w-full bg-white py-3 px-4 rounded-xl border border-blue-200 font-black text-2xl text-blue-700 shadow-sm focus:border-blue-500 outline-none" 
                value={ni} 
                onChange={e => setNi(e.target.value)} 
                onKeyDown={handleKeyDown} 
                autoComplete="one-time-code"
                autoCorrect="off"
                spellCheck="false"
                readOnly={focusedField !== 'ni'}
                onFocus={() => setFocusedField('ni')}
                onTouchStart={() => setFocusedField('ni')}
                onMouseDown={() => setFocusedField('ni')}
                onBlur={() => setFocusedField(null)}
              />
            </div>
          </div>
        </div>

        {/* THẺ 2 - CHI TIẾT THANH TOÁN (TĂNG KÍCH THƯỚC) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2.5">
          <div className="flex justify-between items-center text-[15px] font-bold text-slate-600">
            <span>Tiêu thụ:</span>
            <span className="text-slate-900 font-black flex items-center gap-1">
               <span className="text-[19px]">{customer.volume} m³</span>
               <span className="text-[14px] text-slate-900 font-black">
                 (x {config.waterRate.toLocaleString('vi-VN')} = {formatCurrency(customer.amount)})
               </span>
            </span>
          </div>
          <div className="flex justify-between text-[15px] font-bold text-rose-500"><span>Nợ kỳ trước:</span><span className="font-black">{formatCurrency(customer.oldDebt)}</span></div>
          <div className="border-t border-dashed pt-2.5 mt-1 flex justify-between items-center">
            <span className="text-blue-700 font-black uppercase text-[12px] italic tracking-tight">Còn lại phải thu:</span>
            <span className="text-[28px] font-black text-blue-700 tracking-tighter">{formatCurrency(customer.balance)}</span>
          </div>
        </div>

        {/* THẺ 3 - KHÁCH TRẢ TIỀN & THU ĐỦ, LƯU & VỀ (TĂNG KÍCH THƯỚC) */}
        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-8 bg-emerald-50 rounded-2xl p-3.5 px-4 border border-emerald-200 relative shadow-sm flex flex-col justify-center">
            <p className="text-[12px] font-black text-emerald-700 uppercase ml-0.5 mb-0.5">Khách trả tiền</p>
            <input 
              type="number" 
              className="w-full bg-transparent text-3xl font-black text-emerald-700 outline-none" 
              value={pi} 
              onChange={e => setPi(e.target.value)} 
              onKeyDown={handleKeyDown} 
              autoComplete="one-time-code"
              autoCorrect="off"
              spellCheck="false"
              readOnly={focusedField !== 'pi'}
              onFocus={() => setFocusedField('pi')}
              onTouchStart={() => setFocusedField('pi')}
              onMouseDown={() => setFocusedField('pi')}
              onBlur={() => setFocusedField(null)}
            />
            {pi && <button onClick={() => setPi('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-300 active:scale-90 p-1"><X size={20}/></button>}
          </div>
          <div className="col-span-4 flex flex-col gap-2">
            <button onClick={handleThuDu} className="flex-1 bg-teal-600 text-white rounded-xl font-black uppercase text-[11px] py-2 shadow-sm active:scale-95 border-b-2 border-teal-800 hover:bg-teal-700">Thu đủ</button>
            <button onClick={onBack} className="flex-1 bg-slate-800 text-white rounded-xl font-black uppercase text-[11px] py-2 shadow-sm active:scale-95 border-b-2 border-slate-950">Lưu & Về</button>
          </div>
        </div>

        {/* HÀNG NÚT CHÍNH: COPY BILL (TRÁI) & MỞ ZALO (PHẢI) */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={async () => {
              const msg = generateMsg(customer, ni, pi);
              if (onCopyBill) {
                onCopyBill(msg);
              } else {
                await copyToClipboard(msg);
                onUpdate({ isProcessed: true });
              }
              setCopiedBill(true);
              setTimeout(() => setCopiedBill(false), 2000);
            }}
            className={`py-3.5 px-2.5 rounded-xl font-black uppercase flex items-center justify-center gap-1.5 shadow-lg active:scale-95 border-b-4 text-xs sm:text-sm transition-all ${
              copiedBill
                ? 'bg-emerald-600 text-white border-emerald-900 shadow-emerald-100'
                : 'bg-teal-600 hover:bg-teal-700 text-white border-teal-900 shadow-teal-100'
            }`}
          >
            {copiedBill ? <CheckCheck size={18} className="shrink-0" /> : <Copy size={18} className="shrink-0" />}
            <span className="truncate">{copiedBill ? 'Đã Copy Bill!' : 'Copy Bill'}</span>
          </button>

          <button
            type="button"
            onClick={() => onSendZalo(generateMsg(customer, ni, pi))}
            className="bg-blue-700 hover:bg-blue-800 text-white py-3.5 px-2.5 rounded-xl font-black uppercase flex items-center justify-center gap-1.5 shadow-lg shadow-blue-100 active:scale-95 border-b-4 border-blue-900 text-xs sm:text-sm transition-all"
          >
            <MessageCircle size={18} className="shrink-0" />
            <span className="truncate">Gửi Zalo</span>
          </button>
        </div>

        {/* THANH 2 Ô: TẠO NHÓM (TRÁI) & TẠM DỪNG CẤP NƯỚC (PHẢI) */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => {
              setQuickGroupName(customer.name.toUpperCase());
              setQuickGroupSearch("");
              setShowQuickGroupModal(true);
            }}
            className={`py-3 px-2.5 rounded-xl font-black uppercase flex items-center justify-center gap-1.5 border-2 active:scale-95 text-[11px] sm:text-xs shadow-xs transition-all ${
              customerGroups.length > 0
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-700'
                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
            }`}
          >
            <Users size={16} className="shrink-0" />
            <span className="truncate">
              {customerGroups.length > 0 ? `Nhóm (${customerGroups.length})` : 'Tạo Nhóm'}
            </span>
          </button>

          {onShowCutoffNotice && (
            <button 
              type="button"
              onClick={() => onShowCutoffNotice(customer.id)} 
              className={`py-3 px-2.5 rounded-xl font-black uppercase flex items-center justify-center gap-1.5 border-2 active:scale-95 text-[11px] sm:text-xs shadow-xs transition-all ${
                (customer.balance > 0 || customer.oldDebt > 0)
                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-500 border-slate-200'
              }`}
            >
              <FileText size={16} className="shrink-0"/>
              <span className="truncate">Tạm Dừng</span>
            </button>
          )}
        </div>

        {/* MODAL TẠO NHÓM / THÊM VÀO NHÓM NHANH 1 CHẠM */}
        {showQuickGroupModal && (
          <div className="fixed inset-0 bg-slate-900/60 z-[260] flex items-center justify-center p-4 backdrop-blur-xs" onClick={() => setShowQuickGroupModal(false)}>
            <div className="bg-white w-full max-w-md rounded-3xl p-5 shadow-2xl space-y-4 max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl shrink-0">
                    <Users size={18} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-black text-sm uppercase text-indigo-800 truncate">Tạo Danh Bộ Nhóm</h3>
                    <p className="text-[11px] font-bold text-slate-500 truncate">
                      Mã KH {customer.maKH} • {customer.name}
                    </p>
                  </div>
                </div>
                <button onClick={() => setShowQuickGroupModal(false)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 shrink-0">
                  <X size={18} />
                </button>
              </div>

              {/* Nếu hộ đã thuộc nhóm nào đó -> Hiện nút mở nhanh */}
              {customerGroups.length > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 space-y-2 shrink-0">
                  <p className="text-[10px] font-black uppercase text-emerald-700">Đang thuộc nhóm:</p>
                  <div className="flex flex-col gap-1.5">
                    {customerGroups.map(g => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => {
                          setShowQuickGroupModal(false);
                          onOpenGroup?.(g.id);
                        }}
                        className="w-full flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-emerald-200 text-left hover:bg-emerald-100/50 active:scale-[0.99] transition-all"
                      >
                        <span className="font-black text-xs text-emerald-900 uppercase truncate">{g.name}</span>
                        <span className="text-[10px] font-black text-emerald-700 uppercase flex items-center gap-1 shrink-0">
                          Mở <ArrowRight size={12} />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tạo nhóm mới từ hộ này */}
              <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-3.5 space-y-2.5 shrink-0">
                <p className="text-[10px] font-black uppercase text-indigo-700 tracking-wider">Tạo nhóm mới từ hộ này</p>
                <div className="relative">
                  <input
                    type="text"
                    value={quickGroupName}
                    onChange={e => setQuickGroupName(e.target.value)}
                    placeholder="Nhập tên nhóm..."
                    className="w-full bg-white px-3 py-2.5 pr-9 rounded-xl border-2 border-indigo-200 focus:border-indigo-500 outline-none font-black text-sm text-indigo-900"
                    onKeyDown={e => {
                      if (e.key === 'Enter' && quickGroupName.trim() && onQuickCreateGroup) {
                        onQuickCreateGroup(customer, quickGroupName.trim().toUpperCase());
                        setShowQuickGroupModal(false);
                      }
                    }}
                  />
                  {quickGroupName && (
                    <button
                      type="button"
                      onClick={() => setQuickGroupName("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 p-1"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  disabled={!quickGroupName.trim()}
                  onClick={() => {
                    if (quickGroupName.trim() && onQuickCreateGroup) {
                      onQuickCreateGroup(customer, quickGroupName.trim().toUpperCase());
                      setShowQuickGroupModal(false);
                    }
                  }}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-3 rounded-xl font-black uppercase text-xs flex items-center justify-center gap-1.5 shadow-md border-b-2 border-indigo-900 active:scale-95 transition-all"
                >
                  <Plus size={16} />
                  <span>Tạo nhóm mới & Thêm mã {customer.maKH}</span>
                </button>
              </div>

              {/* Thêm nhanh vào nhóm đã có */}
              {groups.length > 0 && (
                <div className="flex-1 min-h-0 flex flex-col space-y-2">
                  <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider shrink-0">
                    Hoặc thêm vào nhóm đã có ({groups.length})
                  </p>
                  <div className="relative shrink-0">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={quickGroupSearch}
                      onChange={e => setQuickGroupSearch(e.target.value)}
                      placeholder="Tìm tên nhóm hoặc Mã KH..."
                      className="w-full bg-slate-50 pl-8 pr-8 py-2 rounded-xl border border-slate-200 focus:border-indigo-400 outline-none text-xs font-bold text-slate-700"
                    />
                    {quickGroupSearch && (
                      <button
                        type="button"
                        onClick={() => setQuickGroupSearch("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                  <div className="overflow-y-auto space-y-1.5 pr-1 flex-1 min-h-[120px]">
                    {filteredQuickGroups.map(g => {
                      const isMember = (g.members || []).some(
                        m => m.maKH === customer.maKH && m.source === customer.listType
                      );
                      return (
                        <div
                          key={g.id}
                          className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                            isMember
                              ? 'bg-emerald-50 border-emerald-200'
                              : 'bg-slate-50 border-slate-200 hover:border-indigo-300'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <p className="font-black text-xs text-slate-800 uppercase truncate">{g.name}</p>
                            <p className="text-[10px] font-bold text-slate-400">
                              {(g.members || []).length} hộ thành viên
                            </p>
                          </div>
                          {isMember ? (
                            <button
                              type="button"
                              onClick={() => {
                                setShowQuickGroupModal(false);
                                onOpenGroup?.(g.id);
                              }}
                              className="px-2.5 py-1.5 bg-emerald-600 text-white rounded-lg text-[10px] font-black uppercase shrink-0 active:scale-95"
                            >
                              Đã có • Mở
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onQuickAddToGroup?.(customer, g.id)}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black uppercase shrink-0 active:scale-95"
                            >
                              + Thêm
                            </button>
                          )}
                        </div>
                      );
                    })}
                    {filteredQuickGroups.length === 0 && (
                      <p className="text-center text-xs text-slate-400 font-bold py-4">Không tìm thấy nhóm phù hợp</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* THANH XEM TRƯỚC TIN NHẮN (COLLAPSIBLE) - NẰM YÊN TRONG HỘP CHO ĐẾN KHI BẤM XEM */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <button 
            type="button"
            onClick={() => setShowPreview(!showPreview)} 
            className="w-full bg-slate-50 hover:bg-slate-100 px-4 py-3 flex justify-between items-center text-xs font-black uppercase text-slate-700 transition-colors focus:outline-none"
          >
            <span className="flex items-center gap-1.5">💬 Xem trước tin nhắn ({showPreview ? 'Đang hiện' : 'Đang ẩn'})</span>
            <ChevronDown size={16} className={`transition-transform duration-200 ${showPreview ? 'rotate-180' : ''}`} />
          </button>
          
          {showPreview && (
            <div className="bg-slate-800 text-emerald-400 p-4 font-mono text-[12px] leading-relaxed border-t border-slate-700 max-h-[220px] overflow-y-auto animate-in slide-in-from-top-2 duration-200">
              <pre className="whitespace-pre-wrap">{generateMsg(customer, ni, pi)}</pre>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => {
              const newFriendStatus = !customer.isZaloFriend;
              onUpdate({ 
                isZaloFriend: newFriendStatus,
                isZalo: newFriendStatus ? true : customer.isZalo 
              });
            }}
            className={`flex items-center justify-center gap-2 py-3 rounded-2xl font-black uppercase text-[10px] border-2 transition-all active:scale-95 ${
              customer.isZaloFriend 
                ? 'bg-blue-600 text-white border-blue-600 shadow-lg' 
                : 'bg-white text-blue-700 border-blue-200 shadow-sm'
            }`}
          >
            <CheckCheck size={16}/> {customer.isZaloFriend ? 'Đã kết bạn' : 'Chưa kết bạn'}
          </button>
          <button 
            onClick={() => {
              const ok = openZaloChat(customer.phoneTenant || customer.phone);
              if (!ok) {
                alert("Khách hàng này chưa có số điện thoại hợp lệ!");
              }
            }}
            className="flex items-center justify-center gap-2 py-3 bg-white text-indigo-700 rounded-2xl font-black uppercase text-[10px] border-2 border-indigo-200 shadow-sm active:scale-95"
          >
            <Plus size={16}/> Kết bạn Zalo
          </button>
        </div>

        {/* THÔNG TIN HÓA ĐƠN VAT */}
        {(customer.isVatRegistered || customer.vatTaxCode || customer.vatEmail) && (
          <div className="bg-emerald-50/40 border-2 border-emerald-100 rounded-[2rem] p-5 shadow-sm space-y-3.5 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-emerald-500 text-white font-black uppercase text-[8px] px-3 py-1 rounded-bl-xl tracking-widest shadow-sm">
              Đăng ký VAT
            </div>
            
            <p className="text-[11px] font-black uppercase text-emerald-800 tracking-wider">Thông tin hóa đơn điện tử</p>
            
            <div className="space-y-3 pt-1">
              {customer.vatTaxCode && (
                <div className="flex items-center justify-between gap-2 bg-white/70 p-2.5 px-3.5 rounded-2xl border border-emerald-100">
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-tight">Mã số thuế</p>
                    <p className="text-[15px] font-black text-emerald-800 font-mono tracking-tight select-all">{customer.vatTaxCode}</p>
                  </div>
                  <button 
                    onClick={async () => {
                      await copyToClipboard(customer.vatTaxCode || "");
                      setCopiedTax(true);
                      setTimeout(() => setCopiedTax(false), 2000);
                    }}
                    className={`p-2 rounded-xl active:scale-90 transition-all ${copiedTax ? 'bg-emerald-500 text-white' : 'bg-emerald-50 text-emerald-700'}`}
                  >
                    {copiedTax ? <CheckCheck size={16}/> : <Copy size={16}/>}
                  </button>
                </div>
              )}

              {customer.vatCompanyName && (
                <div className="flex items-center justify-between gap-2 bg-white/70 p-2.5 px-3.5 rounded-2xl border border-emerald-100">
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-tight">Tên công ty / Hộ kinh doanh</p>
                    <p className="text-[13px] font-black text-slate-800 leading-tight select-all break-words">{customer.vatCompanyName}</p>
                  </div>
                  <button 
                    onClick={async () => {
                      await copyToClipboard(customer.vatCompanyName || "");
                      setCopiedCompany(true);
                      setTimeout(() => setCopiedCompany(false), 2000);
                    }}
                    className={`p-2 rounded-xl active:scale-90 transition-all ${copiedCompany ? 'bg-emerald-500 text-white' : 'bg-emerald-50 text-emerald-700'}`}
                  >
                    {copiedCompany ? <CheckCheck size={16}/> : <Copy size={16}/>}
                  </button>
                </div>
              )}

              {customer.vatEmail && (
                <div className="flex items-center justify-between gap-2 bg-white/70 p-2.5 px-3.5 rounded-2xl border border-emerald-100">
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-tight">Email nhận hóa đơn</p>
                    <p className="text-[13px] font-bold text-slate-700 truncate select-all">{customer.vatEmail}</p>
                  </div>
                  <button 
                    onClick={async () => {
                      await copyToClipboard(customer.vatEmail || "");
                      setCopiedEmail(true);
                      setTimeout(() => setCopiedEmail(false), 2000);
                    }}
                    className={`p-2 rounded-xl active:scale-90 transition-all ${copiedEmail ? 'bg-emerald-500 text-white' : 'bg-emerald-50 text-emerald-700'}`}
                  >
                    {copiedEmail ? <CheckCheck size={16}/> : <Copy size={16}/>}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Meter Replacement Tracking */}
        {!isEditingInstallDate ? (
          <div 
            onClick={() => {
              setIsEditingInstallDate(true);
              setTempInstallDate(customer.installDate || "");
            }}
            className={`p-5 rounded-[2rem] border-2 shadow-md flex items-center gap-4 cursor-pointer hover:opacity-95 active:scale-98 transition-all ${
              getMeterStatus(customer.installDate).status === 'danger' ? 'bg-rose-50 border-rose-200' :
              getMeterStatus(customer.installDate).status === 'warning' ? 'bg-amber-50 border-amber-200' :
              'bg-emerald-50 border-emerald-200'
            }`}
          >
            <div className={`p-3 rounded-2xl ${
              getMeterStatus(customer.installDate).status === 'danger' ? 'bg-rose-100 text-rose-600' :
              getMeterStatus(customer.installDate).status === 'warning' ? 'bg-amber-100 text-amber-600' :
              'bg-emerald-100 text-emerald-600'
            }`}>
              {getMeterStatus(customer.installDate).status === 'danger' ? <AlertTriangle size={24}/> : <Clock size={24}/>}
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black uppercase text-slate-500 mb-0.5 flex justify-between items-center">
                <span>Thời hạn thay đồng hồ (60 tháng)</span>
                <span className="text-[9px] font-bold text-blue-600 capitalize underline">Chỉnh sửa</span>
              </p>
              <div className="flex items-baseline gap-2">
                <span className={`text-xl font-black ${
                  getMeterStatus(customer.installDate).status === 'danger' ? 'text-rose-700' :
                  getMeterStatus(customer.installDate).status === 'warning' ? 'text-amber-700' :
                  'text-emerald-700'
                }`}>
                  {getMeterStatus(customer.installDate).status === 'unknown' ? 'Chưa nhập ngày lắp' : 
                   getMeterStatus(customer.installDate).monthsLeft <= 0 ? 'Đã quá hạn' : 
                   `Còn ${getMeterStatus(customer.installDate).monthsLeft} tháng`}
                </span>
                {customer.installDate && (
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    (Lắp: {customer.installDate})
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-5 rounded-[2rem] border-2 shadow-md bg-sky-50 border-sky-200 animate-in fade-in duration-200">
            <div className="flex justify-between items-center mb-3">
              <p className="text-[10px] font-black uppercase text-sky-800">Cài đặt ngày lắp đồng hồ</p>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditingInstallDate(false);
                }}
                className="p-1 hover:bg-sky-100 rounded-full text-sky-700"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="flex flex-col gap-3">
              <input 
                type="month" 
                className="w-full bg-white p-3 rounded-2xl border-2 border-sky-100 font-black text-slate-800 text-sm focus:outline-none focus:border-sky-500" 
                value={tempInstallDate} 
                onChange={e => setTempInstallDate(e.target.value)} 
                autoComplete="one-time-code"
                autoCorrect="off"
                spellCheck="false"
              />
              
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    onUpdate({ installDate: tempInstallDate });
                    setIsEditingInstallDate(false);
                  }}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-[10px] py-2.5 rounded-xl border-b-2 border-emerald-800 transition-all active:scale-95"
                >
                  Xác nhận
                </button>
                {customer.installDate && (
                  <button 
                    onClick={() => {
                      if (confirm("Bạn có chắc chắn muốn xóa ngày lắp đặt của khách hàng này không?")) {
                        onUpdate({ installDate: "" });
                        setIsEditingInstallDate(false);
                      }
                    }}
                    className="px-3 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-xl transition-all active:scale-95 flex items-center justify-center"
                    title="Xóa ngày lắp"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                <button 
                  onClick={() => setIsEditingInstallDate(false)}
                  className="px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-black uppercase text-[10px] py-2.5 rounded-xl transition-all active:scale-95"
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Phím tắt được chuyển xuống dưới cùng của tab để không chiếm diện tích vùng trên */}
        <p className="text-[10px] font-bold text-slate-400 text-center mt-2 pb-1 flex items-center justify-center gap-1">
          ⌨️ Phím tắt PC: Bấm <span className="font-black text-slate-600 bg-slate-100 px-1 py-0.5 rounded border border-slate-200">Enter</span> để chuyển nhanh khách hàng
        </p>
      </div>
    </div>
  );
};
