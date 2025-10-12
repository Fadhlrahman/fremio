import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite";
import fs from 'fs'
import path from 'path'

const resolveCertPath = (filename) => {
  const localPath = path.resolve(__dirname, filename)
  if (fs.existsSync(localPath)) {
    return localPath
  }

  const parentPath = path.resolve(__dirname, '..', filename)
  if (fs.existsSync(parentPath)) {
    return parentPath
  }

  throw new Error(`HTTPS dev certificate not found: ${filename}. Run 'mkcert localhost 127.0.0.1 ::1 192.168.100.181' inside the project and ensure the generated files are present.`)
}


// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react()],
  base: "/fremio/", // ganti sesuai subpath deploy
  server: {
    host: '0.0.0.0',
    https: {
      cert: fs.readFileSync(resolveCertPath('localhost+3.pem')),
      key: fs.readFileSync(resolveCertPath('localhost+3-key.pem')),
    }
  },
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg']
  }
});
