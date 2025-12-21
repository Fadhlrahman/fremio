/**
 * Payment Routes
 * Handles payment-related API endpoints
 */

import express from "express";
import midtransService from "../services/midtransService.js";
import paymentDB from "../services/paymentDatabaseService.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

// Checkout gating to protect users during integration testing.
// PAYMENT_CHECKOUT_MODE: disabled | whitelist | enabled (default: enabled)
// PAYMENT_CHECKOUT_WHITELIST: comma-separated user IDs or emails allowed when mode=whitelist
const getCheckoutMode = () => {
  const mode = String(
    process.env.PAYMENT_CHECKOUT_MODE || "enabled"
  ).toLowerCase();
  return ["disabled", "whitelist", "enabled"].includes(mode) ? mode : "enabled";
};

const isWhitelisted = ({ userId, email }) => {
  const raw = String(process.env.PAYMENT_CHECKOUT_WHITELIST || "");
  if (!raw.trim()) return false;
  const allow = new Set(
    raw
      .split(",")
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean)
  );

  if (userId && allow.has(String(userId).toLowerCase())) return true;
  if (email && allow.has(String(email).toLowerCase())) return true;
  return false;
};

const determinePackageIdsToGrant = ({ packages }) => {
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
    const available = new Set((packages || []).map((p) => Number(p.id)));
    packageIds = configuredIds.filter((id) => available.has(id));
  }

  // Fallback: try to pick December + January packages by name
  if (packageIds.length === 0) {
    const picked = (packages || []).filter((p) => {
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
    packageIds = (packages || []).slice(0, 2).map((p) => p.id);
  }

  return packageIds;
};

/**
 * POST /api/payment/create
 * Create new payment transaction
 */
router.post("/create", verifyToken, async (req, res) => {
  try {
    const userId = req.user?.uid || req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Autentikasi gagal: userId tidak ditemukan",
      });
    }
    const { email, name, phone } = req.body;

    console.log("💰 Creating payment for user:", userId);

    // Optional checkout gating (protect users while Midtrans integration is being tested)
    const checkoutMode = getCheckoutMode();
    if (checkoutMode === "disabled") {
      return res.status(503).json({
        success: false,
        message: "Checkout sedang ditutup sementara. Silakan coba lagi nanti.",
      });
    }

    if (checkoutMode === "whitelist" && !isWhitelisted({ userId, email })) {
      return res.status(403).json({
        success: false,
        message:
          "Checkout belum dibuka untuk umum (mode testing). Silakan coba lagi nanti.",
      });
    }

    // Try database operations with fallback
    let hasAccess = false;
    let hasPending = false;

    try {
      // Check if user already has active access
      hasAccess = await paymentDB.hasActiveAccess(userId);

      if (hasAccess) {
        return res.status(400).json({
          success: false,
          message:
            "Anda masih memiliki akses aktif. Tidak bisa membeli paket baru sebelum masa aktif berakhir.",
        });
      }

      // Check if there's pending transaction
      const userTransactions = await paymentDB.getUserTransactions(userId);
      hasPending = userTransactions.some((t) => t.status === "pending");

      if (hasPending) {
        return res.status(400).json({
          success: false,
          message:
            "Anda memiliki transaksi yang sedang pending. Silakan selesaikan pembayaran terlebih dahulu.",
        });
      }
    } catch (dbError) {
      console.log(
        "⚠️  Database unavailable for payment check, continuing without validation"
      );
      // Continue without database validation in fallback mode
    }

    // Generate order ID
    const orderId = midtransService.generateOrderId(userId);
    const grossAmount = 10000; // Rp 10.000

    console.log("📝 Order ID generated:", orderId);

    // Create transaction in database FIRST (required for status check later)
    await paymentDB.createTransaction({
      userId,
      orderId,
      grossAmount,
    });
    console.log("✅ Transaction saved to database");

    // Create Midtrans transaction
    const customerDetails = {
      email: email || `${userId}@fremio.app`,
      first_name: name || "Fremio User",
      phone: phone || "08123456789",
    };

    console.log("🔄 Creating Midtrans transaction...");

    const transaction = await midtransService.createTransaction({
      orderId,
      grossAmount,
      customerDetails,
    });

    console.log("✅ Midtrans transaction created successfully");

    res.json({
      success: true,
      data: {
        orderId,
        token: transaction.token,
        redirectUrl: transaction.redirect_url,
      },
    });
  } catch (error) {
    console.error("❌ Create payment error:", error);
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
    if (
      notification.transactionStatus === "settlement" ||
      notification.transactionStatus === "capture"
    ) {
      console.log("✅ Payment successful, granting access...");

      const packages = await paymentDB.getAllPackages();

      if (!packages || packages.length === 0) {
        console.error("❌ No packages available");
        return res.status(500).json({
          success: false,
          message: "No packages available",
        });
      }

      const packageIds = determinePackageIdsToGrant({ packages });

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
    const userId = req.user?.uid || req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Autentikasi gagal: userId tidak ditemukan",
      });
    }

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

    // Self-heal: if webhook failed but Midtrans confirms settlement, grant access here.
    const finalStatus = midtransStatus.transaction_status;
    if (finalStatus === "settlement" || finalStatus === "capture") {
      const alreadyGranted = await paymentDB.hasAccessForTransaction(
        transaction.id
      );
      if (!alreadyGranted) {
        const packages = await paymentDB.getAllPackages();
        const packageIds = determinePackageIdsToGrant({ packages });
        if (packageIds.length > 0) {
          await paymentDB.grantPackageAccess({
            userId: transaction.user_id,
            transactionId: transaction.id,
            packageIds,
          });
        }
      }
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
 * POST /api/payment/reconcile-latest
 * Fallback for users: find latest pending transaction and reconcile with Midtrans.
 * Useful when user doesn't know their orderId.
 */
router.post("/reconcile-latest", verifyToken, async (req, res) => {
  try {
    const userId = req.user?.uid || req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Autentikasi gagal: userId tidak ditemukan",
      });
    }

    const latestPending = await paymentDB.getLatestPendingTransaction(userId);
    if (!latestPending) {
      return res.json({
        success: true,
        message: "Tidak ada transaksi pending untuk direkonsiliasi",
        data: null,
      });
    }

    const midtransStatus = await midtransService.getTransactionStatus(
      latestPending.order_id
    );

    if (
      midtransStatus.transaction_status !== latestPending.transaction_status
    ) {
      await paymentDB.updateTransactionStatus({
        orderId: latestPending.order_id,
        transactionStatus: midtransStatus.transaction_status,
        paymentType: midtransStatus.payment_type,
        transactionTime: midtransStatus.transaction_time,
        settlementTime: midtransStatus.settlement_time,
        midtransTransactionId: midtransStatus.transaction_id,
        midtransResponse: midtransStatus,
      });
    }

    if (
      midtransStatus.transaction_status === "settlement" ||
      midtransStatus.transaction_status === "capture"
    ) {
      const alreadyGranted = await paymentDB.hasAccessForTransaction(
        latestPending.id
      );
      if (!alreadyGranted) {
        const packages = await paymentDB.getAllPackages();
        const packageIds = determinePackageIdsToGrant({ packages });
        if (packageIds.length > 0) {
          await paymentDB.grantPackageAccess({
            userId: latestPending.user_id,
            transactionId: latestPending.id,
            packageIds,
          });
        }
      }
    }

    return res.json({
      success: true,
      data: {
        orderId: latestPending.order_id,
        status: midtransStatus.transaction_status,
      },
    });
  } catch (error) {
    console.error("Reconcile latest error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reconcile payment",
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
    const userId = req.user?.uid || req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Autentikasi gagal: userId tidak ditemukan",
      });
    }
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
    const userId = req.user?.uid || req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Autentikasi gagal: userId tidak ditemukan",
      });
    }

    try {
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
      const daysRemaining = Math.ceil(
        (accessEnd - now) / (1000 * 60 * 60 * 24)
      );

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
    } catch (dbError) {
      console.log(
        "⚠️  Database error in /access, returning no access:",
        dbError.message
      );
      // Fallback: return no access if database fails
      return res.json({
        success: true,
        hasAccess: false,
        data: null,
      });
    }
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
    const userId = req.user?.uid || req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Autentikasi gagal: userId tidak ditemukan",
      });
    }

    try {
      const hasAccess = await paymentDB.hasActiveAccess(userId);

      res.json({
        success: true,
        canPurchase: !hasAccess,
        message: hasAccess
          ? "Anda masih memiliki akses aktif"
          : "Anda dapat membeli paket baru",
      });
    } catch (dbError) {
      console.log(
        "⚠️  Database error in /can-purchase, allowing purchase:",
        dbError.message
      );
      // Fallback: allow purchase if database fails
      return res.json({
        success: true,
        canPurchase: true,
        message: "Anda dapat membeli paket baru",
      });
    }
  } catch (error) {
    console.error("Can purchase check error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to check purchase eligibility",
      error: error.message,
    });
  }
});

export default router;
