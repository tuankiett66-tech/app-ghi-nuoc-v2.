
import React, { useState, useMemo } from 'react';
import { ChevronLeft, Plus, X, MessageCircle, Trash2, Copy, Info, UserCheck, Mic, QrCode, GripVertical, Settings2, Check } from 'lucide-react';
import { Customer, SystemConfig, WaterGroup } from '../types';
import { formatCurrency, copyToClipboard, generateVietQrUrl, normalizeString, getBillingMonthYear } from '../utils';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface GroupDetailViewProps {
  group: WaterGroup;
  customers: Customer[];
  config: SystemConfig;
  onBack: () => void;
  onUpdateGroup: (groupId: string, updates: Partial<WaterGroup>) => void;
  onSendZalo: (msg: string, sdt: string) => void;
  onMarkGroupPaid: (groupId: string) => void;
  onNavigate: (dir: 'next' | 'prev') => void;
  onShowQr: (bankId: string, accountNo: string, amount: number, name: string) => void;
}

const SortableMemberItem = ({ 
  c, 
  onRemove, 
  isSortMode 
}: { 
  c: Customer & { source: string }; 
  onRemove: (maKH: string, source: string) => void;
  isSortMode: boolean;
}) => {
  const id = `${c.maKH}-${c.source}`;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={`bg-white rounded-2xl border shadow-sm flex items-stretch overflow-hidden min-h-[4rem] transition-all ${isSortMode ? 'border-dashed border-indigo-200' : 'border-slate-100'}`}
    >
      {isSortMode && (
        <div 
          {...attributes} 
          {...listeners}
          className="w-10 bg-indigo-50/50 flex items-center justify-center border-r border-indigo-100 shrink-0 cursor-grab active:cursor-grabbing hover:bg-indigo-100"
        >
          <GripVertical size={20} className="text-indigo-400" />
        </div>
      )}

      <div className="flex-1 flex justify-between items-center p-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
              <div className="flex flex-col items-center gap-0 shrink-0">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black text-[12px] shadow-sm">{c.maKH}</div>
                  <span className="text-[7px] font-black text-slate-400 uppercase leading-none mt-0.5">{c.source === 'list1' ? 'B01' : 'B02'}</span>
              </div>
              <div className="min-w-0">
                  <p className="font-black text-slate-900 uppercase text-[11px] leading-tight mb-0.5 truncate">{c.name}</p>
                  <p className="text-[9px] text-slate-500 font-bold leading-none">{c.volume}m3 • {formatCurrency(c.balance)}</p>
              </div>
          </div>
          <button onClick={() => onRemove(c.maKH, c.source)} className="p-2 text-rose-300 active:scale-90 shrink-0"><Trash2 size={16}/></button>
      </div>
    </div>
  );
};

