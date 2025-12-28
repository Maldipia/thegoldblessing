/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TGB WEB APP API
 * ═══════════════════════════════════════════════════════════════════════════════
 * Deploy: Deploy → New Deployment → Web App
 * Execute as: Me
 * Access: Anyone
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// Spreadsheet IDs
const SPREADSHEET_ID = '1YnkcqUy0osdaZbt2LGXQDWLpKiWdC0W0JB6Zfe02Oe0';
const INVENTORY_ID = '1R4GOtQQimCZIqOVx0yeK83UmLmBMERU0Z7w4efpbxMQ';

// Sheet names to search
const ORDER_SHEETS = ['STRAIGHT PAYMENT', 'COD', 'COP', 'LAY AWAY', 'WALK IN'];

/**
 * Handle GET requests
 */
function doGet(e) {
  const action = e.parameter.action || 'ping';
  let result;
  
  try {
    switch(action) {
      case 'track':
        result = trackOrder(e.parameter.orderId);
        break;
      case 'layaway':
        result = getLayawayStatus(e.parameter.orderId);
        break;
      case 'invoice':
        result = getInvoice(e.parameter.orderId);
        break;
      case 'dashboard':
        result = getDashboardData();
        break;
      case 'orders':
        result = getOrders(e.parameter);
        break;
      case 'ping':
        result = { success: true, message: 'TGB API is running', timestamp: new Date().toISOString() };
        break;
      default:
        result = { success: false, error: 'Invalid action' };
    }
  } catch (error) {
    result = { success: false, error: error.message };
  }
  
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handle POST requests
 */
function doPost(e) {
  let result;
  
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    switch(action) {
      case 'createOrder':
        result = createOrder(data);
        break;
      case 'updateStatus':
        result = updateOrderStatus(data);
        break;
      default:
        result = { success: false, error: 'Invalid action' };
    }
  } catch (error) {
    result = { success: false, error: error.message };
  }
  
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Track order by Order ID
 */
function trackOrder(orderId) {
  if (!orderId) {
    return { success: false, error: 'Order ID is required' };
  }
  
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  for (const sheetName of ORDER_SHEETS) {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) continue;
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[2] && row[2].toString().toUpperCase() === orderId.toUpperCase()) {
        // Found the order
        const order = {
          orderId: row[2],
          date: row[0] ? Utilities.formatDate(new Date(row[0]), 'Asia/Manila', 'MMMM dd, yyyy') : 'N/A',
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
          status: determineOrderStatus(row),
          statusStep: getStatusStep(row)
        };
        
        return { success: true, order: order };
      }
    }
  }
  
  return { success: false, error: 'Order not found. Please check your Order ID.' };
}

/**
 * Get LayAway status
 */
function getLayawayStatus(orderId) {
  if (!orderId) {
    return { success: false, error: 'Order ID is required' };
  }
  
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('LAY AWAY');
  
  if (!sheet) {
    return { success: false, error: 'LayAway sheet not found' };
  }
  
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[2] && row[2].toString().toUpperCase() === orderId.toUpperCase()) {
      const today = new Date();
      const dueDate = row[22] ? new Date(row[22]) : null;
      const daysRemaining = dueDate ? Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24)) : null;
      
      const layaway = {
        orderId: row[2],
        date: row[0] ? Utilities.formatDate(new Date(row[0]), 'Asia/Manila', 'MMMM dd, yyyy') : 'N/A',
        receiver: row[4] || row[3] || 'N/A',
        downpaymentPercent: row[19] || 0,
        downpaymentAmount: row[20] || 0,
        balance: row[21] || 0,
        dueDate: dueDate ? Utilities.formatDate(dueDate, 'Asia/Manila', 'MMMM dd, yyyy') : 'N/A',
        daysRemaining: daysRemaining,
        status: row[24] || 'ACTIVE',
        serviceFeePercent: row[25] || 0,
        serviceFeeAmount: row[26] || 0,
        totalWithService: row[27] || 0,
        template: row[39] || 'LA50',
        percentPaid: row[19] || 0,
        isOverdue: daysRemaining !== null && daysRemaining < 0,
        paymentStatus: row[13] || 'PENDING'
      };
      
      return { success: true, layaway: layaway };
    }
  }
  
  return { success: false, error: 'LayAway order not found. Please check your Order ID.' };
}

/**
 * Get invoice link
 */
function getInvoice(orderId) {
  if (!orderId) {
    return { success: false, error: 'Order ID is required' };
  }
  
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  for (const sheetName of ORDER_SHEETS) {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) continue;
    
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[2] && row[2].toString().toUpperCase() === orderId.toUpperCase()) {
        return {
          success: true,
          invoice: {
            orderId: row[2],
            invoiceLink: row[14] || null,
            invoiceStatus: row[15] || 'NOT SENT',
            hasInvoice: !!row[14]
          }
        };
      }
    }
  }
  
  return { success: false, error: 'Order not found' };
}

/**
 * Get dashboard data for admin
 */
