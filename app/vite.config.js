import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import path from "node:path";
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "src")
    }
  },
  server: {
    host: "127.0.0.1",
    port: 3003,
    strictPort: true,
    proxy: {
      "/rt": { target: "ws://127.0.0.1:4000", ws: true },
      "/api-test": {
        target: "http://127.0.0.1:4001",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-test/, "")
      },
      "/api": {
        target: "http://127.0.0.1:4000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, "")
      }
    }
  }
});
