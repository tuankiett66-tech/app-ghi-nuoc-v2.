
import { useState, useEffect } from 'react';
import { Customer, SystemConfig, WaterGroup, GroupMember } from '../types';
import { calculateRow } from '../utils';

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
      bankId: 'agribank', 
      accountNo: '8888942444224', 
      accountName: 'TO TUAN KIET',
      globalMessage: 'Quy khach vui long thanh toan truoc ngay 10 hang thang.',
      lastSyncTime: 0
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
  }, [customers, groups, config, activeTab]);

  const updateCustomer = (id: string, updates: Partial<Customer>) => {
    setCustomers(prev => prev.map(c => {
      if (c.id === id) {
        const merged = { ...c, ...updates, updatedAt: Date.now() };
        if (updates.phoneTenant) merged.phone = updates.phoneTenant;
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
        isZalo: false,
        note: '',
        updatedAt: undefined
      }, config.waterRate);
    });

    setCustomers([...otherTabCustomers, ...nextMonthCustomers].sort((a, b) => String(a.maKH || "").localeCompare(String(b.maKH || ""), undefined, { numeric: true, sensitivity: 'base' })));
    return nextMonthCustomers;
  };

  return {
    customers, setCustomers,
    groups, setGroups,
    config, setConfig,
    activeTab, setActiveTab,
    updateCustomer,
    addCustomer,
    addGroup, updateGroup, deleteGroup,
    closePeriod
  };
};
