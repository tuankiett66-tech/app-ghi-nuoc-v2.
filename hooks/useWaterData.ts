
import { useState, useEffect } from 'react';
import { Customer, SystemConfig, WaterGroup, GroupMember, LossRecord, DailySupplyReading } from '../types';
import { calculateRow, normalizeMonthYear } from '../utils';

// Helper functions for automatic period / calendar creation
const getDaysInMonth = (monthKey: string): number => {
  if (!monthKey) return 30;
  const parts = monthKey.split('/');
  if (parts.length === 2) {
    const m = parseInt(parts[0]);
    const y = parseInt(parts[1]);
    if (!isNaN(m) && !isNaN(y)) {
      return new Date(y, m, 0).getDate();
    }
  }
  return 30;
};

const getMonthYearKey = (dateStr: string): string => {
  return normalizeMonthYear(dateStr);
};

export const useWaterData = () => {
  const [customers, setCustomers] = useState<Customer[]>(() => {
    try {
      const saved = localStorage.getItem('water_data_final_v21');
      const data = saved ? JSON.parse(saved) : [];
      return (Array.isArray(data) ? data : []).map((c: any) => {
        const maKH = c.maKH || c.stt || "";
        return { ...c, maKH: String(maKH) };
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
                master1New: parseFloat(r.master1New) || existing.master1New,
                master1Old: parseFloat(r.master1Old) || existing.master1Old,
                master2New: parseFloat(r.master2New) || existing.master2New,
                master2Old: parseFloat(r.master2Old) || existing.master2Old,
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

  // 1. Tự động GHI NHẬN KỲ 5/2026 nếu chưa tồn tại
  useEffect(() => {
    const hasMay2026 = lossRecords.some(r => r.period === "5" || r.month === "05/2026" || r.month.includes("5/2026"));
    if (!hasMay2026) {
      const l1Vol = customers.filter(c => c.listType === 'list1').reduce((sum, c) => sum + (c.volume || 0), 0);
      const l2Vol = customers.filter(c => c.listType === 'list2').reduce((sum, c) => sum + (c.volume || 0), 0);

      const autoMayRecord: LossRecord = {
        id: `loss-may-2026-auto-${Date.now()}`,
        period: "5",
        month: "05/2026",
        master1Old: 47320,
        master1New: 65064, // 47320 + 17744 (Đồng hồ 1 trong ảnh)
        master2Old: 58348,
        master2New: 70885, // 58348 + 12537 (Đồng hồ 2 trong ảnh)
        list1Volume: l1Vol || 20146,
        list2Volume: l2Vol || 10659,
        createdAt: Date.now()
      };
      setLossRecords(prev => {
        const checkAgain = prev.some(r => r.period === "5" || r.month === "05/2026" || r.month.includes("5/2026"));
        if (checkAgain) return prev;
        return [autoMayRecord, ...prev];
      });
    }
  }, [customers, lossRecords]);

  // 2. Tự động tạo kỳ mới khi cập nhật đủ số ngày trong bất kỳ tháng nào
  useEffect(() => {
    if (dailySupplyReadings.length === 0) return;

    // Phân nhóm các ghi chép hằng ngày theo tháng (MM/YYYY)
    const grouped: Record<string, DailySupplyReading[]> = {};
    dailySupplyReadings.forEach(r => {
      const key = getMonthYearKey(r.date);
      if (key) {
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(r);
      }
    });

    let hasChanges = false;
    let newRecords = [...lossRecords];

    Object.entries(grouped).forEach(([monthKey, monthReadings]) => {
      const expectedDays = getDaysInMonth(monthKey);
      
      // Nếu số ngày ghi nhận của tháng đó lớn hơn hoặc bằng số ngày thực tế trong tháng đó
      if (monthReadings.length >= expectedDays) {
        const alreadyExists = newRecords.some(r => r.month === monthKey || r.month.includes(monthKey));
        if (!alreadyExists) {
          const [mStr, yStr] = monthKey.split('/');
          const periodNum = parseInt(mStr).toString();

          const sortedReadings = [...monthReadings].sort((a, b) => a.date.localeCompare(b.date));
          const earliest = sortedReadings[0];

          const m1ConsSum = sortedReadings.reduce((sum, r) => sum + (r.consumption1 || 0), 0);
          const m2ConsSum = sortedReadings.reduce((sum, r) => sum + (r.consumption2 || 0), 0);

          let m1OldVal = config.master1Initial || 0;
          let m2OldVal = config.master2Initial || 0;

          const sortedHistory = [...newRecords].sort((a, b) => {
            const [mA, yA] = a.month.split('/');
            const [mB, yB] = b.month.split('/');
            return `${yA}${mA}`.localeCompare(`${yB}${mB}`);
          });

          const previousRecord = sortedHistory.reverse().find(r => {
            const [rM, rY] = r.month.split('/').map(Number);
            const [currM, currY] = monthKey.split('/').map(Number);
            if (rY < currY) return true;
            if (rY === currY && rM < currM) return true;
            return false;
          });

          if (previousRecord) {
            m1OldVal = previousRecord.master1New;
            m2OldVal = previousRecord.master2New;
          } else if (sortedReadings.length > 0) {
            m1OldVal = earliest.master1 - (earliest.consumption1 || 0);
            m2OldVal = earliest.master2 - (earliest.consumption2 || 0);
          }

          const m1NewVal = m1OldVal + m1ConsSum;
          const m2NewVal = m2OldVal + m2ConsSum;

          const l1Vol = customers.filter(c => c.listType === 'list1').reduce((sum, c) => sum + (c.volume || 0), 0);
          const l2Vol = customers.filter(c => c.listType === 'list2').reduce((sum, c) => sum + (c.volume || 0), 0);

          const autoLossRecord: LossRecord = {
            id: `loss-auto-${monthKey.replace('/', '-')}-${Date.now()}`,
            period: periodNum,
            month: monthKey,
            master1Old: m1OldVal,
            master1New: m1NewVal,
            master2Old: m2OldVal,
            master2New: m2NewVal,
            list1Volume: l1Vol || 18000,
            list2Volume: l2Vol || 11000,
            createdAt: Date.now()
          };

          newRecords = [autoLossRecord, ...newRecords];
          hasChanges = true;

          alert(`🎉 Kỳ hằng ngày tháng ${monthKey} đã ghi đủ số ngày (${monthReadings.length}/${expectedDays} ngày).\nỨng dụng đã tự động tạo Ghi nhận thất thoát mới cho Kỳ ${periodNum} thành công!`);
        }
      }
    });

    if (hasChanges) {
      setLossRecords(newRecords);
    }
  }, [dailySupplyReadings, customers, lossRecords, config.master1Initial, config.master2Initial]);

  // 3. Tự động đồng bộ sản lượng nước tiêu thụ thực tế từ 2 Danh bộ vào Kỳ báo cáo của thất thoát
  useEffect(() => {
    const l1Vol = customers.filter(c => c.listType === 'list1').reduce((sum, c) => sum + (c.volume || 0), 0);
    const l2Vol = customers.filter(c => c.listType === 'list2').reduce((sum, c) => sum + (c.volume || 0), 0);

    setLossRecords(prev => {
      if (prev.length === 0) return prev;

      // Tìm bản ghi thất thoát đang hoạt động (gần nhất hoặc khớp với chu kỳ ngày)
      let activeIndex = 0; // Mặc định là bản ghi mới nhất
      if (dailySupplyReadings.length > 0) {
        const sortedReadings = [...dailySupplyReadings].sort((a, b) => b.date.localeCompare(a.date));
        const latestReading = sortedReadings[0];
        const latestMonthKey = getMonthYearKey(latestReading.date);
        if (latestMonthKey) {
          const idx = prev.findIndex(r => r.month === latestMonthKey || normalizeMonthYear(r.month) === latestMonthKey);
          if (idx !== -1) {
            activeIndex = idx;
          }
        }
      }

      const activeRecord = prev[activeIndex];
      if (activeRecord.list1Volume === l1Vol && activeRecord.list2Volume === l2Vol) {
        return prev; // Giữ nguyên tham chiếu để ngắt vòng lặp re-render
      }

      // Trả về mảng đã cập nhật
      return prev.map((r, i) => i === activeIndex ? { ...r, list1Volume: l1Vol, list2Volume: l2Vol } : r);
    });
  }, [customers, dailySupplyReadings]);

  const updateCustomer = (id: string, updates: Partial<Customer>) => {
    setCustomers(prev => prev.map(c => {
      if (c.id === id) {
        const merged = { ...c, ...updates, updatedAt: Date.now() };
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

    // TỰ ĐỘNG TẠO BẢN GHI THẤT THOÁT MỚI KHI CHỐT KỲ
    const monthKey = getMonthYearKey(latest.date);
    if (monthKey) {
      const alreadyExists = lossRecords.some(r => r.month === monthKey || r.month.includes(monthKey));
      if (!alreadyExists) {
        const [mStr, yStr] = monthKey.split('/');
        const periodNum = parseInt(mStr).toString();
        
        const m1ConsVal = sorted.reduce((sum, r) => sum + (r.consumption1 || 0), 0);
        const m2ConsVal = sorted.reduce((sum, r) => sum + (r.consumption2 || 0), 0);
        
        let m1Old = config.master1Initial || 0;
        let m2Old = config.master2Initial || 0;
        
        // Find latest previous loss record
        const sortedPrevRecords = [...lossRecords].sort((a, b) => {
          const [mA, yA] = a.month.split('/');
          const [mB, yB] = b.month.split('/');
          return `${yA}${mA}`.localeCompare(`${yB}${mB}`);
        });
        
        const previousRecord = sortedPrevRecords.reverse().find(r => {
          const [rM, rY] = r.month.split('/').map(Number);
          const [currM, currY] = monthKey.split('/').map(Number);
          if (rY < currY) return true;
          if (rY === currY && rM < currM) return true;
          return false;
        });
        
        if (previousRecord) {
          m1Old = previousRecord.master1New;
          m2Old = previousRecord.master2New;
        } else if (sorted.length > 0) {
          m1Old = sorted[0].master1 - (sorted[0].consumption1 || 0);
          m2Old = sorted[0].master2 - (sorted[0].consumption2 || 0);
        }
        
        const m1New = m1Old + m1ConsVal;
        const m2New = m2Old + m2ConsVal;
        
        const list1Volume = customers.filter(c => c.listType === 'list1').reduce((sum, c) => sum + (c.volume || 0), 0);
        const list2Volume = customers.filter(c => c.listType === 'list2').reduce((sum, c) => sum + (c.volume || 0), 0);
        
        const newLossRecord: LossRecord = {
          id: `loss-auto-close-${monthKey.replace('/', '-')}-${Date.now()}`,
          period: periodNum,
          month: monthKey,
          master1Old: m1Old,
          master1New: m1New,
          master2Old: m2Old,
          master2New: m2New,
          list1Volume: list1Volume || 18000,
          list2Volume: list2Volume || 11000,
          createdAt: Date.now()
        };
        
        setLossRecords(prev => [newLossRecord, ...prev]);
        alert(`🎉 Chốt kỳ thành công!\nHệ thống tự động biên soạn và tạo Bản ghi thất thoát mới cho Kỳ ${periodNum} thành công!`);
      }
    }
    
    setConfig(prev => ({
      ...prev,
      master1Initial: latest.master1,
      master2Initial: latest.master2,
      masterInitialDate: latest.date
    }));
    
    setDailySupplyReadings([]);
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
    addDailyReading, deleteDailyReading, updateDailyReading,
    resetBankInfo
  };
};
