/**
 * TGB API Connection
 * Connects GitHub Pages frontend to Google Apps Script backend
 */

// Your deployed Web App URL
const API_URL = 'https://script.google.com/macros/s/AKfycbxeTknwX4L8ZjJbHEh-Y9FWiSa1cRmrtzS2mPUkT22p_OQz9CxybMaasw4ipy6vP9ZG/exec';

const TGB_API = {
  
  /**
   * Track an order
   */
  async trackOrder(orderId) {
    try {
      const url = `${API_URL}?action=track&orderId=${encodeURIComponent(orderId)}`;
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'follow'
      });
      return await response.json();
    } catch (error) {
      console.error('Track order error:', error);
      throw error;
    }
  },
  
  /**
   * Get LayAway status
   */
  async getLayaway(orderId) {
    try {
      const url = `${API_URL}?action=layaway&orderId=${encodeURIComponent(orderId)}`;
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'follow'
      });
      return await response.json();
    } catch (error) {
      console.error('LayAway error:', error);
      throw error;
    }
  },
  
  /**
   * Get invoice
   */
  async getInvoice(orderId) {
    try {
      const url = `${API_URL}?action=invoice&orderId=${encodeURIComponent(orderId)}`;
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'follow'
      });
      return await response.json();
    } catch (error) {
      console.error('Invoice error:', error);
      throw error;
    }
  },
  
  /**
   * Get dashboard data
   */
  async getDashboard() {
    try {
      const url = `${API_URL}?action=dashboard`;
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'follow'
      });
      return await response.json();
    } catch (error) {
      console.error('Dashboard error:', error);
      throw error;
    }
  },
  
  /**
   * Get orders list
   */
  async getOrders(params = {}) {
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = `${API_URL}?action=orders&${queryString}`;
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'follow'
      });
      return await response.json();
    } catch (error) {
      console.error('Orders error:', error);
      throw error;
    }
  },
  
  /**
   * Create new order
   */
  async createOrder(orderData) {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        redirect: 'follow',
        body: JSON.stringify({ action: 'createOrder', ...orderData })
      });
      return await response.json();
    } catch (error) {
      console.error('Create order error:', error);
      throw error;
    }
  }
};
