import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import https from "https";
import { fileURLToPath } from "url";
import { initializeFirebase } from "./config/firebase.js";
import storageService from "./services/storageService.js";

// Routes
import authRoutes from "./routes/auth.js";
import framesRoutes from "./routes/frames.js";
import draftsRoutes from "./routes/drafts-pg.js"; // Use PostgreSQL version
import uploadRoutes from "./routes/upload.js";
import analyticsRoutes from "./routes/analytics.js";
import staticRoutes from "./routes/static.js";
import paymentRoutes from "./routes/payment.js";

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === "production";

// CRITICAL: Trust proxy for nginx reverse proxy
// This allows express-rate-limit to see real client IPs from X-Forwarded-For
app.set("trust proxy", 1);

// Rate limiting configuration
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 500 : 1000, // Increased limit: 500 in prod, 1000 in dev
  message: {
    success: false,
    message: "Terlalu banyak permintaan, coba lagi dalam 15 menit",
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Use real client IP from X-Forwarded-For header (nginx sets this)
  keyGenerator: (req) => {
    return (
      req.ip ||
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.connection.remoteAddress
    );
  },
  // Skip rate limiting for OPTIONS preflight requests
  skip: (req) => req.method === "OPTIONS",
});

// Stricter rate limit for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 50 : 100, // Limit login attempts
  message: {
    success: false,
    message: "Terlalu banyak percobaan login, coba lagi dalam 15 menit",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === "OPTIONS",
});

// Upload rate limit
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isProduction ? 100 : 200, // Limit uploads per hour
  message: {
    success: false,
    message: "Terlalu banyak upload, coba lagi dalam 1 jam",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === "OPTIONS",
});

// Middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false, // Disable CSP for development
  })
);
app.use(compression());
app.use(morgan(isProduction ? "combined" : "dev"));

// CORS - Allow all origins for static files and API
app.use(
  cors({
    origin: true, // Allow all origins
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// CRITICAL: Handle OPTIONS preflight before any other middleware
app.options(
  "*",
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 204,
  })
);

// Apply general rate limiting
app.use(generalLimiter);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Serve static files from public directory
const publicDir = process.env.STATIC_DIR || path.join(__dirname, "public");
app.use(
  "/static",
  express.static(publicDir, {
    maxAge: "1y",
    immutable: true,
  })
);

// Serve mock-frames (alias to public/mock-frames)
app.use(
  "/mock-frames",
  express.static(path.join(publicDir, "mock-frames"), {
    maxAge: "1y",
    immutable: true,
  })
);

// Serve uploaded files (frames, thumbnails)
const uploadsDir = path.join(__dirname, "uploads");
app.use(
  "/uploads",
  express.static(uploadsDir, {
    maxAge: "30d",
    etag: true,
  })
);

// Health check
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Fremio Backend API is running",
    timestamp: new Date().toISOString(),
    environment: isProduction ? "production" : "development",
  });
});

// Legacy health check (for compatibility)
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", port: PORT, timestamp: new Date().toISOString() });
});

// API Routes - Apply specific rate limiters
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/frames", framesRoutes);
app.use("/api/drafts", draftsRoutes);
app.use("/api/upload", uploadLimiter, uploadRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/static", staticRoutes);
app.use("/api/payment", paymentRoutes);

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

    // Check for HTTPS certificates
    const certPath = path.join(__dirname, "localhost+3.pem");
    const keyPath = path.join(__dirname, "localhost+3-key.pem");
    const useHttps = fs.existsSync(certPath) && fs.existsSync(keyPath);

    if (useHttps) {
      // Start HTTPS server
      const httpsOptions = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
      };

      https.createServer(httpsOptions, app).listen(PORT, "0.0.0.0", () => {
        console.log("");
        console.log("🔒 ============================================");
        console.log(`🔒 Fremio Backend API running on HTTPS port ${PORT}`);
        console.log(`🔒 Environment: ${process.env.NODE_ENV || "development"}`);
        console.log(`🔒 Access from phone: https://192.168.100.160:${PORT}`);
        console.log("🔒 ============================================");
        console.log("");
      });
    } else {
      // Start HTTP server (fallback)
      app.listen(PORT, "0.0.0.0", () => {
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
        console.log("   GET  /api/static/frames");
        console.log("   POST /api/static/frames");
        console.log("   GET  /static/frames/:filename (direct image access)");
        console.log("");
      });
    }
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

export default app;
