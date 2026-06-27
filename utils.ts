
import { Customer, GroupMember, DailySupplyReading, LossRecord } from './types';

// Helper to load XLSX dynamically
const getXLSX = async () => {
  // @ts-ignore
  return await import('xlsx-js-style');
};

export const parseStringOrDateToNumber = (val: any): number => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const str = String(val).trim();
  if (!str) return 0;

  // 1. If it's a simple integer/decimal, parse directly
  if (/^\d+$/.test(str)) {
    return parseInt(str, 10);
  }
  if (/^\d+\.\d+$/.test(str)) {
    return parseFloat(str);
  }

  // 2. Parse date-like patterns
  let dateObj: Date | null = null;
  
  // ISO date strings or date string with timezone/UTC stamp
  if (str.includes('T') && (str.includes('Z') || str.includes('+') || /[-+]\d{2}:\d{2}$/.test(str))) {
    const parsed = new Date(str);
    if (parsed && !isNaN(parsed.getTime())) {
      dateObj = parsed;
    }
  }

  // Standard Vietnamese DD/MM/YYYY format
  const dmyMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    // Use local Date constructor
    dateObj = new Date(year, month, day);
  }

  // Month/Year format (e.g. "11/2079", "3/3136")
  const myMatch = str.match(/^(\d{1,2})\/(\d{4})$/);
  if (myMatch) {
    const month = parseInt(myMatch[1], 10) - 1;
    const year = parseInt(myMatch[2], 10);
    // Usually Google Sheets treats MM/YYYY cell formats as 1st of that month
    dateObj = new Date(year, month, 1);
  }

  if (dateObj && !isNaN(dateObj.getTime())) {
    // Base Excel date (Dec 30, 1899)
    const baseDate = new Date(1899, 11, 30);
    const diffMs = dateObj.getTime() - baseDate.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays > 0) {
      return diffDays;
    }
  }

  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
};

// Ham xu ly so tu Excel mot cach an toan (Xoa moi dau phay, dau cham phan cach hang ngan)
export const parseSafe = (val: any): number => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const str = String(val).trim();
  if (!str) return 0;

  // Intercept Excel Date Auto-Formatting bug (like "11/2079", "3/3136" or ISO timestamps)
  if (str.includes('/') && /^\d{1,2}\/\d{2,4}/.test(str)) {
    const recovered = parseStringOrDateToNumber(str);
    if (recovered > 0) return recovered;
  }
  if (str.includes('T') && (str.includes('Z') || str.includes('+'))) {
    const recovered = parseStringOrDateToNumber(str);
    if (recovered > 0) return recovered;
  }

  // Loai bo tat ca ky tu khong phai so hoac dau cham/phay de xu ly chuoi
  const clean = str.replace(/[.,\s]/g, '').replace(/[^0-9-]/g, '');
  return parseInt(clean) || 0;
};

export const calculateRow = (cust: any, rate: number) => {
  const ni = parseSafe(cust.newIndex);
  const oi = parseSafe(cust.oldIndex);
  const od = parseSafe(cust.oldDebt);
  const paid = parseSafe(cust.paid);
  const maKH = String(cust.maKH || "");
  const phone = String(cust.phone || "");
  const phoneTenant = String(cust.phoneTenant || "");
  
  // Ensure rate is a valid number
  const validRate = (typeof rate === 'number' && !isNaN(rate)) ? rate : 18000;
  
  const vol = (ni > 0 && ni >= oi) ? (ni - oi) : 0;
  const amt = vol * validRate;
  const bal = (amt + od) - paid;
  
  return {
    ...cust,
    maKH,
    phone,
    phoneTenant,
    newIndex: ni, oldIndex: oi, oldDebt: od, paid: paid,
    volume: vol, amount: amt, balance: bal,
    status: (bal <= 0 && (ni > 0 || od > 0)) ? 'paid' : 'unpaid'
  };
};

