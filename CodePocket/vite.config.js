import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { crx } from "@crxjs/vite-plugin";
import manifest from "./src/manifest.json";
import path from "path";

export default defineConfig({
  plugins: [vue(), crx({ manifest })],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    host: "127.0.0.1",
    origin: "http://127.0.0.1:5173",
    cors: true,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
    hmr: {
      clientPort: 5173,
      host: "127.0.0.1",
    },
  },
  build: {
    rollupOptions: {
      input: {
        viewer: "src/viewer.html",
        runner: "src/runner.html",
      },
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("element-plus")) {
              return "element-plus";
            }
            if (
              id.includes("codemirror") ||
              id.includes("vue-codemirror") ||
              id.includes("@codemirror")
            ) {
              return "codemirror";
            }
            if (id.includes("vue")) {
              return "vue"; // Separate Vue core
            }
            return "vendor";
          }
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});