function getDashboardData() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  let totalOrders = 0;
  let pendingOrders = 0;
  let completedOrders = 0;
  let todayOrders = 0;
  let weekOrders = 0;
  let recentOrders = [];
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  
  const paymentMethods = {
    'STRAIGHT PAYMENT': 0,
    'COD': 0,
    'COP': 0,
    'LAY AWAY': 0,
    'WALK IN': 0
  };
  
  for (const sheetName of ORDER_SHEETS) {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) continue;
    
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[2]) continue;
      
      totalOrders++;
      paymentMethods[sheetName]++;
      
      const status = (row[13] || '').toString().toUpperCase();
      if (status.includes('PAID') || status.includes('COMPLETE')) {
        completedOrders++;
      } else {
        pendingOrders++;
      }
      
      const orderDate = row[0] ? new Date(row[0]) : null;
      if (orderDate) {
        if (orderDate >= today) todayOrders++;
        if (orderDate >= weekAgo) weekOrders++;
      }
      
      // Collect for recent orders
      recentOrders.push({
        date: orderDate,
        orderId: row[2],
        customer: row[4] || row[3] || 'N/A',
        method: sheetName,
        status: row[13] || 'PENDING'
      });
    }
  }
  
  // Sort recent orders by date and take top 15
  recentOrders.sort((a, b) => (b.date || 0) - (a.date || 0));
  recentOrders = recentOrders.slice(0, 15).map(o => ({
    ...o,
    date: o.date ? Utilities.formatDate(o.date, 'Asia/Manila', 'MM/dd/yyyy') : 'N/A'
  }));
  
  return {
    success: true,
    metrics: {
      totalOrders,
      pendingOrders,
      completedOrders,
      todayOrders,
      weekOrders,
      completionRate: totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0
    },
    paymentMethods: {
      labels: Object.keys(paymentMethods),
      values: Object.values(paymentMethods)
    },
    recentOrders
  };
}

/**
 * Get orders list with filters
 */
function getOrders(params) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheetFilter = params.sheet || 'all';
  const statusFilter = (params.status || 'all').toUpperCase();
  const page = parseInt(params.page) || 1;
  const limit = parseInt(params.limit) || 20;
  
  let allOrders = [];
  const sheetsToSearch = sheetFilter === 'all' ? ORDER_SHEETS : [sheetFilter];
  
  for (const sheetName of sheetsToSearch) {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) continue;
    
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[2]) continue;
      
      const status = (row[13] || 'PENDING').toString().toUpperCase();
      
      if (statusFilter !== 'ALL' && !status.includes(statusFilter)) continue;
      
      allOrders.push({
        date: row[0] ? Utilities.formatDate(new Date(row[0]), 'Asia/Manila', 'MM/dd/yyyy') : 'N/A',
        orderId: row[2],
        customer: row[4] || row[3] || 'N/A',
        email: row[1] || 'N/A',
        method: sheetName,
        status: row[13] || 'PENDING',
        trackingNumber: row[16] || null,
        invoiceLink: row[14] || null
      });
    }
  }
  
  // Sort by date descending
  allOrders.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  // Paginate
  const total = allOrders.length;
  const pages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const orders = allOrders.slice(start, start + limit);
  
  return {
    success: true,
    orders,
    pagination: {
      total,
      page,
      pages,
      limit
    }
  };
}

/**
 * Create new order
 */
function createOrder(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheetName = data.paymentMethod || 'STRAIGHT PAYMENT';
  const sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    return { success: false, error: 'Invalid payment method' };
  }
  
  const orderId = 'TGB-' + Date.now();
  const now = new Date();
  
  const newRow = [
    now,                          // A: Date
    data.email || '',             // B: Email
    orderId,                      // C: Order ID
    data.fbName || '',            // D: FB Name
    data.fullName || '',          // E: Receiver Name
    data.address || '',           // F: Address
    data.phone || '',             // G: Contact
    sheetName,                    // H: Payment Method
    data.specialRequest || '',    // I: Special Request
    data.region || '',            // J: Region
    data.city || '',              // K: City
    '',                           // L: VIP ID
    'YES',                        // M: Raffle Entry
    'PENDING',                    // N: Payment Status
    '',                           // O: Invoice Link
    'NOT SENT',                   // P: Invoice Status
    '',                           // Q: Tracking
    'NOT SENT'                    // R: Tracking Status
  ];
  
  sheet.appendRow(newRow);
  
  return {
    success: true,
    orderId: orderId,
    message: 'Order created successfully'
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function maskAddress(address) {
  if (!address) return 'N/A';
  const parts = address.split(',');
  if (parts.length > 2) {
    return '*****, ' + parts.slice(-2).join(',').trim();
  }
  return '*****';
}

function maskPhone(phone) {
  if (!phone) return 'N/A';
  const str = phone.toString();
  if (str.length > 4) {
    return str.slice(0, 4) + '****' + str.slice(-2);
  }
  return '****';
}

function determineOrderStatus(row) {
  const paymentStatus = (row[13] || '').toString().toUpperCase();
  const trackingNumber = row[16];
  const trackingStatus = (row[17] || '').toString().toUpperCase();
  
  if (paymentStatus.includes('COMPLETE') || paymentStatus.includes('DELIVERED')) {
    return 'Delivered';
  }
  if (trackingNumber && trackingStatus.includes('SENT')) {
    return 'Shipped';
  }
  if (paymentStatus.includes('PAID') || paymentStatus.includes('VERIFIED')) {
    return 'Processing';
  }
  return 'Pending Payment';
}

function getStatusStep(row) {
  const status = determineOrderStatus(row);
  const steps = {
    'Pending Payment': 0,
    'Processing': 1,
    'Shipped': 2,
    'Delivered': 3
  };
  return steps[status] || 0;
}