export const normalizeDate = (dateStr: any): string => {
  if (!dateStr) {
    const now = new Date();
    return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
  }
  const str = String(dateStr).trim();
  
  // Nếu là chuỗi chính xác YYYY-MM-DD (độ dài 10), trả về luôn
  // Tránh parse Date vì có thể bị lệch múi giờ nếu máy khách có cấu hình lạ
  if (/^\d{4}-\d{2}-\d{2}$/.test(str) && str.length === 10) return str;
  
  // Đối sánh thủ công định dạng ngày tháng của VN (DD/MM/YYYY hoặc DD/MM/YY) để tránh parse sai trên các môi trường máy khách khác nhau
  const dmYMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (dmYMatch) {
    const day = dmYMatch[1].padStart(2, '0');
    const month = dmYMatch[2].padStart(2, '0');
    let year = dmYMatch[3];
    if (year.length === 2) {
      year = "20" + year;
    }
    return `${year}-${month}-${day}`;
  }

  // Đối sánh định dạng chỉ có ngày/tháng (DD/MM), tự động gán năm hiện tại (ví dụ: "01/05" -> "2026-05-01")
  const dmMatch = str.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (dmMatch) {
    const day = dmMatch[1].padStart(2, '0');
    const month = dmMatch[2].padStart(2, '0');
    const year = new Date().getFullYear();
    return `${year}-${month}-${day}`;
  }

  // Nếu là chuỗi ISO (có chữ T) hoặc các định dạng khác
  // Phải parse bằng new Date() và lấy ngày theo giờ ĐỊA PHƯƠNG (Local Time)
  // để bù đắp các chuỗi UTC từ Google Sheets/Excel (ví dụ: 2026-04-29T17:00:00Z là sáng ngày 30/04)
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  return str;
};

export const normalizeTime = (timeStr: any): string => {
  if (!timeStr) return '--:--';
  const str = String(timeStr);
  
  // Nếu là chuỗi ISO hoặc có T
  if (str.includes('T')) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const h = String(d.getHours()).padStart(2, '0');
      const m = String(d.getMinutes()).padStart(2, '0');
      return `${h}:${m}`;
    }
  }
  
  // Nếu đã có dạng HH:mm
  const timeMatch = str.match(/(\d{1,2}):(\d{2})/);
  if (timeMatch) {
    return `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
  }
  
  return str;
};

export const formatDateDisplay = (dateStr: any): string => {
  const norm = normalizeDate(dateStr);
  const parts = norm.split('-');
  if (parts.length >= 3) {
    return `${parts[2]}/${parts[1]}`;
  }
  return norm;
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

export const getBillingMonthYear = () => {
  const d = new Date();
  let year = d.getFullYear();
  let month = d.getMonth() + 1; // 1 to 12
  
  if (d.getDate() >= 25) {
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  
  const m = month.toString().padStart(2, '0');
  return `${m}/${year}`;
};

export const getZaloBillingHeader = () => {
  const d = new Date();
  let year = d.getFullYear();
  let month = d.getMonth() + 1; // 1 to 12
  
  if (d.getDate() >= 25) {
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  
  let ky = month - 1;
  if (ky === 0) {
    ky = 12;
  }
  
  return `Tiền nước Kỳ ${ky}_Ghi ngày 1/${month}/${year}`;
};

export const normalizeMonthYear = (monthStr: string): string => {
  if (!monthStr) return '';
  // Convert standard date string / ISO timestamp to local YYYY-MM-DD
  const rawStr = String(monthStr).trim();
  if (/^\d{2}\/\d{4}$/.test(rawStr)) {
    return rawStr;
  }
  if (/^\d{1,2}\/\d{4}$/.test(rawStr)) {
    const [m, y] = rawStr.split('/');
    return `${m.padStart(2, '0')}/${y}`;
  }
  const normDate = normalizeDate(rawStr); // handles timezone to local YYYY-MM-DD
  const parts = normDate.split('-');
  if (parts.length === 3) {
    return `${parts[1]}/${parts[0]}`; // MM/YYYY
  }
  return rawStr;
};

export const generateVietQrUrl = (bankId: string, accountNo: string, amount: number, customerName: string) => {
  const amountVnd = Math.max(0, Math.round(amount));
  const cleanName = normalizeString(customerName).toUpperCase();
  const addInfo = `TT Nuoc ${cleanName}`.substring(0, 25);
  return `https://img.vietqr.io/image/${bankId}-${accountNo}-compact.png?amount=${amountVnd}&addInfo=${encodeURIComponent(addInfo)}`;
};

