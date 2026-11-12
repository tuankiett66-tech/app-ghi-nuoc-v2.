import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, Search, Printer, Copy, CheckCheck, MessageCircle, Mic, X, ChevronRight, AlertTriangle, FileText, Calendar, Phone, MapPin, Building, Users } from 'lucide-react';
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
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedZalo, setCopiedZalo] = useState(false);

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
  }, [initialCustomerId]);

  // Danh sách các hộ đang có nợ trong tab hiện tại
  const debtorsList = useMemo(() => {
    return customers
      .filter(c => c.listType === selectedTab && c.balance > 0)
      .sort((a, b) => String(a.maKH).localeCompare(String(b.maKH), undefined, { numeric: true, sensitivity: 'base' }));
  }, [customers, selectedTab]);

  // Tìm kiếm khách hàng theo input Mã KH hoặc Tên
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return customers.filter(c => {
      const matchesTab = c.listType === selectedTab;
      const maKHMatch = c.maKH.toLowerCase().includes(q);
      const nameMatch = c.name.toLowerCase().includes(q);
      const phoneMatch = (c.phoneTenant || c.phone || '').includes(q);
      return matchesTab && (maKHMatch || nameMatch || phoneMatch);
    }).slice(0, 8);
  }, [customers, selectedTab, searchQuery]);

  // Xử lý khi người dùng chọn hoặc nhập Mã KH
  const handleSelectCustomer = (c: Customer) => {
    setSelectedCustomer(c);
    setSelectedMaKH(c.maKH);
    setSelectedTab(c.listType);
    setSearchQuery('');
  };

  const handleMaKHInput = (val: string) => {
    setSelectedMaKH(val);
    const cleanVal = val.trim();
    if (!cleanVal) return;

    // Tìm chính xác Mã KH trong tab hiện tại trước
    let found = customers.find(c => c.listType === selectedTab && c.maKH.toLowerCase() === cleanVal.toLowerCase());
    // Nếu không thấy, tìm trên cả 2 bộ
    if (!found) {
      found = customers.find(c => c.maKH.toLowerCase() === cleanVal.toLowerCase());
      if (found) {
        setSelectedTab(found.listType);
      }
    }
    if (found) {
      setSelectedCustomer(found);
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

  // In giấy A4 / A5
  const handlePrint = () => {
    window.print();
  };

  // Tạo nội dung thông báo gửi Zalo
  const generateZaloCutoffNotice = () => {
    if (!selectedCustomer) return '';
    return `CÔNG TY CPCN NHÀ BÈ
ĐẠI LÝ CẤP NƯỚC ẤP 4_LONG HẬU

GIẤY THÔNG BÁO TẠM NGỪNG CUNG CẤP NƯỚC

Kính gửi: Ông/Bà ${selectedCustomer.name}
Mã KH: ${selectedCustomer.maKH}
Địa chỉ: ${selectedCustomer.address || 'Khu vực Ấp 4, Long Hậu'}

Tính đến nay Quý khách còn nợ số tiền: ${balanceAmount.toLocaleString('vi-VN')} đ

Cụ thể như sau:
- Nước kỳ ${billingPeriodStr}: ${curPeriodAmount.toLocaleString('vi-VN')} đ
- Nợ kỳ trước: ${oldDebtAmount.toLocaleString('vi-VN')} đ
${paidAmount > 0 ? `- Đã thanh toán: -${paidAmount.toLocaleString('vi-VN')} đ\n` : ''}- CÒN NỢ: ${balanceAmount.toLocaleString('vi-VN')} đ

Căn cứ thỏa thuận cung cấp nước của hai bên, kính đề nghị Quý khách hàng kịp thời thanh toán số tiền còn nợ trên ${deadlineText}.

Quý khách không thanh toán đúng hạn, Đại lý cấp nước buộc phải tạm ngừng cung cấp nước, mọi chi phí phát sinh (nếu có) Quý khách hoàn toàn chịu trách nhiệm.

Quý khách hàng liên hệ tại địa chỉ ${agencyAddress} hoặc số điện thoại: ${agencyPhone} trong giờ hành chính để được giải đáp và hướng dẫn.

Trân trọng,
ĐẠI LÝ CẤP NƯỚC ẤP 4_LONG HẬU`;
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

  return (
    <div className="fixed inset-0 bg-slate-100 z-[160] flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
      {/* HEADER BẢO TRÌ & IN ẤN (Ẩn khi bấm in print) */}
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
                Giấy Báo Ngừng Cung Cấp Nước
              </h1>
              <p className="text-[10px] text-slate-500 font-bold">
                Tự động điền theo Mã KH & Nợ đọng
              </p>
            </div>
          </div>
        </div>

        {/* Nút In & Copy */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopyZalo}
            disabled={!selectedCustomer}
            className={`px-3 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 transition-all active:scale-95 shadow-sm border ${
              copiedZalo
                ? 'bg-emerald-600 text-white border-emerald-700'
                : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
            }`}
          >
            {copiedZalo ? <CheckCheck size={16} /> : <Copy size={16} />}
            <span className="hidden sm:inline">{copiedZalo ? 'Đã copy' : 'Copy Zalo'}</span>
          </button>

          <button
            onClick={handlePrint}
            disabled={!selectedCustomer}
            className="px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-black uppercase flex items-center gap-1.5 transition-all active:scale-95 shadow-md border-b-2 border-blue-900 disabled:opacity-50"
          >
            <Printer size={16} />
            <span>In Giấy / PDF</span>
          </button>
        </div>
      </header>

      {/* THANH CÔNG CỤ NHẬP MÃ KH & TÌM KIẾM (Ẩn khi In) */}
      <div className="print:hidden bg-white border-b px-3 py-2.5 shadow-xs shrink-0 space-y-2 z-10">
        <div className="flex items-center gap-2">
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
          <div className="relative flex-1">
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
        </div>

        {/* Thông tin nhanh về số lượng hộ nợ */}
        <div className="flex items-center justify-between text-[11px] px-1 font-bold text-slate-500">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-rose-600 font-black">
              {debtorsList.length} hộ đang nợ tiền
            </span>
            <span>trong Bộ {selectedTab === 'list1' ? '01' : '02'}</span>
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
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center bg-slate-200/60 print:bg-white print:p-0 print:overflow-visible">
        {selectedCustomer ? (
          <div
            id="water-cutoff-notice-paper"
            className="w-full max-w-[760px] bg-white rounded-2xl shadow-xl p-8 sm:p-12 text-slate-900 font-serif leading-relaxed border border-slate-200 print:shadow-none print:border-0 print:p-0 print:w-full print:max-w-none"
            style={{ fontFamily: "'Times New Roman', Times, serif" }}
          >
            {/* PHẦN ĐẦU TRANG */}
            <div className="grid grid-cols-2 gap-4 text-center items-start mb-6">
              <div className="space-y-1">
                <p className="font-bold text-[13px] sm:text-[14px] uppercase tracking-tight">
                  CÔNG TY CPCN NHÀ BÈ
                </p>
                <p className="font-bold text-[13px] sm:text-[14px] uppercase underline tracking-tight">
                  ĐẠI LÝ CẤP NƯỚC ẤP 4_LONG HẬU
                </p>
              </div>

              <div className="space-y-1">
                <p className="font-bold text-[13px] sm:text-[14px] uppercase tracking-tight">
                  CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                </p>
                <p className="font-bold text-[12px] sm:text-[13px] uppercase underline tracking-tight">
                  ĐỘC LẬP - TỰ DO - HẠNH PHÚC
                </p>
              </div>
            </div>

            {/* TIÊU ĐỀ CHÍNH */}
            <div className="text-center my-6 space-y-1">
              <h2 className="font-bold text-[18px] sm:text-[21px] uppercase tracking-tight">
                GIẤY THÔNG BÁO TẠM NGỪNG CUNG CẤP NƯỚC
              </h2>
            </div>

            {/* THÔNG TIN KHÁCH HÀNG */}
            <div className="space-y-2 text-[14px] sm:text-[15px] mb-4">
              <p>
                <span className="italic underline">Kính gửi khách hàng</span> (Ông/Bà):{' '}
                <strong className="uppercase text-[15px] sm:text-[16px] font-bold">
                  {selectedCustomer.name}
                </strong>
                <span className="ml-2 font-sans font-black text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 print:hidden">
                  (Mã KH: {selectedCustomer.maKH})
                </span>
              </p>
              <p>
                <span>Địa chỉ: </span>
                <span>{selectedCustomer.address || 'Ấp 4, xã Long Hậu, Huyện Cần Giuộc, Long An.'}</span>
              </p>
              <p>
                <span>Tính đến nay quý khách còn nợ số tiền: </span>
                <strong className="text-[16px] font-bold font-sans">
                  {balanceAmount.toLocaleString('vi-VN')} đ
                </strong>
              </p>
            </div>

            {/* BẢNG CỤ THỂ CHI TIẾT NỢ */}
            <div className="my-5">
              <p className="font-semibold text-[14px] mb-2">Cụ thể Như sau:</p>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-slate-900 text-center text-[13px] sm:text-[14px]">
                  <thead>
                    <tr className="bg-slate-50 print:bg-transparent">
                      <th className="border border-slate-900 p-2 font-bold">
                        Nước kỳ {billingPeriodStr}
                      </th>
                      <th className="border border-slate-900 p-2 font-bold">
                        Nợ kỳ trước
                      </th>
                      <th className="border border-slate-900 p-2 font-bold">
                        Đã thanh toán
                      </th>
                      <th className="border border-slate-900 p-2 font-bold">
                        Còn nợ
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-slate-900 p-2.5 font-bold font-sans text-sm">
                        {curPeriodAmount > 0 ? curPeriodAmount.toLocaleString('vi-VN') : '0'}
                      </td>
                      <td className="border border-slate-900 p-2.5 font-bold font-sans text-sm">
                        {oldDebtAmount !== 0 ? oldDebtAmount.toLocaleString('vi-VN') : '0'}
                      </td>
                      <td className="border border-slate-900 p-2.5 font-bold font-sans text-sm text-slate-500">
                        {paidAmount > 0 ? paidAmount.toLocaleString('vi-VN') : ''}
                      </td>
                      <td className="border border-slate-900 p-2.5 font-black font-sans text-[15px]">
                        {balanceAmount.toLocaleString('vi-VN')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* NỘI DUNG VĂN BẢN VÀ THỜI HẠN */}
            <div className="space-y-3.5 text-[14px] sm:text-[15px] text-justify leading-relaxed mt-4">
              <p>
                Căn cứ thỏa thuận cung cấp nước của hai bên, kính đề nghị quý khách hàng kịp thời thanh toán số tiền còn nợ trên{' '}
                <span className="font-bold underline print:inline">{deadlineText}</span>.
              </p>

              <p>
                Quý khách không thanh toán đúng hạn, Đại lý cấp nước buộc phải tạm ngừng cung cấp nước, mọi chi phí phát sinh (nếu có) quý khách hoàn toàn chịu trách nhiệm.
              </p>

              <p>
                Quý khách hàng liên hệ tại địa chỉ {agencyAddress} hoặc số điện thoại:{' '}
                <strong className="font-bold font-sans">{agencyPhone}</strong> trong giờ hành chính, để được giải đáp và hướng dẫn.
              </p>
            </div>

            {/* CHỮ KÝ VÀ NGÀY THÁNG */}
            <div className="grid grid-cols-2 gap-4 text-center mt-8 pt-2 items-start">
              <div className="pt-2">
                <p className="font-bold italic text-[14px] sm:text-[15px]">Trân Trọng</p>
              </div>

              <div className="space-y-1">
                <p className="italic text-[13px] sm:text-[14px]">
                  {noticeDateText}
                </p>
                <p className="font-bold uppercase text-[13px] sm:text-[14px] pt-1">
                  ĐẠI LÝ CẤP NƯỚC ẤP 4_LONG HẬU ĐÃ KÝ
                </p>
                <div className="h-16 flex items-center justify-center text-slate-300 italic text-xs print:hidden">
                  (Dấu / Chữ ký đại lý)
                </div>
              </div>
            </div>

            {/* TUỲ CHỈNH NHANH THÔNG TIN (Ẩn khi In) */}
            <div className="print:hidden mt-8 pt-5 border-t border-dashed border-slate-300 bg-slate-50 p-4 rounded-xl space-y-3 font-sans">
              <p className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
                ⚙️ Tùy chỉnh nhanh trước khi In / Gửi
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Hạn thanh toán</label>
                  <input
                    type="text"
                    value={deadlineText}
                    onChange={e => setDeadlineText(e.target.value)}
                    className="w-full bg-white p-2 rounded-lg border border-slate-200 font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Ngày lập giấy</label>
                  <input
                    type="text"
                    value={noticeDateText}
                    onChange={e => setNoticeDateText(e.target.value)}
                    className="w-full bg-white p-2 rounded-lg border border-slate-200 font-bold text-slate-800"
                  />
                </div>
              </div>

              {/* Nút hành động nhanh Zalo */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleOpenZalo}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-black uppercase text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                >
                  <MessageCircle size={16} />
                  <span>Mở Zalo khách hàng ({selectedCustomer.phoneTenant || selectedCustomer.phone || 'Chưa có SĐT'})</span>
                </button>
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
