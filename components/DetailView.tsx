
import React, { useState, useEffect } from 'react';
import { ChevronLeft, MessageSquare, Pencil, QrCode, X, MessageCircle, Plus, CheckCheck, Copy } from 'lucide-react';
import { Customer, SystemConfig } from '../types';
import { formatCurrency, parseSafe, copyToClipboard, getMeterStatus, normalizePhoneForZalo, generateVietQrUrl } from '../utils';
import { AlertTriangle, Clock } from 'lucide-react';

interface DetailViewProps {
  customer: Customer;
  config: SystemConfig;
  onBack: () => void;
  onNavigate: (dir: 'next' | 'prev' | 'next10' | 'prev10') => void;
  onUpdate: (updates: Partial<Customer>) => void;
  onShowQr: () => void;
  onEditInfo: () => void;
  onAddAfter: () => void;
  onSendZalo: () => void;
  generateMsg: (c: Customer, ni: string, pi: string) => string;
}

export const DetailView: React.FC<DetailViewProps> = ({ 
  customer, config, onBack, onNavigate, onUpdate, onShowQr, onEditInfo, onAddAfter, onSendZalo, generateMsg 
}) => {
  // Khoi tao state tu du lieu khach hang
  const [ni, setNi] = useState(customer.newIndex > 0 ? customer.newIndex.toString() : "");
  const [pi, setPi] = useState(customer.paid > 0 ? Math.round(customer.paid).toString() : "");
  const [showPreview, setShowPreview] = useState(false);
  const [showQrInline, setShowQrInline] = useState(false);

  // QUAN TRONG: Reset o nhap lieu moi khi chuyen sang khach hang khac (customer.id thay doi)
  useEffect(() => {
    setNi(customer.newIndex > 0 ? customer.newIndex.toString() : "");
    setPi(customer.paid > 0 ? Math.round(customer.paid).toString() : "");
    setShowPreview(false);
    setShowQrInline(false);
  }, [customer.id]);

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

  return (
    <div className="fixed inset-0 bg-white z-[150] flex flex-col p-4 pt-[calc(1rem+var(--sat))] animate-in slide-in-from-right duration-200">
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
          <button onClick={() => setShowPreview(!showPreview)} className={`p-2.5 rounded-xl border transition-all shrink-0 ${showPreview ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-slate-50 border-slate-200 text-slate-700'}`}><MessageSquare size={20}/></button>
          <button onClick={onAddAfter} className="p-2.5 bg-blue-50 rounded-xl border border-blue-200 text-blue-700 active:scale-90 shrink-0" title="Thêm hộ sau"><Plus size={20}/></button>
          <button onClick={onEditInfo} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 active:scale-90 shrink-0"><Pencil size={20}/></button>
        </div>
      </header>

      <div className="flex-1 space-y-5 overflow-y-auto px-1 pb-10">
        <div className="border-l-[6px] border-blue-700 pl-4 py-1 relative">
          <span className="bg-blue-700 text-white text-[11px] font-black px-2.5 py-1 rounded-lg uppercase shadow-sm">Mã KH: {customer.maKH}</span>
          <div className="flex items-center gap-2 mt-2">
            <h2 className="font-black uppercase text-[22px] text-slate-900 leading-tight">{customer.name}</h2>
            <button 
              onClick={() => {
                copyToClipboard(customer.name);
                alert("Đã copy tên khách hàng!");
              }}
              className="p-1.5 bg-slate-100 rounded-lg text-slate-500 active:scale-90"
            >
              <Copy size={16}/>
            </button>
          </div>
          <p className="text-sm text-slate-600 font-bold mt-1">ĐC: {customer.address || '---'}</p>
        </div>

        {showQrInline && (
          <div className="bg-white border-2 border-slate-200 rounded-[2rem] p-4 shadow-xl animate-in zoom-in-95 duration-200 flex flex-col items-center">
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

        <div className="bg-slate-100 rounded-[2rem] p-5 border-2 border-slate-200 shadow-inner grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <p className="text-[11px] font-black text-slate-700 uppercase ml-1">Số cũ</p>
            <div className="bg-white p-4 rounded-2xl border-2 border-slate-100 font-black text-2xl text-slate-400">{customer.oldIndex}</div>
          </div>
          <div className="space-y-1.5">
            <p className="text-[11px] font-black text-blue-700 uppercase ml-1">Số mới</p>
            <input autoFocus type="number" className="w-full bg-white p-4 rounded-2xl border-2 border-blue-200 font-black text-2xl text-blue-700 shadow-sm focus:border-blue-500 outline-none" value={ni} onChange={e => setNi(e.target.value)} />
          </div>
        </div>

        <div className="bg-white border-2 border-slate-100 rounded-[2rem] p-5 shadow-md space-y-3">
          <div className="flex justify-between items-center text-[15px] font-bold text-slate-600">
            <span>Tiêu thụ:</span>
            <span className="text-slate-900 font-black flex items-center gap-1">
               {customer.volume} m³ 
               <span className="text-[11px] text-slate-700 font-bold">
                 (x {config.waterRate.toLocaleString('vi-VN')} = {formatCurrency(customer.amount)})
               </span>
            </span>
          </div>
          <div className="flex justify-between text-[15px] font-bold text-rose-500"><span>Nợ kỳ trước:</span><span className="font-black">{formatCurrency(customer.oldDebt)}</span></div>
          <div className="border-t-2 border-dashed pt-3 mt-1 flex justify-between items-center">
            <span className="text-blue-700 font-black uppercase text-sm italic tracking-tight">Còn lại phải thu:</span>
            <span className="text-3xl font-black text-blue-700 tracking-tighter">{formatCurrency(customer.balance)}</span>
          </div>
        </div>

        {showPreview && (
          <div className="animate-in slide-in-from-top-2 duration-300">
            <div className="bg-slate-800 text-emerald-400 p-4 rounded-2xl font-mono text-[12px] leading-relaxed shadow-2xl border-2 border-slate-700">
               <pre className="whitespace-pre-wrap">{generateMsg(customer, ni, pi)}</pre>
            </div>
          </div>
        )}

        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-8 bg-emerald-50 rounded-2xl p-4 border-2 border-emerald-200 relative shadow-sm">
            <p className="text-[11px] font-black text-emerald-700 uppercase ml-1 mb-1">Khách trả tiền</p>
            <input type="number" className="w-full bg-transparent text-3xl font-black text-emerald-700 outline-none" value={pi} onChange={e => setPi(e.target.value)} />
            {pi && <button onClick={() => setPi('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-300 active:scale-90 p-1"><X size={20}/></button>}
          </div>
          <div className="col-span-4 flex flex-col gap-2">
            <button onClick={handleThuDu} className="flex-1 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[11px] shadow-lg shadow-emerald-100 active:scale-95 border-b-4 border-emerald-800">Thu đủ</button>
            <button onClick={onBack} className="flex-1 bg-slate-800 text-white rounded-2xl font-black uppercase text-[11px] shadow-lg active:scale-95 border-b-4 border-slate-950">Lưu & Về</button>
          </div>
        </div>

        <button onClick={onSendZalo} className="w-full bg-blue-700 text-white py-5 rounded-[1.8rem] font-black uppercase flex items-center justify-center gap-3 shadow-2xl shadow-blue-200 active:scale-95 border-b-4 border-blue-900"><MessageCircle size={24}/> Gửi Zalo & Chốt số</button>

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
              const sdt = normalizePhoneForZalo(customer.phoneTenant || customer.phone);
              window.location.href = `https://zalo.me/${sdt}`;
            }}
            className="flex items-center justify-center gap-2 py-3 bg-white text-indigo-700 rounded-2xl font-black uppercase text-[10px] border-2 border-indigo-200 shadow-sm active:scale-95"
          >
            <Plus size={16}/> Kết bạn Zalo
          </button>
        </div>

        {/* Meter Replacement Tracking */}
        <div className={`p-5 rounded-[2rem] border-2 shadow-md flex items-center gap-4 ${
          getMeterStatus(customer.installDate).status === 'danger' ? 'bg-rose-50 border-rose-200' :
          getMeterStatus(customer.installDate).status === 'warning' ? 'bg-amber-50 border-amber-200' :
          'bg-emerald-50 border-emerald-200'
        }`}>
          <div className={`p-3 rounded-2xl ${
            getMeterStatus(customer.installDate).status === 'danger' ? 'bg-rose-100 text-rose-600' :
            getMeterStatus(customer.installDate).status === 'warning' ? 'bg-amber-100 text-amber-600' :
            'bg-emerald-100 text-emerald-600'
          }`}>
            {getMeterStatus(customer.installDate).status === 'danger' ? <AlertTriangle size={24}/> : <Clock size={24}/>}
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-black uppercase text-slate-500 mb-0.5">Thời hạn thay đồng hồ (60 tháng)</p>
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
      </div>
    </div>
  );
};
