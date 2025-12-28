/**
 * TGB API Connection
 * Connects GitHub Pages frontend to Google Apps Script backend
 * 
 * IMPORTANT: Replace YOUR_DEPLOYMENT_ID with your actual Web App URL
 * after deploying the Google Apps Script
 */

// Replace with your deployed Web App URL
const API_URL = 'https://script.google.com/macros/s/AKfycbxeTknwX4L8ZjJbHEh-Y9FWiSa1cRmrtzS2mPUkT22p_OQz9CxybMaasw4ipy6vP9ZG/exec';

const TGB_API = {
  
  /**
   * Track an order
   */
  async trackOrder(orderId) {
    const response = await fetch(`${API_URL}?action=track&orderId=${encodeURIComponent(orderId)}`);
    return await response.json();
  },
  
  /**
   * Get LayAway status
   */
  async getLayaway(orderId) {
    const response = await fetch(`${API_URL}?action=layaway&orderId=${encodeURIComponent(orderId)}`);
    return await response.json();
  },
  
  /**
   * Get invoice
   */
  async getInvoice(orderId) {
    const response = await fetch(`${API_URL}?action=invoice&orderId=${encodeURIComponent(orderId)}`);
    return await response.json();
  },
  
  /**
   * Get dashboard data
   */
  async getDashboard() {
    const response = await fetch(`${API_URL}?action=dashboard`);
    return await response.json();
  },
  
  /**
   * Get orders list
   */
  async getOrders(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_URL}?action=orders&${queryString}`);
    return await response.json();
  },
  
  /**
   * Create new order
   */
  async createOrder(orderData) {
    const response = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'createOrder', ...orderData })
    });
    return await response.json();
  }
};
