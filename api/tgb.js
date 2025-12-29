/**
 * TGB Main API
 * /api/tgb
 * 
 * Admin actions require session
 * Customer actions require email verification
 */

const { verifySession, rateLimit, setCorsHeaders } = require('../lib/auth-middleware');
const { getAllOrders, verifyOrderEmail, COLUMNS } = require('../lib/sheets-helper');

module.exports = async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = req.query.action || req.body?.action;

  try {
    // ============================================================
    // ADMIN ENDPOINTS (require session)
    // ============================================================
    
    if (action === 'dashboard') {
      const user = verifySession(req);
      if (!user) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHENTICATED', message: 'Please log in' },
        });
      }

      const orders = await getAllOrders();
      const completed = orders.filter(o => 
        ['PAID', 'COMPLETED', 'DELIVERED'].includes((o.status || '').toUpperCase())
      ).length;
      const pending = orders.length - completed;

      const methods = {};
      orders.forEach(o => {
        methods[o.method] = (methods[o.method] || 0) + 1;
      });

      return res.status(200).json({
        success: true,
        user: { username: user.username, role: user.role, name: user.name },
        metrics: {
          totalOrders: orders.length,
          completedOrders: completed,
          pendingOrders: pending,
          completionRate: orders.length ? Math.round((completed / orders.length) * 100) : 0,
        },
        paymentMethods: {
          labels: Object.keys(methods),
          values: Object.values(methods),
        },
        recentOrders: orders.slice(0, 10).map(o => ({
          orderId: o.orderId,
          date: o.date,
          customer: o.customer,
          method: o.method,
          status: o.status,
        })),
      });
    }

    if (action === 'orders') {
      const user = verifySession(req);
      if (!user) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHENTICATED', message: 'Please log in' },
        });
      }

      const page = parseInt(req.query.page) || 1;
      const limit = Math.min(parseInt(req.query.limit) || 20, 100);
      
      let orders = await getAllOrders();
      
      const sheetFilter = req.query.sheet;
      const statusFilter = req.query.status;
      const search = req.query.search?.toLowerCase();
      
      if (sheetFilter && sheetFilter !== 'all') {
        orders = orders.filter(o => o.method === sheetFilter);
      }
      if (statusFilter && statusFilter !== 'all') {
        orders = orders.filter(o => (o.status || '').toUpperCase().includes(statusFilter.toUpperCase()));
      }
      if (search) {
        orders = orders.filter(o => 
          o.orderId?.toLowerCase().includes(search) ||
          o.customer?.toLowerCase().includes(search) ||
          o.email?.toLowerCase().includes(search)
        );
      }

      orders.sort((a, b) => new Date(b.date) - new Date(a.date));

      const total = orders.length;
      const start = (page - 1) * limit;
      const paged = orders.slice(start, start + limit);

      return res.status(200).json({
        success: true,
        orders: paged.map(o => ({
          orderId: o.orderId,
          date: o.date,
          customer: o.customer,
          email: o.email,
          method: o.method,
          status: o.status,
          invoiceLink: o.invoiceLink,
          invoiceStatus: o.invoiceStatus,
          trackingNumber: o.trackingNumber,
          trackingStatus: o.trackingStatus,
        })),
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    }

    // ============================================================
    // CUSTOMER ENDPOINTS (require email verification)
    // ============================================================

    if (action === 'track' || action === 'invoice' || action === 'layaway') {
      const orderId = req.query.orderId || req.body?.orderId;
      const email = req.query.email || req.body?.email;

      if (!orderId) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'orderId required' },
        });
      }

      // Rate limit
      if (!rateLimit(req, res, { maxAttempts: 10, windowMs: 60000, key: `customer:${orderId}` })) {
        return;
      }

      // Email required
      if (!email) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Email required for verification' },
        });
      }

      // Verify email
      const verification = await verifyOrderEmail(orderId, email);
      if (!verification.valid) {
        return res.status(403).json({
          success: false,
          error: { code: 'INVALID_VERIFIER', message: 'Email does not match order' },
        });
      }

      const order = verification.order;

      if (action === 'track') {
        return res.status(200).json({
          success: true,
          order: {
            orderId: order.rowData[COLUMNS.ORDER_ID],
            date: order.rowData[COLUMNS.DATE],
            customer: order.rowData[COLUMNS.FB_NAME] || order.rowData[COLUMNS.RECEIVER_NAME],
            status: order.rowData[COLUMNS.PAYMENT_STATUS] || 'PENDING',
            trackingNumber: order.rowData[COLUMNS.TRACKING_NUMBER],
            trackingUrl: order.rowData[COLUMNS.TRACKING_NUMBER] 
              ? `https://www.lbc.com.ph/tracking?tracking_no=${order.rowData[COLUMNS.TRACKING_NUMBER]}` 
              : null,
          },
        });
      }

      if (action === 'invoice') {
        return res.status(200).json({
          success: true,
          order: {
            orderId: order.rowData[COLUMNS.ORDER_ID],
            invoiceLink: order.rowData[COLUMNS.INVOICE_LINK],
            invoiceStatus: order.rowData[COLUMNS.INVOICE_STATUS],
          },
        });
      }

      if (action === 'layaway') {
        return res.status(200).json({
          success: true,
          order: {
            orderId: order.rowData[COLUMNS.ORDER_ID],
            date: order.rowData[COLUMNS.DATE],
            customer: order.rowData[COLUMNS.FB_NAME] || order.rowData[COLUMNS.RECEIVER_NAME],
            method: order.sheetName,
            status: order.rowData[COLUMNS.PAYMENT_STATUS] || 'PENDING',
          },
        });
      }
    }

    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid action' },
    });

  } catch (error) {
    console.error('[API] Error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL', message: 'Server error' },
    });
  }
};
