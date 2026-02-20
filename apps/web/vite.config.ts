import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        // Evita problemas de resolu\u00e7\u00e3o IPv6 (localhost -> ::1) em algumas m\u00e1quinas Windows.
        target: "http://127.0.0.1:8080",
        changeOrigin: true
      }
    }
  }
});
