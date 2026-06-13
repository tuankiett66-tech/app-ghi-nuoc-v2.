import React, { useState, useMemo } from 'react';
import { ChevronLeft, Plus, Trash2, TrendingDown, BarChart3, Table as TableIcon, Droplets, AlertTriangle, Activity, Save, Download, RefreshCw, Edit2 } from 'lucide-react';
import { LossRecord, Customer, DailySupplyReading, SystemConfig } from '../types';
import { formatCurrency, getBillingMonthYear, exportLossPeriodReportToExcel, normalizeMonthYear } from '../utils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';

interface LossViewProps {
  records: LossRecord[];
  customers: Customer[];
  dailySupplyReadings: DailySupplyReading[];
  config: SystemConfig;
  onBack: () => void;
  onAdd: (record: Omit<LossRecord, 'id' | 'createdAt'>) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<LossRecord>) => void;
  onShowDailyTracking: () => void;
}

export const LossView: React.FC<LossViewProps> = ({ records, customers, dailySupplyReadings, config, onBack, onAdd, onDelete, onUpdate, onShowDailyTracking }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [activeView, setActiveView] = useState<'table' | 'chart'>('table');
  
  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<LossRecord>>({});

  // Form state
  const [period, setPeriod] = useState('');
  const [month, setMonth] = useState('');
  const [m1New, setM1New] = useState('');
  const [m1Old, setM1Old] = useState('');
  const [m2New, setM2New] = useState('');
  const [m2Old, setM2Old] = useState('');
  const [manualList1Vol, setManualList1Vol] = useState('');
  const [manualList2Vol, setManualList2Vol] = useState('');

  const getAutoSyncValuesForMonth = (monthStr: string, recordId?: string) => {
    const normMonth = normalizeMonthYear(monthStr);
    
    // Find daily records for this month
    const filtered = dailySupplyReadings.filter(r => {
      const rMonth = normalizeMonthYear(r.date);
      return rMonth === normMonth;
    });

    if (filtered.length === 0) {
      return null;
    }

    // Sort chronologically
    const sorted = [...filtered].sort((a, b) => a.date.localeCompare(b.date));
    const earliest = sorted[0];
    const latest = sorted[sorted.length - 1];

    let m1OldVal = config.master1Initial || 0;
    let m2OldVal = config.master2Initial || 0;

    // Check historical records to find the previous period's closing value as our opening value
    const sortedRecords = [...records]
      .filter(r => r.id !== recordId && r.month !== monthStr)
      .sort((a, b) => {
        const partsA = a.month.split('/');
        const partsB = b.month.split('/');
        return `${partsA[1]}${partsA[0]}`.localeCompare(`${partsB[1]}${partsB[0]}`);
      });
    
    const prevRec = sortedRecords.reverse().find(r => {
      const [rM, rY] = r.month.split('/').map(Number);
      const [currM, currY] = normMonth.split('/').map(Number);
      if (rY < currY) return true;
      if (rY === currY && rM < currM) return true;
      return false;
    });

    if (prevRec) {
      m1OldVal = prevRec.master1New;
      m2OldVal = prevRec.master2New;
    } else {
      m1OldVal = earliest.master1 - (earliest.consumption1 || 0);
      m2OldVal = earliest.master2 - (earliest.consumption2 || 0);
    }

    const m1NewVal = latest.master1;
    const m2NewVal = latest.master2;

    return {
      master1Old: m1OldVal,
      master1New: m1NewVal,
      master2Old: m2OldVal,
      master2New: m2NewVal,
      readingsCount: filtered.length
    };
  };

  const handleSyncFromDaily = (recordId: string, monthStr: string) => {
    const vals = getAutoSyncValuesForMonth(monthStr, recordId);
    if (!vals || vals.readingsCount === 0) {
      alert(`⚠️ Không tìm thấy dữ liệu ghi chép hằng ngày nào cho Tháng ${monthStr} trong hệ thống!\n\nHệ thống không thể tự động đồng bộ cho kỳ này vì nhật ký hằng ngày rỗng (có thể bạn đã nhấn "Chốt kỳ hằng ngày" làm sạch nhật ký). Vui lòng nhấn nút "Sửa" và nhập trực tiếp các chỉ số đúng bằng tay!`);
      return;
    }

    onUpdate(recordId, {
      master1Old: vals.master1Old,
      master1New: vals.master1New,
      master2Old: vals.master2Old,
      master2New: vals.master2New
    });

    alert(`🎉 Đồng bộ số liệu Kỳ Tháng ${monthStr} thành công!\n(Tìm thấy ${vals.readingsCount} ngày ghi chép)\n\nĐỒNG HỒ 1 (Số cũ -> Số mới): ${vals.master1Old.toLocaleString('vi-VN')} ➔ ${vals.master1New.toLocaleString('vi-VN')} (${(vals.master1New - vals.master1Old).toLocaleString('vi-VN')} m³)\nĐỒNG HỒ 2 (Số cũ -> Số mới): ${vals.master2Old.toLocaleString('vi-VN')} ➔ ${vals.master2New.toLocaleString('vi-VN')} (${(vals.master2New - vals.master2Old).toLocaleString('vi-VN')} m³)`);
  };

  const handleAutoFillFromDaily = (monthStr: string, isForEdit: boolean) => {
    const vals = getAutoSyncValuesForMonth(monthStr, isForEdit ? editingId || undefined : undefined);
    if (!vals || vals.readingsCount === 0) {
      alert(`⚠️ Không tìm thấy dữ liệu ghi chép hằng ngày cho Tháng ${monthStr} trong hệ thống!\n\nNhật ký hằng ngày của tháng này hiện đang rỗng (hoặc đã bị xóa sau khi Chốt kỳ). Để tránh làm hỏng hoặc mất các số liệu cũ của bạn, hệ thống khuyên bạn tự nhập trực tiếp bằng tay số cũ & mới!`);
      return;
    }

    if (isForEdit) {
      setEditData(prev => ({
        ...prev,
        master1Old: vals.master1Old,
        master1New: vals.master1New,
        master2Old: vals.master2Old,
        master2New: vals.master2New
      }));
    } else {
      setM1Old(vals.master1Old.toString());
      setM1New(vals.master1New.toString());
      setM2Old(vals.master2Old.toString());
      setM2New(vals.master2New.toString());
    }
    alert(`💡 Đã lấy số liệu của ${vals.readingsCount} ngày ghi chép trong tháng ${monthStr} thành công!`);
  };

  const currentStats = useMemo(() => {
    const list1 = customers.filter(c => c.listType === 'list1');
    const list2 = customers.filter(c => c.listType === 'list2');
    return {
      list1Vol: list1.reduce((sum, c) => sum + (c.volume || 0), 0),
      list2Vol: list2.reduce((sum, c) => sum + (c.volume || 0), 0)
    };
  }, [customers]);

  const handleAdd = () => {
    if (!period || !month) {
      alert("Vui lòng nhập Kỳ và Tháng");
      return;
    }
    onAdd({
      period,
      month,
      master1New: parseFloat(m1New) || 0,
      master1Old: parseFloat(m1Old) || 0,
      master2New: parseFloat(m2New) || 0,
      master2Old: parseFloat(m2Old) || 0,
      list1Volume: parseFloat(manualList1Vol) || 0,
      list2Volume: parseFloat(manualList2Vol) || 0
    });
    setShowAdd(false);
    // Reset form
    setPeriod(''); setMonth(''); setM1New(''); setM1Old(''); setM2New(''); setM2Old('');
    setManualList1Vol(''); setManualList2Vol('');
  };

  const chartData = useMemo(() => {
    return [...records].reverse().map(r => {
      const supply = (r.master1New - r.master1Old) + (r.master2New - r.master2Old);
      const consumption = r.list1Volume + r.list2Volume;
      const loss = supply - consumption;
      const lossPercent = supply > 0 ? (loss / supply) * 100 : 0;
      return {
        name: r.month,
        'Thất thoát (%)': parseFloat(lossPercent.toFixed(1)),
        'Cấp (m³)': supply,
        'Tiêu thụ (m³)': consumption
      };
    });
  }, [records]);

  return (
    <div className="h-full bg-slate-50 flex flex-col p-3 pt-[calc(0.5rem+var(--sat))] animate-in slide-in-from-bottom duration-200 overflow-y-auto pb-32">
      <header className="flex items-center justify-between mb-3 bg-white p-2.5 rounded-xl border shadow-sm sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-2 bg-slate-100 rounded-full text-slate-800 active:scale-90"><ChevronLeft size={22}/></button>
          <h1 className="text-base font-black uppercase italic text-slate-900 tracking-tight">Quản lý thất thoát</h1>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button 
            onClick={onShowDailyTracking}
            className="p-2 mr-1 rounded-lg bg-indigo-100 text-indigo-600 shadow-sm flex items-center gap-1 active:scale-95 transition-all text-[10px] font-black uppercase"
          >
            <Activity size={16}/> Theo dõi ngày
          </button>
          <button 
            onClick={() => setActiveView('table')}
            className={`p-2 rounded-lg transition-all ${activeView === 'table' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
          ><TableIcon size={18}/></button>
          <button 
            onClick={() => setActiveView('chart')}
            className={`p-2 rounded-lg transition-all ${activeView === 'chart' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
          ><BarChart3 size={18}/></button>
        </div>
      </header>

      {activeView === 'chart' ? (
        <div className="bg-white p-4 rounded-[2rem] border-2 border-slate-100 shadow-sm mb-4 h-[400px]">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 italic text-center">Biểu đồ xu hướng thất thoát (%)</p>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorLoss" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 800, fill: '#64748b'}} />
              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 800, fill: '#64748b'}} />
              <Tooltip 
                contentStyle={{borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 800, fontSize: '12px'}}
              />
              <Area type="monotone" dataKey="Thất thoát (%)" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorLoss)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-3xl flex items-start gap-3 shadow-sm">
            <div className="bg-indigo-100 text-indigo-700 p-2 rounded-xl mt-0.5">
              <RefreshCw size={16} />
            </div>
            <div>
              <h4 className="text-xs font-black text-indigo-900 uppercase">💡 Khôi phục sửa lỗi báo cáo</h4>
              <p className="text-[11px] text-indigo-700 font-medium leading-relaxed mt-1">
                Nếu số liệu Kỳ báo cáo (như Kỳ 5/2026) chưa hoàn tất hoặc bị sai do cập nhật muộn, bạn chỉ cần bấm nút <b>Sửa</b> (biểu tượng <b>Sấm sét màu xanh</b>) của kỳ đó, sau đó nhấp vào <b>"Tự động lấy số liệu từ Nhật ký hằng ngày"</b> để ứng dụng tự động đồng bộ lại chuẩn xác 100% từ nhật ký ghi nước hằng ngày!
              </p>
            </div>
          </div>

          <button 
            onClick={() => {
              if (!showAdd) {
                setManualList1Vol(currentStats.list1Vol.toString());
                setManualList2Vol(currentStats.list2Vol.toString());
                
                // Tự động điền số cũ từ bản ghi gần nhất
                if (records.length > 0) {
                  const latest = records[0]; // Records are usually sorted by created date desc
                  setM1Old(latest.master1New.toString());
                  setM2Old(latest.master2New.toString());
                  
                  // Gợi ý kỳ tiếp theo
                  const lastPeriod = parseInt(latest.period);
                  if (!isNaN(lastPeriod)) setPeriod((lastPeriod + 1).toString());
                  
                  // Goi y thang tiep theo
                  setMonth(getBillingMonthYear());
                }
              }
              setShowAdd(!showAdd);
            }}
            className="w-full bg-blue-600 text-white py-4 rounded-xl font-black uppercase flex justify-center items-center gap-2 shadow-lg active:scale-95 border-b-4 border-blue-800"
          >
            <Plus size={20}/> {showAdd ? 'Đóng form' : 'Ghi nhận kỳ mới'}
          </button>

          <AnimatePresence>
            {showAdd && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-white p-5 rounded-[2.5rem] border-2 border-blue-100 shadow-xl space-y-4 mb-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-1 block">Kỳ</label>
                      <input value={period} onChange={e => setPeriod(e.target.value)} placeholder="VD: 12" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3.5 text-lg font-black outline-none focus:border-blue-500 shadow-inner" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block tracking-wider">Tháng</label>
                      <input value={month} onChange={e => setMonth(e.target.value)} placeholder="VD: Dec-25" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3.5 text-lg font-black outline-none focus:border-blue-500 shadow-inner" />
                    </div>
                  </div>

                  <button 
                    type="button" 
                    onClick={() => handleAutoFillFromDaily(month, false)}
                    className="w-full py-3 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-2xl text-indigo-700 font-bold text-xs uppercase flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-sm"
                  >
                    <RefreshCw size={14} /> Điền từ Nhật ký hằng ngày
                  </button>

                  <div className="bg-slate-50 p-5 rounded-[2rem] space-y-3.5 border-2 border-slate-100/50 shadow-sm">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-center italic">Đồng hồ tổng số 1</p>
                    <div className="grid grid-cols-2 gap-4">
                      <input type="number" value={m1New} onChange={e => setM1New(e.target.value)} placeholder="Số mới" className="w-full bg-white border-2 border-slate-200 rounded-2xl px-4 py-4 text-xl font-black outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all text-center placeholder:text-slate-300 shadow-sm" />
                      <input type="number" value={m1Old} onChange={e => setM1Old(e.target.value)} placeholder="Số cũ" className="w-full bg-white border-2 border-slate-200 rounded-2xl px-4 py-4 text-xl font-black outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all text-center placeholder:text-slate-300 shadow-sm" />
                    </div>
                  </div>

                  <div className="bg-slate-50 p-5 rounded-[2rem] space-y-3.5 border-2 border-slate-100/50 shadow-sm">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-center italic">Đồng hồ tổng số 2</p>
                    <div className="grid grid-cols-2 gap-4">
                      <input type="number" value={m2New} onChange={e => setM2New(e.target.value)} placeholder="Số mới" className="w-full bg-white border-2 border-slate-200 rounded-2xl px-4 py-4 text-xl font-black outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all text-center placeholder:text-slate-300 shadow-sm" />
                      <input type="number" value={m2Old} onChange={e => setM2Old(e.target.value)} placeholder="Số cũ" className="w-full bg-white border-2 border-slate-200 rounded-2xl px-4 py-4 text-xl font-black outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all text-center placeholder:text-slate-300 shadow-sm" />
                    </div>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 space-y-3">
                    <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest text-center italic">Tiêu thụ từ Danh bộ (M3)</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[8px] font-black text-blue-400 uppercase ml-2 mb-1 block">Bộ 01</label>
                        <input type="number" value={manualList1Vol} onChange={e => setManualList1Vol(e.target.value)} className="w-full bg-white border-2 border-blue-100 rounded-xl px-4 py-2 text-sm font-black outline-none focus:border-blue-500" />
                      </div>
                      <div>
                        <label className="text-[8px] font-black text-blue-400 uppercase ml-2 mb-1 block">Bộ 02</label>
                        <input type="number" value={manualList2Vol} onChange={e => setManualList2Vol(e.target.value)} className="w-full bg-white border-2 border-blue-100 rounded-xl px-4 py-2 text-sm font-black outline-none focus:border-blue-500" />
                      </div>
                    </div>
                    <p className="text-[8px] font-bold text-blue-300 italic text-center">* App tự điền số hiện tại, bạn có thể sửa nếu nhập cho tháng cũ</p>
                  </div>

                  <button onClick={handleAdd} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase shadow-lg active:scale-95">Lưu bản ghi</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-3">
            {records.map(r => {
              const supply1 = r.master1New - r.master1Old;
              const supply2 = r.master2New - r.master2Old;
              const totalSupply = supply1 + supply2;
              const totalConsumption = r.list1Volume + r.list2Volume;
              const loss = totalSupply - totalConsumption;
              const lossPercent = totalSupply > 0 ? (loss / totalSupply) * 100 : 0;

              const isEditing = editingId === r.id;

              return (
                <div key={r.id} className="bg-white p-4 rounded-[2rem] border-2 border-slate-100 shadow-sm relative overflow-hidden group transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="bg-slate-900 text-white text-[11px] font-black px-2.5 py-1 rounded-xl uppercase tracking-wider">Kỳ {r.period}</span>
                        <span className="text-lg font-black text-slate-900">{r.month}</span>
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 italic">Ngày tạo: {new Date(r.createdAt).toLocaleDateString('vi-VN')}</p>
                    </div>
                    <div className="flex gap-2">
                       {isEditing ? (
                          <div className="flex gap-1 animate-in fade-in zoom-in duration-200">
                             <button 
                               onClick={() => {
                                 onUpdate(r.id, editData);
                                 setEditingId(null);
                               }} 
                               className="p-2 bg-emerald-500 text-white rounded-xl shadow-sm active:scale-95"
                             ><Save size={18}/></button>
                             <button onClick={() => setEditingId(null)} className="p-2 bg-slate-100 text-slate-400 rounded-xl active:scale-90 font-black text-[10px] uppercase px-3">Hủy</button>
                          </div>
                       ) : (
                          <>
                             <button 
                               onClick={async () => {
                                 try {
                                   await exportLossPeriodReportToExcel(r, dailySupplyReadings);
                                 } catch (err) {
                                   alert("Có lỗi khi xuất Excel!");
                                   console.error(err);
                                 }
                               }}
                               className="p-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl active:scale-90 flex items-center gap-1 text-[10px] font-black uppercase px-2.5 shadow-sm border border-emerald-100"
                               title="Xuất báo cáo thất thoát nước chi tiết kèm nhật ký hằng ngày"
                             >
                               <Download size={14}/> Báo cáo
                             </button>
                             <button 
                               onClick={() => {
                                 setEditingId(r.id);
                                 setEditData({ ...r });
                               }} 
                               className="p-1.5 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl active:scale-90 flex items-center gap-1 text-[10px] font-black uppercase px-2.5 shadow-sm border border-blue-100"
                             ><Edit2 size={12}/> Sửa số liệu</button>
                          </>
                       )}
                       <button onClick={() => onDelete(r.id)} className="p-2 text-slate-200 hover:text-rose-500 transition-colors active:scale-90"><Trash2 size={18}/></button>
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="bg-blue-50 p-4 rounded-[2.5rem] border-2 border-blue-100 shadow-inner mb-4 animate-in slide-in-from-top-2 duration-300 space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[9px] font-black text-blue-400 uppercase ml-2 mb-1 block">Kỳ</label>
                          <input value={editData.period || ''} onChange={e => setEditData({...editData, period: e.target.value})} className="w-full bg-white border-2 border-blue-100 rounded-xl px-4 py-2 text-sm font-black" />
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-blue-400 uppercase ml-2 mb-1 block">Tháng</label>
                          <input value={editData.month || ''} onChange={e => setEditData({...editData, month: e.target.value})} className="w-full bg-white border-2 border-blue-100 rounded-xl px-4 py-2 text-sm font-black" />
                        </div>
                      </div>

                      <button 
                        type="button" 
                        onClick={() => handleAutoFillFromDaily(editData.month || '', true)}
                        className="w-full py-2 bg-indigo-100 hover:bg-indigo-200 rounded-xl text-indigo-700 font-bold text-[10px] uppercase flex items-center justify-center gap-1 active:scale-95 transition-all shadow-sm animate-pulse-slow"
                      >
                        <RefreshCw size={12} /> Tự động lấy số liệu từ Nhật ký hằng ngày
                      </button>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <p className="text-[9px] font-black text-blue-500 uppercase text-center italic">Đồng hồ 1</p>
                           <input type="number" value={editData.master1New} onChange={e => setEditData({...editData, master1New: parseFloat(e.target.value) || 0})} placeholder="Mới" className="w-full bg-white border-2 border-blue-100 rounded-xl px-3 py-2 text-sm font-black text-center" />
                           <input type="number" value={editData.master1Old} onChange={e => setEditData({...editData, master1Old: parseFloat(e.target.value) || 0})} placeholder="Cũ" className="w-full bg-white border-2 border-blue-100 rounded-xl px-3 py-2 text-sm font-black text-center" />
                        </div>
                        <div className="space-y-2">
                           <p className="text-[9px] font-black text-blue-500 uppercase text-center italic">Đồng hồ 2</p>
                           <input type="number" value={editData.master2New} onChange={e => setEditData({...editData, master2New: parseFloat(e.target.value) || 0})} placeholder="Mới" className="w-full bg-white border-2 border-blue-100 rounded-xl px-3 py-2 text-sm font-black text-center" />
                           <input type="number" value={editData.master2Old} onChange={e => setEditData({...editData, master2Old: parseFloat(e.target.value) || 0})} placeholder="Cũ" className="w-full bg-white border-2 border-blue-100 rounded-xl px-3 py-2 text-sm font-black text-center" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[10px] font-black text-blue-500 uppercase text-center italic">Tiêu thụ từ Danh bộ</p>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-[9px] font-black text-blue-400 uppercase ml-2 mb-1 block">Bộ 01 (M3)</label>
                            <input type="number" value={editData.list1Volume} onChange={e => setEditData({...editData, list1Volume: parseFloat(e.target.value) || 0})} className="w-full bg-white border-2 border-blue-200 rounded-2xl px-4 py-2 text-lg font-black text-center outline-none focus:border-blue-600" />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-blue-400 uppercase ml-2 mb-1 block">Bộ 02 (M3)</label>
                            <input type="number" value={editData.list2Volume} onChange={e => setEditData({...editData, list2Volume: parseFloat(e.target.value) || 0})} className="w-full bg-white border-2 border-blue-200 rounded-2xl px-4 py-2 text-lg font-black text-center outline-none focus:border-blue-600" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2.5 mb-4">
                      <div className="bg-slate-50 border-2 border-slate-100/50 p-3 rounded-[2rem] text-center shadow-sm">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">Tổng cấp</p>
                        <p className="text-xl font-black text-slate-900 leading-none">{totalSupply} <span className="text-[10px]">m³</span></p>
                      </div>
                      <div className="bg-slate-50 border-2 border-slate-100/50 p-3 rounded-[2rem] text-center shadow-sm">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">Tiêu thụ</p>
                        <p className="text-xl font-black text-slate-900 leading-none">{totalConsumption} <span className="text-[10px]">m³</span></p>
                      </div>
                      <div className={`${loss > 0 ? 'bg-rose-50 border-rose-100 text-rose-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700'} border-2 p-3 rounded-[2rem] text-center shadow-md`}>
                        <p className="text-[10px] font-black uppercase mb-1 tracking-widest">Hao hụt</p>
                        <p className="text-xl font-black leading-none">{loss} <span className="text-[10px]">m³</span></p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl">
                    <div className={`p-2 rounded-xl ${lossPercent > 10 ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                      <TrendingDown size={18} />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tỷ lệ hao hụt</span>
                        <span className={`text-[15px] font-black ${lossPercent > 10 ? 'text-rose-600 underline decoration-2 underline-offset-4' : 'text-emerald-600'}`}>{lossPercent.toFixed(1)}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-1000 ${lossPercent > 10 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                          style={{ width: `${Math.min(100, lossPercent)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Details for meters */}
                  <div className="mt-4 pt-4 border-t-2 border-slate-50 grid grid-cols-2 gap-3">
                    <div className="bg-slate-50/80 p-3 rounded-2xl border-2 border-slate-100/50 shadow-sm">
                      <p className="text-[11px] font-black text-slate-500 uppercase mb-2 tracking-tight">Đồng hồ 1: <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100 text-[18px]">{supply1} m³</span></p>
                      <div className="text-[15px] font-black text-slate-700 bg-white px-3 py-2 rounded-xl border-2 border-slate-100 flex justify-between items-center shadow-inner">
                        <span className="opacity-60">{r.master1Old}</span>
                        <div className="flex flex-col items-center leading-none">
                          <span className="text-slate-300 text-[10px]">ĐẾN</span>
                          <span className="text-blue-400">→</span>
                        </div>
                        <span className="text-slate-900 border-b-2 border-blue-200">{r.master1New}</span>
                      </div>
                    </div>
                    <div className="bg-slate-50/80 p-3 rounded-2xl border-2 border-slate-100/50 shadow-sm">
                      <p className="text-[11px] font-black text-slate-500 uppercase mb-2 tracking-tight">Đồng hồ 2: <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100 text-[18px]">{supply2} m³</span></p>
                      <div className="text-[15px] font-black text-slate-700 bg-white px-3 py-2 rounded-xl border-2 border-slate-100 flex justify-between items-center shadow-inner">
                        <span className="opacity-60">{r.master2Old}</span>
                        <div className="flex flex-col items-center leading-none">
                          <span className="text-slate-300 text-[10px]">ĐẾN</span>
                          <span className="text-blue-400">→</span>
                        </div>
                        <span className="text-slate-900 border-b-2 border-blue-200">{r.master2New}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {records.length === 0 && !showAdd && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-300">
          <Droplets size={64} className="mb-4 opacity-20" />
          <p className="font-black uppercase tracking-widest text-xs">Chưa có bản ghi thất thoát</p>
          <p className="text-[10px] font-bold italic mt-1">Bấm nút trên để bắt đầu theo dõi</p>
        </div>
      )}
    </div>
  );
};
