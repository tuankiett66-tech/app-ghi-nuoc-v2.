
import React, { useMemo } from 'react';
import { ChevronLeft, RefreshCcw, Download } from 'lucide-react';
import { Customer } from '../types';
import { formatCurrency } from '../utils';

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
      balance: list.reduce((sum, c) => sum + (c.balance || 0), 0)
    };
  }, [customers, activeTab]);

  return (
    <div className="h-full bg-slate-50 flex flex-col p-4 pt-[calc(1rem+var(--sat))] animate-in slide-in-from-bottom duration-200">
      <header className="flex items-center gap-4 mb-8 bg-white p-4 rounded-3xl border shadow-sm">
        <button onClick={onBack} className="p-2.5 bg-slate-100 rounded-full text-slate-800 active:scale-90"><ChevronLeft size={28}/></button>
        <h1 className="text-xl font-black uppercase italic text-slate-900 tracking-tight">Báo cáo tài chính</h1>
      </header>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-700 p-6 rounded-[2.5rem] text-center shadow-xl shadow-blue-100 border-b-4 border-blue-900">
          <p className="text-[11px] uppercase font-black text-blue-100 mb-1 tracking-widest">Khách hàng</p>
          <p className="text-4xl font-black text-white">{stats.total}</p>
        </div>
        <div className="bg-emerald-600 p-6 rounded-[2.5rem] text-center shadow-xl shadow-emerald-100 border-b-4 border-emerald-800">
          <p className="text-[11px] uppercase font-black text-emerald-100 mb-1 tracking-widest">Đã ghi số</p>
          <p className="text-4xl font-black text-white">{stats.done}</p>
        </div>
      </div>

      <div className="bg-white border-2 border-slate-200 p-7 space-y-5 rounded-[3rem] flex-1 overflow-y-auto mb-40 shadow-inner shadow-slate-100">
        <div className="flex justify-between items-center group">
          <span className="text-[13px] font-black text-slate-600 uppercase tracking-widest">Tiền nước kỳ này:</span>
          <span className="font-black text-slate-900 text-lg">{formatCurrency(stats.revenue)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[13px] font-black text-slate-600 uppercase tracking-widest">Nợ cũ tồn đọng:</span>
          <span className="font-black text-rose-600 text-lg">{formatCurrency(stats.debt)}</span>
        </div>
        <div className="h-0.5 bg-slate-100 my-2"></div>
        <div className="flex justify-between items-center text-emerald-700">
          <span className="text-[14px] font-black uppercase tracking-widest italic">Tổng đã thu:</span>
          <span className="text-2xl font-black">{formatCurrency(stats.paid)}</span>
        </div>
        <div className="flex justify-between items-center text-rose-700">
          <span className="text-[14px] font-black uppercase tracking-widest italic">Còn phải thu:</span>
          <span className="text-2xl font-black tracking-tighter">{formatCurrency(stats.balance)}</span>
        </div>
      </div>

      <div className="fixed bottom-28 left-4 right-4 space-y-3 z-50">
        <button onClick={onExport} className="w-full bg-blue-700 text-white py-5 rounded-2xl font-black uppercase flex justify-center items-center gap-3 shadow-2xl active:scale-95 border-b-4 border-blue-900 tracking-widest"><Download size={22}/> Xuất báo cáo Excel</button>
        <button onClick={onClosePeriod} className="w-full bg-amber-500 text-white py-5 rounded-2xl font-black uppercase flex justify-center items-center gap-3 shadow-2xl active:scale-95 border-b-4 border-amber-700 tracking-widest"><RefreshCcw size={22}/> Chốt kỳ & Mở kỳ mới</button>
      </div>
    </div>
  );
};
