/**
 * Paste into Extensions > Apps Script on the Google Sheet that should collect orders,
 * then deploy it as a Web App (see scripts/README-orders-sheet.md for the exact steps).
 * Every checkout on the site sends one JSON order here; this appends one row per order.
 */

var SHEET_NAME = "Orders";

var HEADERS = [
  "Order ID", "Date", "Name", "Phone", "City", "Address",
  "Items", "Total (MAD)", "Payment",
];

function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
  }

  var order = JSON.parse(e.postData.contents);
  var customer = order.customer || {};
  var itemsSummary = (order.items || [])
    .map(function (item) {
      return item.quantity + "x " + item.name + " (" + item.color + " / " + item.size + ")";
    })
    .join("; ");

  sheet.appendRow([
    order.id || "",
    order.createdAt || new Date().toISOString(),
    customer.name || "",
    customer.phone || "",
    customer.city || "",
    customer.address || "",
    itemsSummary,
    order.total || "",
    order.payment || "",
  ]);

  return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
}
