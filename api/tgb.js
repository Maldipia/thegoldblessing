const { google } = require('googleapis');

// Configuration
const SPREADSHEET_ID = '1YnkcqUy0osdaZbt2LGXQDWLpKiWdC0W0JB6Zfe02Oe0';
const ORDER_SHEETS = ['STRAIGHT PAYMENT', 'COD', 'COP', 'LAY AWAY', 'WALK IN'];

// Initialize Google Sheets
async function getSheets() {
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  return google.sheets({ version: 'v4', auth });
}

// CORS Headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

// Main Handler
module.exports = async (req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    Object.entries(corsHeaders).forEach(([key, value]) => res.setHeader(key, value));
    return res.status(200).json({ ok: true });
  }

  // Set CORS headers
  Object.entries(corsHeaders).forEach(([key, value]) => res.setHeader(key, value));

  const { action, orderId, callback, sheet, status, page, limit } = req.query;

  try {
    let result;

    switch (action) {
      case 'track':
        result = await trackOrder(orderId);
        break;
      case 'layaway':
        result = await getLayawayStatus(orderId);
        break;
      case 'invoice':
        result = await getInvoice(orderId);
        break;
      case 'dashboard':
        result = await getDashboard();
        break;
      case 'orders':
        result = await getOrders({ sheet, status, page, limit });
        break;
      case 'ping':
      default:
        result = { 
          success: true, 
          message: 'TGB Vercel API is running!', 
          timestamp: new Date().toISOString(), 
          speed: 'FAST 🚀',
          version: '1.0.0'
        };
    }

    // JSONP support (for backward compatibility)
    if (callback) {
      const safe = callback.replace(/[^a-zA-Z0-9_]/g, '');
      res.setHeader('Content-Type', 'application/javascript');
      return res.status(200).send(`${safe}(${JSON.stringify(result)});`);
    }

    return res.status(200).json(result);

  } catch (error) {
    console.error('API Error:', error);
    const errorResult = { success: false, error: error.message };
    
    if (callback) {
      const safe = callback.replace(/[^a-zA-Z0-9_]/g, '');
      res.setHeader('Content-Type', 'application/javascript');
      return res.status(200).send(`${safe}(${JSON.stringify(errorResult)});`);
    }
    
    return res.status(500).json(errorResult);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// TRACK ORDER
// ═══════════════════════════════════════════════════════════════════════════════
async function trackOrder(orderId) {
  if (!orderId) return { success: false, error: 'Order ID is required' };

  const sheets = await getSheets();
  const searchId = orderId.toString().toUpperCase().trim();

  for (const sheetName of ORDER_SHEETS) {
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${sheetName}'!A:Z`,
      });

      const rows = response.data.values || [];
      
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const rowId = row[2] ? row[2].toString().toUpperCase().trim() : '';

        if (rowId === searchId) {
          return {
            success: true,
            order: {
              orderId: row[2] || orderId,
              date: formatDate(row[0]),
              receiver: row[4] || row[3] || 'N/A',
              address: maskAddress(row[5]),
              city: row[10] || 'N/A',
              region: row[9] || 'N/A',
              contactNumber: maskPhone(row[6]),
              paymentMethod: sheetName,
              paymentStatus: row[13] || 'PENDING',
              invoiceLink: row[14] || null,
              invoiceStatus: row[15] || 'NOT SENT',
              trackingNumber: row[16] || null,
              trackingStatus: row[17] || 'NOT SENT',
              trackingUrl: row[16] ? `https://www.lbc.com.ph/tracking?tracking_no=${row[16]}` : null,
              status: getOrderStatus(row),
              statusStep: getStatusStep(row),
            },
          };
        }
      }
    } catch (e) {
      console.error(`Error reading sheet ${sheetName}:`, e.message);
    }
  }

  return { success: false, error: 'Order not found. Please check your Order ID.' };
}

// ═══════════════════════════════════════════════════════════════════════════════
// LAYAWAY STATUS
// ═══════════════════════════════════════════════════════════════════════════════
async function getLayawayStatus(orderId) {
  if (!orderId) return { success: false, error: 'Order ID is required' };

  const sheets = await getSheets();
  const searchId = orderId.toString().toUpperCase().trim();

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "'LAY AWAY'!A:AZ",
    });

    const rows = response.data.values || [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowId = row[2] ? row[2].toString().toUpperCase().trim() : '';

      if (rowId === searchId) {
        const today = new Date();
        const dueDate = row[22] ? new Date(row[22]) : null;
        const daysLeft = dueDate ? Math.ceil((dueDate - today) / 86400000) : null;

        return {
          success: true,
          layaway: {
            orderId: row[2] || orderId,
            date: formatDate(row[0]),
            receiver: row[4] || row[3] || 'N/A',
            downpaymentPercent: row[19] || 0,
            downpaymentAmount: row[20] || 0,
            balance: row[21] || 0,
            dueDate: dueDate ? formatDate(dueDate) : 'N/A',
            daysRemaining: daysLeft,
            status: row[24] || 'ACTIVE',
            percentPaid: row[19] || 0,
            isOverdue: daysLeft !== null && daysLeft < 0,
            paymentStatus: row[13] || 'PENDING',
          },
        };
      }
    }
  } catch (e) {
    console.error('Error reading LAY AWAY sheet:', e.message);
  }

  return { success: false, error: 'LayAway order not found.' };
}

