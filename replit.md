# Shaniid RX

The trusted pharmaceutical infrastructure for Africa — a digital storefront and pharmacy back-office that connects verified suppliers, community pharmacies, and patients with genuine, fairly-priced medicine delivered to the door.

## Run & Operate

- `pnpm --filter @workspace/api-nest run dev` — **primary backend** (port 8090, `/api/v2`)
- `pnpm --filter @workspace/shaniid run dev` — storefront + admin (Vite proxies legacy `/api/*` → Nest)
- `pnpm run typecheck` / `pnpm run build` — typecheck / build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks + Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Apply manual SQL migrations in `lib/db/migrations/manual/` for production (e.g. `20250611_partner_directory.sql`, `20250610_purchase_orders.sql`)
- Required env: `DATABASE_URL` (Postgres), `SESSION_SECRET` (api-nest fails to boot without it), `CLERK_SECRET_KEY` (partner Clerk JWT bridge)
- **Replit publish:** set `DATABASE_URL` + `SESSION_SECRET` in **Deployment Secrets** (`.env.local` is not deployed). See `docs/PROGRESSIVE_REVIEW_REPORT.md` §7.
- Post-build runs `scripts/deploy-post-build.sh` (`pnpm store prune` + `drizzle push` when `DATABASE_URL` is set).

**Legacy Express (`api-server`, port 8080)** is deprecated — not required for local dev. Vite rewrites storefront `/api/products`, `/api/categories`, `/api/site-data`, analytics, video, uploads, etc. to Nest `:8090`. The `artifacts/api-server` package remains in the repo for reference only.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: **NestJS 11** (`tsx watch`, CommonJS output) — sole production backend
- DB: PostgreSQL + Drizzle ORM (`@workspace/db` at `lib/db`); validation via Zod (`zod/v4`) + `drizzle-zod`
- API codegen: Orval; Build: esbuild (CJS bundle)
- Storefront/admin: Vite + React + wouter, SWR, shadcn/ui

## Where things live

- Storefront + admin app: `artifacts/her-kingdom/` (NestJS client: `src/lib/api-nest.ts`; shared types: `src/lib/types.ts`)
- NestJS backend: `artifacts/api-nest/` (`/api/v2`)
- Customer account dashboard: `src/pages/account/dashboard.tsx` (`/account/dashboard`; legacy `/user` redirects here)
- **CMS content** (banners, categories, products, settings, footer, templates, sourcing state): `src/lib/cms-store.ts` dual-writes to Postgres `cms_docs` via `/api/v2/admin/cms/:key`. This is intentional for JSON document content — not a gap.
- **Partner profiles** (suppliers, clinics, logistics): Postgres `partner_directory` via `/api/v2/admin/partner-directory/:key` — `src/lib/partners-directory-client.ts`
- Admin nav + routes: `src/components/admin/admin-shell.tsx` + `src/App.tsx`. Sidebar is a tree; expand state persists in `localStorage["shaniidrx.admin.sidebarExpanded"]`.
- Sourcing sub-routes: `/admin/sourcing/{inventory,forecast,pricing,automation,performance}` (`components/admin/sourcing-pages.tsx`).
- Message templates (SMS/WhatsApp/Email): `components/admin/message-templates.tsx` (`/admin/integrations/templates`), persists via `cmsStore("message-templates")`, `{{token}}` interpolation.

## Architecture decisions

