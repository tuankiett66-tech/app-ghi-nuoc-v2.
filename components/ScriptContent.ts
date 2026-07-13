export const APPS_SCRIPT_V4_4 = `/**
 * GOOGLE APPS SCRIPT - HỆ THỐNG QUẢN LÝ NƯỚC TẬP TRUNG (V4.4)
 * Cập nhật: Đồng bộ trực tiếp Thất thoát (LossRecords) và Ghi nước hàng ngày (DailySupply) lên trang tính độc lập.
 * Tự động lưu trữ lịch sử theo Tháng (Kỳ) sang trang tính mới khi chốt kỳ.
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
  CONFIG: ["Config", "3_Cai dat", "Cai dat", "CAI DAT", "Cài đặt"],
  LOSS: ["LossRecords", "Loss Records", "Thất thoát", "THAT THUAT", "Thật thoát"],
  DAILY: ["DailySupply", "Daily Supply", "Ghi nước hàng ngày", "GHI NUOC HANG NGAY", "DailySupplyReadings"]
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

    // Nếu tìm thất thoát
    if (keys[0].toUpperCase().includes("LOSS")) {
      if (name.includes("LOSS") || name.includes("THAT THUAT") || name.includes("THẤT THOÁT")) {
        return sheets[i];
      }
    }

    // Nếu tìm ghi nước hàng ngày
    if (keys[0].toUpperCase().includes("DAILY")) {
      if (name.includes("DAILY") || name.includes("GHI NUOC") || name.includes("HANG NGAY") || name.includes("HÀNG NGÀY")) {
        return sheets[i];
      }
    }
  }
  return null;
}

function getOrCreateSheet(ss, keys, defaultName) {
  var sheet = findSheet(ss, keys);
  if (!sheet) {
    sheet = ss.insertSheet(defaultName);
  }
  return sheet;
}

function doGet(e) {
  try {
    const action = e.parameter.action;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (action === 'get_all') {
      const sheet1 = findSheet(ss, SHEET_KEYS.LIST1);
      const sheet2 = findSheet(ss, SHEET_KEYS.LIST2);
      const lossSheet = findSheet(ss, SHEET_KEYS.LOSS);
      const dailySheet = findSheet(ss, SHEET_KEYS.DAILY);
      
      if (!sheet1 && !sheet2) {
        return ContentService.createTextOutput(JSON.stringify({
          status: "error",
          message: "Không tìm thấy trang tính Danh bộ 1 hoặc Danh bộ 2 trong file Google Sheets. Vui lòng kiểm tra lại tên trang tính."
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
      return ContentService.createTextOutput(JSON.stringify({
        list1: getSheetData(sheet1),
        list2: getSheetData(sheet2),
        config: getConfigData(findSheet(ss, SHEET_KEYS.CONFIG)),
        lossRecords: getLossData(lossSheet),
        dailySupplyReadings: getDailySupplyData(dailySheet)
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
      const lossSheet = getOrCreateSheet(ss, SHEET_KEYS.LOSS, "LossRecords");
      const dailySheet = getOrCreateSheet(ss, SHEET_KEYS.DAILY, "DailySupply");
      
      if (!sheet1 && !sheet2) {
        throw new Error("Không tìm thấy trang tính Danh bộ 1 hoặc Danh bộ 2 trong file Google Sheets. Vui lòng kiểm tra tên trang tính.");
      }
      
      // Cập nhật cấu hình chung
      updateConfig(findSheet(ss, SHEET_KEYS.CONFIG), postData.config);
      
      // Ghi đè dữ liệu mới nhất lên các trang tính hoạt động hiện tại
      const count1 = updateOrInsertData(sheet1, postData.list1);
      const count2 = updateOrInsertData(sheet2, postData.list2);

      // Cập nhật dữ liệu Thất thoát và Ghi nước hàng ngày trực tiếp lên Sheet riêng biệt
      if (postData.lossRecords) {
        updateLossData(lossSheet, postData.lossRecords);
      }
      if (postData.dailySupplyReadings) {
        updateDailySupplyData(dailySheet, postData.dailySupplyReadings);
      }
      
      // ĐỘT PHÁ V4.4: Tự động lưu trữ lịch sử sang trang tính mới theo Kỳ/Tháng khi Chốt Kỳ
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
        message: "Đã cập nhật tổng cộng " + (count1 + count2) + " hộ dân, đồng bộ Thất thoát & Ghi nước lên Google Sheets."
      })).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({status: "error", message: err.message}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function findHeaderRow(sheet) {
  if (!sheet) return 1;
  var lastRow = Math.min(sheet.getLastRow(), 20);
  if (lastRow === 0) return 1;
  var values = sheet.getRange(1, 1, lastRow, Math.min(sheet.getLastColumn(), 10)).getValues();
  for (var r = 0; r < values.length; r++) {
    var row = values[r];
    for (var c = 0; c < row.length; c++) {
      var val = String(row[c] || "").toUpperCase().trim();
      if (val === "MÃ KH" || val === "MAKH" || val === "STT") {
        return r + 1;
      }
    }
  }
  return 1;
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
  var H = findHeaderRow(sheet);
  if (data.length <= H) return [];
  for (var i = H; i < data.length; i++) {
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
  
  var H = findHeaderRow(sheet);
  var startRow = H + 1;
  
  // 1. Lấy toàn bộ dữ liệu hiện tại để xóa (từ dòng startRow trở đi)
  var lastRow = sheet.getLastRow();
  if (lastRow >= startRow) {
    // Xóa nội dung từ cột A đến Q (17 cột) để đảm bảo sạch sẽ trước khi ghi mới
    sheet.getRange(startRow, 1, lastRow - H, 17).clearContent();
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
  
  // 3. Ghi toàn bộ dữ liệu xuống Sheet từ dòng startRow
  sheet.getRange(startRow, 1, values.length, 17).setValues(values);
  
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

// --- ĐỒNG BỘ THẤT THOÁT (V4.4) ---
function getLossData(sheet) {
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  const headers = data[0].map(h => String(h).trim().toLowerCase());
  const colMap = {
    period: headers.indexOf("period"),
    month: headers.indexOf("month"),
    master1New: headers.indexOf("master1new"),
    master1Old: headers.indexOf("master1old"),
    master2New: headers.indexOf("master2new"),
    master2Old: headers.indexOf("master2old"),
    list1Volume: headers.indexOf("list1volume"),
    list2Volume: headers.indexOf("list2volume"),
    id: headers.indexOf("id"),
    createdAt: headers.indexOf("createdat")
  };
  
  const rows = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var id = colMap.id !== -1 ? String(row[colMap.id] || "").trim() : "";
    if (!id && colMap.month !== -1 && !row[colMap.month]) continue; // skip empty rows
    
    rows.push({
      id: id || ("loss-" + Date.now() + "-" + i),
      period: colMap.period !== -1 ? Number(row[colMap.period]) || 0 : 0,
      month: colMap.month !== -1 ? String(row[colMap.month] || "") : "",
      master1New: colMap.master1New !== -1 ? Number(row[colMap.master1New]) || 0 : 0,
      master1Old: colMap.master1Old !== -1 ? Number(row[colMap.master1Old]) || 0 : 0,
      master2New: colMap.master2New !== -1 ? Number(row[colMap.master2New]) || 0 : 0,
      master2Old: colMap.master2Old !== -1 ? Number(row[colMap.master2Old]) || 0 : 0,
      list1Volume: colMap.list1Volume !== -1 ? Number(row[colMap.list1Volume]) || 0 : 0,
      list2Volume: colMap.list2Volume !== -1 ? Number(row[colMap.list2Volume]) || 0 : 0,
      createdAt: colMap.createdAt !== -1 ? Number(row[colMap.createdAt]) || Date.now() : Date.now()
    });
  }
  return rows;
}

function updateLossData(sheet, data) {
  if (!sheet || !data) return;
  
  var lastRow = sheet.getLastRow();
  var headers = ["period", "month", "master1New", "master1Old", "master2New", "master2Old", "list1Volume", "list2Volume", "id", "createdAt"];
  
  if (lastRow === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    lastRow = 1;
  } else {
    var firstRowVals = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    if (firstRowVals.length > 0 && String(firstRowVals[0] || "").trim() !== "") {
      headers = firstRowVals.map(h => String(h).trim());
    }
  }
  
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, headers.length).clearContent();
  }
  
  if (data.length === 0) return;
  
  var values = data.map(function(item) {
    return headers.map(function(h) {
      var key = h.trim();
      var keyLower = key.toLowerCase();
      if (keyLower === "period") return item.period || 0;
      if (keyLower === "month") return item.month || "";
      if (keyLower === "master1new") return item.master1New || 0;
      if (keyLower === "master1old") return item.master1Old || 0;
      if (keyLower === "master2new") return item.master2New || 0;
      if (keyLower === "master2old") return item.master2Old || 0;
      if (keyLower === "list1volume") return item.list1Volume || 0;
      if (keyLower === "list2volume") return item.list2Volume || 0;
      if (keyLower === "id") return item.id || "";
      if (keyLower === "createdat") return item.createdAt || Date.now();
      return item[key] !== undefined ? item[key] : "";
    });
  });
  
  sheet.getRange(2, 1, values.length, headers.length).setValues(values);
}

// --- ĐỒNG BỘ GHI NƯỚC HÀNG NGÀY (V4.4) ---
function getDailySupplyData(sheet) {
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  const headers = data[0].map(h => String(h).trim().toLowerCase());
  const colMap = {
    date: headers.indexOf("date"),
    time: headers.indexOf("time"),
    master1: headers.indexOf("master1"),
    master2: headers.indexOf("master2"),
    notes: headers.indexOf("notes"),
    id: headers.indexOf("id"),
    updatedAt: headers.indexOf("updatedat"),
    consumption1: headers.indexOf("consumption1"),
    consumption2: headers.indexOf("consumption2")
  };
  
  const rows = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var id = colMap.id !== -1 ? String(row[colMap.id] || "").trim() : "";
    if (!id && colMap.date !== -1 && !row[colMap.date]) continue; // skip empty rows
    
    var rawDate = colMap.date !== -1 ? row[colMap.date] : "";
    var dateStr = "";
    if (rawDate instanceof Date) {
      var yyyy = rawDate.getFullYear();
      var mm = String(rawDate.getMonth() + 1).padStart(2, '0');
      var dd = String(rawDate.getDate()).padStart(2, '0');
      dateStr = yyyy + "-" + mm + "-" + dd;
    } else {
      dateStr = String(rawDate || "");
    }
    
    var rawTime = colMap.time !== -1 ? row[colMap.time] : "";
    var timeStr = "";
    if (rawTime instanceof Date) {
      var hh = String(rawTime.getHours()).padStart(2, '0');
      var min = String(rawTime.getMinutes()).padStart(2, '0');
      timeStr = hh + ":" + min;
    } else {
      timeStr = String(rawTime || "");
    }
    
    rows.push({
      id: id || ("supply-" + Date.now() + "-" + i),
      date: dateStr,
      time: timeStr,
      master1: colMap.master1 !== -1 ? Number(row[colMap.master1]) || 0 : 0,
      master2: colMap.master2 !== -1 ? Number(row[colMap.master2]) || 0 : 0,
      notes: colMap.notes !== -1 ? String(row[colMap.notes] || "") : "",
      updatedAt: colMap.updatedAt !== -1 ? Number(row[colMap.updatedAt]) || Date.now() : Date.now(),
      consumption1: colMap.consumption1 !== -1 ? Number(row[colMap.consumption1]) || 0 : 0,
      consumption2: colMap.consumption2 !== -1 ? Number(row[colMap.consumption2]) || 0 : 0
    });
  }
  return rows;
}

function updateDailySupplyData(sheet, data) {
  if (!sheet || !data) return;
  
  var lastRow = sheet.getLastRow();
  var headers = ["date", "time", "master1", "master2", "notes", "id", "updatedAt", "consumption1", "consumption2"];
  
  if (lastRow === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    lastRow = 1;
  } else {
    var firstRowVals = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    if (firstRowVals.length > 0 && String(firstRowVals[0] || "").trim() !== "") {
      headers = firstRowVals.map(h => String(h).trim());
    }
  }
  
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, headers.length).clearContent();
  }
  
  if (data.length === 0) return;
  
  var values = data.map(function(item) {
    return headers.map(function(h) {
      var key = h.trim();
      var keyLower = key.toLowerCase();
      if (keyLower === "date") return item.date || "";
      if (keyLower === "time") return item.time || "";
      if (keyLower === "master1") return item.master1 || 0;
      if (keyLower === "master2") return item.master2 || 0;
      if (keyLower === "notes") return item.notes || "";
      if (keyLower === "id") return item.id || "";
      if (keyLower === "updatedat") return item.updatedAt || Date.now();
      if (keyLower === "consumption1") return item.consumption1 || 0;
      if (keyLower === "consumption2") return item.consumption2 || 0;
      return item[key] !== undefined ? item[key] : "";
    });
  });
  
  sheet.getRange(2, 1, values.length, headers.length).setValues(values);
}
`;
