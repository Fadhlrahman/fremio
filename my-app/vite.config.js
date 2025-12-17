import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import fs from 'fs'
import path from 'path'

// Check if we should use HTTPS (only if certs exist AND not local dev)
const shouldUseHttps = () => {
  // Enable HTTPS for camera access on non-localhost
  if (process.env.VITE_DISABLE_HTTPS === 'true') {
    return false;
  }
  const certPath = path.resolve(__dirname, 'localhost+3.pem')
  const keyPath = path.resolve(__dirname, 'localhost+3-key.pem')
  return fs.existsSync(certPath) && fs.existsSync(keyPath)
}

const getHttpsConfig = () => {
  if (!shouldUseHttps()) {
    return false;
  }
  
  try {
    return {
      cert: fs.readFileSync(path.resolve(__dirname, 'localhost+3.pem')),
      key: fs.readFileSync(path.resolve(__dirname, 'localhost+3-key.pem')),
    }
  } catch (e) {
    console.warn('⚠️ HTTPS certs not found, using HTTP');
    return false;
  }
}

// Generate unique hash based on timestamp to bust cache
const buildTimestamp = Date.now().toString(36);

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react()],
  define: {
    __BUILD_TIMESTAMP__: JSON.stringify(buildTimestamp),
  },
  base: process.env.NODE_ENV === 'production' ? "/" : "/fremio/", // production: /, development: /fremio/
  server: {
    host: '0.0.0.0',
    port: 5180,
    https: getHttpsConfig()
  },
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg']
  },
  build: {
    rollupOptions: {
      output: {
        // Use assets folder with timestamp for cache busting
        entryFileNames: `assets/[name]-${buildTimestamp}-[hash].js`,
        chunkFileNames: `assets/[name]-${buildTimestamp}-[hash].js`,
        assetFileNames: `assets/[name]-${buildTimestamp}-[hash].[ext]`
      }
    }
  }
});
