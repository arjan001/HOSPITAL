# Deprecated API routes (`api-server` → `api-nest` v2)

Legacy Express handlers under `artifacts/api-server` are being retired as `artifacts/api-nest` (`/api/v2/*`) reaches parity.

## Use v2 instead

| Legacy (`api-server`) | Replacement (`api-nest` / v2) | Status |
|----------------------|-------------------------------|--------|
| `/api/admin/*` CMS proxy | `/api/v2/admin/cms/*` | Prefer v2 |
| `/api/track-view` | `/api/v2/track-view` | v2 only |
| `/api/track-event` | `/api/v2/track-event` | v2 only |
| Storefront catalog reads | `/api/v2/catalog/*` | v2 only |
| Admin orders | `/api/v2/admin/orders/*` | v2 only |
| Sourcing inventory | `/api/v2/admin/sourcing/inventory` | v2 only (Postgres) |
| Sourcing pricing | `/api/v2/admin/sourcing/price-history`, `competitor-prices` | v2 only (Stage 4) |
| Supplier POs | `/api/v2/admin/supplier-purchase-orders` | v2 only |
| Trading | `/api/v2/admin/trading/*` | v2 only |

## Still on legacy (migrate later)

| Area | Notes |
|------|--------|
| `sourcing-suppliers`, `sourcing-quotes` CMS keys | Partner directory migration in progress |
| Some webhook stubs | Check `app.module.ts` registrations |

## Policy

- New features **must** land in `api-nest` with Drizzle schema in `lib/db/src/schema/`.
- Do not add new `cms_docs` keys for operational data (inventory, pricing, trading, automation).
- Apply schema with `pnpm db:push` before deploying API changes.
