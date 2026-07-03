import React, { useState, useRef } from 'react';
import { ChevronLeft, Camera, FileImage, Sparkles, Loader2, AlertCircle, Check, Info, RefreshCw, X, Edit2, FileText } from 'lucide-react';
import { Customer } from '../types';
import { formatCurrency } from '../utils';

interface AIScanViewProps {
  customers: Customer[];
  activeTab: string;
  onBack: () => void;
  onImport: (results: { id: string; newIndex: number }[]) => void;
}

interface ScanResultItem {
  id: string;
  name: string;
  oldIndex: number;
  extractedNewIndex: number;
  reason: string;
  isSelected: boolean;
}

export const AIScanView: React.FC<AIScanViewProps> = ({ customers, activeTab, onBack, onImport }) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ScanResultItem[]>([]);
  const [scanStats, setScanStats] = useState<{ total: number; matched: number } | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Filter customers of active list to pass to Gemini API matching context
  const activeCustomers = customers.filter(c => c.listType === activeTab);

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setResults([]);
    setScanStats(null);

    const maxSizeBytes = 6 * 1024 * 1024; // 6MB
    if (file.size > maxSizeBytes) {
      setError(`⚠️ DUNG LƯỢNG TỆP QUÁ LỚN (${(file.size / 1024 / 1024).toFixed(1)}MB)!

Để tránh bị lỗi đường truyền máy chủ (Mã 413) và giúp trí tuệ nhân tạo Gemini nhận dạng chữ viết tay chuẩn xác nhất, bạn vui lòng áp dụng giải pháp cực kỳ hiệu quả sau:

1️⃣ CHIA NHỎ TỆP QUÉT (KHUYÊN DÙNG):
Khi dùng ứng dụng Google Drive để quét (scan) sổ chép tay, bạn hãy bấm lưu thành nhiều tệp PDF nhỏ (khoảng 3 - 5 trang mỗi tệp). Việc này giúp tệp tải lên cực kỳ nhanh, và AI sẽ đọc chính xác từng hộ mà không bao giờ lo bị bỏ sót hay quá giới hạn!

2️⃣ CHUYỂN SANG QUÉT ĐEN TRẮNG (GRAYSCALE):
Trong phần cài đặt quét của Google Drive, hãy chọn định dạng Đen trắng (Grayscale) hoặc Bản quét tài liệu (Document) thay vì chọn Ảnh màu độ phân giải cao. Dung lượng tệp PDF sẽ giảm đi hơn 10 LẦN (chỉ còn vài trăm KB cho hàng chục trang) mà chất lượng chữ viết tay vẫn cực kỳ sắc nét để AI đọc được!`);
      setImagePreview(null);
      setFileName(null);
      setFileType(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsAnalyzing(true);
    setFileName(file.name);
    setFileType(file.type);

    const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');
    if (isPdf) {
      setLoadingStep("⚙️ Đang tải tệp PDF tài liệu quét...");
    } else {
      setLoadingStep("⚙️ Đang xử lý và tối ưu dung lượng ảnh...");
    }

    try {
      if (isPdf) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result as string);
          setIsAnalyzing(false);
          setLoadingStep('');
        };
        reader.onerror = () => {
          setError("Không thể đọc tệp PDF.");
          setIsAnalyzing(false);
          setLoadingStep('');
        };
        reader.readAsDataURL(file);
      } else {
        const compressedDataUrl = await compressAndResizeImage(file);
        setImagePreview(compressedDataUrl);
        setIsAnalyzing(false);
        setLoadingStep('');
      }
    } catch (err) {
      console.error("Error compressing image:", err);
      // Fallback
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setIsAnalyzing(false);
        setLoadingStep('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStartAnalysis = async () => {
    if (!imagePreview) return;

    setIsAnalyzing(true);
    setError(null);
    setResults([]);

    const isPdf = fileType === 'application/pdf' || fileName?.endsWith('.pdf') || imagePreview.startsWith('data:application/pdf');
    const steps = isPdf ? [
      "🔄 Đang tải tệp PDF tài liệu quét...",
      "🧠 Khởi động động cơ trí tuệ nhân tạo Gemini 3.5...",
      "🔍 Đang quét toàn bộ các trang PDF và phân tích chữ viết tay...",
      "🗺️ Đang đối chiếu nhận diện tên, địa chỉ với Danh sách Khách hàng...",
      "⚖️ Đang kiểm định logic (Chỉ số mới ≥ Chỉ số cũ)...",
      "✨ Đang định dạng kết quả chuẩn..."
    ] : [
      "🔄 Đang tải ảnh bút tích...",
      "🧠 Khởi động động cơ trí tuệ nhân tạo Gemini 3.5...",
      "🔍 Đang phân tích chữ viết tay trên ảnh log nước...",
      "🗺️ Đang đối chiếu nhận diện tên, địa chỉ với Danh sách Khách hàng...",
      "⚖️ Đang kiểm định logic (Chỉ số mới ≥ Chỉ số cũ)...",
      "✨ Đang định dạng kết quả chuẩn..."
    ];

    let stepIndex = 0;
    setLoadingStep(steps[0]);
    const stepInterval = setInterval(() => {
      if (stepIndex < steps.length - 1) {
        stepIndex++;
        setLoadingStep(steps[stepIndex]);
      }
    }, 1500);

    try {
      // Build customers payload data to minimize tokens and provide matching hints
      const customersPayload = activeCustomers.map(c => ({
        id: c.id,
        maKH: c.maKH,
        name: c.name,
        address: c.address,
        oldIndex: c.oldIndex
      }));

      const response = await fetch("/api/scan-handwritten", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          image: imagePreview,
          customers: customersPayload
        })
      });

      clearInterval(stepInterval);

      const responseText = await response.text();
      let data: any;
      try {
        data = JSON.parse(responseText);
      } catch (parseErr) {
        throw new Error(`Không thể phân giải phản hồi từ máy chủ (Mã: ${response.status}). Phản hồi nhận được: ${responseText.slice(0, 150)}`);
      }

      if (!response.ok) {
        if (data && data.error === "GEMINI_API_KEY_MISSING") {
          throw new Error("API_KEY_MISSING");
        }
        throw new Error(data?.message || `Lỗi máy chủ (${response.status}): ${responseText.slice(0, 150)}`);
      }

      if (data.success && Array.isArray(data.results)) {
        const mappedResults: ScanResultItem[] = data.results
          .map((item: any) => {
            const originalCust = activeCustomers.find(c => c.id === item.id);
            if (!originalCust) return null;

            return {
              id: item.id,
              name: item.name || originalCust.name,
              oldIndex: originalCust.oldIndex,
              extractedNewIndex: item.extractedNewIndex,
              reason: item.reason || "Khớp chính xác",
              isSelected: item.extractedNewIndex >= originalCust.oldIndex
            };
          })
          .filter((item: ScanResultItem | null): item is ScanResultItem => item !== null);

        setResults(mappedResults);
        setScanStats({
          total: data.results.length,
          matched: mappedResults.length
        });

        if (mappedResults.length === 0) {
          setError("Không khớp được khách hàng nào trong ảnh với Danh sách bộ hiện tại. Vui lòng đảm bảo bạn đang chọn đúng bộ ghi nước (Bộ 01 hoặc Bộ 02) và ảnh chụp rõ nét.");
        }
      } else {
        throw new Error("Mẫu dữ liệu trả về từ AI không khả dụng.");
      }

    } catch (err: any) {
      clearInterval(stepInterval);
      console.error(err);
      if (err.message === "API_KEY_MISSING") {
        setError("API_KEY_MISSING");
      } else {
        setError(err.message || "Không thể phân tích ảnh chụp. Vui lòng thử lại với góc chụp sáng hơn và rõ nét hơn.");
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleIndexChange = (id: string, newVal: string) => {
    const val = parseInt(newVal) || 0;
    setResults(prev => prev.map(item => {
      if (item.id === id) {
        return {
          ...item,
          extractedNewIndex: val,
          // Auto select if the fixed value is valid
          isSelected: val >= item.oldIndex
        };
      }
      return item;
    }));
  };

  const handleToggleSelect = (id: string) => {
    setResults(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, isSelected: !item.isSelected };
      }
      return item;
    }));
  };

  const handleApply = () => {
    const selectToApply = results.filter(r => r.isSelected);
    if (selectToApply.length === 0) {
      alert("Vui lòng chọn ít nhất 1 dòng kết quả hợp lệ để áp dụng.");
      return;
    }

    onImport(selectToApply.map(r => ({ id: r.id, newIndex: r.extractedNewIndex })));
    alert(`🎉 Đã áp dụng thành công ${selectToApply.length} chỉ số mới vào danh bạ nước!`);
    onBack();
  };

  return (
    <div className="fixed inset-0 bg-white z-[150] flex flex-col p-4 pt-[calc(1rem+var(--sat))] animate-in slide-in-from-right duration-200 overflow-y-auto pb-24">
      {/* Header */}
      <header className="flex items-center justify-between mb-5 shrink-0">
        <div className="flex items-center gap-1.5">
          <button 
            type="button"
            onClick={onBack} 
            className="p-2.5 bg-slate-100 hover:bg-slate-200 active:scale-95 rounded-2xl text-slate-800 transition-all"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h2 className="text-base font-black uppercase text-indigo-700 italic tracking-tight">Quản Lý Quét Ghi Tay</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase">Nhận diện chỉ số mới tự động qua AI</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-2xl shadow-sm text-indigo-700">
          <Sparkles size={14} className="animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-tight">Gemini OCR v3.5</span>
        </div>
      </header>

      {/* Upload/Selection Interface */}
      {results.length === 0 && !isAnalyzing && (
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border-2 border-indigo-100 p-5 rounded-[2.2rem] shadow-sm">
            <h3 className="text-xs font-black text-indigo-900 uppercase tracking-tight flex items-center gap-1.5 mb-2">
              <Sparkles size={14} className="text-indigo-600" /> Trợ lý Quét Ảnh / PDF Ghi Tay Thông Minh
            </h3>
            <p className="text-[11px] text-indigo-700 font-bold leading-relaxed">
              Bạn không cần gõ phím mỏi tay nữa! Chỉ cần chụp, chọn hình ảnh hoặc tải lên tệp tài liệu PDF đã quét từ Google Drive, AI sẽ tự động phân tích toàn bộ tài liệu để nhận diện chữ, số và khớp chỉ số mới của từng hộ trong <span className="font-extrabold uppercase text-indigo-950">{activeTab === 'list1' ? 'Bộ 01' : 'Bộ 02'}</span>.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3.5">
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white p-7 rounded-[2.5rem] shadow-xl shadow-indigo-100 transition-all border-b-4 border-indigo-800"
            >
              <div className="p-3.5 bg-white/10 rounded-2xl">
                <Camera size={28} />
              </div>
              <span className="text-xs font-black uppercase tracking-tight">Chụp ảnh sổ</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-3 bg-white hover:bg-slate-50 active:scale-95 text-slate-700 p-7 rounded-[2.5rem] shadow-md border-2 border-slate-200 transition-all"
            >
              <div className="p-3.5 bg-slate-50 rounded-2xl">
                <FileImage size={28} className="text-slate-500" />
              </div>
              <span className="text-xs font-black uppercase tracking-tight">Chọn Ảnh / PDF</span>
            </button>
          </div>

          {/* Hidden inputs */}
          <input
            type="file"
            ref={cameraInputRef}
            onChange={handleFileChange}
            accept="image/*"
            capture="environment"
            className="hidden"
          />
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*,application/pdf"
            className="hidden"
          />

          {imagePreview && (
            <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-4 shadow-sm space-y-4">
              <div className="relative rounded-3xl overflow-hidden aspect-video border bg-slate-50 flex items-center justify-center p-4">
                {fileType === 'application/pdf' || fileName?.endsWith('.pdf') || imagePreview.startsWith('data:application/pdf') ? (
                  <div className="flex flex-col items-center justify-center text-center space-y-2">
                    <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl border-2 border-rose-100 shadow-xs animate-bounce">
                      <FileText size={44} />
                    </div>
                    <div className="max-w-[200px]">
                      <p className="text-xs font-black text-slate-800 truncate">{fileName || 'Tài liệu quét.pdf'}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Tài liệu PDF (Nhiều trang)</p>
                    </div>
                  </div>
                ) : (
                  <img src={imagePreview} className="max-h-56 object-contain" alt="Preview" />
                )}
                <button 
                  onClick={() => {
                    setImagePreview(null);
                    setFileName(null);
                    setFileType(null);
                  }} 
                  className="absolute top-2 right-2 bg-slate-900/80 text-white p-2 rounded-full hover:bg-slate-900 duration-150"
                >
                  <X size={18} />
                </button>
              </div>

              <button
                onClick={handleStartAnalysis}
                className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] transition-all text-white py-4.5 rounded-2xl font-black uppercase text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-100"
              >
                <Sparkles size={18} /> Bắt đầu AI phân tích tài liệu
              </button>
            </div>
          )}
        </div>
      )}

      {/* Loading Overlay */}
      {isAnalyzing && (
        <div className="flex-1 flex flex-col items-center justify-center py-16 px-4 text-center space-y-5">
          <div className="relative">
            <div className="absolute inset-0 bg-indigo-100 rounded-full blur-xl animate-pulse"></div>
            <div className="relative bg-indigo-50 text-indigo-600 p-8 rounded-full border-2 border-indigo-100 animate-spin whitespace-nowrap">
              <Loader2 size={40} className="stroke-indigo-600" />
            </div>
          </div>
          <div className="space-y-1.5">
            <h4 className="font-black text-indigo-950 uppercase tracking-tight text-sm">Gemini đang phân tích...</h4>
            <p className="text-indigo-600 font-bold text-xs animate-pulse bg-indigo-50/60 px-4 py-2 rounded-2xl max-w-xs mx-auto border border-indigo-100/30">
              {loadingStep}
            </p>
          </div>
          <p className="text-[11px] text-slate-400 font-medium max-w-[280px]">Công nghệ thị giác máy tính của Google giúp nhận dạng chính xác chữ viết thô trên giấy bẩn, bóng mờ.</p>
        </div>
      )}

      {/* Configuration Missing Prompt */}
      {error === "API_KEY_MISSING" && (
        <div className="bg-rose-50 border-2 border-rose-100 p-6 rounded-[2.5rem] text-center space-y-4 shadow-sm my-4">
          <div className="bg-rose-100 text-rose-700 p-3.5 rounded-full inline-block mx-auto">
            <AlertCircle size={32} />
          </div>
          <div className="space-y-1.5">
            <h4 className="text-rose-900 font-black uppercase text-sm">Chưa thiết lập Gemini API Key!</h4>
            <p className="text-xs text-rose-700 font-medium leading-relaxed">
              Tính năng quét chữ viết tay thông minh cần khóa API để truyền tải dữ liệu tới dịch vụ Google Cloud AI.
            </p>
          </div>
          <div className="bg-white border border-rose-100 p-4 rounded-2xl text-left space-y-2">
            <p className="text-[11px] text-rose-800 font-bold">👉 Cách cài đặt đơn giản:</p>
            <ol className="text-[11px] text-slate-600 font-medium space-y-1 ml-3 list-decimal">
              <li>Nhìn xuống thanh cấu hình hệ thống của AI Studio phía dưới.</li>
              <li>Bấm vào biểu tượng bánh răng <span className="font-extrabold text-slate-800 bg-slate-100 px-1 py-0.5 rounded border border-slate-200">Settings</span>.</li>
              <li>Chọn danh mục <span className="font-extrabold text-indigo-600">Secrets</span> hoặc <span className="font-extrabold text-indigo-600">Developer Settings</span>.</li>
              <li>Thêm biến khóa: <code className="bg-slate-100 text-rose-600 font-black px-1 py-0.5 rounded text-[10px]">GEMINI_API_KEY</code> với mã khóa API được cấp từ nền tảng.</li>
            </ol>
          </div>
          <button 
            onClick={() => setError(null)} 
            className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white font-black uppercase text-xs rounded-xl active:scale-95 transition-all w-full"
          >
            Quay lại thử lại
          </button>
        </div>
      )}

      {/* Generic Error */}
      {error && error !== "API_KEY_MISSING" && (
        <div className="bg-rose-50 border-2 border-rose-100 p-6 rounded-[2.5rem] text-center space-y-4 shadow-sm my-4">
          <div className="bg-rose-100 text-rose-700 p-3.5 rounded-full inline-block mx-auto">
            <AlertCircle size={32} />
          </div>
          <div className="space-y-1.5">
            <h4 className="text-rose-900 font-black uppercase text-sm">Thông báo từ hệ thống</h4>
            <p className="text-xs text-rose-700 font-bold leading-relaxed whitespace-pre-line text-left bg-white/60 p-4 rounded-2xl border border-rose-100/50">{error}</p>
          </div>
          <div className="flex gap-2.5">
            <button 
              onClick={() => { setError(null); handleStartAnalysis(); }} 
              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-xs rounded-xl active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <RefreshCw size={14} /> Thử lại ngay
            </button>
            <button 
              onClick={() => { setError(null); setImagePreview(null); }} 
              className="flex-1 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-black uppercase text-xs rounded-xl active:scale-95 transition-all"
            >
              Chọn ảnh khác
            </button>
          </div>
        </div>
      )}

      {/* Scan Results Display */}
      {results.length > 0 && (
        <div className="space-y-4 mt-2">
          {/* Scan stats banner */}
          <div className="bg-emerald-50 border-2 border-emerald-100 p-4 rounded-3xl flex items-center gap-3.5 shadow-sm">
            <div className="bg-emerald-100 text-emerald-700 p-2.5 rounded-2xl shrink-0">
              <Check size={20} />
            </div>
            <div>
              <h4 className="text-xs font-black text-emerald-950 uppercase tracking-tight">🎉 Nhận diện thành công!</h4>
              <p className="text-[11px] text-emerald-700 font-semibold leading-normal">
                Đã nhận dạng khớp được <span className="text-emerald-950 font-black">{results.length}</span> hộ có chỉ số mới trên biểu mẫu. Vui lòng đối chiếu số liệu dưới đây.
              </p>
            </div>
          </div>

          {/* Results List */}
          <div className="space-y-3">
            <p className="text-[11px] font-black text-slate-500 uppercase tracking-wider ml-1">Danh sách đối khớp chỉ số</p>
            {results.map((item) => {
              const isLower = item.extractedNewIndex < item.oldIndex;
              const isInvalid = item.extractedNewIndex <= 0;
              return (
                <div 
                  key={item.id} 
                  className={`bg-white p-4.5 rounded-[2rem] border-2 shadow-sm transition-all relative ${
                    item.isSelected ? 'border-emerald-300 bg-emerald-50/5' : 'border-slate-100 opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => handleToggleSelect(item.id)}
                      className={`w-6 h-6 rounded-lg border-2 mt-0.5 shrink-0 flex items-center justify-center active:scale-90 transition-all ${
                        item.isSelected 
                          ? 'bg-emerald-600 border-emerald-600 text-white' 
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {item.isSelected && <Check size={14} strokeWidth={3} />}
                    </button>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-slate-900 uppercase text-xs truncate">{item.name}</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5 mt-1">Mã KH: {item.id}</p>
                      
                      <div className="flex items-center gap-4.5 mt-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
                        <div>
                          <p className="text-[8px] font-black text-slate-400 uppercase">Chỉ số cũ</p>
                          <p className="text-sm font-black text-slate-500">{item.oldIndex}</p>
                        </div>
                        <div className="w-px h-6 bg-slate-200"></div>
                        <div className="flex-1">
                          <p className="text-[8px] font-black text-blue-500 uppercase flex items-center gap-0.5">Số mới quét <Edit2 size={8} /></p>
                          <input 
                            type="number"
                            value={item.extractedNewIndex || ''}
                            onChange={(e) => handleIndexChange(item.id, e.target.value)}
                            className={`w-full bg-white px-2 py-1 rounded-md border text-sm font-black mt-0.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none ${
                              isLower ? 'border-rose-400 text-rose-600 bg-rose-50' : 'border-blue-200 text-blue-700'
                            }`}
                          />
                        </div>
                        <div>
                          <p className="text-[8px] font-black text-slate-400 uppercase">Tiêu thụ</p>
                          <p className={`text-sm font-extrabold ${isLower ? 'text-rose-500' : 'text-emerald-700'}`}>
                            {isLower ? 'Lỗi' : `${item.extractedNewIndex - item.oldIndex} m³`}
                          </p>
                        </div>
                      </div>

                      {/* Log Explanation details */}
                      <p className="text-[9px] text-slate-500 mt-2 flex items-start gap-1 font-semibold italic bg-slate-50 p-1.5 rounded-lg border border-slate-100/50">
                        <Info size={11} className="text-slate-400 shrink-0 mt-0.5" />
                        <span>AI ghi chú: {item.reason}</span>
                      </p>

                      {isLower && (
                        <p className="text-[9px] text-rose-600 font-black uppercase tracking-tight mt-1 bg-rose-50 p-1.5 rounded-lg border border-rose-100">
                          ⚠️ Chỉ số mới thấp hơn chỉ số cũ! Vui lòng chỉnh sửa trực tiếp.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Footer */}
          <div className="py-4 space-y-2 bg-white sticky bottom-0 border-t pt-4 z-40">
            <button
              onClick={handleApply}
              className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white py-4.5 rounded-2xl font-black uppercase text-sm shadow-xl shadow-blue-100 flex items-center justify-center gap-1.5 transition-all"
            >
              <Sparkles size={18} /> Áp dụng {results.filter(r => r.isSelected).length} kết quả
            </button>
            <button
              onClick={() => {
                if (confirm("Hủy kết quả quét lần này?")) {
                  setResults([]);
                  setImagePreview(null);
                }
              }}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-2xl font-black uppercase text-xs transition-all"
            >
              Chọn lại ảnh khác / Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
