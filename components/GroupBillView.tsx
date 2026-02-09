
import React, { useState, useMemo } from 'react';
import { ChevronLeft, Plus, X, MessageCircle, Users, Trash2, Copy } from 'lucide-react';
import { Customer, SystemConfig } from '../types';
import { formatCurrency, copyToClipboard, normalizePhoneForZalo } from '../utils';

interface GroupBillViewProps {
  customers: Customer[];
  config: SystemConfig;
  onBack: () => void;
  onSendZalo: (msg: string, sdt: string) => void;
}

export const GroupBillView: React.FC<GroupBillViewProps> = ({ customers, config, onBack, onSendZalo }) => {
  const [sttInput, setSttInput] = useState('');
  const [groupItems, setGroupItems] = useState<Customer[]>([]);
  const [masterSdt, setMasterSdt] = useState('');
  const [masterName, setMasterName] = useState('');

  const handleAdd = () => {
    const found = customers.find(c => c.stt.toString() === sttInput);
    if (found) {
      if (groupItems.find(item => item.id === found.id)) {
        alert("STT này đã có trong nhóm!");
      } else {
        setGroupItems([...groupItems, found]);
        if (!masterSdt) setMasterSdt(found.phoneLandlord || found.phoneTenant || '');
        if (!masterName) {
            const baseName = found.name.split('_')[0].split('(')[0].trim();
            setMasterName(baseName);
        }
      }
    } else {
      alert("Không tìm thấy khách hàng với STT này!");
    }
    setSttInput('');
  };

  const removeItem = (id: string) => {
    setGroupItems(groupItems.filter(i => i.id !== id));
  };

  const totals = useMemo(() => groupItems.reduce((acc, curr) => ({
    vol: acc.vol + curr.volume,
    amt: acc.amt + curr.amount,
    debt: acc.debt + curr.oldDebt,
    total: acc.total + (curr.amount + curr.oldDebt)
  }), { vol: 0, amt: 0, debt: 0, total: 0 }), [groupItems]);

  const generateGroupMsg = () => {
    const now = new Date();
    const monthYear = `${now.getMonth() + 1}/${now.getFullYear()}`;
    
    let msg = `KỲ NƯỚC THÁNG ${monthYear}\n`;
    msg += `CHỦ HỘ: ${masterName.toUpperCase()}\n`;
    msg += `---------------------------\n`;

    groupItems.forEach((c) => {
      const houseTotal = c.amount + c.oldDebt;
      msg += `KH: ${c.name}\n`;
      msg += `SỐ: ${c.newIndex} - ${c.oldIndex} = ${c.volume}m3 x ${config.waterRate.toLocaleString('vi-VN')} = ${Math.round(c.amount).toLocaleString('vi-VN')}\n`;
      msg += `NỢ CŨ: ${Math.round(c.oldDebt).toLocaleString('vi-VN')}\n`;
      msg += `CỘNG: ${Math.round(houseTotal).toLocaleString('vi-VN')}\n`;
      msg += `---------------------------\n`;
    });

    msg += `TỔNG CỘNG THANH TOÁN: ${Math.round(totals.total).toLocaleString('vi-VN')} đ\n`;
    msg += `--- \n`;
    msg += config.globalMessage;

    return msg;
  };

  const handleCopyOnly = async () => {
    const msg = generateGroupMsg();
    const success = await copyToClipboard(msg);
    if (success) {
      alert("Đã sao chép tin nhắn tổng hợp!");
    }
  };

  return (
    <div className="fixed inset-0 bg-[#f1f5f9] z-[150] flex flex-col pt-[calc(0.5rem+var(--sat))]">
      <header className="px-4 py-3 flex items-center justify-between bg-white border-b shadow-sm shrink-0">
        <div className="flex items-center gap-2">
            <button onClick={onBack} className="p-2 text-slate-800 active:scale-90"><ChevronLeft size={28}/></button>
            <h2 className="text-lg font-black uppercase italic text-indigo-700">Hóa đơn nhóm</h2>
        </div>
        <button onClick={() => { if(confirm("Xóa danh sách nhóm?")) { setGroupItems([]); setMasterName(''); setMasterSdt(''); } }} className="p-2 text-rose-500 active:scale-90"><Trash2 size={20}/></button>
      </header>

      <div className="p-3 space-y-3 shrink-0">
        <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-indigo-50">
          <p className="text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Nhập STT nhà để thêm vào nhóm</p>
          <div className="flex gap-2">
            <input 
              autoFocus
              type="number" 
              className="flex-1 bg-slate-100 p-4 rounded-2xl font-black text-2xl text-indigo-700 outline-none border-2 border-transparent focus:border-indigo-500" 
              placeholder="Ví dụ: 83"
              value={sttInput}
              onChange={e => setSttInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
            <button onClick={handleAdd} className="bg-indigo-600 text-white px-6 rounded-2xl active:scale-95 shadow-lg shadow-indigo-100"><Plus size={28}/></button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
            <div className="bg-white p-3 rounded-2xl border shadow-sm">
                <label className="text-[9px] font-black text-slate-400 uppercase">Tên chủ/Nhóm</label>
                <input className="w-full bg-transparent font-black text-slate-800 outline-none uppercase" value={masterName} onChange={e => setMasterName(e.target.value)} placeholder="Tên chủ..." />
            </div>
            <div className="bg-white p-3 rounded-2xl border shadow-sm">
                <label className="text-[9px] font-black text-slate-400 uppercase">SĐT Zalo</label>
                <input className="w-full bg-transparent font-black text-indigo-600 outline-none" value={masterSdt} onChange={e => setMasterSdt(e.target.value)} placeholder="0833..." />
            </div>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto px-3 pb-60">
        <div className="bg-white rounded-3xl shadow-md border overflow-hidden">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-slate-50 border-b text-slate-500 font-black uppercase tracking-tighter">
              <tr>
                <th className="px-3 py-3 w-10">STT</th>
                <th className="px-2 py-3">Khách hàng</th>
                <th className="px-2 py-3 text-center">Số</th>
                <th className="px-2 py-3 text-center">m3</th>
                <th className="px-3 py-3 text-right">Tiền</th>
                <th className="px-2 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {groupItems.map((c) => (
                <tr key={c.id} className="font-bold text-slate-700">
                  <td className="px-3 py-3 font-black text-slate-900">{c.stt}</td>
                  <td className="px-2 py-3">
                    <div className="truncate w-24 uppercase">{c.name}</div>
                    <div className="text-[9px] text-slate-400 font-normal truncate">{c.address}</div>
                  </td>
                  <td className="px-2 py-3 text-center whitespace-nowrap text-[10px]">
                    <span className="text-slate-300">{c.oldIndex}</span> → <span className="text-indigo-600 font-black">{c.newIndex}</span>
                  </td>
                  <td className="px-2 py-3 text-center font-black text-indigo-700">{c.volume}</td>
                  <td className="px-3 py-3 text-right font-black text-slate-900">
                    {Math.round(c.amount + c.oldDebt).toLocaleString('vi-VN')}
                  </td>
                  <td className="px-2 py-3">
                    <button onClick={() => removeItem(c.id)} className="text-rose-400 p-1"><X size={16}/></button>
                  </td>
                </tr>
              ))}
              {groupItems.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-300 italic uppercase font-black text-[10px] tracking-widest">Hãy nhập STT nhà phía trên</td>
                </tr>
              )}
            </tbody>
            {groupItems.length > 0 && (
              <tfoot className="bg-indigo-50/50 border-t-2 border-indigo-100 font-black">
                <tr>
                  <td colSpan={3} className="px-3 py-3 text-indigo-800 uppercase italic">Tổng cộng</td>
                  <td className="px-2 py-3 text-center text-indigo-700 text-sm">{totals.vol}</td>
                  <td className="px-3 py-3 text-right text-indigo-700 text-sm">{Math.round(totals.total).toLocaleString('vi-VN')}</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <div className="fixed bottom-24 left-4 right-4 bg-white/95 backdrop-blur-md p-5 rounded-[2.5rem] shadow-2xl border-2 border-indigo-100 flex flex-col gap-3">
        <div className="flex justify-between items-end">
            <div>
                <p className="text-[10px] font-black text-slate-400 uppercase italic">Tổng nợ cũ</p>
                <p className="font-black text-rose-600 text-lg">{formatCurrency(totals.debt)}</p>
            </div>
            <div className="text-right">
                <p className="text-[10px] font-black text-indigo-800 uppercase italic tracking-wider">Thành tiền tổng</p>
                <p className="text-3xl font-black text-indigo-700 tracking-tighter">{formatCurrency(totals.total)}</p>
            </div>
        </div>

        <div className="grid grid-cols-12 gap-2">
            <button 
                onClick={() => onSendZalo(generateGroupMsg(), masterSdt)} 
                disabled={groupItems.length === 0 || !masterSdt || !masterName}
                className="col-span-8 bg-indigo-700 text-white py-5 rounded-[1.8rem] font-black uppercase flex items-center justify-center gap-3 shadow-xl active:scale-95 disabled:bg-slate-300 border-b-4 border-indigo-900"
            >
                <MessageCircle size={24}/> Gửi Zalo
            </button>
            <button 
                onClick={handleCopyOnly}
                disabled={groupItems.length === 0}
                className="col-span-4 bg-slate-800 text-white py-5 rounded-[1.8rem] font-black uppercase flex items-center justify-center gap-2 shadow-xl active:scale-95 disabled:bg-slate-300 border-b-4 border-slate-950"
            >
                <Copy size={20}/> Copy
            </button>
        </div>
      </div>
    </div>
  );
};
