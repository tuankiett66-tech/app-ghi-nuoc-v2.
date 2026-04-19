
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useWaterData } from './hooks/useWaterData';
import { Header } from './components/Header';
import { ListView } from './components/ListView';
import { DetailView } from './components/DetailView';
import { ConfigView } from './components/ConfigView';
import { StatsView } from './components/StatsView';
import { LossView } from './components/LossView';
import { Modals } from './components/Modals';
import { GroupListView } from './components/GroupListView';
import { GroupDetailView } from './components/GroupDetailView';
import { VerifyView } from './components/VerifyView';
import { normalizePhoneForZalo, copyToClipboard, generateVietQrUrl, formatCurrency, exportToExcel, parseExcelFile, calculateRow, normalizeString, suggestNextMaKH } from './utils';
import { Customer } from './types';

const App: React.FC = () => {
  const { 
    customers, setCustomers, 
    groups, addGroup, updateGroup, deleteGroup, 
    config, setConfig, 
    activeTab, setActiveTab, 
    lossRecords, setLossRecords, addLossRecord, deleteLossRecord,
    updateCustomer, addCustomer, closePeriod, resetBankInfo
  } = useWaterData();
  
  const [view, setView] = useState<string>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [afterMaKH, setAfterMaKH] = useState<string | undefined>(undefined);
  const [onlyNonZalo, setOnlyNonZalo] = useState(false);
  const [onlyUnpaid, setOnlyUnpaid] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [lastAutoBackup, setLastAutoBackup] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastScrollId = useRef<string | null>(null);
  const listScrollTop = useRef<Record<string, number>>({ list1: 0, list2: 0 });

  const handleSyncCloud = async (silent = false) => {
    console.log("handleSyncCloud called, silent:", silent);
    const url = config.sheetUrl?.trim();
    if (!url) {
      if (!silent) showToast("Chưa có Link Script!");
      return;
    }
    if (!silent) setIsSyncing(true);
    try {
      // Đồng bộ cả 2 bộ dữ liệu, Cài đặt và Bản ghi thất thoát trong 1 lần gọi
      const res = await fetch(`${url}${url.includes('?') ? '&' : '?'}action=get_all&t=${Date.now()}`);
      const result = await res.json();
      
      if (result.config) {
        setConfig(prev => ({ ...prev, ...result.config, lastSyncTime: Date.now() }));
      }

      if (Array.isArray(result.lossRecords)) {
        const sanitizedLoss = result.lossRecords.map((r: any, idx: number) => ({
          ...r,
          id: r.id || `loss-sync-${Date.now()}-${idx}`,
          createdAt: parseFloat(r.createdAt) || Date.now(),
          master1New: parseFloat(r.master1New) || 0,
          master1Old: parseFloat(r.master1Old) || 0,
          master2New: parseFloat(r.master2New) || 0,
          master2Old: parseFloat(r.master2Old) || 0,
          list1Volume: parseFloat(r.list1Volume) || 0,
          list2Volume: parseFloat(r.list2Volume) || 0
        }));
        setLossRecords(sanitizedLoss);
      }

      let allCustomers: Customer[] = [];
      
      if (Array.isArray(result.list1) && result.list1.length > 0) {
        const mapped1 = result.list1.map((item: any, idx: number) => {
          // Làm sạch Mã KH
          const maKH = String(item.maKH || "").replace(/^'/, "");

          // Sửa lỗi Số điện thoại mất số 0
          const rawPhone = String(item.phoneTenant || "").replace(/^'/, "");
          const phoneWithZero = (rawPhone && /^[1-9]\d{8,9}$/.test(rawPhone)) ? '0' + rawPhone : rawPhone;
          
          // Sửa lỗi Địa chỉ biến thành Ngày tháng (ISO String)
          let addr = String(item.address || "").replace(/^'/, "");
          if (addr.includes('T') && addr.includes('Z') && addr.length > 15) {
            try {
              const d = new Date(addr);
              if (!isNaN(d.getTime())) {
                // Chuyển ngược từ Date sang dạng ngày/tháng (thường là số nhà bị nhận nhầm)
                // Nếu là 304/11, đôi khi Sheets hiểu là 11 tháng 3 năm 304 hoặc 2024...
                const day = d.getDate();
                const month = d.getMonth() + 1;
                const year = d.getFullYear();
                // Nếu năm quá nhỏ hoặc quá lớn, có thể là do số nhà đặc biệt, ta lấy ngày/tháng
                addr = `${day}/${month}${year > 2100 || year < 1900 ? '/' + year : ''}`;
              }
            } catch (e) { /* ignore */ }
          }

          return calculateRow({
            id: `cust-${maKH}-${idx}-list1`,
            maKH: maKH, 
            name: String(item.name || ""),
            address: addr, 
            phoneTenant: phoneWithZero,
            newIndex: parseFloat(item.newIndex) || 0, 
            oldIndex: parseFloat(item.oldIndex) || 0,
            oldDebt: parseFloat(item.oldDebt) || 0, 
            paid: parseFloat(item.paid) || 0,
            listType: 'list1', 
            isZalo: !!item.isZalo, 
            isZaloFriend: !!item.isZaloFriend,
            note: String(item.note || "").replace(/^'/, "")
          }, result.config?.waterRate || config.waterRate);
        });
        allCustomers = [...allCustomers, ...mapped1];
      } else {
        // Giữ lại dữ liệu cũ của bộ 1 nếu cloud trống
        allCustomers = [...allCustomers, ...customers.filter(c => c.listType === 'list1')];
      }

      if (Array.isArray(result.list2) && result.list2.length > 0) {
        const mapped2 = result.list2.map((item: any, idx: number) => {
          // Làm sạch Mã KH
          const maKH = String(item.maKH || "").replace(/^'/, "");

          // Sửa lỗi Số điện thoại mất số 0
          const rawPhone = String(item.phoneTenant || "").replace(/^'/, "");
          const phoneWithZero = (rawPhone && /^[1-9]\d{8,9}$/.test(rawPhone)) ? '0' + rawPhone : rawPhone;
          
          // Sửa lỗi Địa chỉ biến thành Ngày tháng (ISO String)
          let addr = String(item.address || "").replace(/^'/, "");
          if (addr.includes('T') && addr.includes('Z') && addr.length > 15) {
            try {
              const d = new Date(addr);
              if (!isNaN(d.getTime())) {
                const day = d.getDate();
                const month = d.getMonth() + 1;
                const year = d.getFullYear();
                addr = `${day}/${month}${year > 2100 || year < 1900 ? '/' + year : ''}`;
              }
            } catch (e) { /* ignore */ }
          }

          return calculateRow({
            id: `cust-${maKH}-${idx}-list2`,
            maKH: maKH, 
            name: String(item.name || ""),
            address: addr, 
            phoneTenant: phoneWithZero,
            newIndex: parseFloat(item.newIndex) || 0, 
            oldIndex: parseFloat(item.oldIndex) || 0,
            oldDebt: parseFloat(item.oldDebt) || 0, 
            paid: parseFloat(item.paid) || 0,
            listType: 'list2', 
            isZalo: !!item.isZalo, 
            isZaloFriend: !!item.isZaloFriend,
            note: String(item.note || "").replace(/^'/, "")
          }, result.config?.waterRate || config.waterRate);
        });
        allCustomers = [...allCustomers, ...mapped2];
      } else {
        // Giữ lại dữ liệu cũ của bộ 2 nếu cloud trống
        allCustomers = [...allCustomers, ...customers.filter(c => c.listType === 'list2')];
      }

      setCustomers(allCustomers);
      
      if (!silent) showToast("Đã tải dữ liệu từ Cloud về máy!");
    } catch (e) { 
      console.log("Cloud Sync Error:", e);
      if (!silent) alert("Lỗi tải dữ liệu: " + e);
    }
    finally { if (!silent) setIsSyncing(false); }
  };

  const handleBackupCloud = async (silent = false) => {
    const url = config.sheetUrl?.trim();
    if (!url) {
      if (!silent) showToast("Chưa có Link Script!");
      return;
    }

    if (!url.toLowerCase().includes('/exec')) {
      if (!silent) alert("Link Script sai định dạng /exec");
      return;
    }
    
    // Sắp xếp dữ liệu trước khi gửi để đảm bảo thứ tự trên Sheet khớp với App
    const sortedCustomers = [...customers].sort((a, b) => 
      String(a.maKH || "").localeCompare(String(b.maKH || ""), undefined, { numeric: true, sensitivity: 'base' })
    );

    const data1 = sortedCustomers.filter(c => c.listType === 'list1').map(c => ({
      maKH: "'" + (c.maKH || ""), 
      name: c.name,
      address: "'" + (c.address || ""),
      phoneTenant: "'" + (c.phoneTenant || c.phone || ""),
      newIndex: c.newIndex, 
      oldIndex: c.oldIndex,
      consumption: c.volume, 
      amount: c.amount, 
      oldDebt: c.oldDebt,
      paid: c.paid, 
      remainingDebt: c.balance, 
      isZalo: !!c.isZalo,
      isZaloFriend: !!c.isZaloFriend,
      note: "'" + (c.note || "")
    }));

    const data2 = sortedCustomers.filter(c => c.listType === 'list2').map(c => ({
      maKH: "'" + (c.maKH || ""), 
      name: c.name,
      address: "'" + (c.address || ""),
      phoneTenant: "'" + (c.phoneTenant || c.phone || ""),
      newIndex: c.newIndex, 
      oldIndex: c.oldIndex,
      consumption: c.volume, 
      amount: c.amount, 
      oldDebt: c.oldDebt,
      paid: c.paid, 
      remainingDebt: c.balance, 
      isZalo: !!c.isZalo,
      isZaloFriend: !!c.isZaloFriend,
      note: "'" + (c.note || "")
    }));

    if (!silent) setIsSyncing(true);
    setSyncStatus('syncing');

    try {
      const response = await fetch(`${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`, {
        method: 'POST',
        mode: 'cors',
        redirect: 'follow',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'update_all',
          config: {
            waterRate: config.waterRate,
            bankId: config.bankId,
            accountNo: config.accountNo,
            accountName: config.accountName,
            groupBankId: config.groupBankId || "",
            groupAccountNo: config.groupAccountNo || "",
            groupAccountName: config.groupAccountName || "",
            globalMessage: config.globalMessage
          },
          list1: data1,
          list2: data2,
          lossRecords: lossRecords
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.status === 'success') {
        setSyncStatus('synced');
        setConfig(prev => ({ ...prev, lastSyncTime: Date.now() }));
        setLastAutoBackup(Date.now());
        if (!silent) showToast("Đã tải dữ liệu từ máy lên Cloud!");
      } else {
        throw new Error(result.message || "Lỗi không xác định từ server");
      }
    } catch (e) {
      console.error("Backup error:", e);
      setSyncStatus('error');
      if (!silent) alert("Lỗi sao lưu: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      if (!silent) setIsSyncing(false);
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleManualSave = async () => {
    showToast("Đang tải dữ liệu lên Cloud...");
    await handleBackupCloud(false);
  };

  const selectedCustomer = useMemo(() => customers.find(c => c.id === selectedId) || null, [customers, selectedId]);
  const activeGroup = useMemo(() => groups.find(g => g.id === selectedGroupId), [groups, selectedGroupId]);

  useEffect(() => {
    if (view === 'list') {
      setTimeout(() => {
        const listEl = document.getElementById('main-list-container');
        const savedScroll = listScrollTop.current[activeTab];
        if (listEl && savedScroll > 0) {
          listEl.scrollTop = savedScroll;
        } else if (lastScrollId.current) {
          const el = document.getElementById(`cust-${lastScrollId.current}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          lastScrollId.current = null;
        }
      }, 100);
    }
  }, [view, activeTab]);

  // TỰ ĐỘNG ĐỒNG BỘ ĐÃ BỊ TẮT THEO YÊU CẦU NGƯỜI DÙNG
  // Dữ liệu chỉ được tải về khi bấm nút "Đồng bộ về" (Mũi tên xuống)
  // Dữ liệu chỉ được lưu lên Cloud khi bấm nút "Sao lưu" (Đám mây lên)

  const filtered = useMemo(() => {
    const s = searchQuery.toLowerCase().trim();
    return customers.filter(c => {
      if (c.listType !== activeTab) return false;
      const s = searchQuery.toLowerCase().trim();
      const cleanSearchPrice = s.replace(/\./g, '').replace(/,/g, '');
      const nameStr = String(c.name || "");
      const maKHStr = String(c.maKH || "");
      const balanceStr = Math.round(c.balance).toString();
      
      const match = nameStr.toLowerCase().includes(s) || 
                    maKHStr.toLowerCase().includes(s) || 
                    (c.phoneTenant && String(c.phoneTenant).includes(s)) || 
                    (c.phoneLandlord && String(c.phoneLandlord).includes(s)) ||
                    balanceStr.includes(cleanSearchPrice);
      
      const zaloMatch = onlyNonZalo ? !c.isZalo : true;
      const unpaidMatch = onlyUnpaid ? (c.status === 'unpaid' && c.newIndex > 0 && c.volume > 0) : true;
      
      return match && zaloMatch && unpaidMatch;
    }).sort((a, b) => String(a.maKH).localeCompare(String(b.maKH), undefined, { numeric: true, sensitivity: 'base' }));
  }, [customers, activeTab, searchQuery, onlyNonZalo, onlyUnpaid]);

  const handleCollectFull = (id: string) => {
    const cust = customers.find(c => c.id === id);
    if (!cust) return;
    const totalAmount = Math.round(cust.amount + cust.oldDebt);
    updateCustomer(id, { paid: totalAmount });
    showToast(`Đã thu đủ cho ${cust.name}`);
  };

  const generateMsg = (c: Customer, niStr: string, piStr: string, isGroup: boolean = false) => {
    const ni = parseInt(niStr) || 0;
    const pi = parseInt(piStr) || 0; 
    const vol = (ni > 0 && ni >= c.oldIndex) ? (ni - c.oldIndex) : 0;
    const amt = vol * config.waterRate;
    const subtotal = Math.round(amt + c.oldDebt);
    const remaining = subtotal - pi; 
    const now = new Date();
    
    const monthYear = `${now.getMonth() + 1}/${now.getFullYear()}`;
    const cleanName = normalizeString(c.name).toUpperCase();

    const bankId = isGroup ? (config.groupBankId || config.bankId) : config.bankId;
    const accountNo = isGroup ? (config.groupAccountNo || config.accountNo) : config.accountNo;
    const accountName = isGroup ? (config.groupAccountName || config.accountName) : config.accountName;
    
    let msg = `KỲ NƯỚC THÁNG ${monthYear}
MÃ KH: ${c.maKH}
KH: ${c.name}
SỐ: ${ni} - ${c.oldIndex} = ${vol} m3 x ${config.waterRate.toLocaleString('vi-VN')} = ${amt.toLocaleString('vi-VN')}
NỢ CŨ: ${c.oldDebt.toLocaleString('vi-VN')}
CÒN LẠI: ${remaining.toLocaleString('vi-VN')}

${config.globalMessage}
👉 THÔNG TIN CHUYỂN KHOẢN:
NH: ${bankId.toUpperCase()}
STK: ${accountNo} (Bấm giữ để sao chép)
TÊN: ${accountName}
Nội dung: TT NUOC ${c.maKH}_${cleanName} (BAM GIU DE SAO CHEP)`;

    return msg;
  };

  const handleSendZalo = async () => {
    if (!selectedCustomer) return;
    const msg = generateMsg(selectedCustomer, selectedCustomer.newIndex.toString(), selectedCustomer.paid.toString());
    await copyToClipboard(msg);
    updateCustomer(selectedCustomer.id, { isProcessed: true });
    showToast("Da copy & Mo Zalo...");
    setTimeout(() => {
      const sdt = normalizePhoneForZalo(selectedCustomer.phoneTenant || selectedCustomer.phone);
      window.location.href = `https://zalo.me/${sdt}`;
    }, 300);
  };

  const handleMarkGroupPaid = (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;
    
    const updates: Record<string, Partial<Customer>> = {};
    group.members.forEach(m => {
      const cust = customers.find(c => c.maKH === m.maKH && c.listType === m.source);
      if (cust) {
        const totalAmount = Math.round(cust.amount + cust.oldDebt);
        updates[cust.id] = { paid: totalAmount };
      }
    });

    if (Object.keys(updates).length > 0) {
      setCustomers(prev => prev.map(c => {
        if (updates[c.id]) {
          const merged = { ...c, ...updates[c.id], updatedAt: Date.now() };
          return calculateRow(merged, config.waterRate);
        }
        return c;
      }));
      showToast(`Da thu tien cho ${Object.keys(updates).length} ho trong nhom!`);
    }
  };

  const [groupQrData, setGroupQrData] = useState<{bankId: string, accountNo: string, amount: number, name: string} | null>(null);

  const navigateTo = (newView: string, resetSearch: boolean = true) => {
    if (view === 'list') {
      const listEl = document.getElementById('main-list-container');
      if (listEl) {
        listScrollTop.current[activeTab] = listEl.scrollTop;
      }
    }
    if (resetSearch) setSearchQuery('');
    setView(newView);
  };

  return (
    <div className="h-[100dvh] bg-[#f8fafc] max-w-md mx-auto flex flex-col relative overflow-hidden shadow-2xl">
      {toast && <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[250] px-6 py-3 rounded-2xl shadow-2xl bg-blue-600 text-white font-black text-sm animate-bounce text-center min-w-[240px] border-2 border-white/20">{toast}</div>}

      {(view === 'list' || view === 'edit_customer' || view === 'add_customer' || view === 'edit_msg') && (
        <>
          <Header 
            title={activeTab === 'list1' ? 'BỘ 01' : 'BỘ 02'}
            searchQuery={searchQuery} setSearchQuery={setSearchQuery}
            isSyncing={isSyncing} onSync={handleSyncCloud}
            onSave={handleManualSave}
            syncStatus={syncStatus}
            onShowAdd={() => { setAfterMaKH(undefined); navigateTo('add_customer'); }}
            onShowConfig={() => navigateTo('config')}
            onShowMsgTemplate={() => navigateTo('edit_msg', false)}
            onlyNonZalo={onlyNonZalo} onToggleZaloFilter={() => {
              const newVal = !onlyNonZalo;
              setOnlyNonZalo(newVal);
              showToast(newVal ? "Đang hiện KH chưa có Zalo" : "Hiện tất cả Zalo");
            }}
            onlyUnpaid={onlyUnpaid} onToggleUnpaidFilter={() => {
              const newVal = !onlyUnpaid;
              setOnlyUnpaid(newVal);
              showToast(newVal ? "Đang hiện KH CHƯA THU" : "Hiện tất cả (Đã thu + Chưa thu)");
            }}
            lastSyncTime={config.lastSyncTime}
            onShowVerify={() => navigateTo('verify')}
            onShowGroups={() => navigateTo('group_list')}
          />
          <ListView 
            customers={filtered} 
            onSelect={(id) => { 
              setSelectedId(id); 
              navigateTo('detail'); 
            }}
            onCall={(phone) => { window.location.href = `https://zalo.me/${normalizePhoneForZalo(phone)}`; }}
            onCopyMsg={async (c) => { 
              await copyToClipboard(generateMsg(c, c.newIndex.toString(), c.paid.toString())); 
              updateCustomer(c.id, { isProcessed: true });
              showToast("Da copy hoa don & Danh dau!"); 
            }}
            onCopyName={async (name) => {
              await copyToClipboard(name);
              showToast(`Đã copy tên: ${name}`);
            }}
            onAddAfter={(maKH) => { 
              setAfterMaKH(maKH); 
              navigateTo('add_customer', false); 
              showToast(`Đang chèn hộ mới sau mã ${maKH}`);
            }}
            onCollectFull={handleCollectFull}
          />
        </>
      )}

      {view === 'detail' && selectedCustomer && (
        <DetailView 
          customer={selectedCustomer} config={config}
          onBack={() => { lastScrollId.current = selectedId; navigateTo('list', false); }} 
          onNavigate={(dir) => {
            const idx = filtered.findIndex(c => c.id === selectedId);
            let target = idx;
            if (dir === 'next') target = idx + 1;
            else if (dir === 'prev') target = idx - 1;
            else if (dir === 'next10') target = idx + 10;
            else if (dir === 'prev10') target = idx - 10;
            
            if (target < 0) target = 0;
            if (target >= filtered.length) target = filtered.length - 1;
            
            if (target >= 0 && target < filtered.length) {
              setSelectedId(filtered[target].id);
            }
          }}
          onUpdate={(upd) => updateCustomer(selectedId!, upd)}
          onShowQr={() => setShowQr(true)}
          onEditInfo={() => navigateTo('edit_customer', false)}
          onAddAfter={() => { 
            setAfterMaKH(selectedCustomer.maKH); 
            navigateTo('add_customer', false); 
            showToast(`Đang chèn hộ mới sau mã ${selectedCustomer.maKH}`);
          }}
          onSendZalo={handleSendZalo}
          generateMsg={generateMsg}
        />
      )}

      {view === 'verify' && (
        <VerifyView customers={customers} activeTab={activeTab} onBack={() => navigateTo('list')} onSelect={(id) => { setSelectedId(id); navigateTo('detail'); }} />
      )}

      {view === 'group_list' && (
        <GroupListView 
          groups={groups} customers={customers}
          onBack={() => navigateTo('list')}
          onSelectGroup={(id) => { setSelectedGroupId(id); navigateTo('group_detail'); }}
          onAddGroup={addGroup} onDeleteGroup={deleteGroup}
        />
      )}

      {view === 'group_detail' && activeGroup && (
        <GroupDetailView 
          group={activeGroup} customers={customers} config={config}
          onBack={() => navigateTo('group_list')}
          onUpdateGroup={updateGroup}
          onMarkGroupPaid={handleMarkGroupPaid}
          onNavigate={(dir) => {
            const idx = groups.findIndex(g => g.id === selectedGroupId);
            const target = dir === 'next' ? idx + 1 : idx - 1;
            if (target >= 0 && target < groups.length) setSelectedGroupId(groups[target].id);
          }}
          onSendZalo={async (msg, sdt) => {
            await copyToClipboard(msg);
            showToast("Da copy Bill Nhom!");
            if(sdt) setTimeout(() => { window.location.href = `https://zalo.me/${normalizePhoneForZalo(sdt)}`; }, 300);
          }}
          onShowQr={(bankId, accountNo, amount, name) => setGroupQrData({bankId, accountNo, amount, name})}
        />
      )}

      {groupQrData && (
        <div className="fixed inset-0 bg-slate-900/95 z-[300] flex items-center justify-center p-6" onClick={() => setGroupQrData(null)}>
          <div className="bg-white rounded-[3rem] p-6 w-full max-w-[360px] text-center" onClick={e => e.stopPropagation()}>
            <h3 className="font-black text-indigo-600 mb-4 uppercase italic">QR Thanh toán Nhóm</h3>
            <img src={generateVietQrUrl(groupQrData.bankId, groupQrData.accountNo, groupQrData.amount, groupQrData.name)} className="w-full h-auto mb-4 border-4 border-slate-50 rounded-3xl" alt="QR" />
            <div className="bg-indigo-50 p-5 rounded-[2rem] mb-6">
              <p className="text-[11px] font-black text-indigo-400 uppercase mb-1">Tổng tiền nhóm</p>
              <p className="text-3xl font-black text-indigo-700">{formatCurrency(groupQrData.amount)}</p>
            </div>
            <button onClick={() => setGroupQrData(null)} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase shadow-xl">Đóng</button>
          </div>
        </div>
      )}

      {view === 'config' && (
        <ConfigView 
          config={config} setConfig={setConfig}
          onBack={() => navigateTo('list')}
          onImport={() => fileInputRef.current?.click()}
          onExport={async () => await exportToExcel(customers.filter(c => c.listType === activeTab), `Backup_${activeTab}`)}
          onBackupCloud={handleBackupCloud}
          onClear={() => { if(confirm("Xoa sach du lieu?")) { localStorage.clear(); window.location.reload(); } }}
          onResetBank={resetBankInfo}
        />
      )}

      {view === 'stats' && (
        <StatsView 
          customers={customers} activeTab={activeTab}
          onBack={() => navigateTo('list')}
          onClosePeriod={async () => { if(!confirm("Chot ky?")) return; const res = closePeriod(); await exportToExcel(res, 'Ky_Moi'); showToast("Da chot ky!"); navigateTo('list'); }}
          onExport={async () => await exportToExcel(customers.filter(c => c.listType === activeTab), 'Bao_Cao')}
        />
      )}

      {view === 'loss_management' && (
        <LossView 
          records={lossRecords}
          customers={customers}
          onBack={() => navigateTo('list')}
          onAdd={addLossRecord}
          onDelete={deleteLossRecord}
        />
      )}

      {/* Navigation Tab Bar */}
      {(view === 'list' || view === 'stats' || view === 'loss_management' || view === 'edit_customer' || view === 'add_customer' || view === 'edit_msg' || view === 'group_list' || view === 'group_detail' || view === 'verify') && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white border-2 border-slate-100 p-1.5 rounded-[2.2rem] flex gap-1 shadow-2xl z-[200] mb-[var(--sab)] min-w-[360px]">
          <button 
            onClick={() => { 
              const listEl = document.getElementById('main-list-container');
              if (listEl && view === 'list') listScrollTop.current[activeTab] = listEl.scrollTop;
              setActiveTab('list1'); 
              navigateTo('list'); 
            }} 
            className={`flex-1 px-2 py-3 rounded-[1.8rem] text-[8px] font-black uppercase transition-all ${activeTab === 'list1' && view === 'list' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-400'}`}
          >
            BỘ 01
          </button>
          <button 
            onClick={() => navigateTo('group_list')} 
            className={`flex-1 px-2 py-3 rounded-[1.8rem] text-[8px] font-black uppercase transition-all ${view.startsWith('group') ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-400'}`}
          >
            NHÓM
          </button>
          <button 
            onClick={() => navigateTo('loss_management')} 
            className={`flex-1 px-2 py-3 rounded-[1.8rem] text-[8px] font-black uppercase transition-all ${view === 'loss_management' ? 'bg-rose-500 text-white shadow-lg shadow-rose-200' : 'text-slate-400'}`}
          >
            HAO HỤT
          </button>
          <button 
            onClick={() => navigateTo('stats')} 
            className={`flex-1 px-2 py-3 rounded-[1.8rem] text-[8px] font-black uppercase transition-all ${view === 'stats' ? 'bg-amber-500 text-white shadow-lg shadow-amber-200' : 'text-slate-400'}`}
          >
            BÁO CÁO
          </button>
          <button 
            onClick={() => { 
              const listEl = document.getElementById('main-list-container');
              if (listEl && view === 'list') listScrollTop.current[activeTab] = listEl.scrollTop;
              setActiveTab('list2'); 
              navigateTo('list'); 
            }} 
            className={`flex-1 px-2 py-3 rounded-[1.8rem] text-[8px] font-black uppercase transition-all ${activeTab === 'list2' && view === 'list' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-400'}`}
          >
            BỘ 02
          </button>
        </div>
      )}

      {showQr && selectedCustomer && (
        <div className="fixed inset-0 bg-slate-900/95 z-[300] flex items-center justify-center p-6" onClick={() => setShowQr(false)}>
          <div className="bg-white rounded-[3rem] p-6 w-full max-w-[360px] text-center" onClick={e => e.stopPropagation()}>
            <h3 className="font-black text-blue-600 mb-4 uppercase italic">Thanh toán VietQR</h3>
            <img src={generateVietQrUrl(config.bankId, config.accountNo, selectedCustomer.balance, selectedCustomer.name)} className="w-full h-auto mb-4 border-4 border-slate-50 rounded-3xl" alt="QR" />
            <div className="bg-blue-50 p-5 rounded-[2rem] mb-6">
              <p className="text-[11px] font-black text-blue-400 uppercase mb-1">Số tiền thanh toán</p>
              <p className="text-3xl font-black text-blue-700">{formatCurrency(selectedCustomer.balance)}</p>
            </div>
            <button onClick={() => setShowQr(false)} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase shadow-xl">Đóng</button>
          </div>
        </div>
      )}

      <input type="file" ref={fileInputRef} className="hidden" onChange={async (e) => {
        const file = e.target.files?.[0];
        if (file) {
          const res = await parseExcelFile(file, activeTab, config.waterRate);
          setCustomers(prev => [...prev.filter(c => c.listType !== activeTab), ...res]);
          showToast("Da nhap du lieu Excel!");
          e.target.value = '';
        }
      }} />

      <Modals 
        view={view} setView={setView} addCustomer={addCustomer} 
        updateCustomer={updateCustomer} config={config} setConfig={setConfig} 
        selectedCustomer={selectedCustomer}
        suggestedMaKH={suggestNextMaKH(customers, activeTab, afterMaKH)}
      />
    </div>
  );
};

export default App;
