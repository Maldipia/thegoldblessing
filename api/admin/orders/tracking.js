/**
 * POST /api/admin/orders/tracking
 * Add/update tracking number
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
    const { orderId, trackingNumber, courier = 'LBC' } = req.body;

    if (!orderId || !trackingNumber) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'orderId and trackingNumber required' },
      });
    }

    const cleanTracking = trackingNumber.trim();
    if (cleanTracking.length < 5 || cleanTracking.length > 50) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid tracking number' },
      });
    }

    const order = await findOrderById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Order not found' },
      });
    }

    const previousTracking = order.rowData[COLUMNS.TRACKING_NUMBER] || '';
    await updateCell(order.sheetName, order.rowIndex, COLUMNS.TRACKING_NUMBER, cleanTracking);

    await appendAuditLog({
      username: user.username,
      role: user.role,
      action: 'TRACKING_SET',
      orderId,
      before: { tracking: previousTracking },
      after: { tracking: cleanTracking, courier },
      result: 'SUCCESS',
      ip: getClientIP(req),
    });

    await addUserTrace(user.username, `Set tracking for ${orderId}: ${cleanTracking}`);

    return res.status(200).json({
      success: true,
      result: {
        orderId,
        trackingNumber: cleanTracking,
        courier,
        trackingUrl: `https://www.lbc.com.ph/tracking?tracking_no=${cleanTracking}`,
      },
    });

  } catch (error) {
    console.error('[Admin] Tracking update error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL', message: 'Failed to update tracking' },
    });
  }
};
