/**
 * Admin Package Routes
 * Admin-only routes for managing frame packages
 */

import express from "express";
import paymentDB from "../services/paymentDatabaseService.js";
import { verifyToken, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

// All routes require admin authentication
router.use(verifyToken, requireAdmin);

/**
 * GET /api/admin/packages
 * Get all packages
 */
router.get("/", async (req, res) => {
  try {
    const packages = await paymentDB.getAllPackages();
    res.json({
      success: true,
      data: packages,
    });
  } catch (error) {
    console.error("Get packages error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get packages",
      error: error.message,
    });
  }
});

/**
 * POST /api/admin/packages
 * Create new package
 */
router.post("/", async (req, res) => {
  try {
    const {
      name,
      description,
      frameIds,
      price,
      originalPrice,
      discountPercentage,
    } = req.body;

    if (!name || !frameIds || frameIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Name and frameIds are required",
      });
    }

    const newPackage = await paymentDB.createPackage({
      name,
      description,
      frameIds,
      price: price || 10000,
      originalPrice: originalPrice || 50000,
      discountPercentage: discountPercentage || 80,
    });

    res.json({
      success: true,
      data: newPackage,
      message: "Package created successfully",
    });
  } catch (error) {
    console.error("Create package error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create package",
    });
  }
});

/**
 * PUT /api/admin/packages/:id
 * Update package
 */
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      frameIds,
      isActive,
      price,
      originalPrice,
      discountPercentage,
    } = req.body;

    const pkg = await paymentDB.updatePackage(parseInt(id), {
      name,
      description,
      frameIds,
      isActive,
      price,
      originalPrice,
      discountPercentage,
    });

    if (!pkg) {
      return res.status(404).json({
        success: false,
        message: "Package not found",
      });
    }

    res.json({
      success: true,
      data: pkg,
      message: "Package updated successfully",
    });
  } catch (error) {
    console.error("Update package error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update package",
    });
  }
});

/**
 * DELETE /api/admin/packages/:id
 * Delete package
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const pkg = await paymentDB.deletePackage(parseInt(id));

    if (!pkg) {
      return res.status(404).json({
        success: false,
        message: "Package not found",
      });
    }

    res.json({
      success: true,
      message: "Package deleted successfully",
    });
  } catch (error) {
    console.error("Delete package error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete package",
      error: error.message,
    });
  }
});

/**
 * GET /api/admin/packages/stats
 * Get payment statistics
 */
router.get("/stats/payment", async (req, res) => {
  try {
    const stats = await paymentDB.getPaymentStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Get stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get statistics",
      error: error.message,
    });
  }
});

export default router;