// ═══════════════════════════════════════════════════════════════════════════════
// INVOICE
// ═══════════════════════════════════════════════════════════════════════════════
async function getInvoice(orderId) {
  if (!orderId) return { success: false, error: 'Order ID is required' };

  const sheets = await getSheets();
  const searchId = orderId.toString().toUpperCase().trim();

  for (const sheetName of ORDER_SHEETS) {
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${sheetName}'!A:Z`,
      });

      const rows = response.data.values || [];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row[2] && row[2].toString().toUpperCase().trim() === searchId) {
          return {
            success: true,
            invoice: {
              orderId: row[2],
              invoiceLink: row[14] || null,
              invoiceStatus: row[15] || 'NOT SENT',
              hasInvoice: !!row[14],
            },
          };
        }
      }
    } catch (e) {
      console.error(`Error reading sheet ${sheetName}:`, e.message);
    }
  }

  return { success: false, error: 'Order not found' };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
async function getDashboard() {
  const sheets = await getSheets();
  let total = 0, pending = 0, completed = 0;
  const methods = {};
  const recent = [];

  for (const sheetName of ORDER_SHEETS) {
    methods[sheetName] = 0;

    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${sheetName}'!A:Z`,
      });

      const rows = response.data.values || [];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row[2]) continue;

        total++;
        methods[sheetName]++;

        const status = (row[13] || '').toString().toUpperCase();
        if (status.includes('PAID') || status.includes('COMPLETE')) completed++;
        else pending++;

        recent.push({
          date: row[0],
          orderId: row[2],
          customer: row[4] || row[3] || 'N/A',
          method: sheetName,
          status: row[13] || 'PENDING',
        });
      }
    } catch (e) {
      console.error(`Error reading sheet ${sheetName}:`, e.message);
    }
  }

  recent.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  const recentOrders = recent.slice(0, 15).map(o => ({
    date: formatDateShort(o.date),
    orderId: o.orderId,
    customer: o.customer,
    method: o.method,
    status: o.status,
  }));

  return {
    success: true,
    metrics: {
      totalOrders: total,
      pendingOrders: pending,
      completedOrders: completed,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    },
    paymentMethods: {
      labels: Object.keys(methods),
      values: Object.values(methods),
    },
    recentOrders,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ORDERS LIST
// ═══════════════════════════════════════════════════════════════════════════════
async function getOrders({ sheet, status, page, limit }) {
  const sheets = await getSheets();
  const filterSheet = sheet || 'all';
  const statusFilter = (status || 'all').toUpperCase();
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 20;

  const all = [];
  const sheetsToQuery = filterSheet === 'all' ? ORDER_SHEETS : [filterSheet];

  for (const sheetName of sheetsToQuery) {
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${sheetName}'!A:Z`,
      });

      const rows = response.data.values || [];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row[2]) continue;

        const st = (row[13] || 'PENDING').toString().toUpperCase();
        if (statusFilter !== 'ALL' && !st.includes(statusFilter)) continue;

        all.push({
          date: formatDateShort(row[0]),
          orderId: row[2],
          customer: row[4] || row[3] || 'N/A',
          method: sheetName,
          status: row[13] || 'PENDING',
        });
      }
    } catch (e) {
      console.error(`Error reading sheet ${sheetName}:`, e.message);
    }
  }

  all.sort((a, b) => new Date(b.date) - new Date(a.date));
  const start = (pageNum - 1) * limitNum;

  return {
    success: true,
    orders: all.slice(start, start + limitNum),
    pagination: {
      total: all.length,
      page: pageNum,
      pages: Math.ceil(all.length / limitNum),
      limit: limitNum,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════
function formatDate(d) {
  if (!d) return 'N/A';
  try {
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch (e) {
    return 'N/A';
  }
}

function formatDateShort(d) {
  if (!d) return 'N/A';
  try {
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch (e) {
    return 'N/A';
  }
}

function maskAddress(a) {
  if (!a) return 'N/A';
  const parts = a.toString().split(',');
  return parts.length > 2 ? '*****, ' + parts.slice(-2).join(',').trim() : '*****';
}

function maskPhone(p) {
  if (!p) return 'N/A';
  const s = p.toString();
  return s.length > 4 ? s.slice(0, 4) + '****' + s.slice(-2) : '****';
}

function getOrderStatus(row) {
  const ps = (row[13] || '').toString().toUpperCase();
  const tn = row[16];
  const ts = (row[17] || '').toString().toUpperCase();
  
  if (ps.includes('COMPLETE') || ps.includes('DELIVERED')) return 'Delivered';
  if (tn && ts.includes('SENT')) return 'Shipped';
  if (ps.includes('PAID') || ps.includes('VERIFIED')) return 'Processing';
  return 'Pending Payment';
}

function getStatusStep(row) {
  const status = getOrderStatus(row);
  const steps = { 'Pending Payment': 0, 'Processing': 1, 'Shipped': 2, 'Delivered': 3 };
  return steps[status] || 0;
}
