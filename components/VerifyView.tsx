
import React, { useState, useMemo } from 'react';
import { ChevronLeft, ClipboardCheck, Wallet, UserCheck, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { Customer } from '../types';
import { formatCurrency } from '../utils';

interface VerifyViewProps {
  customers: Customer[];
  activeTab: string;
  onBack: () => void;
  onSelect: (id: string) => void;
}

export const VerifyView: React.FC<VerifyViewProps> = ({ customers, activeTab, onBack, onSelect }) => {
  const [filter, setFilter] = useState<'all' | 'unpaid' | 'paid'>('all');

  const today = new Date().setHours(0, 0, 0, 0);

  const todayData = useMemo(() => {
    return customers
      .filter(c => c.listType === activeTab && c.updatedAt && c.updatedAt >= today)
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }, [customers, activeTab, today]);

  const stats = useMemo(() => ({
    count: todayData.length,
    paidCount: todayData.filter(c => c.paid > 0).length,
    totalPaid: todayData.reduce((sum, c) => sum + (c.paid || 0), 0)
  }), [todayData]);

  const filteredData = useMemo(() => {
    if (filter === 'unpaid') return todayData.filter(c => c.paid <= 0);
    if (filter === 'paid') return todayData.filter(c => c.paid > 0);
    return todayData;
  }, [todayData, filter]);

  return (
    <div className="fixed inset-0 bg-[#f8fafc] z-[150] flex flex-col pt-[calc(0.5rem+var(--sat))]">
      <header className="px-4 py-3 flex items-center gap-3 bg-white border-b shadow-sm shrink-0">
        <button onClick={onBack} className="p-2 text-slate-800 active:scale-90"><ChevronLeft size={28}/></button>
        <div className="flex items-center gap-2">
            <ClipboardCheck size={24} className="text-emerald-600" />
            <h2 className="text-lg font-black uppercase italic text-slate-900">Kiểm tra Cuối ngày</h2>
        </div>
      </header>

      {/* Reconciliation Header */}
      <div className="p-4 space-y-3 shrink-0">
        <div className="bg-white p-5 rounded-[2.5rem] shadow-lg border-2 border-emerald-100 flex justify-between items-center">
            <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-slate-500 font-black text-[10px] uppercase tracking-wider">
                    <UserCheck size={14}/> Hộ đã ghi hôm nay
                </div>
                <p className="text-3xl font-black text-slate-900 leading-none">{stats.count}</p>
            </div>
            <div className="text-right space-y-1">
                <div className="flex items-center justify-end gap-1.5 text-emerald-600 font-black text-[10px] uppercase tracking-wider">
                    <Wallet size={14}/> Đã thu hôm nay
                </div>
                <p className="text-3xl font-black text-emerald-600 tracking-tighter leading-none">{formatCurrency(stats.totalPaid)}</p>
            </div>
        </div>

        {/* Quick Filters */}
        <div className="flex gap-2">
            <button 
                onClick={() => setFilter('all')}
                className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase border-2 transition-all ${filter === 'all' ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-500 border-slate-100'}`}
            >
                Tất cả ({todayData.length})
            </button>
            <button 
                onClick={() => setFilter('unpaid')}
                className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase border-2 transition-all ${filter === 'unpaid' ? 'bg-rose-600 text-white border-rose-600 shadow-md' : 'bg-white text-rose-500 border-rose-100'}`}
            >
                Chưa thu ({todayData.filter(c => c.paid <= 0).length})
            </button>
            <button 
                onClick={() => setFilter('paid')}
                className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase border-2 transition-all ${filter === 'paid' ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' : 'bg-white text-emerald-600 border-emerald-100'}`}
            >
                Đã thu ({todayData.filter(c => c.paid > 0).length})
            </button>
        </div>
      </div>

      {/* Data List */}
      <div className="flex-1 overflow-y-auto px-4 pb-40 space-y-3">
        {filteredData.map(c => (
          <div key={c.id} onClick={() => onSelect(c.id)} className="bg-white p-4 rounded-3xl border-2 border-slate-50 shadow-sm flex justify-between items-center active:scale-[0.98] transition-transform">
            <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center font-black text-slate-400 text-sm border shrink-0">{c.stt}</div>
                <div className="min-w-0">
                    <h3 className="font-black text-slate-900 uppercase truncate text-sm">{c.name}</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <Clock size={12} className="text-slate-300" />
                        <span className="text-[10px] font-bold text-slate-400">
                            {new Date(c.updatedAt!).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                </div>
            </div>
            <div className="text-right shrink-0">
                <div className="font-black text-slate-900 text-sm">{formatCurrency(c.paid || c.balance)}</div>
                <div className={`text-[9px] font-black uppercase flex items-center justify-end gap-1 mt-1 ${c.paid > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {c.paid > 0 ? (
                        <><CheckCircle2 size={12}/> Đã thu</>
                    ) : (
                        <><AlertCircle size={12}/> Chưa thu</>
                    )}
                </div>
            </div>
          </div>
        ))}

        {filteredData.length === 0 && (
          <div className="py-20 text-center space-y-3">
             <div className="inline-block p-4 bg-slate-100 rounded-full text-slate-300"><Clock size={40}/></div>
             <p className="text-slate-400 font-black uppercase italic text-[11px] tracking-widest">Không có dữ liệu thay đổi trong hôm nay</p>
          </div>
        )}
      </div>
    </div>
  );
};
