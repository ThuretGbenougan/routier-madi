import { defineConfig, loadEnv } from "vite";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ command, mode }) => {
  const envDir = import.meta.dirname;
  const env = loadEnv(mode, envDir, "VITE_");
  if (command === "build") {
    let apiUrl: URL;
    try {
      apiUrl = new URL(env["VITE_API_URL"] ?? "");
    } catch {
      throw new Error(
        "VITE_API_URL must be set to the public HTTPS API origin for desktop builds.",
      );
    }
    if (
      apiUrl.protocol !== "https:" ||
      apiUrl.username ||
      apiUrl.password ||
      apiUrl.pathname !== "/" ||
      apiUrl.search ||
      apiUrl.hash ||
      ["localhost", "127.0.0.1", "[::1]"].includes(apiUrl.hostname)
    ) {
      throw new Error(
        "VITE_API_URL must be a public HTTPS origin without credentials, path, query or fragment.",
      );
    }
  }
  return {
    envDir,
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
    publicDir: resolve(import.meta.dirname, "public"),
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
  };
});
