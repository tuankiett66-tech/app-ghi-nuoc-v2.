
import React from 'react';
import { CheckCheck, Phone, Copy } from 'lucide-react';
import { Customer } from '../types';
import { formatCurrency } from '../utils';

interface ListViewProps {
  customers: Customer[];
  onSelect: (id: string) => void;
  onCall: (phone: string) => void;
  onCopyMsg: (cust: Customer) => void;
}

export const ListView: React.FC<ListViewProps> = ({ customers, onSelect, onCall, onCopyMsg }) => {
  return (
    <div className="flex-1 overflow-y-auto px-3 space-y-3 pb-40 scroll-smooth bg-slate-50">
      {customers.map(c => (
        <div key={c.id} id={`cust-${c.id}`} onClick={() => onSelect(c.id)} className={`bg-white p-4 rounded-[1.8rem] shadow-md border-2 transition-all active:scale-[0.98] ${c.isZalo ? 'border-blue-600 bg-blue-50/20' : 'border-white'}`}>
          <div className="flex items-start gap-3">
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <div className={`px-2.5 py-1.5 rounded-xl min-w-[38px] text-center text-white text-[12px] font-black shadow-sm ${c.isZalo ? 'bg-blue-500' : 'bg-slate-800'}`}>{c.stt}</div>
              <div className={`p-2 rounded-full border-2 ${c.isZalo ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'text-slate-300 border-slate-100'}`}><CheckCheck size={16} /></div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className={`font-black uppercase text-[16px] truncate ${c.isZalo ? 'text-blue-800' : 'text-slate-900'}`}>{c.name}</h3>
              <p className="text-[11px] text-slate-600 font-bold truncate leading-tight mt-0.5">ĐC: {c.address || '---'}</p>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
                <p className="text-[10px] text-blue-700 font-black flex items-center gap-1"><span className="text-slate-400 font-bold uppercase">Khách:</span> {c.phoneTenant || '---'}</p>
                {c.phoneLandlord && <p className="text-[10px] text-slate-500 font-black flex items-center gap-1"><span className="text-slate-400 font-bold uppercase">Chủ:</span> {c.phoneLandlord}</p>}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="font-black text-[19px] text-rose-600 tracking-tighter leading-none mb-1">{formatCurrency(c.balance)}</div>
              {c.newIndex > 0 ? (
                <div className="text-[10px] font-black text-white bg-emerald-600 px-2 py-0.5 rounded-lg shadow-sm">SỐ: {c.newIndex}</div>
              ) : (
                <div className="text-[10px] font-black text-slate-400 uppercase italic">Chưa ghi</div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t-2 border-slate-50">
             <button onClick={(e) => { e.stopPropagation(); onCall(c.phoneTenant || c.phone); }} className="flex items-center justify-center gap-2 py-2.5 bg-blue-100 text-blue-700 rounded-xl text-[11px] font-black uppercase active:scale-95 shadow-sm border border-blue-200"><Phone size={15}/> Gọi Zalo</button>
             <button onClick={(e) => { e.stopPropagation(); onCopyMsg(c); }} className="flex items-center justify-center gap-2 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-[11px] font-black uppercase active:scale-95 shadow-sm border border-slate-200"><Copy size={15}/> Copy Bill</button>
          </div>
        </div>
      ))}
      {customers.length === 0 && <div className="py-20 text-center text-slate-400 font-black uppercase italic text-sm">Không tìm thấy dữ liệu</div>}
    </div>
  );
};
