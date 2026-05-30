import { defineConfig } from "vitest/config"

// Unit tests run the NestJS service classes directly (instantiated with mocked
// dependencies — no DI container, no HTTP server, no Postgres). esbuild handles
// the legacy decorators via the package tsconfig; emitDecoratorMetadata is not
// needed because nothing here resolves dependencies through Nest's container.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.spec.ts"],
    globals: false,
  },
})
