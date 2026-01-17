/**
 * Payment Service
 * Handles all payment-related API calls
 */

import api from "./api";

class PaymentService {
  /**
   * Fetch Midtrans runtime config from backend (no auth).
   */
  async getConfig() {
    try {
      return await api.get("/payment/config", false);
    } catch (error) {
      // Non-fatal; callers can fall back to build-time env.
      return null;
    }
  }
  /**
   * Create new payment transaction
   * @param {Object} userData - User data for payment
   * @returns {Promise<Object>} Payment token and redirect URL
   */
  async createPayment(userData = {}) {
    try {
      console.log("📤 Sending payment request:", userData);
      const response = await api.post("/payment/create", userData);
      console.log("📥 Payment response received:", response);
      return response;
    } catch (error) {
      console.error("❌ Create payment error:", error);
      throw error;
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
      return response;
    } catch (error) {
      console.error("Check status error:", error);
      throw error;
    }
  }

  /**
   * Get payment history
   * @returns {Promise<Array>} List of transactions
   */
  async getHistory() {
    try {
      const response = await api.get("/payment/history");
      return response;
    } catch (error) {
      console.error("Get history error:", error);
      throw error;
    }
  }

  /**
   * Get current package access
   * @returns {Promise<Object>} Access info
   */
  async getAccess() {
    try {
      const response = await api.get("/payment/access");
      return response;
    } catch (error) {
      console.error("Get access error:", error);
      throw error;
    }
  }

  /**
   * Check if user can purchase new package
   * @returns {Promise<Object>} Purchase eligibility
   */
  async canPurchase() {
    try {
      const response = await api.get("/payment/can-purchase");
      return response;
    } catch (error) {
      console.error("Can purchase check error:", error);
      throw error;
    }
  }

  /**
   * Get latest pending transaction so user can resume payment.
   */
  async getPending() {
    try {
      const response = await api.get("/payment/pending");
      return response;
    } catch (error) {
      console.error("Get pending payment error:", error);
      throw error;
    }
  }

  /**
   * Cancel the latest pending transaction (so user can create a new one).
   */
  async cancelLatestPending() {
    try {
      const response = await api.post("/payment/pending/cancel", {});
      return response;
    } catch (error) {
      console.error("Cancel pending payment error:", error);
      throw error;
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
      throw error;
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
    return new Promise(async (resolve, reject) => {
      // Check if already loaded
      if (window.snap) {
        resolve();
        return;
      }

      let isProduction = null;
      let clientKey = null;
      let snapScriptUrl = null;

      // Prefer backend runtime config to avoid env mismatches.
      const cfg = await this.getConfig();
      if (cfg?.success && cfg?.data) {
        isProduction = cfg.data.isProduction;
        clientKey = cfg.data.clientKey;
        snapScriptUrl = cfg.data.snapScriptUrl;
      }

      // Fallback to build-time env vars.
      if (isProduction === null || isProduction === undefined) {
        isProduction = import.meta.env.VITE_MIDTRANS_IS_PRODUCTION === "true";
      }
      if (!snapScriptUrl) {
        snapScriptUrl = isProduction
          ? "https://app.midtrans.com/snap/snap.js"
          : "https://app.sandbox.midtrans.com/snap/snap.js";
      }
      if (!clientKey) {
        clientKey = import.meta.env.VITE_MIDTRANS_CLIENT_KEY;
      }

      if (!clientKey) {
        reject(new Error("Missing Midtrans client key"));
        return;
      }

      // If a previous snap script tag exists (e.g., old build), remove it.
      const existing = document.querySelector('script[data-midtrans-snap="true"]');
      if (existing) {
        existing.parentNode?.removeChild(existing);
      }

      const script = document.createElement("script");
      script.src = snapScriptUrl;
      script.async = true;
      script.setAttribute("data-client-key", clientKey);
      script.setAttribute("data-midtrans-snap", "true");

      script.onload = () => {
        console.log(
          `✅ Midtrans Snap script loaded (${isProduction ? "PROD" : "SANDBOX"})`
        );
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
