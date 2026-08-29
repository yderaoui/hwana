/**
 * Paste into Extensions > Apps Script on the Google Sheet that should collect orders,
 * then deploy it as a Web App (see scripts/README-orders-sheet.md for the exact steps).
 * Every checkout on the site sends one JSON order here. One row is appended PER ITEM
 * (so a 3-item order becomes 3 rows) — order/customer fields repeat on each row, and
 * each row gets its own product photo rendered inline via =IMAGE().
 */

var SHEET_NAME = "Orders";
var IMAGE_COLUMN = 7; // "Image" — column G

var HEADERS = [
  "Order ID", "Date", "Name", "Phone", "City", "Address",
  "Image", "Product", "Color", "Size", "Qty",
  "Unit Price (MAD)", "Line Total (MAD)", "Order Total (MAD)", "Payment",
];

function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(IMAGE_COLUMN, 90);
  }

  var order = JSON.parse(e.postData.contents);
  var customer = order.customer || {};
  var items = (order.items && order.items.length) ? order.items : [{}];

  items.forEach(function (item) {
    sheet.appendRow([
      order.id || "",
      order.createdAt || new Date().toISOString(),
      customer.name || "",
      customer.phone || "",
      customer.city || "",
      customer.address || "",
      "", // image cell — filled in below with a real =IMAGE() formula, not a plain value
      item.name || "",
      item.color || "",
      item.size || "",
      item.quantity || "",
      item.unitPrice || "",
      item.lineTotal || "",
      order.total || "",
      order.payment || "",
    ]);

    var lastRow = sheet.getLastRow();
    if (item.image) {
      sheet.getRange(lastRow, IMAGE_COLUMN).setFormula('=IMAGE("' + item.image + '", 4, 80, 80)');
    }
    sheet.setRowHeight(lastRow, 84);
  });

  return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
}
