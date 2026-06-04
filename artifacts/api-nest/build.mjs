import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";
import { rm } from "node:fs/promises";

globalThis.require = createRequire(import.meta.url);
const artifactDir = path.dirname(fileURLToPath(import.meta.url));

async function buildAll() {
  const distDir = path.resolve(artifactDir, "dist");
  await rm(distDir, { recursive: true, force: true });

  await esbuild({
    entryPoints: [path.resolve(artifactDir, "src/main.ts")],
    platform: "node",
    bundle: true,
    format: "cjs",
    outdir: distDir,
    logLevel: "info",
    external: [
      "*.node",
      "pg-native",
      // NestJS optional peer deps loaded via dynamic require — not used here.
      "@nestjs/microservices",
      "@nestjs/websockets",
      "@nestjs/websockets/socket-module",
      "@nestjs/microservices/microservices-module",
      "@nestjs/platform-socket.io",
      "@nestjs/platform-fastify",
      "@fastify/static",
      "class-transformer",
      "class-validator",
      "class-transformer/storage",
      "cache-manager",
      "@aws-sdk/*",
      "tesseract.js",
      "pdf-parse",
    ],
    sourcemap: "linked",
  });
}

buildAll().catch((err) => { console.error(err); process.exit(1); });
