
import React, { useState, useEffect } from 'react';
import { ChevronLeft, MessageSquare, Pencil, QrCode, X, Copy, MessageCircle } from 'lucide-react';
import { Customer, SystemConfig } from '../types';
import { formatCurrency, parseSafe, copyToClipboard } from '../utils';

interface DetailViewProps {
  customer: Customer;
  config: SystemConfig;
  onBack: () => void;
  onNavigate: (dir: 'next' | 'prev') => void;
  onUpdate: (updates: Partial<Customer>) => void;
  onShowQr: () => void;
  onEditInfo: () => void;
  onSendZalo: () => void;
  generateMsg: (c: Customer, ni: string, pi: string) => string;
}

export const DetailView: React.FC<DetailViewProps> = ({ 
  customer, config, onBack, onNavigate, onUpdate, onShowQr, onEditInfo, onSendZalo, generateMsg 
}) => {
  const [ni, setNi] = useState(customer.newIndex > 0 ? customer.newIndex.toString() : "");
  const [pi, setPi] = useState(customer.paid > 0 ? Math.round(customer.paid).toString() : "");
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    onUpdate({ newIndex: parseSafe(ni), paid: parseSafe(pi) });
  }, [ni, pi]);

  const handleThuDu = () => {
    const vol = (parseSafe(ni) > 0 && parseSafe(ni) >= customer.oldIndex) ? (parseSafe(ni) - customer.oldIndex) : 0;
    const totalAmount = (vol * config.waterRate) + customer.oldDebt;
    // Cap nhat so tien tra bang tong phai thu
    setPi(Math.round(totalAmount).toString());
    // Thong bao cap nhat ngay lap tuc
    onUpdate({ newIndex: parseSafe(ni), paid: Math.round(totalAmount) });
    // Quay lai danh sach sau mot chut de state kip cap nhat
    setTimeout(() => onBack(), 200);
  };

  return (
    <div className="fixed inset-0 bg-white z-[150] flex flex-col p-4 pt-[calc(1rem+var(--sat))] animate-in slide-in-from-right duration-200">
      <header className="flex justify-between items-center mb-5 shrink-0">
        <div className="flex items-center gap-1">
          <button onClick={onBack} className="p-2 text-slate-800 active:scale-90"><ChevronLeft size={32}/></button>
          <div className="flex bg-slate-100 rounded-2xl p-1 border-2 border-slate-200">
            <button onClick={() => onNavigate('prev')} className="p-2.5 text-slate-700 active:scale-90"><ChevronLeft size={20}/></button>
            <button onClick={() => onNavigate('next')} className="p-2.5 text-slate-700 active:scale-90"><ChevronLeft className="rotate-180" size={20}/></button>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowPreview(!showPreview)} className={`p-3.5 rounded-full border-2 transition-all ${showPreview ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-slate-50 border-slate-200 text-slate-700'}`}><MessageSquare size={22}/></button>
          <button onClick={onEditInfo} className="p-3.5 bg-slate-50 rounded-full border-2 border-slate-200 text-slate-700 active:scale-90"><Pencil size={22}/></button>
          <button onClick={onShowQr} className="p-4 bg-blue-600 text-white rounded-full shadow-2xl active:scale-90"><QrCode size={24}/></button>
        </div>
      </header>

      <div className="flex-1 space-y-5 overflow-y-auto px-1 pb-10">
        <div className="border-l-[6px] border-blue-700 pl-4 py-1">
          <span className="bg-blue-700 text-white text-[11px] font-black px-2.5 py-1 rounded-lg uppercase shadow-sm">STT: {customer.stt}</span>
          <h2 className="font-black uppercase text-[22px] text-slate-900 leading-tight mt-2">{customer.name}</h2>
          <p className="text-sm text-slate-600 font-bold mt-1">ĐC: {customer.address || '---'}</p>
        </div>

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
               <span className="text-[10px] text-slate-400 font-normal">
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
      </div>
    </div>
  );
};
