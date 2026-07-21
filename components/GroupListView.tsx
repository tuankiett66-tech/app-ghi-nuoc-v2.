
import React, { useState } from 'react';
import { ChevronLeft, Users, Plus, Trash2, ArrowRight, X, Edit2, GripVertical, Settings2, Check, Search } from 'lucide-react';
import { WaterGroup, GroupMember, Customer } from '../types';
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
import { formatCurrency } from '../utils';

interface GroupListViewProps {
  groups: WaterGroup[];
  customers: Customer[];
  onBack: () => void;
  onSelectGroup: (groupId: string) => void;
  onAddGroup: (name: string, members?: GroupMember[]) => void;
  onDeleteGroup: (groupId: string) => void;
  onUpdateGroup: (groupId: string, updates: Partial<WaterGroup>) => void;
  onReorderGroups: (newGroups: WaterGroup[]) => void;
}

const SortableGroupItem = ({ 
  group, 
  index,
  customers,
  onSelect, 
  onDelete, 
  onEdit, 
  isSortMode 
}: { 
  group: WaterGroup; 
  index: number;
  customers: Customer[];
  onSelect: (id: string) => void; 
  onDelete: (id: string, e: React.MouseEvent) => void;
  onEdit: (group: WaterGroup, e: React.MouseEvent) => void;
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

  const totalAmount = React.useMemo(() => {
    return (group.members || []).reduce((sum, m) => {
      const found = customers.find(c => c.maKH === m.maKH && c.listType === m.source);
      return sum + (found ? found.balance : 0);
    }, 0);
  }, [group.members, customers]);

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
      onClick={() => !isSortMode && onSelect(group.id)} 
      className={`bg-white p-3 rounded-2xl shadow-sm border-2 transition-all duration-75 flex items-start gap-2.5 group relative overflow-hidden select-none ${
        isSortMode ? 'border-dashed border-indigo-200' : 
        group.isProcessed ? 'border-emerald-500 bg-emerald-50/10' : 
        'border-white hover:border-slate-200'
      } ${!isSortMode ? 'cursor-pointer active:bg-slate-50' : ''}`}
    >
      {isSortMode && (
        <div 
          {...attributes} 
          {...listeners}
          className="p-1 text-indigo-400 hover:text-indigo-600 active:scale-95 cursor-grab active:cursor-grabbing shrink-0 mt-3"
          title="Kéo thả để sắp xếp"
        >
          <GripVertical size={20} />
        </div>
      )}

      <div className="flex flex-col items-center gap-1 shrink-0">
        <div className="text-[9px] font-extrabold text-slate-400 uppercase leading-none tracking-wider">STT</div>
        <div className={`px-2.5 py-1.5 rounded-xl min-w-[42px] text-center text-white text-[14px] font-black shadow-sm leading-none ${
          group.isProcessed ? 'bg-emerald-500' : 'bg-indigo-600'
        }`}>
          {index + 1}
        </div>
        {group.isProcessed && (
          <div className="p-0.5 rounded-full border-2 -mt-1 bg-emerald-600 text-white border-emerald-600 shadow-sm shrink-0">
            <Check size={10} strokeWidth={3} />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 self-center">
        <div className="flex items-start justify-between gap-1 mb-0.5">
          <div className="flex items-center gap-1.5 flex-wrap flex-1">
            <h3 className="font-black uppercase text-[14px] sm:text-[16px] leading-tight text-slate-900 line-clamp-2">
              {group.name}
            </h3>
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); onEdit(group, e); }}
            className="p-1 bg-slate-100 text-slate-400 hover:text-indigo-600 rounded-lg active:scale-90 shrink-0 transition-colors"
            title="Sửa tên nhóm"
          >
            <Edit2 size={11}/>
          </button>
        </div>
        
        <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1">
          <p className="text-[9px] sm:text-[10px] text-indigo-700 font-black flex items-center gap-1">
            <span className="text-slate-400 font-bold uppercase">Thành viên:</span> {(group.members || []).length} hộ
          </p>
          {group.isProcessed && (
            <p className="text-[9px] sm:text-[10px] text-emerald-700 font-black flex items-center gap-1">
              <span className="text-emerald-400 font-bold uppercase">Trạng thái:</span> Đã copy
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0 ml-1 self-center">
        {!isSortMode && (
          <div className="text-right flex flex-col justify-center mr-1 select-none shrink-0 min-w-[70px]">
            <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest leading-none mb-0.5">Tiền nhóm</span>
            <span className="font-black text-[15px] text-rose-600 tracking-tight leading-none">
              {formatCurrency(totalAmount)}
            </span>
          </div>
        )}
        
        <button 
          onClick={(e) => onDelete(group.id, e)} 
          className="p-2 text-slate-300 hover:text-rose-600 active:scale-90 transition-all hover:bg-rose-50 rounded-lg shrink-0"
          title="Xóa nhóm"
        >
          <Trash2 size={16}/>
        </button>
        
        <div className={`p-1.5 transition-colors shrink-0 ${isSortMode ? 'opacity-0' : 'text-slate-300 group-hover:text-indigo-600'}`}>
          <ArrowRight size={16}/>
        </div>
      </div>
    </div>
  );
};

export const GroupListView: React.FC<GroupListViewProps> = ({ 
    groups, customers, onBack, onSelectGroup, onAddGroup, onDeleteGroup, onUpdateGroup, onReorderGroups 
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
                  index={originalIndex !== -1 ? originalIndex : 0}
                  isSortMode={isSortMode}
                  onSelect={onSelectGroup}
                  onDelete={(id, e) => { 
                    e.stopPropagation(); 
                    if(confirm("Bạn muốn xóa nhóm này?")) onDeleteGroup(id); 
                  }}
                  onEdit={handleStartEdit}
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

