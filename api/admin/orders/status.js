/**
 * POST /api/admin/orders/status
 * Update order status
 * Role: STAFF, ADMIN, SUP, OWNER
 */

const { requireRole, getClientIP, setCorsHeaders } = require('../../lib/auth-middleware');
const { findOrderById, updateCell, appendAuditLog, COLUMNS } = require('../../lib/sheets-helper');
const { addUserTrace } = require('../../lib/sheets-auth');

const VALID_STATUSES = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'PAID'];

module.exports = async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: { code: 'METHOD_NOT_ALLOWED' } });
  }

  const user = requireRole(req, res, 'STAFF');
  if (!user) return;

  try {
    const { orderId, newStatus, reason } = req.body;

    if (!orderId || !newStatus) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'orderId and newStatus required' },
      });
    }

    if (!VALID_STATUSES.includes(newStatus.toUpperCase())) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: `Status must be: ${VALID_STATUSES.join(', ')}` },
      });
    }

    const order = await findOrderById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Order not found' },
      });
    }

    const previousStatus = order.rowData[COLUMNS.PAYMENT_STATUS] || 'UNKNOWN';
    await updateCell(order.sheetName, order.rowIndex, COLUMNS.PAYMENT_STATUS, newStatus.toUpperCase());

    // Audit log
    await appendAuditLog({
      username: user.username,
      role: user.role,
      action: 'ORDER_STATUS_UPDATE',
      orderId,
      before: { status: previousStatus },
      after: { status: newStatus.toUpperCase() },
      result: 'SUCCESS',
      ip: getClientIP(req),
      meta: { reason },
    });

    // User trace
    await addUserTrace(user.username, `Updated ${orderId} status: ${previousStatus} → ${newStatus.toUpperCase()}`);

    return res.status(200).json({
      success: true,
      result: { orderId, previousStatus, newStatus: newStatus.toUpperCase() },
    });

  } catch (error) {
    console.error('[Admin] Status update error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL', message: 'Failed to update status' },
    });
  }
};
