import React, { useState, useEffect, useRef } from 'react';
import { 
  ChevronLeft, Bot, Check, CheckCheck, 
  RefreshCw, ShieldCheck, Zap, Bell, Upload, 
  CheckCircle2
} from 'lucide-react';
import { Customer } from '../types';
import { formatCurrency, copyToClipboard } from '../utils';

interface AgentViewProps {
  customers: Customer[];
  onBack: () => void;
  updateCustomer: (id: string, updates: Partial<Customer>) => void;
  showToast: (msg: string) => void;
}

interface PendingPayment {
  id: string;
  maKH: string;
  customerName: string;
  zaloSender: string;
  amount: number;
  content: string;
  time: string;
  status: 'pending' | 'approved';
  isRealUploaded?: boolean;
}

export const classifyZaloContact = (zaloName: string, dbOwnerName: string): 'landlord' | 'tenant' => {
  const match = zaloName.match(/^\d+[-_ ]*(.*)$/);
  if (!match) return 'tenant';
  const namePart = match[1].trim().toLowerCase();
  const dbNameClean = dbOwnerName.trim().toLowerCase();
  if (!namePart || !dbNameClean) return 'tenant';

  const removeAccents = (str: string) => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
  };

  const namePartNoAccent = removeAccents(namePart);
  const dbNameNoAccent = removeAccents(dbNameClean);

  if (
    namePart === dbNameClean || 
    dbNameClean.includes(namePart) || 
    namePart.includes(dbNameClean) ||
    namePartNoAccent === dbNameNoAccent ||
    dbNameNoAccent.includes(namePartNoAccent) ||
    namePartNoAccent.includes(dbNameNoAccent)
  ) {
    return 'landlord';
  }
  return 'tenant';
};

