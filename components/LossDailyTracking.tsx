
import React, { useState, useMemo } from 'react';
import { ChevronLeft, Plus, Trash2, Calendar, TrendingUp, AlertCircle, Save, History, Activity } from 'lucide-react';
import { DailySupplyReading } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, ReferenceLine } from 'recharts';

interface LossDailyTrackingProps {
  readings: DailySupplyReading[];
  onBack: () => void;
  onAdd: (reading: Omit<DailySupplyReading, 'id' | 'updatedAt' | 'consumption1' | 'consumption2'>) => void;
  onDelete: (id: string) => void;
}

export const LossDailyTracking: React.FC<LossDailyTrackingProps> = ({ readings, onBack, onAdd, onDelete }) => {
  const [activeTab, setActiveTab] = useState<'record' | 'history' | 'chart'>('record');
  
  // Form state
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [m1, setM1] = useState('');
  const [m2, setM2] = useState('');
  const [notes, setNotes] = useState('');

  const handleAdd = () => {
    if (!m1 || !m2) {
      alert("Vui lòng nhập chỉ số của cả 2 đồng hồ");
      return;
    }
    onAdd({
      date,
      master1: parseFloat(m1),
      master2: parseFloat(m2),
      notes
    });
    setM1(''); setM2(''); setNotes('');
    setActiveTab('history');
  };

  const chartData = useMemo(() => {
    return [...readings].reverse().map(r => ({
      date: r.date.split('-').slice(1).reverse().join('/'), // DD/MM
      'Tổng tiêu thụ': (r.consumption1 || 0) + (r.consumption2 || 0),
      'Đồng hồ 1': r.consumption1 || 0,
      'Đồng hồ 2': r.consumption2 || 0,
    }));
  }, [readings]);

  const avgConsumption = useMemo(() => {
    if (readings.length === 0) return 0;
    const totals = readings.map(r => (r.consumption1 || 0) + (r.consumption2 || 0));
    return totals.reduce((a, b) => a + b, 0) / totals.length;
  }, [readings]);

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
        <div className="flex bg-slate-100 p-1.5 rounded-2xl">
          <button onClick={() => setActiveTab('record')} className={`p-2 rounded-xl transition-all ${activeTab === 'record' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}><Plus size={18}/></button>
          <button onClick={() => setActiveTab('history')} className={`p-2 rounded-xl transition-all ${activeTab === 'history' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}><History size={18}/></button>
          <button onClick={() => setActiveTab('chart')} className={`p-2 rounded-xl transition-all ${activeTab === 'chart' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}><Activity size={18}/></button>
        </div>
      </header>

      {activeTab === 'record' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="bg-white p-6 rounded-[2.5rem] border-2 border-blue-50 shadow-xl space-y-5">
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-3 mb-1.5 block">Ngày ghi chỉ số</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-12 pr-4 py-4 text-xl font-black outline-none focus:border-blue-500 shadow-inner" />
                </div>
              </div>

              <div className="bg-slate-50 p-6 rounded-[2.2rem] border-2 border-slate-100/50 shadow-sm space-y-4">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center italic">Đồng hồ tổng số 1</p>
                <input type="number" value={m1} onChange={e => setM1(e.target.value)} placeholder="Nhập chỉ số mới" className="w-full bg-white border-2 border-slate-200 rounded-2xl px-6 py-5 text-2xl font-black text-center outline-none focus:border-blue-600 focus:ring-8 focus:ring-blue-100 transition-all placeholder:text-slate-200 shadow-sm" />
              </div>

              <div className="bg-slate-50 p-6 rounded-[2.2rem] border-2 border-slate-100/50 shadow-sm space-y-4">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center italic">Đồng hồ tổng số 2</p>
                <input type="number" value={m2} onChange={e => setM2(e.target.value)} placeholder="Nhập chỉ số mới" className="w-full bg-white border-2 border-slate-200 rounded-2xl px-6 py-5 text-2xl font-black text-center outline-none focus:border-blue-600 focus:ring-8 focus:ring-blue-100 transition-all placeholder:text-slate-200 shadow-sm" />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-3 mb-1.5 block tracking-widest">Ghi chú (nếu có)</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Vd: Đã đi kiểm tra đường ống..." className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-blue-500 shadow-inner h-24" />
              </div>
            </div>

            <button onClick={handleAdd} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase text-lg shadow-xl shadow-blue-200 active:scale-95 flex items-center justify-center gap-3">
              <Save size={20}/> Lưu dữ liệu ngày
            </button>
          </div>

          <div className="bg-amber-50 border-2 border-amber-100 p-5 rounded-[2rem] flex gap-4">
            <div className="bg-amber-100 p-3 rounded-2xl text-amber-600 self-start"><AlertCircle size={24}/></div>
            <div>
              <p className="text-sm font-black text-amber-900 mb-1 tracking-tight">Hướng dẫn quản lý thất thoát</p>
              <p className="text-[11px] font-bold text-amber-700 leading-relaxed italic opacity-80">
                Hãy tạo thói quen ghi chỉ số vào một khung giờ cố định mỗi ngày (Vd: 8h sáng). App sẽ tự tính toán lượng m3 tiêu thụ so với ngày hôm trước để giúp bạn nhận diện biến động bất thường.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === 'history' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          {readings.length === 0 ? (
            <div className="py-20 text-center text-slate-300">
              <History size={48} className="mx-auto mb-3 opacity-20" />
              <p className="font-black uppercase text-xs tracking-widest leading-loose">Chưa có lịch sử hàng ngày<br/><span className="text-[10px] font-bold italic lowercase italic">vui lòng nhập dữ liệu ở tab đầu tiên</span></p>
            </div>
          ) : (
            readings.map((r, idx) => {
              const totalCons = (r.consumption1 || 0) + (r.consumption2 || 0);
              const isHigh = totalCons > avgConsumption * 1.5;
              
              return (
                <div key={r.id} className="bg-white p-4 rounded-[2rem] border-2 border-slate-100 shadow-sm relative overflow-hidden">
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                       <span className="bg-slate-900 text-white text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest">{r.date.split('-').reverse().join('/')}</span>
                       {isHigh && <span className="bg-rose-100 text-rose-600 text-[9px] font-black px-2 py-1 rounded-lg uppercase animate-pulse border border-rose-200">Bất thường</span>}
                    </div>
                    <button onClick={() => onDelete(r.id)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={18}/></button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="bg-slate-50 border-2 border-slate-100/50 p-4 rounded-[2rem] shadow-sm">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 italic text-center">Tiêu thụ M1</p>
                      <p className="text-2xl font-black text-slate-900 text-center leading-none tracking-tighter">{r.consumption1} <span className="text-[10px] uppercase opacity-50 tracking-normal">m3</span></p>
                      <div className="mt-2 text-[10px] font-bold text-slate-400 text-center border-t border-slate-200 pt-1">CS: {r.master1}</div>
                    </div>
                    <div className="bg-slate-50 border-2 border-slate-100/50 p-4 rounded-[2rem] shadow-sm">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 italic text-center">Tiêu thụ M2</p>
                      <p className="text-2xl font-black text-slate-900 text-center leading-none tracking-tighter">{r.consumption2} <span className="text-[10px] uppercase opacity-50 tracking-normal">m3</span></p>
                      <div className="mt-2 text-[10px] font-bold text-slate-400 text-center border-t border-slate-200 pt-1">CS: {r.master2}</div>
                    </div>
                  </div>

                  <div className={`p-4 rounded-[2rem] border-2 flex items-center justify-between ${isHigh ? 'bg-rose-50 border-rose-100 text-rose-700' : 'bg-blue-50 border-blue-100 text-blue-700'}`}>
                    <div className="flex items-center gap-3">
                      <TrendingUp size={20} className={isHigh ? 'animate-bounce' : ''} />
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black uppercase opacity-60 tracking-wider">Tổng tiêu thụ ngày</span>
                        <span className="text-xl font-black leading-none">{totalCons} m³</span>
                      </div>
                    </div>
                    <div className="text-right">
                       <span className="text-[8px] font-black uppercase opacity-60 block">Trung bình</span>
                       <span className="text-sm font-black opacity-80">{avgConsumption.toFixed(1)} m³</span>
                    </div>
                  </div>
                  
                  {r.notes && (
                    <div className="mt-3 bg-amber-50 border-2 border-amber-100/50 p-3 rounded-2xl text-[11px] font-bold text-amber-700 italic">
                      💡 {r.notes}
                    </div>
                  )}
                </div>
              );
            })
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
                  {readings.length > 0 ? Math.max(...readings.map(r => (r.consumption1 || 0) + (r.consumption2 || 0))) : 0} 
                  <span className="text-xs uppercase opacity-50 ml-1">m3</span>
                </p>
             </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};