export const GroupDetailView: React.FC<GroupDetailViewProps> = ({ group, customers, config, onBack, onUpdateGroup, onSendZalo, onMarkGroupPaid, onNavigate, onShowQr }) => {
  const [maKHInput, setMaKHInput] = useState('');
  const [sourceInput, setSourceInput] = useState<'list1' | 'list2'>('list1');
  const [isSortMode, setIsSortMode] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const previewCust = useMemo(() => {
    if (!maKHInput) return null;
    return customers.find(c => c.maKH === maKHInput && c.listType === sourceInput);
  }, [maKHInput, sourceInput, customers]);

  const groupData = useMemo(() => {
    return (group.members || []).map(m => {
      const found = customers.find(c => c.maKH === m.maKH && c.listType === m.source);
      return found ? { ...found, source: m.source } : null;
    }).filter(Boolean) as (Customer & { source: string })[];
  }, [group, customers]);

  const totals = useMemo(() => groupData.reduce((acc, curr) => ({
    vol: acc.vol + curr.volume,
    amt: acc.amt + curr.amount,
    debt: acc.debt + curr.oldDebt,
    paid: acc.paid + curr.paid,
    total: acc.total + curr.balance
  }), { vol: 0, amt: 0, debt: 0, paid: 0, total: 0 }), [groupData]);

  const handleAddMember = () => {
    if (!previewCust) {
        alert("Mã KH " + maKHInput + " không tồn tại!");
        return;
    }
    if ((group.members || []).some(m => m.maKH === previewCust.maKH && m.source === previewCust.listType)) {
        alert("Hộ này đã có trong nhóm!");
        return;
    }
    onUpdateGroup(group.id, { members: [...(group.members || []), { maKH: previewCust.maKH, source: previewCust.listType }] });
    setMaKHInput('');
  };

  const handleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Không hỗ trợ giọng nói");
    const recognition = new SpeechRecognition();
    recognition.lang = 'vi-VN';
    recognition.start();
    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      const maKH = text.replace(/[^0-9A-Z]/gi, '');
      if (maKH) setMaKHInput(maKH);
    };
  };

  const removeMember = (maKH: string, source: string) => {
    onUpdateGroup(group.id, { members: (group.members || []).filter(m => !(m.maKH === maKH && m.source === source)) });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = (group.members || []).findIndex((m) => `${m.maKH}-${m.source}` === active.id);
      const newIndex = (group.members || []).findIndex((m) => `${m.maKH}-${m.source}` === over.id);
      onUpdateGroup(group.id, { members: arrayMove(group.members || [], oldIndex, newIndex) });
    }
  };

  const groupLoss = useMemo(() => {
    if (group.oldIndex === undefined || group.newIndex === undefined) return null;
    const masterConsumption = group.newIndex - group.oldIndex;
    const membersConsumption = totals.vol;
    const loss = masterConsumption - membersConsumption;
    const lossPercent = masterConsumption > 0 ? (loss / masterConsumption) * 100 : 0;
    return { masterConsumption, membersConsumption, loss, lossPercent };
  }, [group.oldIndex, group.newIndex, totals.vol]);

  const handleUpdateIndices = (oldIdx: string, newIdx: string) => {
    onUpdateGroup(group.id, {
      oldIndex: parseFloat(oldIdx) || 0,
      newIndex: parseFloat(newIdx) || 0,
      updatedAt: Date.now()
    });
  };

  const generateGroupMsg = () => {
    const monthYear = getBillingMonthYear();
    let msg = `KỲ NƯỚC THÁNG ${monthYear}
NHÓM: ${group.name.toUpperCase()}
---------------------------
`;
    // Group Meter Section
    if (group.oldIndex !== undefined && group.newIndex !== undefined) {
      const gCons = group.newIndex - group.oldIndex;
      msg += `ĐỒNG HỒ TỔNG NHÓM:
SỐ: ${group.newIndex} - ${group.oldIndex} = ${gCons} m3
---------------------------
`;
    }

    groupData.forEach((c) => {
      msg += `MÃ KH: ${c.maKH}
KH: ${c.name}
SỐ: ${c.newIndex} - ${c.oldIndex} = ${c.volume}m3 x ${config.waterRate.toLocaleString('vi-VN')} = ${Math.round(c.amount).toLocaleString('vi-VN')}
NỢ CŨ: ${Math.round(c.oldDebt).toLocaleString('vi-VN')}`;

      if (c.paid > 0) {
        msg += `\nĐÃ THANH TOÁN: -${Math.round(c.paid).toLocaleString('vi-VN')}`;
      }

      msg += `\nCÒN LẠI: ${Math.round(c.balance).toLocaleString('vi-VN')}
---------------------------
`;
    });
    
    const finalTotal = Math.round(totals.total);
    msg += `TỔNG THANH TOÁN: ${finalTotal.toLocaleString('vi-VN')} đ\n`;
    
    // Group Loss info for collector (optional but helpful)
    if (groupLoss) {
      msg += `Hao hụt nhóm: ${groupLoss.loss.toFixed(1)} m3 (${groupLoss.lossPercent.toFixed(1)}%)\n`;
    }

    const cleanGroupName = normalizeString(group.name).toUpperCase();

    const bankId = config.groupBankId || config.bankId;
    const accountNo = config.groupAccountNo || config.accountNo;
    const accountName = config.groupAccountName || config.accountName;

    msg += `
${config.globalMessage}
---
👉 CHUYỂN KHOẢN:
NH: ${bankId.toUpperCase()}
STK: ${accountNo}
TÊN: ${accountName}
Nội dung: TT NUOC ${cleanGroupName}`;
    
    return msg;
  };

  return (
    <div className="fixed inset-0 bg-[#f8fafc] z-[250] flex flex-col pt-[calc(0.5rem+var(--sat))] animate-in slide-in-from-bottom duration-300">
      <header className="px-4 py-1.5 flex items-center justify-between bg-white border-b shadow-sm shrink-0">
        <div className="flex items-center gap-1">
            <button onClick={onBack} className="p-2 -ml-2 text-slate-800 active:scale-90"><ChevronLeft size={24}/></button>
            {!isSortMode && (
              <div className="flex bg-slate-100 rounded-xl p-0.5 border border-slate-200 scale-90">
                <button onClick={() => onNavigate('prev')} className="p-1.5 text-slate-700 active:scale-90"><ChevronLeft size={16}/></button>
                <button onClick={() => onNavigate('next')} className="p-1.5 text-slate-700 active:scale-90"><ChevronLeft className="rotate-180" size={16}/></button>
              </div>
            )}
            <h2 className="text-sm font-black uppercase italic text-indigo-700 ml-1 truncate max-w-[100px]">{group.name}</h2>
        </div>
        <div className="flex items-center gap-1">
          <button 
              onClick={() => setIsSortMode(!isSortMode)} 
              className={`p-2 rounded-xl transition-all flex items-center gap-1 scale-90 ${isSortMode ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500'}`}
          >
              {isSortMode ? <Check size={16}/> : <Settings2 size={16}/>}
              <span className="text-[10px] font-black uppercase">{isSortMode ? 'Xong' : 'Sửa'}</span>
          </button>
          {!isSortMode && (
            <button onClick={() => { const n = prompt("Sua ten nhom:", group.name); if(n) onUpdateGroup(group.id, {name: n.toUpperCase()}); }} className="p-2 text-slate-400 active:scale-90"><Info size={18}/></button>
          )}
        </div>
      </header>

      <div className={`transition-all duration-300 overflow-hidden ${isSortMode ? 'h-0 opacity-0 mb-0' : 'p-2 space-y-1.5 shrink-0 opacity-100'}`}>
        <div className="bg-white p-2.5 rounded-[1.2rem] shadow-md border border-indigo-50">
          <div className="flex justify-between items-center mb-1.5 px-0.5">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic">"Nhặt" hộ dân bằng Mã KH</p>
              <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 scale-90 origin-right">
                  <button onClick={() => setSourceInput('list1')} className={`px-2 py-0.5 rounded-md text-[11px] font-black uppercase transition-all ${sourceInput === 'list1' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400'}`}>BỘ 01</button>
                  <button onClick={() => setSourceInput('list2')} className={`px-2 py-0.5 rounded-md text-[11px] font-black uppercase transition-all ${sourceInput === 'list2' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400'}`}>BỘ 02</button>
              </div>
          </div>
          <div className="relative flex gap-1.5">
            <div className="relative flex-1">
                <input 
                  type="text" 
                  className="w-full bg-slate-50 p-2.5 pr-14 rounded-xl font-black text-xl text-indigo-700 outline-none border-2 border-transparent focus:border-indigo-500 shadow-inner" 
                  placeholder="Mã KH..."
                  value={maKHInput}
                  onChange={e => setMaKHInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddMember()}
                />
                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                    {maKHInput && <button onClick={() => setMaKHInput('')} className="p-1 text-rose-400"><X size={14}/></button>}
                    <button onClick={handleVoiceInput} className="p-1.5 text-indigo-600 bg-white rounded-lg shadow-sm border border-indigo-50"><Mic size={16}/></button>
                </div>
            </div>
            <button onClick={handleAddMember} className="bg-indigo-600 text-white px-4 rounded-xl active:scale-95 shadow-md border-b-2 border-indigo-900"><Plus size={22}/></button>
          </div>
          {previewCust && (
            <div className="mt-1.5 p-1.5 bg-indigo-50 rounded-lg border border-indigo-100 flex items-center justify-between animate-in slide-in-from-top-1">
               <p className="font-black text-indigo-700 uppercase text-[12px]">{previewCust.name}</p>
               <UserCheck className="text-indigo-500 shrink-0" size={14} />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white p-2 rounded-xl border-2 border-indigo-50 shadow-sm flex flex-col gap-1">
            <div className="flex justify-between items-center px-1">
              <label className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">CS TỔNG NHÓM (CŨ)</label>
            </div>
            <input 
              type="number"
              className="bg-slate-50 p-1.5 rounded-lg font-black text-slate-600 text-[14px] outline-none border-2 border-transparent focus:border-indigo-300 text-center"
              value={group.oldIndex || 0}
              onChange={e => handleUpdateIndices(e.target.value, (group.newIndex || 0).toString())}
            />
          </div>
          <div className="bg-white p-2 rounded-xl border-2 border-blue-50 shadow-sm flex flex-col gap-1">
            <div className="flex justify-between items-center px-1">
              <label className="text-[8px] font-black text-blue-400 uppercase tracking-tighter">CS TỔNG NHÓM (MỚI)</label>
            </div>
            <input 
              type="number"
              className="bg-blue-50/50 p-1.5 rounded-lg font-black text-blue-700 text-[14px] outline-none border-2 border-transparent focus:border-blue-300 text-center"
              value={group.newIndex || 0}
              onChange={e => handleUpdateIndices((group.oldIndex || 0).toString(), e.target.value)}
            />
          </div>
        </div>

        <div className="bg-white p-1.5 rounded-xl border shadow-sm flex items-center gap-2">
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-tighter whitespace-nowrap px-1">Zalo Chu nhom</label>
            <input className="flex-1 bg-indigo-50/50 p-1.5 rounded-lg font-black text-indigo-700 text-[12px] outline-none border border-transparent focus:border-indigo-300" value={group.masterSdt || ''} onChange={e => onUpdateGroup(group.id, { masterSdt: e.target.value })} placeholder="09xxxx..." />
        </div>
      </div>

      {groupLoss && (
        <div className="mx-2 p-2 bg-slate-900 rounded-xl text-white flex justify-between items-center shadow-lg animate-in slide-in-from-top-2">
          <div className="flex flex-col">
            <span className="text-[7px] font-black text-slate-400 uppercase leading-none mb-1 tracking-widest">Hao hụt nhóm</span>
            <span className="text-sm font-black tracking-tight">{groupLoss.loss.toFixed(1)} <span className="text-[9px] opacity-60">m3</span></span>
          </div>
          <div className="text-center bg-white/10 px-2 py-1 rounded-lg">
            <p className="text-[7px] font-black text-slate-400 uppercase mb-0.5">Tiêu thụ Nhóm</p>
            <p className="text-[10px] font-black text-blue-400">{groupLoss.masterConsumption} m3</p>
          </div>
          <div className="text-right">
            <span className={`text-xs font-black px-2 py-1 rounded-lg ${groupLoss.lossPercent > 10 ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
              {groupLoss.lossPercent.toFixed(1)}%
            </span>
          </div>
        </div>
      )}

      <div className={`flex-1 overflow-y-auto px-2 pb-44 space-y-1 ${isSortMode ? 'mt-2' : ''}`}>
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext 
            items={groupData.map(c => `${c.maKH}-${c.source}`)}
            strategy={verticalListSortingStrategy}
          >
            {groupData.map((c) => (
              <SortableMemberItem 
                key={`${c.maKH}-${c.source}`} 
                c={c} 
                isSortMode={isSortMode}
                onRemove={removeMember}
              />
            ))}
          </SortableContext>
        </DndContext>
        {groupData.length === 0 && <div className="py-6 text-center text-slate-300 italic uppercase font-black text-[8px] tracking-widest">Trong</div>}
      </div>

      <div className="fixed bottom-24 left-2 right-2 bg-white/95 backdrop-blur-md p-3 rounded-[1.5rem] shadow-2xl border-2 border-indigo-100 flex flex-col gap-2">
        <div className="flex justify-between items-center px-2">
            <p className="text-[8px] font-black text-indigo-800 uppercase italic tracking-wider">Tong bill nhom</p>
            <p className="text-2xl font-black text-indigo-700 tracking-tighter leading-none">{formatCurrency(totals.total)}</p>
        </div>
        <div className="grid grid-cols-12 gap-2">
            <button onClick={() => onMarkGroupPaid(group.id)} disabled={groupData.length === 0} className="col-span-2 bg-emerald-600 text-white py-3.5 rounded-xl font-black uppercase flex items-center justify-center gap-1 shadow-lg active:scale-95 border-b-2 border-emerald-900 disabled:opacity-50 text-[10px]"><UserCheck size={18}/></button>
            <button onClick={() => onSendZalo(generateGroupMsg(), group.masterSdt || '')} disabled={groupData.length === 0} className="col-span-5 bg-indigo-700 text-white py-3.5 rounded-xl font-black uppercase flex items-center justify-center gap-2 shadow-lg active:scale-95 border-b-2 border-indigo-900 disabled:opacity-50 text-[10px]"><MessageCircle size={18}/> GUI ZALO</button>
            <button 
              onClick={() => {
                const bankId = config.groupBankId || config.bankId;
                const accountNo = config.groupAccountNo || config.accountNo;
                const accountName = config.groupAccountName || config.accountName;
                onShowQr(bankId, accountNo, totals.total, group.name);
              }} 
              disabled={groupData.length === 0} 
              className="col-span-2 bg-rose-600 text-white py-3.5 rounded-xl font-black uppercase flex items-center justify-center gap-1 shadow-lg active:scale-95 border-b-2 border-rose-900 disabled:opacity-50 text-[10px]"
            >
              <QrCode size={18}/>
            </button>
            <button onClick={async () => { const msg = generateGroupMsg(); await copyToClipboard(msg); alert("Da copy!"); }} className="col-span-3 bg-slate-800 text-white py-3.5 rounded-xl font-black uppercase flex items-center justify-center gap-1 shadow-lg active:scale-95 border-b-2 border-slate-950 disabled:opacity-50 text-[10px]"><Copy size={16}/> BILL</button>
        </div>
      </div>
    </div>
  );
};

