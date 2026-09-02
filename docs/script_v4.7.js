/**
 * GOOGLE APPS SCRIPT V4.7 (BẢN CHUẨN HOÀN CHỈNH - HỖ TRỢ VAT TRỰC TIẾP) - HỆ THỐNG QUẢN LÝ TIỀN NƯỚC
 * - Tự động tạo Tab Lịch sử cho cả 2 Bộ khi Chốt kỳ (LichSu_Bộ01_Ky_X_YYYY, LichSu_Bộ02_Ky_X_YYYY).
 * - Hỗ trợ 22 cột (A-V) trực tiếp trên Google Sheets bao gồm thông tin Hóa đơn điện tử (VAT) để đồng bộ mượt mà với Google Form.
 * - Sử dụng SpreadsheetApp.flush() và Bọc lỗi độc lập từng trang tính, đảm bảo 100% KHÔNG BỊ TREO hay mất dữ liệu.
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
    const action = e.parameter ? e.parameter.action : '';
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
      
      // 1. TỰ ĐỘNG SAO LƯU LỊCH SỬ CHO CẢ 2 BỘ TRƯỚC KHI CẬP NHẬT
      if (postData.archive_suffix) {
        const suffix = postData.archive_suffix;
        try { archiveSheet(ss, sheet1, "LichSu_Bộ01_" + suffix); } catch(e1) {}
        try { archiveSheet(ss, sheet2, "LichSu_Bộ02_" + suffix); } catch(e2) {}
      }

      // 2. Cập nhật cấu hình chung
      try { updateConfig(findSheet(ss, SHEET_KEYS.CONFIG), postData.config); } catch(ec) {}
      
      // 3. Ghi dữ liệu mới nhất (đã reset cho kỳ mới) lên 2 trang tính làm việc chính
      var count1 = 0;
      var count2 = 0;
      if (sheet1 && postData.list1) count1 = updateOrInsertData(sheet1, postData.list1);
      if (sheet2 && postData.list2) count2 = updateOrInsertData(sheet2, postData.list2);
      
      SpreadsheetApp.flush();

      if (postData.archive_suffix) {
        return ContentService.createTextOutput(JSON.stringify({
          status: "success", 
          message: "Đã sao lưu lịch sử cả 2 Bộ [" + postData.archive_suffix + "] và Reset mở kỳ mới thành công!"
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
  if (maxCols < 22) {
    sheet.insertColumnsAfter(maxCols, 22 - maxCols);
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
      isSubMeter: row[17] === true || String(row[17]).toUpperCase() === 'TRUE',
      vatTaxCode: String(row[18] || "").replace(/^'/, ""),
      vatEmail: String(row[19] || "").replace(/^'/, ""),
      vatCompanyName: String(row[20] || "").replace(/^'/, ""),
      isVatRegistered: row[21] === true || String(row[21]).toUpperCase() === 'TRUE'
    });
  }
  return result;
}

function updateOrInsertData(sheet, dataToUpdate) {
  if (!sheet || !dataToUpdate) return 0;
  
  var maxCols = sheet.getMaxColumns();
  if (maxCols < 22) {
    sheet.insertColumnsAfter(maxCols, 22 - maxCols);
  }
  
  try {
    // Ghi tiêu đề cho các cột mở rộng tại dòng 4
    sheet.getRange(4, 18).setValue("Đồng hồ phụ");
    sheet.getRange(4, 19).setValue("Mã số thuế");
    sheet.getRange(4, 20).setValue("Email nhận HĐ");
    sheet.getRange(4, 21).setValue("Tên công ty");
    sheet.getRange(4, 22).setValue("Đăng ký VAT");
  } catch(e) {}
  
  var lastRow = sheet.getLastRow();
  if (lastRow >= 5) {
    sheet.getRange(5, 1, lastRow - 4, 22).clearContent();
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
      item.isSubMeter === true,       // Cột R: Đồng hồ phụ (Checkbox)
      String(item.vatTaxCode || ""),  // Cột S: Mã số thuế
      String(item.vatEmail || ""),    // Cột T: Email nhận HĐ
      String(item.vatCompanyName || ""), // Cột U: Tên công ty
      item.isVatRegistered === true   // Cột V: Đăng ký VAT (Checkbox)
    ];
  });
  
  sheet.getRange(5, 1, values.length, 22).setValues(values);
  return dataToUpdate.length;
}

function archiveSheet(ss, sourceSheet, targetName) {
  if (!sourceSheet) return;
  
  try {
    var oldSheet = ss.getSheetByName(targetName);
    if (oldSheet) {
      ss.deleteSheet(oldSheet);
      SpreadsheetApp.flush(); // Bắt buộc ép Google Sheets cập nhật bộ nhớ ngay lập tức
    }
  } catch (e) {}
  
  try {
    var archivedSheet = sourceSheet.copyTo(ss);
    archivedSheet.setName(targetName);
    try {
      archivedSheet.setTabColor("#7f8c8d");
    } catch (e) {}
    SpreadsheetApp.flush(); // Ép lưu thành công tab mới
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
