/**
 * POST /api/admin/email/send-invoice
 * Send invoice email to customer
 * Role: STAFF, ADMIN, SUP, OWNER
 */

const { requireRole, getClientIP, setCorsHeaders } = require('../../lib/auth-middleware');
const { findOrderById, updateCell, appendAuditLog, COLUMNS } = require('../../lib/sheets-helper');
const { addUserTrace } = require('../../lib/sheets-auth');

module.exports = async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: { code: 'METHOD_NOT_ALLOWED' } });
  }

  const user = requireRole(req, res, 'STAFF');
  if (!user) return;

  try {
    const { orderId, forceResend = false } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'orderId required' },
      });
    }

    const order = await findOrderById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Order not found' },
      });
    }

    const invoiceLink = order.rowData[COLUMNS.INVOICE_LINK];
    if (!invoiceLink) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'No invoice created. Create invoice first.' },
      });
    }

    const invoiceStatus = order.rowData[COLUMNS.INVOICE_STATUS];
    if (invoiceStatus === 'SENT' && !forceResend) {
      return res.status(400).json({
        success: false,
        error: { code: 'CONFLICT', message: 'Invoice already sent. Use forceResend=true to resend.' },
      });
    }

    const customerEmail = order.rowData[COLUMNS.EMAIL];
    if (!customerEmail || !customerEmail.includes('@')) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid customer email' },
      });
    }

    // Call Apps Script if configured
    let emailResult = { sent: false, method: 'pending' };
    const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_WEB_APP_URL;
    
    if (APPS_SCRIPT_URL) {
      try {
        const response = await fetch(APPS_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'sendInvoiceEmail',
            orderId,
            sheetName: order.sheetName,
            rowIndex: order.rowIndex,
          }),
        });
        const result = await response.json();
        emailResult = { sent: result.success, method: 'apps_script' };
      } catch (err) {
        emailResult = { sent: false, method: 'apps_script', error: err.message };
      }
    }

    // Update status
    await updateCell(order.sheetName, order.rowIndex, COLUMNS.INVOICE_STATUS, 'SENT');

    await appendAuditLog({
      username: user.username,
      role: user.role,
      action: 'SEND_INVOICE_EMAIL',
      orderId,
      before: { invoiceStatus },
      after: { invoiceStatus: 'SENT', customerEmail },
      result: 'SUCCESS',
      ip: getClientIP(req),
      meta: { forceResend },
    });

    await addUserTrace(user.username, `Sent invoice email for ${orderId} to ${customerEmail}`);

    return res.status(200).json({
      success: true,
      result: { orderId, customerEmail, invoiceLink, status: 'SENT' },
    });

  } catch (error) {
    console.error('[Admin] Send invoice error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL', message: 'Failed to send invoice' },
    });
  }
};
