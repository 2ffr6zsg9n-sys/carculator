import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const buildVersion = process.env.BUILD_VERSION ?? Date.now().toString();

export default defineConfig({
  plugins: [react()],
  root: "client",
  envDir: ".",
  base: process.env.GITHUB_ACTIONS ? "/carculator/" : "/",
  build: {
    outDir: "../dist-web",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: `assets/index-${buildVersion}.js`,
        chunkFileNames: `assets/[name]-${buildVersion}.js`,
        assetFileNames: `assets/[name]-${buildVersion}.[ext]`
      }
    }
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3000"
    }
  }
});
