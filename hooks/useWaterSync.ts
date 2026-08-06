import { useState } from 'react';
import { Customer, SystemConfig, WaterGroup, LossRecord, DailySupplyReading } from '../types';
import { parseStringOrDateToNumber, normalizeDate, normalizeMonthYear, parseSafeBool, safeJsonStringify, calculateRow } from '../utils';

interface UseWaterSyncProps {
  config: SystemConfig;
  setConfig: React.Dispatch<React.SetStateAction<SystemConfig>>;
  customers: Customer[];
  setCustomers: (val: Customer[] | ((prev: Customer[]) => Customer[])) => void;
  groups: WaterGroup[];
  setGroups: React.Dispatch<React.SetStateAction<WaterGroup[]>>;
  lossRecords: LossRecord[];
  setLossRecords: React.Dispatch<React.SetStateAction<LossRecord[]>>;
  dailySupplyReadings: DailySupplyReading[];
  setDailySupplyReadings: React.Dispatch<React.SetStateAction<DailySupplyReading[]>>;
  showToast: (msg: string) => void;
}

export const useWaterSync = ({
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
}: UseWaterSyncProps) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [lastAutoBackup, setLastAutoBackup] = useState<number>(0);

  const handleSyncCloud = async (silent = false) => {
    console.log("handleSyncCloud called, silent:", silent);
    const url = config.sheetUrl?.trim();
    if (!url) {
      if (!silent) showToast("Chưa có Link Script!");
      return;
    }
    if (!silent) setIsSyncing(true);
    try {
      const res = await fetch(`${url}${url.includes('?') ? '&' : '?'}action=get_all&t=${Date.now()}`);
      const result = await res.json();
      
      let extraData: any = {};
      if (result.config) {
        let fullExtraSyncData = result.config.extra_sync_data || "";
        
        // Nếu không có extra_sync_data nguyên vẹn, hãy tìm kiếm các chunk để ghép lại
        if (!fullExtraSyncData) {
          const chunks: { index: number; val: string }[] = [];
          Object.keys(result.config).forEach(key => {
            if (key.startsWith('extra_sync_chunk_')) {
              const idx = parseInt(key.replace('extra_sync_chunk_', ''));
              if (!isNaN(idx)) {
                chunks.push({ index: idx, val: String(result.config[key] || "") });
              }
            }
          });
          if (chunks.length > 0) {
            chunks.sort((a, b) => a.index - b.index);
            fullExtraSyncData = chunks.map(c => c.val).join('');
          }
        }

        if (fullExtraSyncData) {
          try {
            extraData = JSON.parse(fullExtraSyncData);
          } catch (e) {
            console.error("Error parsing extra sync data", e);
          }
        }

        // Lọc sạch config để loại bỏ các chunk rác khỏi state của React
        const cleanConfig: Record<string, any> = {};
        Object.keys(result.config).forEach(key => {
          if (!key.startsWith('extra_sync_chunk_')) {
            cleanConfig[key] = result.config[key];
          }
        });

        setConfig(prev => ({ 
          ...prev, 
          ...cleanConfig, 
          master1Initial: parseStringOrDateToNumber(cleanConfig.master1Initial) || 0,
          master2Initial: parseStringOrDateToNumber(cleanConfig.master2Initial) || 0,
          masterInitialDate: normalizeDate(cleanConfig.masterInitialDate),
          lastSyncTime: Date.now() 
        }));

        const rawLoss = result.lossRecords || extraData.lossRecords;
        if (Array.isArray(rawLoss)) {
          const seenMonths = new Set<string>();
          const sanitizedLoss: LossRecord[] = [];
          
          rawLoss.forEach((r: any, idx: number) => {
            const rawMonth = r.month || '';
            const normalizedMonth = normalizeMonthYear(rawMonth);
            
            if (normalizedMonth && seenMonths.has(normalizedMonth)) {
              const existingIdx = sanitizedLoss.findIndex(item => item.month === normalizedMonth);
              if (existingIdx !== -1) {
                const existing = sanitizedLoss[existingIdx];
                const cleanNewVol = (parseFloat(r.list1Volume) || 0) + (parseFloat(r.list2Volume) || 0);
                const cleanOldVol = existing.list1Volume + existing.list2Volume;
                if (cleanNewVol > cleanOldVol) {
                  sanitizedLoss[existingIdx] = {
                    ...existing,
                    list1Volume: parseFloat(r.list1Volume) || 0,
                    list2Volume: parseFloat(r.list2Volume) || 0,
                    master1New: parseStringOrDateToNumber(r.master1New) || existing.master1New,
                    master1Old: parseStringOrDateToNumber(r.master1Old) || existing.master1Old,
                    master2New: parseStringOrDateToNumber(r.master2New) || existing.master2New,
                    master2Old: parseStringOrDateToNumber(r.master2Old) || existing.master2Old,
                  };
                }
              }
              return;
            }
            
            if (normalizedMonth) {
              seenMonths.add(normalizedMonth);
            }
            
            sanitizedLoss.push({
              ...r,
              id: r.id || `loss-sync-${Date.now()}-${idx}`,
              createdAt: parseFloat(r.createdAt) || Date.now(),
              month: normalizedMonth || rawMonth,
              master1New: parseStringOrDateToNumber(r.master1New) || 0,
              master1Old: parseStringOrDateToNumber(r.master1Old) || 0,
              master2New: parseStringOrDateToNumber(r.master2New) || 0,
              master2Old: parseStringOrDateToNumber(r.master2Old) || 0,
              list1Volume: parseFloat(r.list1Volume) || 0,
              list2Volume: parseFloat(r.list2Volume) || 0
            });
          });
          
          setLossRecords(sanitizedLoss);
        }

        const rawDaily = result.dailySupplyReadings || extraData.dailySupplyReadings;
        if (Array.isArray(rawDaily)) {
          const sanitizedDaily = rawDaily.map((r: any, idx: number) => ({
            ...r,
            id: r.id || `supply-sync-${Date.now()}-${idx}`,
            updatedAt: parseFloat(r.updatedAt) || Date.now(),
            master1: parseStringOrDateToNumber(r.master1) || 0,
            master2: parseStringOrDateToNumber(r.master2) || 0,
            consumption1: parseFloat(r.consumption1) || 0,
            consumption2: parseFloat(r.consumption2) || 0,
            date: normalizeDate(r.date),
            time: r.time || ''
          })).sort((a: any, b: any) => {
            const dateTimeA = `${a.date} ${a.time || '00:00'}`;
            const dateTimeB = `${b.date} ${b.time || '00:00'}`;
            return dateTimeB.localeCompare(dateTimeA);
          });
          setDailySupplyReadings(sanitizedDaily);
        }

        const rawGroups = result.groups || extraData.groups;
        if (Array.isArray(rawGroups)) {
          const sanitizedGroups = rawGroups.map((g: any) => ({
            ...g,
            members: (g.members || []).map((m: any) => ({
              ...m,
              maKH: String(m.maKH || "").replace(/^'/, "")
            }))
          }));

          setGroups(prev => {
            const merged = [...sanitizedGroups];
            prev.forEach(localGroup => {
              const exists = sanitizedGroups.some(cloudGroup => 
                cloudGroup.id === localGroup.id || 
                cloudGroup.name.toUpperCase() === localGroup.name.toUpperCase()
              );
              if (!exists) {
                merged.push(localGroup);
              }
            });
            return merged;
          });
        }
      }

      let allCustomers: Customer[] = [];
      
      if (Array.isArray(result.list1) && result.list1.length > 0) {
        const mapped1 = result.list1.map((item: any, idx: number) => {
          const maKH = String(item.maKH || "").replace(/^'/, "");
          const rawPhone = String(item.phoneTenant || "").replace(/^'/, "");
          const phoneWithZero = (rawPhone && /^[1-9]\d{8,9}$/.test(rawPhone)) ? '0' + rawPhone : rawPhone;
          
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
            isZalo: parseSafeBool(item.isZalo), 
            isZaloFriend: parseSafeBool(item.isZaloFriend),
            isProcessed: parseSafeBool(item.isProcessed),
            isSubMeter: item.isSubMeter !== undefined ? parseSafeBool(item.isSubMeter) : (Array.isArray(extraData.subMeters) && extraData.subMeters.includes(`list1:${maKH}`)),
            recordDate: item.recordDate || (Array.isArray(extraData.recordDates) ? (extraData.recordDates.find((x: any) => x.key === `list1:${maKH}`)?.date || "") : ""),
            installDate: item.installDate || "",
            note: String(item.note || "").replace(/^'/, ""),
            updatedAt: parseFloat(item.updatedAt) || extraData.updatedAtMap?.[maKH] || 0
          }, result.config?.waterRate || config.waterRate);
        });
        allCustomers = [...allCustomers, ...mapped1];
      } else {
        allCustomers = [...allCustomers, ...customers.filter(c => c.listType === 'list1')];
      }

      if (Array.isArray(result.list2) && result.list2.length > 0) {
        const mapped2 = result.list2.map((item: any, idx: number) => {
          const maKH = String(item.maKH || "").replace(/^'/, "");
          const rawPhone = String(item.phoneTenant || "").replace(/^'/, "");
          const phoneWithZero = (rawPhone && /^[1-9]\d{8,9}$/.test(rawPhone)) ? '0' + rawPhone : rawPhone;
          
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
            isZalo: parseSafeBool(item.isZalo), 
            isZaloFriend: parseSafeBool(item.isZaloFriend),
            isProcessed: parseSafeBool(item.isProcessed),
            isSubMeter: item.isSubMeter !== undefined ? parseSafeBool(item.isSubMeter) : (Array.isArray(extraData.subMeters) && extraData.subMeters.includes(`list2:${maKH}`)),
            recordDate: item.recordDate || (Array.isArray(extraData.recordDates) ? (extraData.recordDates.find((x: any) => x.key === `list2:${maKH}`)?.date || "") : ""),
            installDate: item.installDate || "",
            note: String(item.note || "").replace(/^'/, ""),
            updatedAt: parseFloat(item.updatedAt) || extraData.updatedAtMap?.[maKH] || 0
          }, result.config?.waterRate || config.waterRate);
        });
        allCustomers = [...allCustomers, ...mapped2];
      } else {
        allCustomers = [...allCustomers, ...customers.filter(c => c.listType === 'list2')];
      }

      setCustomers(allCustomers);
      if (!silent) showToast("Đã tải dữ liệu từ Cloud về máy!");
    } catch (e) { 
      console.log("Cloud Sync Error:", e);
      if (!silent) alert("Lỗi tải dữ liệu: " + e);
    } finally { 
      if (!silent) setIsSyncing(false); 
    }
  };

  const handleBackupCloud = async (silent = false, archiveSuffix?: string, customCustomers?: Customer[]): Promise<boolean> => {
    const url = config.sheetUrl?.trim();
    if (!url) {
      if (!silent) showToast("Chưa có Link Script!");
      return false;
    }

    if (!url.toLowerCase().includes('/exec')) {
      if (!silent) alert("Link Script sai định dạng /exec");
      return false;
    }
    
    const sourceCustomers = customCustomers || customers;

    const sortedCustomers = [...sourceCustomers].sort((a, b) => 
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
      isProcessed: !!c.isProcessed,
      isSubMeter: !!c.isSubMeter,
      recordDate: c.recordDate || "",
      installDate: c.installDate || "",
      note: "'" + (c.note || ""),
      updatedAt: c.updatedAt || 0
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
      isProcessed: !!c.isProcessed,
      isSubMeter: !!c.isSubMeter,
      recordDate: c.recordDate || "",
      installDate: c.installDate || "",
      note: "'" + (c.note || ""),
      updatedAt: c.updatedAt || 0
    }));

    if (!silent) setIsSyncing(true);
    setSyncStatus('syncing');

    try {
      const response = await fetch(`${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`, {
        method: 'POST',
        mode: 'cors',
        redirect: 'follow',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: (() => {
          const extraSyncDataStr = safeJsonStringify({
            groups,
            lossRecords: [...lossRecords]
              .sort((a, b) => b.createdAt - a.createdAt)
              .slice(0, 24),
            dailySupplyReadings: [...dailySupplyReadings]
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 90),
            subMeters: customers.filter(c => c.isSubMeter).map(c => `${c.listType}:${c.maKH}`),
            recordDates: customers.filter(c => c.recordDate).map(c => ({ key: `${c.listType}:${c.maKH}`, date: c.recordDate }))
          });

          const configToBackup: Record<string, any> = {
            waterRate: config.waterRate,
            bankId: config.bankId,
            accountNo: config.accountNo,
            accountName: config.accountName,
            groupBankId: config.groupBankId || "",
            groupAccountNo: config.groupAccountNo || "",
            groupAccountName: config.groupAccountName || "",
            globalMessage: config.globalMessage,
            master1Initial: config.master1Initial || 0,
            master2Initial: config.master2Initial || 0,
            masterInitialDate: config.masterInitialDate || ""
          };

          // Chia nhỏ extraSyncDataStr thành các phần nhỏ (mỗi phần tối đa 40,000 ký tự)
          // để tránh lỗi giới hạn 50,000 ký tự của một ô đơn trên Google Sheets
          const CHUNK_SIZE = 40000;
          if (extraSyncDataStr.length <= CHUNK_SIZE) {
            configToBackup.extra_sync_data = extraSyncDataStr;
          } else {
            configToBackup.extra_sync_data = ""; // Làm rỗng ô chính
            const chunkCount = Math.ceil(extraSyncDataStr.length / CHUNK_SIZE);
            for (let i = 0; i < chunkCount; i++) {
              const start = i * CHUNK_SIZE;
              const end = start + CHUNK_SIZE;
              configToBackup[`extra_sync_chunk_${i + 1}`] = extraSyncDataStr.slice(start, end);
            }
          }

          return safeJsonStringify({
            action: 'update_all',
            archive_suffix: archiveSuffix || "",
            config: configToBackup,
            list1: data1,
            list2: data2,
            groups: groups,
            lossRecords: lossRecords,
            dailySupplyReadings: dailySupplyReadings
          });
        })()
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.status === 'success') {
        setSyncStatus('synced');
        setConfig(prev => ({ ...prev, lastSyncTime: Date.now() }));
        setLastAutoBackup(Date.now());
        if (!silent) {
          showToast(archiveSuffix ? `Đã tự động lưu trữ lịch sử ${archiveSuffix} lên Google Sheets!` : "Đã tải dữ liệu từ máy lên Cloud!");
        }
        setTimeout(() => setSyncStatus('idle'), 5000);
        return true;
      } else {
        throw new Error(result.message || "Lỗi không xác định từ server");
      }
    } catch (e) {
      console.error("Backup error:", e);
      setSyncStatus('error');
      if (!silent) alert("Lỗi sao lưu: " + (e instanceof Error ? e.message : String(e)));
      return false;
    } finally {
      if (!silent) setIsSyncing(false);
    }
  };

  return {
    isSyncing,
    syncStatus,
    lastAutoBackup,
    handleSyncCloud,
    handleBackupCloud
  };
};
