/**
 * POST /api/admin/email/send-tracking
 * Send tracking email to customer
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

    const trackingNumber = order.rowData[COLUMNS.TRACKING_NUMBER];
    if (!trackingNumber) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'No tracking number. Add tracking first.' },
      });
    }

    const trackingStatus = order.rowData[COLUMNS.TRACKING_EMAIL_STATUS];
    if (trackingStatus === 'SENT' && !forceResend) {
      return res.status(400).json({
        success: false,
        error: { code: 'CONFLICT', message: 'Tracking email already sent. Use forceResend=true.' },
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
    const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_WEB_APP_URL;
    if (APPS_SCRIPT_URL) {
      try {
        await fetch(APPS_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'sendTrackingEmail',
            orderId,
            sheetName: order.sheetName,
            rowIndex: order.rowIndex,
          }),
        });
      } catch (err) {
        console.error('[Admin] Apps Script error:', err.message);
      }
    }

    // Update status
    await updateCell(order.sheetName, order.rowIndex, COLUMNS.TRACKING_EMAIL_STATUS, 'SENT');

    await appendAuditLog({
      username: user.username,
      role: user.role,
      action: 'SEND_TRACKING_EMAIL',
      orderId,
      before: { trackingStatus },
      after: { trackingStatus: 'SENT', trackingNumber },
      result: 'SUCCESS',
      ip: getClientIP(req),
    });

    await addUserTrace(user.username, `Sent tracking email for ${orderId}`);

    return res.status(200).json({
      success: true,
      result: {
        orderId,
        customerEmail,
        trackingNumber,
        trackingUrl: `https://www.lbc.com.ph/tracking?tracking_no=${trackingNumber}`,
        status: 'SENT',
      },
    });

  } catch (error) {
    console.error('[Admin] Send tracking error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL', message: 'Failed to send tracking email' },
    });
  }
};