export const AgentView: React.FC<AgentViewProps> = ({ customers, onBack, updateCustomer, showToast }) => {
  // Filter only unpaid customers who are also Zalo friends to handle massive 1800+ database
  const filteredCustomers = customers.filter(c => {
    const isUnpaid = (c.amount + c.oldDebt - c.paid) > 0;
    const isZaloFriend = c.isZaloFriend === true;
    return isUnpaid && isZaloFriend;
  });

  // Live Mode states
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [isScanningBill, setIsScanningBill] = useState(false);
  const [billScanProgress, setBillScanProgress] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Init Pending Payments queue with realistic demo items
  useEffect(() => {
    const match2002 = customers.find(c => c.maKH === '2002' || c.maKH === '2402');
    const name2002 = match2002 ? match2002.name : 'VŨ ĐỨC QUỐC';
    const match2010 = customers.find(c => c.maKH === '2010' || c.maKH === '2410');
    const name2010 = match2010 ? match2010.name : 'LÊ THANH TÙNG';

    setPendingPayments([
      {
        id: 'pay-1',
        maKH: match2002 ? match2002.maKH : '2002',
        customerName: name2002,
        zaloSender: '2002_Lê Hoàng Nam',
        amount: match2002 ? (match2002.amount + match2002.oldDebt) : 162000,
        content: '2002 Le Hoang Nam ck tien nuoc phong so 2',
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' Hôm nay',
        status: 'pending'
      },
      {
        id: 'pay-2',
        maKH: match2010 ? match2010.maKH : '2010',
        customerName: name2010,
        zaloSender: '2010_Nguyễn Văn Hải',
        amount: match2010 ? (match2010.amount + match2010.oldDebt) : 324000,
        content: 'Can ho 2010 Nguyen Van Hai ck nuoc',
        time: '10:42 Hôm nay',
        status: 'pending'
      }
    ]);
  }, [customers]);

  // REAL PAYMENT VERIFICATION & APPROVAL (Duyệt Bill Chuyển Khoản Thực Tế)
  const handleApprovePayment = (payItem: PendingPayment) => {
    const cust = customers.find(c => c.maKH === payItem.maKH);
    if (!cust) {
      alert(`Không tìm thấy Mã KH ${payItem.maKH} tương ứng trong cơ sở dữ liệu thực tế!`);
      return;
    }

    updateCustomer(cust.id, {
      paid: payItem.amount,
      isProcessed: true
    });

    try {
      copyToClipboard("🙏");
    } catch (e) {}

    setPendingPayments(prev => prev.map(p => p.id === payItem.id ? { ...p, status: 'approved' } : p));
    showToast(`🟢 Đã duyệt thanh toán ${formatCurrency(payItem.amount)} cho hộ ${payItem.maKH} & Sao chép icon cảm ơn!`);
  };

  const handleApproveAllPayments = () => {
    const pendingItems = pendingPayments.filter(p => p.status === 'pending');
    if (pendingItems.length === 0) {
      alert("Không có hóa đơn nào đang chờ duyệt!");
      return;
    }

    if (!confirm(`Bạn có chắc muốn DUYỆT TOÀN BỘ ${pendingItems.length} hóa đơn đang chờ không? Hệ thống sẽ tự động cập nhật trạng thái đã nộp tiền lên App nước cho tất cả các hộ này.`)) {
      return;
    }

    let count = 0;

    pendingItems.forEach(payItem => {
      const cust = customers.find(c => c.maKH === payItem.maKH);
      if (cust) {
        updateCustomer(cust.id, {
          paid: payItem.amount,
          isProcessed: true
        });
        count++;
      }
    });

    setPendingPayments(prev => prev.map(p => p.status === 'pending' ? { ...p, status: 'approved' } : p));
    
    try {
      copyToClipboard("🙏");
    } catch (e) {}

    showToast(`🟢 Đã duyệt thành công ${count} hóa đơn chờ duyệt & Sao chép icon cảm ơn!`);
  };

  // REAL UPLOAD SCREENSHOT & GEMINI OCR PARSING
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanningBill(true);
    setBillScanProgress("🔄 Đang xử lý và nén ảnh chuyển khoản...");

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Image = reader.result as string;
        setBillScanProgress("🧠 Đang gửi bill sang Gemini AI phân tích cấu trúc ngân hàng...");

        const customersPayload = filteredCustomers.map(c => ({
          id: c.id,
          maKH: c.maKH,
          name: c.name,
          balance: Math.round(c.amount + c.oldDebt - c.paid)
        }));

        const response = await fetch("/api/scan-bill", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image: base64Image,
            customers: customersPayload
          })
        });

        const data = await response.json();
        setIsScanningBill(false);

        if (data.success && data.results) {
          const resObj = data.results;
          
          let matchedCust = customers.find(c => c.id === resObj.matchedCustomerId);
          if (!matchedCust && resObj.matchedCustomerMaKH) {
            matchedCust = customers.find(c => c.maKH === resObj.matchedCustomerMaKH);
          }

          const newPayItem: PendingPayment = {
            id: 'uploaded-' + Date.now(),
            maKH: matchedCust ? matchedCust.maKH : (resObj.matchedCustomerMaKH || '???'),
            customerName: matchedCust ? matchedCust.name : (resObj.matchedCustomerName || 'Chưa định danh'),
            zaloSender: `Zalo Uploaded Bill 🖼️`,
            amount: resObj.amount || 0,
            content: resObj.content || 'Không có lời nhắn',
            time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' Vừa xong',
            status: 'pending',
            isRealUploaded: true
          };

          setPendingPayments(prev => [newPayItem, ...prev]);
          showToast(`✨ Báo cáo: Agent đã nhận diện Bill thành công! Khớp Mã KH: ${newPayItem.maKH}`);
          
          if (resObj.explanation) {
            alert(`🤖 BÁO CÁO CỦA AGENT:\n\n- Số tiền phát hiện: ${formatCurrency(newPayItem.amount)}\n- Lời nhắn: "${newPayItem.content}"\n- Độ tin cậy: ${resObj.confidence}%\n- Kết luận: ${resObj.explanation}`);
          }
        } else {
          alert(`Không phân tích được bill: ${data.message || "Định dạng không được hỗ trợ"}`);
        }
      } catch (err: any) {
        setIsScanningBill(false);
        console.error(err);
        alert(`Lỗi phân tích bill: ${err.message || err}`);
      }
    };
    reader.onerror = () => {
      setIsScanningBill(false);
      alert("Không thể đọc tệp tin.");
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 bg-slate-100 z-[150] flex flex-col pt-[calc(0.5rem+var(--sat))] pb-24 overflow-hidden">
      {/* Header */}
      <header className="px-4 py-3 flex items-center justify-between bg-white border-b shadow-xs shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-2 text-slate-800 active:scale-95 transition-all" title="Quay lại">
            <ChevronLeft size={24} />
          </button>
          <div className="flex items-center gap-1.5">
            <div className="bg-indigo-100 text-indigo-700 p-1.5 rounded-xl">
              <Bot size={20} className="animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase text-indigo-700 italic tracking-tight">Trung Tâm Chỉ Huy AI Agent</h2>
              <p className="text-[9px] text-slate-400 font-bold uppercase">Hệ Thống Tác Nghiệp & Báo Cáo Chạy Thật</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full text-emerald-700 shrink-0">
          <ShieldCheck size={14} className="animate-pulse" />
          <span className="text-[9px] font-black uppercase tracking-tight">Hệ Thống Sẵn Sàng</span>
        </div>
      </header>

      {/* Main Workspace (TÁC NGHIỆP CHẠY THẬT & BÁO CÁO CỦA AGENT) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        <div className="space-y-4 max-w-4xl mx-auto w-full">
          
          {/* AGENT REPORTS ZONE (NƠI BÁO CÁO DUYỆT BILL THANH TOÁN THỰC TẾ) */}
          <div className="bg-white rounded-[2.2rem] border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3.5">
              <div className="space-y-0.5">
                <h3 className="text-xs font-black uppercase text-indigo-950 tracking-wider flex items-center gap-1.5">
                  <Bell size={16} className="text-indigo-600" /> Bảng Báo Cáo Duyệt Bill Chuyển Khoản Chờ Duyệt
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Đối khớp ảnh chuyển khoản với danh sách hộ dân thực tế</p>
              </div>
              
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  onClick={handleApproveAllPayments}
                  disabled={pendingPayments.filter(p => p.status === 'pending').length === 0}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:scale-100 active:scale-95 text-white border-b-2 border-emerald-800 text-[10px] font-black uppercase px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm shadow-emerald-50"
                >
                  <CheckCheck size={12} strokeWidth={3} /> Duyệt Tất Cả
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tight flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                >
                  <Upload size={12} /> Tải bill thực tế
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />
              </div>
            </div>

            {/* Summary Stats bar */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex justify-between items-center text-[11px] font-bold">
              <div className="flex items-center gap-4 text-slate-500 uppercase">
                <span>Tổng bill chờ duyệt: <b className="text-indigo-950 font-black">{pendingPayments.filter(p => p.status === 'pending').length}</b></span>
                <span className="hidden xs:inline text-slate-200 font-normal">|</span>
                <span>Tiền chờ duyệt: <b className="text-rose-600 font-black">{formatCurrency(pendingPayments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0))}</b></span>
              </div>
              <span className="text-[9px] text-slate-400 font-bold uppercase italic">Sát thực bởi Google Gemini</span>
            </div>

            {/* Real-time OCR Loading */}
            {isScanningBill && (
              <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 flex flex-col items-center justify-center text-center space-y-2 animate-pulse">
                <RefreshCw size={24} className="text-indigo-600 animate-spin" />
                <p className="text-xs font-black text-indigo-900">{billScanProgress}</p>
                <p className="text-[9px] text-slate-400 font-bold uppercase">Dịch vụ nhãn quan máy tính của Google đang phân tích...</p>
              </div>
            )}

            {/* Pending Queue List Table (Styled identically to LỊCH SỬ SỬ DỤNG ledger format) */}
            <div className="overflow-x-auto border border-slate-150 rounded-2xl bg-white shadow-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-150 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    <th className="py-2.5 px-3 text-center w-10">STT</th>
                    <th className="py-2.5 px-3 min-w-[120px]">Hộ Dân / Mã KH</th>
                    <th className="py-2.5 px-3 min-w-[130px]">Người Gửi Zalo</th>
                    <th className="py-2.5 px-3 text-right">Số Tiền CK</th>
                    <th className="py-2.5 px-3 min-w-[140px]">Nội Dung Bill</th>
                    <th className="py-2.5 px-3 text-center">Thời Gian</th>
                    <th className="py-2.5 px-3 text-center">Trạng Thái / Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  {pendingPayments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-[10px] text-slate-400 font-bold uppercase">
                        Danh sách chờ duyệt trống
                      </td>
                    </tr>
                  ) : (
                    pendingPayments.map((pay, index) => {
                      const isApproved = pay.status === 'approved';
                      const realCust = customers.find(c => c.maKH === pay.maKH);
                      const totalDebt = realCust ? Math.round(realCust.amount + realCust.oldDebt) : pay.amount;
                      const remaining = realCust ? (totalDebt - realCust.paid) : 0;

                      return (
                        <tr 
                          key={pay.id} 
                          className={`transition-colors hover:bg-slate-50/40 ${
                            isApproved 
                              ? 'bg-emerald-50/10 text-emerald-950' 
                              : 'bg-white'
                          }`}
                        >
                          {/* STT */}
                          <td className="py-3 px-3 text-center font-black text-slate-400">
                            {index + 1}
                          </td>

                          {/* Hộ Dân / Mã KH */}
                          <td className="py-3 px-3">
                            <div className="space-y-0.5">
                              <span className="font-extrabold text-slate-900 block truncate max-w-[140px]">{pay.customerName}</span>
                              <span className="bg-slate-100 text-slate-800 font-black text-[9px] px-1.5 py-0.5 rounded tracking-wide uppercase">
                                {pay.maKH}
                              </span>
                            </div>
                          </td>

                          {/* Người Gửi Zalo */}
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1">
                              <span className="text-slate-600 font-extrabold truncate max-w-[120px]">{pay.zaloSender}</span>
                              {classifyZaloContact(pay.zaloSender, pay.customerName) === 'tenant' ? (
                                <span className="bg-amber-100 text-amber-800 text-[7px] font-black px-1.5 py-0.5 rounded uppercase shrink-0">KT (Thuê)</span>
                              ) : (
                                <span className="bg-rose-100 text-rose-800 text-[7px] font-black px-1.5 py-0.5 rounded uppercase shrink-0">CN (Chủ)</span>
                              )}
                            </div>
                          </td>

                          {/* Số Tiền CK */}
                          <td className="py-3 px-3 text-right">
                            <span className="font-black text-emerald-700 bg-emerald-50/80 px-2 py-0.5 rounded-md border border-emerald-100/50">
                              {formatCurrency(pay.amount)}
                            </span>
                          </td>

                          {/* Nội Dung Bill */}
                          <td className="py-3 px-3">
                            <div className="space-y-1">
                              <p className="text-[10px] text-slate-500 italic max-w-[160px] truncate" title={pay.content}>
                                "{pay.content}"
                              </p>
                              {/* Warn if already fully paid */}
                              {!isApproved && realCust && remaining <= 0 && (
                                <span className="text-[8px] font-black uppercase text-amber-700 bg-amber-50 px-1 py-0.2 rounded inline-block animate-pulse">
                                  ⚠️ ĐÃ NỘP ĐỦ TRÊN APP
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Thời Gian */}
                          <td className="py-3 px-3 text-center text-[10px] font-bold text-slate-400">
                            {pay.time}
                          </td>

                          {/* Trạng Thái / Thao Tác */}
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center">
                              {isApproved ? (
                                <span className="text-[9px] font-black uppercase px-2 py-1 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                                  <CheckCircle2 size={11} className="text-emerald-700 animate-bounce" /> Đã duyệt
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleApprovePayment(pay)}
                                  className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-[9px] font-black uppercase py-1 px-2.5 rounded-lg transition-all shadow-xs border-b border-emerald-800 flex items-center gap-1 cursor-pointer"
                                >
                                  <Check size={10} strokeWidth={3} /> Duyệt Chạy Thật
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
