/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TGB API - VERCEL EDITION (FAST!)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Uses Vercel Serverless Functions for 10x faster response times
 * No CORS issues - direct fetch requests work!
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION - VERCEL API URL
// ═══════════════════════════════════════════════════════════════════════════════

var API_URL = 'https://thegoldblessing.vercel.app/api/tgb';

// ═══════════════════════════════════════════════════════════════════════════════
// TGB API OBJECT - USE THESE METHODS IN YOUR HTML
// ═══════════════════════════════════════════════════════════════════════════════

var TGB_API = {
  
  /**
   * Test API connection
   * @returns {Promise} - { success: true, message: "TGB API is running", ... }
   */
  ping: function() {
    return fetch(API_URL + '?action=ping')
      .then(function(response) { return response.json(); })
      .catch(function(error) { 
        return { success: false, error: 'Unable to connect: ' + error.message }; 
      });
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
    return fetch(API_URL + '?action=track&orderId=' + encodeURIComponent(orderId))
      .then(function(response) { return response.json(); })
      .catch(function(error) { 
        return { success: false, error: 'Unable to connect: ' + error.message }; 
      });
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
    return fetch(API_URL + '?action=layaway&orderId=' + encodeURIComponent(orderId))
      .then(function(response) { return response.json(); })
      .catch(function(error) { 
        return { success: false, error: 'Unable to connect: ' + error.message }; 
      });
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
    return fetch(API_URL + '?action=invoice&orderId=' + encodeURIComponent(orderId))
      .then(function(response) { return response.json(); })
      .catch(function(error) { 
        return { success: false, error: 'Unable to connect: ' + error.message }; 
      });
  },
  
  /**
   * Get dashboard data (for admin)
   * @returns {Promise} - { success: true, dashboard: {...} }
   */
  getDashboard: function() {
    return fetch(API_URL + '?action=dashboard')
      .then(function(response) { return response.json(); })
      .catch(function(error) { 
        return { success: false, error: 'Unable to connect: ' + error.message }; 
      });
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
    
    return fetch(API_URL + '?' + queryParts.join('&'))
      .then(function(response) { return response.json(); })
      .catch(function(error) { 
        return { success: false, error: 'Unable to connect: ' + error.message }; 
      });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// TEST FUNCTION - Run in browser console to verify connection
// ═══════════════════════════════════════════════════════════════════════════════

function testTGBAPI() {
  console.log('🔄 Testing TGB API (Vercel)...');
  console.log('API URL:', API_URL);
  
  TGB_API.ping()
    .then(function(result) {
      console.log('✅ API Connection Successful!');
      console.log('Response:', result);
      
      console.log('🔄 Testing order tracking...');
      return TGB_API.trackOrder('TGB-6888662240');
    })
    .then(function(result) {
      if (result.success) {
        console.log('✅ Order Tracking Works!');
        console.log('Order:', result.order);
      } else {
        console.log('⚠️ Order not found');
        console.log('Response:', result);
      }
    })
    .catch(function(error) {
      console.log('❌ API Test Failed!');
      console.log('Error:', error.message);
    });
}

console.log('TGB API (Vercel) loaded. Run testTGBAPI() in console to test.');