export const exportToExcel = async (customers: Customer[], fileName: string = 'Bao_Cao') => {
  const XLSX = await getXLSX();
  const header = ["Mã KH", "KHÁCH HÀNG", "ĐỊA CHỈ", "ĐIỆN THOẠI", "CHỈ SỐ MỚI", "CHỈ SỐ CŨ", "M3", "THÀNH TIỀN", "NỢ CŨ", "THANH TOÁN", "NỢ LẠI", "LẮP ĐẶT"];
  
  const sorted = [...customers].sort((a, b) => String(a.maKH).localeCompare(String(b.maKH), undefined, { numeric: true, sensitivity: 'base' }));
  
  const isKyMoi = fileName.startsWith('Ky_Moi');
  
  const data = sorted.map(c => {
    // Hiển thị tất cả các số điện thoại hiện có, phân cách bởi dấu gạch chéo
    const phones = [c.phone, c.phoneTenant, c.phoneLandlord]
      .filter(p => p && String(p).trim() !== "")
      .filter((v, i, a) => a.indexOf(v) === i); // Lấy giá trị duy nhất
    const dp = phones.join(" / ");

    // Sử dụng Zero-width space (\u200B) để ngăn Excel tự động định dạng ngày tháng mà không làm lộ dấu nháy đơn
    const safeMaKH = c.maKH ? `\u200B${c.maKH}` : "";
    const safeAddress = c.address ? `\u200B${c.address}` : "";
    const safePhone = dp ? `\u200B${dp}` : "";

    return [
      { v: safeMaKH, t: 's' },
      c.name, 
      { v: safeAddress, t: 's' }, 
      { v: safePhone, t: 's' }, 
      c.newIndex || "", 
      c.oldIndex || 0, 
      c.volume || "", 
      Math.round(c.amount) || "", 
      Math.round(c.oldDebt) || 0, 
      Math.round(c.paid) || "", 
      isKyMoi ? "" : (Math.round(c.balance) || ""),
      c.installDate || ""
    ];
  });

  // Add summary row
  const totalVolume = sorted.reduce((sum, c) => sum + (c.volume || 0), 0);
  const totalAmount = sorted.reduce((sum, c) => sum + (c.amount || 0), 0);
  const totalOldDebt = sorted.reduce((sum, c) => sum + (c.oldDebt || 0), 0);
  const totalPaid = sorted.reduce((sum, c) => sum + (c.paid || 0), 0);
  const totalBalance = sorted.reduce((sum, c) => sum + (c.balance || 0), 0);

  data.push([
    "TỔNG CỘNG", "", "", "", "", "", totalVolume, Math.round(totalAmount), Math.round(totalOldDebt), Math.round(totalPaid), isKyMoi ? "" : Math.round(totalBalance)
  ]);
  
  const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
  
  // Force specific columns to be text type and add styling
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  for (let R = range.s.r + 1; R <= range.e.r; ++R) {
    // Check if it's the summary row (last row)
    const isSummaryRow = R === range.e.r;

    if (isSummaryRow) {
      // Bold the entire summary row
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellRef = XLSX.utils.encode_cell({r: R, c: C});
        if (ws[cellRef]) {
          ws[cellRef].s = { font: { bold: true }, fill: { fgColor: { rgb: "F1F5F9" } } };
        }
      }
      continue;
    }

    const customer = sorted[R - 1];
    const isZalo = !!(customer.isZalo || customer.isZaloFriend);
    
    // Style the "KHÁCH HÀNG" column (Col 1)
    const nameCellRef = XLSX.utils.encode_cell({r: R, c: 1});
    if (ws[nameCellRef] && isZalo) {
      ws[nameCellRef].s = {
        font: { bold: true }
      };
    }

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

export const exportDailyToExcel = async (readings: DailySupplyReading[], fileName: string = 'Theo_Doi_Hang_Ngay') => {
  const XLSX = await getXLSX();
  const header = ["NGÀY", "GIỜ", "CHỈ SỐ ĐH1", "TIÊU THỤ ĐH1 (m3)", "CHỈ SỐ ĐH2", "TIÊU THỤ ĐH2 (m3)", "TỔNG TIÊU THỤ (m3)", "GHI CHÚ"];
  
  // Sort by date (descending like in the UI)
  const sorted = [...readings].sort((a, b) => b.date.localeCompare(a.date) || (b.time || "").localeCompare(a.time || ""));

  const data = sorted.map(r => {
    const parts = r.date.split('-');
    const dateFormatted = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : r.date;
    return [
      dateFormatted,
      normalizeTime(r.time),
      r.master1 || 0,
      r.consumption1 || 0,
      r.master2 || 0,
      r.consumption2 || 0,
      (r.consumption1 || 0) + (r.consumption2 || 0),
      r.notes || ""
    ];
  });

  const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
  
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Dữ liệu");
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
          maKH: 0, name: 1, address: 2, phone: 3, newIndex: 4, oldIndex: 5, oldDebt: 8, paid: 9, zalo: 11, installDate: -1
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
              else if (text.includes("LẮP ĐẶT") || text.includes("INSTALL")) colMap.installDate = idx;
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

          const nameVal = String(row[colMap.name] || "").trim();
          const cleanMaKH = maKH.replace(/[\u200B\s]/g, "").toUpperCase();
          const cleanName = nameVal.replace(/[\u200B\s]/g, "").toUpperCase();

          // Bỏ qua các hàng TỔNG CỘNG hoặc có chứa từ khóa Tổng cộng
          if (cleanMaKH.includes("TỔNG") || cleanMaKH.includes("CỘNG") || cleanMaKH.includes("TONG") || cleanMaKH.includes("CONG") ||
              cleanName.includes("TỔNG CỘNG") || cleanName.includes("TONG CONG") || cleanName === "TỔNG" || cleanName === "CỘNG") {
            continue;
          }
          
          const phone = String(row[colMap.phone] || "").trim();
          
          res.push(calculateRow({
            id: `xl-${maKH}-${listType}`,
            maKH: maKH,
            name: nameVal,
            address: String(row[colMap.address] || ""),
            phone: phone,
            phoneTenant: phone,
            newIndex: parseSafe(row[colMap.newIndex]),
            oldIndex: parseSafe(row[colMap.oldIndex]),
            oldDebt: parseSafe(row[colMap.oldDebt]),
            paid: parseSafe(row[colMap.paid]),
            listType,
            isZalo: String(row[colMap.zalo] || "").toUpperCase() === "X",
            installDate: colMap.installDate !== -1 ? String(row[colMap.installDate] || "").trim() : ""
          }, rate));
        }
        resolve(res);
      } catch (err) { reject(err); }
    };
    reader.readAsArrayBuffer(file);
  });
};

