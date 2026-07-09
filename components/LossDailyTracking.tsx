
import React, { useState, useMemo, useRef } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2, Calendar, TrendingUp, AlertCircle, Save, History, Activity, FileDown, FileUp, Camera, FileImage, Sparkles, Loader2, Check, Info, RefreshCw, X, Edit2 } from 'lucide-react';
import { DailySupplyReading, SystemConfig } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, ReferenceLine } from 'recharts';
import { formatCurrency, formatDateDisplay, normalizeDate, normalizeTime, exportDailyToExcel, parseDailySupplyExcelFile } from '../utils';

interface LossDailyTrackingProps {
  readings: DailySupplyReading[];
  config: SystemConfig;
  setConfig: React.Dispatch<React.SetStateAction<SystemConfig>>;
  onBack: () => void;
  onAdd: (reading: Omit<DailySupplyReading, 'id' | 'updatedAt' | 'consumption1' | 'consumption2'>) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<DailySupplyReading>) => void;
  onClosePeriod: () => boolean;
  onImport: (newReadings: Omit<DailySupplyReading, 'id' | 'updatedAt' | 'consumption1' | 'consumption2'>[]) => void;
}

export const LossDailyTracking: React.FC<LossDailyTrackingProps> = ({ readings, config, setConfig, onBack, onAdd, onDelete, onUpdate, onClosePeriod, onImport }) => {
  const [activeTab, setActiveTab] = useState<'record' | 'history' | 'chart'>('history');
  
  // Form state
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(new Date().toTimeString().slice(0, 5));
  const [m1, setM1] = useState('');
  const [m2, setM2] = useState('');
  const [notes, setNotes] = useState('');

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<DailySupplyReading>>({});

  const [showInitialSettings, setShowInitialSettings] = useState(false);
  const [tempM1Init, setTempM1Init] = useState(config.master1Initial?.toString() || '0');
  const [tempM2Init, setTempM2Init] = useState(config.master2Initial?.toString() || '0');
  const [tempDateInit, setTempDateInit] = useState(config.masterInitialDate || new Date().toISOString().split('T')[0]);

  const dailyFileInputRef = useRef<HTMLInputElement>(null);

  // AI Daily Scan states
  const [showDailyScan, setShowDailyScan] = useState(false);
  const [dailyImagePreview, setDailyImagePreview] = useState<string | null>(null);
  const [isAnalyzingDaily, setIsAnalyzingDaily] = useState(false);
  const [dailyLoadingStep, setDailyLoadingStep] = useState('');
  const [dailyError, setDailyError] = useState<string | null>(null);
  const [dailyScanResults, setDailyScanResults] = useState<{
    day: number;
    time: string;
    master1: number;
    master2: number;
    notes: string;
    isSelected: boolean;
  }[]>([]);

  const dailyCameraRef = useRef<HTMLInputElement>(null);
  const dailyImageFileRef = useRef<HTMLInputElement>(null);

  const compressAndResizeImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (readerEvent) => {
        const image = new Image();
        image.onload = () => {
          const maxWidth = 1600;
          const maxHeight = 1600;
          let width = image.width;
          let height = image.height;

          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(readerEvent.target?.result as string);
            return;
          }

          ctx.drawImage(image, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          resolve(dataUrl);
        };
        image.onerror = (err) => {
          reject(err);
        };
        image.src = readerEvent.target?.result as string;
      };
      reader.onerror = (err) => {
        reject(err);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDailyFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setDailyError(null);
    setDailyScanResults([]);
    setIsAnalyzingDaily(true);
    setDailyLoadingStep("⚙️ Đang tối ưu dung lượng ảnh...");

    try {
      const compressedDataUrl = await compressAndResizeImage(file);
      setDailyImagePreview(compressedDataUrl);
    } catch (err) {
      console.error("Error compressing image:", err);
      const reader = new FileReader();
      reader.onloadend = () => {
        setDailyImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } finally {
      setIsAnalyzingDaily(false);
      setDailyLoadingStep('');
    }
  };

  const handleStartDailyAnalysis = async () => {
    if (!dailyImagePreview) return;

    setIsAnalyzingDaily(true);
    setDailyError(null);
    setDailyScanResults([]);

    const steps = [
      "🔄 Đang truyền dữ liệu ảnh...",
      "🧠 Kích hoạt Google Gemini 3.5 phân tích biểu mẫu hằng ngày...",
      "🔍 Đọc số ngày 1-31 & các cột ĐH 1, ĐH 2...",
      "⚡ Đang đối soát và khử nhiễu sai chỉ số..."
    ];

    let stepIndex = 0;
    setDailyLoadingStep(steps[0]);
    const stepInterval = setInterval(() => {
      if (stepIndex < steps.length - 1) {
        stepIndex++;
        setDailyLoadingStep(steps[stepIndex]);
      }
    }, 1500);

    try {
      const response = await fetch("/api/scan-daily", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          image: dailyImagePreview,
          monthYear: selectedMonth
        })
      });

      clearInterval(stepInterval);

      const responseText = await response.text();
      let data: any;
      try {
        data = JSON.parse(responseText);
      } catch (parseErr) {
        throw new Error(`Mã lỗi máy chủ ${response.status}. Lỗi đọc JSON.`);
      }

      if (!response.ok) {
        if (data && data.error === "GEMINI_API_KEY_MISSING") {
          throw new Error("API_KEY_MISSING");
        }
        throw new Error(data?.message || `Lỗi máy chủ (${response.status})`);
      }

      if (data.success && Array.isArray(data.results)) {
        const mappedResults = data.results.map((item: any) => ({
          day: item.day,
          time: item.time || "07:00",
          master1: item.master1 || 0,
          master2: item.master2 || 0,
          notes: item.notes || "",
          isSelected: true
        }));

        setDailyScanResults(mappedResults);
        if (mappedResults.length === 0) {
          setDailyError("Không trích xuất được dòng số liệu nào từ ảnh chụp. Hãy đảm bảo bạn chụp ảnh rõ nét và biểu mẫu tương thích dạng bảng cấp nước hằng ngày.");
        }
      } else {
        throw new Error("AI không trả về cấu trúc mảng đúng quy chuẩn.");
      }
    } catch (err: any) {
      clearInterval(stepInterval);
      console.error(err);
      if (err.message === "API_KEY_MISSING") {
        setDailyError("API_KEY_MISSING");
      } else {
        setDailyError(err.message || "Không thể phân tích ảnh sổ. Hãy thử chụp lại sáng và nét hơn!");
      }
    } finally {
      setIsAnalyzingDaily(false);
    }
  };

  const handleApplyDailyScan = () => {
    const selected = dailyScanResults.filter(r => r.isSelected);
    if (selected.length === 0) {
      alert("Vui lòng chọn ít nhất 1 dòng kết quả để áp dụng.");
      return;
    }

    const [mStr, yStr] = selectedMonth.split('/');
    
    selected.forEach(item => {
      const dateStr = `${yStr}-${mStr}-${String(item.day).padStart(2, '0')}`;
      const existing = readings.find(r => r.date === dateStr);
      if (existing) {
        onUpdate(existing.id, {
          time: item.time,
          master1: item.master1,
          master2: item.master2,
          notes: item.notes || existing.notes
        });
      } else {
        onAdd({
          date: dateStr,
          time: item.time,
          master1: item.master1,
          master2: item.master2,
          notes: item.notes
        });
      }
    });

    alert(`🎉 Đã cập nhật thành công ${selected.length} ngày cấp nước từ ảnh chụp vào danh mục!`);
    setShowDailyScan(false);
    setDailyImagePreview(null);
    setDailyScanResults([]);
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const parsed = await parseDailySupplyExcelFile(file);
      if (parsed.length === 0) {
        alert("Không tìm thấy dòng dữ liệu hợp lệ trong file Excel. Vui lòng kiểm tra lại tiêu đề cột (NGÀY, GIỜ, CHỈ SỐ ĐH1, CHỈ SỐ ĐH2...).");
        return;
      }

      onImport(parsed);
      alert(`🎉 Đã nhập thành công ${parsed.length} dòng dữ liệu cấp nước hằng ngày từ file Excel!`);
      
      if (dailyFileInputRef.current) {
        dailyFileInputRef.current.value = "";
      }
    } catch (err) {
      console.error(err);
      alert("Đã xảy ra lỗi khi đọc file Excel. Vui lòng đảm bảo file không có mật khẩu bảo vệ và đúng định dạng bảng biểu.");
    }
  };

  const handleAdd = () => {
    if (!m1 && !m2) {
      alert("Vui lòng nhập ít nhất 1 chỉ số đồng hồ");
      return;
    }
    onAdd({
      date: normalizeDate(date),
      time,
      master1: parseFloat(m1) || 0,
      master2: parseFloat(m2) || 0,
      notes
    });
    setM1(''); setM2(''); setNotes('');
    setActiveTab('history');
  };

  const handleStartEdit = (r: DailySupplyReading) => {
    setEditingId(r.id);
    setEditData({ 
      ...r, 
      date: normalizeDate(r.date),
      time: normalizeTime(r.time)
    });
  };

  const handleSaveEdit = () => {
    if (editingId && editData) {
      onUpdate(editingId, { ...editData, date: normalizeDate(editData.date) });
      setEditingId(null);
    }
  };

  const handleSaveInitial = () => {
    setConfig(prev => ({
      ...prev,
      master1Initial: parseFloat(tempM1Init) || 0,
      master2Initial: parseFloat(tempM2Init) || 0,
      masterInitialDate: normalizeDate(tempDateInit)
    }));
    setShowInitialSettings(false);
  };

  // Helper to extract month-year from reading date (supports YYYY-MM-DD)
  const getMonthYearKey = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[1]}/${parts[0]}`; // MM/YYYY
    }
    if (dateStr.includes('/')) {
      const partsSlash = dateStr.split('/');
      if (partsSlash.length === 3) {
        if (partsSlash[2].length === 4) {
          return `${partsSlash[1].padStart(2, '0')}/${partsSlash[2]}`;
        }
      }
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    }
    return '';
  };

  const getCurrentMonthYear = () => {
    const d = new Date();
    return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };

  // Get list of unique months from readings, plus the current month, sorted chronologically:
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    const curr = getCurrentMonthYear();
    monthsSet.add(curr);
    
    readings.forEach(r => {
      const key = getMonthYearKey(r.date);
      if (key) monthsSet.add(key);
    });
    
    // Sort chronologically (YYYYMM) descending
    return Array.from(monthsSet).sort((a, b) => {
      const [mA, yA] = a.split('/');
      const [mB, yB] = b.split('/');
      return `${yB}${mB}`.localeCompare(`${yA}${mA}`);
    });
  }, [readings]);

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const curr = getCurrentMonthYear();
    return curr;
  });

  const filteredReadings = useMemo(() => {
    return readings.filter(r => getMonthYearKey(r.date) === selectedMonth);
  }, [readings, selectedMonth]);

  const readingsWithDays = useMemo(() => {
    const sorted = [...readings].map(r => ({ ...r, date: r.date.split('T')[0] })).sort((a, b) => {
      const dateTimeA = `${a.date} ${a.time || '00:00'}`;
      const dateTimeB = `${b.date} ${b.time || '00:00'}`;
      return dateTimeA.localeCompare(dateTimeB);
    });

    const result: Record<string, { diffDays: number; avgCons: number }> = {};

    sorted.forEach((r, i) => {
      let diffDays = 1;
      const prev = sorted[i - 1];
      if (prev) {
        try {
          const curD = new Date(r.date);
          const prevD = new Date(prev.date);
          if (!isNaN(curD.getTime()) && !isNaN(prevD.getTime())) {
            const diffTime = curD.getTime() - prevD.getTime();
            const days = Math.round(diffTime / (1000 * 60 * 60 * 24));
            if (days > 0) diffDays = days;
          }
        } catch (e) {
          diffDays = 1;
        }
      } else if (config.masterInitialDate) {
        try {
          const curD = new Date(r.date);
          const initD = new Date(config.masterInitialDate);
          if (!isNaN(curD.getTime()) && !isNaN(initD.getTime())) {
            const diffTime = curD.getTime() - initD.getTime();
            const days = Math.round(diffTime / (1000 * 60 * 60 * 24));
            if (days > 0) diffDays = days;
          }
        } catch (e) {
          diffDays = 1;
        }
      }

      const totalCons = (r.consumption1 || 0) + (r.consumption2 || 0);
      const avgCons = totalCons / diffDays;

      result[r.id] = { diffDays, avgCons };
    });

    return result;
  }, [readings, config.masterInitialDate]);

  const handlePrevMonth = () => {
    const currentIndex = availableMonths.indexOf(selectedMonth);
    if (currentIndex < availableMonths.length - 1) {
      setSelectedMonth(availableMonths[currentIndex + 1]);
    }
  };

  const handleNextMonth = () => {
    const currentIndex = availableMonths.indexOf(selectedMonth);
    if (currentIndex > 0) {
      setSelectedMonth(availableMonths[currentIndex - 1]);
    }
  };

  const prevMonthDisabled = availableMonths.indexOf(selectedMonth) >= availableMonths.length - 1;
  const nextMonthDisabled = availableMonths.indexOf(selectedMonth) <= 0;

  const chartData = useMemo(() => {
    return [...filteredReadings].reverse().map(r => ({
      date: formatDateDisplay(r.date), // DD/MM
      'Tổng tiêu thụ': (r.consumption1 || 0) + (r.consumption2 || 0),
      'Đồng hồ 1': r.consumption1 || 0,
      'Đồng hồ 2': r.consumption2 || 0,
    }));
  }, [filteredReadings]);

  const avgConsumption = useMemo(() => {
    if (filteredReadings.length === 0) return 0;
    const totals = filteredReadings.map(r => (r.consumption1 || 0) + (r.consumption2 || 0));
    return totals.reduce((a, b) => a + b, 0) / totals.length;
  }, [filteredReadings]);

  const { totalM1Cons, totalM2Cons, grandTotalCons } = useMemo(() => {
    const m1Sum = filteredReadings.reduce((sum, r) => sum + (r.consumption1 || 0), 0);
    const m2Sum = filteredReadings.reduce((sum, r) => sum + (r.consumption2 || 0), 0);
    return {
      totalM1Cons: m1Sum,
      totalM2Cons: m2Sum,
      grandTotalCons: m1Sum + m2Sum
    };
  }, [filteredReadings]);

  const handleConfirmClosePeriod = () => {
    const confirmMsg = "CẢNH BÁO: Bạn có chắc chắn muốn CHỐT KỲ nước hằng ngày?\n\n- Chỉ số cuối của kỳ hiện tại sẽ được lưu làm số chốt (số cũ) cho kỳ mới.\n- Toàn bộ danh sách ghi chép hằng ngày của kỳ này sẽ được xóa để sẵn sàng ghi kỳ mới.\n\n👉 KHUYÊN DÙNG: Hãy bấm nút xuất file Excel ở góc trên để lưu trữ trước khi chốt!";
    if (confirm(confirmMsg)) {
      onClosePeriod();
    }
  };

  return (
    <div className="h-full bg-slate-50 flex flex-col p-3 pt-[calc(0.5rem+var(--sat))] animate-in slide-in-from-right duration-300 overflow-y-auto pb-32">
      <header className="flex items-center justify-between mb-4 bg-white p-3 rounded-2xl border shadow-sm sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-2 bg-slate-100 rounded-full text-slate-800 active:scale-90"><ChevronLeft size={22}/></button>
          <div className="flex flex-col">
            <h1 className="text-sm font-black uppercase text-slate-900 tracking-tight">Cấp nước hàng ngày</h1>
            <p className="text-[10px] font-bold text-slate-400 italic">Theo dõi biến động & thất thoát</p>
          </div>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-2xl gap-0.5">
          <button onClick={() => setActiveTab('record')} className={`p-2 rounded-xl transition-all ${activeTab === 'record' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}><Plus size={18}/></button>
          <button onClick={() => setActiveTab('history')} className={`p-2 rounded-xl transition-all ${activeTab === 'history' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}><History size={18}/></button>
          <button onClick={() => setActiveTab('chart')} className={`p-2 rounded-xl transition-all ${activeTab === 'chart' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}><Activity size={18}/></button>
          <div className="w-[1px] bg-slate-200 mx-0.5 my-1.5" />
          <button 
            onClick={() => exportDailyToExcel(filteredReadings, `Theo_Doi_Hang_Ngay_Thang_${selectedMonth.replace('/', '_')}`)} 
            disabled={filteredReadings.length === 0}
            className="p-2 rounded-xl text-emerald-600 active:bg-white active:shadow-sm disabled:opacity-20 transition-all"
            title="Xuất Excel"
          >
            <FileDown size={18}/>
          </button>
          <button 
            onClick={() => dailyFileInputRef.current?.click()} 
            className="p-2 rounded-xl text-indigo-600 active:bg-white active:shadow-sm transition-all"
            title="Nhập Excel"
          >
            <FileUp size={18}/>
          </button>
          <button 
            onClick={() => setShowDailyScan(true)} 
            className="p-2 rounded-xl text-indigo-600 hover:text-indigo-800 active:bg-white active:shadow-sm transition-all flex items-center justify-center gap-1 bg-indigo-50/70 border border-indigo-150"
            title="AI Quét Sổ Ghi Tay"
          >
            <Sparkles size={18}/>
            <span className="text-[9px] font-black uppercase hidden sm:inline-block">Quét AI</span>
          </button>
          <input 
            type="file" 
            ref={dailyFileInputRef} 
            onChange={handleImportExcel} 
            className="hidden" 
            accept=".xlsx, .xls" 
          />
          <input 
            type="file" 
            ref={dailyImageFileRef} 
            onChange={handleDailyFileChange} 
            className="hidden" 
            accept="image/*" 
          />
          <input 
            type="file" 
            ref={dailyCameraRef} 
            onChange={handleDailyFileChange} 
            className="hidden" 
            accept="image/*" 
            capture="environment" 
          />
        </div>
      </header>

      {/* Month Selector Bar */}
      {(activeTab === 'history' || activeTab === 'chart') && (
        <div className="bg-white p-3.5 rounded-[1.8rem] border-2 border-slate-100 shadow-sm flex items-center justify-between mb-4">
          <button 
            type="button"
            onClick={handlePrevMonth} 
            disabled={prevMonthDisabled} 
            className="p-2 px-3 bg-slate-50 hover:bg-slate-100 disabled:opacity-30 rounded-xl text-slate-800 disabled:pointer-events-none active:scale-95 transition-all text-[11px] font-black uppercase flex items-center justify-center gap-0.5 border border-slate-100"
          >
            <ChevronLeft size={12} /> Trước
          </button>
          
          <div className="flex flex-col items-center">
            <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Kỳ xem dữ liệu</span>
            <select 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-[15px] font-black text-blue-600 bg-transparent border-none focus:ring-0 cursor-pointer text-center p-0 outline-none"
            >
              {availableMonths.map(m => (
                <option key={m} value={m}>Tháng {m}</option>
              ))}
            </select>
          </div>

          <button 
            type="button"
            onClick={handleNextMonth} 
            disabled={nextMonthDisabled} 
            className="p-2 px-3 bg-slate-50 hover:bg-slate-100 disabled:opacity-30 rounded-xl text-slate-800 disabled:pointer-events-none active:scale-95 transition-all text-[11px] font-black uppercase flex items-center justify-center gap-0.5 border border-slate-100"
          >
            Sau <ChevronRight size={12} />
          </button>
        </div>
      )}

      {/* Excel Import Clarification banner */}
      {(activeTab === 'history') && (
        <div className="bg-indigo-50 border-2 border-indigo-100 p-4 rounded-3xl flex items-start gap-3 shadow-sm mb-4">
          <div className="bg-indigo-100 text-indigo-700 p-2 rounded-xl mt-0.5 shrink-0">
            <FileUp size={16} />
          </div>
          <div>
            <h4 className="text-xs font-black text-indigo-900 uppercase tracking-tight">📈 KHẮC PHỤC SAI LỆCH SỐ LIỆU CŨ</h4>
            <p className="text-[11px] text-indigo-700 font-medium leading-relaxed mt-1">
              Bạn có thể nhập bổ sung dữ liệu viết tay từ các tháng trước để bù đắp số liệu cũ bị thiếu giúp báo cáo tự động tính toán chính xác tuyệt đối. 
              Hãy bấm vào biểu tượng <span className="font-black text-indigo-950 inline-flex items-center gap-0.5 bg-indigo-200/50 px-1 py-0.5 rounded-md leading-none"><FileUp size={11} /> Nhập Excel</span> ở góc phải thanh tiêu đề để bắt đầu tải file lên.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'record' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="bg-white p-6 rounded-[2.5rem] border-2 border-blue-50 shadow-xl space-y-5">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-3 mb-1.5 block">Ngày ghi</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm font-black outline-none focus:border-blue-500 shadow-inner" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-3 mb-1.5 block">Giờ ghi</label>
                  <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm font-black outline-none focus:border-blue-500 shadow-inner" />
                </div>
              </div>

              <div className="bg-slate-50 p-6 rounded-[2.2rem] border-2 border-slate-100/50 shadow-sm space-y-4">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center italic">Đồng hồ tổng số 1</p>
                <input type="number" inputMode="decimal" value={m1} onChange={e => setM1(e.target.value)} placeholder="Nhập chỉ số mới" className="w-full bg-white border-2 border-slate-200 rounded-2xl px-6 py-5 text-2xl font-black text-center outline-none focus:border-blue-600 focus:ring-8 focus:ring-blue-100 transition-all placeholder:text-slate-200 shadow-sm" />
              </div>

              <div className="bg-slate-50 p-6 rounded-[2.2rem] border-2 border-slate-100/50 shadow-sm space-y-4">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center italic">Đồng hồ tổng số 2</p>
                <input type="number" inputMode="decimal" value={m2} onChange={e => setM2(e.target.value)} placeholder="Nhập chỉ số mới" className="w-full bg-white border-2 border-slate-200 rounded-2xl px-6 py-5 text-2xl font-black text-center outline-none focus:border-blue-600 focus:ring-8 focus:ring-blue-100 transition-all placeholder:text-slate-200 shadow-sm" />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-3 mb-1.5 block tracking-widest">Ghi chú (nếu có)</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Vd: Đã đi kiểm tra đường ống..." className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:border-blue-500 shadow-inner h-24" />
              </div>
            </div>

            <button onClick={handleAdd} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase text-lg shadow-xl shadow-blue-200 active:scale-95 flex items-center justify-center gap-3">
              <Save size={20}/> Lưu dữ liệu
            </button>
          </div>
        </motion.div>
      )}

      {activeTab === 'history' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="bg-white p-4 rounded-[2rem] border-2 border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-4 px-2">
              <h2 className="text-xs font-black uppercase text-slate-900 tracking-tight flex items-center gap-2">
                <Activity size={16} className="text-blue-600" />
                Số chốt đầu kỳ (Opening Index)
              </h2>
              <button 
                onClick={() => {
                  setTempM1Init(config.master1Initial?.toString() || '0');
                  setTempM2Init(config.master2Initial?.toString() || '0');
                  setShowInitialSettings(!showInitialSettings);
                }} 
                className="text-[10px] font-black text-blue-600 uppercase border-b-2 border-blue-600/30 pb-0.5"
              >
                {showInitialSettings ? 'Hủy' : 'Sửa số chốt'}
              </button>
            </div>

            {showInitialSettings ? (
              <div className="space-y-3 p-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-1 block">Chốt M1 (Số Cuối Kỳ Trước)</label>
                    <input type="number" value={tempM1Init} onChange={e => setTempM1Init(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2 text-sm font-black text-center" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-1 block">Chốt M2 (Số Cuối Kỳ Trước)</label>
                    <input type="number" value={tempM2Init} onChange={e => setTempM2Init(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2 text-sm font-black text-center" />
                  </div>
                </div>
                <div>
                   <label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-1 block">Ngày chốt (Số liệu tính cho ngày đầu kỳ)</label>
                   <input type="date" value={tempDateInit} onChange={e => setTempDateInit(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2 text-sm font-black text-center" />
                </div>
                <button onClick={handleSaveInitial} className="w-full bg-slate-900 text-white py-3 rounded-xl font-black uppercase text-xs">Cập nhật số chốt</button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 px-2">
                <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">M1 (Số Cuối Kỳ Trước)</p>
                  <p className="text-lg font-black text-slate-700">{config.master1Initial?.toLocaleString('vi-VN') || 0}</p>
                </div>
                <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">M2 (Số Cuối Kỳ Trước)</p>
                  <p className="text-lg font-black text-slate-700">{config.master2Initial?.toLocaleString('vi-VN') || 0}</p>
                </div>
                <div className="col-span-2 bg-slate-50 rounded-2xl p-2 border border-slate-100 text-center">
                   <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Ngày chốt kỳ trước</p>
                   <p className="text-xs font-black text-slate-600">{formatDateDisplay(config.masterInitialDate || '')}</p>
                </div>
              </div>
            )}
            <p className="text-[9px] font-bold text-slate-400 italic px-2 mt-3 block text-center opacity-70">
              App dùng số này để tính cho ngày ghi chép đầu tiên.
            </p>
          </div>

          <div className="bg-white rounded-[2rem] border-2 border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b-2 border-slate-100">
                  <th className="py-4 px-3 text-[9px] font-black text-slate-400 uppercase text-left">Ngày/Giờ</th>
                  <th className="py-4 px-3 text-[9px] font-black text-slate-400 uppercase text-center">Đồng hồ 1</th>
                  <th className="py-4 px-3 text-[9px] font-black text-slate-400 uppercase text-center">Đồng hồ 2</th>
                  <th className="py-4 px-3 text-[9px] font-black text-slate-400 uppercase text-center">Tổng</th>
                  <th className="py-4 px-2"></th>
                </tr>
              </thead>
              <tbody>
                {filteredReadings.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center text-slate-300 px-4">
                      <History size={48} className="mx-auto mb-3 opacity-20 text-indigo-400" />
                      <p className="font-black uppercase text-xs tracking-wider text-slate-500 mb-4">Chưa có dữ liệu cấp nước kỳ này</p>
                      <button 
                        type="button"
                        onClick={() => dailyFileInputRef.current?.click()}
                        className="mx-auto px-6 py-3 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-2xl text-xs font-black uppercase flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-sm border border-indigo-100/50"
                      >
                        <FileUp size={14} /> Nhập số liệu từ File Excel
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredReadings.map((r, idx) => {
                    const info = readingsWithDays[r.id] || { diffDays: 1, avgCons: (r.consumption1 || 0) + (r.consumption2 || 0) };
                    const totalCons = (r.consumption1 || 0) + (r.consumption2 || 0);
                    const isHigh = info.avgCons > avgConsumption * 1.5 && filteredReadings.length > 3;
                    const isEditing = editingId === r.id;
                    
                    return (
                      <React.Fragment key={r.id}>
                        <tr className={`border-b border-slate-50 transition-colors ${isHigh ? 'bg-rose-50/30' : 'hover:bg-slate-50/50'}`}>
                          <td className="py-4 px-3">
                            {isEditing ? (
                              <div className="flex flex-col gap-1">
                                <input type="date" value={editData.date} onChange={e => setEditData({...editData, date: e.target.value})} className="text-[10px] p-1 border rounded w-20" />
                                <input type="time" value={editData.time} onChange={e => setEditData({...editData, time: e.target.value})} className="text-[10px] p-1 border rounded w-20" />
                              </div>
                            ) : (
                              <div className="flex flex-col" onClick={() => handleStartEdit(r)}>
                                <span className="text-xs font-black text-slate-900">{formatDateDisplay(r.date)}</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase">{normalizeTime(r.time || '--:--')}</span>
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-3 text-center">
                            {isEditing ? (
                              <input type="number" value={editData.master1} onChange={e => setEditData({...editData, master1: parseFloat(e.target.value)})} className="w-16 text-xs text-center border rounded p-1 font-black" />
                            ) : (
                              <div className="flex flex-col items-center" onClick={() => handleStartEdit(r)}>
                                <span className="text-sm font-black text-blue-600">{r.consumption1}</span>
                                <span className="text-[13px] font-black text-slate-600 uppercase">CS: {r.master1}</span>
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-3 text-center">
                            {isEditing ? (
                              <input type="number" value={editData.master2} onChange={e => setEditData({...editData, master2: parseFloat(e.target.value)})} className="w-16 text-xs text-center border rounded p-1 font-black" />
                            ) : (
                              <div className="flex flex-col items-center" onClick={() => handleStartEdit(r)}>
                                <span className="text-sm font-black text-indigo-600">{r.consumption2}</span>
                                <span className="text-[13px] font-black text-slate-600 uppercase">CS: {r.master2}</span>
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-3 text-center">
                            {isEditing ? (
                              <div className="flex flex-col gap-1">
                                <button onClick={handleSaveEdit} className="bg-blue-600 text-white text-[8px] font-black px-2 py-1 rounded">LƯU</button>
                                <button onClick={() => setEditingId(null)} className="bg-slate-200 text-slate-600 text-[8px] font-black px-2 py-1 rounded">HỦY</button>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center" onClick={() => handleStartEdit(r)}>
                                <span className={`text-base font-black ${isHigh ? 'text-rose-600' : 'text-slate-900'}`}>{totalCons}</span>
                                {info.diffDays > 1 && (
                                  <span className="text-[9px] font-black text-indigo-500 bg-indigo-50 border border-indigo-100/50 px-1.5 py-0.5 rounded-md mt-0.5 whitespace-nowrap uppercase tracking-tighter">
                                    Gộp {info.diffDays} ngày ({Math.round(info.avgCons)}/n)
                                  </span>
                                )}
                                {isHigh && <div className="text-[7px] font-black text-rose-500 uppercase tracking-tighter mt-0.5">Bất thường</div>}
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-2 text-right">
                            <button onClick={() => onDelete(r.id)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={16}/></button>
                          </td>
                        </tr>
                        {(r.notes || isEditing) && (
                          <tr className="bg-amber-50/30 border-b border-slate-50">
                            <td colSpan={5} className="py-2 px-4 text-[9px] font-bold text-amber-700 italic">
                               {isEditing ? (
                                 <input value={editData.notes || ''} onChange={e => setEditData({...editData, notes: e.target.value})} placeholder="Ghi chú..." className="w-full bg-transparent border-none outline-none font-bold italic" />
                               ) : (
                                 <>💡 {r.notes}</>
                               )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-slate-900 text-white p-5 rounded-[2.5rem] shadow-xl flex items-center justify-between">
            <div className="flex items-center gap-4">
               <div className="bg-blue-500/20 p-3 rounded-2xl text-blue-300"><TrendingUp size={24}/></div>
               <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5 mt-1">TB tiêu thụ/ngày</p>
                  <p className="text-2xl font-black tracking-tighter leading-none">{avgConsumption.toFixed(1)} <span className="text-xs font-bold opacity-40 italic tracking-normal">m3/ngày</span></p>
               </div>
            </div>
            <div className="h-10 w-px bg-white/10 mx-2"></div>
            <div className="text-right">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5 mt-1">Số ngày ghi</p>
               <p className="text-xl font-black text-blue-400">{filteredReadings.length} <span className="text-[10px] font-black text-slate-500">NGÀY</span></p>
            </div>
          </div>

          {filteredReadings.length > 0 && (
            <>
              <div className="bg-blue-950 text-white p-5 rounded-[2.5rem] shadow-xl space-y-4 border border-blue-900/40">
                <div className="flex justify-between items-center border-b border-white/10 pb-2">
                  <h3 className="text-[11px] font-black uppercase tracking-wider text-blue-300">Tổng tiêu thụ lũy kế cả kỳ</h3>
                  <span className="text-[8px] font-black uppercase tracking-widest bg-blue-500/20 text-blue-300 px-2.5 py-1 rounded-lg">Từ số chốt</span>
                </div>
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="bg-white/5 p-3.5 rounded-2xl border border-white/5 flex flex-col justify-center">
                    <p className="text-[9px] font-black text-blue-400 uppercase mb-1 tracking-wider">Đồng hồ 1</p>
                    <p className="text-[20px] font-black text-blue-100 leading-none">{totalM1Cons.toLocaleString('vi-VN')} <span className="text-[11px] opacity-50 font-normal">m³</span></p>
                  </div>
                  <div className="bg-white/5 p-3.5 rounded-2xl border border-white/5 flex flex-col justify-center">
                    <p className="text-[9px] font-black text-indigo-400 uppercase mb-1 tracking-wider">Đồng hồ 2</p>
                    <p className="text-[20px] font-black text-indigo-100 leading-none">{totalM2Cons.toLocaleString('vi-VN')} <span className="text-[11px] opacity-50 font-normal">m³</span></p>
                  </div>
                </div>
                <div className="bg-blue-500/10 p-4 rounded-2xl border border-blue-500/20 flex justify-between items-center">
                  <div className="text-left">
                    <p className="text-[11px] font-black text-blue-400 uppercase tracking-wide leading-none mb-1">Tổng 2 đồng hồ</p>
                    <p className="text-[8px] font-bold text-slate-400 leading-none italic">Lũy kế tiêu thụ hàng ngày</p>
                  </div>
                  <p className="text-[24px] font-black text-blue-400 leading-none">{grandTotalCons.toLocaleString('vi-VN')} <span className="text-[13px] font-black opacity-80">m³</span></p>
                </div>
              </div>

              <div className="pt-2">
                <button 
                  onClick={handleConfirmClosePeriod}
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white py-4 bg-rose-600 hover:bg-rose-700 text-white py-4.5 rounded-[2rem] font-black uppercase text-xs flex justify-center items-center gap-2 shadow-lg hover:shadow-rose-300 active:scale-95 border-b-4 border-rose-800 transition-all"
                >
                  Chốt kỳ & Qua tháng mới
                </button>
              </div>
            </>
          )}
        </motion.div>
      )}

      {activeTab === 'chart' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="bg-white p-5 rounded-[2.5rem] border-2 border-slate-100 shadow-xl h-[450px]">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 italic text-center">Biến động cấp nước (30 ngày gần nhất)</p>
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={chartData}>
                  <defs>
                    <linearGradient id="barColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 800, fill: '#94a3b8'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 800, fill: '#94a3b8'}} />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 800, fontSize: '12px'}}
                  />
                  <ReferenceLine y={avgConsumption} label={{ value: 'TB', position: 'insideRight', fill: '#94a3b8', fontSize: 10, fontWeight: 900 }} stroke="#94a3b8" strokeDasharray="3 3" />
                  <Bar dataKey="Tổng tiêu thụ" fill="url(#barColor)" radius={[10, 10, 0, 0]} barSize={25} />
               </BarChart>
             </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-3">
             <div className="bg-white p-5 rounded-[2rem] border-2 border-slate-100 text-center">
                <p className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">Trung bình/Ngày</p>
                <p className="text-2xl font-black text-blue-600">{avgConsumption.toFixed(1)} <span className="text-xs uppercase opacity-50">m3</span></p>
             </div>
             <div className="bg-white p-5 rounded-[2rem] border-2 border-slate-100 text-center">
                <p className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">Cao nhất</p>
                <p className="text-2xl font-black text-rose-500">
                  {filteredReadings.length > 0 ? Math.max(...filteredReadings.map(r => (r.consumption1 || 0) + (r.consumption2 || 0))) : 0} 
                  <span className="text-xs uppercase opacity-50 ml-1">m3</span>
                </p>
             </div>
          </div>
        </motion.div>
      )}
      <div className="bg-amber-50 border-2 border-amber-100 p-5 rounded-[2rem] flex gap-4 mt-4">
        <div className="bg-amber-100 p-3 rounded-2xl text-amber-600 self-start"><AlertCircle size={24}/></div>
        <div>
          <p className="text-sm font-black text-amber-900 mb-1 tracking-tight">Hướng dẫn số chốt</p>
          <p className="text-[11px] font-bold text-amber-700 leading-relaxed italic opacity-80">
            "Số chốt kỳ trước" chính là <span className="underline decoration-2 text-amber-900 uppercase">Chỉ số CUỐI</span> của kỳ nước vừa xong. App dùng số này để tính tiêu thụ cho ngày đầu tiên của kỳ mới.
          </p>
        </div>
      </div>

      {/* AI Scan Overlay */}
      <AnimatePresence>
        {showDailyScan && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 z-[999] backdrop-blur-sm flex flex-col justify-end sm:justify-center p-0 sm:p-4 md:p-6"
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
              className="bg-white max-w-3xl w-full mx-auto rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white z-10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-2xl">
                    <Sparkles size={20} className="animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black uppercase text-slate-900 tracking-tight leading-tight">AI Quét Sổ Hằng Ngày</h2>
                    <p className="text-[10px] font-bold text-slate-400 italic">Quét chữ số viết tay của đồng hồ tổng</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setShowDailyScan(false);
                    setDailyImagePreview(null);
                    setDailyScanResults([]);
                    setDailyError(null);
                  }}
                  className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all active:scale-95"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {dailyError === "API_KEY_MISSING" ? (
                  <div className="bg-rose-50 border-2 border-rose-100 text-rose-800 p-5 rounded-3xl flex gap-4">
                    <AlertCircle size={28} className="text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-tight text-rose-900 mb-1">Chưa cấu hình API Key</h4>
                      <p className="text-xs font-bold leading-relaxed opacity-90">
                        Tính năng quét bọc sách bằng AI cần khóa API Gemini để thực hiện OCR viết tay phức tạp.
                      </p>
                      <p className="text-[11px] mt-2 italic font-semibold leading-relaxed">
                        Bạn vui lòng mở <span className="font-extrabold uppercase text-slate-800">Settings &gt; Secrets (Biêu tượng bánh răng ở góc dưới)</span> và thiết lập khoá <span className="font-extrabold text-rose-900">GEMINI_API_KEY</span> để mở khóa tính năng này!
                      </p>
                    </div>
                  </div>
                ) : dailyError ? (
                  <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl flex gap-3">
                    <AlertCircle size={20} className="text-rose-500 shrink-0 mt-0.5" />
                    <p className="text-xs font-bold leading-relaxed">{dailyError}</p>
                  </div>
                ) : null}

                {!dailyImagePreview ? (
                  /* Step 1: Upload or Capture */
                  <div className="space-y-4">
                    <div className="border-4 border-dashed border-slate-100 rounded-[2.5rem] p-8 text-center bg-slate-50/50 hover:bg-slate-50 transition-all flex flex-col items-center justify-center min-h-[220px]">
                      <div className="p-4 bg-indigo-50/70 text-indigo-500 rounded-3xl mb-3">
                        <Camera size={36} />
                      </div>
                      <h3 className="text-sm font-black text-slate-800 tracking-tight">Kéo thả hoặc tải lên ảnh chụp sổ</h3>
                      <p className="text-[10px] font-bold text-slate-400 mt-1 max-w-sm leading-relaxed">
                        Chụp ảnh thẳng góc, sáng rõ toàn bộ 31 ngày ghi của đồng hồ 1 và 2 để Gemini đọc chính xác nhất.
                      </p>
                      <div className="flex gap-2.5 mt-5">
                        <button 
                          type="button"
                          onClick={() => dailyCameraRef.current?.click()}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                        >
                          <Camera size={14} /> Chụp Ảnh Trực Tiếp
                        </button>
                        <button 
                          type="button"
                          onClick={() => dailyImageFileRef.current?.click()}
                          className="px-4 py-2 bg-slate-950 hover:bg-slate-900 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                        >
                          <FileImage size={14} /> Chọn Ảnh Từ Máy
                        </button>
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-3xl p-4 flex gap-3 text-slate-700">
                      <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-tight mb-0.5 text-slate-900">Tính năng tiện lợi:</p>
                        <p className="text-[10px] font-bold leading-relaxed opacity-80">
                          AI hỗ trợ tìm các cột ngày từ 1-31 và các cột chỉ số nước của 2 đồng hồ tương ứng, sau đó nạp số vào biểu để so sánh thất thoát.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Step 2: Image Preview & Results display */
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                    {/* Left/Top: Image Preview */}
                    <div className="md:col-span-5 bg-slate-50 p-2.5 border border-slate-100 rounded-3xl space-y-2">
                      <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-black border relative flex items-center justify-center">
                        <img 
                          src={dailyImagePreview} 
                          alt="Bút tích cấp nước" 
                          className="max-h-full max-w-full object-contain" 
                        />
                      </div>
                      <div className="flex gap-2 justify-center">
                        <button 
                          type="button"
                          onClick={() => {
                            setDailyImagePreview(null);
                            setDailyScanResults([]);
                            setDailyError(null);
                          }}
                          className="p-1 px-3 border border-slate-200 hover:bg-slate-100 active:scale-95 text-slate-500 text-[10px] font-black uppercase rounded-lg transition-all flex items-center gap-1"
                        >
                          <RefreshCw size={10} /> Đổi ảnh khác
                        </button>
                        {!isAnalyzingDaily && dailyScanResults.length === 0 && (
                          <button 
                            type="button"
                            onClick={handleStartDailyAnalysis}
                            className="p-1 px-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-[10px] font-black uppercase rounded-lg"
                          >
                            <Sparkles size={10} /> Quét
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Right/Bottom: Analyzing / Results display */}
                    <div className="md:col-span-7 space-y-3">
                      {isAnalyzingDaily ? (
                        <div className="py-12 text-center bg-slate-50/50 rounded-3xl border border-slate-100 flex flex-col items-center justify-center min-h-[220px]">
                          <Loader2 size={36} className="text-indigo-600 animate-spin mb-3" />
                          <p className="text-xs font-black text-slate-700 animate-pulse">{dailyLoadingStep || "Đang xử lý..."}</p>
                          <p className="text-[10px] font-bold text-slate-400 mt-1">Đang thực hiện phân tích biểu mẫu...</p>
                        </div>
                      ) : dailyScanResults.length > 0 ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between bg-emerald-50 border border-emerald-100 p-2 px-3 rounded-2xl">
                            <span className="text-[10px] font-black text-emerald-800 uppercase flex items-center gap-1">
                              <Check size={14} /> Quét thành công
                            </span>
                            <span className="text-[10px] font-black text-emerald-950 bg-emerald-100 p-0.5 px-2 rounded-full">
                              {dailyScanResults.length} dòng
                            </span>
                          </div>

                          <div className="border border-slate-150 rounded-2xl overflow-hidden max-h-[280px] overflow-y-auto bg-white/50 shadow-inner">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead className="bg-slate-100 text-[10px] font-black text-slate-500 uppercase sticky top-0 z-10 border-b border-slate-200">
                                <tr>
                                  <th className="p-2 py-2 text-center w-10">Hiệu</th>
                                  <th className="p-2">Ngày</th>
                                  <th className="p-2 text-center">ĐH1</th>
                                  <th className="p-2 text-center">ĐH2</th>
                                </tr>
                              </thead>
                              <tbody>
                                {dailyScanResults.map((row, index) => (
                                  <tr 
                                    key={index} 
                                    className={`border-b last:border-b-0 hover:bg-slate-50/80 transition-all ${row.isSelected ? 'bg-indigo-50/20' : 'opacity-45'}`}
                                  >
                                    <td className="p-2 text-center">
                                      <input 
                                        type="checkbox" 
                                        checked={row.isSelected}
                                        onChange={() => {
                                          const copy = [...dailyScanResults];
                                          copy[index].isSelected = !copy[index].isSelected;
                                          setDailyScanResults(copy);
                                        }}
                                        className="h-4 w-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                                      />
                                    </td>
                                    <td className="p-2 font-black text-slate-700">Ngày {row.day}</td>
                                    <td className="p-1">
                                      <input 
                                        type="number" 
                                        value={row.master1 === 0 ? '' : row.master1} 
                                        onChange={(e) => {
                                          const value = parseInt(e.target.value) || 0;
                                          const copy = [...dailyScanResults];
                                          copy[index].master1 = value;
                                          setDailyScanResults(copy);
                                        }}
                                        className="w-full bg-white font-black text-blue-600 border border-slate-200 rounded-lg py-1 px-1 text-center text-xs focus:ring-2 focus:ring-indigo-500"
                                      />
                                    </td>
                                    <td className="p-1">
                                      <input 
                                        type="number" 
                                        value={row.master2 === 0 ? '' : row.master2} 
                                        onChange={(e) => {
                                          const value = parseInt(e.target.value) || 0;
                                          const copy = [...dailyScanResults];
                                          copy[index].master2 = value;
                                          setDailyScanResults(copy);
                                        }}
                                        className="w-full bg-white font-black text-rose-500 border border-slate-200 rounded-lg py-1 px-1 text-center text-xs focus:ring-2 focus:ring-indigo-500"
                                      />
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : (
                        <div className="py-12 text-center bg-slate-50/50 rounded-3xl border border-slate-100 flex flex-col items-center justify-center min-h-[220px]">
                          <Sparkles size={28} className="text-slate-300 mb-2" />
                          <p className="text-xs font-bold text-slate-400">Click Quét để bắt đầu nhận diện tự động</p>
                          <button 
                            type="button"
                            onClick={handleStartDailyAnalysis}
                            className="mt-4 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase rounded-xl transition-all shadow-md flex items-center gap-1.5"
                          >
                            <Sparkles size={14} /> Quét Biểu Mẫu
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-5 border-t border-slate-100 bg-slate-50 sticky bottom-0 flex gap-3 justify-end text-right">
                <button 
                  type="button"
                  onClick={() => {
                    setShowDailyScan(false);
                    setDailyImagePreview(null);
                    setDailyScanResults([]);
                    setDailyError(null);
                  }}
                  className="px-5 py-3 border border-slate-200 hover:bg-slate-100 rounded-xl text-slate-500 text-xs font-black uppercase transition-all"
                >
                  Đóng
                </button>
                {dailyScanResults.length > 0 && (
                  <button 
                    type="button"
                    onClick={handleApplyDailyScan}
                    className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase transition-all shadow-md flex items-center justify-center gap-1.5"
                  >
                    <Check size={16} /> Áp dụng {dailyScanResults.filter(r => r.isSelected).length} Ngày
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
