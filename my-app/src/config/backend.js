// ============================================
// BACKEND CONFIGURATION
// Switch between Firebase and VPS Backend
// ============================================

// Backend modes
export const BACKEND_MODE = {
  FIREBASE: 'firebase',
  VPS: 'vps',
  HYBRID: 'hybrid'  // Auth: Firebase, Data: VPS
};

// Get current backend mode from environment or default
// Set VITE_BACKEND_MODE=vps in .env to use VPS backend
const getBackendMode = () => {
  const mode = import.meta.env.VITE_BACKEND_MODE || 'firebase';
  return mode.toLowerCase();
};

export const currentBackendMode = getBackendMode();

// VPS API Configuration
// IMPORTANT:
// - In development, default to relative /api so localhost never accidentally hits production
//   (Vite dev server should proxy /api -> local backend)
// - In production Cloudflare Pages, VITE_API_URL must be set. If it's not, fall back to
//   the known production API domain so payment/pending endpoints still work.
const resolveVpsApiUrl = () => {
  const explicit = String(import.meta.env.VITE_API_URL || "").trim();
  if (explicit) return explicit;

  // Runtime fallback (when env vars weren't injected into the build)
  if (typeof window !== "undefined" && window.location) {
    const hostname = String(window.location.hostname || "").toLowerCase();

    // Local development
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "/api";
    }

    // Fremio production domains (Cloudflare Pages + custom domain)
    if (hostname.endsWith("fremio.id") || hostname.endsWith("pages.dev")) {
      return "https://api.fremio.id/api";
    }
  }

  return "/api";
};

export const VPS_API_URL = resolveVpsApiUrl();

// Check if using VPS
export const isVPSMode = () => {
  return currentBackendMode === BACKEND_MODE.VPS;
};

// Check if using Firebase
export const isFirebaseMode = () => {
  return currentBackendMode === BACKEND_MODE.FIREBASE;
};

// Check if using Hybrid (Firebase Auth + VPS Data)
export const isHybridMode = () => {
  return currentBackendMode === BACKEND_MODE.HYBRID;
};

// Log current mode on startup
console.log(`🔧 Backend Mode: ${currentBackendMode.toUpperCase()}`);
if (isVPSMode()) {
  console.log(`📡 VPS API URL: ${VPS_API_URL}`);
}

export default {
  BACKEND_MODE,
  currentBackendMode,
  VPS_API_URL,
  isVPSMode,
  isFirebaseMode,
  isHybridMode
};
