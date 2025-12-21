// Simple test server
import express from "express";
import https from "https";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5050;

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Backend is running!" });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", port: PORT });
});

// Check for HTTPS certificates
const certPath = path.join(__dirname, "localhost+3.pem");
const keyPath = path.join(__dirname, "localhost+3-key.pem");
const useHttps = fs.existsSync(certPath) && fs.existsSync(keyPath);

if (useHttps) {
  const httpsOptions = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  };

  const server = https.createServer(httpsOptions, app);
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ Test HTTPS server running on port ${PORT}`);
  });

  server.on("error", (err) => {
    console.error("❌ Server error:", err);
  });
} else {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ Test HTTP server running on port ${PORT}`);
  });
}

// Handle unhandled rejections
process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection:", err);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
});
