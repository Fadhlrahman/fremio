import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react()],
  base: "/fremio/", // ganti sesuai subpath deploy
  server: {
    historyApiFallback: true, // Tambahkan ini untuk menangani rute sisi klien
  },
});
