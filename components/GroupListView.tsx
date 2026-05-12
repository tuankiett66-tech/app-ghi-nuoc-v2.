
import React, { useState } from 'react';
import { ChevronLeft, Users, Plus, Trash2, ArrowRight, X, Edit2, GripVertical, Settings2, Check } from 'lucide-react';
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
  onSelect, 
  onDelete, 
  onEdit, 
  isSortMode 
}: { 
  group: WaterGroup; 
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
      className={`bg-white rounded-[2rem] shadow-sm border-2 transition-all flex items-stretch group relative overflow-hidden min-h-[5rem] ${isSortMode ? 'border-dashed border-indigo-200' : 'border-transparent hover:border-indigo-100'}`}
    >
      {isSortMode && (
        <div 
          {...attributes} 
          {...listeners}
          className="w-14 bg-indigo-50/50 flex items-center justify-center border-r border-indigo-100 shrink-0 cursor-grab active:cursor-grabbing hover:bg-indigo-100 transition-colors"
        >
          <div className="flex flex-col gap-1 text-indigo-400">
            <GripVertical size={24} />
          </div>
        </div>
      )}

      <div 
        onClick={() => !isSortMode && onSelect(group.id)} 
        className={`flex-1 flex justify-between items-center px-4 py-3 transition-colors min-w-0 ${isSortMode ? '' : 'active:bg-slate-50 cursor-pointer'}`}
      >
        <div className="min-w-0">
          <div className="flex items-start gap-2">
            <h3 className="font-black text-slate-900 uppercase text-md leading-tight line-clamp-2 flex-1">{group.name}</h3>
            <button onClick={(e) => onEdit(group, e)} className="p-1 px-2 text-slate-400 hover:text-indigo-600 bg-slate-100 rounded-lg shrink-0">
              <Edit2 size={12}/>
            </button>
          </div>
          <p className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg inline-block text-[10px] font-black uppercase tracking-wider mt-1">{(group.members || []).length} Hộ thành viên</p>
        </div>
        
        <div className="flex items-center gap-1 shrink-0">
          <button 
            onClick={(e) => onDelete(group.id, e)} 
            className="p-3 text-rose-300 hover:text-rose-600 active:scale-90 transition-colors"
          >
            <Trash2 size={24}/>
          </button>
          <div className={`p-2 transition-colors ${isSortMode ? 'text-slate-100' : 'text-slate-200 group-hover:text-indigo-600'}`}>
            <ArrowRight size={24}/>
          </div>
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
              onClick={() => setIsSortMode(!isSortMode)} 
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
            items={groups.map(g => g.id)}
            strategy={verticalListSortingStrategy}
          >
            {groups.map((group) => (
              <SortableGroupItem
                key={group.id}
                group={group}
                isSortMode={isSortMode}
                onSelect={onSelectGroup}
                onDelete={(id, e) => { 
                  e.stopPropagation(); 
                  if(confirm("Bạn muốn xóa nhóm này?")) onDeleteGroup(id); 
                }}
                onEdit={handleStartEdit}
              />
            ))}
          </SortableContext>
        </DndContext>

        {groups.length === 0 && (
          <div className="py-20 text-center space-y-4">
             <div className="inline-block p-10 bg-white rounded-[3.5rem] shadow-sm text-slate-100 border-2 border-dashed border-slate-200"><Users size={80}/></div>
             <p className="text-slate-400 font-black uppercase italic text-[11px] tracking-widest px-10 leading-relaxed">Chưa có nhóm nào được tạo.<br/>Bấm nút "+" phía trên để bắt đầu</p>
          </div>
        )}
      </div>
    </div>
  );
};

