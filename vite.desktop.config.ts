import { defineConfig } from "vite";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  define: {
    "import.meta.env.VITE_TAURI_DESKTOP": JSON.stringify("true"),
  },
  plugins: [
    {
      name: "desktop-api-route-stubs",
      enforce: "pre",
      transform(code, id) {
        if (!/\/src\/routes\/api\.[^/]+\.tsx?$/.test(id.split("?")[0] ?? "")) return;
        const route = code.match(/createFileRoute\(["']([^"']+)["']\)/)?.[1];
        if (!route) throw new Error(`API route identifier missing: ${id}`);
        // The shared generated tree references API routes. Desktop needs only their
        // identifiers, never their server handlers or server-side dependencies.
        return {
          code: `import { createFileRoute } from "@tanstack/react-router"; export const Route = createFileRoute(${JSON.stringify(route)})({});`,
          map: null,
        };
      },
    },
    react(),
    tailwindcss(),
    tsconfigPaths(),
  ],
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
