---
name: Order lifecycle wiring (Sourcing→Trading→QA→Logistics)
description: How fulfillment stages connect to live orders, and why api-server dev runs under tsx watch — durable conventions for this admin.
---

# Fulfillment stages must pull live orders, not stand alone

Order statuses: `pending → confirmed → dispatched → delivered` (+`cancelled`). **"confirmed" = payment captured** and is the trigger that should feed every downstream fulfillment stage. Admin orders are API-backed (shared storefront↔admin), so a guest checkout order is visible in `/admin/orders` immediately.

**Convention:** any stage that gates/handles an order (Logistics dispatch queue, QA dispatch checks) materializes its work from confirmed orders via `useAdminOrders()` filtered to `status === "confirmed"`, rather than relying on hand-created entries. Logistics (`logistics-ops.tsx`) and QA (`qa-ops.tsx` DispatchTab "Awaiting QA" section) both follow this. If you add another fulfillment stage, mirror the same pattern.

**Why:** QA originally only showed manually-created `qa.dispatch-checks`, so paid orders never appeared and the "trust pipeline" had a silent gap. The fix surfaces confirmed-but-unchecked orders and lets staff open a 7-step `DispatchCheck` prefilled with the order number.

**How to apply:** dedupe "awaiting" lists against BOTH `orderRef` and `batchRef` of existing checks (manual checks may set `batchRef = orderNo` with no `orderRef`), or you'll allow duplicate gates for the same order. Never mutate cmsStore during render/`useMemo` — only in event handlers, to avoid render loops.

# api-server (legacy /api, port 8080) runs `tsx watch` in dev
Dev script is `NODE_ENV=development tsx watch src/index.ts` (not `build && start`). The old build-then-start did a full ~2.3mb esbuild on every restart, leaving `/api/*` returning 502 for several seconds — which looked like a "shop won't load" bug but was just restart downtime. `tsx watch` boots in ~hundreds of ms.
**Why:** `pino-pretty` transport is enabled only when `NODE_ENV !== "production"` and runs in a worker thread; it works fine under tsx (plain node_modules). The esbuild bundle (`build.mjs`, with `esbuild-plugin-pino`) is still used for production `build`/`start` — keep both.
