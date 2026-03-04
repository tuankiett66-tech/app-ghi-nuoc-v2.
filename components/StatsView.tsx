
import React, { useMemo } from 'react';
import { ChevronLeft, RefreshCcw, Download } from 'lucide-react';
import { Customer } from '../types';
import { formatCurrency, getMeterStatus } from '../utils';
import { AlertTriangle, Clock } from 'lucide-react';

interface StatsViewProps {
  customers: Customer[];
  activeTab: string;
  onBack: () => void;
  onClosePeriod: () => void;
  onExport: () => void;
}

export const StatsView: React.FC<StatsViewProps> = ({ customers, activeTab, onBack, onClosePeriod, onExport }) => {
  const stats = useMemo(() => {
    const list = customers.filter(c => c.listType === activeTab);
    return {
      total: list.length,
      done: list.filter(c => c.newIndex > 0).length,
      revenue: list.reduce((sum, c) => sum + (c.amount || 0), 0),
      debt: list.reduce((sum, c) => sum + (c.oldDebt || 0), 0),
      paid: list.reduce((sum, c) => sum + (c.paid || 0), 0),
      balance: list.reduce((sum, c) => sum + (c.balance || 0), 0),
      expiredMeters: list.filter(c => getMeterStatus(c.installDate).status === 'danger').length,
      warningMeters: list.filter(c => getMeterStatus(c.installDate).status === 'warning').length
    };
  }, [customers, activeTab]);

  return (
    <div className="h-full bg-slate-50 flex flex-col p-3 pt-[calc(0.5rem+var(--sat))] animate-in slide-in-from-bottom duration-200 overflow-y-auto pb-32">
      <header className="flex items-center gap-2 mb-3 bg-white p-2.5 rounded-xl border shadow-sm sticky top-0 z-50">
        <button onClick={onBack} className="p-2 bg-slate-100 rounded-full text-slate-800 active:scale-90"><ChevronLeft size={22}/></button>
        <h1 className="text-base font-black uppercase italic text-slate-900 tracking-tight">Báo cáo tài chính</h1>
      </header>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-blue-700 p-3 rounded-2xl text-center shadow-md border-b-4 border-blue-900">
          <p className="text-[8px] uppercase font-black text-blue-100 mb-0.5 tracking-widest">Khách hàng</p>
          <p className="text-2xl font-black text-white">{stats.total}</p>
        </div>
        <div className="bg-emerald-600 p-3 rounded-2xl text-center shadow-md border-b-4 border-emerald-800">
          <p className="text-[8px] uppercase font-black text-emerald-100 mb-0.5 tracking-widest">Đã ghi số</p>
          <p className="text-2xl font-black text-white">{stats.done}</p>
        </div>
      </div>

      <div className="bg-white border-2 border-slate-200 p-4 space-y-2.5 rounded-[2rem] shadow-sm mb-3">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Tiền nước kỳ này:</span>
          <span className="font-black text-slate-900 text-sm">{formatCurrency(stats.revenue)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Nợ cũ tồn đọng:</span>
          <span className="font-black text-rose-600 text-sm">{formatCurrency(stats.debt)}</span>
        </div>
        <div className="h-px bg-slate-100 my-0.5"></div>
        <div className="flex justify-between items-center text-emerald-700">
          <span className="text-[11px] font-black uppercase tracking-widest italic">Tổng đã thu:</span>
          <span className="text-lg font-black">{formatCurrency(stats.paid)}</span>
        </div>
        <div className="flex justify-between items-center text-rose-700">
          <span className="text-[11px] font-black uppercase tracking-widest italic">Còn phải thu:</span>
          <span className="text-lg font-black tracking-tighter">{formatCurrency(stats.balance)}</span>
        </div>
      </div>

      {/* Meter Replacement Summary */}
      <div className="bg-white border-2 border-slate-200 p-4 space-y-2 rounded-[2rem] shadow-sm mb-3">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic mb-1">Theo dõi thay đồng hồ (60 tháng)</p>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-rose-100 text-rose-600 rounded-lg"><AlertTriangle size={14}/></div>
            <span className="text-[10px] font-black text-slate-600 uppercase">Đã quá hạn thay:</span>
          </div>
          <span className="font-black text-rose-600 text-base">{stats.expiredMeters}</span>
        </div>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-100 text-amber-600 rounded-lg"><Clock size={14}/></div>
            <span className="text-[10px] font-black text-slate-600 uppercase">Sắp đến hạn (≤ 6 th):</span>
          </div>
          <span className="font-black text-amber-600 text-base">{stats.warningMeters}</span>
        </div>
      </div>

      <div className="space-y-3">
        <button onClick={onExport} className="w-full bg-blue-700 text-white py-4 rounded-xl font-black uppercase flex justify-center items-center gap-2 shadow-md active:scale-95 border-b-4 border-blue-900 text-xs tracking-widest"><Download size={18}/> Xuất báo cáo Excel</button>
        <button onClick={onClosePeriod} className="w-full bg-amber-500 text-white py-4 rounded-xl font-black uppercase flex justify-center items-center gap-2 shadow-md active:scale-95 border-b-4 border-amber-700 text-xs tracking-widest"><RefreshCcw size={18}/> Chốt kỳ & Mở kỳ mới</button>
      </div>
    </div>
  );
};
