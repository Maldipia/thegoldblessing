/**
 * TGB API Connection
 * Connects GitHub Pages frontend to Google Apps Script backend
 * Uses JSONP for CORS compatibility
 */

// NEW API URL with JSONP support
const API_URL = 'https://script.google.com/macros/s/AKfycbwwSmHcQM_x6wXywNmqCJgHgT6E20HZ2LIw0EB3SJVxAnInZ8lEFEnwdFtPN-6FmzgZkg/exec';

// JSONP callback counter
let tgbCallbackCounter = 0;

// JSONP request function
function tgbJsonpRequest(url) {
  return new Promise((resolve, reject) => {
    const callbackName = 'tgbApiCallback_' + (++tgbCallbackCounter) + '_' + Date.now();
    const script = document.createElement('script');
    
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Request timeout'));
    }, 30000);
    
    function cleanup() {
      clearTimeout(timeout);
      delete window[callbackName];
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    }
    
    window[callbackName] = function(data) {
      cleanup();
      resolve(data);
    };
    
    const separator = url.includes('?') ? '&' : '?';
    script.src = url + separator + 'callback=' + callbackName;
    script.onerror = function() {
      cleanup();
      reject(new Error('Script load error'));
    };
    
    document.head.appendChild(script);
  });
}

const TGB_API = {
  
  /**
   * Track an order
   */
  async trackOrder(orderId) {
    const url = `${API_URL}?action=track&orderId=${encodeURIComponent(orderId)}`;
    return await tgbJsonpRequest(url);
  },
  
  /**
   * Get LayAway status
   */
  async getLayaway(orderId) {
    const url = `${API_URL}?action=layaway&orderId=${encodeURIComponent(orderId)}`;
    return await tgbJsonpRequest(url);
  },
  
  /**
   * Get invoice
   */
  async getInvoice(orderId) {
    const url = `${API_URL}?action=invoice&orderId=${encodeURIComponent(orderId)}`;
    return await tgbJsonpRequest(url);
  },
  
  /**
   * Get dashboard data
   */
  async getDashboard() {
    const url = `${API_URL}?action=dashboard`;
    return await tgbJsonpRequest(url);
  },
  
  /**
   * Get orders list
   */
  async getOrders(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = `${API_URL}?action=orders&${queryString}`;
    return await tgbJsonpRequest(url);
  }
};