export const parseDailySupplyExcelFile = async (file: File): Promise<Omit<DailySupplyReading, 'id' | 'updatedAt' | 'consumption1' | 'consumption2'>[]> => {
  const XLSX = await getXLSX();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const ws = workbook.Sheets[workbook.SheetNames[0]];
        const json: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: false });
        
        let headerRowIndex = -1;
        let colMap = {
          date: -1,
          time: -1,
          master1: -1,
          master2: -1,
          notes: -1
        };

        // Tim hang tieu de va tu dong mapping cot theo ten
        for (let r = 0; r < Math.min(20, json.length); r++) {
          const row = json[r];
          if (row && row.some(cell => {
            const t = String(cell || "").toUpperCase();
            return t.includes("NGÀY") || t.includes("CHỈ SỐ") || t.includes("ĐỒNG HỒ");
          })) {
            headerRowIndex = r;
            row.forEach((cell, idx) => {
              const text = String(cell || "").trim().toUpperCase();
              if (text === "NGÀY" || text === "DATE" || text.includes("NGÀY / GIỜ") || text.includes("NGÀY/GIỜ")) {
                colMap.date = idx;
              } else if (text === "GIỜ" || text === "TIME") {
                colMap.time = idx;
              } else if (text.includes("CHỈ SỐ ĐH1") || text.includes("ĐH1") || text.includes("M1") || text.includes("ĐỒNG HỒ 1") || text.includes("SỐ 1") || (text.includes("CHỈ SỐ") && (text.includes("1") || text.includes("I")))) {
                if (colMap.master1 === -1) colMap.master1 = idx;
              } else if (text.includes("CHỈ SỐ ĐH2") || text.includes("ĐH2") || text.includes("M2") || text.includes("ĐỒNG HỒ 2") || text.includes("SỐ 2") || (text.includes("CHỈ SỐ") && (text.includes("2") || text.includes("II")))) {
                if (colMap.master2 === -1) colMap.master2 = idx;
              } else if (text.includes("GHI CHÚ") || text.includes("NOTE") || text.includes("NOTES")) {
                colMap.notes = idx;
              }
            });
            break;
          }
        }

        // Fallback standard columns if header not found explicitly:
        if (colMap.date === -1) colMap.date = 0;
        if (colMap.time === -1) colMap.time = 1;
        if (colMap.master1 === -1) colMap.master1 = 2;
        if (colMap.master2 === -1) colMap.master2 = 4;
        if (colMap.notes === -1) colMap.notes = 7;

        const start = headerRowIndex !== -1 ? headerRowIndex + 1 : 1;
        const res: Omit<DailySupplyReading, 'id' | 'updatedAt' | 'consumption1' | 'consumption2'>[] = [];
        
        for (let i = start; i < json.length; i++) {
          const row = json[i];
          if (!row || row.length === 0) continue;
          
          let rawDateVal = row[colMap.date];
          let rawTimeVal = colMap.time !== -1 ? row[colMap.time] : "";
          
          if (!rawDateVal) continue;
          
          let parsedDate = "";
          let parsedTime = "";
          const dateStr = String(rawDateVal).trim();
          
          if (dateStr.toUpperCase().includes("TỔNG") || dateStr.toUpperCase().includes("CỘNG") || dateStr.toUpperCase() === "NGÀY") {
            continue;
          }

          const dateTimeMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})$/);
          if (dateTimeMatch) {
            const day = dateTimeMatch[1].padStart(2, '0');
            const month = dateTimeMatch[2].padStart(2, '0');
            const year = dateTimeMatch[3];
            parsedDate = `${year}-${month}-${day}`;
            parsedTime = `${dateTimeMatch[4].padStart(2, '0')}:${dateTimeMatch[5]}`;
          } else {
            parsedDate = parseExcelDate(rawDateVal);
            parsedTime = rawTimeVal ? normalizeTime(rawTimeVal) : "";
          }

          if (!parsedDate) continue;

          const m1Val = parseSafe(row[colMap.master1]);
          const m2Val = parseSafe(row[colMap.master2]);
          const notesVal = colMap.notes !== -1 ? String(row[colMap.notes] || "").trim() : "";

          if (m1Val === 0 && m2Val === 0) continue;

          res.push({
            date: parsedDate,
            time: parsedTime || "00:00",
            master1: m1Val,
            master2: m2Val,
            notes: notesVal
          });
        }
        resolve(res);
      } catch (err) { reject(err); }
    };
    reader.readAsArrayBuffer(file);
  });
};

