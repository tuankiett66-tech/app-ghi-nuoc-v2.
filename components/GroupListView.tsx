
import React, { useState } from 'react';
import { ChevronLeft, Users, Plus, Trash2, ArrowRight, X } from 'lucide-react';
import { WaterGroup, GroupMember, Customer } from '../types';

interface GroupListViewProps {
  groups: WaterGroup[];
  customers: Customer[];
  onBack: () => void;
  onSelectGroup: (groupId: string) => void;
  onAddGroup: (name: string, members?: GroupMember[]) => void;
  onDeleteGroup: (groupId: string) => void;
}

export const GroupListView: React.FC<GroupListViewProps> = ({ groups, customers, onBack, onSelectGroup, onAddGroup, onDeleteGroup }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  const handleManualAdd = () => {
    if (!newGroupName.trim()) return;
    onAddGroup(newGroupName.trim().toUpperCase());
    setNewGroupName('');
    setShowAddForm(false);
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

      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-40">
        {groups.map(group => (
          <div key={group.id} onClick={() => onSelectGroup(group.id)} className="bg-white p-5 rounded-[2.2rem] shadow-md border-2 border-transparent active:border-indigo-200 active:scale-[0.98] transition-all flex justify-between items-center group">
            <div className="space-y-1">
                <h3 className="font-black text-slate-900 uppercase text-lg">{group.name}</h3>
                <p className="bg-indigo-50 text-indigo-600 px-2.5 py-0.5 rounded-lg inline-block text-[10px] font-black uppercase tracking-wider">{(group.members || []).length} Hộ thành viên</p>
            </div>
            <div className="flex items-center gap-2">
                <button 
                    onClick={(e) => { e.stopPropagation(); if(confirm("Bạn muốn xóa nhóm này?")) onDeleteGroup(group.id); }} 
                    className="p-3 text-rose-300 hover:text-rose-600 active:scale-90 transition-colors"
                >
                    <Trash2 size={24}/>
                </button>
                <div className="p-2 text-slate-200 group-active:text-indigo-600"><ArrowRight size={22}/></div>
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
