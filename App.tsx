
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useWaterData } from './hooks/useWaterData';
import { Header } from './components/Header';
import { ListView } from './components/ListView';
import { DetailView } from './components/DetailView';
import { ConfigView } from './components/ConfigView';
import { StatsView } from './components/StatsView';
import { Modals } from './components/Modals';
import { GroupListView } from './components/GroupListView';
import { GroupDetailView } from './components/GroupDetailView';
import { VerifyView } from './components/VerifyView';
import { normalizePhoneForZalo, copyToClipboard, generateVietQrUrl, formatCurrency, exportToExcel, parseExcelFile, calculateRow } from './utils';
import { Customer } from './types';

const App: React.FC = () => {
  const { customers, setCustomers, groups, addGroup, updateGroup, deleteGroup, config, setConfig, activeTab, setActiveTab, updateCustomer, addCustomer, closePeriod } = useWaterData();
  
  const [view, setView] = useState<string>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [onlyNonZalo, setOnlyNonZalo] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastScrollId = useRef<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const selectedCustomer = useMemo(() => customers.find(c => c.id === selectedId), [customers, selectedId]);
  const activeGroup = useMemo(() => groups.find(g => g.id === selectedGroupId), [groups, selectedGroupId]);

  useEffect(() => {
    if (view === 'list' && lastScrollId.current) {
      setTimeout(() => {
        const el = document.getElementById(`cust-${lastScrollId.current}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          lastScrollId.current = null;
        }
      }, 100);
    }
  }, [view]);

  const filtered = useMemo(() => {
    const s = searchQuery.toLowerCase().trim();
    return customers.filter(c => {
      if (c.listType !== activeTab) return false;
      const cleanSearchPrice = s.replace(/\./g, '').replace(/,/g, '');
      const balanceStr = Math.round(c.balance).toString();
      
      const match = c.name.toLowerCase().includes(s) || 
                    c.stt.toString() === s || 
                    (c.phoneTenant && c.phoneTenant.includes(s)) || 
                    (c.phoneLandlord && c.phoneLandlord.includes(s)) ||
                    balanceStr.includes(cleanSearchPrice);
      
      return match && (onlyNonZalo ? !c.isZalo : true);
    }).sort((a, b) => a.stt - b.stt);
  }, [customers, activeTab, searchQuery, onlyNonZalo]);

  const generateMsg = (c: Customer, niStr: string, piStr: string) => {
    const ni = parseInt(niStr) || 0;
    const vol = (ni > 0 && ni >= c.oldIndex) ? (ni - c.oldIndex) : 0;
    const amt = vol * config.waterRate;
    const total = amt + c.oldDebt;
    const now = new Date();
    return `KỲ NƯỚC THÁNG ${now.getMonth() + 1}/${now.getFullYear()}\nKH: ${c.name}\nSỐ: ${ni} - ${c.oldIndex} = ${vol}m3 x ${config.waterRate.toLocaleString('vi-VN')} = ${amt.toLocaleString('vi-VN')}\nNỢ CŨ: ${c.oldDebt.toLocaleString('vi-VN')}\nCỘNG: ${total.toLocaleString('vi-VN')}\n---\n${config.globalMessage}`;
  };

  const handleSyncCloud = async () => {
    const url = activeTab === 'list1' ? config.sheetUrl1?.trim() : config.sheetUrl2?.trim();
    if (!url) return showToast("Chưa có Link Script!");
    setIsSyncing(true);
    try {
      const res = await fetch(`${url}${url.includes('?') ? '&' : '?'}list=${activeTab}&t=${Date.now()}`);
      const json = await res.json();
      const mapped = json.map((item: any) => calculateRow({
        id: `cust-${item.stt}-${activeTab}`,
        stt: parseInt(item.stt), name: item.name || `(STT ${item.stt})`,
        address: item.address || "", phoneTenant: item.phoneTenant || item.phone || "",
        phoneLandlord: item.phoneLandlord || "",
        newIndex: parseFloat(item.newIndex) || 0, oldIndex: parseFloat(item.oldIndex) || 0,
        oldDebt: parseFloat(item.oldDebt) || 0, paid: parseFloat(item.paid) || 0,
        listType: activeTab, isZalo: !!item.isZalo, note: item.note || ''
      }, config.waterRate));
      setCustomers(prev => [...prev.filter(c => c.listType !== activeTab), ...mapped]);
      showToast("Đồng bộ thành công!");
    } catch (e) { showToast("Lỗi kết nối Cloud!"); }
    finally { setIsSyncing(false); }
  };

  const handleSendZalo = async () => {
    if (!selectedCustomer) return;
    const msg = generateMsg(selectedCustomer, selectedCustomer.newIndex.toString(), selectedCustomer.paid.toString());
    await copyToClipboard(msg);
    updateCustomer(selectedCustomer.id, { isZalo: true });
    showToast("Đã copy & Mở Zalo...");
    setTimeout(() => {
      const sdt = normalizePhoneForZalo(selectedCustomer.phoneTenant || selectedCustomer.phone);
      window.location.href = `https://zalo.me/${sdt}`;
    }, 300);
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
            onShowAdd={() => setView('add_customer')}
            onShowConfig={() => setView('config')}
            onShowMsgTemplate={() => setView('edit_msg')}
            onlyNonZalo={onlyNonZalo} onToggleZaloFilter={() => setOnlyNonZalo(!onlyNonZalo)}
            onShowVerify={() => setView('verify')}
            onShowGroups={() => setView('group_list')}
          />
          <ListView 
            customers={filtered} 
            onSelect={(id) => { setSelectedId(id); setView('detail'); }}
            onCall={(phone) => { window.location.href = `https://zalo.me/${normalizePhoneForZalo(phone)}`; }}
            onCopyMsg={async (c) => { await copyToClipboard(generateMsg(c, c.newIndex.toString(), c.paid.toString())); showToast("Đã copy hóa đơn!"); }}
          />
        </>
      )}

      {view === 'detail' && selectedCustomer && (
        <DetailView 
          customer={selectedCustomer} config={config}
          onBack={() => { lastScrollId.current = selectedId; setView('list'); }}
          onNavigate={(dir) => {
            const idx = filtered.findIndex(c => c.id === selectedId);
            const target = dir === 'next' ? idx + 1 : idx - 1;
            if (target >= 0 && target < filtered.length) setSelectedId(filtered[target].id);
          }}
          onUpdate={(upd) => updateCustomer(selectedId!, upd)}
          onShowQr={() => setShowQr(true)}
          onEditInfo={() => setView('edit_customer')}
          onSendZalo={handleSendZalo}
          generateMsg={generateMsg}
        />
      )}

      {view === 'verify' && (
        <VerifyView customers={customers} activeTab={activeTab} onBack={() => setView('list')} onSelect={(id) => { setSelectedId(id); setView('detail'); }} />
      )}

      {view === 'group_list' && (
        <GroupListView 
          groups={groups} customers={customers}
          onBack={() => setView('list')}
          onSelectGroup={(id) => { setSelectedGroupId(id); setView('group_detail'); }}
          onAddGroup={addGroup} onDeleteGroup={deleteGroup}
        />
      )}

      {view === 'group_detail' && activeGroup && (
        <GroupDetailView 
          group={activeGroup} customers={customers} config={config}
          onBack={() => setView('group_list')}
          onUpdateGroup={updateGroup}
          onSendZalo={async (msg, sdt) => {
            await copyToClipboard(msg);
            showToast("Đã copy Bill Nhóm!");
            if(sdt) setTimeout(() => { window.location.href = `https://zalo.me/${normalizePhoneForZalo(sdt)}`; }, 300);
          }}
        />
      )}

      {view === 'config' && (
        <ConfigView 
          config={config} setConfig={setConfig}
          onBack={() => setView('list')}
          onImport={() => fileInputRef.current?.click()}
          onExport={() => exportToExcel(customers.filter(c => c.listType === activeTab), `Backup_${activeTab}`)}
          onClear={() => { if(confirm("Xóa sạch dữ liệu?")) { localStorage.clear(); window.location.reload(); } }}
        />
      )}

      {view === 'stats' && (
        <StatsView 
          customers={customers} activeTab={activeTab}
          onBack={() => setView('list')}
          onClosePeriod={() => { if(!confirm("Chốt kỳ?")) return; const res = closePeriod(); exportToExcel(res, 'Ky_Moi'); showToast("Đã chốt kỳ!"); setView('list'); }}
          onExport={() => exportToExcel(customers.filter(c => c.listType === activeTab), 'Bao_Cao')}
        />
      )}

      {/* Navigation Tab Bar - FIXED STRUCTURE */}
      {(view === 'list' || view === 'stats' || view === 'edit_customer' || view === 'add_customer' || view === 'edit_msg' || view === 'group_list' || view === 'group_detail' || view === 'verify') && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white border-2 border-slate-100 p-1.5 rounded-[2.2rem] flex gap-1 shadow-2xl z-[200] mb-[var(--sab)] min-w-[340px]">
          <button 
            onClick={() => { setActiveTab('list1'); setView('list'); setSearchQuery(''); }} 
            className={`flex-1 px-3 py-3 rounded-[1.8rem] text-[9px] font-black uppercase transition-all ${activeTab === 'list1' && view === 'list' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-400'}`}
          >
            BỘ 01
          </button>
          <button 
            onClick={() => { setView('group_list'); setSearchQuery(''); }} 
            className={`flex-1 px-3 py-3 rounded-[1.8rem] text-[9px] font-black uppercase transition-all ${view.startsWith('group') ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-400'}`}
          >
            NHÓM
          </button>
          <button 
            onClick={() => { setView('stats'); setSearchQuery(''); }} 
            className={`flex-1 px-3 py-3 rounded-[1.8rem] text-[9px] font-black uppercase transition-all ${view === 'stats' ? 'bg-amber-500 text-white shadow-lg shadow-amber-200' : 'text-slate-400'}`}
          >
            BÁO CÁO
          </button>
          <button 
            onClick={() => { setActiveTab('list2'); setView('list'); setSearchQuery(''); }} 
            className={`flex-1 px-3 py-3 rounded-[1.8rem] text-[9px] font-black uppercase transition-all ${activeTab === 'list2' && view === 'list' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-400'}`}
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
          showToast("Đã nhập dữ liệu Excel!");
          e.target.value = '';
        }
      }} />

      <Modals 
        view={view} setView={setView} addCustomer={addCustomer} 
        updateCustomer={updateCustomer} config={config} setConfig={setConfig} 
        selectedCustomer={selectedCustomer}
      />
    </div>
  );
};

export default App;
