
import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Plus, MessageCircle, CloudDownload, Settings, MessageSquareQuote, Loader2, ClipboardCheck, Mic, History, Trash2 } from 'lucide-react';

interface HeaderProps {
  title: string;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  isSyncing: boolean;
  onSync: () => void;
  onShowAdd: () => void;
  onShowConfig: () => void;
  onShowMsgTemplate: () => void;
  onToggleZaloFilter: () => void;
  onlyNonZalo: boolean;
  onShowVerify: () => void;
  onShowGroups: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  title, searchQuery, setSearchQuery, isSyncing, onSync, onShowAdd, onShowConfig, onShowMsgTemplate, onlyNonZalo, onToggleZaloFilter, onShowVerify
}) => {
  const [history, setHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
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
      <header className="p-4 pt-[calc(1rem+var(--sat))] flex justify-between items-center border-b relative z-[120]">
        <h1 className="text-xl font-black text-blue-700 italic uppercase truncate max-w-[150px]">{title}</h1>
        <div className="flex gap-1 items-center">
          <button onClick={onShowVerify} title="Kiểm tra" className="p-2 text-emerald-600 active:scale-90 touch-manipulation"><ClipboardCheck size={24}/></button>
          <button onClick={onShowMsgTemplate} title="Mẫu tin" className="p-2 text-amber-600 active:scale-90 touch-manipulation"><MessageSquareQuote size={24}/></button>
          <button onClick={onShowAdd} title="Thêm mới" className="p-2 text-blue-700 active:scale-90 touch-manipulation"><Plus size={24}/></button>
          <button onClick={onToggleZaloFilter} title="Lọc chưa Zalo" className={`p-2 rounded-xl transition-colors touch-manipulation ${onlyNonZalo ? 'text-blue-700 bg-blue-100' : 'text-slate-600'}`}><MessageCircle size={22}/></button>
          <button onClick={onSync} title="Đồng bộ" disabled={isSyncing} className="p-2 text-blue-700 active:scale-90 touch-manipulation">{isSyncing ? <Loader2 className="animate-spin" size={22}/> : <CloudDownload size={22}/>}</button>
          <button onClick={onShowConfig} title="Cấu hình" className="p-2 text-slate-700 active:scale-90 touch-manipulation"><Settings size={22}/></button>
        </div>
      </header>

      <div className="p-3 bg-slate-100/50 relative z-[115]">
        <div className="relative flex items-center group">
          <input 
            className="w-full bg-white rounded-2xl py-3.5 pl-11 pr-24 shadow-md border-2 border-slate-200 focus:border-blue-500 outline-none text-[15px] font-bold text-slate-800 placeholder:text-slate-400" 
            placeholder="Tìm tên, STT, điện thoại..." 
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

          {/* Search History Dropdown */}
          {showHistory && history.length > 0 && (
            <div 
              ref={dropdownRef}
              className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-[130] animate-in fade-in zoom-in-95 duration-150"
            >
              <div className="p-3 border-b bg-slate-50 flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <History size={12}/> Tìm kiếm gần đây
                </span>
                <button 
                  onMouseDown={(e) => clearAllHistory(e)}
                  className="text-[10px] font-bold text-rose-500 uppercase hover:underline"
                >
                  Xóa hết
                </button>
              </div>
              <div className="max-h-[250px] overflow-y-auto">
                {history.map((item, idx) => (
                  <div 
                    key={idx}
                    onMouseDown={() => {
                      setSearchQuery(item);
                      setShowHistory(false);
                    }}
                    className="flex items-center justify-between p-4 hover:bg-blue-50 active:bg-blue-100 border-b border-slate-50 last:border-0 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <History size={16} className="text-slate-300 shrink-0" />
                      <span className="text-slate-700 font-bold truncate">{item}</span>
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
  );
};
