
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useWaterData } from './hooks/useWaterData';
import { useWaterSync } from './hooks/useWaterSync';
import { Header } from './components/Header';
import { ListView } from './components/ListView';
import { DetailView } from './components/DetailView';
import { ConfigView } from './components/ConfigView';
import { StatsView } from './components/StatsView';
import { LossView } from './components/LossView';
import { LossDailyTracking } from './components/LossDailyTracking';
import { Modals } from './components/Modals';
import { GroupListView } from './components/GroupListView';
import { GroupDetailView } from './components/GroupDetailView';
import { VerifyView } from './components/VerifyView';
import { AIScanView } from './components/AIScanView';
import { normalizePhoneForZalo, copyToClipboard, generateVietQrUrl, formatCurrency, exportToExcel, parseExcelFile, calculateRow, normalizeString, suggestNextMaKH, getBillingMonthYear, normalizeDate, normalizeMonthYear, parseStringOrDateToNumber, getZaloBillingHeader, getCurrentPeriodSuffix, parseSafeBool, safeJsonStringify } from './utils';
import { Customer, LossRecord } from './types';
import { AlertTriangle } from 'lucide-react';

const App: React.FC = () => {
  const { 
    customers, setCustomers, 
    groups, setGroups, addGroup, updateGroup, deleteGroup, 
    config, setConfig, 
    activeTab, setActiveTab, 
    lossRecords, setLossRecords, addLossRecord, deleteLossRecord, updateLossRecord,
    dailySupplyReadings, setDailySupplyReadings, addDailyReading, deleteDailyReading, updateDailyReading, importDailyReadings,
    updateCustomer, addCustomer, deleteCustomer, closePeriod, closeDailyPeriod, resetBankInfo
  } = useWaterData();
  
  const [view, setView] = useState<string>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [afterMaKH, setAfterMaKH] = useState<string | undefined>(undefined);
  const [onlyNonZalo, setOnlyNonZalo] = useState(false);
  const [onlyUnpaid, setOnlyUnpaid] = useState(false);
  const [onlyUnrecorded, setOnlyUnrecorded] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const {
    isSyncing,
    syncStatus,
    lastAutoBackup,
    handleSyncCloud,
    handleBackupCloud
  } = useWaterSync({
    config,
    setConfig,
    customers,
    setCustomers,
    groups,
    setGroups,
    lossRecords,
    setLossRecords,
    dailySupplyReadings,
    setDailySupplyReadings,
    showToast
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastScrollId = useRef<string | null>(null);
  const listScrollTop = useRef<Record<string, number>>({ list1: 0, list2: 0 });

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
        if (lastScrollId.current) {
          const el = document.getElementById(`cust-${lastScrollId.current}`);
          if (el && listEl) {
            const elTop = el.offsetTop;
            const containerTop = listEl.offsetTop;
            listEl.scrollTop = Math.max(0, elTop - containerTop - 12);
          }
          lastScrollId.current = null;
        } else if (listEl && savedScroll > 0) {
          listEl.scrollTop = savedScroll;
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
                    (c.address && String(c.address).toLowerCase().includes(s)) ||
                    (c.phoneTenant && String(c.phoneTenant).includes(s)) || 
                    (c.phoneLandlord && String(c.phoneLandlord).includes(s)) ||
                    balanceStr.includes(cleanSearchPrice);
      
      const zaloMatch = onlyNonZalo ? !c.isZalo : true;
      const unpaidMatch = onlyUnpaid ? (c.balance > 0) : true;
      const unrecordedMatch = onlyUnrecorded ? (c.newIndex === 0) : true;
      
      return match && zaloMatch && unpaidMatch && unrecordedMatch;
    }).sort((a, b) => String(a.maKH).localeCompare(String(b.maKH), undefined, { numeric: true, sensitivity: 'base' }));
  }, [customers, activeTab, searchQuery, onlyNonZalo, onlyUnpaid, onlyUnrecorded]);

  const unrecordedCount = useMemo(() => {
    return customers.filter(c => c.listType === activeTab && c.newIndex === 0).length;
  }, [customers, activeTab]);

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
    
    const cleanName = normalizeString(c.name).toUpperCase();

    const bankId = isGroup ? (config.groupBankId || config.bankId) : config.bankId;
    const accountNo = isGroup ? (config.groupAccountNo || config.accountNo) : config.accountNo;
    const accountName = isGroup ? (config.groupAccountName || config.accountName) : config.accountName;
    
    let msg = `${getZaloBillingHeader(c.updatedAt)}
MÃ KH: ${c.maKH}
KH: ${c.name}
SỐ: ${ni} - ${c.oldIndex} = ${vol} m3 x ${config.waterRate.toLocaleString('vi-VN')} = ${amt.toLocaleString('vi-VN')}
NỢ CŨ: ${c.oldDebt.toLocaleString('vi-VN')}\n`;

    if (pi > 0) {
      msg += `ĐÃ THANH TOÁN: -${pi.toLocaleString('vi-VN')}\n`;
    }

    msg += `CÒN LẠI: ${remaining.toLocaleString('vi-VN')}

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

  const handleImportAIScanResults = (results: { id: string; newIndex: number }[]) => {
    setCustomers(prev => prev.map(c => {
      const match = results.find(r => r.id === c.id);
      if (match) {
        const merged = { ...c, newIndex: match.newIndex, updatedAt: Date.now() };
        return calculateRow(merged, config.waterRate);
      }
      return c;
    }));
  };

  const [groupQrData, setGroupQrData] = useState<{bankId: string, accountNo: string, amount: number, name: string} | null>(null);

  const navigateTo = (newView: string, resetSearch: boolean = true) => {
    if (view === 'list') {
      const listEl = document.getElementById('main-list-container');
      if (listEl) {
        listScrollTop.current[activeTab] = listEl.scrollTop;
      }
    }
    if (resetSearch) {
      setSearchQuery('');
      setIsSearchExpanded(false);
    }
    setView(newView);
  };

  return (
    <div className="h-[100dvh] bg-[#f8fafc] max-w-md mx-auto flex flex-col relative overflow-hidden shadow-2xl">
      {toast && <div className="fixed top-28 left-1/2 -translate-x-1/2 z-[250] px-8 py-4 rounded-3xl shadow-[0_20px_50px_rgba(37,99,235,0.4)] bg-blue-600 text-white font-black text-base animate-in zoom-in duration-300 text-center min-w-[280px] border-4 border-white/30 backdrop-blur-sm">{toast}</div>}

      {(view === 'list' || view === 'edit_customer' || view === 'add_customer' || view === 'edit_msg') && (
        <>
          <Header 
            title={activeTab === 'list1' ? 'BỘ 01' : 'BỘ 02'}
            searchQuery={searchQuery} setSearchQuery={setSearchQuery}
            isSearchExpanded={isSearchExpanded} setIsSearchExpanded={setIsSearchExpanded}
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
               showToast(newVal ? "Đang hiện KH CÒN NỢ ĐỌNG" : "Hiện tất cả (Đã thu + Chưa thu)");
            }}
            onlyUnrecorded={onlyUnrecorded} onToggleUnrecordedFilter={() => {
               const newVal = !onlyUnrecorded;
               setOnlyUnrecorded(newVal);
               showToast(newVal ? "Đang hiện hộ CHƯA GHI SỐ" : "Hiện tất cả");
            }}
            lastSyncTime={config.lastSyncTime}
            onShowVerify={() => navigateTo('verify')}
            onShowGroups={() => navigateTo('group_list')}
            onShowScan={() => navigateTo('ai_scan')}
          />
          <ListView 
            customers={filtered} 
            selectedId={selectedId || lastScrollId.current}
            onSelect={(id) => { 
              setSelectedId(id); 
              lastScrollId.current = id;
              navigateTo('detail'); 
            }}
            onCall={(phone) => { window.location.href = `https://zalo.me/${normalizePhoneForZalo(phone)}`; }}
            onCopyMsg={async (c) => { 
              lastScrollId.current = c.id;
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
            onCollectFull={(id) => {
              lastScrollId.current = id;
              handleCollectFull(id);
            }}
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
          onDelete={() => {
            if (deleteCustomer(selectedId!)) {
              showToast("Đã xóa khách hàng!");
              navigateTo('list');
            }
          }}
          onAddAfter={() => { 
            setAfterMaKH(selectedCustomer.maKH); 
            navigateTo('add_customer', false); 
            showToast(`Đang chèn hộ mới sau mã ${selectedCustomer.maKH}`);
          }}
          onSendZalo={handleSendZalo}
          generateMsg={generateMsg}
        />
      )}

      {view === 'ai_scan' && (
        <AIScanView 
          customers={customers}
          activeTab={activeTab}
          onBack={() => navigateTo('list')}
          onImport={handleImportAIScanResults}
        />
      )}

      {view === 'verify' && (
        <VerifyView customers={customers} activeTab={activeTab} onBack={() => navigateTo('list')} onSelect={(id) => { setSelectedId(id); navigateTo('detail'); }} />
      )}

      {view === 'group_list' && (
        <GroupListView 
          groups={groups} customers={customers} config={config}
          onBack={() => navigateTo('list')}
          onSelectGroup={(id) => { setSelectedGroupId(id); navigateTo('group_detail'); }}
          onAddGroup={addGroup} onDeleteGroup={deleteGroup}
          onUpdateGroup={updateGroup}
          onReorderGroups={setGroups}
          onMarkGroupPaid={handleMarkGroupPaid}
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
            updateGroup(activeGroup.id, { isProcessed: true });
            showToast("Đã copy Bill Nhóm & Đánh dấu!");
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
          onBackupHistory={async () => {
            const periodSuffix = getCurrentPeriodSuffix();
            showToast("Đang tạo 2 Tab Lịch sử (Bộ 01 & Bộ 02) lên Google Sheets...");
            const ok = await handleBackupCloud(false, periodSuffix);
            if (ok) {
              alert(`🎉 Đã tạo thành công 2 Tab Lịch sử lên Google Sheets:\n- LichSu_Bộ01_${periodSuffix}\n- LichSu_Bộ02_${periodSuffix}\n\nBạn có thể vào Google Sheets kiểm tra. Khi kiểm tra OK, bạn quay lại bấm '2. CHỐT KỲ & MỞ KỲ MỚI'!`);
            }
          }}
          onClosePeriod={async () => { 
            try {
              const unrecorded = customers.filter(c => c.newIndex === 0);
              if (unrecorded.length > 0) {
                const listNames = unrecorded.slice(0, 5).map(c => `- [Bộ ${c.listType === 'list1' ? '1' : '2'}] ${c.maKH}: ${c.name}`).join('\n');
                const moreSuffix = unrecorded.length > 5 ? `\n... và ${unrecorded.length - 5} hộ khác.` : '';
                const confirmClose = confirm(
                  `⚠️ CẢNH BÁO CHƯA GHI HẾT NƯỚC!\nCó ${unrecorded.length} hộ chưa được ghi số nước kì này:\n${listNames}${moreSuffix}\n\nNếu chốt kì, các hộ này sẽ không có mức tiêu thụ kì này.\n\nBạn vẫn muốn CHỐT KỲ mới?`
                );
                if (!confirmClose) return;
              } else {
                if(!confirm("XÁC NHẬN CHỐT KỲ & MỞ KỲ MỚI (CẢ BỘ 1 VÀ BỘ 2)?\n\n- Chuyển chỉ số mới thành chỉ số cũ, reset chỉ số mới = 0.\n- Tự động tải về 2 file Excel Kỳ Mới (Bộ 1 & Bộ 2).\n- Cập nhật trang tính List1/List2 trên Google Sheets.")) return;
              }
              
              // 1. Thực hiện Chốt kỳ trên App (Chuyển chỉ số mới -> cũ, Reset chỉ số mới = 0)
              const res = closePeriod(); 
              
              // 2. Tự động tải về 2 File Excel Kỳ Mới (Bộ 1 & Bộ 2) cho dữ liệu đã Reset
              showToast("Đang tải 2 file Excel Kỳ Mới...");
              const list1New = res.filter(c => c.listType === 'list1');
              if (list1New.length > 0) {
                await exportToExcel(list1New, 'Ky_Moi_DanhBo_1');
              }
              
              await new Promise(r => setTimeout(r, 500));
              const list2New = res.filter(c => c.listType === 'list2');
              if (list2New.length > 0) {
                await exportToExcel(list2New, 'Ky_Moi_DanhBo_2');
              }

              // 3. Cập nhật dữ liệu Kỳ Mới (đã Reset) lên 2 trang tính làm việc chính (List1 & List2) trên Google Sheets
              showToast("Đang cập nhật trang tính Kỳ Mới lên Google Sheets...");
              const syncNewPeriodSuccess = await handleBackupCloud(true, undefined, res);
              
              if (syncNewPeriodSuccess) {
                showToast("🎉 Đã chốt kỳ, tải 2 file Excel Kỳ Mới & đồng bộ Google Sheets thành công!"); 
              } else {
                alert("⚠️ Dữ liệu trên App và 2 file Excel đã chốt thành công. Có lỗi nhỏ khi đồng bộ Google Sheets, bạn có thể bấm Đồng bộ lại.");
              }
              
              navigateTo('list'); 
            } catch (err: any) {
              console.error("Lỗi khi chốt kỳ:", err);
              alert("⚠️ Có lỗi xảy ra trong quá trình chốt kỳ hoặc tải file Excel mới: " + (err?.message || err));
            }
          }}
          onExport={async (targetListType?: string) => {
            try {
              const target = targetListType || activeTab;
              const targetName = target === 'list1' ? 'Bộ 01' : 'Bộ 02';
              const targetCustomers = customers.filter(c => c.listType === target);
              
              const unrecorded = targetCustomers.filter(c => c.newIndex === 0);
              const isAllNewPeriod = targetCustomers.length > 0 && targetCustomers.every(c => c.newIndex === 0);

              if (unrecorded.length > 0 && !isAllNewPeriod) {
                if (!confirm(`⚠️ [${targetName}] Có ${unrecorded.length} hộ chưa ghi nước. Bạn có chắc chắn muốn xuất báo cáo Excel?`)) return;
              }
              
              const fileNamePrefix = isAllNewPeriod ? 'Ky_Moi' : 'Bao_Cao';
              await exportToExcel(targetCustomers, `${fileNamePrefix}_DanhBo_${target === 'list1' ? '1' : '2'}`);
            } catch (err: any) {
              console.error("Lỗi khi xuất file Excel:", err);
              alert("⚠️ Có lỗi xảy ra khi xuất file Excel báo cáo: " + (err?.message || err));
            }
          }}
          onSelectCustomer={(id) => {
            setSelectedId(id);
            navigateTo('detail');
          }}
        />
      )}

      {view === 'loss_management' && (
        <LossView 
          records={lossRecords}
          customers={customers}
          dailySupplyReadings={dailySupplyReadings}
          config={config}
          onBack={() => navigateTo('list')}
          onAdd={addLossRecord}
          onDelete={deleteLossRecord}
          onUpdate={updateLossRecord}
          onShowDailyTracking={() => navigateTo('loss_daily_record')}
        />
      )}

      {view === 'loss_daily_record' && (
        <LossDailyTracking 
          readings={dailySupplyReadings}
          config={config}
          setConfig={setConfig}
          onBack={() => navigateTo('loss_management')}
          onAdd={addDailyReading}
          onDelete={deleteDailyReading}
          onUpdate={updateDailyReading}
          onClosePeriod={closeDailyPeriod}
          onImport={importDailyReadings}
        />
      )}

      {/* Navigation Tab Bar */}
      {(view === 'list' || view === 'stats' || view === 'loss_management' || view === 'loss_daily_record' || view === 'edit_customer' || view === 'add_customer' || view === 'edit_msg' || view === 'group_list' || view === 'group_detail' || view === 'verify') && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white border-2 border-slate-100 p-1.5 rounded-[2.2rem] flex gap-1 shadow-2xl z-[200] mb-[var(--sab)] min-w-[360px]">
          <button 
            onClick={() => { 
              const listEl = document.getElementById('main-list-container');
              if (listEl && view === 'list') listScrollTop.current[activeTab] = listEl.scrollTop;
              setActiveTab('list1'); 
              setSelectedId(null);
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
            className={`flex-1 px-2 py-3 rounded-[1.8rem] text-[8px] font-black uppercase transition-all ${view === 'loss_management' || view === 'loss_daily_record' ? 'bg-rose-500 text-white shadow-lg shadow-rose-200' : 'text-slate-400'}`}
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
              setSelectedId(null);
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
        updateCustomer={updateCustomer} 
        onDelete={(id) => {
          if (deleteCustomer(id)) {
            showToast("Đã xóa khách hàng!");
            navigateTo('list');
          }
        }}
        config={config} setConfig={setConfig} 
        selectedCustomer={selectedCustomer}
        suggestedMaKH={suggestNextMaKH(customers, activeTab, afterMaKH)}
      />
    </div>
  );
};

export default App;
