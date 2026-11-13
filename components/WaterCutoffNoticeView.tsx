import React, { useState, useMemo, useEffect } from 'react';
import { 
  ChevronLeft, Search, Printer, Copy, CheckCheck, MessageCircle, Mic, X, 
  ChevronRight, AlertTriangle, FileText, Calendar, Phone, MapPin, Building, 
  Users, Scissors, ChevronDown, Check
} from 'lucide-react';
import { Customer, SystemConfig } from '../types';
import { formatCurrency, copyToClipboard, normalizePhoneForZalo, getBillingMonthYear, normalizeString } from '../utils';

interface WaterCutoffNoticeViewProps {
  customers: Customer[];
  config: SystemConfig;
  initialCustomerId?: string | null;
  activeTab: 'list1' | 'list2';
  onBack: () => void;
  onSelectCustomer?: (id: string) => void;
}

export const WaterCutoffNoticeView: React.FC<WaterCutoffNoticeViewProps> = ({
  customers,
  config,
  initialCustomerId,
  activeTab: defaultTab,
  onBack,
  onSelectCustomer
}) => {
  const [selectedTab, setSelectedTab] = useState<'list1' | 'list2'>(defaultTab);
  const [selectedMaKH, setSelectedMaKH] = useState<string>('');
  const [copiedZalo, setCopiedZalo] = useState(false);
  const [printMode, setPrintMode] = useState<'double' | 'single'>('double'); // Mặc định: in 2 bản trên 1 tờ A4 (cắt đôi)
  const [zaloTemplateStyle, setZaloTemplateStyle] = useState<'detailed' | 'compact'>('detailed');
  const [showZaloPreview, setShowZaloPreview] = useState(true);

  // Custom editable fields for the notice
  const now = new Date();
  const currentDay = now.getDate();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Mặc định hạn thanh toán: ngày 20 của tháng hiện tại (hoặc tháng sau nếu đã qua ngày 20)
  const defaultDeadlineMonth = currentDay >= 20 ? (currentMonth === 12 ? 1 : currentMonth + 1) : currentMonth;
  const defaultDeadlineYear = currentDay >= 20 && currentMonth === 12 ? currentYear + 1 : currentYear;

  const [deadlineText, setDeadlineText] = useState<string>(`trước ngày 20 tháng ${defaultDeadlineMonth} năm ${defaultDeadlineYear}`);
  const [noticeDateText, setNoticeDateText] = useState<string>(`Long Hậu  Ngày ${currentDay} tháng ${currentMonth} năm ${currentYear}`);
  const [agencyPhone, setAgencyPhone] = useState<string>('0942 444224');
  const [agencyAddress, setAgencyAddress] = useState<string>('số 21 Tỉnh lộ 826C, xã Long Hậu, huyện Cần Giuộc');

  // Khách hàng hiện tại được chọn
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Khởi tạo khách hàng ban đầu nếu có truyền initialCustomerId
  useEffect(() => {
    if (initialCustomerId) {
      const found = customers.find(c => c.id === initialCustomerId);
      if (found) {
        setSelectedCustomer(found);
        setSelectedMaKH(found.maKH);
        setSelectedTab(found.listType);
      }
    } else {
      // Tìm khách hàng có nợ đầu tiên trong danh sách của tab hiện tại
      const firstDebtor = customers.find(c => c.listType === selectedTab && c.balance > 0);
      if (firstDebtor) {
        setSelectedCustomer(firstDebtor);
        setSelectedMaKH(firstDebtor.maKH);
      }
    }
  }, [initialCustomerId, customers, selectedTab]);

  // Danh sách các hộ còn nợ trong tab hiện tại
  const debtorsList = useMemo(() => {
    return customers.filter(c => c.listType === selectedTab && c.balance > 0);
  }, [customers, selectedTab]);

  // Chọn khách hàng
  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setSelectedMaKH(customer.maKH);
    if (onSelectCustomer) {
      onSelectCustomer(customer.id);
    }
  };

  // Tìm kiếm theo Mã KH
  const handleMaKHInput = (val: string) => {
    setSelectedMaKH(val);
    const cleanVal = val.trim();
    if (!cleanVal) return;

    // Tìm trong tab hiện tại trước
    let found = customers.find(
      c => c.listType === selectedTab && c.maKH.toLowerCase() === cleanVal.toLowerCase()
    );
    // Nếu không thấy, tìm trên cả 2 bộ
    if (!found) {
      found = customers.find(c => c.maKH.toLowerCase() === cleanVal.toLowerCase());
      if (found) {
        setSelectedTab(found.listType);
      }
    }
    if (found) {
      setSelectedCustomer(found);
      if (onSelectCustomer) onSelectCustomer(found.id);
    }
  };

  // Giọng nói nhập Mã KH
  const handleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Trình duyệt không hỗ trợ nhận diện giọng nói");
    const recognition = new SpeechRecognition();
    recognition.lang = 'vi-VN';
    recognition.start();
    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      const clean = text.replace(/[^0-9A-Z]/gi, '');
      if (clean) {
        handleMaKHInput(clean);
      }
    };
  };

  // Điều hướng hộ nợ tiếp theo / trước đó
  const handleNavigateDebtor = (dir: 'next' | 'prev') => {
    if (debtorsList.length === 0) return;
    const currentIndex = debtorsList.findIndex(c => c.id === selectedCustomer?.id);
    let nextIndex = dir === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex < 0) nextIndex = debtorsList.length - 1;
    if (nextIndex >= debtorsList.length) nextIndex = 0;
    handleSelectCustomer(debtorsList[nextIndex]);
  };

  // Tên kỳ nước hiện tại (Ví dụ: "10/2026")
  const billingPeriodStr = useMemo(() => {
    return getBillingMonthYear();
  }, []);

  // Format số liệu bảng
  const curPeriodAmount = selectedCustomer ? Math.round(selectedCustomer.amount) : 0;
  const oldDebtAmount = selectedCustomer ? Math.round(selectedCustomer.oldDebt) : 0;
  const paidAmount = selectedCustomer ? Math.round(selectedCustomer.paid) : 0;
  const balanceAmount = selectedCustomer ? Math.round(selectedCustomer.balance) : 0;

  // In giấy
  const handlePrint = () => {
    window.print();
  };

  // Tạo nội dung thông báo gửi Zalo chuẩn đẹp & tối ưu bố cục
  const generateZaloCutoffNotice = () => {
    if (!selectedCustomer) return '';
    const cleanName = normalizeString(selectedCustomer.name).toUpperCase();
    const bankId = config.bankId ? config.bankId.toUpperCase() : 'VCB';
    const accountNo = config.accountNo || '1066386342';
    const accountName = config.accountName || 'HKD TRAN NGOC TONG';

    if (zaloTemplateStyle === 'compact') {
      return `⚠️ THÔNG BÁO TẠM NGỪNG CUNG CẤP NƯỚC
🏢 ĐẠI LÝ CẤP NƯỚC ẤP 4_LONG HẬU

👤 Kính gửi: ${selectedCustomer.name} (Mã KH: ${selectedCustomer.maKH})
📍 Địa chỉ: ${selectedCustomer.address || 'Khu vực Ấp 4, Long Hậu'}

💰 TỔNG NỢ CẦN THANH TOÁN: ${balanceAmount.toLocaleString('vi-VN')} đ
(Nước kỳ ${billingPeriodStr}: ${curPeriodAmount.toLocaleString('vi-VN')} đ | Nợ cũ: ${oldDebtAmount.toLocaleString('vi-VN')} đ${paidAmount > 0 ? ` | Đã trả: -${paidAmount.toLocaleString('vi-VN')} đ` : ''})

⏰ HẠN THANH TOÁN: ${deadlineText.toUpperCase()}
(Quá thời hạn trên, Đại lý buộc phải tạm ngừng cấp nước theo quy định).

💳 THÔNG TIN CHUYỂN KHOẢN:
• NH: ${bankId}
• STK: ${accountNo} (Bấm giữ để sao chép)
• TÊN: ${accountName}
• Nội dung: TT NUOC ${selectedCustomer.maKH}_${cleanName} (Bấm giữ để sao chép)

📞 Hotline hỗ trợ: ${agencyPhone} (Giờ hành chính)
Trân trọng cảm ơn Quý khách!`;
    }

    // Mẫu chuẩn chi tiết đầy đủ (Bố cục đẹp, chuyên nghiệp, rành mạch từng khối)
    return `🚨 THÔNG BÁO TẠM NGỪNG CUNG CẤP NƯỚC
🏢 ĐẠI LÝ CẤP NƯỚC ẤP 4_LONG HẬU

👤 Kính gửi: Ông/Bà ${selectedCustomer.name}
🔑 Mã KH: ${selectedCustomer.maKH}
📍 Địa chỉ: ${selectedCustomer.address || 'Khu vực Ấp 4, Long Hậu'}

⚠️ TỔNG TIỀN CÒN NỢ: ${balanceAmount.toLocaleString('vi-VN')} đ
────────────────────────
📋 CHI TIẾT CÁC KHOẢN NỢ:
• Tiền nước kỳ ${billingPeriodStr}: ${curPeriodAmount.toLocaleString('vi-VN')} đ
• Nợ kỳ trước: ${oldDebtAmount.toLocaleString('vi-VN')} đ
${paidAmount > 0 ? `• Đã thanh toán: -${paidAmount.toLocaleString('vi-VN')} đ\n` : ''}👉 CÒN LẠI PHẢI THU: ${balanceAmount.toLocaleString('vi-VN')} đ
────────────────────────
⏰ HẠN THANH TOÁN: ${deadlineText.toUpperCase()}

⚠️ Kính đề nghị Quý khách thanh toán đúng hạn. Quá thời hạn trên, Đại lý buộc phải tạm ngừng cung cấp nước sinh hoạt, mọi chi phí phát sinh Quý khách hoàn toàn chịu trách nhiệm.

💳 THÔNG TIN CHUYỂN KHOẢN:
• Ngân hàng: ${bankId}
• Số tài khoản: ${accountNo} (Bấm giữ để sao chép)
• Chủ tài khoản: ${accountName}
• Nội dung CK: TT NUOC ${selectedCustomer.maKH}_${cleanName} (Bấm giữ để sao chép)

📞 Hotline hỗ trợ: ${agencyPhone} (Trong giờ hành chính)
🏠 Địa chỉ liên hệ: ${agencyAddress}

🙏 Trân trọng cảm ơn Quý khách!`;
  };

  const handleCopyZalo = async () => {
    const text = generateZaloCutoffNotice();
    if (!text) return;
    await copyToClipboard(text);
    setCopiedZalo(true);
    setTimeout(() => setCopiedZalo(false), 2500);
  };

  const handleOpenZalo = () => {
    if (!selectedCustomer) return;
    const phone = selectedCustomer.phoneTenant || selectedCustomer.phone;
    if (!phone) {
      alert("Khách hàng này chưa có số điện thoại!");
      return;
    }
    const cleanPhone = normalizePhoneForZalo(phone);
    window.location.href = `https://zalo.me/${cleanPhone}`;
  };

  // Component render nội dung 1 bản thông báo khổ 1/2 A4 (Cỡ chữ chuẩn 12pt)
  const renderSingleNotice = (isCopyNotice: boolean = false) => {
    if (!selectedCustomer) return null;

    return (
      <div 
        className="w-full bg-white text-slate-900 font-serif leading-[1.35] p-4 sm:p-6 print:px-2 print:py-1.5 flex flex-col justify-between text-[15px] sm:text-[16px] print:text-[12pt]"
        style={{ fontFamily: "'Times New Roman', Times, serif" }}
      >
        {/* PHẦN ĐẦU TRANG */}
        <div className="grid grid-cols-2 gap-2 text-center items-start mb-2 print:mb-1.5">
          <div className="space-y-0.5">
            <p className="font-bold text-[13px] sm:text-[15px] print:text-[11.5pt] uppercase tracking-tight">
              CÔNG TY CPCN NHÀ BÈ
            </p>
            <p className="font-bold text-[13px] sm:text-[15px] print:text-[11.5pt] uppercase underline tracking-tight">
              ĐẠI LÝ CẤP NƯỚC ẤP 4_LONG HẬU
            </p>
          </div>

          <div className="space-y-0.5">
            <p className="font-bold text-[13px] sm:text-[15px] print:text-[11.5pt] uppercase tracking-tight">
              CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
            </p>
            <p className="font-bold text-[12px] sm:text-[14px] print:text-[11pt] uppercase underline tracking-tight">
              ĐỘC LẬP-TỰ DO-HẠNH PHÚC
            </p>
          </div>
        </div>

        {/* TIÊU ĐỀ CHÍNH */}
        <div className="text-center my-2 print:my-1.5">
          <h2 className="font-bold text-[17px] sm:text-[19px] print:text-[14pt] uppercase tracking-tight">
            GIẤY THÔNG BÁO TẠM NGỪNG CUNG CẤP NƯỚC
          </h2>
          {isCopyNotice && (
            <p className="text-[11px] italic text-slate-500 font-sans print:hidden">
              (Liên 2: Bản sao lưu đối chiếu)
            </p>
          )}
        </div>

        {/* THÔNG TIN KHÁCH HÀNG */}
        <div className="space-y-1 text-[15px] sm:text-[16px] print:text-[12pt] mb-2 print:mb-1.5">
          <p>
            <span className="italic underline">Kính gửi khách hàng</span>( Ông/Bà) :{' '}
            <strong className="uppercase text-[16px] sm:text-[17px] print:text-[12.5pt] font-bold">
              {selectedCustomer.name}
            </strong>
            <span className="ml-2 font-sans font-black text-[11px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 print:hidden">
              Mã KH: {selectedCustomer.maKH}
            </span>
          </p>
          <p>
            <span>Địa chỉ: </span>
            <span>{selectedCustomer.address || '151/68, ấp 4, xã Long Hậu, Huyện Cần Giuộc, Long An.'}</span>
          </p>
          <p>
            <span>Tính đến nay quý khách còn nợ số tiền : </span>
            <strong className="text-[16px] sm:text-[17px] print:text-[12.5pt] font-bold font-sans">
              {balanceAmount.toLocaleString('vi-VN')} đ
            </strong>
          </p>
        </div>

        {/* BẢNG CỤ THỂ CHI TIẾT NỢ */}
        <div className="my-2 print:my-1.5">
          <p className="font-semibold text-[15px] sm:text-[16px] print:text-[12pt] mb-1">Cụ thể Như sau:</p>
          <table className="w-full border-collapse border border-slate-900 text-center text-[14px] sm:text-[16px] print:text-[12pt]">
            <thead>
              <tr className="bg-slate-50 print:bg-transparent">
                <th className="border border-slate-900 px-2 py-1 font-bold">
                  Nước kỳ {billingPeriodStr}
                </th>
                <th className="border border-slate-900 px-2 py-1 font-bold">
                  Nợ kỳ trước
                </th>
                <th className="border border-slate-900 px-2 py-1 font-bold">
                  Đã thanh toán
                </th>
                <th className="border border-slate-900 px-2 py-1 font-bold">
                  Còn nợ
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-900 px-2 py-1.5 font-bold font-sans text-[15px] sm:text-[16px] print:text-[12pt]">
                  {curPeriodAmount > 0 ? curPeriodAmount.toLocaleString('vi-VN') : '0'}
                </td>
                <td className="border border-slate-900 px-2 py-1.5 font-bold font-sans text-[15px] sm:text-[16px] print:text-[12pt]">
                  {oldDebtAmount !== 0 ? oldDebtAmount.toLocaleString('vi-VN') : '0'}
                </td>
                <td className="border border-slate-900 px-2 py-1.5 font-bold font-sans text-slate-600 text-[15px] sm:text-[16px] print:text-[12pt]">
                  {paidAmount > 0 ? paidAmount.toLocaleString('vi-VN') : ''}
                </td>
                <td className="border border-slate-900 px-2 py-1.5 font-black font-sans text-[16px] sm:text-[17px] print:text-[12.5pt]">
                  {balanceAmount.toLocaleString('vi-VN')}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* NỘI DUNG VĂN BẢN VÀ THỜI HẠN */}
        <div className="space-y-1 text-[15px] sm:text-[16px] print:text-[12pt] text-justify leading-[1.35] mt-1.5 print:mt-1">
          <p>
            Căn cứ thỏa thuận cung cấp nước của hai bên, kính đề nghị quý khách hàng kịp thời thanh toán số tiền còn nợ trên{' '}
            <span className="font-bold underline">{deadlineText}</span>.
          </p>

          <p>
            Quý khách không thanh toán đúng hạn, Đại lý cấp nước buộc phải tạm ngừng cung cấp nước, mọi chi phí phát sinh(nếu có) quý khách hoàn toàn chịu trách nhiệm.
          </p>

          <p>
            Quý khách hàng liên hệ tại địa chỉ {agencyAddress} hoặc số điện thoại:{' '}
            <strong className="font-bold font-sans">{agencyPhone}</strong> trong giờ hành chính, để được giải đáp và hướng dẫn.
          </p>
        </div>

        {/* CHỮ KÝ VÀ NGÀY THÁNG */}
        <div className="grid grid-cols-2 gap-2 text-center mt-2.5 print:mt-2 pt-1 items-start text-[15px] sm:text-[16px] print:text-[12pt]">
          <div className="pt-1">
            <p className="font-bold italic">Trân Trọng</p>
          </div>

          <div className="space-y-0.5">
            <p className="font-bold italic">
              {noticeDateText}
            </p>
            <p className="font-bold uppercase pt-0.5 print:text-[11.5pt]">
              ĐẠI LÝ CẤP NƯỚC ẤP 4_LONG HẬU ĐÃ KÝ
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-100 z-[160] flex flex-col overflow-hidden animate-in slide-in-from-right duration-200 print:static print:inset-auto print:block print:overflow-visible print:bg-white">
      {/* CSS DÀNH RIÊNG CHO IN ẤN KHỔ 1/2 A4 */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 5mm 8mm;
          }
          body, html {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-hidden, header, nav, .toolbar-container, .zalo-preview-panel, .customize-panel {
            display: none !important;
          }
          .print-area {
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
            display: block !important;
            overflow: visible !important;
          }
          .half-a4-notice {
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            padding: 2mm 1mm !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      {/* HEADER BẢO TRÌ & IN ẤN */}
      <header className="print:hidden bg-white border-b px-4 py-3 flex items-center justify-between shadow-xs shrink-0 z-20">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-2 text-slate-700 hover:bg-slate-100 rounded-xl active:scale-90 transition-all">
            <ChevronLeft size={24} />
          </button>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-rose-100 text-rose-700 rounded-xl">
              <FileText size={18} />
            </div>
            <div>
              <h1 className="text-sm font-black uppercase text-slate-900 tracking-tight leading-tight">
                Giấy Báo Tạm Ngừng Cung Cấp Nước
              </h1>
              <p className="text-[10px] text-slate-500 font-bold">
                Khổ chuẩn 1/2 Giấy A4 (A5)
              </p>
            </div>
          </div>
        </div>

        {/* Nút In & Chế độ In */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopyZalo}
            disabled={!selectedCustomer}
            className={`px-3 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 transition-all active:scale-95 shadow-sm border ${
              copiedZalo
                ? 'bg-emerald-600 text-white border-emerald-700'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            {copiedZalo ? <CheckCheck size={16} /> : <Copy size={16} />}
            <span>{copiedZalo ? 'Đã copy Zalo' : 'Copy tin Zalo'}</span>
          </button>

          <button
            onClick={handlePrint}
            disabled={!selectedCustomer}
            className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-black uppercase flex items-center gap-1.5 transition-all active:scale-95 shadow-md border-b-2 border-blue-900 disabled:opacity-50"
          >
            <Printer size={16} />
            <span>In Giấy (1/2 A4)</span>
          </button>
        </div>
      </header>

      {/* THANH CÔNG CỤ NHẬP MÃ KH & TÙY CHỌN KHỔ IN (Ẩn khi In) */}
      <div className="print:hidden bg-white border-b px-3 py-2.5 shadow-xs shrink-0 space-y-2 z-10 toolbar-container">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Chọn Bộ 01 / Bộ 02 */}
          <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 shrink-0">
            <button
              onClick={() => {
                setSelectedTab('list1');
                const first = customers.find(c => c.listType === 'list1' && c.balance > 0);
                if (first) handleSelectCustomer(first);
              }}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${
                selectedTab === 'list1' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500'
              }`}
            >
              Bộ 01
            </button>
            <button
              onClick={() => {
                setSelectedTab('list2');
                const first = customers.find(c => c.listType === 'list2' && c.balance > 0);
                if (first) handleSelectCustomer(first);
              }}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${
                selectedTab === 'list2' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500'
              }`}
            >
              Bộ 02
            </button>
          </div>

          {/* Ô Nhập Mã KH nhanh */}
          <div className="relative flex-1 min-w-[160px]">
            <input
              type="text"
              value={selectedMaKH}
              onChange={e => handleMaKHInput(e.target.value)}
              placeholder="Nhập Mã KH (Vd: 1007, 1836)..."
              className="w-full bg-slate-50 px-3 py-2 pr-16 rounded-xl font-black text-sm text-blue-700 border-2 border-slate-200 focus:border-blue-500 outline-none shadow-inner"
              autoComplete="off"
            />
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
              {selectedMaKH && (
                <button
                  onClick={() => {
                    setSelectedMaKH('');
                    setSelectedCustomer(null);
                  }}
                  className="p-1 text-slate-400 hover:text-rose-500"
                >
                  <X size={14} />
                </button>
              )}
              <button
                onClick={handleVoiceInput}
                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                title="Đọc Mã KH bằng giọng nói"
              >
                <Mic size={15} />
              </button>
            </div>
          </div>

          {/* Nút chuyển nhanh giữa các hộ nợ */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => handleNavigateDebtor('prev')}
              title="Hộ nợ trước"
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl active:scale-90 transition-all border border-slate-200"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => handleNavigateDebtor('next')}
              title="Hộ nợ tiếp theo"
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl active:scale-90 transition-all border border-slate-200"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Chọn chế độ in: 2 bản trên 1 tờ A4 (Cắt đôi) hoặc 1 bản (1/2 A4) */}
          <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 shrink-0">
            <button
              onClick={() => setPrintMode('double')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-black uppercase transition-all flex items-center gap-1 ${
                printMode === 'double' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="In 2 bản trên 1 tờ A4 (ở giữa có vạch kéo cắt)"
            >
              <Scissors size={13} />
              <span>2 Bản / Tờ A4 (Cắt đôi)</span>
            </button>
            <button
              onClick={() => setPrintMode('single')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-black uppercase transition-all flex items-center gap-1 ${
                printMode === 'single' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Chỉ in 1 bản nửa trang A4 hoặc A5"
            >
              <FileText size={13} />
              <span>1 Bản (1/2 A4)</span>
            </button>
          </div>
        </div>

        {/* Thông tin nhanh về số lượng hộ nợ */}
        <div className="flex items-center justify-between text-[11px] px-1 font-bold text-slate-500">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-rose-600 font-black">
              {debtorsList.length} hộ đang nợ tiền
            </span>
            <span>trong Bộ {selectedTab === 'list1' ? '01' : '02'}</span>
            <span className="text-slate-400">|</span>
            <span className="text-indigo-600">
              {printMode === 'double' ? '2 bản/tờ A4 (nhân đôi để cắt)' : '1 bản (nửa tờ A4)'}
            </span>
          </div>

          {selectedCustomer && (
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Đang chọn:</span>
              <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md font-black">
                {selectedCustomer.maKH} - {selectedCustomer.name}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* VÙNG CHỨA NỘI DUNG VĂN BẢN (PREVIEW & IN ẤN) */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-6 flex flex-col items-center bg-slate-200/60 print:bg-white print:p-0 print:overflow-visible print-area">
        {selectedCustomer ? (
          <div className="w-full max-w-[760px] flex flex-col gap-4 print:gap-0 print:w-full print:max-w-none">
            {/* BẢN IN THỨ 1 (NỬA TRANG TRÊN HOẶC BẢN DUY NHẤT) */}
            <div className="half-a4-notice bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden print:border-0 print:shadow-none">
              {renderSingleNotice(false)}
            </div>

            {/* ĐƯỜNG CẮT VÀ BẢN THỨ 2 (NẾU CHỌN CHẾ ĐỘ 2 BẢN / 1 TỜ A4) */}
            {printMode === 'double' && (
              <>
                {/* Đường vạch đứt nét để cắt giấy ở giữa tờ A4 */}
                <div className="py-2 flex items-center justify-center gap-2 text-slate-400 print:text-slate-700 my-1 select-none">
                  <div className="flex-1 border-b-2 border-dashed border-slate-300 print:border-slate-800"></div>
                  <div className="flex items-center gap-1.5 text-[11px] font-sans font-bold uppercase tracking-widest px-2 py-0.5 bg-slate-100 print:bg-white rounded border border-slate-200 print:border-slate-400">
                    <Scissors size={14} />
                    <span>ĐƯỜNG CẮT ĐÔI GIẤY A4</span>
                    <Scissors size={14} className="rotate-180" />
                  </div>
                  <div className="flex-1 border-b-2 border-dashed border-slate-300 print:border-slate-800"></div>
                </div>

                {/* BẢN IN THỨ 2 (NỬA TRANG DƯỚI) */}
                <div className="half-a4-notice bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden print:border-0 print:shadow-none">
                  {renderSingleNotice(true)}
                </div>
              </>
            )}

            {/* KHỐI XEM TRƯỚC VÀ COPY TIN NHẮN ZALO (CHUẨN ĐẸP, BỐ CỤC RÕ RÀNG) */}
            <div className="print:hidden mt-2 border border-blue-200 bg-white rounded-2xl shadow-sm overflow-hidden zalo-preview-panel">
              {/* Header của Khối Zalo */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-600 text-white rounded-lg shadow-xs">
                    <MessageCircle size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase text-slate-800 tracking-tight flex items-center gap-1.5">
                      Tin nhắn Zalo gửi khách hàng
                    </h3>
                    <p className="text-[10px] text-slate-500 font-bold">
                      Đã tối ưu bố cục chuyên nghiệp & kèm STK bấm giữ sao chép
                    </p>
                  </div>
                </div>

                {/* Chuyển đổi mẫu Zalo: Chuẩn Đầy Đủ vs Ngắn Gọn */}
                <div className="flex items-center gap-1">
                  <div className="bg-white p-0.5 rounded-xl border border-blue-200 flex">
                    <button
                      onClick={() => setZaloTemplateStyle('detailed')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${
                        zaloTemplateStyle === 'detailed'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Mẫu đầy đủ
                    </button>
                    <button
                      onClick={() => setZaloTemplateStyle('compact')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${
                        zaloTemplateStyle === 'compact'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Mẫu ngắn gọn
                    </button>
                  </div>

                  <button
                    onClick={() => setShowZaloPreview(!showZaloPreview)}
                    className="p-1 text-slate-500 hover:text-slate-800 rounded-lg"
                    title={showZaloPreview ? 'Thu gọn' : 'Mở rộng'}
                  >
                    <ChevronDown size={18} className={`transition-transform duration-200 ${showZaloPreview ? 'rotate-180' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Nội dung tin nhắn Zalo xem trước */}
              {showZaloPreview && (
                <div className="p-3.5 space-y-3">
                  <div className="relative group">
                    <pre className="bg-slate-900 text-emerald-400 p-4 rounded-xl font-mono text-[11.5px] sm:text-[12px] leading-relaxed whitespace-pre-wrap max-h-[300px] overflow-y-auto shadow-inner border border-slate-700 select-all">
                      {generateZaloCutoffNotice()}
                    </pre>
                  </div>

                  {/* 2 Nút thao tác nhanh Zalo: Copy & Mở App */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      onClick={handleCopyZalo}
                      className={`py-3 rounded-xl font-black uppercase text-xs flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md ${
                        copiedZalo
                          ? 'bg-emerald-600 text-white'
                          : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                      }`}
                    >
                      {copiedZalo ? <CheckCheck size={18} /> : <Copy size={18} />}
                      <span>{copiedZalo ? 'ĐÃ COPY TIN NHẮN!' : 'COPY TIN NHẮN ZALO'}</span>
                    </button>

                    <button
                      onClick={handleOpenZalo}
                      className="py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black uppercase text-xs flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md"
                    >
                      <MessageCircle size={18} />
                      <span>MỞ ZALO GỬI CHO KHÁCH ({selectedCustomer.phoneTenant || selectedCustomer.phone || 'Chưa SĐT'})</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* TUỲ CHỈNH NHANH THÔNG TIN VĂN BẢN (Ẩn khi In) */}
            <div className="print:hidden border border-slate-200 bg-white p-4 rounded-2xl shadow-sm space-y-3 font-sans customize-panel">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-black uppercase text-slate-600 tracking-wider">
                  ⚙️ Tùy chỉnh ngày tháng & địa chỉ trên Giấy Báo
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Hạn thanh toán</label>
                  <input
                    type="text"
                    value={deadlineText}
                    onChange={e => setDeadlineText(e.target.value)}
                    className="w-full bg-slate-50 p-2 rounded-xl border border-slate-200 font-bold text-slate-800 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Ngày lập giấy</label>
                  <input
                    type="text"
                    value={noticeDateText}
                    onChange={e => setNoticeDateText(e.target.value)}
                    className="w-full bg-slate-50 p-2 rounded-xl border border-slate-200 font-bold text-slate-800 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Địa chỉ liên hệ đại lý</label>
                  <input
                    type="text"
                    value={agencyAddress}
                    onChange={e => setAgencyAddress(e.target.value)}
                    className="w-full bg-slate-50 p-2 rounded-xl border border-slate-200 font-bold text-slate-800 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">SĐT Đại lý cấp nước</label>
                  <input
                    type="text"
                    value={agencyPhone}
                    onChange={e => setAgencyPhone(e.target.value)}
                    className="w-full bg-slate-50 p-2 rounded-xl border border-slate-200 font-bold text-slate-800 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-10 text-center max-w-md shadow-md space-y-4 my-auto">
            <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle size={28} />
            </div>
            <div>
              <h3 className="text-base font-black uppercase text-slate-800">
                Chưa chọn khách hàng
              </h3>
              <p className="text-xs text-slate-500 font-bold mt-1">
                Vui lòng nhập Mã KH vào ô phía trên hoặc chọn một hộ trong danh sách nợ để tự động xuất Giấy thông báo tạm ngừng cấp nước.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
