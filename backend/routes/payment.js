/**
 * Payment Routes
 * Handles payment-related API endpoints
 */

const express = require("express");
const router = express.Router();
const midtransService = require("../services/midtransService");
const paymentDB = require("../services/paymentDatabaseService");
const { verifyToken } = require("../src/middleware/auth");

/**
 * POST /api/payment/create
 * Create new payment transaction
 */
router.post("/create", verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { email, name, phone } = req.body;

    // Check if user already has active access
    const hasAccess = await paymentDB.hasActiveAccess(userId);
    if (hasAccess) {
      return res.status(400).json({
        success: false,
        message:
          "Anda masih memiliki akses aktif. Tidak bisa membeli paket baru sebelum masa aktif berakhir.",
      });
    }

    // Check if there's pending transaction
    const userTransactions = await paymentDB.getUserTransactions(userId);
    const hasPending = userTransactions.some(
      (t) => t.transaction_status === "pending"
    );

    if (hasPending) {
      return res.status(400).json({
        success: false,
        message:
          "Anda memiliki transaksi yang sedang pending. Silakan selesaikan pembayaran terlebih dahulu.",
      });
    }

    // Generate order ID
    const orderId = midtransService.generateOrderId(userId);
    const grossAmount = 10000; // Rp 10.000

    // Create transaction in database
    await paymentDB.createTransaction({
      userId,
      orderId,
      grossAmount,
    });

    // Create Midtrans transaction
    const customerDetails = {
      email: email || `${userId}@fremio.app`,
      first_name: name || "Fremio User",
      phone: phone || "08123456789",
    };

    const transaction = await midtransService.createTransaction({
      orderId,
      grossAmount,
      customerDetails,
    });

    res.json({
      success: true,
      data: {
        orderId,
        token: transaction.token,
        redirectUrl: transaction.redirect_url,
      },
    });
  } catch (error) {
    console.error("Create payment error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create payment",
      error: error.message,
    });
  }
});

/**
 * POST /api/payment/webhook
 * Midtrans webhook notification handler
 */
router.post("/webhook", async (req, res) => {
  try {
    // Verify notification from Midtrans
    const notification = await midtransService.verifyNotification(req.body);

    console.log("📥 Payment notification received:", {
      orderId: notification.orderId,
      status: notification.transactionStatus,
    });

    // Update transaction in database
    const transaction = await paymentDB.updateTransactionStatus({
      orderId: notification.orderId,
      transactionStatus: notification.transactionStatus,
      paymentType: notification.paymentType,
      transactionTime: notification.transactionTime,
      settlementTime: notification.settlementTime,
      midtransTransactionId: notification.midtransTransactionId,
      midtransResponse: notification.fullResponse,
    });

    // If payment is successful, grant package access
    if (notification.transactionStatus === "settlement") {
      console.log("✅ Payment successful, granting access...");

      const packages = await paymentDB.getAllPackages();

      if (!packages || packages.length === 0) {
        console.error("❌ No packages available");
        return res.status(500).json({
          success: false,
          message: "No packages available",
        });
      }

      // Deterministic package selection for the Rp 10.000 offer.
      // Configure on staging/production via env:
      // PAYMENT_GRANT_PACKAGE_IDS="1,2" (comma-separated)
      let packageIds = [];
      const configuredIds = String(process.env.PAYMENT_GRANT_PACKAGE_IDS || "")
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean)
        .map((v) => Number(v))
        .filter((n) => Number.isFinite(n));

      if (configuredIds.length > 0) {
        const available = new Set(packages.map((p) => Number(p.id)));
        packageIds = configuredIds.filter((id) => available.has(id));
      }

      // Fallback: try to pick December + January packages by name
      if (packageIds.length === 0) {
        const picked = packages.filter((p) => {
          const name = String(p.name || "").toLowerCase();
          return (
            name.includes("dec") ||
            name.includes("des") ||
            name.includes("december") ||
            name.includes("jan") ||
            name.includes("januari") ||
            name.includes("january") ||
            name.includes("new year")
          );
        });

        packageIds = picked.slice(0, 2).map((p) => p.id);
      }

      // Final fallback: just grant the first 2 active packages
      if (packageIds.length === 0) {
        packageIds = packages.slice(0, 2).map((p) => p.id);
      }

      if (packageIds.length === 0) {
        console.error("❌ Failed to determine packages to grant");
        return res.status(500).json({
          success: false,
          message: "Failed to determine packages to grant",
        });
      }

      await paymentDB.grantPackageAccess({
        userId: transaction.user_id,
        transactionId: transaction.id,
        packageIds,
      });

      console.log("✅ Access granted to user:", transaction.user_id);
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).json({
      success: false,
      message: "Webhook processing failed",
      error: error.message,
    });
  }
});

