
import React from 'react';
import { Search, X, Plus, MessageCircle, CloudDownload, Settings, MessageSquareQuote, Loader2, Users, ClipboardCheck, Mic } from 'lucide-react';

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
  title, searchQuery, setSearchQuery, isSyncing, onSync, onShowAdd, onShowConfig, onShowMsgTemplate, onlyNonZalo, onToggleZaloFilter, onShowVerify, onShowGroups
}) => {
  const handleVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
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
    };
  };

  return (
    <div className="shrink-0 z-[110] bg-white shadow-sm">
      <header className="p-4 pt-[calc(1rem+var(--sat))] flex justify-between items-center border-b relative z-[120]">
        <h1 className="text-xl font-black text-blue-700 italic uppercase truncate max-w-[150px]">{title}</h1>
        <div className="flex gap-1 items-center">
          <button onClick={onShowVerify} title="Kiểm tra" className="p-2 text-emerald-600 active:scale-90 touch-manipulation"><ClipboardCheck size={24}/></button>
          <button onClick={onShowGroups} title="Nhóm" className="p-2 text-indigo-600 active:scale-90 touch-manipulation"><Users size={24}/></button>
          <button onClick={onShowMsgTemplate} className="p-2 text-amber-600 active:scale-90 touch-manipulation"><MessageSquareQuote size={24}/></button>
          <button onClick={onShowAdd} className="p-2 text-blue-700 active:scale-90 touch-manipulation"><Plus size={24}/></button>
          <button onClick={onToggleZaloFilter} className={`p-2 rounded-xl transition-colors touch-manipulation ${onlyNonZalo ? 'text-blue-700 bg-blue-100' : 'text-slate-600'}`}><MessageCircle size={22}/></button>
          <button onClick={onSync} disabled={isSyncing} className="p-2 text-blue-700 active:scale-90 touch-manipulation">{isSyncing ? <Loader2 className="animate-spin" size={22}/> : <CloudDownload size={22}/>}</button>
          <button onClick={onShowConfig} className="p-2 text-slate-700 active:scale-90 touch-manipulation"><Settings size={22}/></button>
        </div>
      </header>

      <div className="p-3 bg-slate-100/50 relative z-[115]">
        <div className="relative flex items-center group">
          <input 
            className="w-full bg-white rounded-2xl py-3.5 pl-11 pr-24 shadow-md border-2 border-slate-200 focus:border-blue-500 outline-none text-[15px] font-bold text-slate-800 placeholder:text-slate-400" 
            placeholder="Tìm tên, STT, điện thoại..." 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)} 
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <div className="absolute right-3 flex gap-1 items-center">
            {searchQuery && <button onClick={() => setSearchQuery('')} className="text-rose-500 bg-rose-50 p-1.5 rounded-lg active:scale-90"><X size={18} /></button>}
            <button onClick={handleVoiceSearch} className="text-blue-600 bg-blue-50 p-2 rounded-xl active:scale-90 border border-blue-100"><Mic size={20} /></button>
          </div>
        </div>
      </div>
    </div>
  );
};
