/**
 * POST /api/admin/layaway/record-payment
 * Record LayAway payment
 * Role: ADMIN, SUP, OWNER (NOT STAFF - financial action)
 */

const { requireRole, getClientIP, setCorsHeaders } = require('../../lib/auth-middleware');
const { findOrderById, appendAuditLog, getSheetsClient, ORDER_SPREADSHEET_ID } = require('../../lib/sheets-helper');
const { addUserTrace } = require('../../lib/sheets-auth');

module.exports = async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: { code: 'METHOD_NOT_ALLOWED' } });
  }

  // ADMIN or higher (NOT STAFF)
  const user = requireRole(req, res, 'ADMIN');
  if (!user) return;

  try {
    const { orderId, amount, paidAt, proofLink, reference, notes } = req.body;

    if (!orderId || !amount || !proofLink || !reference) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'orderId, amount, proofLink, reference required' },
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Amount must be positive' },
      });
    }

    const order = await findOrderById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Order not found' },
      });
    }

    if (order.sheetName !== 'LAY AWAY') {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Not a LayAway order' },
      });
    }

    // Append to LAYAWAY_PAYMENTS sheet
    const sheets = await getSheetsClient();
    const now = new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' });

    await sheets.spreadsheets.values.append({
      spreadsheetId: ORDER_SPREADSHEET_ID,
      range: "'LAYAWAY_PAYMENTS'!A:I",
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          now,
          orderId,
          amountNum,
          paidAt || now,
          proofLink,
          reference,
          notes || '',
          user.username,
          user.role,
        ]],
      },
    });

    await appendAuditLog({
      username: user.username,
      role: user.role,
      action: 'LAYAWAY_RECORD_PAYMENT',
      orderId,
      before: {},
      after: { amount: amountNum, reference, proofLink },
      result: 'SUCCESS',
      ip: getClientIP(req),
      meta: { paidAt, notes },
    });

    await addUserTrace(user.username, `Recorded ₱${amountNum.toLocaleString()} payment for ${orderId}`);

    return res.status(200).json({
      success: true,
      result: {
        orderId,
        amount: amountNum,
        reference,
        recordedBy: user.username,
        recordedAt: now,
      },
    });

  } catch (error) {
    console.error('[Admin] Record payment error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL', message: 'Failed to record payment' },
    });
  }
};
