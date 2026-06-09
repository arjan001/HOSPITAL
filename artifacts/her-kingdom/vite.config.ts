import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

// PORT and BASE_PATH are supplied by the artifact runtime for `vite dev`.
// During production builds (`vite build`) they aren't set — fall back to
// sensible defaults so the build doesn't crash. The dev-server still
// validates them strictly below.
const isBuild = process.argv.includes("build");

const rawPort = process.env.PORT ?? (isBuild ? "21470" : undefined);

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH ?? (isBuild ? "/" : undefined);

if (!basePath) {
  throw new Error(
    "BASE_PATH environment variable is required but was not provided.",
  );
}

const NEST = "http://localhost:8090";

/** Rewrite legacy `/api/foo` storefront paths to Nest `/api/v2/foo`. */
function nestLegacy(from: string, to: string) {
  return {
    target: NEST,
    changeOrigin: true,
    rewrite: (path: string) => path.replace(new RegExp(`^${from}`), to),
  };
}

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss({ optimize: false }),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
    proxy: {
      "/api/v2": {
        target: NEST,
        changeOrigin: true,
      },
      "/api/products": nestLegacy("/api/products", "/api/v2/products"),
      "/api/categories": nestLegacy("/api/categories", "/api/v2/categories"),
      "/api/site-data": nestLegacy("/api/site-data", "/api/v2/site-data"),
      "/api/delivery-locations": nestLegacy("/api/delivery-locations", "/api/v2/delivery-locations"),
      "/api/social-feed": nestLegacy("/api/social-feed", "/api/v2/social-feed"),
      "/api/blogs": nestLegacy("/api/blogs", "/api/v2/blogs"),
      "/api/track-view": nestLegacy("/api/track-view", "/api/v2/track-view"),
      "/api/track-event": nestLegacy("/api/track-event", "/api/v2/track-event"),
      "/api/track-abandoned": nestLegacy("/api/track-abandoned", "/api/v2/track-abandoned"),
      "/api/admin/analytics": nestLegacy("/api/admin/analytics", "/api/v2/admin/analytics"),
      "/api/video": nestLegacy("/api/video", "/api/v2/video"),
      "/api/upload": nestLegacy("/api/upload", "/api/v2/uploads/admin"),
      "/api/auth/change-password": nestLegacy("/api/auth/change-password", "/api/v2/admin/auth/change-password"),
      // Public product/media files served from api-nest local disk (no session).
      "/uploads": {
        target: NEST,
        changeOrigin: true,
      },
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
