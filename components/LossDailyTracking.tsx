
import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2, Calendar, TrendingUp, AlertCircle, Save, History, Activity, FileDown } from 'lucide-react';
import { DailySupplyReading, SystemConfig } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, ReferenceLine } from 'recharts';
import { formatCurrency, formatDateDisplay, normalizeDate, normalizeTime, exportDailyToExcel } from '../utils';

interface LossDailyTrackingProps {
  readings: DailySupplyReading[];
  config: SystemConfig;
  setConfig: React.Dispatch<React.SetStateAction<SystemConfig>>;
  onBack: () => void;
  onAdd: (reading: Omit<DailySupplyReading, 'id' | 'updatedAt' | 'consumption1' | 'consumption2'>) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<DailySupplyReading>) => void;
  onClosePeriod: () => boolean;
}

export const LossDailyTracking: React.FC<LossDailyTrackingProps> = ({ readings, config, setConfig, onBack, onAdd, onDelete, onUpdate, onClosePeriod }) => {
  const [activeTab, setActiveTab] = useState<'record' | 'history' | 'chart'>('history');
  
  // Form state
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(new Date().toTimeString().slice(0, 5));
  const [m1, setM1] = useState('');
  const [m2, setM2] = useState('');
  const [notes, setNotes] = useState('');

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<DailySupplyReading>>({});

  const [showInitialSettings, setShowInitialSettings] = useState(false);
  const [tempM1Init, setTempM1Init] = useState(config.master1Initial?.toString() || '0');
  const [tempM2Init, setTempM2Init] = useState(config.master2Initial?.toString() || '0');
  const [tempDateInit, setTempDateInit] = useState(config.masterInitialDate || new Date().toISOString().split('T')[0]);

  const handleAdd = () => {
    if (!m1 && !m2) {
      alert("Vui lòng nhập ít nhất 1 chỉ số đồng hồ");
      return;
    }
    onAdd({
      date: normalizeDate(date),
      time,
      master1: parseFloat(m1) || 0,
      master2: parseFloat(m2) || 0,
      notes
    });
    setM1(''); setM2(''); setNotes('');
    setActiveTab('history');
  };

  const handleStartEdit = (r: DailySupplyReading) => {
    setEditingId(r.id);
    setEditData({ 
      ...r, 
      date: normalizeDate(r.date),
      time: normalizeTime(r.time)
    });
  };

  const handleSaveEdit = () => {
    if (editingId && editData) {
      onUpdate(editingId, { ...editData, date: normalizeDate(editData.date) });
      setEditingId(null);
    }
  };

  const handleSaveInitial = () => {
    setConfig(prev => ({
      ...prev,
      master1Initial: parseFloat(tempM1Init) || 0,
      master2Initial: parseFloat(tempM2Init) || 0,
      masterInitialDate: normalizeDate(tempDateInit)
    }));
    setShowInitialSettings(false);
  };

  // Helper to extract month-year from reading date (supports YYYY-MM-DD)
  const getMonthYearKey = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[1]}/${parts[0]}`; // MM/YYYY
    }
    if (dateStr.includes('/')) {
      const partsSlash = dateStr.split('/');
      if (partsSlash.length === 3) {
        if (partsSlash[2].length === 4) {
          return `${partsSlash[1].padStart(2, '0')}/${partsSlash[2]}`;
        }
      }
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    }
    return '';
  };

  const getCurrentMonthYear = () => {
    const d = new Date();
    return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };

  // Get list of unique months from readings, plus the current month, sorted chronologically:
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    const curr = getCurrentMonthYear();
    monthsSet.add(curr);
    
    readings.forEach(r => {
      const key = getMonthYearKey(r.date);
      if (key) monthsSet.add(key);
    });
    
    // Sort chronologically (YYYYMM) descending
    return Array.from(monthsSet).sort((a, b) => {
      const [mA, yA] = a.split('/');
      const [mB, yB] = b.split('/');
      return `${yB}${mB}`.localeCompare(`${yA}${mA}`);
    });
  }, [readings]);

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const curr = getCurrentMonthYear();
    return curr;
  });

  const filteredReadings = useMemo(() => {
    return readings.filter(r => getMonthYearKey(r.date) === selectedMonth);
  }, [readings, selectedMonth]);

  const handlePrevMonth = () => {
    const currentIndex = availableMonths.indexOf(selectedMonth);
    if (currentIndex < availableMonths.length - 1) {
      setSelectedMonth(availableMonths[currentIndex + 1]);
    }
  };

  const handleNextMonth = () => {
    const currentIndex = availableMonths.indexOf(selectedMonth);
    if (currentIndex > 0) {
      setSelectedMonth(availableMonths[currentIndex - 1]);
    }
  };

  const prevMonthDisabled = availableMonths.indexOf(selectedMonth) >= availableMonths.length - 1;
  const nextMonthDisabled = availableMonths.indexOf(selectedMonth) <= 0;

  const chartData = useMemo(() => {
    return [...filteredReadings].reverse().map(r => ({
      date: formatDateDisplay(r.date), // DD/MM
      'Tổng tiêu thụ': (r.consumption1 || 0) + (r.consumption2 || 0),
      'Đồng hồ 1': r.consumption1 || 0,
      'Đồng hồ 2': r.consumption2 || 0,
    }));
  }, [filteredReadings]);

  const avgConsumption = useMemo(() => {
    if (filteredReadings.length === 0) return 0;
    const totals = filteredReadings.map(r => (r.consumption1 || 0) + (r.consumption2 || 0));
    return totals.reduce((a, b) => a + b, 0) / totals.length;
  }, [filteredReadings]);

  const { totalM1Cons, totalM2Cons, grandTotalCons } = useMemo(() => {
    const m1Sum = filteredReadings.reduce((sum, r) => sum + (r.consumption1 || 0), 0);
    const m2Sum = filteredReadings.reduce((sum, r) => sum + (r.consumption2 || 0), 0);
    return {
      totalM1Cons: m1Sum,
      totalM2Cons: m2Sum,
      grandTotalCons: m1Sum + m2Sum
    };
  }, [filteredReadings]);

  const handleConfirmClosePeriod = () => {
    const confirmMsg = "CẢNH BÁO: Bạn có chắc chắn muốn CHỐT KỲ nước hằng ngày?\n\n- Chỉ số cuối của kỳ hiện tại sẽ được lưu làm số chốt (số cũ) cho kỳ mới.\n- Toàn bộ danh sách ghi chép hằng ngày của kỳ này sẽ được xóa để sẵn sàng ghi kỳ mới.\n\n👉 KHUYÊN DÙNG: Hãy bấm nút xuất file Excel ở góc trên để lưu trữ trước khi chốt!";
    if (confirm(confirmMsg)) {
      onClosePeriod();
    }
  };

  return (
    <div className="h-full bg-slate-50 flex flex-col p-3 pt-[calc(0.5rem+var(--sat))] animate-in slide-in-from-right duration-300 overflow-y-auto pb-32">
      <header className="flex items-center justify-between mb-4 bg-white p-3 rounded-2xl border shadow-sm sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-2 bg-slate-100 rounded-full text-slate-800 active:scale-90"><ChevronLeft size={22}/></button>
          <div className="flex flex-col">
            <h1 className="text-sm font-black uppercase text-slate-900 tracking-tight">Cấp nước hàng ngày</h1>
            <p className="text-[10px] font-bold text-slate-400 italic">Theo dõi biến động & thất thoát</p>
          </div>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-2xl gap-0.5">
          <button onClick={() => setActiveTab('record')} className={`p-2 rounded-xl transition-all ${activeTab === 'record' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}><Plus size={18}/></button>
          <button onClick={() => setActiveTab('history')} className={`p-2 rounded-xl transition-all ${activeTab === 'history' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}><History size={18}/></button>
          <button onClick={() => setActiveTab('chart')} className={`p-2 rounded-xl transition-all ${activeTab === 'chart' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}><Activity size={18}/></button>
          <div className="w-[1px] bg-slate-200 mx-0.5 my-1.5" />
          <button 
            onClick={() => exportDailyToExcel(filteredReadings, `Theo_Doi_Hang_Ngay_Thang_${selectedMonth.replace('/', '_')}`)} 
            disabled={filteredReadings.length === 0}
            className="p-2 rounded-xl text-emerald-600 active:bg-white active:shadow-sm disabled:opacity-20 transition-all"
            title="Xuất Excel"
          >
            <FileDown size={18}/>
          </button>
        </div>
      </header>

      {/* Month Selector Bar */}
      {(activeTab === 'history' || activeTab === 'chart') && (
        <div className="bg-white p-3.5 rounded-[1.8rem] border-2 border-slate-100 shadow-sm flex items-center justify-between mb-4">
          <button 
            type="button"
            onClick={handlePrevMonth} 
            disabled={prevMonthDisabled} 
            className="p-2 px-3 bg-slate-50 hover:bg-slate-100 disabled:opacity-30 rounded-xl text-slate-800 disabled:pointer-events-none active:scale-95 transition-all text-[11px] font-black uppercase flex items-center justify-center gap-0.5 border border-slate-100"
          >
            <ChevronLeft size={12} /> Trước
          </button>
          
          <div className="flex flex-col items-center">
            <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Kỳ xem dữ liệu</span>
            <select 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-[15px] font-black text-blue-600 bg-transparent border-none focus:ring-0 cursor-pointer text-center p-0 outline-none"
            >
              {availableMonths.map(m => (
                <option key={m} value={m}>Tháng {m}</option>
              ))}
            </select>
          </div>

          <button 
            type="button"
            onClick={handleNextMonth} 
            disabled={nextMonthDisabled} 
            className="p-2 px-3 bg-slate-50 hover:bg-slate-100 disabled:opacity-30 rounded-xl text-slate-800 disabled:pointer-events-none active:scale-95 transition-all text-[11px] font-black uppercase flex items-center justify-center gap-0.5 border border-slate-100"
          >
            Sau <ChevronRight size={12} />
          </button>
        </div>
      )}

      {activeTab === 'record' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="bg-white p-6 rounded-[2.5rem] border-2 border-blue-50 shadow-xl space-y-5">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-3 mb-1.5 block">Ngày ghi</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm font-black outline-none focus:border-blue-500 shadow-inner" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-3 mb-1.5 block">Giờ ghi</label>
                  <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm font-black outline-none focus:border-blue-500 shadow-inner" />
                </div>
              </div>

              <div className="bg-slate-50 p-6 rounded-[2.2rem] border-2 border-slate-100/50 shadow-sm space-y-4">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center italic">Đồng hồ tổng số 1</p>
                <input type="number" inputMode="decimal" value={m1} onChange={e => setM1(e.target.value)} placeholder="Nhập chỉ số mới" className="w-full bg-white border-2 border-slate-200 rounded-2xl px-6 py-5 text-2xl font-black text-center outline-none focus:border-blue-600 focus:ring-8 focus:ring-blue-100 transition-all placeholder:text-slate-200 shadow-sm" />
              </div>

              <div className="bg-slate-50 p-6 rounded-[2.2rem] border-2 border-slate-100/50 shadow-sm space-y-4">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center italic">Đồng hồ tổng số 2</p>
                <input type="number" inputMode="decimal" value={m2} onChange={e => setM2(e.target.value)} placeholder="Nhập chỉ số mới" className="w-full bg-white border-2 border-slate-200 rounded-2xl px-6 py-5 text-2xl font-black text-center outline-none focus:border-blue-600 focus:ring-8 focus:ring-blue-100 transition-all placeholder:text-slate-200 shadow-sm" />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-3 mb-1.5 block tracking-widest">Ghi chú (nếu có)</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Vd: Đã đi kiểm tra đường ống..." className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-blue-500 shadow-inner h-24" />
              </div>
            </div>

            <button onClick={handleAdd} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase text-lg shadow-xl shadow-blue-200 active:scale-95 flex items-center justify-center gap-3">
              <Save size={20}/> Lưu dữ liệu
            </button>
          </div>
        </motion.div>
      )}

      {activeTab === 'history' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="bg-white p-4 rounded-[2rem] border-2 border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-4 px-2">
              <h2 className="text-xs font-black uppercase text-slate-900 tracking-tight flex items-center gap-2">
                <Activity size={16} className="text-blue-600" />
                Số chốt đầu kỳ (Opening Index)
              </h2>
              <button 
                onClick={() => {
                  setTempM1Init(config.master1Initial?.toString() || '0');
                  setTempM2Init(config.master2Initial?.toString() || '0');
                  setShowInitialSettings(!showInitialSettings);
                }} 
                className="text-[10px] font-black text-blue-600 uppercase border-b-2 border-blue-600/30 pb-0.5"
              >
                {showInitialSettings ? 'Hủy' : 'Sửa số chốt'}
              </button>
            </div>

            {showInitialSettings ? (
              <div className="space-y-3 p-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-1 block">Chốt M1 (Số Cuối Kỳ Trước)</label>
                    <input type="number" value={tempM1Init} onChange={e => setTempM1Init(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2 text-sm font-black text-center" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-1 block">Chốt M2 (Số Cuối Kỳ Trước)</label>
                    <input type="number" value={tempM2Init} onChange={e => setTempM2Init(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2 text-sm font-black text-center" />
                  </div>
                </div>
                <div>
                   <label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-1 block">Ngày chốt (Số liệu tính cho ngày đầu kỳ)</label>
                   <input type="date" value={tempDateInit} onChange={e => setTempDateInit(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2 text-sm font-black text-center" />
                </div>
                <button onClick={handleSaveInitial} className="w-full bg-slate-900 text-white py-3 rounded-xl font-black uppercase text-xs">Cập nhật số chốt</button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 px-2">
                <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">M1 (Số Cuối Kỳ Trước)</p>
                  <p className="text-lg font-black text-slate-700">{config.master1Initial?.toLocaleString('vi-VN') || 0}</p>
                </div>
                <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">M2 (Số Cuối Kỳ Trước)</p>
                  <p className="text-lg font-black text-slate-700">{config.master2Initial?.toLocaleString('vi-VN') || 0}</p>
                </div>
                <div className="col-span-2 bg-slate-50 rounded-2xl p-2 border border-slate-100 text-center">
                   <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Ngày chốt kỳ trước</p>
                   <p className="text-xs font-black text-slate-600">{formatDateDisplay(config.masterInitialDate || '')}</p>
                </div>
              </div>
            )}
            <p className="text-[9px] font-bold text-slate-400 italic px-2 mt-3 block text-center opacity-70">
              App dùng số này để tính cho ngày ghi chép đầu tiên.
            </p>
          </div>

          <div className="bg-white rounded-[2rem] border-2 border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b-2 border-slate-100">
                  <th className="py-4 px-3 text-[9px] font-black text-slate-400 uppercase text-left">Ngày/Giờ</th>
                  <th className="py-4 px-3 text-[9px] font-black text-slate-400 uppercase text-center">Đồng hồ 1</th>
                  <th className="py-4 px-3 text-[9px] font-black text-slate-400 uppercase text-center">Đồng hồ 2</th>
                  <th className="py-4 px-3 text-[9px] font-black text-slate-400 uppercase text-center">Tổng</th>
                  <th className="py-4 px-2"></th>
                </tr>
              </thead>
              <tbody>
                {filteredReadings.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center text-slate-300">
                      <History size={48} className="mx-auto mb-3 opacity-20" />
                      <p className="font-black uppercase text-[10px] tracking-widest leading-loose">Chưa có dữ liệu hàng ngày</p>
                    </td>
                  </tr>
                ) : (
                  filteredReadings.map((r, idx) => {
                    const totalCons = (r.consumption1 || 0) + (r.consumption2 || 0);
                    const isHigh = totalCons > avgConsumption * 1.5 && filteredReadings.length > 3;
                    const isEditing = editingId === r.id;
                    
                    return (
                      <React.Fragment key={r.id}>
                        <tr className={`border-b border-slate-50 transition-colors ${isHigh ? 'bg-rose-50/30' : 'hover:bg-slate-50/50'}`}>
                          <td className="py-4 px-3">
                            {isEditing ? (
                              <div className="flex flex-col gap-1">
                                <input type="date" value={editData.date} onChange={e => setEditData({...editData, date: e.target.value})} className="text-[10px] p-1 border rounded w-20" />
                                <input type="time" value={editData.time} onChange={e => setEditData({...editData, time: e.target.value})} className="text-[10px] p-1 border rounded w-20" />
                              </div>
                            ) : (
                              <div className="flex flex-col" onClick={() => handleStartEdit(r)}>
                                <span className="text-xs font-black text-slate-900">{formatDateDisplay(r.date)}</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase">{normalizeTime(r.time || '--:--')}</span>
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-3 text-center">
                            {isEditing ? (
                              <input type="number" value={editData.master1} onChange={e => setEditData({...editData, master1: parseFloat(e.target.value)})} className="w-16 text-xs text-center border rounded p-1 font-black" />
                            ) : (
                              <div className="flex flex-col items-center" onClick={() => handleStartEdit(r)}>
                                <span className="text-sm font-black text-blue-600">{r.consumption1}</span>
                                <span className="text-[13px] font-black text-slate-600 uppercase">CS: {r.master1}</span>
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-3 text-center">
                            {isEditing ? (
                              <input type="number" value={editData.master2} onChange={e => setEditData({...editData, master2: parseFloat(e.target.value)})} className="w-16 text-xs text-center border rounded p-1 font-black" />
                            ) : (
                              <div className="flex flex-col items-center" onClick={() => handleStartEdit(r)}>
                                <span className="text-sm font-black text-indigo-600">{r.consumption2}</span>
                                <span className="text-[13px] font-black text-slate-600 uppercase">CS: {r.master2}</span>
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-3 text-center">
                            {isEditing ? (
                              <div className="flex flex-col gap-1">
                                <button onClick={handleSaveEdit} className="bg-blue-600 text-white text-[8px] font-black px-2 py-1 rounded">LƯU</button>
                                <button onClick={() => setEditingId(null)} className="bg-slate-200 text-slate-600 text-[8px] font-black px-2 py-1 rounded">HỦY</button>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center" onClick={() => handleStartEdit(r)}>
                                <span className={`text-base font-black ${isHigh ? 'text-rose-600' : 'text-slate-900'}`}>{totalCons}</span>
                                {isHigh && <div className="text-[7px] font-black text-rose-500 uppercase tracking-tighter">Bất thường</div>}
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-2 text-right">
                            <button onClick={() => onDelete(r.id)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={16}/></button>
                          </td>
                        </tr>
                        {(r.notes || isEditing) && (
                          <tr className="bg-amber-50/30 border-b border-slate-50">
                            <td colSpan={5} className="py-2 px-4 text-[9px] font-bold text-amber-700 italic">
                               {isEditing ? (
                                 <input value={editData.notes || ''} onChange={e => setEditData({...editData, notes: e.target.value})} placeholder="Ghi chú..." className="w-full bg-transparent border-none outline-none font-bold italic" />
                               ) : (
                                 <>💡 {r.notes}</>
                               )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-slate-900 text-white p-5 rounded-[2.5rem] shadow-xl flex items-center justify-between">
            <div className="flex items-center gap-4">
               <div className="bg-blue-500/20 p-3 rounded-2xl text-blue-300"><TrendingUp size={24}/></div>
               <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5 mt-1">TB tiêu thụ/ngày</p>
                  <p className="text-2xl font-black tracking-tighter leading-none">{avgConsumption.toFixed(1)} <span className="text-xs font-bold opacity-40 italic tracking-normal">m3/ngày</span></p>
               </div>
            </div>
            <div className="h-10 w-px bg-white/10 mx-2"></div>
            <div className="text-right">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5 mt-1">Số ngày ghi</p>
               <p className="text-xl font-black text-blue-400">{filteredReadings.length} <span className="text-[10px] font-black text-slate-500">NGÀY</span></p>
            </div>
          </div>

          {filteredReadings.length > 0 && (
            <>
              <div className="bg-blue-950 text-white p-5 rounded-[2.5rem] shadow-xl space-y-4 border border-blue-900/40">
                <div className="flex justify-between items-center border-b border-white/10 pb-2">
                  <h3 className="text-[11px] font-black uppercase tracking-wider text-blue-300">Tổng tiêu thụ lũy kế cả kỳ</h3>
                  <span className="text-[8px] font-black uppercase tracking-widest bg-blue-500/20 text-blue-300 px-2.5 py-1 rounded-lg">Từ số chốt</span>
                </div>
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="bg-white/5 p-3.5 rounded-2xl border border-white/5 flex flex-col justify-center">
                    <p className="text-[9px] font-black text-blue-400 uppercase mb-1 tracking-wider">Đồng hồ 1</p>
                    <p className="text-[20px] font-black text-blue-100 leading-none">{totalM1Cons.toLocaleString('vi-VN')} <span className="text-[11px] opacity-50 font-normal">m³</span></p>
                  </div>
                  <div className="bg-white/5 p-3.5 rounded-2xl border border-white/5 flex flex-col justify-center">
                    <p className="text-[9px] font-black text-indigo-400 uppercase mb-1 tracking-wider">Đồng hồ 2</p>
                    <p className="text-[20px] font-black text-indigo-100 leading-none">{totalM2Cons.toLocaleString('vi-VN')} <span className="text-[11px] opacity-50 font-normal">m³</span></p>
                  </div>
                </div>
                <div className="bg-blue-500/10 p-4 rounded-2xl border border-blue-500/20 flex justify-between items-center">
                  <div className="text-left">
                    <p className="text-[11px] font-black text-blue-400 uppercase tracking-wide leading-none mb-1">Tổng 2 đồng hồ</p>
                    <p className="text-[8px] font-bold text-slate-400 leading-none italic">Lũy kế tiêu thụ hàng ngày</p>
                  </div>
                  <p className="text-[24px] font-black text-blue-400 leading-none">{grandTotalCons.toLocaleString('vi-VN')} <span className="text-[13px] font-black opacity-80">m³</span></p>
                </div>
              </div>

              <div className="pt-2">
                <button 
                  onClick={handleConfirmClosePeriod}
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white py-4 bg-rose-600 hover:bg-rose-700 text-white py-4.5 rounded-[2rem] font-black uppercase text-xs flex justify-center items-center gap-2 shadow-lg hover:shadow-rose-300 active:scale-95 border-b-4 border-rose-800 transition-all"
                >
                  Chốt kỳ & Qua tháng mới
                </button>
              </div>
            </>
          )}
        </motion.div>
      )}

      {activeTab === 'chart' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="bg-white p-5 rounded-[2.5rem] border-2 border-slate-100 shadow-xl h-[450px]">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 italic text-center">Biến động cấp nước (30 ngày gần nhất)</p>
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={chartData}>
                  <defs>
                    <linearGradient id="barColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 800, fill: '#94a3b8'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 800, fill: '#94a3b8'}} />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 800, fontSize: '12px'}}
                  />
                  <ReferenceLine y={avgConsumption} label={{ value: 'TB', position: 'insideRight', fill: '#94a3b8', fontSize: 10, fontWeight: 900 }} stroke="#94a3b8" strokeDasharray="3 3" />
                  <Bar dataKey="Tổng tiêu thụ" fill="url(#barColor)" radius={[10, 10, 0, 0]} barSize={25} />
               </BarChart>
             </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-3">
             <div className="bg-white p-5 rounded-[2rem] border-2 border-slate-100 text-center">
                <p className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">Trung bình/Ngày</p>
                <p className="text-2xl font-black text-blue-600">{avgConsumption.toFixed(1)} <span className="text-xs uppercase opacity-50">m3</span></p>
             </div>
             <div className="bg-white p-5 rounded-[2rem] border-2 border-slate-100 text-center">
                <p className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">Cao nhất</p>
                <p className="text-2xl font-black text-rose-500">
                  {filteredReadings.length > 0 ? Math.max(...filteredReadings.map(r => (r.consumption1 || 0) + (r.consumption2 || 0))) : 0} 
                  <span className="text-xs uppercase opacity-50 ml-1">m3</span>
                </p>
             </div>
          </div>
        </motion.div>
      )}
      <div className="bg-amber-50 border-2 border-amber-100 p-5 rounded-[2rem] flex gap-4 mt-4">
        <div className="bg-amber-100 p-3 rounded-2xl text-amber-600 self-start"><AlertCircle size={24}/></div>
        <div>
          <p className="text-sm font-black text-amber-900 mb-1 tracking-tight">Hướng dẫn số chốt</p>
          <p className="text-[11px] font-bold text-amber-700 leading-relaxed italic opacity-80">
            "Số chốt kỳ trước" chính là <span className="underline decoration-2 text-amber-900 uppercase">Chỉ số CUỐI</span> của kỳ nước vừa xong. App dùng số này để tính tiêu thụ cho ngày đầu tiên của kỳ mới.
          </p>
        </div>
      </div>
    </div>
  );
};
