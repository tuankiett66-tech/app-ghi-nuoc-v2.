export const APPS_SCRIPT_V4_3 = `/**
 * GOOGLE APPS SCRIPT - HỆ THỐNG QUẢN LÝ NƯỚC TẬP TRUNG (V4.3)
 * Cập nhật: Tự động lưu trữ lịch sử theo Tháng (Kỳ) sang trang tính mới khi chốt kỳ.
 * Bảo toàn Lịch sử sử dụng (updatedAt) và Ngày thay đồng hồ (installDate)
 * 
 * Định dạng các Cột trên Google Sheets (Từ Cột A đến Cột Q):
 * - Cột A (1): Mã KH
 * - Cột B (2): Tên
 * - Cột C (3): Địa chỉ
 * - Cột D (4): SĐT
 * - Cột E (5): Chỉ số mới
 * - Cột F (6): Chỉ số cũ
 * - Cột G (7): Tiêu thụ
 * - Cột H (8): Thành tiền
 * - Cột I (9): Nợ cũ
 * - Cột J (10): Đã trả
 * - Cột K (11): Còn nợ
 * - Cột L (12): Zalo (Checkbox TRUE/FALSE)
 * - Cột M (13): Zalo Bạn (Checkbox TRUE/FALSE)
 * - Cột N (14): Đã gửi Bill (Checkbox TRUE/FALSE)
 * - Cột O (15): Ngày thay ĐH (installDate)
 * - Cột P (16): Lịch sử cập nhật (updatedAt)
 * - Cột Q (17): Ghi chú (note)
 */

const SHEET_KEYS = {
  LIST1: ["List1", "List 1", "1_Danh bo 1", "Danh bo 1", "DANH BỘ 1", "DanhBo1"],
  LIST2: ["List2", "List 2", "2_Danh bo 2", "Danh bo 2", "DANH BỘ 2", "DanhBo2"],
  CONFIG: ["Config", "3_Cai dat", "Cai dat", "CAI DAT", "Cài đặt"]
};

function findSheet(ss, keys) {
  // 1. Tìm theo khớp chính xác trước (case-sensitive)
  for (var i = 0; i < keys.length; i++) {
    var sheet = ss.getSheetByName(keys[i]);
    if (sheet) return sheet;
  }
  
  // 2. Tìm theo khớp không phân biệt chữ hoa chữ thường
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    var name = sheets[i].getName().toUpperCase().trim();
    for (var j = 0; j < keys.length; j++) {
      if (name === keys[j].toUpperCase().trim()) {
        return sheets[i];
      }
    }
  }
  
  // 3. Fallback thông minh: Tìm trang tính chứa từ khóa đặc trưng
  for (var i = 0; i < sheets.length; i++) {
    var name = sheets[i].getName().toUpperCase().trim();
    
    // Nếu tìm kiếm sheet 1
    if (keys[0].toUpperCase().includes("LIST1") || keys[0].toUpperCase().includes("DANH BO 1")) {
      if (name.includes("LIST1") || name.includes("LIST 1") || name.includes("DANH BO 1") || name.includes("DANHBO1") || (name.includes("DANH BỘ") && name.includes("1"))) {
        return sheets[i];
      }
    }
    
    // Nếu tìm kiếm sheet 2
    if (keys[0].toUpperCase().includes("LIST2") || keys[0].toUpperCase().includes("DANH BO 2")) {
      if (name.includes("LIST2") || name.includes("LIST 2") || name.includes("DANH BO 2") || name.includes("DANHBO2") || (name.includes("DANH BỘ") && name.includes("2"))) {
        return sheets[i];
      }
    }
    
    // Nếu tìm cấu hình
    if (keys[0].toUpperCase().includes("CONFIG") || keys[0].toUpperCase().includes("CAI DAT")) {
      if (name.includes("CONFIG") || name.includes("CAI DAT") || name.includes("CAIDAT") || name.includes("CÀI ĐẶT")) {
        return sheets[i];
      }
    }
  }
  return null;
}

function doGet(e) {
  try {
    const action = e.parameter.action;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (action === 'get_all') {
      const sheet1 = findSheet(ss, SHEET_KEYS.LIST1);
      const sheet2 = findSheet(ss, SHEET_KEYS.LIST2);
      
      if (!sheet1 && !sheet2) {
        return ContentService.createTextOutput(JSON.stringify({
          status: "error",
          message: "Không tìm thấy trang tính Danh bộ 1 hoặc Danh bộ 2 trong file Google Sheets. Vui lòng kiểm tra lại tên trang tính."
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
      return ContentService.createTextOutput(JSON.stringify({
        list1: getSheetData(sheet1),
        list2: getSheetData(sheet2),
        config: getConfigData(findSheet(ss, SHEET_KEYS.CONFIG))
      })).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({status: "error", message: err.message}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);
    const action = postData.action;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    if (action === 'update_all') {
      const sheet1 = findSheet(ss, SHEET_KEYS.LIST1);
      const sheet2 = findSheet(ss, SHEET_KEYS.LIST2);
      
      if (!sheet1 && !sheet2) {
        throw new Error("Không tìm thấy trang tính Danh bộ 1 hoặc Danh bộ 2 trong file Google Sheets. Vui lòng kiểm tra tên trang tính.");
      }
      
      // Cập nhật cấu hình chung
      updateConfig(findSheet(ss, SHEET_KEYS.CONFIG), postData.config);
      
      // Ghi đè dữ liệu mới nhất lên các trang tính hoạt động hiện tại
      const count1 = updateOrInsertData(sheet1, postData.list1);
      const count2 = updateOrInsertData(sheet2, postData.list2);
      
      // ĐỘT PHÁ V4.3: Tự động lưu trữ lịch sử sang trang tính mới theo Kỳ/Tháng khi Chốt Kỳ
      if (postData.archive_suffix) {
        const suffix = postData.archive_suffix;
        archiveSheet(ss, sheet1, "LichSu_Bộ01_" + suffix);
        archiveSheet(ss, sheet2, "LichSu_Bộ02_" + suffix);
        
        return ContentService.createTextOutput(JSON.stringify({
          status: "success", 
          message: "Đã tự động lưu trữ lịch sử trang tính [" + suffix + "] và chốt kỳ thành công!"
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
      return ContentService.createTextOutput(JSON.stringify({
        status: "success", 
        message: "Đã cập nhật/chèn mới tổng cộng " + (count1 + count2) + " hộ dân lên Google Sheets."
      })).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({status: "error", message: err.message}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getSheetData(sheet) {
  if (!sheet) return [];
  
  // Đảm bảo trang tính có tối thiểu 17 cột để tránh lỗi chỉ số vượt giới hạn
  var maxCols = sheet.getMaxColumns();
  if (maxCols < 17) {
    sheet.insertColumnsAfter(maxCols, 17 - maxCols);
  }
  
  const data = sheet.getDataRange().getValues();
  const rows = [];
  if (data.length < 5) return [];
  for (var i = 4; i < data.length; i++) {
    var row = data[i];
    var maKH = String(row[0] || "").trim();
    if (!maKH || maKH === "0" || maKH.toUpperCase().includes("CỘNG")) continue;
    
    // Column L (index 11): isZalo
    var rawZalo = row.length > 11 ? row[11] : false;
    var zaloVal = String(rawZalo || "").toUpperCase();
    var isZalo = zaloVal === "X" || zaloVal === "F" || rawZalo === true || zaloVal === "TRUE";
    
    // Column M (index 12): isZaloFriend
    var rawZaloFriend = row.length > 12 ? row[12] : false;
    var zaloFriendVal = String(rawZaloFriend || "").toUpperCase();
    var isZaloFriend = zaloFriendVal === "F" || rawZaloFriend === true || zaloFriendVal === "TRUE";
    
    // Column N (index 13): isProcessed
    var rawProcessed = row.length > 13 ? row[13] : false;
    var processedVal = String(rawProcessed || "").toUpperCase();
    var isProcessed = rawProcessed === true || processedVal === "TRUE" || processedVal === "X";
    
    // Column O (index 14): installDate
    var installDate = (row.length > 14 && row[14]) ? String(row[14]) : "";
    
    // Column P (index 15): updatedAt
    var updatedAt = (row.length > 15 && row[15]) ? Number(row[15]) : 0;
    
    // Column Q (index 16): note
    var note = (row.length > 16 && row[16]) ? String(row[16]) : "";
    
    rows.push({
      maKH: maKH, 
      name: String(row[1] || ""), 
      address: String(row[2] || ""),
      phoneTenant: String(row[3] || ""), 
      newIndex: row.length > 4 ? row[4] : 0, 
      oldIndex: row.length > 5 ? row[5] : 0,
      oldDebt: row.length > 8 ? row[8] : 0, 
      paid: row.length > 9 ? row[9] : 0, 
      isZalo: isZalo,
      isZaloFriend: isZaloFriend,
      isProcessed: isProcessed,
      installDate: installDate,
      updatedAt: updatedAt,
      note: note
    });
  }
  return rows;
}

function updateOrInsertData(sheet, dataToUpdate) {
  if (!sheet || !dataToUpdate) return 0;
  
  // Đảm bảo trang tính có tối thiểu 17 cột trước khi xóa hoặc ghi dữ liệu
  var maxCols = sheet.getMaxColumns();
  if (maxCols < 17) {
    sheet.insertColumnsAfter(maxCols, 17 - maxCols);
  }
  
  // 1. Lấy toàn bộ dữ liệu hiện tại để xóa (từ dòng 5 trở đi)
  var lastRow = sheet.getLastRow();
  if (lastRow >= 5) {
    // Xóa nội dung từ cột A đến Q (17 cột) để đảm bảo sạch sẽ trước khi ghi mới
    sheet.getRange(5, 1, lastRow - 4, 17).clearContent();
  }
  
  if (dataToUpdate.length === 0) return 0;
  
  // 2. Chuẩn bị mảng 2 chiều để ghi một lần (setValues) - Nhanh hơn gấp nhiều lần
  var values = dataToUpdate.map(function(item) {
    return [
      String(item.maKH || ""),        // Cột A: Mã KH
      String(item.name || ""),        // Cột B: Tên
      String(item.address || ""),     // Cột C: Địa chỉ
      String(item.phoneTenant || ""),   // Cột D: SĐT
      item.newIndex || 0,             // Cột E: Chỉ số mới
      item.oldIndex || 0,             // Cột F: Chỉ số cũ
      item.consumption || 0,          // Cột G: Tiêu thụ
      item.amount || 0,               // Cột H: Thành tiền
      item.oldDebt || 0,              // Cột I: Nợ cũ
      item.paid || 0,                 // Cột J: Đã trả
      item.remainingDebt || 0,        // Cột K: Còn nợ
      item.isZalo === true,           // Cột L: Zalo (Checkbox)
      item.isZaloFriend === true,     // Cột M: Zalo Bạn (Checkbox)
      item.isProcessed === true,      // Cột N: Đã gửi (Checkbox)
      item.installDate || "",         // Cột O: Ngày thay ĐH
      item.updatedAt || 0,            // Cột P: Lịch sử cập nhật
      item.note || ""                 // Cột Q: Ghi chú
    ];
  });
  
  // 3. Ghi toàn bộ dữ liệu xuống Sheet từ dòng 5
  sheet.getRange(5, 1, values.length, 17).setValues(values);
  
  return dataToUpdate.length;
}

// Hàm lưu trữ lịch sử bằng cách sao chép trang tính hiện có
function archiveSheet(ss, sourceSheet, targetName) {
  if (!sourceSheet) return;
  
  // Nếu trang tính lịch sử cùng kỳ đã tồn tại, xóa trước để tránh lỗi đè
  var oldSheet = ss.getSheetByName(targetName);
  if (oldSheet) {
    try {
      ss.deleteSheet(oldSheet);
    } catch (e) {
      // Bỏ qua lỗi
    }
  }
  
  // Copy trang tính hoạt động hiện có thành một bản lưu trữ
  var archivedSheet = sourceSheet.copyTo(ss);
  archivedSheet.setName(targetName);
  
  // Đổi màu tab lưu trữ sang màu xám (#7f8c8d) để phân biệt rõ với danh bộ làm việc hiện tại
  try {
    archivedSheet.setTabColor("#7f8c8d");
  } catch (e) {
    // Bỏ qua lỗi đổi màu nếu API không hỗ trợ ở phiên bản sheets cũ hơn
  }
}

function getConfigData(sheet) {
  if (!sheet) return null;
  const data = sheet.getDataRange().getValues();
  const config = {};
  for (var i = 0; i < data.length; i++) {
    if (data[i][0]) config[data[i][0]] = data[i][1];
  }
  return config;
}

function updateConfig(sheet, config) {
  if (!sheet || !config) return;
  sheet.clear();
  const rows = Object.keys(config).map(key => [key, config[key]]);
  if (rows.length > 0) {
    sheet.getRange(1, 1, rows.length, 2).setValues(rows);
  }
}
`;
