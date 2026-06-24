import React, { useState, useMemo } from 'react';
import { ChevronLeft, History, Wallet, UserCheck, Clock, CheckCircle2, AlertCircle, Search, ChevronDown, ChevronUp, Calendar, ArrowRight, PenSquare } from 'lucide-react';
import { Customer } from '../types';
import { formatCurrency } from '../utils';

interface VerifyViewProps {
  customers: Customer[];
  activeTab: string;
  onBack: () => void;
  onSelect: (id: string) => void;
}

export const VerifyView: React.FC<VerifyViewProps> = ({ customers, activeTab, onBack, onSelect }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'recorded' | 'paid'>('all');
  const [collapsedDates, setCollapsedDates] = useState<Set<string>>(new Set());

  // 1. Grouping and filtering logic
  const groupedHistory = useMemo(() => {
    // Filter customers with valid updatedAt
    const modifiedCustomers = customers.filter(c => typeof c.updatedAt === 'number' && c.updatedAt > 0);
    
    // Sort by updatedAt descending (newest first)
    const sorted = [...modifiedCustomers].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    
    // Group by date string (DD/MM/YYYY)
    const groupsMap = new Map<string, typeof sorted>();
    
    sorted.forEach(c => {
      // Apply search query filter if any
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const matchesName = c.name.toLowerCase().includes(query);
        const matchesCode = c.maKH.toLowerCase().includes(query);
        const matchesAddress = (c.address || '').toLowerCase().includes(query);
        const matchesPhone = (c.phoneTenant || c.phone || '').includes(query);
        if (!matchesName && !matchesCode && !matchesAddress && !matchesPhone) {
          return; // Skip if no match
        }
      }

      // Apply type filter if any
      if (filterType === 'recorded' && c.newIndex === 0) {
        return; // Skip if looking for recorded but none recorded
      }
      if (filterType === 'paid' && c.paid <= 0) {
        return; // Skip if looking for paid but not paid
      }

      const d = new Date(c.updatedAt!);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const dateKey = `${day}/${month}/${year}`;
      
      if (!groupsMap.has(dateKey)) {
        groupsMap.set(dateKey, []);
      }
      groupsMap.get(dateKey)!.push(c);
    });
    
    // Convert map to array of group objects
    return Array.from(groupsMap.entries()).map(([dateStr, items]) => {
      const ghiCount = items.filter(c => c.newIndex > 0).length;
      const thuCount = items.filter(c => c.paid > 0).length;
      const totalPaid = items.reduce((sum, c) => sum + (c.paid || 0), 0);
      
      return {
        dateStr,
        items,
        ghiCount,
        thuCount,
        totalPaid
      };
    });
  }, [customers, searchQuery, filterType]);

  // Overall statistics for the modified records
  const overallStats = useMemo(() => {
    const modified = customers.filter(c => typeof c.updatedAt === 'number' && c.updatedAt > 0);
    return {
      totalDays: new Set(modified.map(c => {
        const d = new Date(c.updatedAt!);
        return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
      })).size,
      totalCustomers: modified.length,
      totalRecorded: modified.filter(c => c.newIndex > 0).length,
      totalCollected: modified.filter(c => c.paid > 0).length,
      totalAmount: modified.reduce((sum, c) => sum + (c.paid || 0), 0)
    };
  }, [customers]);

  const toggleDate = (dateStr: string) => {
    setCollapsedDates(prev => {
      const next = new Set(prev);
      if (next.has(dateStr)) {
        next.delete(dateStr);
      } else {
        next.add(dateStr);
      }
      return next;
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-50 z-[150] flex flex-col pt-[calc(0.5rem+var(--sat))]">
      {/* Header */}
      <header className="px-4 py-3 flex items-center gap-3 bg-white border-b shadow-sm shrink-0">
        <button onClick={onBack} className="p-2 text-slate-800 active:scale-90" title="Quay lại">
          <ChevronLeft size={28}/>
        </button>
        <div className="flex items-center gap-2">
            <History size={24} className="text-blue-700" />
            <h2 className="text-lg font-black uppercase italic text-slate-900">Lịch sử sử dụng</h2>
        </div>
      </header>

      {/* Audit Stats Dashboard */}
      <div className="p-3 bg-white border-b space-y-3 shrink-0">
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
            <span className="text-[9px] font-black uppercase text-slate-400 block tracking-tight">Số ngày hoạt động</span>
            <span className="text-lg font-black text-slate-800">{overallStats.totalDays} ngày</span>
          </div>
          <div className="bg-amber-50/50 p-3 rounded-2xl border border-amber-100 text-center">
            <span className="text-[9px] font-black uppercase text-amber-500 block tracking-tight">Tổng số hộ ghi nước</span>
            <span className="text-lg font-black text-amber-700">{overallStats.totalRecorded} hộ</span>
          </div>
          <div className="bg-emerald-50/50 p-3 rounded-2xl border border-emerald-100 text-center">
            <span className="text-[9px] font-black uppercase text-emerald-500 block tracking-tight">Tổng số tiền đã thu</span>
            <span className="text-lg font-black text-emerald-700 tracking-tight leading-none block mt-1">
              {formatCurrency(overallStats.totalAmount)}
            </span>
          </div>
        </div>

        {/* Dynamic Filters */}
        <div className="space-y-2">
          {/* Search bar inside history */}
          <div className="relative">
            <input 
              type="text"
              placeholder="Tìm hộ đã cập nhật (Tên, Mã KH, SĐT...)"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-100 rounded-xl py-2.5 pl-9 pr-4 text-xs font-bold text-slate-800 outline-none border border-slate-200 focus:border-blue-500 focus:bg-white transition-all"
            />
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 p-0.5 hover:text-slate-600">
                <ChevronLeft size={14} className="rotate-45" />
              </button>
            )}
          </div>

          {/* Quick toggle filter */}
          <div className="flex gap-1.5">
            <button 
              onClick={() => setFilterType('all')}
              className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase border transition-all ${filterType === 'all' ? 'bg-slate-900 text-white border-slate-900 shadow-xs' : 'bg-slate-100 text-slate-500 border-slate-200'}`}
            >
              Tất cả ({overallStats.totalCustomers})
            </button>
            <button 
              onClick={() => setFilterType('recorded')}
              className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase border transition-all ${filterType === 'recorded' ? 'bg-amber-600 text-white border-amber-600 shadow-xs' : 'bg-slate-100 text-amber-700 border-slate-200'}`}
            >
              Hộ đã ghi ({overallStats.totalRecorded})
            </button>
            <button 
              onClick={() => setFilterType('paid')}
              className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase border transition-all ${filterType === 'paid' ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' : 'bg-slate-100 text-emerald-700 border-slate-200'}`}
            >
              Hộ đã thu ({overallStats.totalCollected})
            </button>
          </div>
        </div>
      </div>

      {/* History Timeline */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 pb-40">
        {groupedHistory.map(group => {
          const isCollapsed = collapsedDates.has(group.dateStr);
          return (
            <div key={group.dateStr} className="bg-white border border-slate-200 rounded-[1.8rem] shadow-sm overflow-hidden">
              {/* Group Header */}
              <div 
                onClick={() => toggleDate(group.dateStr)}
                className="bg-slate-50/80 px-4 py-3 flex items-center justify-between border-b border-slate-100 cursor-pointer select-none active:bg-slate-100/70"
              >
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-slate-500" />
                  <div>
                    <span className="font-black text-[13px] text-slate-800">Ngày {group.dateStr}</span>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold mt-0.5">
                      <span>Ghi: <b className="text-amber-600">{group.ghiCount} hộ</b></span>
                      <span>•</span>
                      <span>Thu: <b className="text-emerald-600">{group.thuCount} hộ</b></span>
                      {group.totalPaid > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-700 font-black">+{formatCurrency(group.totalPaid)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <button className="text-slate-400 p-1">
                  {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                </button>
              </div>

              {/* Group Items */}
              {!isCollapsed && (
                <div className="divide-y divide-slate-100">
                  {group.items.map(c => {
                    const hasRecorded = c.newIndex > 0;
                    const hasPaid = c.paid > 0;
                    
                    return (
                      <div 
                        key={c.id} 
                        onClick={() => onSelect(c.id)}
                        className="p-3.5 hover:bg-slate-50/60 active:bg-slate-100/30 transition-all cursor-pointer flex gap-3 items-start"
                      >
                        {/* Left metadata */}
                        <div className="flex flex-col items-center gap-1 shrink-0 mt-0.5">
                          {/* Time */}
                          <div className="flex items-center gap-1 text-slate-400">
                            <Clock size={10} />
                            <span className="text-[9px] font-bold">
                              {new Date(c.updatedAt!).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          
                          {/* List Tab Badge */}
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-tight ${
                            c.listType === 'list1' 
                              ? 'bg-blue-100 text-blue-700' 
                              : 'bg-purple-100 text-purple-700'
                          }`}>
                            {c.listType === 'list1' ? 'Bộ 1' : 'Bộ 2'}
                          </span>
                        </div>

                        {/* Middle info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="bg-slate-800 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md min-w-[28px] text-center">
                              {c.maKH}
                            </span>
                            <h4 className="font-black text-slate-800 uppercase text-xs truncate">{c.name}</h4>
                          </div>

                          {/* Specific Action Log Details */}
                          <div className="mt-1.5 space-y-1">
                            {hasRecorded ? (
                              <div className="flex items-center gap-1 text-[10px] text-slate-600 font-bold">
                                <PenSquare size={12} className="text-amber-500 shrink-0" />
                                <span>Ghi số: <b className="text-slate-800">{c.oldIndex}</b></span>
                                <ArrowRight size={10} className="text-slate-400" />
                                <span className="bg-amber-100 text-amber-800 px-1 py-0.2 rounded font-black">{c.newIndex}</span>
                                <span className="text-slate-400 font-medium">(+{c.volume} m³)</span>
                              </div>
                            ) : null}

                            {hasPaid ? (
                              <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-black">
                                <Wallet size={12} className="text-emerald-500 shrink-0" />
                                <span>Đã thu tiền: {formatCurrency(c.paid)}</span>
                              </div>
                            ) : (
                              hasRecorded && (
                                <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold">
                                  <AlertCircle size={12} className="text-slate-300 shrink-0" />
                                  <span>Ghi số nhưng chưa thu tiền</span>
                                </div>
                              )
                            )}

                            {!hasRecorded && !hasPaid && (
                              <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium italic">
                                <CheckCircle2 size={12} className="text-blue-400 shrink-0" />
                                <span>Cập nhật thông tin chi tiết</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right quick indicator */}
                        <div className="shrink-0 flex items-center justify-end h-full self-center">
                          {hasPaid ? (
                            <span className="bg-emerald-500 text-white p-1 rounded-full shadow-xs">
                              <CheckCircle2 size={14} />
                            </span>
                          ) : (
                            <span className="bg-slate-100 text-slate-400 p-1 rounded-full">
                              <AlertCircle size={14} />
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {groupedHistory.length === 0 && (
          <div className="py-24 text-center space-y-3">
             <div className="inline-block p-4 bg-slate-100 rounded-full text-slate-300"><History size={40} className="stroke-1"/></div>
             <p className="text-slate-400 font-black uppercase italic text-[11px] tracking-widest block">Không có lịch sử thay đổi phù hợp</p>
          </div>
        )}
      </div>
    </div>
  );
};