- **Customer auth = Clerk (May 2026).** ClerkProvider wraps the storefront. Sign-in/up at `/sign-in`, `/sign-up` (legacy `/account/login` etc. redirect in). **Guest checkout preserved** — only `/account*` requires sign-in. Server-side `clerkMiddleware()` is mounted in legacy api-server stub only; Nest uses session cookie + Clerk JWT bridge for partners.
- **Admin auth.** `AdminAuthModule` (`/api/v2/admin/auth/*`) checks `ADMIN_EMAIL`/`ADMIN_PASSWORD`, issues a token signed with `SESSION_SECRET`. `AdminGuard` fails **open in dev, closed in prod**. Admin fetchers attach `adminAuthHeaders()`; login also sets HttpOnly `shaniidrx_admin_token` for SSE and file routes.
- **NestJS is the production API.** All durable modules use Drizzle Postgres. Server modules **must not HTTP-loopback** to `/admin/cms` — inject `AdminCmsService` directly (`catalog-import`, `pipeline`, `partners`, `newsletter`).
- **Prescriptions** are Postgres-only (`/api/v2/me/prescriptions`, `/api/v2/admin/prescriptions`). Upload flow writes only to api-nest — no cmsStore mirror.
- **Payments (Paystack only).** Storefront uses `PaystackPaymentModal` (`/api/v2/payments/paystack/*`). KES `mobile_money.phone` MUST be E.164 with leading `+`. Never grant value on a client-supplied reference — verify server-side and bind to the order.
- **Supabase fully removed.** Legacy `/api/admin/*` + public `/api/*` back a no-op stub in api-server if ever run. Don't import from it.

### api-nest subsystems (detail in code + `.agents/memory/`)

- **Live chat** (`/api/v2/chat`, SSE). Postgres-durable threads/messages.
- **Partner portals** (`/api/v2/partners/*`) — password or Clerk JWT (`POST :type/clerk-session`). Profiles from `partner_directory` table.
- **Supplier POs** (`/api/v2/admin/supplier-purchase-orders`) — Postgres `purchase_orders` + lines.
- **WhatsApp** (`/api/v2/notifications/whatsapp`): Meta Cloud API primary; auto-send-on-trigger not yet wired.
- **Error reporting**, **Storage**, **Resilience layer** — unchanged; see prior docs in `.agents/memory/`.

### DB-schema discipline (REQUIRED)

Any change that adds/alters persisted data MUST land the matching Drizzle table + migration SQL in `lib/db/migrations/manual/`. `packages/db` is the single source of truth for production Postgres.

## Product

Storefront: catalogue, prescription upload, consultations, contact inquiries, popup offers, custom CMS pages, configurable footer.
Admin: dashboard, products (CSV import/export via Nest catalog), categories, banners, prescriptions (Postgres), consultations (chat API), suppliers/clinics/logistics (partner_directory), purchase orders, partner portals.

## Brand (source of truth: SHANIID RX – BRAND BRIEF, 09.04.2026)

**Positioning.** Not "another pharmacy app." Shaniid RX is the **trust layer for medicine distribution** — community-driven and globally credible, affordable but dignified, accessible but world-class. Attribution: "Shaniid RX — A Shaniid Group Company."

**Brand promise (non-negotiable).** "If it comes through Shaniid RX, it is genuine, fairly priced, and delivered with integrity." Emotional territory = **Trust + Relief**.

See brand brief PDF for voice, visual language, and Trust Seal motif.

## User preferences

- **Customer auth = Clerk.** Guest checkout preserved.
- **Visual style:** Wine `#3D0814` / `#6B0F1A` for brand chrome; orange/red `#F97316` / `#B91C1C` for CTAs.
- **Brand brief is the source of truth** for positioning, voice, and visual metaphors.

## Gotchas

- `cmsStore` is the correct path for **CMS JSON documents** (banners, products array in cms_docs, etc.) — it persists to Postgres server-side.
- **Partner profiles** use `partners-directory-client.ts`, not cmsStore keys `suppliers`/`clinics`/`logistics-partners`.
- Vite dev proxies `/api/*` → Nest — do not start api-server unless debugging the legacy stub.
- Pre-existing repo-wide `tsc` errors in some analytics/security files — out of scope for focused changes.

## Pointers

- `pnpm-workspace` skill — workspace structure
- `.agents/memory/` — durable lessons (payment trust gate, admin auth, cms concurrency, partner portals, etc.)
- Brand brief PDF: `attached_assets/SHANIID_RX_-_BRAND_BRIEF__1778680863193.pdf`
