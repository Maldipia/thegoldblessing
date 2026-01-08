/**
 * TGB Google Sheets Helper
 * Order operations and audit logging
 */

const { google } = require('googleapis');

// TGB ORDER spreadsheet
const ORDER_SPREADSHEET_ID = process.env.TGB_SPREADSHEET_ID || '1YnkcqUy0osdaZbt2LGXQDWLpKiWdC0W0JB6Zfe02Oe0';

// Sheet tabs
const SHEETS = {
  STRAIGHT_PAYMENT: 'STRAIGHT PAYMENT',
  COD: 'COD',
  COP: 'COP',
  LAY_AWAY: 'LAY AWAY',
  WALK_IN: 'WALK IN',
  AUDIT_LOG: 'AUDIT_LOG',
};

// Column indexes (0-based)
const COLUMNS = {
  DATE: 0,           // A
  EMAIL: 1,          // B
  ORDER_ID: 2,       // C
  FB_NAME: 3,        // D
  RECEIVER_NAME: 4,  // E
  ADDRESS: 5,        // F
  CONTACT: 6,        // G
  PAYMENT_METHOD: 7, // H
  PAYMENT_STATUS: 13, // N
  INVOICE_LINK: 14,   // O
  INVOICE_STATUS: 15, // P
  TRACKING_NUMBER: 16, // Q
  TRACKING_EMAIL_STATUS: 17, // R
};

/**
 * Get authenticated Sheets client
 */
async function getSheetsClient() {
  // Parse GOOGLE_CREDENTIALS JSON (same format as existing API)
  let credentials;
  try {
    credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
  } catch (e) {
    console.error('[Sheets] Failed to parse GOOGLE_CREDENTIALS:', e.message);
    throw new Error('Invalid GOOGLE_CREDENTIALS');
  }
  
  const auth = new google.auth.GoogleAuth({
    credentials: credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

/**
 * Find order by ID across all sheets
 */
async function findOrderById(orderId) {
  const sheets = await getSheetsClient();
  const sheetNames = [SHEETS.STRAIGHT_PAYMENT, SHEETS.COD, SHEETS.COP, SHEETS.LAY_AWAY, SHEETS.WALK_IN];

  for (const sheetName of sheetNames) {
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: ORDER_SPREADSHEET_ID,
        range: `'${sheetName}'!A:AZ`,
      });

      const rows = response.data.values || [];
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][COLUMNS.ORDER_ID] === orderId) {
          return {
            sheetName,
            rowIndex: i + 1,
            rowData: rows[i],
          };
        }
      }
    } catch (error) {
      console.error(`[Sheets] Error reading ${sheetName}:`, error.message);
    }
  }
  return null;
}

/**
 * Update a specific cell
 */
async function updateCell(sheetName, rowIndex, colIndex, value) {
  const sheets = await getSheetsClient();
  const colLetter = String.fromCharCode(65 + colIndex);
  const range = `'${sheetName}'!${colLetter}${rowIndex}`;

  await sheets.spreadsheets.values.update({
    spreadsheetId: ORDER_SPREADSHEET_ID,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[value]] },
  });
}

/**
 * Append to audit log
 */
async function appendAuditLog(entry) {
  const sheets = await getSheetsClient();
  const now = new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' });
  
  const row = [
    now,                              // timestamp
    entry.username || '',             // username
    entry.role || '',                 // role
    entry.action || '',               // action
    entry.orderId || '',              // order ID
    JSON.stringify(entry.before || {}),
    JSON.stringify(entry.after || {}),
    entry.result || '',
    entry.ip || '',
    JSON.stringify(entry.meta || {}),
  ];

  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: ORDER_SPREADSHEET_ID,
      range: `'${SHEETS.AUDIT_LOG}'!A:J`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [row] },
    });
    return true;
  } catch (error) {
    console.error('[Sheets] Audit log error:', error.message);
    return false;
  }
}

/**
 * Verify email matches order
 */
async function verifyOrderEmail(orderId, providedEmail) {
  const order = await findOrderById(orderId);
  if (!order) return { valid: false, reason: 'ORDER_NOT_FOUND' };

  const orderEmail = (order.rowData[COLUMNS.EMAIL] || '').toLowerCase().trim();
  const checkEmail = (providedEmail || '').toLowerCase().trim();

  if (!orderEmail) return { valid: false, reason: 'NO_EMAIL_ON_ORDER' };
  if (orderEmail !== checkEmail) return { valid: false, reason: 'EMAIL_MISMATCH' };

  return { valid: true, order };
}

/**
 * Get all orders
 */
async function getAllOrders() {
  const sheets = await getSheetsClient();
  const sheetNames = [SHEETS.STRAIGHT_PAYMENT, SHEETS.COD, SHEETS.COP, SHEETS.LAY_AWAY, SHEETS.WALK_IN];
  let allOrders = [];

  for (const sheetName of sheetNames) {
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: ORDER_SPREADSHEET_ID,
        range: `'${sheetName}'!A:AZ`,
      });

      const rows = response.data.values || [];
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][COLUMNS.ORDER_ID]) {
          allOrders.push({
            orderId: rows[i][COLUMNS.ORDER_ID],
            date: rows[i][COLUMNS.DATE],
            customer: rows[i][COLUMNS.FB_NAME] || rows[i][COLUMNS.RECEIVER_NAME],
            email: rows[i][COLUMNS.EMAIL],
            method: sheetName,
            status: rows[i][COLUMNS.PAYMENT_STATUS] || 'PENDING',
            invoiceLink: rows[i][COLUMNS.INVOICE_LINK],
            invoiceStatus: rows[i][COLUMNS.INVOICE_STATUS],
            trackingNumber: rows[i][COLUMNS.TRACKING_NUMBER],
            trackingStatus: rows[i][COLUMNS.TRACKING_EMAIL_STATUS],
            _row: rows[i],
            _sheet: sheetName,
            _rowIndex: i + 1,
          });
        }
      }
    } catch (err) {
      console.error(`[Sheets] Error reading ${sheetName}:`, err.message);
    }
  }
  return allOrders;
}

module.exports = {
  getSheetsClient,
  findOrderById,
  updateCell,
  appendAuditLog,
  verifyOrderEmail,
  getAllOrders,
  ORDER_SPREADSHEET_ID,
  SHEETS,
  COLUMNS,
};
