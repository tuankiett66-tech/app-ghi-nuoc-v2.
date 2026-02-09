
import React from 'react';
import { X, UploadCloud, FileSpreadsheet, Trash2, Globe } from 'lucide-react';
import { SystemConfig } from '../types';
import { parseSafe } from '../utils';

interface ConfigViewProps {
  config: SystemConfig;
  setConfig: (c: SystemConfig) => void;
  onBack: () => void;
  onImport: () => void;
  onExport: () => void;
  onClear: () => void;
}

export const ConfigView: React.FC<ConfigViewProps> = ({ config, setConfig, onBack, onImport, onExport, onClear }) => {
  return (
    <div className="h-full bg-slate-50 p-6 pt-[calc(1.5rem+var(--sat))] overflow-y-auto">
      <header className="flex justify-between items-center mb-8 bg-white/80 backdrop-blur-md p-4 rounded-3xl border shadow-sm sticky top-0 z-50">
        <h2 className="text-xl font-black uppercase italic text-slate-900 tracking-tight">Cấu hình hệ thống</h2>
        <button onClick={onBack} className="p-2.5 bg-slate-200 text-slate-800 rounded-full active:scale-90"><X size={22}/></button>
      </header>
      
      <div className="space-y-7 pb-32">
        {/* Phan quan ly file */}
        <div className="bg-white border-2 border-dashed border-blue-200 p-7 rounded-[2.5rem] grid grid-cols-2 gap-4 text-center shadow-md">
          <button onClick={onImport} className="bg-emerald-600 text-white p-5 rounded-2xl font-black uppercase flex flex-col items-center gap-2 active:scale-95 shadow-lg border-b-4 border-emerald-800"><UploadCloud size={26}/> Gộp File</button>
          <button onClick={onExport} className="bg-slate-800 text-white p-5 rounded-2xl font-black uppercase flex flex-col items-center gap-2 active:scale-95 shadow-lg border-b-4 border-slate-950"><FileSpreadsheet size={26}/> Sao lưu</button>
        </div>

        {/* Phan thong so co ban */}
        <div className="space-y-5">
          <div className="bg-white p-5 rounded-[2rem] border-2 border-slate-100 shadow-sm">
            <label className="text-[11px] font-black uppercase text-slate-800 ml-1 mb-2 block tracking-wider">Đơn giá nước (VNĐ/m3)</label>
            <input className="w-full bg-blue-50 p-5 rounded-2xl text-3xl font-black text-blue-700 outline-none border-2 border-blue-100 focus:border-blue-500" type="number" value={config.waterRate} onChange={e => setConfig({...config, waterRate: parseSafe(e.target.value)})} />
          </div>

          {/* Cloud Sync Links */}
          <div className="bg-white p-6 rounded-[2.5rem] border-2 border-blue-100 space-y-4 shadow-sm">
             <div className="flex items-center gap-3 mb-2 justify-center">
                <Globe size={18} className="text-blue-700" />
                <p className="text-[13px] font-black text-blue-800 uppercase tracking-widest">Đồng bộ Cloud (Script)</p>
             </div>
             <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-700 ml-1">Link Script Bộ 01</label>
                <input className="w-full bg-slate-50 p-4 border-2 border-slate-100 rounded-2xl text-[10px] font-mono font-bold text-blue-900" placeholder="https://script.google.com/..." value={config.sheetUrl1} onChange={e => setConfig({...config, sheetUrl1: e.target.value})} />
             </div>
             <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-700 ml-1">Link Script Bộ 02</label>
                <input className="w-full bg-slate-50 p-4 border-2 border-slate-100 rounded-2xl text-[10px] font-mono font-bold text-blue-900" placeholder="https://script.google.com/..." value={config.sheetUrl2} onChange={e => setConfig({...config, sheetUrl2: e.target.value})} />
             </div>
          </div>

          <div className="bg-white p-6 rounded-[2.5rem] border-2 border-slate-200 space-y-4 shadow-sm">
             <p className="text-[13px] font-black text-slate-900 uppercase text-center tracking-widest mb-2 italic">Ngân hàng (VietQR Pay)</p>
             <div className="space-y-3">
               <input className="w-full bg-slate-50 p-4 border-2 border-slate-100 rounded-2xl text-sm font-black text-slate-800" placeholder="Mã Ngân Hàng (agribank...)" value={config.bankId} onChange={e => setConfig({...config, bankId: e.target.value})} />
               <input className="w-full bg-slate-50 p-4 border-2 border-slate-100 rounded-2xl text-sm font-black text-slate-800" placeholder="Số Tài Khoản" value={config.accountNo} onChange={e => setConfig({...config, accountNo: e.target.value})} />
               <input className="w-full bg-slate-50 p-4 border-2 border-slate-100 rounded-2xl text-sm font-black text-slate-800" placeholder="Tên Tài Khoản (KHONG DAU)" value={config.accountName} onChange={e => setConfig({...config, accountName: e.target.value})} />
             </div>
          </div>
        </div>

        <div className="space-y-3">
          <button onClick={onClear} className="w-full bg-rose-50 text-rose-700 py-4.5 rounded-2xl font-black uppercase border-2 border-rose-100 flex items-center justify-center gap-2 active:scale-95"><Trash2 size={20}/> Xóa tất cả dữ liệu</button>
          <button onClick={onBack} className="w-full bg-blue-700 text-white py-5 rounded-[1.8rem] font-black uppercase shadow-2xl active:scale-95 border-b-4 border-blue-900 tracking-widest">Lưu & Quay lại</button>
        </div>
      </div>
    </div>
  );
};
