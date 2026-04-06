
import { Customer, GroupMember } from './types';

// Helper to load XLSX dynamically
const getXLSX = async () => {
  // @ts-ignore
  return await import('xlsx');
};

// Ham xu ly so tu Excel mot cach an toan (Xoa moi dau phay, dau cham phan cach hang ngan)
export const parseSafe = (val: any): number => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  // Loai bo tat ca ky tu khong phai so hoac dau cham/phay de xu ly chuoi
  const clean = String(val).replace(/[.,\s]/g, '').replace(/[^0-9-]/g, '');
  return parseInt(clean) || 0;
};

export const calculateRow = (cust: any, rate: number) => {
  const ni = parseSafe(cust.newIndex);
  const oi = parseSafe(cust.oldIndex);
  const od = parseSafe(cust.oldDebt);
  const paid = parseSafe(cust.paid);
  const maKH = String(cust.maKH || "");
  const phone = String(cust.phone || cust.phoneTenant || "");
  
  // Ensure rate is a valid number
  const validRate = (typeof rate === 'number' && !isNaN(rate)) ? rate : 18000;
  
  const vol = (ni > 0 && ni >= oi) ? (ni - oi) : 0;
  const amt = vol * validRate;
  const bal = (amt + od) - paid;
  
  return {
    ...cust,
    maKH,
    phone,
    phoneTenant: cust.phoneTenant || phone,
    newIndex: ni, oldIndex: oi, oldDebt: od, paid: paid,
    volume: vol, amount: amt, balance: bal,
    status: (bal <= 0 && (ni > 0 || od > 0)) ? 'paid' : 'unpaid'
  };
};

export const formatCurrency = (value: number) => {
  if (value === undefined || value === null) return "0 đ";
  return Math.round(value).toLocaleString('vi-VN') + ' đ';
};

export const copyToClipboard = async (text: string) => {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    }
  } catch (err) {
    return false;
  }
};

export const normalizeString = (val: any): string => {
  const str = String(val || "");
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9 ]/g, "").trim();
};

export const normalizePhoneForZalo = (phone: any): string => {
  let p = String(phone || "").replace(/[^0-9]/g, '');
  if (p.startsWith('0')) {
    p = '84' + p.substring(1);
  }
  return p;
};

export const generateVietQrUrl = (bankId: string, accountNo: string, amount: number, customerName: string) => {
  const amountVnd = Math.max(0, Math.round(amount));
  const cleanName = normalizeString(customerName).toUpperCase();
  const addInfo = `TT Nuoc ${cleanName}`.substring(0, 25);
  return `https://img.vietqr.io/image/${bankId}-${accountNo}-compact.png?amount=${amountVnd}&addInfo=${encodeURIComponent(addInfo)}`;
};

