/**
 * GOOGLE APPS SCRIPT V4.5 - HỆ THỐNG QUẢN LÝ TIỀN NƯỚC
 * Tự động đồng bộ 18 cột (bao gồm Đồng hồ phụ), lưu lịch sử cả 2 Bộ khi Chốt Kỳ.
 *
 * HƯỚNG DẪN LẮP ĐẶT:
 * 1. Mở trang Google Sheets của bạn -> Chọn menu "Công cụ" (Tools) -> "Apps Script" (hoặc Extension -> Apps Script).
 * 2. Xóa toàn bộ mã cũ trong cửa sổ Code.gs.
 * 3. Dán toàn bộ mã nguồn bên dưới vào và bấm biểu tượng Đĩa đệm (Lưu / Ctrl+S).
 * 4. Bấm nút "Triển khai" (Deploy) màu xanh góc trên phải -> Chọn "Tùy chọn triển khai mới" (New deployment).
 * 5. Chọn loại "Ứng dụng web" (Web App).
 * 6. Tùy chọn "Người có quyền truy cập" (Who has access): Chọn "BẤT KỲ AI" (ANYONE) - RẤT QUAN TRỌNG!
 * 7. Bấm "Triển khai" (Deploy) -> Cấp quyền cho Script nếu được hỏi -> Copy URL Ứng dụng Web dán vào mục Cài đặt App.
 */

var SHEET_KEYS = {
  LIST1: ["LIST1", "BO01", "BỘ 01", "DANH BỘ 1", "DANHBO1"],
  LIST2: ["LIST2", "BO02", "BỘ 02", "DANH BỘ 2", "DANHBO2"],
  CONFIG: ["CONFIG", "CAIDAT", "CÀI ĐẶT", "CAI DAT"]
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
    if (keys[0].toUpperCase().includes("LIST1") || keys[0].toUpperCase().includes("BO01")) {
      if (name.includes("1") || name.includes("BO01") || name.includes("BỘ 01") || name.includes("BỘ 1")) {
        return sheets[i];
      }
    }
    if (keys[0].toUpperCase().includes("LIST2") || keys[0].toUpperCase().includes("BO02")) {
      if (name.includes("2") || name.includes("BO02") || name.includes("BỘ 02") || name.includes("BỘ 2")) {
        return sheets[i];
      }
    }
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
          message: "Không tìm thấy trang tính Danh bộ 1 hoặc Danh bộ 2 trong Google Sheets. Vui lòng kiểm tra lại tên trang tính."
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
        throw new Error("Không tìm thấy trang tính Danh bộ 1 hoặc Danh bộ 2 trong Google Sheets.");
      }
      
      // 1. Cập nhật cấu hình chung
      updateConfig(findSheet(ss, SHEET_KEYS.CONFIG), postData.config);
      
      // 2. Ghi dữ liệu mới nhất lên 2 trang tính làm việc chính
      const count1 = updateOrInsertData(sheet1, postData.list1);
      const count2 = updateOrInsertData(sheet2, postData.list2);
      
      // 3. Tự động lưu trữ Lịch sử sang trang tính riêng khi Chốt Kỳ
      if (postData.archive_suffix) {
        const suffix = postData.archive_suffix;
        archiveSheet(ss, sheet1, "LichSu_Bộ01_" + suffix);
        archiveSheet(ss, sheet2, "LichSu_Bộ02_" + suffix);
        
        return ContentService.createTextOutput(JSON.stringify({
          status: "success", 
          message: "Đã tự động sao lưu lịch sử [" + suffix + "] cho cả Bộ 1 và Bộ 2 lên Google Sheets!"
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
  
  const data = sheet.getDataRange().getValues();
  const rows = [];
  if (data.length < 5) return [];
  for (var i = 4; i < data.length; i++) {
    var row = data[i];
    var maKH = String(row[0] || "").trim();
    if (!maKH || maKH === "0" || maKH.toUpperCase().includes("CỘNG")) continue;
    
    var rawZalo = row.length > 11 ? row[11] : false;
    var zaloVal = String(rawZalo || "").toUpperCase();
    var isZalo = zaloVal === "X" || zaloVal === "F" || rawZalo === true || zaloVal === "TRUE";
    
    var rawZaloFriend = row.length > 12 ? row[12] : false;
    var zaloFriendVal = String(rawZaloFriend || "").toUpperCase();
    var isZaloFriend = zaloFriendVal === "F" || rawZaloFriend === true || zaloFriendVal === "TRUE";
    
    var rawProcessed = row.length > 13 ? row[13] : false;
    var processedVal = String(rawProcessed || "").toUpperCase();
    var isProcessed = rawProcessed === true || processedVal === "TRUE" || processedVal === "X";
    
    var installDate = (row.length > 14 && row[14]) ? String(row[14]) : "";
    var updatedAt = (row.length > 15 && row[15]) ? Number(row[15]) : 0;
    var note = (row.length > 16 && row[16]) ? String(row[16]) : "";

    var rawSubMeter = row.length > 17 ? row[17] : false;
    var subMeterVal = String(rawSubMeter || "").toUpperCase();
    var isSubMeter = rawSubMeter === true || subMeterVal === "TRUE" || subMeterVal === "X";
    
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
      note: note,
      isSubMeter: isSubMeter
    });
  }
  return rows;
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
      var oldData = oldSheet.getDataRange().getValues();
      var sourceData = sourceSheet.getDataRange().getValues();
      
      var oldHasReadings = false;
      for (var i = 4; i < oldData.length; i++) {
        if (Number(oldData[i][4] || 0) > 0) {
          oldHasReadings = true;
          break;
        }
      }
      
      var sourceHasReadings = false;
      for (var j = 4; j < sourceData.length; j++) {
        if (Number(sourceData[j][4] || 0) > 0) {
          sourceHasReadings = true;
          break;
        }
      }
      
      if (oldHasReadings && !sourceHasReadings) {
        return;
      }
      
      ss.deleteSheet(oldSheet);
    } catch (e) {
      // Bỏ qua lỗi xóa sheet
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
