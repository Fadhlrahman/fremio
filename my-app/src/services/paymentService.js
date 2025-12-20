/**
 * Payment Service
 * Handles all payment-related API calls
 */

import api from "./api";

class PaymentService {
  /**
   * Create new payment transaction
   * @param {Object} userData - User data for payment
   * @returns {Promise<Object>} Payment token and redirect URL
   */
  async createPayment(userData = {}) {
    try {
      const response = await api.post("/payment/create", userData);
      return response.data;
    } catch (error) {
      console.error("Create payment error:", error);
      throw error.response?.data || error;
    }
  }

  /**
   * Check payment status
   * @param {string} orderId - Order ID
   * @returns {Promise<Object>} Payment status
   */
  async checkStatus(orderId) {
    try {
      const response = await api.get(`/payment/status/${orderId}`);
      return response.data;
    } catch (error) {
      console.error("Check status error:", error);
      throw error.response?.data || error;
    }
  }

  /**
   * Get payment history
   * @returns {Promise<Array>} List of transactions
   */
  async getHistory() {
    try {
      const response = await api.get("/payment/history");
      return response.data;
    } catch (error) {
      console.error("Get history error:", error);
      throw error.response?.data || error;
    }
  }

  /**
   * Get current package access
   * @returns {Promise<Object>} Access info
   */
  async getAccess() {
    try {
      const response = await api.get("/payment/access");
      return response.data;
    } catch (error) {
      console.error("Get access error:", error);
      throw error.response?.data || error;
    }
  }

  /**
   * Check if user can purchase new package
   * @returns {Promise<Object>} Purchase eligibility
   */
  async canPurchase() {
    try {
      const response = await api.get("/payment/can-purchase");
      return response.data;
    } catch (error) {
      console.error("Can purchase check error:", error);
      throw error.response?.data || error;
    }
  }

  /**
   * Reconcile latest pending transaction (fallback if orderId is unknown)
   */
  async reconcileLatest() {
    try {
      const response = await api.post("/payment/reconcile-latest", {});
      return response;
    } catch (error) {
      console.error("Reconcile latest error:", error);
      throw error.response?.data || error;
    }
  }

  /**
   * Open Midtrans Snap payment popup
   * @param {string} snapToken - Snap token from backend
   * @param {Function} onSuccess - Success callback
   * @param {Function} onPending - Pending callback
   * @param {Function} onError - Error callback
   */
  openSnapPayment(snapToken, { onSuccess, onPending, onError }) {
    if (!window.snap) {
      console.error("Midtrans Snap is not loaded");
      if (onError) onError(new Error("Payment system not ready"));
      return;
    }

    window.snap.pay(snapToken, {
      onSuccess: (result) => {
        console.log("Payment success:", result);
        if (onSuccess) onSuccess(result);
      },
      onPending: (result) => {
        console.log("Payment pending:", result);
        if (onPending) onPending(result);
      },
      onError: (result) => {
        console.error("Payment error:", result);
        if (onError) onError(result);
      },
      onClose: () => {
        console.log("Payment popup closed");
      },
    });
  }

  /**
   * Load Midtrans Snap script
   * @returns {Promise<void>}
   */
  loadSnapScript() {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (window.snap) {
        resolve();
        return;
      }

      const script = document.createElement("script");
      script.src =
        import.meta.env.VITE_MIDTRANS_IS_PRODUCTION === "true"
          ? "https://app.midtrans.com/snap/snap.js"
          : "https://app.sandbox.midtrans.com/snap/snap.js";

      script.setAttribute(
        "data-client-key",
        import.meta.env.VITE_MIDTRANS_CLIENT_KEY
      );

      script.onload = () => {
        console.log("✅ Midtrans Snap script loaded");
        resolve();
      };

      script.onerror = () => {
        console.error("❌ Failed to load Midtrans Snap script");
        reject(new Error("Failed to load payment system"));
      };

      document.head.appendChild(script);
    });
  }
}

export default new PaymentService();
