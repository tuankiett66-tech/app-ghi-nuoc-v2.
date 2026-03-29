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
  let sheetData = sheet.getDataRange().getValues();
  let updatedCount = 0;
  
  dataToUpdate.forEach(function(item) {
    const targetMaKH = String(item.maKH).trim();
    let found = false;
    
    // Tìm dòng cũ để cập nhật
    for (var i = 4; i < sheetData.length; i++) {
      if (String(sheetData[i][0]).trim() === targetMaKH) {
        var rowNum = i + 1;
        writeRow(sheet, rowNum, item);
        found = true;
        updatedCount++;
        break;
      }
    }
    
    // Nếu không thấy thì chèn dòng mới vào cuối
    if (!found) {
      var currentLastRow = sheet.getLastRow();
      if (currentLastRow < 4) currentLastRow = 4;
      var newRowNum = currentLastRow + 1;
      sheet.getRange(newRowNum, 1).setValue(targetMaKH); // Cột A: Mã KH
      writeRow(sheet, newRowNum, item);
      updatedCount++;
    }
  });
  return updatedCount;
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
