/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TGB API - FINAL VERSION WITH JSONP (CORS FIX)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * This file connects the GitHub Pages frontend to Google Apps Script backend
 * Uses JSONP to bypass CORS restrictions
 * 
 * SETUP:
 * 1. Update API_URL below with your deployed Web App URL
 * 2. Upload this file to: js/tgb-api.js in your GitHub repository
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION - UPDATE THIS URL WITH YOUR DEPLOYMENT
// ═══════════════════════════════════════════════════════════════════════════════

var API_URL = 'https://script.google.com/macros/s/AKfycby29izb0YFk3xf5U2ZWeJeKqmCQuJdUGV0IaSmPo3VyihIWhSXtk1Yo7Mw5JeWgPWty1A/exec';

// ═══════════════════════════════════════════════════════════════════════════════
// JSONP REQUEST FUNCTION - BYPASSES CORS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Make a JSONP request
 * JSONP works by injecting a <script> tag, which is not subject to CORS
 * 
 * @param {string} url - The API URL with parameters
 * @returns {Promise} - Resolves with the response data
 */
function jsonpRequest(url) {
  return new Promise(function(resolve, reject) {
    // Create unique callback name to avoid collisions
    var callbackName = 'tgb_callback_' + Date.now() + '_' + Math.floor(Math.random() * 100000);
    
    // Set timeout (15 seconds)
    var timeoutId = setTimeout(function() {
      cleanup();
      reject(new Error('Request timed out'));
    }, 15000);
    
    // Cleanup function to remove script and callback
    function cleanup() {
      clearTimeout(timeoutId);
      delete window[callbackName];
      var script = document.getElementById(callbackName);
      if (script && script.parentNode) {
        script.parentNode.removeChild(script);
      }
    }
    
    // Create global callback function
    window[callbackName] = function(data) {
      cleanup();
      resolve(data);
    };
    
    // Create and inject script element
    var script = document.createElement('script');
    script.id = callbackName;
    script.src = url + (url.indexOf('?') >= 0 ? '&' : '?') + 'callback=' + callbackName;
    
    // Handle script load errors
    script.onerror = function() {
      cleanup();
      reject(new Error('Failed to load script'));
    };
    
    // Add script to document (this triggers the request)
    document.head.appendChild(script);
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// TGB API OBJECT - USE THESE METHODS IN YOUR HTML
// ═══════════════════════════════════════════════════════════════════════════════

var TGB_API = {
  
  /**
   * Test API connection
   * @returns {Promise} - { success: true, message: "TGB API is running", ... }
   */
  ping: function() {
    return jsonpRequest(API_URL + '?action=ping');
  },
  
  /**
   * Track an order by Order ID
   * @param {string} orderId - The order ID (e.g., TGB-1234567890)
   * @returns {Promise} - { success: true, order: {...} } or { success: false, error: "..." }
   */
  trackOrder: function(orderId) {
    if (!orderId) {
      return Promise.reject(new Error('Order ID is required'));
    }
    return jsonpRequest(API_URL + '?action=track&orderId=' + encodeURIComponent(orderId));
  },
  
  /**
   * Get LayAway status by Order ID
   * @param {string} orderId - The LayAway order ID
   * @returns {Promise} - { success: true, layaway: {...} } or { success: false, error: "..." }
   */
  getLayaway: function(orderId) {
    if (!orderId) {
      return Promise.reject(new Error('Order ID is required'));
    }
    return jsonpRequest(API_URL + '?action=layaway&orderId=' + encodeURIComponent(orderId));
  },
  
  /**
   * Get invoice by Order ID
   * @param {string} orderId - The order ID
   * @returns {Promise} - { success: true, invoice: {...} } or { success: false, error: "..." }
   */
  getInvoice: function(orderId) {
    if (!orderId) {
      return Promise.reject(new Error('Order ID is required'));
    }
    return jsonpRequest(API_URL + '?action=invoice&orderId=' + encodeURIComponent(orderId));
  },
  
  /**
   * Get dashboard data (for admin)
   * @returns {Promise} - { success: true, dashboard: {...} }
   */
  getDashboard: function() {
    return jsonpRequest(API_URL + '?action=dashboard');
  },
  
  /**
   * Get orders list with optional filters
   * @param {object} params - { sheet, status, page, limit }
   * @returns {Promise} - { success: true, orders: [...], pagination: {...} }
   */
  getOrders: function(params) {
    params = params || {};
    var queryParts = ['action=orders'];
    
    if (params.sheet) queryParts.push('sheet=' + encodeURIComponent(params.sheet));
    if (params.status) queryParts.push('status=' + encodeURIComponent(params.status));
    if (params.page) queryParts.push('page=' + encodeURIComponent(params.page));
    if (params.limit) queryParts.push('limit=' + encodeURIComponent(params.limit));
    
    return jsonpRequest(API_URL + '?' + queryParts.join('&'));
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// TEST FUNCTION - Run in browser console to verify connection
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Test the API connection
 * Open browser console (F12) and run: testTGBAPI()
 */
function testTGBAPI() {
  console.log('🔄 Testing TGB API...');
  console.log('API URL:', API_URL);
  
  TGB_API.ping()
    .then(function(result) {
      console.log('✅ API Connection Successful!');
      console.log('Response:', result);
      
      // Also test tracking
      console.log('🔄 Testing order tracking...');
      return TGB_API.trackOrder('TGB-6888662240');
    })
    .then(function(result) {
      if (result.success) {
        console.log('✅ Order Tracking Works!');
        console.log('Order:', result.order);
      } else {
        console.log('⚠️ Order not found (this is OK if test order does not exist)');
        console.log('Response:', result);
      }
    })
    .catch(function(error) {
      console.log('❌ API Test Failed!');
      console.log('Error:', error.message);
      console.log('');
      console.log('Troubleshooting:');
      console.log('1. Check that API_URL is correct');
      console.log('2. Make sure you deployed as "New version"');
      console.log('3. Make sure access is set to "Anyone"');
    });
}

// Log that the API is loaded
console.log('TGB API loaded. Run testTGBAPI() in console to test.');
