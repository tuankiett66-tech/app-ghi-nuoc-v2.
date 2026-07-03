
import React, { useState, useEffect } from 'react';
import { CheckCheck, Copy, Plus, Wallet } from 'lucide-react';
import { Customer } from '../types';
import { formatCurrency, getMeterStatus } from '../utils';
import { AlertTriangle, Clock } from 'lucide-react';

interface ListViewProps {
  customers: Customer[];
  onSelect: (id: string) => void;
  onCall: (phone: string) => void;
  onCopyMsg: (cust: Customer) => void;
  onCopyName: (name: string) => void;
  onAddAfter: (maKH: string) => void;
  onCollectFull: (id: string) => void;
}

export const ListView: React.FC<ListViewProps> = ({ customers, onSelect, onCall, onCopyMsg, onCopyName, onAddAfter, onCollectFull }) => {
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const lastScrollTimeRef = React.useRef<number>(0);

  // Reset focus when the lists or search filter changes
  useEffect(() => {
    setFocusedIndex(-1);
  }, [customers]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid hijacking keyboard controls when typing in input or textareas
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (
        activeTag === 'input' || 
        activeTag === 'textarea' || 
        document.activeElement?.hasAttribute('contenteditable')
      ) {
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex(prev => {
          const next = prev < customers.length - 1 ? prev + 1 : prev;
          scrollToIndex(next);
          return next;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex(prev => {
          const next = prev > 0 ? prev - 1 : prev;
          scrollToIndex(next);
          return next;
        });
      } else if (e.key === 'Enter') {
        if (focusedIndex >= 0 && focusedIndex < customers.length) {
          e.preventDefault();
          onSelect(customers[focusedIndex].id);
        }
      }
    };

    const scrollToIndex = (index: number) => {
      if (index < 0 || index >= customers.length) return;
      const container = document.getElementById('main-list-container');
      const el = document.getElementById(`cust-${customers[index].id}`);
      if (!container || !el) return;

      const containerRect = container.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();

      // Check if the element is out of the scrollable viewport (with safety margins)
      const isBelow = elRect.bottom > containerRect.bottom - 16;
      const isAbove = elRect.top < containerRect.top + 16;

      if (isBelow || isAbove) {
        const now = Date.now();
        // Throttle to once every 120ms to allow smooth gentle scrolling without blocking main thread
        if (now - lastScrollTimeRef.current > 120) {
          lastScrollTimeRef.current = now;
          const containerScrollTop = container.scrollTop;
          let targetScrollTop = containerScrollTop;

          if (isBelow) {
            targetScrollTop = containerScrollTop + (elRect.bottom - containerRect.bottom) + 32;
          } else if (isAbove) {
            targetScrollTop = containerScrollTop + (elRect.top - containerRect.top) - 32;
          }

          container.scrollTo({
            top: targetScrollTop,
            behavior: 'smooth'
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [customers, focusedIndex, onSelect]);

  return (
    <div id="main-list-container" className="flex-1 overflow-y-auto px-3 space-y-2 pb-40 bg-slate-50">
      {customers.map((c, idx) => {
        const isFocused = idx === focusedIndex;
        return (
          <div 
            key={c.id} 
            id={`cust-${c.id}`} 
            onClick={() => onSelect(c.id)} 
            onMouseEnter={() => setFocusedIndex(idx)}
            className={`bg-white p-3 rounded-2xl shadow-sm border-2 transition-all duration-75 cursor-pointer ${
              isFocused 
                ? 'border-slate-800 bg-slate-100/50 shadow-md' 
                : c.isProcessed ? 'border-emerald-500 bg-emerald-50/10' : 
                  c.isZaloFriend ? 'border-blue-600 bg-blue-50/20' : 
                  c.isZalo ? 'border-indigo-400 bg-indigo-50/10' : 
                  'border-white hover:border-slate-200'
            }`}
          >
            <div className="flex items-start gap-2.5">
              <div className="flex flex-col items-center gap-1 shrink-0">
                <div className="text-[9px] font-extrabold text-slate-400 uppercase leading-none tracking-wider">Mã KH</div>
                <div className={`px-2.5 py-1.5 rounded-xl min-w-[42px] text-center text-white text-[14px] font-black shadow-sm leading-none ${c.isProcessed ? 'bg-emerald-500' : c.isZaloFriend ? 'bg-blue-600' : c.isZalo ? 'bg-indigo-600' : 'bg-slate-800'}`}>{c.maKH}</div>
                <div className={`p-1 rounded-full border-2 -mt-1 bg-white ${
                  c.isProcessed ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 
                  c.isZaloFriend ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 
                  c.isZalo ? 'bg-indigo-100 text-indigo-600 border-indigo-200' : 
                  'text-slate-300 border-slate-100'
                }`}>
                  <CheckCheck size={12} />
                </div>
                {getMeterStatus(c.installDate).status !== 'ok' && getMeterStatus(c.installDate).status !== 'unknown' && (
                  <div className={`p-1 rounded-full border-2 mt-0.5 ${
                    getMeterStatus(c.installDate).status === 'danger' ? 'bg-rose-600 text-white border-rose-600 shadow-sm' : 'bg-amber-500 text-white border-amber-500 shadow-sm'
                  }`}>
                    {getMeterStatus(c.installDate).status === 'danger' ? <AlertTriangle size={10} /> : <Clock size={10} />}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-1 mb-0.5">
                  <h3 className={`font-black uppercase text-[14px] sm:text-[16px] leading-tight flex-1 ${c.isZalo ? 'text-blue-800' : 'text-slate-900'}`}>{c.name}</h3>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onCopyName(c.name); }}
                    className="p-1 bg-slate-100 text-slate-400 rounded-lg active:scale-90 shrink-0 mt-0.5"
                    title="Copy tên"
                  >
                    <Copy size={11} />
                  </button>
                </div>
                <p className="text-[10px] sm:text-[11px] text-slate-600 font-bold leading-tight">ĐC: {c.address || '---'}</p>
                <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1">
                  <p className="text-[9px] sm:text-[10px] text-blue-700 font-black flex items-center gap-1"><span className="text-slate-400 font-bold uppercase">Khách:</span> {c.phoneTenant || c.phone || '---'}</p>
                  {c.phoneLandlord && <p className="text-[9px] sm:text-[10px] text-slate-500 font-black flex items-center gap-1"><span className="text-slate-400 font-bold uppercase">Chủ:</span> {c.phoneLandlord}</p>}
                </div>
              </div>
              <div className="text-right shrink-0 flex flex-col items-end justify-center">
                <div className="font-black text-[18px] sm:text-[20px] text-rose-600 tracking-tighter leading-none mb-1">{formatCurrency(c.balance)}</div>
                {c.newIndex > 0 ? (
                  <div className="text-[12px] sm:text-[14px] font-black text-white bg-emerald-600 px-2.5 py-1 rounded-xl shadow-md inline-flex items-center tracking-tight gap-1 border border-emerald-500">
                    <span className="text-[8px] font-extrabold text-emerald-100 uppercase">SỐ:</span>
                    <span className="text-[14px] sm:text-[15px] font-black leading-none">{c.newIndex}</span>
                  </div>
                ) : (
                  <div className="text-[10px] sm:text-[11px] font-black text-rose-500 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-lg uppercase tracking-wider animate-pulse">
                    Chưa ghi
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1.5 mt-2.5 pt-2 border-t border-slate-100">
               <button onClick={(e) => { e.stopPropagation(); onCopyMsg(c); }} className="flex items-center justify-center gap-1 py-1.5 bg-slate-100 text-slate-700 rounded-xl text-[9px] sm:text-[10px] font-black uppercase active:scale-95 shadow-xs border border-slate-200"><Copy size={12}/> Copy Bill</button>
               <button 
                 onClick={(e) => { e.stopPropagation(); onCollectFull(c.id); }} 
                 className={`flex items-center justify-center gap-1 py-1.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase active:scale-95 shadow-md border-b-2 transition-all ${
                   c.status === 'paid' 
                     ? 'bg-slate-200 text-slate-400 border-slate-300 pointer-events-none shadow-none border-b-0' 
                     : 'bg-emerald-600 text-white border-emerald-800'
                 }`}
               >
                 <Wallet size={12}/> Thu đủ
               </button>
               <button onClick={(e) => { e.stopPropagation(); onAddAfter(c.maKH); }} className="flex items-center justify-center gap-1 py-1.5 bg-indigo-50 text-indigo-700 rounded-xl text-[9px] sm:text-[10px] font-black uppercase active:scale-95 shadow-xs border border-indigo-100"><Plus size={12}/> Chèn sau</button>
            </div>
          </div>
        );
      })}
      {customers.length === 0 && <div className="py-20 text-center text-slate-400 font-black uppercase italic text-sm">Không tìm thấy dữ liệu</div>}
    </div>
  );
};
