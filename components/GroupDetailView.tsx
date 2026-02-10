
import React, { useState, useMemo } from 'react';
import { ChevronLeft, Plus, X, MessageCircle, Trash2, Copy, Info, UserCheck, Mic } from 'lucide-react';
import { Customer, SystemConfig, WaterGroup } from '../types';
import { formatCurrency, copyToClipboard, generateVietQrUrl, normalizeString } from '../utils';

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
        alert("STT " + sttInput + " khong ton tai!");
        return;
    }
    if ((group.members || []).some(m => m.stt === previewCust.stt && m.source === previewCust.listType)) {
        alert("Ho nay da co trong nhom!");
        return;
    }
    onUpdateGroup(group.id, { members: [...(group.members || []), { stt: previewCust.stt, source: previewCust.listType }] });
    setSttInput('');
  };

  const handleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Khong ho tro giong noi");
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
    let msg = `KỲ NƯỚC THÁNG ${monthYear}
NHÓM: ${group.name.toUpperCase()}
---------------------------
`;
    groupData.forEach((c) => {
      msg += `KH: ${c.name}
SỐ: ${c.newIndex} - ${c.oldIndex} = ${c.volume}m3 x ${config.waterRate.toLocaleString('vi-VN')} = ${Math.round(c.amount).toLocaleString('vi-VN')}
NỢ CŨ: ${Math.round(c.oldDebt).toLocaleString('vi-VN')}
CỘNG: ${Math.round(c.amount + c.oldDebt).toLocaleString('vi-VN')}
---------------------------
`;
    });
    
    const totalAmt = Math.round(totals.total);
    msg += `TỔNG THANH TOÁN: ${totalAmt.toLocaleString('vi-VN')} đ\n`;
    
    const qrUrl = generateVietQrUrl(config.bankId, config.accountNo, totalAmt, group.name);
    const cleanGroupName = normalizeString(group.name).toUpperCase();

    msg += `
👉 CHUYỂN KHOẢN:
NH: ${config.bankId.toUpperCase()}
STK: ${config.accountNo}
TÊN: ${config.accountName}
Nội dung: TT NUOC ${cleanGroupName}

👉 HOẶC QUÉT MÃ QR TẠI ĐÂY:
${qrUrl}
(Chụp màn hình mã QR và mở App Ngân hàng để Quét ảnh)
---
${config.globalMessage}`;
    
    return msg;
  };

  return (
    <div className="fixed inset-0 bg-[#f8fafc] z-[250] flex flex-col pt-[calc(0.5rem+var(--sat))] animate-in slide-in-from-bottom duration-300">
      <header className="px-4 py-1.5 flex items-center justify-between bg-white border-b shadow-sm shrink-0">
        <div className="flex items-center gap-1">
            <button onClick={onBack} className="p-2 -ml-2 text-slate-800 active:scale-90"><ChevronLeft size={24}/></button>
            <h2 className="text-sm font-black uppercase italic text-indigo-700 truncate w-40">{group.name}</h2>
        </div>
        <button onClick={() => { const n = prompt("Sua ten nhom:", group.name); if(n) onUpdateGroup(group.id, {name: n.toUpperCase()}); }} className="p-2 text-slate-400 active:scale-90"><Info size={18}/></button>
      </header>

      <div className="p-2 space-y-1.5 shrink-0">
        <div className="bg-white p-2.5 rounded-[1.2rem] shadow-md border border-indigo-50">
          <div className="flex justify-between items-center mb-1.5 px-0.5">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic">"Nhat" ho dan bang STT</p>
              <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 scale-90 origin-right">
                  <button onClick={() => setSourceInput('list1')} className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase transition-all ${sourceInput === 'list1' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400'}`}>BO 01</button>
                  <button onClick={() => setSourceInput('list2')} className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase transition-all ${sourceInput === 'list2' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400'}`}>BO 02</button>
              </div>
          </div>
          <div className="relative flex gap-1.5">
            <div className="relative flex-1">
                <input 
                  type="number" 
                  className="w-full bg-slate-50 p-2.5 pr-14 rounded-xl font-black text-xl text-indigo-700 outline-none border-2 border-transparent focus:border-indigo-500 shadow-inner" 
                  placeholder="STT..."
                  value={sttInput}
                  onChange={e => setSttInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddMember()}
                />
                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                    {sttInput && <button onClick={() => setSttInput('')} className="p-1 text-rose-400"><X size={14}/></button>}
                    <button onClick={handleVoiceInput} className="p-1.5 text-indigo-600 bg-white rounded-lg shadow-sm border border-indigo-50"><Mic size={16}/></button>
                </div>
            </div>
            <button onClick={handleAddMember} className="bg-indigo-600 text-white px-4 rounded-xl active:scale-95 shadow-md border-b-2 border-indigo-900"><Plus size={22}/></button>
          </div>
          {previewCust && (
            <div className="mt-1.5 p-1.5 bg-indigo-50 rounded-lg border border-indigo-100 flex items-center justify-between animate-in slide-in-from-top-1">
               <p className="font-black text-indigo-700 uppercase text-[10px] truncate">{previewCust.name}</p>
               <UserCheck className="text-indigo-500 shrink-0" size={14} />
            </div>
          )}
        </div>

        <div className="bg-white p-1.5 rounded-xl border shadow-sm flex items-center gap-2">
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-tighter whitespace-nowrap px-1">Zalo Chu nhom</label>
            <input className="flex-1 bg-indigo-50/50 p-1.5 rounded-lg font-black text-indigo-700 text-[12px] outline-none border border-transparent focus:border-indigo-300" value={group.masterSdt || ''} onChange={e => onUpdateGroup(group.id, { masterSdt: e.target.value })} placeholder="09xxxx..." />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-44 space-y-1">
        {groupData.map((c) => (
          <div key={`${c.stt}-${c.listType}`} className="bg-white p-2 rounded-xl border border-slate-100 shadow-sm flex justify-between items-center active:scale-[0.99] transition-all">
              <div className="flex items-center gap-2 min-w-0">
                  <div className="flex flex-col items-center gap-0 shrink-0">
                      <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black text-[10px] shadow-sm">{c.stt}</div>
                      <span className="text-[6px] font-black text-slate-400 uppercase leading-none mt-0.5">{c.listType === 'list1' ? 'B01' : 'B02'}</span>
                  </div>
                  <div className="min-w-0">
                      <p className="font-black text-slate-900 uppercase text-[11px] truncate leading-none mb-0.5">{c.name}</p>
                      <p className="text-[9px] text-slate-500 font-bold leading-none">{c.volume}m3 • {formatCurrency(c.amount + c.oldDebt)}</p>
                  </div>
              </div>
              <button onClick={() => removeMember(c.stt, c.listType)} className="p-1.5 text-rose-300 active:scale-90"><Trash2 size={16}/></button>
          </div>
        ))}
        {groupData.length === 0 && <div className="py-6 text-center text-slate-300 italic uppercase font-black text-[8px] tracking-widest">Trong</div>}
      </div>

      <div className="fixed bottom-24 left-2 right-2 bg-white/95 backdrop-blur-md p-3 rounded-[1.5rem] shadow-2xl border-2 border-indigo-100 flex flex-col gap-2">
        <div className="flex justify-between items-center px-2">
            <p className="text-[8px] font-black text-indigo-800 uppercase italic tracking-wider">Tong bill nhom</p>
            <p className="text-2xl font-black text-indigo-700 tracking-tighter leading-none">{formatCurrency(totals.total)}</p>
        </div>
        <div className="grid grid-cols-12 gap-2">
            <button onClick={() => onSendZalo(generateGroupMsg(), group.masterSdt || '')} disabled={groupData.length === 0} className="col-span-8 bg-indigo-700 text-white py-3.5 rounded-xl font-black uppercase flex items-center justify-center gap-2 shadow-lg active:scale-95 border-b-2 border-indigo-900 disabled:opacity-50 text-[12px]"><MessageCircle size={18}/> GUI ZALO</button>
            <button onClick={async () => { const msg = generateGroupMsg(); await copyToClipboard(msg); alert("Da copy!"); }} className="col-span-4 bg-slate-800 text-white py-3.5 rounded-xl font-black uppercase flex items-center justify-center gap-1 shadow-lg active:scale-95 border-b-2 border-slate-950 disabled:opacity-50 text-[12px]"><Copy size={16}/> BILL</button>
        </div>
      </div>
    </div>
  );
};
