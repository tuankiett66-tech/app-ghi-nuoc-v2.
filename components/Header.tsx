
import React, { useState, useEffect, useRef } from 'react';
import { Search, X, MessageCircle, CloudDownload, Settings, MessageSquareQuote, Loader2, ClipboardCheck, Mic, History, Save, Check, DollarSign } from 'lucide-react';

interface HeaderProps {
  title: string;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  isSyncing: boolean;
  onSync: () => void;
  onSave: () => void;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  onShowAdd: () => void;
  onShowConfig: () => void;
  onShowMsgTemplate: () => void;
  onToggleZaloFilter: () => void;
  onlyNonZalo: boolean;
  onToggleUnpaidFilter: () => void;
  onlyUnpaid: boolean;
  lastSyncTime?: number;
  onShowVerify: () => void;
  onShowGroups: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  title, searchQuery, setSearchQuery, isSyncing, onSync, onSave, syncStatus, onShowAdd, onShowConfig, onShowMsgTemplate, onlyNonZalo, onToggleZaloFilter, onlyUnpaid, onToggleUnpaidFilter, lastSyncTime, onShowVerify, onShowGroups
}) => {
  const [history, setHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('water_search_history');
    if (saved) {
      setHistory(JSON.parse(saved));
    }
  }, []);

  // Save history to localStorage
  const saveHistory = (newHistory: string[]) => {
    setHistory(newHistory);
    localStorage.setItem('water_search_history', JSON.stringify(newHistory));
  };

  const addToHistory = (query: string) => {
    const q = query.trim();
    if (!q || q.length < 2) return;
    
    const filtered = history.filter(item => item !== q);
    const updated = [q, ...filtered].slice(0, 10); // Keep max 10 items
    saveHistory(updated);
  };

  const deleteHistoryItem = (e: React.MouseEvent, item: string) => {
    e.stopPropagation();
    const updated = history.filter(i => i !== item);
    saveHistory(updated);
  };

  const clearAllHistory = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Xóa tất cả lịch sử tìm kiếm?")) {
      saveHistory([]);
    }
  };

  const handleVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitRecognition;
    if (!SpeechRecognition) {
      alert("Trình duyệt của bạn không hỗ trợ tìm kiếm giọng nói.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'vi-VN';
    recognition.start();
    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setSearchQuery(text);
      addToHistory(text);
    };
  };

  const handleInputChange = (val: string) => {
    setSearchQuery(val);
  };

  const handleInputBlur = () => {
    // Delay hiding to allow clicking on history items
    setTimeout(() => {
      setShowHistory(false);
      if (searchQuery.trim().length >= 2) {
        addToHistory(searchQuery);
      }
    }, 200);
  };

  return (
    <div className="shrink-0 z-[110] bg-white shadow-sm">
      <header className="p-2 pt-[calc(0.5rem+var(--sat))] flex justify-between items-center border-b relative z-[120] gap-1">
        <div className="flex flex-col ml-1">
          <h1 className="text-base font-black text-blue-700 italic uppercase leading-none">{title}</h1>
          {typeof lastSyncTime === 'number' && lastSyncTime > 0 && !isNaN(lastSyncTime) && (
            <span className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">
              Cloud: {(() => {
                try {
                  const d = new Date(lastSyncTime);
                  return isNaN(d.getTime()) ? '---' : d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                } catch (e) {
                  return '---';
                }
              })()}
            </span>
          )}
        </div>
        <div className="flex gap-0 items-center overflow-x-auto no-scrollbar pr-1">
          <button 
            onClick={() => setIsSearchExpanded(!isSearchExpanded)} 
            title="Tìm kiếm" 
            className={`p-1.5 rounded-lg transition-all active:scale-90 touch-manipulation shrink-0 ${isSearchExpanded ? 'bg-blue-600 text-white shadow-lg' : 'text-blue-700'}`}
          >
            <Search size={19}/>
          </button>
          <button onClick={onShowVerify} title="Kiểm tra" className="p-1.5 text-emerald-600 active:scale-90 touch-manipulation shrink-0"><ClipboardCheck size={19}/></button>
          <button onClick={onShowMsgTemplate} title="Mẫu tin" className="p-1.5 text-amber-600 active:scale-90 touch-manipulation shrink-0"><MessageSquareQuote size={19}/></button>
          <button onClick={onToggleZaloFilter} title="Lọc chưa Zalo" className={`p-1.5 rounded-lg transition-colors touch-manipulation shrink-0 ${onlyNonZalo ? 'text-blue-700 bg-blue-100' : 'text-slate-600'}`}><MessageCircle size={19}/></button>
          <button onClick={onToggleUnpaidFilter} title="Lọc chưa thu" className={`p-1.5 rounded-lg transition-colors touch-manipulation shrink-0 ${onlyUnpaid ? 'text-rose-600 bg-rose-100' : 'text-slate-600'}`}><DollarSign size={19}/></button>
          <button onClick={onSync} title="Đồng bộ về" disabled={isSyncing} className="p-1.5 text-blue-700 active:scale-90 touch-manipulation shrink-0">{isSyncing ? <Loader2 className="animate-spin" size={19}/> : <CloudDownload size={19}/>}</button>
          <button onClick={onSave} title="Lưu dữ liệu" className="p-1.5 text-emerald-600 active:scale-90 touch-manipulation relative shrink-0">
            <Save size={19}/>
            {syncStatus === 'syncing' && (
              <div className="absolute -top-0.5 -right-0.5 bg-blue-600 text-white rounded-full p-0.5 animate-spin">
                <Loader2 size={7} />
              </div>
            )}
            {syncStatus === 'synced' && (
              <div className="absolute -top-0.5 -right-0.5 bg-emerald-500 text-white rounded-full p-0.5 shadow-sm">
                <Check size={7} strokeWidth={4} />
              </div>
            )}
            {syncStatus === 'error' && (
              <div className="absolute -top-0.5 -right-0.5 bg-rose-500 text-white rounded-full p-0.5 shadow-sm">
                <X size={7} strokeWidth={4} />
              </div>
            )}
          </button>
          <button onClick={onShowConfig} title="Cấu hình" className="p-1.5 text-slate-700 active:scale-90 touch-manipulation shrink-0"><Settings size={19}/></button>
        </div>
      </header>

      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isSearchExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="p-3 bg-slate-100/50 relative z-[115]">
          <div className="flex flex-col gap-2">
            <div className="relative flex items-center group">
              <input 
                className="w-full bg-white rounded-2xl py-3.5 pl-11 pr-24 shadow-md border-2 border-slate-200 focus:border-blue-500 outline-none text-[15px] font-bold text-slate-800 placeholder:text-slate-400" 
                placeholder="Tìm tên, Mã KH, điện thoại..." 
                value={searchQuery} 
                onFocus={() => setShowHistory(true)}
                onBlur={handleInputBlur}
                onChange={e => handleInputChange(e.target.value)} 
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <div className="absolute right-3 flex gap-1 items-center">
                {searchQuery && <button onClick={() => setSearchQuery('')} className="text-rose-500 bg-rose-50 p-1.5 rounded-lg active:scale-90"><X size={18} /></button>}
                <button onClick={handleVoiceSearch} className="text-blue-600 bg-blue-50 p-2 rounded-xl active:scale-90 border border-blue-100"><Mic size={20} /></button>
              </div>
            </div>

            {/* Search History - Now relative to push content */}
            {showHistory && history.length > 0 && (
              <div 
                ref={dropdownRef}
                className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden animate-in slide-in-from-top-2 duration-200"
              >
                <div className="p-3 border-b bg-slate-50 flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <History size={12}/> Lịch sử tìm kiếm
                  </span>
                  <button 
                    onMouseDown={(e) => clearAllHistory(e)}
                    className="text-[10px] font-bold text-rose-500 uppercase hover:underline"
                  >
                    Xóa hết
                  </button>
                </div>
                <div className="max-h-[200px] overflow-y-auto">
                  {history.map((item, idx) => (
                    <div 
                      key={idx}
                      onMouseDown={() => {
                        setSearchQuery(item);
                        setShowHistory(false);
                      }}
                      className="flex items-center justify-between p-3.5 hover:bg-blue-50 active:bg-blue-100 border-b border-slate-50 last:border-0 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <History size={14} className="text-slate-300 shrink-0" />
                        <span className="text-slate-700 font-bold truncate text-sm">{item}</span>
                      </div>
                      <button 
                        onMouseDown={(e) => deleteHistoryItem(e, item)}
                        className="p-1 text-slate-300 hover:text-rose-500 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
