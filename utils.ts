
import * as XLSX from 'xlsx';
import { Customer, GroupMember } from './types';

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
  
  const vol = (ni > 0 && ni >= oi) ? (ni - oi) : 0;
  const amt = vol * rate;
  const bal = (amt + od) - paid;
  
  return {
    ...cust,
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

export const normalizeString = (str: string): string => {
  if (!str) return "";
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

export const exportToExcel = (customers: Customer[], fileName: string = 'Bao_Cao') => {
  const header = ["STT", "KHÁCH HÀNG", "ĐỊA CHỈ", "ĐIỆN THOẠI", "CHỈ SỐ MỚI", "CHỈ SỐ CŨ", "M3", "THÀNH TIỀN", "NỢ CŨ", "THANH TOÁN", "NỢ LẠI", "ZALO"];
  const data = customers.sort((a, b) => a.stt - b.stt).map(c => [
    c.stt, c.name, c.address, c.phone, c.newIndex || "", c.oldIndex, c.volume || "", Math.round(c.amount) || "", Math.round(c.oldDebt), Math.round(c.paid) || "", Math.round(c.balance) || "", c.isZalo ? "X" : ""
  ]);
  const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data");
  XLSX.writeFile(wb, `${fileName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

export const parseExcelFile = async (file: File, listType: 'list1' | 'list2', rate: number): Promise<Customer[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const ws = workbook.Sheets[workbook.SheetNames[0]];
        const json: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
        
        let headerRowIndex = -1;
        let colMap: Record<string, number> = {
          stt: 0, name: 1, address: 2, phone: 3, newIndex: 4, oldIndex: 5, oldDebt: 8, paid: 9, zalo: 11
        };

        // Tim hang tieu de va tu dong mapping cot theo ten
        for (let r = 0; r < 20; r++) {
          const row = json[r];
          if (row && row.some(cell => String(cell || "").toUpperCase().includes("STT"))) {
            headerRowIndex = r;
            row.forEach((cell, idx) => {
              const text = String(cell || "").toUpperCase();
              if (text.includes("STT")) colMap.stt = idx;
              else if (text.includes("KHÁCH") || text.includes("TÊN")) colMap.name = idx;
              else if (text.includes("ĐỊA CHỈ")) colMap.address = idx;
              else if (text.includes("THOẠI") || text.includes("ĐT")) colMap.phone = idx;
              else if (text.includes("MỚI")) colMap.newIndex = idx;
              else if (text.includes("CŨ")) colMap.oldIndex = idx;
              else if (text.includes("NỢ KỲ") || text.includes("NỢ CŨ")) colMap.oldDebt = idx;
              else if (text.includes("THANH TOÁN") || text.includes("ĐÃ TRẢ")) colMap.paid = idx;
              else if (text.includes("ZALO")) colMap.zalo = idx;
            });
            break;
          }
        }

        const start = headerRowIndex !== -1 ? headerRowIndex + 1 : 4;
        const res: Customer[] = [];
        for (let i = start; i < json.length; i++) {
          const row = json[i];
          if (!row || !row[colMap.stt] || isNaN(parseInt(row[colMap.stt]))) continue;
          
          res.push(calculateRow({
            id: `xl-${row[colMap.stt]}-${listType}`,
            stt: parseInt(row[colMap.stt]),
            name: String(row[colMap.name] || ""),
            address: String(row[colMap.address] || ""),
            phone: String(row[colMap.phone] || ""),
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
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const ws = workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
        
        const members: GroupMember[] = [];
        let currentDB: 'list1' | 'list2' = 'list1';
        let startRow = 0;

        for (let r = 0; r < 20; r++) {
            if (rows[r] && String(rows[r][0] || "").toUpperCase().includes("STT")) {
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

          const stt = parseInt(colA);
          if (!isNaN(stt) && !colA.toUpperCase().includes("CỘNG")) {
            members.push({ stt, source: currentDB });
          }
        }
        resolve(members);
      } catch (err) { reject(err); }
    };
    reader.readAsArrayBuffer(file);
  });
};
