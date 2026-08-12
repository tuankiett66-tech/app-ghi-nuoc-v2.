import React, { useState, useEffect, useRef } from 'react';
import { 
  ChevronLeft, Bot, Sparkles, Settings, Play, Check, CheckCheck, 
  RefreshCw, Plus, Trash2, HelpCircle, Terminal, User, Users, 
  Phone, ShieldCheck, Zap, Send, Bell, DollarSign, Upload, 
  AlertTriangle, FileText, CheckCircle2, Clock, Copy, Search
} from 'lucide-react';
import { Customer } from '../types';
import { formatCurrency, normalizePhoneForZalo, copyToClipboard } from '../utils';

interface AgentViewProps {
  customers: Customer[];
  onBack: () => void;
  updateCustomer: (id: string, updates: Partial<Customer>) => void;
  showToast: (msg: string) => void;
}

interface RobotRule {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
}

interface MockContact {
  id: string;
  zaloName: string;
  phone: string;
  type: 'landlord' | 'tenant' | 'normal';
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
  const [activeTab, setActiveTab] = useState<'simulation' | 'live'>('live');
  
  // Filter only unpaid customers who are also Zalo friends to handle massive 1800+ database
  const filteredCustomers = customers.filter(c => {
    const isUnpaid = (c.amount + c.oldDebt - c.paid) > 0;
    const isZaloFriend = c.isZaloFriend === true;
    return isUnpaid && isZaloFriend;
  });
  
  // Rules State
  const [rules, setRules] = useState<RobotRule[]>([
    {
      id: 'priority_tenant',
      name: 'Định danh (Mã KH_Tên KH)',
      description: 'Nếu Tên Zalo sau dấu "_" khớp tên trong App nước -> Chủ nhà (Landlord). Nếu không khớp -> Khách thuê (Tenant). Robot tự động ưu tiên chọn Khách thuê.',
      isActive: true,
    },
    {
      id: 'auto_processed',
      name: 'Tự động đánh dấu Đã Gửi (isProcessed)',
      description: 'Đánh dấu hộ dân thành màu Xanh lá sau khi copy và mở Zalo, giúp tránh gửi trùng lặp.',
      isActive: true,
    },
    {
      id: 'auto_open_zalo',
      name: 'Mở cửa sổ Chat Zalo tức thì',
      description: 'Tự động kích hoạt chuyển hướng mở cuộc hội thoại Zalo trực tiếp ngay khi tiến trình hoàn tất.',
      isActive: true,
    },
    {
      id: 'double_check_debt',
      name: 'Kiểm tra dư nợ an toàn',
      description: 'Nếu số tiền âm hoặc bằng 0, Robot sẽ đưa ra cảnh báo và không sao chép tin nhắn đòi tiền.',
      isActive: true,
    }
  ]);

  // Mock Contacts for Sandbox (Modified to match user requirement: MÃ KH_TÊN KH)
  const [mockContacts, setMockContacts] = useState<MockContact[]>([
    { id: '1', zaloName: '2001_Bùi Thị Bình', phone: '0901234567', type: 'normal' }, // Khớp tên chủ nhà (Landlord)
    { id: '2', zaloName: '2001_Trần Quốc Anh', phone: '0907654321', type: 'normal' }, // Không khớp (Khách thuê)
    { id: '3', zaloName: '2002_Vũ Đức Quốc', phone: '0912345678', type: 'normal' }, // Khớp tên chủ nhà (Landlord)
    { id: '4', zaloName: '2002_Lê Hoàng Nam', phone: '0988888888', type: 'normal' }, // Không khớp (Khách thuê)
    { id: '5', zaloName: '2010_Lê Thanh Tùng', phone: '0977777777', type: 'normal' }, // Khớp tên chủ nhà (Landlord)
    { id: '6', zaloName: '2010_Nguyễn Văn Hải', phone: '0955555555', type: 'normal' }, // Không khớp (Khách thuê)
  ]);

