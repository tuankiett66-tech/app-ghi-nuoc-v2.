
import React, { useState } from 'react';
import { ChevronLeft, Users, Plus, Trash2, ArrowRight, X, Edit2, ArrowUp, ArrowDown, GripVertical } from 'lucide-react';
import { WaterGroup, GroupMember, Customer } from '../types';

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

export const GroupListView: React.FC<GroupListViewProps> = ({ 
    groups, customers, onBack, onSelectGroup, onAddGroup, onDeleteGroup, onUpdateGroup, onReorderGroups 
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [editName, setEditName] = useState('');

  const handleManualAdd = () => {
    if (!newGroupName.trim()) return;
    onAddGroup(newGroupName.trim().toUpperCase());
    setNewGroupName('');
    setShowAddForm(false);
  };

  const handleStartEdit = (e: React.MouseEvent, group: WaterGroup) => {
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

  const moveGroup = (e: React.MouseEvent, index: number, direction: 'up' | 'down') => {
    e.stopPropagation();
    const newGroups = [...groups];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newGroups.length) {
      [newGroups[index], newGroups[targetIndex]] = [newGroups[targetIndex], newGroups[index]];
      onReorderGroups(newGroups);
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
        <button 
            onClick={() => setShowAddForm(true)} 
            className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl shadow-lg active:scale-95 border-b-4 border-indigo-900 flex items-center gap-2"
        >
            <Plus size={22}/>
            <span className="text-[10px] font-black uppercase">Tạo Nhóm</span>
        </button>
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
        {groups.map((group, idx) => (
          <div key={group.id} className="bg-white rounded-[2rem] shadow-sm border-2 border-transparent hover:border-indigo-100 transition-all flex items-stretch group relative overflow-hidden min-h-[5rem]">
            {/* Reorder Zone - Separated from main click area */}
            <div className="w-14 bg-slate-50 flex flex-col items-center justify-center border-r border-slate-100 shrink-0">
                <button 
                    disabled={idx === 0}
                    onClick={(e) => { e.stopPropagation(); moveGroup(e, idx, 'up'); }}
                    className={`flex-1 w-full flex items-center justify-center transition-colors ${idx === 0 ? 'text-slate-200' : 'text-slate-400 active:bg-indigo-100 active:text-indigo-600'}`}
                >
                    <ArrowUp size={20}/>
                </button>
                <div className="flex items-center justify-center py-0.5 opacity-20 text-slate-500">
                  <GripVertical size={16} />
                </div>
                <button 
                    disabled={idx === groups.length - 1}
                    onClick={(e) => { e.stopPropagation(); moveGroup(e, idx, 'down'); }}
                    className={`flex-1 w-full flex items-center justify-center transition-colors ${idx === groups.length - 1 ? 'text-slate-200' : 'text-slate-400 active:bg-indigo-100 active:text-indigo-600'}`}
                >
                    <ArrowDown size={20}/>
                </button>
            </div>

            {/* Clickable Content Zone */}
            <div onClick={() => onSelectGroup(group.id)} className="flex-1 flex justify-between items-center px-4 py-3 active:bg-slate-50 transition-colors cursor-pointer min-w-0">
                <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-black text-slate-900 uppercase text-md leading-tight truncate">{group.name}</h3>
                        <button onClick={(e) => handleStartEdit(e, group)} className="p-1 px-2 text-slate-400 hover:text-indigo-600 bg-slate-100 rounded-lg">
                            <Edit2 size={12}/>
                        </button>
                    </div>
                    <p className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg inline-block text-[10px] font-black uppercase tracking-wider mt-1">{(group.members || []).length} Hộ thành viên</p>
                </div>
                
                <div className="flex items-center gap-1 shrink-0">
                    <button 
                        onClick={(e) => { e.stopPropagation(); if(confirm("Bạn muốn xóa nhóm này?")) onDeleteGroup(group.id); }} 
                        className="p-3 text-rose-300 hover:text-rose-600 active:scale-90 transition-colors"
                    >
                        <Trash2 size={24}/>
                    </button>
                    <div className="p-2 text-slate-200 group-hover:text-indigo-600"><ArrowRight size={24}/></div>
                </div>
            </div>
          </div>
        ))}

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

