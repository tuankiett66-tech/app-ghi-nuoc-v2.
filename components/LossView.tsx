
import React, { useState, useMemo } from 'react';
import { ChevronLeft, Plus, Trash2, TrendingDown, BarChart3, Table as TableIcon, Droplets, AlertTriangle } from 'lucide-react';
import { LossRecord, Customer } from '../types';
import { formatCurrency } from '../utils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';

interface LossViewProps {
  records: LossRecord[];
  customers: Customer[];
  onBack: () => void;
  onAdd: (record: Omit<LossRecord, 'id' | 'createdAt'>) => void;
  onDelete: (id: string) => void;
}

export const LossView: React.FC<LossViewProps> = ({ records, customers, onBack, onAdd, onDelete }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [activeView, setActiveView] = useState<'table' | 'chart'>('table');

  // Form state
  const [period, setPeriod] = useState('');
  const [month, setMonth] = useState('');
  const [m1New, setM1New] = useState('');
  const [m1Old, setM1Old] = useState('');
  const [m2New, setM2New] = useState('');
  const [m2Old, setM2Old] = useState('');
  const [manualList1Vol, setManualList1Vol] = useState('');
  const [manualList2Vol, setManualList2Vol] = useState('');

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
                }
              }
              setShowAdd(!showAdd);
            }}
            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase flex justify-center items-center gap-2 shadow-lg active:scale-95 border-b-4 border-blue-800"
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
                      <input value={period} onChange={e => setPeriod(e.target.value)} placeholder="VD: 12" className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2.5 text-sm font-black outline-none focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-1 block">Tháng</label>
                      <input value={month} onChange={e => setMonth(e.target.value)} placeholder="VD: Dec-25" className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2.5 text-sm font-black outline-none focus:border-blue-500" />
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl space-y-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Đồng hồ tổng số 1</p>
                    <div className="grid grid-cols-2 gap-3">
                      <input type="number" value={m1New} onChange={e => setM1New(e.target.value)} placeholder="Số mới" className="w-full bg-white border-2 border-slate-100 rounded-xl px-4 py-2.5 text-sm font-black outline-none focus:border-blue-500" />
                      <input type="number" value={m1Old} onChange={e => setM1Old(e.target.value)} placeholder="Số cũ" className="w-full bg-white border-2 border-slate-100 rounded-xl px-4 py-2.5 text-sm font-black outline-none focus:border-blue-500" />
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl space-y-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Đồng hồ tổng số 2</p>
                    <div className="grid grid-cols-2 gap-3">
                      <input type="number" value={m2New} onChange={e => setM2New(e.target.value)} placeholder="Số mới" className="w-full bg-white border-2 border-slate-100 rounded-xl px-4 py-2.5 text-sm font-black outline-none focus:border-blue-500" />
                      <input type="number" value={m2Old} onChange={e => setM2Old(e.target.value)} placeholder="Số cũ" className="w-full bg-white border-2 border-slate-100 rounded-xl px-4 py-2.5 text-sm font-black outline-none focus:border-blue-500" />
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

              return (
                <div key={r.id} className="bg-white p-4 rounded-[2rem] border-2 border-slate-100 shadow-sm relative overflow-hidden group">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="bg-slate-900 text-white text-[10px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider">Kỳ {r.period}</span>
                        <span className="text-sm font-black text-slate-900">{r.month}</span>
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 italic">Ngày tạo: {new Date(r.createdAt).toLocaleDateString('vi-VN')}</p>
                    </div>
                    <button onClick={() => onDelete(r.id)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors active:scale-90"><Trash2 size={18}/></button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-2xl text-center">
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Tổng cấp</p>
                      <p className="text-base font-black text-slate-900 leading-none">{totalSupply} <span className="text-[9px]">m³</span></p>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-2xl text-center">
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Tiêu thụ</p>
                      <p className="text-base font-black text-slate-900 leading-none">{totalConsumption} <span className="text-[9px]">m³</span></p>
                    </div>
                    <div className={`${loss > 0 ? 'bg-rose-50 border-rose-100 text-rose-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700'} border p-2.5 rounded-2xl text-center shadow-sm`}>
                      <p className="text-[9px] font-black uppercase mb-0.5">Thất thoát</p>
                      <p className="text-base font-black leading-none">{loss} <span className="text-[9px]">m³</span></p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl">
                    <div className={`p-2 rounded-xl ${lossPercent > 10 ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                      <TrendingDown size={18} />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tỷ lệ hao hụt</span>
                        <span className={`text-sm font-black ${lossPercent > 10 ? 'text-rose-600' : 'text-emerald-600'}`}>{lossPercent.toFixed(1)}%</span>
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
                  <div className="mt-3 pt-3 border-t-2 border-slate-50 grid grid-cols-2 gap-4">
                    <div className="bg-slate-50/80 p-2 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Đồng hồ 1: <span className="text-blue-600">{supply1} m³</span></p>
                      <p className="text-[11px] font-black text-slate-400 bg-white px-2 py-1 rounded-lg border border-slate-100 flex justify-between">
                        <span>{r.master1Old}</span>
                        <span className="text-slate-300">→</span>
                        <span>{r.master1New}</span>
                      </p>
                    </div>
                    <div className="bg-slate-50/80 p-2 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Đồng hồ 2: <span className="text-blue-600">{supply2} m³</span></p>
                      <p className="text-[11px] font-black text-slate-400 bg-white px-2 py-1 rounded-lg border border-slate-100 flex justify-between">
                        <span>{r.master2Old}</span>
                        <span className="text-slate-300">→</span>
                        <span>{r.master2New}</span>
                      </p>
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
