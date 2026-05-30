---
name: api-nest build + importing @workspace/db
description: Why api-nest bundles with esbuild and how it must be configured to import the shared Drizzle db package
---

# api-nest production build must bundle to import `@workspace/db`

`@workspace/db` exposes its entry via `exports` pointing at TypeScript **source**
(`./src/index.ts`), and that source uses ESM directory imports
(`import * as schema from "./schema"`) plus extensionless relative imports. Plain
Node (even Node 24 with native type-stripping) cannot resolve those at runtime —
`node dist/main.js` fails with `Directory import ... is not supported`.

**Rule:** any api-nest module that imports `@workspace/db` (or any workspace lib
whose entry is .ts) requires the production build to **bundle**, not just `tsc`.

**How it's set up:**
- `artifacts/api-nest/build.mjs` runs esbuild (`bundle`, `format: cjs`,
  out `dist/main.js`) — mirrors `api-server/build.mjs`. `package.json` `build`
  script is `node build.mjs`. The artifact's production run command
  (`node artifacts/api-nest/dist/main.js`) is unchanged because esbuild emits the
  same path tsc did.
- NestJS optional peer deps (`@nestjs/microservices`, `@nestjs/websockets`,
  `class-validator`, `class-transformer`, `cache-manager`, fastify/socket.io) are
  esbuild `external` — Nest core `require()`s them in try/catch, so a missing
  module is swallowed. `@aws-sdk/*` and `pg-native` are also external (aws-sdk is a
  real installed dep loaded at runtime).
- `tsconfig.json` must use `moduleResolution: "bundler"` + `module: "esnext"`
  (was `node`/`commonjs`) so `tsc --noEmit` typecheck can resolve the db
  package's `exports`. tsc is typecheck-only now; esbuild does the emit.

**Why:** dev (`tsx watch`) always handled the .ts directory imports, masking the
problem until something actually imported `@workspace/db` into the tsc→node build
path. Chat persistence (chat_threads/chat_messages via Drizzle) was the first.
