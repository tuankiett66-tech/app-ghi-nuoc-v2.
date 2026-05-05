
import React, { useState, useMemo } from 'react';
import { ChevronLeft, Plus, Trash2, Calendar, TrendingUp, AlertCircle, Save, History, Activity } from 'lucide-react';
import { DailySupplyReading, SystemConfig } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, ReferenceLine } from 'recharts';
import { formatCurrency } from '../utils';

interface LossDailyTrackingProps {
  readings: DailySupplyReading[];
  config: SystemConfig;
  setConfig: React.Dispatch<React.SetStateAction<SystemConfig>>;
  onBack: () => void;
  onAdd: (reading: Omit<DailySupplyReading, 'id' | 'updatedAt' | 'consumption1' | 'consumption2'>) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<DailySupplyReading>) => void;
}

export const LossDailyTracking: React.FC<LossDailyTrackingProps> = ({ readings, config, setConfig, onBack, onAdd, onDelete, onUpdate }) => {
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

  const handleAdd = () => {
    if (!m1 || !m2) {
      alert("Vui lòng nhập chỉ số của cả 2 đồng hồ");
      return;
    }
    onAdd({
      date,
      time,
      master1: parseFloat(m1),
      master2: parseFloat(m2),
      notes
    });
    setM1(''); setM2(''); setNotes('');
    setActiveTab('history');
  };

  const handleStartEdit = (r: DailySupplyReading) => {
    setEditingId(r.id);
    setEditData({ ...r });
  };

  const handleSaveEdit = () => {
    if (editingId && editData) {
      onUpdate(editingId, editData);
      setEditingId(null);
    }
  };

  const handleSaveInitial = () => {
    setConfig(prev => ({
      ...prev,
      master1Initial: parseFloat(tempM1Init) || 0,
      master2Initial: parseFloat(tempM2Init) || 0
    }));
    setShowInitialSettings(false);
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
                {readings.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center text-slate-300">
                      <History size={48} className="mx-auto mb-3 opacity-20" />
                      <p className="font-black uppercase text-[10px] tracking-widest leading-loose">Chưa có dữ liệu hàng ngày</p>
                    </td>
                  </tr>
                ) : (
                  readings.map((r, idx) => {
                    const totalCons = (r.consumption1 || 0) + (r.consumption2 || 0);
                    const isHigh = totalCons > avgConsumption * 1.5 && readings.length > 3;
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
                                <span className="text-xs font-black text-slate-900">{r.date.split('-').reverse().slice(0, 2).join('/')}</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase">{r.time || '--:--'}</span>
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-3 text-center">
                            {isEditing ? (
                              <input type="number" value={editData.master1} onChange={e => setEditData({...editData, master1: parseFloat(e.target.value)})} className="w-16 text-xs text-center border rounded p-1 font-black" />
                            ) : (
                              <div className="flex flex-col items-center" onClick={() => handleStartEdit(r)}>
                                <span className="text-sm font-black text-blue-600">{r.consumption1}</span>
                                <span className="text-[8px] font-bold text-slate-400 uppercase">CS: {r.master1}</span>
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-3 text-center">
                            {isEditing ? (
                              <input type="number" value={editData.master2} onChange={e => setEditData({...editData, master2: parseFloat(e.target.value)})} className="w-16 text-xs text-center border rounded p-1 font-black" />
                            ) : (
                              <div className="flex flex-col items-center" onClick={() => handleStartEdit(r)}>
                                <span className="text-sm font-black text-indigo-600">{r.consumption2}</span>
                                <span className="text-[8px] font-bold text-slate-400 uppercase">CS: {r.master2}</span>
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
               <p className="text-xl font-black text-blue-400">{readings.length} <span className="text-[10px] font-black text-slate-500">NGÀY</span></p>
            </div>
          </div>
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