  // Sandbox states
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactType, setNewContactType] = useState<'landlord' | 'tenant' | 'normal'>('normal');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [simStatus, setSimStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [logs, setLogs] = useState<string[]>([]);
  const [simProgress, setSimProgress] = useState<number>(0);
  const [, setMatchedContact] = useState<MockContact | null>(null);

  // Live Mode states
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [isScanningBill, setIsScanningBill] = useState(false);
  const [billScanProgress, setBillScanProgress] = useState('');

  const consoleEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto scroll terminal logs
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Init Pending Payments queue with realistic demo items
  useEffect(() => {
    // Try to map to actual customers in DB to keep data linked
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

  // Default customer in simulation (Filtered to unpaid Zalo friends)
  useEffect(() => {
    if (filteredCustomers.length > 0) {
      if (!selectedCustomerId || !filteredCustomers.some(c => c.id === selectedCustomerId)) {
        setSelectedCustomerId(filteredCustomers[0].id);
      }
    } else {
      setSelectedCustomerId('');
    }
  }, [filteredCustomers, selectedCustomerId]);

  const handleToggleRule = (id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, isActive: !r.isActive } : r));
    showToast("Đã cập nhật quy tắc huấn luyện!");
  };

  const handleAddMockContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName.trim()) return;

    const newContact: MockContact = {
      id: Date.now().toString(),
      zaloName: newContactName.trim(),
      phone: newContactPhone.trim() || '0900000000',
      type: newContactType,
    };

    setMockContacts(prev => [...prev, newContact]);
    setNewContactName('');
    setNewContactPhone('');
    showToast("Đã thêm danh bạ Zalo giả lập!");
  };

  const handleDeleteMockContact = (id: string) => {
    setMockContacts(prev => prev.filter(c => c.id !== id));
    showToast("Đã xóa liên hệ!");
  };

  const addLog = (message: string, delay: number): Promise<void> => {
    return new Promise(resolve => {
      setTimeout(() => {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString('vi-VN')}] ${message}`]);
        resolve();
      }, delay);
    });
  };

  // 1. Simulation Engine (Learn/Train Mode)
  const runSimulation = async () => {
    const cust = filteredCustomers.find(c => c.id === selectedCustomerId);
    if (!cust) {
      alert("Vui lòng chọn một hộ dân chưa thanh toán & đã kết bạn Zalo để chạy mô phỏng!");
      return;
    }

    setSimStatus('running');
    setLogs([]);
    setSimProgress(0);
    setMatchedContact(null);

    try {
      await addLog("🤖 ROBOT: Khởi động Cánh tay Robot Zalo AI...", 400);
      setSimProgress(10);

      await addLog(`📊 ROBOT: Đang nạp dữ liệu hộ MaKH [${cust.maKH}] - Tên: ${cust.name}...`, 600);
      setSimProgress(25);

      const totalAmt = Math.round(cust.amount + cust.oldDebt);
      const balance = totalAmt - cust.paid;

      await addLog(`💸 ROBOT: Chỉ số cũ: ${cust.oldIndex} | Chỉ số mới: ${cust.newIndex} | Tiêu thụ: ${cust.volume} m³.`, 400);
      await addLog(`💰 ROBOT: Nợ kỳ trước: ${formatCurrency(cust.oldDebt)} | Tiền nước kỳ này: ${formatCurrency(cust.amount)} | Tổng phải thu: ${formatCurrency(balance)}.`, 300);

      const checkDebtRule = rules.find(r => r.id === 'double_check_debt');
      if (checkDebtRule?.isActive && balance <= 0) {
        await addLog("⚠️ ROBOT CẢNH BÁO: Số dư nợ nhỏ hơn hoặc bằng 0đ. Robot phát hiện không có dư nợ cần đòi tiền nước.", 500);
        await addLog("⏹️ ROBOT: Dừng tiến trình mô phỏng an toàn.", 300);
        setSimStatus('idle');
        return;
      }

      await addLog("📝 ROBOT: Đang soạn văn bản thông báo tiền nước chuẩn cấu trúc kỳ...", 500);
      setSimProgress(45);

      const sampleMsg = `Tiền nước KỲ ${new Date().getMonth() + 1}/${new Date().getFullYear()}
MÃ KH: ${cust.maKH}
KH: ${cust.name}
SỐ: ${cust.newIndex} - ${cust.oldIndex} = ${cust.volume} m3
NỢ CŨ: ${cust.oldDebt.toLocaleString('vi-VN')}
CÒN LẠI: ${balance.toLocaleString('vi-VN')}`;

      await addLog(`📋 ROBOT: Tự động sao chép văn bản vào Khay nhớ tạm (Clipboard) thành công! ✅`, 500);
      try {
        await copyToClipboard(sampleMsg);
      } catch (e) {}

      await addLog(`🔍 ROBOT: Bắt đầu tìm kiếm danh bạ trên Zalo với từ khóa Mã KH: "${cust.maKH}"...`, 600);
      setSimProgress(65);

      const matchingContacts = mockContacts.filter(c => c.zaloName.startsWith(cust.maKH));

      if (matchingContacts.length === 0) {
        await addLog(`❌ ROBOT THẤT BẠI: Không tìm thấy liên hệ nào khớp với Mã KH "${cust.maKH}" trên danh bạ Zalo giả lập!`, 500);
        await addLog(`💡 Gợi ý: Hãy tạo Danh bạ Zalo giả lập ở khung bên phải có tên bắt đầu bằng "${cust.maKH}_..." để Robot đối khớp thử nghiệm.`, 300);
        setSimStatus('error');
        return;
      }

      await addLog(`👁️ ROBOT: Quét màn hình tìm kiếm Zalo phát hiện ${matchingContacts.length} tài khoản phù hợp:`, 400);
      for (const mc of matchingContacts) {
        const classification = classifyZaloContact(mc.zaloName, cust.name);
        const typeLabel = classification === 'tenant' ? 'Khách Thuê (Tên khác Chủ nhà)' : 'Chủ Nhà (Khớp tên App)';
        await addLog(`   - Liên hệ: "${mc.zaloName}" (${typeLabel}) - SĐT: ${mc.phone}`, 200);
      }

      const priorityRule = rules.find(r => r.id === 'priority_tenant');
      let target: MockContact | null = null;

      if (priorityRule?.isActive) {
        await addLog(`⚖️ ROBOT: Áp dụng quy tắc "MÃ KH_TÊN KH (Đúng là chủ nhà, Không đúng là khách thuê)"...`, 400);
        
        // Find contacts that are classified as tenants (name after prefix doesn't match cust.name)
        const tenantContact = matchingContacts.find(mc => classifyZaloContact(mc.zaloName, cust.name) === 'tenant');
        
        if (tenantContact) {
          target = tenantContact;
          await addLog(`🎯 ROBOT QUYẾT ĐỊNH: Phát hiện liên hệ "${target.zaloName}" không khớp tên chủ nhà "${cust.name}". Xác định đây là KHÁCH THUÊ 🔑. Tự động ưu tiên chọn! 🚀`, 600);
        } else {
          target = matchingContacts[0];
          await addLog(`ℹ️ ROBOT: Không tìm thấy tài khoản khách thuê (không khớp tên). Chọn liên hệ mặc định khả dụng đầu tiên: "${target.zaloName}".`, 400);
        }
      } else {
        target = matchingContacts[0];
        await addLog(`ℹ️ ROBOT: Quy tắc ưu tiên bị tắt. Chọn tài khoản đầu tiên tìm thấy: "${target.zaloName}".`, 400);
      }

      setMatchedContact(target);
      setSimProgress(85);

      const processedRule = rules.find(r => r.id === 'auto_processed');
      if (processedRule?.isActive) {
        updateCustomer(cust.id, { isProcessed: true });
        await addLog(`🟢 ROBOT: Tự động đánh dấu trạng thái "Đã xử lý" (isProcessed = true) cho hộ ${cust.maKH} trên App nước để tránh gửi trùng.`, 500);
      }

      const openZaloRule = rules.find(r => r.id === 'auto_open_zalo');
      if (openZaloRule?.isActive) {
        const cleanSdt = normalizePhoneForZalo(target.phone || cust.phoneTenant || cust.phone);
        await addLog(`🚀 ROBOT HOÀN THÀNH: Mô phỏng mở đường dẫn chat Zalo trực tiếp: https://zalo.me/${cleanSdt}`, 400);
        
        setSimProgress(100);
        setSimStatus('success');
        showToast("Mô phỏng gửi tin nhắn Zalo thành công!");

        setTimeout(() => {
          if (confirm(`🤖 [AGENT MÔ PHỎNG THÀNH CÔNG]\n\nRobot đã định danh chính xác liên hệ: ${target?.zaloName}\nHóa đơn đã được sao chép.\n\nBạn có muốn mở cuộc trò chuyện thực tế trên Zalo của số điện thoại này (${target?.phone})?`)) {
            window.open(`https://zalo.me/${cleanSdt}`, '_blank');
          }
        }, 300);
      } else {
        setSimProgress(100);
        setSimStatus('success');
        showToast("Mô phỏng hoàn thành!");
      }

    } catch (err) {
      console.error(err);
      await addLog("❌ LỖI HỆ THỐNG: Quá trình chạy thử nghiệm gặp sự cố bất ngờ.", 400);
      setSimStatus('error');
    }
  };


  // 3. REAL PAYMENT VERIFICATION & APPROVAL (Duyệt Bill Chuyển Khoản Thực Tế)
  const handleApprovePayment = (payItem: PendingPayment) => {
    // Find matching real customer
    const cust = customers.find(c => c.maKH === payItem.maKH);
    if (!cust) {
      alert(`Không tìm thấy Mã KH ${payItem.maKH} tương ứng trong cơ sở dữ liệu thực tế!`);
      return;
    }

    // Update real customer payment inside Hook
    updateCustomer(cust.id, {
      paid: payItem.amount,
      isProcessed: true
    });

    // Copy only 1 thank you icon to clipboard as requested
    try {
      copyToClipboard("🙏");
    } catch (e) {}

    // Update state to Approved
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

    // Update state to approved
    setPendingPayments(prev => prev.map(p => p.status === 'pending' ? { ...p, status: 'approved' } : p));
    
    // Copy only 1 thank you icon to clipboard
    try {
      copyToClipboard("🙏");
    } catch (e) {}

    showToast(`🟢 Đã duyệt thành công ${count} hóa đơn chờ duyệt & Sao chép icon cảm ơn!`);
  };


  // 4. REAL UPLOAD SCREENSHOT & GEMINI OCR PARSING
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

        // Send only unpaid Zalo friends to optimize API context and prevent matching paid/unconnected users
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
          
          // Match in DB
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

      {/* Tabs Switcher */}
      <div className="bg-white border-b px-4 py-2.5 flex gap-2 shrink-0">
        <button
          onClick={() => setActiveTab('live')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-tight transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'live'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100 border-b-2 border-indigo-800'
              : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
          }`}
        >
          <Zap size={14} className={activeTab === 'live' ? 'animate-bounce' : ''} /> 🚀 Tác Nghiệp Chạy Thật
        </button>
        <button
          onClick={() => setActiveTab('simulation')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-tight transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'simulation'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100 border-b-2 border-indigo-800'
              : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
          }`}
        >
          <Play size={14} /> 🎓 Huấn Luyện & Chạy Thử
        </button>
      </div>

      {/* Main Tab Views Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 no-scrollbar">
        
        {/* TAB 1: LIVE WORKSPACE (TÁC NGHIỆP CHẠY THẬT & BÁO CÁO CỦA AGENT) */}
        {activeTab === 'live' && (
          <div className="space-y-4 max-w-4xl mx-auto w-full">
            
            {/* AGENT REPORTS ZONE (NƠI BÁO CÁO DUYỆT BILL THANH TOÁN THỰC TẾ) */}
            <div className="bg-white rounded-[2.2rem] border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3.5">
                <div className="space-y-0.5">
                  <h3 className="text-xs font-black uppercase text-indigo-950 tracking-wider flex items-center gap-1.5">
                    <Bell size={16} className="text-indigo-600 animate-swing animate-duration-1000" /> Bảng Báo Cáo Duyệt Bill Chuyển Khoản Chờ Duyệt
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
        )}

        {/* TAB 2: SIMULATION & TRAINING (CHẠY THỬ NGHIỆM & HUẤN LUYỆN RULES) */}
        {activeTab === 'simulation' && (
          <div className="space-y-4 max-w-4xl mx-auto w-full">
            {/* Training Rules Panel */}
            <div className="bg-white rounded-[2.2rem] border border-slate-100 p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2 border-b pb-3">
                <Settings size={16} className="text-indigo-600" /> 1. Bộ Quy Tắc Huấn Luyện AI (Rules)
              </h3>
              <div className="space-y-3.5">
                {rules.map(rule => (
                  <div key={rule.id} className="flex items-start justify-between gap-4 p-3.5 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all">
                    <div className="space-y-1">
                      <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        {rule.name}
                        {rule.isActive ? (
                          <span className="bg-emerald-100 text-emerald-800 text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-tight">BẬT</span>
                        ) : (
                          <span className="bg-slate-100 text-slate-500 text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-tight">TẮT</span>
                        )}
                      </h4>
                      <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">{rule.description}</p>
                    </div>
                    <button
                      onClick={() => handleToggleRule(rule.id)}
                      className={`w-12 h-6 rounded-full transition-all shrink-0 relative outline-none border ${
                        rule.isActive ? 'bg-indigo-600 border-indigo-700' : 'bg-slate-200 border-slate-300'
                      }`}
                    >
                      <div className={`w-4.5 h-4.5 bg-white rounded-full shadow-md absolute top-0.5 transition-all ${rule.isActive ? 'right-0.5' : 'left-0.5'}`}></div>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Sandbox details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Column: Simulator console */}
              <div className="bg-white rounded-[2.2rem] border border-slate-100 p-5 shadow-sm space-y-4 flex flex-col">
                <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2 border-b pb-3">
                  <Play size={16} className="text-emerald-600" /> 2. Chạy Thử Nghiệm Mô Phỏng
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                      Bước A: Chọn Hộ nước để Chạy thử 
                      <span className="text-indigo-600 font-extrabold ml-1.5">(Đã lọc: Chưa thanh toán & Đã kết bạn Zalo - {filteredCustomers.length} hộ)</span>
                    </label>
                    {filteredCustomers.length === 0 ? (
                      <div className="bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-extrabold p-3 rounded-2xl flex items-center gap-2">
                        <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                        <span>Không có hộ nào Chưa thanh toán & Đã kết bạn Zalo!</span>
                      </div>
                    ) : (
                      <select
                        value={selectedCustomerId}
                        onChange={(e) => setSelectedCustomerId(e.target.value)}
                        className="w-full bg-slate-50 hover:bg-slate-100 rounded-2xl py-3 px-4 border border-slate-200 text-xs font-extrabold text-slate-800 focus:outline-none focus:border-indigo-500 transition-all"
                      >
                        {filteredCustomers.map(c => {
                          const statusLabel = c.newIndex === 0 ? '❌ Chưa ghi' : '✅ Đã ghi';
                          const balance = Math.round(c.amount + c.oldDebt - c.paid);
                          return (
                            <option key={c.id} value={c.id}>
                              {c.maKH} - {c.name} (Còn nợ: {formatCurrency(balance)}) [{statusLabel}]
                            </option>
                          );
                        })}
                      </select>
                    )}
                  </div>

                  {selectedCustomerId && (() => {
                    const cust = filteredCustomers.find(c => c.id === selectedCustomerId);
                    if (!cust) return null;
                    return (
                      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 space-y-2">
                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                          <span>Mã KH: <b className="text-slate-800 font-extrabold">{cust.maKH}</b></span>
                          <span>Bộ: <b className="text-indigo-600 font-extrabold uppercase">{cust.listType === 'list1' ? 'Bộ 01' : 'Bộ 02'}</b></span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-500">
                          <div>Chủ nhà: <b className="text-slate-700">{cust.phoneLandlord || '---'}</b></div>
                          <div>Khách thuê (KT): <b className="text-slate-700">{cust.phoneTenant || '---'}</b></div>
                        </div>
                        <div className="flex justify-between items-center border-t border-slate-200/60 pt-2 text-[10px] font-bold">
                          <span className="text-slate-500">Tiền kỳ này: <b className="text-rose-600">{formatCurrency(cust.amount + cust.oldDebt - cust.paid)}</b></span>
                          <span className={`px-2 py-0.5 rounded-full text-[8px] uppercase font-black ${cust.isProcessed ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-800 border border-amber-200'}`}>
                            {cust.isProcessed ? 'Đã gửi' : 'Chưa gửi'}
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  <button
                    onClick={runSimulation}
                    disabled={simStatus === 'running'}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:bg-slate-300 disabled:scale-100 text-white font-black uppercase text-xs py-3.5 rounded-2xl transition-all shadow-md shadow-emerald-100 flex items-center justify-center gap-2 border-b-4 border-emerald-800"
                  >
                    {simStatus === 'running' ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" /> Robot đang tác nghiệp...
                      </>
                    ) : (
                      <>
                        <Zap size={14} className="animate-bounce" /> Kích hoạt Robot Chạy thử
                      </>
                    )}
                  </button>
                </div>

                {/* Virtual Console */}
                {(logs.length > 0 || simStatus !== 'idle') && (
                  <div className="flex-1 flex flex-col space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400 mt-2">
                      <span className="flex items-center gap-1"><Terminal size={12} className="text-indigo-600" /> Bảng điều khiển robot (Log)</span>
                      <button onClick={() => { setLogs([]); setSimStatus('idle'); }} className="text-rose-500 hover:underline">Xóa log</button>
                    </div>
                    <div className="bg-slate-900 text-emerald-400 font-mono text-[10px] p-4 rounded-2xl h-56 overflow-y-auto space-y-1.5 shadow-inner border border-slate-950 no-scrollbar">
                      {logs.map((log, idx) => (
                        <div key={idx} className="whitespace-pre-wrap leading-normal border-b border-slate-800/30 pb-1 last:border-0 last:pb-0">{log}</div>
                      ))}
                      {simStatus === 'running' && (
                        <div className="flex items-center gap-1 text-indigo-400 font-bold animate-pulse mt-1">
                          <span>▋ Robot đang phân tích bước tiếp theo...</span>
                        </div>
                      )}
                      <div ref={consoleEndRef} />
                    </div>

                    {/* Progress bar */}
                    {simStatus !== 'idle' && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-[8px] font-black text-slate-400 uppercase">
                          <span>Tiến trình hoàn thành: {simProgress}%</span>
                          <span>{simStatus === 'running' ? 'Đang chạy' : simStatus === 'success' ? 'Thành công' : 'Gặp lỗi'}</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                          <div
                            className={`h-full transition-all duration-300 ${simStatus === 'error' ? 'bg-rose-500' : simStatus === 'success' ? 'bg-emerald-500' : 'bg-indigo-600'}`}
                            style={{ width: `${simProgress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column: Zalo Sandbox directory */}
              <div className="bg-white rounded-[2.2rem] border border-slate-100 p-5 shadow-sm space-y-4">
                <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2 border-b pb-3">
                  <Users size={16} className="text-indigo-600" /> 3. Danh Bạ Zalo Giả Lập (Sandbox)
                </h3>
                <p className="text-[10px] text-slate-400 font-bold leading-normal">
                  Thêm các liên hệ Zalo giả định để kiểm tra luật Robot đối chiếu. Thêm mã căn hộ làm tiền tố (ví dụ: <code className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded">2002_KT_Quốc</code>) để Robot tự động quét phân loại.
                </p>

                {/* Form add */}
                <form onSubmit={handleAddMockContact} className="bg-slate-50 border border-slate-100 p-3 rounded-2xl space-y-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[8px] font-black text-slate-400 uppercase">Tên Danh Bạ Zalo</label>
                      <input
                        type="text"
                        required
                        placeholder="VD: 2002_KT_Quoc"
                        value={newContactName}
                        onChange={e => setNewContactName(e.target.value)}
                        className="w-full bg-white rounded-xl py-2 px-3 border border-slate-200 text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-[8px] font-black text-slate-400 uppercase">Số Điện Thoại</label>
                      <input
                        type="text"
                        placeholder="Không bắt buộc"
                        value={newContactPhone}
                        onChange={e => setNewContactPhone(e.target.value)}
                        className="w-full bg-white rounded-xl py-2 px-3 border border-slate-200 text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between items-center gap-2 pt-1 border-t border-slate-200/40">
                    <div className="flex gap-1">
                      {(['normal', 'landlord', 'tenant'] as const).map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setNewContactType(type)}
                          className={`text-[8px] font-black px-2 py-1.5 rounded-lg border uppercase transition-all ${
                            newContactType === type
                              ? 'bg-indigo-600 border-indigo-700 text-white'
                              : 'bg-white border-slate-200 text-slate-500'
                          }`}
                        >
                          {type === 'tenant' ? 'Khách thuê (KT)' : type === 'landlord' ? 'Chủ nhà' : 'Tự ở'}
                        </button>
                      ))}
                    </div>
                    <button
                      type="submit"
                      className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white p-2 rounded-xl transition-all shadow-xs"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </form>

                {/* List contacts */}
                <div className="max-h-52 overflow-y-auto space-y-2 border border-slate-100 rounded-2xl p-2 bg-slate-50/50 no-scrollbar">
                  {mockContacts.map(mc => (
                    <div key={mc.id} className="bg-white p-2.5 rounded-xl border border-slate-100 flex items-center justify-between gap-2 shadow-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`p-1.5 rounded-lg shrink-0 ${
                          mc.type === 'tenant' ? 'bg-amber-100 text-amber-700' : mc.type === 'landlord' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          <User size={14} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black text-slate-800 truncate">{mc.zaloName}</p>
                          <p className="text-[8px] text-slate-400 font-bold uppercase tracking-tight flex items-center gap-1 mt-0.5">
                            <Phone size={8} /> SĐT: {mc.phone} |
                            <span className={`font-black ${mc.type === 'tenant' ? 'text-amber-600' : mc.type === 'landlord' ? 'text-rose-500' : 'text-slate-500'}`}>
                              {mc.type === 'tenant' ? 'Khách Thuê' : mc.type === 'landlord' ? 'Chủ Nhà' : 'Hộ Tự Ở'}
                            </span>
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteMockContact(mc.id)}
                        className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
