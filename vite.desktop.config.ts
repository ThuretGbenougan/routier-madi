import { defineConfig } from "vite";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tailwindcss(), tsconfigPaths()],
  root: "desktop",
  resolve: {
    alias: {
      "/src": resolve(import.meta.dirname, "src"),
    },
  },
  server: {
    port: 8081,
    strictPort: true,
    fs: {
      allow: [resolve(import.meta.dirname)],
    },
  },
  build: {
    outDir: "../desktop-dist",
    emptyOutDir: true,
  },
});
