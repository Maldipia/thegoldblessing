/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TGB API Connection - JSONP Version (CORS Fix)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * This file connects the frontend to Google Apps Script backend using JSONP
 * JSONP bypasses CORS restrictions that block regular fetch() calls
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION - WORKING API URL
// ═══════════════════════════════════════════════════════════════════════════════

const API_URL = 'https://script.google.com/macros/s/AKfycby29izb0YFk3xf5U2ZWeJeKqmCQuJdUGV0IaSmPo3VyihIWhSXtk1Yo7Mw5JeWgPWty1A/exec';

// ═══════════════════════════════════════════════════════════════════════════════
// JSONP HELPER FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Make a JSONP request (bypasses CORS)
 * @param {string} url - The API URL with parameters
 * @returns {Promise} - Resolves with the response data
 */
function jsonpRequest(url) {
  return new Promise(function(resolve, reject) {
    // Create unique callback name
    var callbackName = 'jsonp_callback_' + Date.now() + '_' + Math.round(Math.random() * 100000);
    
    // Set timeout for request (15 seconds)
    var timeout = setTimeout(function() {
      cleanup();
      reject(new Error('Request timeout'));
    }, 15000);
    
    // Cleanup function
    function cleanup() {
      clearTimeout(timeout);
      delete window[callbackName];
      if (script && script.parentNode) {
        script.parentNode.removeChild(script);
      }
    }
    
    // Create global callback function
    window[callbackName] = function(data) {
      cleanup();
      resolve(data);
    };
    
    // Create script element
    var script = document.createElement('script');
    script.src = url + (url.indexOf('?') >= 0 ? '&' : '?') + 'callback=' + callbackName;
    
    // Handle errors
    script.onerror = function() {
      cleanup();
      reject(new Error('JSONP request failed'));
    };
    
    // Add script to page (this triggers the request)
    document.head.appendChild(script);
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// TGB API OBJECT
// ═══════════════════════════════════════════════════════════════════════════════

const TGB_API = {
  
  /**
   * Track an order by Order ID
   * @param {string} orderId - The order ID (e.g., TGB-1234567890)
   * @returns {Promise} - Order details or error
   */
  trackOrder: function(orderId) {
    var url = API_URL + '?action=track&orderId=' + encodeURIComponent(orderId);
    return jsonpRequest(url);
  },
  
  /**
   * Get LayAway status by Order ID
   * @param {string} orderId - The LayAway order ID
   * @returns {Promise} - LayAway details or error
   */
  getLayaway: function(orderId) {
    var url = API_URL + '?action=layaway&orderId=' + encodeURIComponent(orderId);
    return jsonpRequest(url);
  },
  
  /**
   * Get invoice link by Order ID
   * @param {string} orderId - The order ID
   * @returns {Promise} - Invoice details or error
   */
  getInvoice: function(orderId) {
    var url = API_URL + '?action=invoice&orderId=' + encodeURIComponent(orderId);
    return jsonpRequest(url);
  },
  
  /**
   * Get dashboard metrics (for admin)
   * @returns {Promise} - Dashboard data
   */
  getDashboard: function() {
    var url = API_URL + '?action=dashboard';
    return jsonpRequest(url);
  },
  
  /**
   * Get orders list with optional filters
   * @param {object} params - Filter parameters (sheet, status, page, limit)
   * @returns {Promise} - Orders list
   */
  getOrders: function(params) {
    params = params || {};
    var queryParts = ['action=orders'];
    
    if (params.sheet) queryParts.push('sheet=' + encodeURIComponent(params.sheet));
    if (params.status) queryParts.push('status=' + encodeURIComponent(params.status));
    if (params.page) queryParts.push('page=' + encodeURIComponent(params.page));
    if (params.limit) queryParts.push('limit=' + encodeURIComponent(params.limit));
    
    var url = API_URL + '?' + queryParts.join('&');
    return jsonpRequest(url);
  },
  
  /**
   * Test API connection
   * @returns {Promise} - Ping response
   */
  ping: function() {
    var url = API_URL + '?action=ping';
    return jsonpRequest(url);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// TEST FUNCTION (for debugging in browser console)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Test the API connection
 * Run this in browser console: testTGBAPI()
 */
function testTGBAPI() {
  console.log('Testing TGB API...');
  
  TGB_API.ping()
    .then(function(result) {
      console.log('✅ Ping successful:', result);
    })
    .catch(function(error) {
      console.log('❌ Ping failed:', error);
    });
}