const parseExcelDate = (val: any): string => {
  if (!val) return "";
  const str = String(val).trim();
  if (!str) return "";
  return normalizeDate(str);
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

export const exportLossPeriodReportToExcel = async (
  record: LossRecord,
  readings: DailySupplyReading[],
  fileName: string = 'Bao_Cao_That_Thoat'
) => {
  const XLSX = await getXLSX();
  
  // Helper to extract month-year from reading date (supports YYYY-MM-DD or DD/MM/YYYY)
  const getMonthYearKeyForPeriod = (dateStr: string) => {
    return normalizeMonthYear(dateStr);
  };

  const monthKey = normalizeMonthYear(record.month);
  // Filter readings that belong to the month of the record
  const filteredReadings = readings
    .filter(r => getMonthYearKeyForPeriod(r.date) === monthKey)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''));

  const supply1 = record.master1New - record.master1Old;
  const supply2 = record.master2New - record.master2Old;
  const totalSupply = supply1 + supply2;
  const totalConsumption = record.list1Volume + record.list2Volume;
  const lossVolume = totalSupply - totalConsumption;
  const lossPercent = totalSupply > 0 ? (lossVolume / totalSupply) * 100 : 0;

  const getGhiNgayStr = (monthStr: string) => {
    if (!monthStr || !monthStr.includes('/')) return '';
    const parts = monthStr.split('/');
    let m = parseInt(parts[0], 10);
    let y = parseInt(parts[1], 10);
    if (isNaN(m) || isNaN(y)) return '';
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    return `1/${m}/${y}`;
  };

  const ghiNgayValue = getGhiNgayStr(record.month);

  // Monochrome / Black-and-white print-optimized styles
  const sTitle = {
    font: { name: "Arial", size: 12, bold: true, color: { rgb: "000000" } },
    alignment: { horizontal: "center", vertical: "center" }
  };
  const sSub = {
    font: { name: "Arial", size: 8.5, italic: true, color: { rgb: "333333" } },
    alignment: { horizontal: "center", vertical: "center" }
  };
  const sSection = {
    font: { name: "Arial", size: 9.5, bold: true, color: { rgb: "000000" } },
    fill: { fgColor: { rgb: "F1F5F9" } }, // Slate-100, soft light gray for clean laser printing
    alignment: { vertical: "center" },
    border: {
      top: { style: "thin", color: { rgb: "94A3B8" } },
      bottom: { style: "thin", color: { rgb: "94A3B8" } }
    }
  };
  const sHeader = {
    font: { name: "Arial", size: 9, bold: true, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "334155" } }, // Slate-700 (solid dark charcoal/black for text readability)
    alignment: { horizontal: "center", vertical: "center" },
    border: {
      top: { style: "thin", color: { rgb: "1E293B" } },
      bottom: { style: "thin", color: { rgb: "1E293B" } },
      left: { style: "thin", color: { rgb: "1E293B" } },
      right: { style: "thin", color: { rgb: "1E293B" } }
    }
  };
  const sNormal = {
    font: { name: "Arial", size: 9 },
    alignment: { vertical: "center" },
    border: {
      top: { style: "thin", color: { rgb: "E2E8F0" } },
      bottom: { style: "thin", color: { rgb: "E2E8F0" } },
      left: { style: "thin", color: { rgb: "E2E8F0" } },
      right: { style: "thin", color: { rgb: "E2E8F0" } }
    }
  };
  const sBold = {
    font: { name: "Arial", size: 9, bold: true },
    alignment: { vertical: "center" },
    border: {
      top: { style: "thin", color: { rgb: "CBD5E1" } },
      bottom: { style: "thin", color: { rgb: "CBD5E1" } },
      left: { style: "thin", color: { rgb: "CBD5E1" } },
      right: { style: "thin", color: { rgb: "CBD5E1" } }
    }
  };
  const sRight = {
    font: { name: "Arial", size: 9 },
    alignment: { horizontal: "right", vertical: "center" },
    border: {
      top: { style: "thin", color: { rgb: "E2E8F0" } },
      bottom: { style: "thin", color: { rgb: "E2E8F0" } },
      left: { style: "thin", color: { rgb: "E2E8F0" } },
      right: { style: "thin", color: { rgb: "E2E8F0" } }
    }
  };
  const sRightBold = {
    font: { name: "Arial", size: 9, bold: true },
    alignment: { horizontal: "right", vertical: "center" },
    border: {
      top: { style: "thin", color: { rgb: "CBD5E1" } },
      bottom: { style: "thin", color: { rgb: "CBD5E1" } },
      left: { style: "thin", color: { rgb: "CBD5E1" } },
      right: { style: "thin", color: { rgb: "CBD5E1" } }
    }
  };
  const sCenter = {
    font: { name: "Arial", size: 9 },
    alignment: { horizontal: "center", vertical: "center" },
    border: {
      top: { style: "thin", color: { rgb: "E2E8F0" } },
      bottom: { style: "thin", color: { rgb: "E2E8F0" } },
      left: { style: "thin", color: { rgb: "E2E8F0" } },
      right: { style: "thin", color: { rgb: "E2E8F0" } }
    }
  };
  const sLossAlert = {
    font: { name: "Arial", size: 9, bold: true, color: { rgb: "000000" } },
    fill: { fgColor: { rgb: "E2E8F0" } }, // Solid light gray background for high-contrast alert printing
    alignment: { horizontal: "right", vertical: "center" },
    border: {
      top: { style: "medium", color: { rgb: "000000" } },
      bottom: { style: "medium", color: { rgb: "000000" } },
      left: { style: "medium", color: { rgb: "000000" } },
      right: { style: "medium", color: { rgb: "000000" } }
    }
  };
  const sLossOK = {
    font: { name: "Arial", size: 9, bold: true, color: { rgb: "000000" } },
    fill: { fgColor: { rgb: "F8FAFC" } },
    alignment: { horizontal: "right", vertical: "center" },
    border: {
      top: { style: "thin", color: { rgb: "475569" } },
      bottom: { style: "thin", color: { rgb: "475569" } },
      left: { style: "thin", color: { rgb: "475569" } },
      right: { style: "thin", color: { rgb: "475569" } }
    }
  };

  const rows: any[] = [];
  const merges: any[] = [];

  // TITLE ROW (Row 0)
  rows.push([
    { v: `BÁO CÁO THẤT THOÁT NƯỚC KỲ ${record.period}_GHI NGÀY ${ghiNgayValue}`, s: sTitle },
    "", "", "", "", "", "", ""
  ]);
  merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } });

  // SUBTITLE ROW (Row 1)
  rows.push([
    { v: `Thời gian xuất báo cáo: ${new Date().toLocaleDateString('vi-VN')} ${new Date().toLocaleTimeString('vi-VN')} | Đơn vị: m³`, s: sSub },
    "", "", "", "", "", "", ""
  ]);
  merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: 7 } });

  rows.push(["", "", "", "", "", "", "", ""]); // Spacing (Row 2)

  // SECTION I: HAO HỤT CHUNG (Row 3)
  rows.push([
    { v: "  I. TỔNG QUAN HAO HỤT CHUNG", s: sSection },
    "", "", "", "", "", "", ""
  ]);
  merges.push({ s: { r: 3, c: 0 }, e: { r: 3, c: 7 } });

  // Columns for Summary Stats Header (Row 4) - Merging Col A, B, C for clean description alignment
  rows.push([
    { v: "Chỉ số đánh giá", s: sHeader },
    "", "", // Merged with A
    { v: "Giá trị (m³)", s: sHeader },
    { v: "Tỷ lệ (%)", s: sHeader },
    { v: "Ghi chú thành phần", s: sHeader },
    "", "" // Merged with F
  ]);
  merges.push({ s: { r: 4, c: 0 }, e: { r: 4, c: 2 } });
  merges.push({ s: { r: 4, c: 5 }, e: { r: 4, c: 7 } });

  const customLossStyle = lossPercent > 10 ? sLossAlert : sLossOK;

  // Data rows (Row 5 - 7)
  rows.push([
    { v: "Tổng cấp vào hệ thống (ĐH tổng)", s: sNormal },
    "", "",
    { v: totalSupply, s: sRightBold },
    { v: "100%", s: sCenter },
    { v: `ĐH1: ${supply1} m³ | ĐH2: ${supply2} m³`, s: sNormal },
    "", ""
  ]);
  merges.push({ s: { r: 5, c: 0 }, e: { r: 5, c: 2 } });
  merges.push({ s: { r: 5, c: 5 }, e: { r: 5, c: 7 } });

  rows.push([
    { v: "Tổng tiêu thụ danh bộ (Thu khách hàng)", s: sNormal },
    "", "",
    { v: totalConsumption, s: sRightBold },
    { v: totalSupply > 0 ? `${((totalConsumption / totalSupply) * 100).toFixed(1)}%` : "0%", s: sCenter },
    { v: `Bộ 1: ${record.list1Volume} m³ | Bộ 2: ${record.list2Volume} m³`, s: sNormal },
    "", ""
  ]);
  merges.push({ s: { r: 6, c: 0 }, e: { r: 6, c: 2 } });
  merges.push({ s: { r: 6, c: 5 }, e: { r: 6, c: 7 } });

  rows.push([
    { v: "Hao hụt thất thoát hệ thống", s: sBold },
    "", "",
    { v: lossVolume, s: customLossStyle },
    { v: `${lossPercent.toFixed(1)}%`, s: customLossStyle },
    { v: lossPercent > 10 ? "⚠️ Tỷ lệ thất thoát cao vượt ngưỡng (10%)" : "✅ Tỷ lệ thất thoát hoạt động an toàn", s: customLossStyle },
    "", ""
  ]);
  merges.push({ s: { r: 7, c: 0 }, e: { r: 7, c: 2 } });
  merges.push({ s: { r: 7, c: 5 }, e: { r: 7, c: 7 } });

  rows.push(["", "", "", "", "", "", "", ""]); // Spacing (Row 8)

  // SECTION II: SỐ LIỆU ĐỒNG HỒ TỔNG (Row 9)
  rows.push([
    { v: "  II. SỐ LIỆU ĐỒNG HỒ TỔNG", s: sSection },
    "", "", "", "", "", "", ""
  ]);
  merges.push({ s: { r: 9, c: 0 }, e: { r: 9, c: 7 } });

  // Meter table headers (Row 10)
  rows.push([
    { v: "Đồng hồ tổng", s: sHeader },
    "", // B merged
    { v: "Chỉ số CŨ", s: sHeader },
    { v: "Chỉ số MỚI", s: sHeader },
    { v: "Tổng cấp (m³)", s: sHeader },
    { v: "Mô tả vị trí & Mục đích sử dụng", s: sHeader },
    "", "" // G, H merged
  ]);
  merges.push({ s: { r: 10, c: 0 }, e: { r: 10, c: 1 } });
  merges.push({ s: { r: 10, c: 5 }, e: { r: 10, c: 7 } });

  // Meter 1 Data (Row 11)
  rows.push([
    { v: "ĐỒNG HỒ TỔNG SỐ 1", s: sBold },
    "", // B merged
    { v: record.master1Old, s: sRight },
    { v: record.master1New, s: sRightBold },
    { v: supply1, s: sRightBold },
    { v: "Đo lưu lượng cấp khu vực Bộ 01 (Nhánh 1 chính)", s: sNormal },
    "", "" // G, H merged
  ]);
  merges.push({ s: { r: 11, c: 0 }, e: { r: 11, c: 1 } });
  merges.push({ s: { r: 11, c: 5 }, e: { r: 11, c: 7 } });

  // Meter 2 Data (Row 12)
  rows.push([
    { v: "ĐỒNG HỒ TỔNG SỐ 2", s: sBold },
    "", // B merged
    { v: record.master2Old, s: sRight },
    { v: record.master2New, s: sRightBold },
    { v: supply2, s: sRightBold },
    { v: "Đo lưu lượng cấp khu vực Bộ 02 (Nhánh 2 phụ)", s: sNormal },
    "", "" // G, H merged
  ]);
  merges.push({ s: { r: 12, c: 0 }, e: { r: 12, c: 1 } });
  merges.push({ s: { r: 12, c: 5 }, e: { r: 12, c: 7 } });

  rows.push(["", "", "", "", "", "", "", ""]); // Spacing (Row 13)

  // SECTION III: GHI CHÉP CHI TIẾT HẰNG NGÀY (Row 14)
  rows.push([
    { v: `  III. NHẬT KÝ THEO DÕI GHI NƯỚC HẰNG NGÀY (THÁNG ${record.month})`, s: sSection },
    "", "", "", "", "", "", ""
  ]);
  merges.push({ s: { r: 14, c: 0 }, e: { r: 14, c: 7 } });

  // Table headers for Daily (Row 15) - Compact text
  rows.push([
    { v: "NGÀY GHI", s: sHeader },
    { v: "GIỜ GHI", s: sHeader },
    { v: "CHỈ SỐ ĐH1", s: sHeader },
    { v: "CẤP ĐH1", s: sHeader },
    { v: "CHỈ SỐ ĐH2", s: sHeader },
    { v: "CẤP ĐH2", s: sHeader },
    { v: "TỔNG CẤP", s: sHeader },
    { v: "GHI CHÚ / SỰ KIỆN", s: sHeader }
  ]);

  const baseRowIdx = 16;
  if (filteredReadings.length === 0) {
    rows.push([
      { v: "Không có dữ liệu nhật ký ghi nước hằng ngày nào trong kỳ này.", s: sCenter },
      "", "", "", "", "", "", ""
    ]);
    merges.push({ s: { r: baseRowIdx, c: 0 }, e: { r: baseRowIdx, c: 7 } });
  } else {
    filteredReadings.forEach((r) => {
      const dailyTotal = (r.consumption1 || 0) + (r.consumption2 || 0);
      rows.push([
        { v: formatDateDisplay(r.date), s: sCenter },
        { v: normalizeTime(r.time), s: sCenter },
        { v: r.master1 || 0, s: sRight },
        { v: r.consumption1 || 0, s: sRight },
        { v: r.master2 || 0, s: sRight },
        { v: r.consumption2 || 0, s: sRight },
        { v: dailyTotal, s: sRightBold },
        { v: r.notes || "", s: sNormal }
      ]);
    });
  }

  // Convert to worksheet
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!merges'] = merges;

  // Compact columns to prevent horizontal splitting (fits beautifully on 1 page-width)
  ws['!cols'] = [
    { wch: 12 }, // A: Ngày ghi / ĐH tổng / Chỉ số đánh giá
    { wch: 8 },  // B: Giờ ghi
    { wch: 12 }, // C: Chỉ số ĐH1 / Chỉ số CŨ / Giá trị
    { wch: 11 }, // D: Cấp ĐH1 / Chỉ số MỚI / Tỷ lệ
    { wch: 12 }, // E: Chỉ số ĐH2 / Tổng cấp (m³) / Ghi chú thành phần
    { wch: 11 }, // F: Cấp ĐH2
    { wch: 12 }, // G: Tổng cấp
    { wch: 28 }  // H: Ghi chú / Sự kiện
  ];

  // Dynamic row heights for standard, spacious look
  const rowHeights: { hpt: number }[] = [];
  rowHeights.push({ hpt: 28 }); // Row 0 (Title)
  rowHeights.push({ hpt: 18 }); // Row 1 (Subtitle)
  rowHeights.push({ hpt: 12 }); // Row 2 (Spacing)
  rowHeights.push({ hpt: 22 }); // Row 3 (Section I)
  rowHeights.push({ hpt: 20 }); // Row 4 (Table 1 Header)
  rowHeights.push({ hpt: 18 }); // Row 5 (Table 1 Row 1)
  rowHeights.push({ hpt: 18 }); // Row 6 (Table 1 Row 2)
  rowHeights.push({ hpt: 18 }); // Row 7 (Table 1 Row 3)
  rowHeights.push({ hpt: 12 }); // Row 8 (Spacing)
  rowHeights.push({ hpt: 22 }); // Row 9 (Section II)
  rowHeights.push({ hpt: 20 }); // Row 10 (Table 2 Header)
  rowHeights.push({ hpt: 18 }); // Row 11 (Table 2 Row 1)
  rowHeights.push({ hpt: 18 }); // Row 12 (Table 2 Row 2)
  rowHeights.push({ hpt: 12 }); // Row 13 (Spacing)
  rowHeights.push({ hpt: 22 }); // Row 14 (Section III)
  rowHeights.push({ hpt: 20 }); // Row 15 (Table 3 Header)
  
  if (filteredReadings.length === 0) {
    rowHeights.push({ hpt: 20 });
  } else {
    filteredReadings.forEach(() => {
      rowHeights.push({ hpt: 18 });
    });
  }
  ws['!rows'] = rowHeights;

  // Configure print setup for A4, Landscape orientation, fit-to-page layout
  ws['!pageSetup'] = {
    orientation: 'landscape',
    paperSize: 9, // A4
    fitToWidth: 1,
    fitToHeight: 0, // Fits perfectly horizontally on 1 page width, rows flow naturally vertically
    fitToPage: true
  };

  // Configure print margins (0.25 inch / ~0.64cm, narrow margins to maximize horizontal printable area)
  ws['!margins'] = {
    left: 0.25,
    right: 0.25,
    top: 0.4,
    bottom: 0.4,
    header: 0.2,
    footer: 0.2
  };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Báo cáo");
  
  // Format safe file name
  const safeFilename = `${fileName}_Ky_${record.period}_Ghi_Ngay_${ghiNgayValue.replace(/\//g, '_')}.xlsx`;
  XLSX.writeFile(wb, safeFilename);
};