export const exportToExcel = async (customers: Customer[], fileName: string = 'Bao_Cao') => {
  const XLSX = await getXLSX();
  const header = ["Mã KH", "KHÁCH HÀNG", "ĐỊA CHỈ", "ĐIỆN THOẠI", "CHỈ SỐ MỚI", "CHỈ SỐ CŨ", "M3", "THÀNH TIỀN", "NỢ CŨ", "THANH TOÁN", "NỢ LẠI"];
  const data = customers
    .sort((a, b) => String(a.maKH).localeCompare(String(b.maKH), undefined, { numeric: true, sensitivity: 'base' }))
    .map(c => [
      c.maKH, c.name, c.address, c.phone, c.newIndex || "", c.oldIndex, c.volume || "", Math.round(c.amount) || "", Math.round(c.oldDebt), Math.round(c.paid) || "", Math.round(c.balance) || ""
    ]);
  
  const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
  
  // Force specific columns to be text type to prevent Excel auto-formatting (like dates for addresses)
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  for (let R = range.s.r + 1; R <= range.e.r; ++R) {
    // Mã KH (Col 0), Địa chỉ (Col 2), Điện thoại (Col 3)
    [0, 2, 3].forEach(C => {
      const cellRef = XLSX.utils.encode_cell({r: R, c: C});
      if (ws[cellRef]) {
        ws[cellRef].t = 's'; // Force string type
        ws[cellRef].z = '@'; // Force text format
      }
    });
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data");
  XLSX.writeFile(wb, `${fileName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

export const parseExcelFile = async (file: File, listType: 'list1' | 'list2', rate: number): Promise<Customer[]> => {
  const XLSX = await getXLSX();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const ws = workbook.Sheets[workbook.SheetNames[0]];
        // Use raw: false to get formatted strings (prevents Excel date serial numbers for addresses)
        const json: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: false });
        
        let headerRowIndex = -1;
        let colMap: Record<string, number> = {
          maKH: 0, name: 1, address: 2, phone: 3, newIndex: 4, oldIndex: 5, oldDebt: 8, paid: 9, zalo: 11
        };

        // Tim hang tieu de va tu dong mapping cot theo ten
        for (let r = 0; r < 20; r++) {
          const row = json[r];
          if (row && row.some(cell => {
            const t = String(cell || "").toUpperCase();
            return t.includes("STT") || t.includes("MÃ KH");
          })) {
            headerRowIndex = r;
            row.forEach((cell, idx) => {
              const text = String(cell || "").toUpperCase();
              if (text.includes("STT") || text.includes("MÃ KH")) colMap.maKH = idx;
              else if (text.includes("KHÁCH") || text.includes("TÊN")) colMap.name = idx;
              else if (text.includes("ĐỊA CHỈ")) colMap.address = idx;
              else if (text.includes("THOẠI") || text.includes("ĐT")) colMap.phone = idx;
              else if (text.includes("MỚI")) colMap.newIndex = idx;
              else if (text.includes("NỢ CŨ") || text.includes("NỢ KỲ")) colMap.oldDebt = idx;
              else if (text.includes("CŨ") && !text.includes("NỢ")) colMap.oldIndex = idx;
              else if (text.includes("THANH TOÁN") || text.includes("ĐÃ TRẢ") || text.includes("THU")) colMap.paid = idx;
              else if (text.includes("ZALO")) colMap.zalo = idx;
            });
            break;
          }
        }

        const start = headerRowIndex !== -1 ? headerRowIndex + 1 : 4;
        const res: Customer[] = [];
        for (let i = start; i < json.length; i++) {
          const row = json[i];
          if (!row) continue;
          
          const maKH = String(row[colMap.maKH] || "").trim();
          
          // Neu Mã KH khong hop le thi bo qua
          if (!maKH || maKH === "0") continue;
          
          const phone = String(row[colMap.phone] || "").trim();
          
          res.push(calculateRow({
            id: `xl-${maKH}-${listType}`,
            maKH: maKH,
            name: String(row[colMap.name] || ""),
            address: String(row[colMap.address] || ""),
            phone: phone,
            phoneTenant: phone,
            newIndex: parseSafe(row[colMap.newIndex]),
            oldIndex: parseSafe(row[colMap.oldIndex]),
            oldDebt: parseSafe(row[colMap.oldDebt]),
            paid: parseSafe(row[colMap.paid]),
            listType,
            isZalo: String(row[colMap.zalo] || "").toUpperCase() === "X"
          }, rate));
        }
        resolve(res);
      } catch (err) { reject(err); }
    };
    reader.readAsArrayBuffer(file);
  });
};

export const parseGroupExcelFile = async (file: File): Promise<GroupMember[]> => {
  const XLSX = await getXLSX();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const ws = workbook.Sheets[workbook.SheetNames[0]];
        // Use raw: false to get formatted strings
        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: false });
        
        const members: GroupMember[] = [];
        let currentDB: 'list1' | 'list2' = 'list1';
        let startRow = 0;

        for (let r = 0; r < 20; r++) {
            const cellVal = String(rows[r] && rows[r][0] || "").toUpperCase();
            if (cellVal.includes("STT") || cellVal.includes("MÃ KH")) {
                startRow = r + 1;
                break;
            }
        }
        if (startRow === 0) startRow = 4;

        for (let i = startRow; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length < 1) continue;

          const colA = String(row[0] || "").trim();
          const colL = String(row[11] || "").trim().toUpperCase();

          if (colL.includes("DB1")) currentDB = 'list1';
          else if (colL.includes("DB2")) currentDB = 'list2';

          const maKH = colA;
          if (maKH && maKH !== "0" && !maKH.toUpperCase().includes("CỘNG")) {
            members.push({ maKH, source: currentDB });
          }
        }
        resolve(members);
      } catch (err) { reject(err); }
    };
    reader.readAsArrayBuffer(file);
  });
};

export const getMeterStatus = (installDate?: string) => {
  if (!installDate) return { monthsLeft: 60, status: 'unknown' as const };
  
  const [year, month] = installDate.split('-').map(Number);
  const install = new Date(year, month - 1);
  const now = new Date();
  
  const diffMonths = (now.getFullYear() - install.getFullYear()) * 12 + (now.getMonth() - install.getMonth());
  const monthsLeft = 60 - diffMonths;
  
  let status: 'ok' | 'warning' | 'danger' | 'unknown' = 'ok';
  if (monthsLeft <= 0) status = 'danger';
  else if (monthsLeft <= 6) status = 'warning';
  
  return { monthsLeft, status };
};

export const suggestNextMaKH = (customers: Customer[], listType: 'list1' | 'list2', afterMaKH?: string) => {
  const list = customers
    .filter(c => c.listType === listType)
    .sort((a, b) => String(a.maKH).localeCompare(String(b.maKH), undefined, { numeric: true, sensitivity: 'base' }));
  
  if (!afterMaKH) {
    if (list.length === 0) return listType === 'list1' ? '1001' : '2001';
    
    // Find absolute max numeric part
    let maxNum = listType === 'list1' ? 1000 : 2000;
    list.forEach(c => {
      if (c.maKH) {
        const m = String(c.maKH).match(/^(\d+)/);
        if (m) {
          const n = parseInt(m[1]);
          if (n > maxNum) maxNum = n;
        }
      }
    });
    return (maxNum + 1).toString();
  }

  // Suggesting after a specific Mã KH (insertion logic)
  const baseMatch = String(afterMaKH).match(/^(\d+)([A-Z]*)$/);
  if (!baseMatch) return afterMaKH + 'A';
  
  const baseNum = baseMatch[1];
  const existingWithBase = list
    .filter(c => c.maKH.startsWith(baseNum))
    .map(c => c.maKH.substring(baseNum.length))
    .filter(s => /^[A-Z]*$/.test(s));
  
  if (existingWithBase.length === 0 || (existingWithBase.length === 1 && existingWithBase[0] === "")) {
    return baseNum + 'A';
  }
  
  existingWithBase.sort();
  const lastSuffix = existingWithBase[existingWithBase.length - 1];
  if (lastSuffix === "") return baseNum + 'A';
  
  const lastCharCode = lastSuffix.charCodeAt(lastSuffix.length - 1);
  const nextChar = String.fromCharCode(lastCharCode + 1);
  return baseNum + nextChar;
};
