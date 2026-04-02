/**
 * GOOGLE APPS SCRIPT - HỆ THỐNG QUẢN LÝ NƯỚC TẬP TRUNG (V4.1)
 * Sửa lỗi: Tự động chèn dòng mới nếu Mã KH chưa tồn tại trên Sheet.
 * Cập nhật: Fix lỗi chèn nhiều dòng mới cùng lúc.
 */

const SHEET_KEYS = {
  LIST1: ["1_Danh bo 1", "Danh bo 1", "DANH BỘ 1"],
  LIST2: ["2_Danh bo 2", "Danh bo 2", "DANH BỘ 2"],
  CONFIG: ["3_Cai dat", "Cai dat", "CAI DAT"]
};

function findSheet(ss, keys) {
  for (var i = 0; i < keys.length; i++) {
    var sheet = ss.getSheetByName(keys[i]);
    if (sheet) return sheet;
  }
  return null;
}

function doGet(e) {
  const action = e.parameter.action;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (action === 'get_all') {
    return ContentService.createTextOutput(JSON.stringify({
      list1: getSheetData(findSheet(ss, SHEET_KEYS.LIST1)),
      list2: getSheetData(findSheet(ss, SHEET_KEYS.LIST2)),
      config: getConfigData(findSheet(ss, SHEET_KEYS.CONFIG))
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);
    const action = postData.action;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    if (action === 'update_all') {
      updateConfig(findSheet(ss, SHEET_KEYS.CONFIG), postData.config);
      const count1 = updateOrInsertData(findSheet(ss, SHEET_KEYS.LIST1), postData.list1);
      const count2 = updateOrInsertData(findSheet(ss, SHEET_KEYS.LIST2), postData.list2);
      
      return ContentService.createTextOutput(JSON.stringify({
        status: "success", 
        message: "Đã cập nhật/chèn mới tổng cộng " + (count1 + count2) + " hộ dân."
      })).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({status: "error", message: err.message}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getSheetData(sheet) {
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  const rows = [];
  if (data.length < 5) return [];
  for (var i = 4; i < data.length; i++) {
    var row = data[i];
    var maKH = String(row[0] || "").trim();
    if (!maKH || maKH === "0" || maKH.toUpperCase().includes("CỘNG")) continue;
    var rawZalo = row[11];
    var zaloVal = String(rawZalo || "").toUpperCase();
    rows.push({
      maKH: maKH, name: String(row[1] || ""), address: String(row[2] || ""),
      phoneTenant: String(row[3] || ""), newIndex: row[4], oldIndex: row[5],
      oldDebt: row[8], paid: row[9], 
      isZalo: zaloVal === "X" || zaloVal === "F" || rawZalo === true || zaloVal === "TRUE",
      isZaloFriend: zaloVal === "F",
      note: row[12] || ""
    });
  }
  return rows;
}

function updateOrInsertData(sheet, dataToUpdate) {
  if (!sheet || !dataToUpdate) return 0;
  
  // 1. Lấy toàn bộ dữ liệu hiện tại để xóa (từ dòng 5 trở đi)
  var lastRow = sheet.getLastRow();
  if (lastRow >= 5) {
    // Xóa nội dung từ cột A đến M (13 cột) để đảm bảo sạch sẽ trước khi ghi mới
    sheet.getRange(5, 1, lastRow - 4, 13).clearContent();
  }
  
  if (dataToUpdate.length === 0) return 0;
  
  // 2. Chuẩn bị mảng 2 chiều để ghi một lần (setValues) - Nhanh hơn gấp nhiều lần setValue từng ô
  // Dữ liệu gửi từ App đã được sắp xếp đúng thứ tự Mã KH
  var values = dataToUpdate.map(function(item) {
    var zaloVal = "";
    if (item.isZaloFriend === true) zaloVal = "F";
    else if (item.isZalo === true) zaloVal = "X";
    
    return [
      String(item.maKH || ""),      // Cột A: Mã KH
      String(item.name || ""),      // Cột B: Tên
      String(item.address || ""),   // Cột C: Địa chỉ
      String(item.phoneTenant || ""), // Cột D: SĐT
      item.newIndex || 0,           // Cột E: Chỉ số mới
      item.oldIndex || 0,           // Cột F: Chỉ số cũ
      item.consumption || 0,        // Cột G: Tiêu thụ
      item.amount || 0,             // Cột H: Thành tiền
      item.oldDebt || 0,            // Cột I: Nợ cũ
      item.paid || 0,               // Cột J: Đã trả
      item.remainingDebt || 0,      // Cột K: Còn nợ
      zaloVal,                      // Cột L: Zalo (X/F)
      item.note || ""               // Cột M: Ghi chú
    ];
  });
  
  // 3. Ghi toàn bộ dữ liệu xuống Sheet từ dòng 5
  sheet.getRange(5, 1, values.length, 13).setValues(values);
  
  // 4. Xử lý riêng cho cột Zalo nếu người dùng dùng Checkbox
  // (Tùy chọn: Nếu muốn hỗ trợ Checkbox thì cần quét range và setValue true/false, 
  // nhưng setValues chuỗi "X"/"F" là cách phổ biến và an toàn nhất)
  
  return dataToUpdate.length;
}

function writeRow(sheet, rowNum, item) {
  if (item.name !== undefined) sheet.getRange(rowNum, 2).setValue(item.name);
  if (item.address !== undefined) sheet.getRange(rowNum, 3).setValue(item.address);
  if (item.phoneTenant !== undefined) sheet.getRange(rowNum, 4).setValue(item.phoneTenant);
  if (item.newIndex !== undefined) sheet.getRange(rowNum, 5).setValue(item.newIndex);
  if (item.oldIndex !== undefined) sheet.getRange(rowNum, 6).setValue(item.oldIndex);
  if (item.consumption !== undefined) sheet.getRange(rowNum, 7).setValue(item.consumption);
  if (item.amount !== undefined) sheet.getRange(rowNum, 8).setValue(item.amount);
  if (item.oldDebt !== undefined) sheet.getRange(rowNum, 9).setValue(item.oldDebt);
  if (item.paid !== undefined) sheet.getRange(rowNum, 10).setValue(item.paid);
  if (item.remainingDebt !== undefined) sheet.getRange(rowNum, 11).setValue(item.remainingDebt);
  if (item.isZaloFriend !== undefined || item.isZalo !== undefined) {
    var range = sheet.getRange(rowNum, 12);
    var val = "";
    if (item.isZaloFriend === true) val = "F";
    else if (item.isZalo === true) val = "X";
    
    // Kiểm tra nếu ô là checkbox thì set true/false, nếu không thì set chuỗi
    try {
      var rule = range.getDataValidation();
      if (rule && rule.getCriteriaType() == SpreadsheetApp.DataValidationCriteria.CHECKBOX) {
        range.setValue(item.isZalo === true);
      } else {
        range.setValue(val);
      }
    } catch(e) {
      range.setValue(val);
    }
  }
  if (item.note !== undefined) sheet.getRange(rowNum, 13).setValue(item.note);
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
