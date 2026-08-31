/**
 * Paste into Extensions > Apps Script on the Google Sheet that should collect orders,
 * then deploy it as a Web App (see scripts/README-orders-sheet.md for the exact steps).
 * Every checkout on the site sends one JSON order here. One row is appended PER ITEM
 * (so a 3-item order becomes 3 rows) — order/customer fields repeat on each row, and
 * each row gets its own product photo rendered inline via =IMAGE().
 */

var SHEET_NAME = "Orders";
var SCRIPT_VERSION = "2026-08-31-1";
var IMAGE_COLUMN = 7; // "Image" — column G

var HEADERS = [
  "Order ID", "Date", "Name", "Phone", "City", "Address",
  "Image", "Product", "Color", "Size", "Barcode", "Qty",
  "Unit Price (MAD)", "Line Total (MAD)", "Order Total (MAD)", "Payment",
];

function doGet() {
  return jsonResponse({
    ok: true,
    service: "hawana-orders",
    version: SCRIPT_VERSION,
    sheet: SHEET_NAME,
    headers: HEADERS,
  });
}

function doPost(e) {
  var lock = LockService.getDocumentLock();
  lock.waitLock(10000);
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(SHEET_NAME);
    }
    ensureHeaders(sheet);

    var order = parseOrderPayload(e);
    if (!order.id) throw new Error("Missing order id");
    if (orderExists(sheet, order.id)) {
      return jsonResponse({ ok: true, duplicate: true, id: order.id, version: SCRIPT_VERSION });
    }

    var customer = order.customer || {};
    var items = (order.items && order.items.length) ? order.items : [{}];

    items.forEach(function (item) {
      sheet.appendRow([
        safeText(order.id),
        safeText(order.createdAt || new Date().toISOString()),
        safeText(customer.name),
        safeText(customer.phone),
        safeText(customer.city),
        safeText(customer.address),
        "", // image cell — filled in below with a real =IMAGE() formula, not a plain value
        safeText(item.name),
        safeText(item.color),
        safeText(item.size),
        safeText(item.barcode),
        safeNumber(item.quantity),
        safeNumber(item.unitPrice),
        safeNumber(item.lineTotal),
        safeNumber(order.total),
        safeText(order.payment),
      ]);

      var lastRow = sheet.getLastRow();
      var imageUrl = safeImageUrl(item.image);
      if (imageUrl) {
        sheet.getRange(lastRow, IMAGE_COLUMN).setFormula('=IMAGE("' + imageUrl + '", 4, 80, 80)');
      }
      sheet.setRowHeight(lastRow, 84);
    });

    return jsonResponse({ ok: true, id: order.id, rows: items.length, version: SCRIPT_VERSION });
  } catch (error) {
    return jsonResponse({
      ok: false,
      error: String(error && error.message ? error.message : error),
      version: SCRIPT_VERSION,
    });
  } finally {
    lock.releaseLock();
  }
}

function parseOrderPayload(e) {
  var raw = (e && e.postData && e.postData.contents) || "";
  if (!raw && e && e.parameter && e.parameter.payload) {
    raw = e.parameter.payload;
  }
  return JSON.parse(raw || "{}");
}

function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}

function orderExists(sheet, orderId) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;
  var values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  return values.some(function (row) {
    return String(row[0]) === String(orderId);
  });
}

function safeText(value) {
  var text = String(value || "").trim();
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function safeNumber(value) {
  var number = Number(value);
  return isFinite(number) ? number : "";
}

function safeImageUrl(value) {
  var url = String(value || "").trim().replace(/"/g, "%22");
  return /^https?:\/\//i.test(url) ? url : "";
}

// Forces row 1 to match HEADERS exactly, every single call. Self-healing: works whether
// the sheet is brand new, already has data, or has stale headers from an older version
// of this script — no manual sheet surgery ever required after a schema change.
function ensureHeaders(sheet) {
  var headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
  var current = sheet.getLastRow() >= 1 ? headerRange.getValues()[0] : [];
  var matches = current.length === HEADERS.length && current.every(function (value, index) {
    return value === HEADERS[index];
  });
  if (matches) return;

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
  } else {
    sheet.insertRowBefore(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  }
  sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
  sheet.setFrozenRows(1);
  sheet.setColumnWidth(IMAGE_COLUMN, 90);
}