/**
 * GET /api/payment/status/:orderId
 * Check payment status
 */
router.get("/status/:orderId", verifyToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.uid;

    // Get transaction from database
    const transaction = await paymentDB.getTransactionByOrderId(orderId);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    // Verify ownership
    if (transaction.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // Get latest status from Midtrans
    const midtransStatus = await midtransService.getTransactionStatus(orderId);

    // Update in database if status changed
    if (midtransStatus.transaction_status !== transaction.transaction_status) {
      await paymentDB.updateTransactionStatus({
        orderId,
        transactionStatus: midtransStatus.transaction_status,
        paymentType: midtransStatus.payment_type,
        transactionTime: midtransStatus.transaction_time,
        settlementTime: midtransStatus.settlement_time,
        midtransTransactionId: midtransStatus.transaction_id,
        midtransResponse: midtransStatus,
      });
    }

    res.json({
      success: true,
      data: {
        orderId: transaction.order_id,
        status: midtransStatus.transaction_status,
        paymentType: midtransStatus.payment_type,
        grossAmount: transaction.gross_amount,
      },
    });
  } catch (error) {
    console.error("Check status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to check status",
      error: error.message,
    });
  }
});

/**
 * GET /api/payment/history
 * Get user's payment history
 */
router.get("/history", verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const transactions = await paymentDB.getUserTransactions(userId);

    res.json({
      success: true,
      data: transactions,
    });
  } catch (error) {
    console.error("Get history error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get payment history",
      error: error.message,
    });
  }
});

/**
 * GET /api/payment/access
 * Get user's current package access
 */
router.get("/access", verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const access = await paymentDB.getUserActiveAccess(userId);

    if (!access) {
      return res.json({
        success: true,
        hasAccess: false,
        data: null,
      });
    }

    // Get accessible frames
    const frameIds = await paymentDB.getUserAccessibleFrames(userId);

    // Calculate days remaining
    const now = new Date();
    const accessEnd = new Date(access.access_end);
    const daysRemaining = Math.ceil((accessEnd - now) / (1000 * 60 * 60 * 24));

    res.json({
      success: true,
      hasAccess: true,
      data: {
        accessStart: access.access_start,
        accessEnd: access.access_end,
        daysRemaining,
        packageIds: access.package_ids,
        frameIds,
        totalFrames: frameIds.length,
      },
    });
  } catch (error) {
    console.error("Get access error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get access info",
      error: error.message,
    });
  }
});

/**
 * GET /api/payment/can-purchase
 * Check if user can purchase new package
 */
router.get("/can-purchase", verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const hasAccess = await paymentDB.hasActiveAccess(userId);

    res.json({
      success: true,
      canPurchase: !hasAccess,
      message: hasAccess
        ? "Anda masih memiliki akses aktif"
        : "Anda dapat membeli paket baru",
    });
  } catch (error) {
    console.error("Can purchase check error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to check purchase eligibility",
      error: error.message,
    });
  }
});

module.exports = router;
