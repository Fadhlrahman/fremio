import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

console.log("Starting server setup...");

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  console.log("Health check requested");
  res.json({
    success: true,
    message: "Fremio Backend API is running",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/health", (req, res) => {
  console.log("API health check requested");
  res.json({ status: "ok", port: PORT, timestamp: new Date().toISOString() });
});

const server = app.listen(PORT, () => {
  console.log(`🚀 Simple backend running on http://localhost:${PORT}`);
  console.log(`✅ Test endpoint: http://localhost:${PORT}/health`);
  console.log(`Server listening on port ${PORT}`);
});

server.on("error", (err) => {
  console.error("Server error:", err);
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection:", err);
});
