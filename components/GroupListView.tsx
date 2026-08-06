
import React, { useState } from 'react';
import { ChevronLeft, Users, Plus, Trash2, ArrowRight, X, Edit2, GripVertical, Settings2, Check, Search, Copy, CheckCheck, UserCheck } from 'lucide-react';
import { WaterGroup, GroupMember, Customer, SystemConfig } from '../types';
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
import { formatCurrency, copyToClipboard, normalizeString, getZaloBillingHeader } from '../utils';

interface GroupListViewProps {
  groups: WaterGroup[];
  customers: Customer[];
  config: SystemConfig;
  onBack: () => void;
  onSelectGroup: (groupId: string) => void;
  onAddGroup: (name: string, members?: GroupMember[]) => void;
  onDeleteGroup: (groupId: string) => void;
  onUpdateGroup: (groupId: string, updates: Partial<WaterGroup>) => void;
  onReorderGroups: (newGroups: WaterGroup[]) => void;
  onMarkGroupPaid: (groupId: string) => void;
}

const SortableGroupItem = ({ 
  group, 
  index,
  customers,
  config,
  onSelect, 
  onDelete, 
  onEdit, 
  onUpdateGroup,
  onMarkGroupPaid,
  isSortMode 
}: { 
  group: WaterGroup; 
  index: number;
  customers: Customer[];
  config: SystemConfig;
  onSelect: (id: string) => void; 
  onDelete: (id: string, e: React.MouseEvent) => void;
  onEdit: (group: WaterGroup, e: React.MouseEvent) => void;
  onUpdateGroup: (groupId: string, updates: Partial<WaterGroup>) => void;
  onMarkGroupPaid: (groupId: string) => void;
  isSortMode: boolean;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: group.id });

  const [copied, setCopied] = React.useState(false);

  const groupData = React.useMemo(() => {
    return (group.members || []).map(m => {
      const found = customers.find(c => c.maKH === m.maKH && c.listType === m.source);
      return found ? { ...found, source: m.source } : null;
    }).filter(Boolean) as (Customer & { source: string })[];
  }, [group, customers]);

  const totals = React.useMemo(() => groupData.reduce((acc, curr) => ({
    vol: acc.vol + curr.volume,
    amt: acc.amt + curr.amount,
    debt: acc.debt + curr.oldDebt,
    paid: acc.paid + curr.paid,
    total: acc.total + curr.balance
  }), { vol: 0, amt: 0, debt: 0, paid: 0, total: 0 }), [groupData]);

  const groupLoss = React.useMemo(() => {
    if (group.oldIndex === undefined || group.newIndex === undefined) return null;
    const masterConsumption = group.newIndex - group.oldIndex;
    const membersConsumption = totals.vol;
    const loss = masterConsumption - membersConsumption;
    const lossPercent = masterConsumption > 0 ? (loss / masterConsumption) * 100 : 0;
    return { masterConsumption, membersConsumption, loss, lossPercent };
  }, [group.oldIndex, group.newIndex, totals.vol]);

  const generateGroupMsg = () => {
    let msg = `${getZaloBillingHeader(group.updatedAt)}
NHÓM: ${group.name.toUpperCase()}
---------------------------
`;
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

  const handleCopyMsg = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (groupData.length === 0) {
      alert("Nhóm chưa có thành viên!");
      return;
    }
    const msg = generateGroupMsg();
    await copyToClipboard(msg);
    onUpdateGroup(group.id, { isProcessed: true });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMarkPaid = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (groupData.length === 0) {
      alert("Nhóm chưa có thành viên!");
      return;
    }
    if (confirm(`Bạn muốn đánh dấu ĐÃ THU ĐỦ cho toàn bộ ${groupData.length} hộ trong nhóm này?`)) {
      onMarkGroupPaid(group.id);
    }
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  const isAllPaid = totals.total === 0;

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      onClick={() => !isSortMode && onSelect(group.id)} 
      className={`bg-white p-3.5 rounded-2xl shadow-sm border-2 transition-all duration-75 flex flex-col gap-3 group relative overflow-hidden select-none ${
        isSortMode ? 'border-dashed border-indigo-200' : 
        group.isProcessed ? 'border-emerald-500 bg-emerald-50/10' : 
        'border-white hover:border-slate-200'
      } ${!isSortMode ? 'cursor-pointer active:bg-slate-50' : ''}`}
    >
      <div className="flex items-start gap-2.5 w-full">
        {isSortMode && (
          <div 
            {...attributes} 
            {...listeners}
            className="p-1 text-indigo-400 hover:text-indigo-600 active:scale-95 cursor-grab active:cursor-grabbing shrink-0 mt-2"
            title="Kéo thả để sắp xếp"
          >
            <GripVertical size={20} />
          </div>
        )}

        <div className="flex-col flex gap-1 items-center shrink-0">
          <div className="text-[8px] font-extrabold text-slate-400 uppercase leading-none tracking-widest">STT</div>
          <div className={`px-2.5 py-1.5 rounded-xl min-w-[38px] text-center text-white text-[13px] font-black shadow-sm leading-none ${
            group.isProcessed ? 'bg-emerald-500' : 'bg-indigo-600'
          }`}>
            {index + 1}
          </div>
          {group.isProcessed && (
            <div className="p-0.5 rounded-full border border-emerald-600 -mt-1 bg-emerald-600 text-white shadow-sm shrink-0">
              <Check size={9} strokeWidth={4} />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* TÊN NHÓM hiển thị đầy đủ */}
          <h3 className="font-black uppercase text-[14px] sm:text-[15px] leading-snug text-indigo-900 break-words pr-1">
            {group.name}
          </h3>
          
          {/* MÃ KH của các thành viên trong nhóm */}
          {groupData.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1 items-center">
              <span className="text-[9px] font-extrabold text-indigo-400 uppercase tracking-wider">Mã KH:</span>
              <div className="flex flex-wrap gap-1">
                {groupData.map((c) => (
                  <span key={`${c.maKH}-${c.source}`} className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-md text-[10px] font-black border border-indigo-100/50 leading-none">
                    {c.maKH}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {group.isProcessed && (
            <div className="mt-1.5">
              <span className="text-emerald-700 font-black bg-emerald-100/60 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider">
                ĐÃ COPY
              </span>
            </div>
          )}
        </div>

        {/* CỘT SỐ TIỀN & SỐ HỘ Ở BÊN PHẢI */}
        <div className="text-right shrink-0 flex flex-col items-end justify-center">
          <div className="text-[9px] font-extrabold text-slate-400 uppercase leading-none tracking-wider mb-1">Tiền nhóm</div>
          <div className="font-black text-[18px] sm:text-[20px] text-rose-600 tracking-tighter leading-none mb-1">
            {formatCurrency(totals.total)}
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-500 font-bold">
            <span className="text-slate-400">Số hộ:</span> <strong className="text-indigo-600">{(group.members || []).length}</strong>
          </div>
        </div>
      </div>

      {/* HÀNG NÚT HÀNH ĐỘNG Ở DƯỚI CÙNG (ẨN KHI ĐANG SẮP XẾP) */}
      {!isSortMode && (
        <div className="flex gap-2 pt-2 border-t border-slate-100 items-center justify-between w-full">
          {/* Cụm nút vận hành */}
          <div className="flex-1 flex gap-2">
            <button 
              onClick={handleCopyMsg}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-black uppercase active:scale-95 transition-all shadow-xs border ${
                copied 
                  ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
              }`}
            >
              {copied ? <CheckCheck size={13} className="text-emerald-600"/> : <Copy size={13}/>}
              {copied ? 'Đã copy' : 'Copy Bill'}
            </button>

            <button 
              onClick={handleMarkPaid}
              disabled={isAllPaid}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-black uppercase active:scale-95 transition-all border ${
                isAllPaid 
                  ? 'bg-slate-100 text-slate-400 border-slate-200 pointer-events-none' 
                  : 'bg-teal-600 text-white border-teal-800 hover:bg-teal-700 shadow-md border-b-2'
              }`}
            >
              {isAllPaid ? <Check size={13}/> : <UserCheck size={13}/>}
              {isAllPaid ? 'Đã thu' : 'Thu Đủ'}
            </button>
          </div>

          {/* Cụm nút quản lý */}
          <div className="flex gap-1.5 shrink-0">
            <button 
              onClick={(e) => { e.stopPropagation(); onEdit(group, e); }}
              className="p-2 bg-slate-50 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 rounded-xl transition-all active:scale-90 shrink-0"
              title="Sửa tên nhóm"
            >
              <Edit2 size={13}/>
            </button>

            <button 
              onClick={(e) => onDelete(group.id, e)}
              className="p-2 bg-slate-50 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 rounded-xl transition-all active:scale-90 shrink-0"
              title="Xóa nhóm"
            >
              <Trash2 size={13}/>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const GroupListView: React.FC<GroupListViewProps> = ({ 
    groups, customers, config, onBack, onSelectGroup, onAddGroup, onDeleteGroup, onUpdateGroup, onReorderGroups, onMarkGroupPaid 
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSortMode, setIsSortMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [editName, setEditName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredGroups = groups.filter((g, idx) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    const stt = (idx + 1).toString();
    
    const matchesName = g.name.toLowerCase().includes(query);
    const matchesSTTExact = stt === query;
    const matchesSTTText = query.includes(`nhóm ${stt}`) || query.includes(`nhom ${stt}`) || query.includes(`#${stt}`) || query === stt;
    const isOnlyNumber = /^\d+$/.test(query);
    const matchesSTTSub = isOnlyNumber && stt.includes(query);

    return matchesName || matchesSTTExact || matchesSTTText || matchesSTTSub;
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleManualAdd = () => {
    if (!newGroupName.trim()) return;
    onAddGroup(newGroupName.trim().toUpperCase());
    setNewGroupName('');
    setShowAddForm(false);
  };

  const handleStartEdit = (group: WaterGroup, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(group.id);
    setEditName(group.name);
  };

  const handleSaveEdit = () => {
    if (editingId && editName.trim()) {
      onUpdateGroup(editingId, { name: editName.trim().toUpperCase() });
      setEditingId(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = groups.findIndex((g) => g.id === active.id);
      const newIndex = groups.findIndex((g) => g.id === over.id);
      onReorderGroups(arrayMove(groups, oldIndex, newIndex));
    }
  };

  return (
    <div className="fixed inset-0 bg-[#f8fafc] z-[150] flex flex-col pt-[calc(0.5rem+var(--sat))] animate-in slide-in-from-right duration-200">
      <header className="px-4 py-4 flex items-center justify-between bg-white border-b shadow-md shrink-0 relative z-[160]">
        <div className="flex items-center gap-2">
            <button onClick={onBack} className="p-3 -ml-2 text-slate-800 active:scale-90"><ChevronLeft size={28}/></button>
            <div className="flex items-center gap-1.5">
                <Users size={20} className="text-indigo-600" />
                <h2 className="text-lg font-black uppercase italic text-indigo-700">Danh bộ Nhóm</h2>
            </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
              onClick={() => {
                if (!isSortMode) setSearchQuery('');
                setIsSortMode(!isSortMode);
              }} 
              className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shadow-md font-black uppercase text-[10px] ${isSortMode ? 'bg-emerald-600 text-white border-b-4 border-emerald-900' : 'bg-slate-100 text-slate-600 border-b-4 border-slate-300'}`}
          >
              {isSortMode ? <Check size={18}/> : <Settings2 size={18}/>}
              <span>{isSortMode ? 'Xong' : 'Sắp xếp'}</span>
          </button>
          {!isSortMode && (
            <button 
                onClick={() => setShowAddForm(true)} 
                className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl shadow-lg active:scale-95 border-b-4 border-indigo-900 flex items-center gap-2"
            >
                <Plus size={22}/>
                <span className="text-[10px] font-black uppercase">Tạo</span>
            </button>
          )}
        </div>
      </header>

      {!isSortMode && (
        <div className="px-4 py-2 shrink-0 bg-white border-b flex gap-2">
          <div className="relative flex-1">
            <input 
              type="text" 
              placeholder="Tìm tên nhóm..." 
              className="w-full bg-slate-50 p-3.5 pl-10 pr-10 rounded-2xl border-2 border-slate-100 font-black text-sm text-slate-800 outline-none focus:border-indigo-500"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              autoComplete="one-time-code"
              autoCorrect="off"
              spellCheck="false"
            />
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
              <Search size={18} />
            </div>
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 bg-slate-100 rounded-full"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      )}

      {showAddForm && (
        <div className="fixed inset-0 bg-slate-900/60 z-[200] flex items-center justify-center p-6 backdrop-blur-sm" onClick={() => setShowAddForm(false)}>
            <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-7 shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-5">
                    <h3 className="font-black text-indigo-700 uppercase italic">Tạo nhóm mới</h3>
                    <button onClick={() => setShowAddForm(false)} className="p-2 bg-slate-100 rounded-full"><X size={20}/></button>
                </div>
                <input 
                    autoFocus
                    className="w-full bg-slate-50 p-4 rounded-2xl font-black text-xl text-indigo-700 outline-none border-2 border-slate-200 focus:border-indigo-500 mb-5 shadow-inner" 
                    placeholder="Tên nhóm (Vd: TIẾN 7 LÙN)..."
                    value={newGroupName}
                    onChange={e => setNewGroupName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleManualAdd()}
                    autoComplete="one-time-code"
                    autoCorrect="off"
                    spellCheck="false"
                />
                <button onClick={handleManualAdd} className="w-full bg-indigo-600 text-white py-4.5 rounded-2xl font-black uppercase shadow-lg border-b-4 border-indigo-900 active:scale-95 transition-transform">Lưu vào máy</button>
            </div>
        </div>
      )}

      {editingId && (
        <div className="fixed inset-0 bg-slate-900/60 z-[200] flex items-center justify-center p-6 backdrop-blur-sm" onClick={() => setEditingId(null)}>
            <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-7 shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-5">
                    <h3 className="font-black text-indigo-700 uppercase italic">Sửa tên nhóm</h3>
                    <button onClick={() => setEditingId(null)} className="p-2 bg-slate-100 rounded-full"><X size={20}/></button>
                </div>
                <input 
                    autoFocus
                    className="w-full bg-slate-50 p-4 rounded-2xl font-black text-xl text-indigo-700 outline-none border-2 border-slate-200 focus:border-indigo-500 mb-5 shadow-inner" 
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSaveEdit()}
                    autoComplete="one-time-code"
                    autoCorrect="off"
                    spellCheck="false"
                />
                <button onClick={handleSaveEdit} className="w-full bg-indigo-600 text-white py-4.5 rounded-2xl font-black uppercase shadow-lg border-b-4 border-indigo-900 active:scale-95 transition-transform">Cập nhật</button>
            </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-40">
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext 
            items={filteredGroups.map(g => g.id)}
            strategy={verticalListSortingStrategy}
          >
            {filteredGroups.map((group) => {
              const originalIndex = groups.findIndex(g => g.id === group.id);
              return (
                <SortableGroupItem
                  key={group.id}
                  group={group}
                  customers={customers}
                  config={config}
                  index={originalIndex !== -1 ? originalIndex : 0}
                  isSortMode={isSortMode}
                  onSelect={onSelectGroup}
                  onDelete={(id, e) => { 
                    e.stopPropagation(); 
                    if(confirm("Bạn muốn xóa nhóm này?")) onDeleteGroup(id); 
                  }}
                  onEdit={handleStartEdit}
                  onUpdateGroup={onUpdateGroup}
                  onMarkGroupPaid={onMarkGroupPaid}
                />
              );
            })}
          </SortableContext>
        </DndContext>

        {filteredGroups.length === 0 && (
          <div className="py-20 text-center space-y-4">
             <div className="inline-block p-10 bg-white rounded-[3.5rem] shadow-sm text-slate-100 border-2 border-dashed border-slate-200"><Users size={80}/></div>
             <p className="text-slate-400 font-black uppercase italic text-[11px] tracking-widest px-10 leading-relaxed">
               {searchQuery ? 'Không tìm thấy nhóm nào phù hợp.' : 'Chưa có nhóm nào được tạo.'}<br/>
               {searchQuery ? 'Vui lòng thử lại với từ khóa khác' : 'Bấm nút "+" phía trên để bắt đầu'}
             </p>
          </div>
        )}
      </div>
    </div>
  );
};

