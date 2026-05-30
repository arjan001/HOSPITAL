---
name: Order lifecycle wiring (Sourcing→Trading→QA→Logistics)
description: Which pipeline stages are actually wired to live orders vs. standalone, and the api-server restart fragility — learned from a live e2e test.
---

# Order lifecycle: what is wired to real orders

Order statuses: `pending → confirmed → dispatched → delivered` (+`cancelled`). "confirmed" = payment captured and is the intended trigger for the fulfillment stages. Admin orders are API-backed (api-nest in-memory repo, shared storefront↔admin), so a guest checkout order is visible in `/admin/orders` immediately.

- **Logistics IS wired to live orders.** `logistics-ops.tsx` Dispatch Queue uses `useAdminOrders()` → filters `status === "confirmed"` and not-yet-batched. Confirmed orders appear automatically; "Run server auto-assign" works end-to-end. Verified: buy→confirm→queue→auto-assign→dispatched→delivered all pass.
- **QA is NOT wired to live orders.** `qa-ops.tsx` "Dispatch QA" tab renders only manually-created cmsStore `qa.dispatch` checks (the "New QA check" button). Nothing pulls `confirmed` orders into QA, so a paid order never shows up there — it always reads "No QA checks yet" until someone hand-creates a check. This is the one real gap in the lifecycle.
- **Trading** (`flow-pages.tsx`) is functional (RFQ/bids/negotiation/settlements forms via cmsStore), not a placeholder.
- **Storage settings** (`/admin/storage`) only persists provider *selection* in cmsStore; secrets stay in env; "Run test upload" round-trips via `/api/v2/admin/storage/test`.

**Why it matters:** the figma flow (Sourcing→Trading→QA→Logistics) implies QA gates dispatch, but in code QA is an island. Any "make QA part of the pipeline" work must add a seam that materializes a `DispatchCheck` from each `confirmed` order (mirror the logistics `useAdminOrders` pattern).

## api-server (legacy /api, port 8080) restart downtime
The `api-server` workflow runs `build && start` (esbuild ~2.3mb, NO watch). Every restart drops the backend for a few seconds, during which the Vite proxy returns **502** for `/api/*` (e.g. `/shop` → `/api/products`). This looks like a "shop won't load" bug but is transient restart downtime. api-nest uses `tsx watch` (fast reload) and is not affected. Confirm a shop failure isn't just a mid-restart 502 before treating it as a code bug.
