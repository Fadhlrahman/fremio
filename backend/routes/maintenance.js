import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { verifyToken, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_PROD_CONFIG_PATH =
  process.platform !== "win32" ? "/var/www/shared/fremio/maintenance.json" : null;

const CONFIG_PATH =
  process.env.MAINTENANCE_CONFIG_PATH ||
  (process.env.NODE_ENV === "production" && DEFAULT_PROD_CONFIG_PATH
    ? DEFAULT_PROD_CONFIG_PATH
    : path.join(__dirname, "..", "config", "maintenance.json"));

const parseBool = (value) => {
  const raw = String(value ?? "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
};

const parseWhitelist = (value) => {
  const raw = String(value ?? "");
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
};

let state = {
  enabled: parseBool(process.env.MAINTENANCE_ENABLED),
  message: String(process.env.MAINTENANCE_MESSAGE || ""),
  whitelist: [],
};

const loadStateFromDisk = () => {
  try {
    if (!fs.existsSync(CONFIG_PATH)) return;
    const parsed = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
    if (typeof parsed?.enabled === "boolean") state.enabled = parsed.enabled;
    if (typeof parsed?.message === "string") state.message = parsed.message;
    if (Array.isArray(parsed?.whitelist)) {
      state.whitelist = parsed.whitelist
        .map((s) => String(s || "").trim().toLowerCase())
        .filter(Boolean);
    }
  } catch (e) {
    // Non-fatal: keep defaults.
  }
};

const saveStateToDisk = () => {
  try {
    fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(state, null, 2));
  } catch (e) {
    // Non-fatal: state will not persist across restarts.
  }
};

loadStateFromDisk();

const isWhitelisted = (user) => {
  const whitelist = new Set([
    ...parseWhitelist(process.env.MAINTENANCE_WHITELIST).map((s) => s.toLowerCase()),
    ...(state.whitelist || []).map((s) => String(s).toLowerCase()),
  ]);
  if (!whitelist.size) return false;

  const userId = String(user?.userId || user?.uid || "").trim();
  const email = String(user?.email || "").trim().toLowerCase();

  return whitelist.has(email) || whitelist.has(userId.toLowerCase());
};

router.get("/status", (req, res) => {
  return res.json({
    success: true,
    enabled: !!state.enabled,
    message: state.message || "",
  });
});

router.get("/access", verifyToken, (req, res) => {
  const user = req.user;
  const allowed = user?.role === "admin" || isWhitelisted(user);
  return res.json({ success: true, allowed });
});

router.put("/admin/status", verifyToken, requireAdmin, (req, res) => {
  const { enabled, message } = req.body || {};

  if (typeof enabled !== "boolean") {
    return res.status(400).json({
      success: false,
      message: "Field 'enabled' must be boolean",
    });
  }

  state.enabled = enabled;
  state.message = typeof message === "string" ? message : "";
  saveStateToDisk();

  return res.json({ success: true, enabled: state.enabled, message: state.message });
});

router.get("/admin/whitelist", verifyToken, requireAdmin, (req, res) => {
  const combined = new Set([
    ...parseWhitelist(process.env.MAINTENANCE_WHITELIST).map((s) => s.toLowerCase()),
    ...(state.whitelist || []).map((s) => String(s).toLowerCase()),
  ]);
  return res.json({ success: true, whitelist: Array.from(combined).sort() });
});

router.post("/admin/whitelist", verifyToken, requireAdmin, (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  if (!email) {
    return res.status(400).json({ success: false, message: "Field 'email' is required" });
  }

  const set = new Set((state.whitelist || []).map((s) => String(s).toLowerCase()));
  set.add(email);
  state.whitelist = Array.from(set).sort();
  saveStateToDisk();
  return res.json({ success: true, whitelist: state.whitelist });
});

router.delete(
  "/admin/whitelist/:email",
  verifyToken,
  requireAdmin,
  (req, res) => {
    const email = String(req.params.email || "").trim().toLowerCase();
    const set = new Set((state.whitelist || []).map((s) => String(s).toLowerCase()));
    set.delete(email);
    state.whitelist = Array.from(set).sort();
    saveStateToDisk();
    return res.json({ success: true, whitelist: state.whitelist });
  }
);

export default router;
