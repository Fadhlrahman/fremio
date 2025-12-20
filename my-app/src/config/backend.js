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
// IMPORTANT: default to relative /api so localhost never accidentally hits production
// (Vite dev server should proxy /api -> local backend)
export const VPS_API_URL = import.meta.env.VITE_API_URL || '/api';

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
