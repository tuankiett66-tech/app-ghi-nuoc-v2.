/**
 * GOOGLE APPS SCRIPT V4.6 - HỆ THỐNG QUẢN LÝ TIỀN NƯỚC
 * Tự động sao lưu lịch sử 2 Bộ TRƯỚC KHI cập nhật dữ liệu Kỳ mới (Reset chỉ số).
 */

var SHEET_KEYS = {
  LIST1: ["LIST1", "B001", "BỘ 01", "DANH BỘ 1", "DANHBO1"],
  LIST2: ["LIST2", "B002", "BỘ 02", "DANH BỘ 2", "DANHBO2"],
  CONFIG: ["CONFIG", "CAIDAT", "CẢI ĐẶT", "CAI DAT"]
};

function findSheet(ss, possibleNames) {
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    var name = sheets[i].getName().toUpperCase().trim();
    for (var j = 0; j < possibleNames.length; j++) {
      if (name === possibleNames[j].toUpperCase().trim()) {
        return sheets[i];
      }
    }
  }
  for (var i = 0; i < sheets.length; i++) {
    var name = sheets[i].getName().toUpperCase().trim();
    var keys = possibleNames;
    if (keys[0].toUpperCase().includes("LIST1") || keys[0].toUpperCase().includes("B001")) {
      if (name.includes("1") || name.includes("B001") || name.includes("BỘ 01") || name.includes("BỘ 1")) {
        return sheets[i];
      }
    }
    if (keys[0].toUpperCase().includes("LIST2") || keys[0].toUpperCase().includes("B002")) {
      if (name.includes("2") || name.includes("B002") || name.includes("BỘ 02") || name.includes("BỘ 2")) {
        return sheets[i];
      }
    }
    if (keys[0].toUpperCase().includes("CONFIG") || keys[0].toUpperCase().includes("CAI DAT")) {
      if (name.includes("CONFIG") || name.includes("CAI DAT") || name.includes("CAIDAT") || name.includes("CẢI ĐẶT")) {
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
      
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
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
        throw new Error("Không tìm thấy trang tính Danh bộ 1 hoặc Danh bộ 2 trong Google Sheets.");
      }
      
      // 1. TỰ ĐỘNG SAO LƯU LỊCH SỬ TRƯỚC KHI GHI ĐÈ DỮ LIỆU KỲ MỚI
      if (postData.archive_suffix) {
        const suffix = postData.archive_suffix;
        archiveSheet(ss, sheet1, "LichSu_Bộ01_" + suffix);
        archiveSheet(ss, sheet2, "LichSu_Bộ02_" + suffix);
      }

      // 2. Cập nhật cấu hình chung
      updateConfig(findSheet(ss, SHEET_KEYS.CONFIG), postData.config);
      
      // 3. Ghi dữ liệu mới nhất (đã reset cho kỳ mới) lên 2 trang tính làm việc chính
      const count1 = updateOrInsertData(sheet1, postData.list1);
      const count2 = updateOrInsertData(sheet2, postData.list2);
      
      if (postData.archive_suffix) {
        return ContentService.createTextOutput(JSON.stringify({
          status: "success", 
          message: "Đã sao lưu lịch sử [" + postData.archive_suffix + "] và Reset mở kỳ mới thành công!"
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
      return ContentService.createTextOutput(JSON.stringify({
        status: "success", 
        message: "Đồng bộ dữ liệu thành công! (" + count1 + " hộ Bộ 1, " + count2 + " hộ Bộ 2)"
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({status: "error", message: "Hành động không hợp lệ"}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({status: "error", message: err.message}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getSheetData(sheet) {
  if (!sheet) return [];
  
  var maxCols = sheet.getMaxColumns();
  if (maxCols < 18) {
    sheet.insertColumnsAfter(maxCols, 18 - maxCols);
  }
  
  var data = sheet.getDataRange().getValues();
  if (data.length < 5) return [];
  
  var result = [];
  for (var i = 4; i < data.length; i++) {
    var row = data[i];
    if (!row[0] && !row[1]) continue;
    
    result.push({
      maKH: String(row[0] || "").replace(/^'/, ""),
      name: String(row[1] || ""),
      address: String(row[2] || "").replace(/^'/, ""),
      phoneTenant: String(row[3] || "").replace(/^'/, ""),
      newIndex: Number(row[4]) || 0,
      oldIndex: Number(row[5]) || 0,
      consumption: Number(row[6]) || 0,
      amount: Number(row[7]) || 0,
      oldDebt: Number(row[8]) || 0,
      paid: Number(row[9]) || 0,
      remainingDebt: Number(row[10]) || 0,
      isZalo: row[11] === true || String(row[11]).toUpperCase() === 'TRUE',
      isZaloFriend: row[12] === true || String(row[12]).toUpperCase() === 'TRUE',
      isProcessed: row[13] === true || String(row[13]).toUpperCase() === 'TRUE',
      installDate: String(row[14] || ""),
      updatedAt: Number(row[15]) || 0,
      note: String(row[16] || "").replace(/^'/, ""),
      isSubMeter: row[17] === true || String(row[17]).toUpperCase() === 'TRUE'
    });
  }
  return result;
}

function updateOrInsertData(sheet, dataToUpdate) {
  if (!sheet || !dataToUpdate) return 0;
  
  var maxCols = sheet.getMaxColumns();
  if (maxCols < 18) {
    sheet.insertColumnsAfter(maxCols, 18 - maxCols);
  }
  
  try {
    var headerCell = sheet.getRange(4, 18);
    headerCell.setValue("Đồng hồ phụ");
  } catch(e) {}
  
  var lastRow = sheet.getLastRow();
  if (lastRow >= 5) {
    sheet.getRange(5, 1, lastRow - 4, 18).clearContent();
  }
  
  if (dataToUpdate.length === 0) return 0;
  
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
      item.note || "",                // Cột Q: Ghi chú
      item.isSubMeter === true        // Cột R: Đồng hồ phụ (Checkbox)
    ];
  });
  
  sheet.getRange(5, 1, values.length, 18).setValues(values);
  return dataToUpdate.length;
}

function archiveSheet(ss, sourceSheet, targetName) {
  if (!sourceSheet) return;
  
  var oldSheet = ss.getSheetByName(targetName);
  if (oldSheet) {
    try {
      ss.deleteSheet(oldSheet);
    } catch (e) {
      // Bỏ qua nếu không xóa được
    }
  }
  
  var archivedSheet = sourceSheet.copyTo(ss);
  archivedSheet.setName(targetName);
  
  try {
    archivedSheet.setTabColor("#7f8c8d");
  } catch (e) {}
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
