
import React, { useState, useMemo } from 'react';
import { ChevronLeft, Plus, X, MessageCircle, Trash2, Copy, Info, UserCheck, Mic } from 'lucide-react';
import { Customer, SystemConfig, WaterGroup } from '../types';
import { formatCurrency, copyToClipboard, normalizePhoneForZalo } from '../utils';

interface GroupDetailViewProps {
  group: WaterGroup;
  customers: Customer[];
  config: SystemConfig;
  onBack: () => void;
  onUpdateGroup: (groupId: string, updates: Partial<WaterGroup>) => void;
  onSendZalo: (msg: string, sdt: string) => void;
}

export const GroupDetailView: React.FC<GroupDetailViewProps> = ({ group, customers, config, onBack, onUpdateGroup, onSendZalo }) => {
  const [sttInput, setSttInput] = useState('');
  const [sourceInput, setSourceInput] = useState<'list1' | 'list2'>('list1');

  const previewCust = useMemo(() => {
    const val = parseInt(sttInput);
    if (isNaN(val)) return null;
    return customers.find(c => c.stt === val && c.listType === sourceInput);
  }, [sttInput, sourceInput, customers]);

  const groupData = useMemo(() => {
    return (group.members || []).map(m => {
      return customers.find(c => c.stt === m.stt && c.listType === m.source);
    }).filter(Boolean) as Customer[];
  }, [group, customers]);

  const totals = useMemo(() => groupData.reduce((acc, curr) => ({
    vol: acc.vol + curr.volume,
    amt: acc.amt + curr.amount,
    debt: acc.debt + curr.oldDebt,
    total: acc.total + (curr.amount + curr.oldDebt)
  }), { vol: 0, amt: 0, debt: 0, total: 0 }), [groupData]);

  const handleAddMember = () => {
    if (!previewCust) {
        alert("STT " + sttInput + " không tồn tại ở Bộ " + (sourceInput === 'list1' ? '01' : '02'));
        return;
    }
    if ((group.members || []).some(m => m.stt === previewCust.stt && m.source === previewCust.listType)) {
        alert("Hộ này đã có sẵn trong nhóm này!");
        return;
    }
    onUpdateGroup(group.id, { members: [...(group.members || []), { stt: previewCust.stt, source: previewCust.listType }] });
    setSttInput('');
  };

  const handleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Hệ thống giọng nói không khả dụng.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'vi-VN';
    recognition.start();
    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      const stt = text.replace(/[^0-9]/g, '');
      if (stt) setSttInput(stt);
    };
  };

  const removeMember = (stt: number, source: string) => {
    onUpdateGroup(group.id, { members: (group.members || []).filter(m => !(m.stt === stt && m.source === source)) });
  };

  const generateGroupMsg = () => {
    const now = new Date();
    const monthYear = `${now.getMonth() + 1}/${now.getFullYear()}`;
    let msg = `KỲ NƯỚC THÁNG ${monthYear}\nNHÓM: ${group.name.toUpperCase()}\n---------------------------\n`;
    groupData.forEach((c) => {
      msg += `KH: ${c.name}\nSỐ: ${c.newIndex} - ${c.oldIndex} = ${c.volume}m3 x ${config.waterRate.toLocaleString('vi-VN')} = ${Math.round(c.amount).toLocaleString('vi-VN')}\nNỢ CŨ: ${Math.round(c.oldDebt).toLocaleString('vi-VN')}\nCỘNG: ${Math.round(c.amount + c.oldDebt).toLocaleString('vi-VN')}\n---------------------------\n`;
    });
    msg += `TỔNG THANH TOÁN: ${Math.round(totals.total).toLocaleString('vi-VN')} đ\n---\n${config.globalMessage}`;
    return msg;
  };

  return (
    <div className="fixed inset-0 bg-[#f8fafc] z-[250] flex flex-col pt-[calc(0.5rem+var(--sat))] animate-in slide-in-from-bottom duration-300">
      <header className="px-4 py-2 flex items-center justify-between bg-white border-b shadow-sm shrink-0">
        <div className="flex items-center gap-1">
            <button onClick={onBack} className="p-2 -ml-2 text-slate-800 active:scale-90"><ChevronLeft size={24}/></button>
            <h2 className="text-base font-black uppercase italic text-indigo-700 truncate w-44">{group.name}</h2>
        </div>
        <button onClick={() => { const n = prompt("Sửa tên nhóm:", group.name); if(n) onUpdateGroup(group.id, {name: n.toUpperCase()}); }} className="p-2 text-slate-400 active:scale-90"><Info size={20}/></button>
      </header>

      <div className="p-2 space-y-2 shrink-0">
        {/* Input Card Compact */}
        <div className="bg-white p-3 rounded-[1.5rem] shadow-md border border-indigo-50">
          <div className="flex justify-between items-center mb-2 px-1">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Nhập STT</p>
              <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 scale-90 origin-right">
                  <button onClick={() => setSourceInput('list1')} className={`px-2 py-1 rounded-md text-[8px] font-black uppercase transition-all ${sourceInput === 'list1' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400'}`}>BỘ 01</button>
                  <button onClick={() => setSourceInput('list2')} className={`px-2 py-1 rounded-md text-[8px] font-black uppercase transition-all ${sourceInput === 'list2' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400'}`}>BỘ 02</button>
              </div>
          </div>
          <div className="relative flex gap-2">
            <div className="relative flex-1">
                <input 
                  type="number" 
                  className="w-full bg-slate-50 p-3 pr-16 rounded-xl font-black text-2xl text-indigo-700 outline-none border-2 border-transparent focus:border-indigo-500 shadow-inner" 
                  placeholder="Số..."
                  value={sttInput}
                  onChange={e => setSttInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddMember()}
                />
                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {sttInput && <button onClick={() => setSttInput('')} className="p-1.5 text-rose-400 bg-white rounded-lg shadow-sm"><X size={16}/></button>}
                    <button onClick={handleVoiceInput} className="p-1.5 text-indigo-600 bg-white rounded-lg shadow-sm border border-indigo-50"><Mic size={18}/></button>
                </div>
            </div>
            <button onClick={handleAddMember} className="bg-indigo-600 text-white px-5 rounded-xl active:scale-95 shadow-md border-b-2 border-indigo-900 transition-transform"><Plus size={24}/></button>
          </div>
          {previewCust && (
            <div className="mt-2 p-2 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center justify-between animate-in slide-in-from-top-1">
               <div className="min-w-0">
                 <p className="font-black text-indigo-700 uppercase text-[12px] truncate">{previewCust.name}</p>
               </div>
               <UserCheck className="text-indigo-500 shrink-0" size={16} />
            </div>
          )}
        </div>

        {/* Master Phone Compact */}
        <div className="bg-white p-2 rounded-xl border shadow-sm flex items-center gap-3">
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-tighter whitespace-nowrap">Zalo Bill</label>
            <input className="flex-1 bg-indigo-50/50 p-2 rounded-lg font-black text-indigo-700 text-sm outline-none border border-transparent focus:border-indigo-300" value={group.masterSdt || ''} onChange={e => onUpdateGroup(group.id, { masterSdt: e.target.value })} placeholder="09xxxx..." />
        </div>
      </div>

      {/* Main List Optimized for Height */}
      <div className="flex-1 overflow-y-auto px-2 pb-52 space-y-1.5">
        {groupData.map((c) => (
          <div key={`${c.stt}-${c.listType}`} className="bg-white p-2.5 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center active:scale-[0.99] transition-all">
              <div className="flex items-center gap-2 min-w-0">
                  <div className="flex flex-col items-center gap-0.5 shrink-0">
                      <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black text-[11px] shadow-sm">{c.stt}</div>
                      <span className="text-[7px] font-black text-slate-400 uppercase">{c.listType === 'list1' ? 'B01' : 'B02'}</span>
                  </div>
                  <div className="min-w-0">
                      <p className="font-black text-slate-900 uppercase text-[12px] truncate leading-none mb-1">{c.name}</p>
                      <p className="text-[10px] text-slate-500 font-bold leading-none">{c.volume}m3 • {formatCurrency(c.amount + c.oldDebt)}</p>
                  </div>
              </div>
              <button onClick={() => removeMember(c.stt, c.listType)} className="p-2 text-rose-300 active:scale-90 transition-transform"><Trash2 size={18}/></button>
          </div>
        ))}
        {groupData.length === 0 && (
          <div className="py-8 text-center">
             <p className="text-slate-300 italic uppercase font-black text-[9px] tracking-widest">Danh sách đang trống</p>
          </div>
        )}
      </div>

      {/* Summary Section Compact */}
      <div className="fixed bottom-24 left-2 right-2 bg-white/95 backdrop-blur-md p-4 rounded-[2rem] shadow-2xl border-2 border-indigo-100 flex flex-col gap-3">
        <div className="flex justify-between items-center px-2">
            <p className="text-[9px] font-black text-indigo-800 uppercase italic tracking-wider">Tổng bill nhóm</p>
            <p className="text-3xl font-black text-indigo-700 tracking-tighter leading-none">{formatCurrency(totals.total)}</p>
        </div>
        <div className="grid grid-cols-12 gap-3">
            <button onClick={() => onSendZalo(generateGroupMsg(), group.masterSdt || '')} disabled={groupData.length === 0} className="col-span-8 bg-indigo-700 text-white py-4 rounded-2xl font-black uppercase flex items-center justify-center gap-2 shadow-lg active:scale-95 border-b-2 border-indigo-900 disabled:opacity-50 text-sm"><MessageCircle size={20}/> Gửi Zalo</button>
            <button onClick={async () => { const msg = generateGroupMsg(); await copyToClipboard(msg); alert("Đã copy!"); }} className="col-span-4 bg-slate-800 text-white py-4 rounded-2xl font-black uppercase flex items-center justify-center gap-1 shadow-lg active:scale-95 border-b-2 border-slate-950 disabled:opacity-50 text-sm"><Copy size={18}/> Bill</button>
        </div>
      </div>
    </div>
  );
};
