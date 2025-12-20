/**
 * Midtrans Payment Service
 * Handles all Midtrans payment operations
 */

import { createRequire } from "module";

const require = createRequire(import.meta.url);
const midtransClient = require("midtrans-client");

class MidtransService {
  constructor() {
    // Initialize Snap API client
    this.snap = new midtransClient.Snap({
      isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
      serverKey: process.env.MIDTRANS_SERVER_KEY,
      clientKey: process.env.MIDTRANS_CLIENT_KEY,
    });

    // Initialize Core API client (for transaction status check)
    this.core = new midtransClient.CoreApi({
      isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
      serverKey: process.env.MIDTRANS_SERVER_KEY,
      clientKey: process.env.MIDTRANS_CLIENT_KEY,
    });
  }

  /**
   * Create payment transaction
   * @param {Object} params - Transaction parameters
   * @param {string} params.orderId - Unique order ID
   * @param {number} params.grossAmount - Payment amount
   * @param {Object} params.customerDetails - Customer info
   * @returns {Promise<Object>} Snap token and redirect URL
   */
  async createTransaction({
    orderId,
    grossAmount,
    customerDetails,
    itemDetails,
  }) {
    try {
      const parameter = {
        transaction_details: {
          order_id: orderId,
          gross_amount: grossAmount,
        },
        customer_details: customerDetails,
        item_details: itemDetails || [
          {
            id: "FRAME_PACKAGE_3X10",
            price: grossAmount,
            quantity: 1,
            name: "Fremio - 3 Paket Frame (30 Frames)",
          },
        ],
        enabled_payments: [
          "gopay",
          "shopeepay",
          "dana",
          "ovo", // E-wallets
          "bca_va",
          "bni_va",
          "bri_va",
          "permata_va",
          "other_va", // Virtual Account
          "qris", // QRIS
          "credit_card", // Credit card
        ],
        credit_card: {
          secure: true,
        },
        callbacks: {
          finish: `${process.env.FRONTEND_URL}/payment/success`,
          error: `${process.env.FRONTEND_URL}/payment/error`,
          pending: `${process.env.FRONTEND_URL}/payment/pending`,
        },
        expiry: {
          unit: "hours",
          duration: 24,
        },
      };

      const transaction = await this.snap.createTransaction(parameter);

      return {
        token: transaction.token,
        redirect_url: transaction.redirect_url,
      };
    } catch (error) {
      console.error("Midtrans create transaction error:", error);
      throw new Error(`Failed to create payment: ${error.message}`);
    }
  }

  /**
   * Get transaction status
   * @param {string} orderId - Order ID
   * @returns {Promise<Object>} Transaction status
   */
  async getTransactionStatus(orderId) {
    try {
      const status = await this.core.transaction.status(orderId);
      return status;
    } catch (error) {
      console.error("Midtrans status check error:", error);
      throw new Error(`Failed to check status: ${error.message}`);
    }
  }

  /**
   * Verify notification from Midtrans webhook
   * @param {Object} notification - Notification data
   * @returns {Promise<Object>} Verified notification
   */
  async verifyNotification(notification) {
    try {
      const statusResponse = await this.core.transaction.notification(
        notification
      );

      const orderId = statusResponse.order_id;
      const transactionStatus = statusResponse.transaction_status;
      const fraudStatus = statusResponse.fraud_status;
      const paymentType = statusResponse.payment_type;

      let status = "pending";

      // Determine final status
      if (transactionStatus === "capture") {
        if (fraudStatus === "accept") {
          status = "settlement";
        } else if (fraudStatus === "challenge") {
          status = "pending";
        } else {
          status = "deny";
        }
      } else if (transactionStatus === "settlement") {
        status = "settlement";
      } else if (
        transactionStatus === "cancel" ||
        transactionStatus === "deny" ||
        transactionStatus === "expire"
      ) {
        status = transactionStatus;
      } else if (transactionStatus === "pending") {
        status = "pending";
      }

      return {
        orderId,
        transactionStatus: status,
        paymentType,
        transactionTime: statusResponse.transaction_time,
        settlementTime: statusResponse.settlement_time,
        midtransTransactionId: statusResponse.transaction_id,
        fullResponse: statusResponse,
      };
    } catch (error) {
      console.error("Midtrans verify notification error:", error);
      throw new Error(`Failed to verify notification: ${error.message}`);
    }
  }

  /**
   * Cancel transaction
   * @param {string} orderId - Order ID
   * @returns {Promise<Object>} Cancellation result
   */
  async cancelTransaction(orderId) {
    try {
      const result = await this.core.transaction.cancel(orderId);
      return result;
    } catch (error) {
      console.error("Midtrans cancel transaction error:", error);
      throw new Error(`Failed to cancel transaction: ${error.message}`);
    }
  }

  /**
   * Generate unique order ID
   * @param {string} userId - User ID
   * @returns {string} Unique order ID
   */
  generateOrderId(userId) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `FRM-${userId.substring(0, 8)}-${timestamp}-${random}`;
  }
}

export default new MidtransService();
