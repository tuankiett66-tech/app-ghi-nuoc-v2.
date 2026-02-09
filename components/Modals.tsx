
import React, { useState, useEffect } from 'react';
import { X, Save, UserPlus, PencilLine } from 'lucide-react';
import { SystemConfig, Customer } from '../types';

interface ModalsProps {
  view: string;
  setView: (v: string) => void;
  addCustomer: (data: any) => void;
  updateCustomer: (id: string, updates: Partial<Customer>) => void;
  config: SystemConfig;
  setConfig: (c: SystemConfig) => void;
  selectedCustomer: Customer | null;
}

export const Modals: React.FC<ModalsProps> = ({ view, setView, addCustomer, updateCustomer, config, setConfig, selectedCustomer }) => {
  const [formData, setFormData] = useState({ 
    name: '', address: '', phoneLandlord: '', phoneTenant: '', stt: 1, oldIndex: 0, oldDebt: 0 
  });

  useEffect(() => {
    if (view === 'edit_customer' && selectedCustomer) {
      setFormData({
        name: selectedCustomer.name,
        address: selectedCustomer.address,
        phoneLandlord: selectedCustomer.phoneLandlord || '',
        phoneTenant: selectedCustomer.phoneTenant || selectedCustomer.phone || '',
        stt: selectedCustomer.stt,
        oldIndex: selectedCustomer.oldIndex,
        oldDebt: selectedCustomer.oldDebt
      });
    } else if (view === 'add_customer') {
      setFormData({ name: '', address: '', phoneLandlord: '', phoneTenant: '', stt: 1, oldIndex: 0, oldDebt: 0 });
    }
  }, [view, selectedCustomer]);

  if (view === 'add_customer' || view === 'edit_customer') {
    const isEdit = view === 'edit_customer';
    return (
      <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-sm rounded-[2.8rem] p-7 shadow-2xl animate-in zoom-in-95 duration-200 border-4 border-slate-100">
          <header className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-black uppercase italic text-blue-700 flex items-center gap-2">
              {isEdit ? <PencilLine size={24}/> : <UserPlus size={24}/>}
              {isEdit ? 'Sửa thông tin' : 'Thêm khách hàng'}
            </h2>
            <button onClick={() => setView(isEdit ? 'detail' : 'list')} className="p-2.5 bg-slate-100 rounded-full text-slate-600 active:scale-90"><X size={20}/></button>
          </header>
          
          <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
            <div className="grid grid-cols-4 gap-3">
               <div className="col-span-1">
                  <label className="text-[10px] font-black uppercase text-slate-700 ml-1">STT</label>
                  <input type="number" className="w-full bg-blue-50 p-3.5 rounded-2xl border-2 border-blue-200 font-black text-center text-blue-700" value={formData.stt} onChange={e => setFormData({...formData, stt: parseInt(e.target.value) || 1})} />
               </div>
               <div className="col-span-3">
                  <label className="text-[10px] font-black uppercase text-slate-700 ml-1">Tên khách hàng</label>
                  <input className="w-full bg-slate-50 p-3.5 rounded-2xl border-2 border-slate-200 font-black text-slate-800" placeholder="Nhập tên..." value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
               </div>
            </div>
            
            <div>
              <label className="text-[10px] font-black uppercase text-slate-700 ml-1">Địa chỉ</label>
              <input className="w-full bg-slate-50 p-3.5 rounded-2xl border-2 border-slate-200 font-bold text-slate-800 text-sm" placeholder="Địa chỉ..." value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black uppercase text-blue-700 ml-1 italic">SĐT Khách thuê</label>
                <input className="w-full bg-blue-50 p-3.5 rounded-2xl border-2 border-blue-100 font-black text-blue-700" placeholder="09xxxx..." value={formData.phoneTenant} onChange={e => setFormData({...formData, phoneTenant: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-600 ml-1">SĐT Chủ nhà</label>
                <input className="w-full bg-slate-50 p-3.5 rounded-2xl border-2 border-slate-100 font-black text-slate-600" placeholder="09xxxx..." value={formData.phoneLandlord} onChange={e => setFormData({...formData, phoneLandlord: e.target.value})} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-700 ml-1">Số cũ (m3)</label>
                <input type="number" className="w-full bg-slate-50 p-3.5 rounded-2xl border-2 border-slate-200 font-black text-slate-800" value={formData.oldIndex} onChange={e => setFormData({...formData, oldIndex: parseFloat(e.target.value) || 0})} />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-rose-600 ml-1">Nợ tồn (đ)</label>
                <input type="number" className="w-full bg-rose-50 p-3.5 rounded-2xl border-2 border-rose-100 font-black text-rose-600" value={formData.oldDebt} onChange={e => setFormData({...formData, oldDebt: parseFloat(e.target.value) || 0})} />
              </div>
            </div>

            <button 
              onClick={() => { 
                if (isEdit && selectedCustomer) {
                  updateCustomer(selectedCustomer.id, formData);
                  setView('detail'); // QUAY LẠI CHI TIẾT SAU KHI SỬA
                } else {
                  addCustomer(formData);
                  setView('list'); // VỀ DANH SÁCH NẾU THÊM MỚI
                }
              }} 
              className="w-full bg-blue-700 text-white py-4.5 rounded-[1.5rem] font-black uppercase shadow-2xl mt-4 active:scale-95 border-b-4 border-blue-900"
            >
              Lưu dữ liệu khách
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'edit_msg') {
    return (
      <div className="fixed inset-0 bg-white z-[200] p-6 pt-[calc(1.5rem+var(--sat))] flex flex-col animate-in slide-in-from-bottom">
        <header className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-black uppercase italic text-amber-700">Sửa mẫu thông báo</h2>
          <button onClick={() => setView('list')} className="p-3 bg-slate-100 rounded-full text-slate-800 active:scale-90"><X size={24}/></button>
        </header>
        <p className="text-[11px] font-black text-slate-600 mb-3 uppercase tracking-wider ml-1">Nội dung này sẽ hiện ở cuối tin nhắn Zalo:</p>
        <textarea className="w-full bg-slate-100 p-5 rounded-[2rem] border-2 border-slate-200 font-bold text-slate-800 text-[16px] flex-1 mb-8 outline-none focus:border-amber-500 shadow-inner" value={config.globalMessage} onChange={e => setConfig({...config, globalMessage: e.target.value})} />
        <button onClick={() => setView('list')} className="w-full bg-amber-500 text-white py-5 rounded-[1.8rem] font-black uppercase shadow-xl flex items-center justify-center gap-2 active:scale-95 border-b-4 border-amber-700 tracking-widest"><Save size={24} /> Lưu tin nhắn mẫu</button>
      </div>
    );
  }

  return null;
};
