import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import dotenv from "dotenv";
import { initializeFirebase } from "./config/firebase.js";
import storageService from "./services/storageService.js";

// Routes
import authRoutes from "./routes/auth.js";
import framesRoutes from "./routes/frames.js";
import draftsRoutes from "./routes/drafts.js";
import uploadRoutes from "./routes/upload.js";
import analyticsRoutes from "./routes/analytics.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(compression());
app.use(morgan("dev"));
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Health check
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Fremio Backend API is running",
    timestamp: new Date().toISOString(),
  });
});

// Legacy health check (for compatibility)
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", port: PORT, timestamp: new Date().toISOString() });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/frames", framesRoutes);
app.use("/api/drafts", draftsRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/analytics", analyticsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// Initialize Firebase and start server
const startServer = async () => {
  try {
    // Initialize Firebase Admin
    await initializeFirebase();

    // Start cleanup cron for temp files (every 6 hours)
    setInterval(() => {
      const hours = parseInt(process.env.TEMP_FILE_CLEANUP_HOURS) || 24;
      storageService.cleanupTempFiles(hours);
    }, 6 * 60 * 60 * 1000);

    // Start server
    app.listen(PORT, () => {
      console.log("");
      console.log("🚀 ============================================");
      console.log(`🚀 Fremio Backend API running on port ${PORT}`);
      console.log(`🚀 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`🚀 Frontend URL: ${process.env.FRONTEND_URL}`);
      console.log("🚀 ============================================");
      console.log("");
      console.log("📋 Available endpoints:");
      console.log("   GET  /health");
      console.log("   POST /api/auth/register");
      console.log("   GET  /api/auth/me");
      console.log("   GET  /api/frames");
      console.log("   POST /api/frames");
      console.log("   GET  /api/drafts");
      console.log("   POST /api/upload/image");
      console.log("   POST /api/analytics/track");
      console.log("");
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

export default app;
