
import { useState, useEffect } from 'react';
import { Customer, SystemConfig, WaterGroup, GroupMember, LossRecord, DailySupplyReading } from '../types';
import { calculateRow, normalizeMonthYear, parseStringOrDateToNumber } from '../utils';

export const useWaterData = () => {
  const [customers, setCustomers] = useState<Customer[]>(() => {
    try {
      const saved = localStorage.getItem('water_data_final_v21');
      const data = saved ? JSON.parse(saved) : [];
      const loaded = (Array.isArray(data) ? data : []).map((c: any) => {
        const maKH = c.maKH || c.stt || "";
        return { ...c, maKH: String(maKH) };
      });
      // Filter out any "TỔNG CỘNG" row that accidentally got imported as a customer
      return loaded.filter((c: any) => {
        const cleanMaKH = String(c.maKH || "").replace(/[\u200B\s]/g, "").toUpperCase();
        const cleanName = String(c.name || "").replace(/[\u200B\s]/g, "").toUpperCase();
        const isSumRow = cleanMaKH.includes("TỔNG") || cleanMaKH.includes("CỘNG") || cleanMaKH.includes("TONG") || cleanMaKH.includes("CONG") ||
                         cleanName.includes("TỔNG CỘNG") || cleanName.includes("TONG CONG") || cleanName === "TỔNG" || cleanName === "CỘNG";
        return !isSumRow;
      });
    } catch (e) {
      console.error("Error loading customers:", e);
      return [];
    }
  });

  const [lossRecords, setLossRecords] = useState<LossRecord[]>(() => {
    try {
      const saved = localStorage.getItem('water_loss_records_v21');
      const data = saved ? JSON.parse(saved) : [];
      if (!Array.isArray(data)) return [];

      const seenMonths = new Set<string>();
      const sanitizedLoss: LossRecord[] = [];

      data.forEach((r: any) => {
        const normalizedMonth = normalizeMonthYear(r.month);
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
        if (normalizedMonth) seenMonths.add(normalizedMonth);
        sanitizedLoss.push({
          ...r,
          month: normalizedMonth || r.month
        });
      });
      return sanitizedLoss;
    } catch (e) {
      console.error("Error loading loss records:", e);
      return [];
    }
  });

  const [dailySupplyReadings, setDailySupplyReadings] = useState<DailySupplyReading[]>(() => {
    try {
      const saved = localStorage.getItem('water_daily_supply_v21');
      const data = saved ? JSON.parse(saved) : [];
      return (Array.isArray(data) ? data : []).sort((a, b) => b.date.localeCompare(a.date));
    } catch (e) {
      console.error("Error loading daily supply readings:", e);
      return [];
    }
  });

  const [groups, setGroups] = useState<WaterGroup[]>(() => {
    try {
      const saved = localStorage.getItem('water_groups_v21');
      const data = saved ? JSON.parse(saved) : [];
      return (Array.isArray(data) ? data : []).map((g: any) => ({
        ...g,
        members: (g.members || []).map((m: any) => {
          const maKH = m.maKH || m.stt || "";
          return { ...m, maKH: String(maKH) };
        })
      }));
    } catch (e) {
      console.error("Error loading groups:", e);
      return [];
    }
  });

  const [config, setConfig] = useState<SystemConfig>(() => {
    const defaults: SystemConfig = { 
      waterRate: 18000, 
      sheetUrl: '', 
      bankId: 'vcb', 
      accountNo: '1066386342', 
      accountName: 'HKD TRAN NGOC TONG (CS CAP NUOC SINH HOA)',
      groupBankId: 'agribank',
      groupAccountNo: '8888942444224',
      groupAccountName: 'TO TUAN KIET',
      globalMessage: 'Quy khach vui long thanh toan truoc ngay 10 hang thang.',
      lastSyncTime: 0,
      master1Initial: 0,
      master2Initial: 0
    };
    try {
      const saved = localStorage.getItem('water_config_v21');
      const parsed = saved ? JSON.parse(saved) : {};
      
      // Chuyển đổi từ cấu trúc cũ sang mới nếu cần
      if (parsed.sheetUrl1 && !parsed.sheetUrl) {
        parsed.sheetUrl = parsed.sheetUrl1;
      }
      if (parsed.lastSyncTime1 && !parsed.lastSyncTime) {
        parsed.lastSyncTime = parsed.lastSyncTime1;
      }

      const merged = { ...defaults, ...parsed };
      // Ensure waterRate is a valid number
      if (typeof merged.waterRate !== 'number' || isNaN(merged.waterRate)) {
        merged.waterRate = defaults.waterRate;
      }
      return merged;
    } catch (e) {
      console.error("Error loading config:", e);
      return defaults;
    }
  });

  const [activeTab, setActiveTab] = useState<'list1' | 'list2'>(() => {
    return (localStorage.getItem('water_active_tab') as any) || 'list1';
  });

  useEffect(() => {
    localStorage.setItem('water_data_final_v21', JSON.stringify(customers));
    localStorage.setItem('water_groups_v21', JSON.stringify(groups));
    localStorage.setItem('water_config_v21', JSON.stringify(config));
    localStorage.setItem('water_active_tab', activeTab);
    localStorage.setItem('water_loss_records_v21', JSON.stringify(lossRecords));
    localStorage.setItem('water_daily_supply_v21', JSON.stringify(dailySupplyReadings));
  }, [customers, groups, config, activeTab, lossRecords, dailySupplyReadings]);

  useEffect(() => {
    recalculateDailyConsumption(dailySupplyReadings);
  }, [config.master1Initial, config.master2Initial, config.masterInitialDate]);

  // Đã loại bỏ hoàn toàn các chức năng tự động nhận diện / tạo kỳ mới của Thất thoát
  // Người dùng điều khiển ghi nhận thủ công hoàn toàn qua biểu mẫu của ứng dụng


  const updateCustomer = (id: string, updates: Partial<Customer>) => {
    setCustomers(prev => prev.map(c => {
      if (c.id === id) {
        // Chỉ cập nhật updatedAt khi thực sự có thay đổi về chỉ số hoặc số tiền nước/nợ
        const isCoreDataChanged = 
          (updates.newIndex !== undefined && updates.newIndex !== c.newIndex) ||
          (updates.oldIndex !== undefined && updates.oldIndex !== c.oldIndex) ||
          (updates.oldDebt !== undefined && updates.oldDebt !== c.oldDebt) ||
          (updates.paid !== undefined && updates.paid !== c.paid);

        const merged = { 
          ...c, 
          ...updates, 
          updatedAt: isCoreDataChanged ? Date.now() : (c.updatedAt || 0) 
        };
        if (updates.phoneTenant !== undefined) merged.phone = updates.phoneTenant;
        return calculateRow(merged, config.waterRate);
      }
      return c;
    }));
  };

  const addCustomer = (newFormData: any) => {
    const newCust = calculateRow({
      id: `cust-${Date.now()}`,
      ...newFormData,
      phone: newFormData.phoneTenant || '',
      listType: activeTab,
      newIndex: newFormData.newIndex || 0,
      paid: newFormData.paid || 0,
      updatedAt: Date.now()
    }, config.waterRate);

    setCustomers(prev => {
      return [...prev, newCust].sort((a, b) => String(a.maKH || "").localeCompare(String(b.maKH || ""), undefined, { numeric: true, sensitivity: 'base' }));
    });
  };

  // Logic Quan ly Nhom
  const addGroup = (name: string, members: GroupMember[] = []) => {
    const newGroup: WaterGroup = { id: `group-${Date.now()}`, name, masterSdt: '', members };
    setGroups(prev => [...prev, newGroup]);
    return newGroup;
  };

  const updateGroup = (groupId: string, updates: Partial<WaterGroup>) => {
    setGroups(prev => prev.map(g => g.id === groupId ? { ...g, ...updates } : g));
  };

  const deleteGroup = (groupId: string) => {
    if (confirm("Ban co chac muon xoa nhom nay?")) {
        setGroups(prev => prev.filter(g => g.id !== groupId));
    }
  };

  const closePeriod = () => {
    const currentTabCustomers = customers.filter(c => c.listType === activeTab);
    const otherTabCustomers = customers.filter(c => c.listType !== activeTab);
    
    const nextMonthCustomers = currentTabCustomers.map(c => {
      const nextOldIndex = c.newIndex > 0 ? c.newIndex : c.oldIndex;
      return calculateRow({
        ...c,
        oldIndex: nextOldIndex,
        oldDebt: c.balance,
        newIndex: 0,
        paid: 0,
        isZalo: c.isZalo,
        isZaloFriend: c.isZaloFriend,
        note: '',
        updatedAt: undefined
      }, config.waterRate);
    });

    setCustomers([...otherTabCustomers, ...nextMonthCustomers].sort((a, b) => String(a.maKH || "").localeCompare(String(b.maKH || ""), undefined, { numeric: true, sensitivity: 'base' })));
    return nextMonthCustomers;
  };

  const addLossRecord = (record: Omit<LossRecord, 'id' | 'createdAt'>) => {
    const newRecord: LossRecord = {
      ...record,
      id: `loss-${Date.now()}`,
      createdAt: Date.now()
    };
    setLossRecords(prev => [newRecord, ...prev]);
  };

  const deleteLossRecord = (id: string) => {
    if (confirm("Ban co chac muon xoa ban ghi nay?")) {
      setLossRecords(prev => prev.filter(r => r.id !== id));
    }
  };

  const updateLossRecord = (id: string, updates: Partial<LossRecord>) => {
    setLossRecords(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const addDailyReading = (reading: Omit<DailySupplyReading, 'id' | 'updatedAt' | 'consumption1' | 'consumption2'>) => {
    // Sort logic to find the previous day's reading
    const sorted = [...dailySupplyReadings].sort((a, b) => a.date.localeCompare(b.date));
    const previous = sorted.reverse().find(r => r.date < reading.date);
    
    const newRecord: DailySupplyReading = {
      ...reading,
      id: `supply-${Date.now()}`,
      updatedAt: Date.now(),
      consumption1: previous ? Math.max(0, reading.master1 - previous.master1) : Math.max(0, reading.master1 - (config.master1Initial || 0)),
      consumption2: previous ? Math.max(0, reading.master2 - previous.master2) : Math.max(0, reading.master2 - (config.master2Initial || 0)),
    };
    
    setDailySupplyReadings(prev => [newRecord, ...prev].sort((a, b) => b.date.localeCompare(a.date)));
    
    // Recalculate following readings if date is in middle
    recalculateDailyConsumption([newRecord, ...dailySupplyReadings]);
  };

  const deleteDailyReading = (id: string) => {
    if (confirm("Xóa bản ghi này?")) {
      const updated = dailySupplyReadings.filter(r => r.id !== id);
      setDailySupplyReadings(updated);
      recalculateDailyConsumption(updated);
    }
  };

  const updateDailyReading = (id: string, updates: Partial<DailySupplyReading>) => {
    const updated = dailySupplyReadings.map(r => r.id === id ? { ...r, ...updates } : r);
    setDailySupplyReadings(updated);
    recalculateDailyConsumption(updated);
  };

  const importDailyReadings = (imported: Omit<DailySupplyReading, 'id' | 'updatedAt' | 'consumption1' | 'consumption2'>[]) => {
    const existingMap = new Map<string, DailySupplyReading>();
    dailySupplyReadings.forEach(r => {
      existingMap.set(`${r.date} ${r.time || '00:00'}`, r);
    });

    imported.forEach(imp => {
      const key = `${imp.date} ${imp.time || '00:00'}`;
      const existing = existingMap.get(key);
      if (existing) {
        existingMap.set(key, {
          ...existing,
          master1: imp.master1,
          master2: imp.master2,
          notes: imp.notes || existing.notes,
          updatedAt: Date.now()
        });
      } else {
        const newRec: DailySupplyReading = {
          ...imp,
          id: `supply-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          updatedAt: Date.now()
        };
        existingMap.set(key, newRec);
      }
    });

    const mergedList = Array.from(existingMap.values());
    recalculateDailyConsumption(mergedList);
  };

  const recalculateDailyConsumption = (allReadings: DailySupplyReading[]) => {
    const sorted = [...allReadings].map(r => ({ ...r, date: r.date.split('T')[0] })).sort((a, b) => {
      const dateTimeA = `${a.date} ${a.time || '00:00'}`;
      const dateTimeB = `${b.date} ${b.time || '00:00'}`;
      return dateTimeA.localeCompare(dateTimeB);
    });

    const updated = sorted.map((r, i) => {
      const prev = sorted[i - 1];
      return {
        ...r,
        consumption1: prev ? Math.max(0, r.master1 - prev.master1) : Math.max(0, r.master1 - (config.master1Initial || 0)),
        consumption2: prev ? Math.max(0, r.master2 - prev.master2) : Math.max(0, r.master2 - (config.master2Initial || 0))
      };
    });
    setDailySupplyReadings(updated.sort((a, b) => {
      const dateTimeA = `${a.date} ${a.time || '00:00'}`;
      const dateTimeB = `${b.date} ${b.time || '00:00'}`;
      return dateTimeB.localeCompare(dateTimeA);
    }));
  };

  const closeDailyPeriod = () => {
    if (dailySupplyReadings.length === 0) {
      alert("Chưa có ghi chép hằng ngày nào để chốt.");
      return false;
    }
    
    // Tìm phần tử có ngày lớn nhất (mới nhất) để làm số chốt ban đầu cho kỳ mới
    const sorted = [...dailySupplyReadings].sort((a, b) => {
      const dateTimeA = `${a.date} ${a.time || '00:00'}`;
      const dateTimeB = `${b.date} ${b.time || '00:00'}`;
      return dateTimeA.localeCompare(dateTimeB);
    });
    
    const latest = sorted[sorted.length - 1];

    setConfig(prev => ({
      ...prev,
      master1Initial: latest.master1,
      master2Initial: latest.master2,
      masterInitialDate: latest.date
    }));
    
    setDailySupplyReadings([]);
    alert("🎉 Chốt kỳ thành công! Chỉ số chốt cuối kỳ hằng ngày đã được lưu làm chỉ số ban đầu cho kỳ tiếp theo.");
    return true;
  };

  const resetBankInfo = () => {
    const defaults = { 
      bankId: 'vcb', 
      accountNo: '1066386342', 
      accountName: 'HKD TRAN NGOC TONG (CS CAP NUOC SINH HOA)',
      groupBankId: 'agribank',
      groupAccountNo: '8888942444224',
      groupAccountName: 'TO TUAN KIET'
    };
    setConfig(prev => ({ ...prev, ...defaults }));
    alert("Đã cài lại thông tin Ngân hàng mặc định!");
  };

  const deleteCustomer = (id: string) => {
    const cust = customers.find(c => c.id === id);
    if (!cust) return;
    
    if (confirm(`Bạn có chắc muốn xóa khách hàng "${cust.name}"? Thao tác này không thể hoàn tác và các mã số sau ${cust.maKH} sẽ được đôn lên.`)) {
      const deletedMaKH = parseInt(cust.maKH);
      const listType = cust.listType;

      setCustomers(prev => {
        // 1. Remove the customer
        const filtered = prev.filter(c => c.id !== id);
        
        // 2. Shift others if MaKH is numeric
        if (!isNaN(deletedMaKH)) {
          return filtered.map(c => {
            const currentMaKH = parseInt(c.maKH);
            if (c.listType === listType && !isNaN(currentMaKH) && currentMaKH > deletedMaKH) {
              return { ...c, maKH: (currentMaKH - 1).toString() };
            }
            return c;
          });
        }
        return filtered;
      });

      // 3. Update Groups: Remove deleted and Shift MaKH of others
      setGroups(prev => prev.map(g => {
        // Remove deleted member
        let filteredMembers = g.members.filter(m => !(m.maKH === cust.maKH && m.source === listType));
        
        // Shift MaKH for group members as well to stay in sync
        if (!isNaN(deletedMaKH)) {
          filteredMembers = filteredMembers.map(m => {
            const mMaKH = parseInt(m.maKH);
            if (m.source === listType && !isNaN(mMaKH) && mMaKH > deletedMaKH) {
              return { ...m, maKH: (mMaKH - 1).toString() };
            }
            return m;
          });
        }

        return { ...g, members: filteredMembers };
      }));

      return true;
    }
    return false;
  };

  return {
    customers, setCustomers,
    groups, setGroups,
    config, setConfig,
    activeTab, setActiveTab,
    lossRecords, setLossRecords,
    dailySupplyReadings, setDailySupplyReadings,
    updateCustomer,
    addCustomer,
    deleteCustomer,
    addGroup, updateGroup, deleteGroup,
    closePeriod,
    closeDailyPeriod,
    addLossRecord, deleteLossRecord, updateLossRecord,
    addDailyReading, deleteDailyReading, updateDailyReading, importDailyReadings,
    resetBankInfo
  };
};
