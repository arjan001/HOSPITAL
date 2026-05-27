# Shaniid RX — Comprehensive Technical Reference

> **"If it comes through Shaniid RX, it is genuine, fairly priced, and delivered with integrity."**
>
> Trusted pharmaceutical infrastructure for Africa — a digital storefront, pharmacy back-office,
> and supply-chain layer connecting verified suppliers, community pharmacies, and patients with
> genuine, fairly-priced medicine delivered to the door.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Monorepo Structure](#2-monorepo-structure)
3. [Tech Stack](#3-tech-stack)
4. [Environment Variables & Secrets](#4-environment-variables--secrets)
5. [Development Commands](#5-development-commands)
6. [Routing & URL Architecture](#6-routing--url-architecture)
7. [Storefront — `artifacts/her-kingdom`](#7-storefront--artifactsher-kingdom)
8. [NestJS API — `artifacts/api-nest`](#8-nestjs-api--artifactsapi-nest)
9. [Legacy Express API — `artifacts/api-server`](#9-legacy-express-api--artifactsapi-server)
10. [Shared Libraries — `lib/`](#10-shared-libraries--lib)
11. [Database Schema](#11-database-schema)
12. [Authentication Architecture](#12-authentication-architecture)
13. [Payments Architecture](#13-payments-architecture)
14. [CMS Architecture](#14-cms-architecture)
15. [Admin Panel — All Modules](#15-admin-panel--all-modules)
16. [Customer-Facing Pages & Routes](#16-customer-facing-pages--routes)
17. [Partner Portals](#17-partner-portals)
18. [Architecture Decisions & Patterns](#18-architecture-decisions--patterns)
19. [Strangler-Fig Migration Plan](#19-strangler-fig-migration-plan)
20. [Known Gotchas](#20-known-gotchas)
21. [Brand Reference](#21-brand-reference)
22. [Phase 2 Roadmap](#22-phase-2-roadmap)

---

## 1. Project Overview

Shaniid RX is a pnpm monorepo running three independent services behind a single reverse-proxy
path-based router on Replit:

| Service | Mount Path | Package |
|---|---|---|
| Storefront + Admin SPA | `/` | `@workspace/shaniid` |
| NestJS user/payments API (new) | `/api/v2` | `@workspace/api-nest` |
| Legacy Express catalog/admin API | `/api` | `@workspace/api-server` |

The storefront is the customer-facing pharmacy shop and the admin back-office for the Shaniid RX
team. The two API servers implement a **strangler-fig migration** — new customer modules land in
`api-nest` while the legacy `api-server` continues to serve the catalog until those modules port
over.

---

## 2. Monorepo Structure

```
/
├── artifacts/
│   ├── her-kingdom/          # @workspace/shaniid  — React + Vite storefront & admin SPA
│   ├── api-nest/             # @workspace/api-nest — NestJS API (port $PORT, mounted at /api/v2)
│   ├── api-server/           # @workspace/api-server — Express legacy API (port $PORT, mounted at /api)
│   └── mockup-sandbox/       # @workspace/mockup-sandbox — Dev-only Vite component canvas
├── lib/
│   ├── api-spec/             # @workspace/api-spec — openapi.yaml + Orval codegen config
│   ├── api-client-react/     # @workspace/api-client-react — Generated React Query hooks
│   ├── api-zod/              # @workspace/api-zod — Generated Zod schemas from OpenAPI spec
│   └── db/                   # @workspace/db — Drizzle ORM schema + database client
├── scripts/                  # Workspace utility scripts, DB init helpers
├── docs/
│   ├── TRAINING_MANUAL.md    # Full end-to-end staff walkthrough
│   └── API_DOCUMENTATION.md  # All endpoint reference docs
├── pnpm-workspace.yaml
├── package.json              # Root scripts (typecheck, build, etc.)
└── README.md                 # This file
```

---

## 3. Tech Stack

### Global
| Concern | Choice |
|---|---|
| Runtime | Node.js 24 |
| Language | TypeScript 5.9 (strict) |
| Package manager | pnpm workspaces |
| Database | PostgreSQL + Drizzle ORM |
| Validation | Zod (v4), drizzle-zod |
| API contract | OpenAPI 3 spec + Orval codegen |
| Secrets | Replit environment variables |

### Storefront (`her-kingdom`)
| Concern | Choice |
|---|---|
| Build | Vite 6 |
| UI framework | React 19 |
| Router | wouter |
| Data fetching | TanStack React Query v5 + SWR |
| Component library | shadcn/ui (Radix primitives) |
| Styling | Tailwind CSS v4 |
| Auth client | `@clerk/react` |
| State (cart/wishlist) | React Context |
| Notifications/toasts | Sonner |

### NestJS API (`api-nest`)
| Concern | Choice |
|---|---|
| Framework | NestJS 11 on Express adapter |
| Runtime transpiler | `tsx watch` (CommonJS output) |
| Auth | Cookie-based guest session today; Clerk JWT drop-in ready |
| Repository pattern | `InMemoryRepository<T>` (Postgres/Drizzle swap = one file) |
| Webhook security | HMAC-SHA512 (Paystack) |
| Module system | Explicit `@Inject(ServiceClass)` on every controller (tsx does not emit decorator metadata) |

### Legacy Express API (`api-server`)
| Concern | Choice |
|---|---|
| Framework | Express 5 |
| Build | esbuild (CJS bundle) |
| Auth middleware | Clerk `clerkMiddleware()` |
| Storage | `lib/legacy-store.ts` no-op stub (Supabase fully removed) |

---

## 4. Environment Variables & Secrets

### Required
| Variable | Used by | Purpose |
|---|---|---|
| `DATABASE_URL` | `api-server`, `api-nest`, `lib/db` | Postgres connection string |
| `VITE_CLERK_PUBLISHABLE_KEY` | `her-kingdom` | Clerk frontend key |

### Payments — Paystack (NestJS, **active**)
| Variable | Required | Purpose |
|---|---|---|
| `PAYSTACK_SECRET_KEY` | Yes | All Paystack API calls + webhook HMAC verification |
| `PAYSTACK_PUBLIC_KEY` | No | Surfaced on `/charge` response for Paystack-branded UI |
| `PAYSTACK_CALLBACK_URL` | No | Webhook URL sent on each charge; falls back to `{host}/api/v2/payments/paystack/callback` |

### Payments — PayHero (Legacy Express, **deprecated**)
| Variable | Purpose |
|---|---|
| `PAYHERO_BASIC_AUTH_TOKEN` | Preferred auth (replaces username+password) |
| `PAYHERO_API_USERNAME` | Fallback auth |
| `PAYHERO_API_PASSWORD` | Fallback auth |
| `PAYHERO_CHANNEL_ID` | Channel to push STK |
| `PAYHERO_CALLBACK_URL` | Webhook URL |

### Video / Telemedicine
| Variable | Purpose |
|---|---|
| `DAILY_API_KEY` | Daily.co room management for doctor consultations |

### Feature Flags
| Variable | Default | Purpose |
|---|---|---|
| `VITE_ENABLE_CARD_PAYMENTS` | `false` | Show/hide card payment UI (logic preserved, UI hidden) |
| `VITE_CLERK_PROXY_URL` | — | Override Clerk proxy (Replit-managed Clerk auto-sets this) |

---

## 5. Development Commands

```bash
# Start all three services (each in its own terminal / Replit workflow)
pnpm --filter @workspace/shaniid      run dev   # Storefront — port $PORT, path /
pnpm --filter @workspace/api-nest     run dev   # NestJS API — port $PORT, path /api/v2
pnpm --filter @workspace/api-server   run dev   # Express API — port $PORT, path /api

# Typecheck the entire monorepo
pnpm run typecheck

# Build all packages
pnpm run build

# Regenerate API client hooks and Zod schemas from openapi.yaml
pnpm --filter @workspace/api-spec run codegen

# Push Drizzle schema changes to the database (dev only)
pnpm --filter @workspace/db run push

# Introspect the database and update schema files
pnpm --filter @workspace/db run pull
```

---

## 6. Routing & URL Architecture

The Replit proxy uses **path-based routing**. Every service reads its mount path from
`import.meta.env.BASE_URL` (Vite) or from the `PORT` env variable (Node servers).

| Prefix | Service |
|---|---|
| `/api/v2/*` | `api-nest` (NestJS) |
| `/api/*` | `api-server` (Express) |
| everything else | `her-kingdom` (React SPA) |

Internal API calls from the SPA must always use the base-prefixed helpers — never root-relative
`/api/...` paths — because the proxy may strip or rewrite paths.

- SPA → NestJS: `artifacts/her-kingdom/src/lib/api-nest.ts`
- SPA → Express: `artifacts/her-kingdom/src/lib/api.ts`

---

## 7. Storefront — `artifacts/her-kingdom`

### Entry Points
| File | Purpose |
|---|---|
| `src/main.tsx` | Vite entry — mounts `<App />` |
| `src/App.tsx` | Root: ClerkProvider, QueryClientProvider, wouter Router, all route definitions |
| `src/index.css` | CSS layer order: `theme, base, clerk, components, utilities` |
| `public/logo.svg` | Brand shield logo (used in admin sidebar, Clerk UI, favicons) |

### Key Library Files (`src/lib/`)
| File | Purpose |
|---|---|
| `cms-store.ts` | **Single CMS seam.** All admin-managed content (banners, categories, settings, pages, footer, popup, audit log, templates) goes through `cmsStore.get/set` / `useCmsDoc("key")`. Hybrid: localStorage cache + background sync to `/api/v2/admin/cms/:key` for non-local keys. Audit log + `user-*` / `customer-*` keys stay local-only. |
| `api.ts` | Typed fetch client for the legacy Express API (`/api/*`). Sends `credentials: "include"` and forwards `x-admin-token` when present. |
| `api-nest.ts` | Typed fetch client for `/api/v2` (NestJS). |
| `types.ts` | Shared TypeScript types across the storefront. |
| `cart-context.tsx` | React Context for cart state (items, quantity, subtotal). |
| `wishlist-context.tsx` | React Context for wishlist (mirrors to NestJS wishlist API). |
| `use-customer-mirror.ts` | On sign-in, upserts Clerk user into the NestJS customer profile. |
| `analytics-store.ts` | Client-side analytics event tracking. |
| `legacy-store.ts` | Lives in `artifacts/api-server/src/lib/`, not the storefront. No-op stub for the removed Supabase admin store (returns empty reads, soft-error writes). |

### Clerk Integration (Storefront)
- `ClerkProvider` wraps the entire SPA in `App.tsx`
- Publishable key: `VITE_CLERK_PUBLISHABLE_KEY`
- Proxy URL: `VITE_CLERK_PROXY_URL` (set automatically by Replit-managed Clerk)
- Sign-in: `/account/login` → custom branded page using `useSignIn()`
- Sign-up: `/account/register` → custom branded page using `useSignUp()`
- SSO callback: `/account/sso-callback` → `<AuthenticateWithRedirectCallback />`
- Clerk appearance theme: `shadcn` from `@clerk/themes`, overridden with wine `#3D0814` / orange `#F97316` palette
- `ClerkQueryClientCacheInvalidator` — clears React Query cache on user change

---

## 8. NestJS API — `artifacts/api-nest`

**Mount path:** `/api/v2`
**Entry:** `src/main.ts`
**Config:** `src/app.module.ts`

### Session Model
`SessionMiddleware` issues a `shaniidrx_sid` cookie on the first request and attaches
`req.sessionId` to every subsequent request. All services key their data to `req.sessionId`.

**Clerk migration path:** Replace the middleware body with a Clerk JWT verifier that sets
`req.sessionId = clerkUserId`. No controller or service changes needed.

### Repository Pattern
Each service uses either a `Map<sessionId, T>` directly (profile) or the generic
`InMemoryRepository<T>` from `src/common/repository.ts`.

**Postgres migration path:** Implement the same `listFor / add / update / remove / findById`
surface against Drizzle ORM and swap the import in each module's service. No other code changes.

```typescript
// src/common/repository.ts — surface to implement against Drizzle
class InMemoryRepository<T extends { id: string }> {
  listFor(sessionId: string): T[]
  add(sessionId: string, item: T): T
  update(sessionId: string, id: string, patch: Partial<T>): T | null
  remove(sessionId: string, id: string): boolean
  findById(sessionId: string, id: string): T | null
}
```

### Important Pattern — Explicit `@Inject()`
`tsx`/esbuild does NOT emit `emitDecoratorMetadata`, so NestJS cannot infer constructor parameter
types. Every controller constructor must use `@Inject(ServiceClass)` explicitly:

```typescript
constructor(@Inject(PaystackService) private readonly svc: PaystackService) {}
```

### All Modules

#### Customer-Facing Modules

| Module | Route prefix | Description |
|---|---|---|
| `ProfileModule` | `GET/PUT /api/v2/me` | Customer profile — display name, email, phone, gender, date of birth |
| `AddressesModule` | `/api/v2/me/addresses` | CRUD delivery addresses per session |
| `WishlistModule` | `/api/v2/me/wishlist` | Add / list wishlist items; `DELETE /me/wishlist/:productSlug` removes by **product slug** (not product id) |
| `OrdersModule` | `/api/v2/me/orders` | Customer order history per session |
| `PaystackModule` | `/api/v2/payments/paystack` | M-Pesa STK push, status polling, HMAC webhook |

#### Paystack Endpoint Details

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/v2/payments/paystack/config` | Returns `{ configured, publicKey }` |
| `POST` | `/api/v2/payments/paystack/charge` | Initiate M-Pesa STK push |
| `GET` | `/api/v2/payments/paystack/status` | Poll status by `?reference=` or `?orderNumber=` |
| `POST` | `/api/v2/payments/paystack/callback` | Paystack webhook (HMAC-SHA512 verified) |

**Charge request body:**
```json
{
  "phone": "0712345678",
  "amount": 1500,
  "orderNumber": "SHX-001",
  "email": "customer@example.com",
  "customerName": "Amina Hassan"
}
```
Amount is in **KES whole units** (the service multiplies by 100 for Paystack's smallest-unit API).
Phone must be a valid Safaricom number; normalised to E.164 `254XXXXXXXXX` internally.

#### Admin Modules

| Module | Route prefix | Description |
|---|---|---|
| `AdminOrdersModule` | `/api/v2/admin/orders` | Admin order management |
| `AdminPaymentsModule` | `/api/v2/admin/payments` | Admin payment records view |
| `AdminCmsModule` | `/api/v2/admin/cms` | NestJS-backed CMS (future swap from localStorage) |
| `CatalogImportModule` | `/api/v2/admin/catalog/{categories,products}/import`, `/api/v2/admin/catalog/google-sheet` | Bulk CSV / Google-Sheets import. Both categories AND products persist into cmsStore (`categories` / `products` keys). Token-gated by `AdminGuard`. |
| `WebScraperModule` | `POST /api/v2/admin/catalog/scrape-url` | Server-side scrape of product listing pages (avoids browser CORS). Token-gated. |
| `PartnersModule` | `/api/v2/partners/:type/{auth,signout,orders}` | Server-side login + submission endpoints for the supplier / clinic / logistics portals. |

#### Infrastructure Modules

| Module | Route prefix | Description |
|---|---|---|
| `HealthModule` | `GET /api/v2/healthz` | Uptime check — returns `{ ok: true, service: "api-nest", ts }` |
| `PrescriptionsModule` | `/api/v2/prescriptions` | Prescription upload + status tracking |
| `UploadsModule` | `/api/v2/uploads` | File upload handling |
| `ChatModule` | `/api/v2/chat` | Patient ↔ pharmacist / doctor messaging |
| `MonitoringModule` | `/api/v2/monitoring` | Internal telemetry + error tracking |
| `EmailModule` | `/api/v2/notifications/email/{status,send}` | Resend-backed transactional email dispatch; returns 503 when `RESEND_API_KEY` is unset |
| `NotificationsModule` | `/api/v2/notifications` | Push / in-app notifications |
| `PipelineModule` | `/api/v2/admin/pipeline/{sourcing,trading,qa,logistics,communications,status}` | Server-side automation (sourcing scan, margin recompute, expiry scan, rider auto-assign, template-driven send). Token-gated by `AdminGuard`. |

---

## 9. Legacy Express API — `artifacts/api-server`

**Mount path:** `/api`
**Entry:** `src/index.ts` → `src/app.ts`

Clerk middleware (`clerkMiddleware()`) is applied between the Clerk proxy mount and the route
handlers so every request carries the Clerk auth context.

### Public Routes (`/api/*`)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/products` | List / search products |
| `GET` | `/api/products/:slug` | Product detail by slug |
| `GET` | `/api/categories` | Category tree |
| `GET` | `/api/hero-banners` | Hero banner list |
| `GET` | `/api/site-data` | Website settings (name, logo, contact, social, SEO) |
| `GET` | `/api/delivery-locations` | Supported delivery areas |
| `POST` | `/api/orders` | Place a new order |
| `GET` | `/api/track-order` | Track order by number or phone |
| `POST` | `/api/newsletter` | Newsletter subscription |
| `GET` | `/api/gift-items` | Gift / care-pack items |
| `GET` | `/api/blogs` | Blog post list |
| `GET` | `/api/blogs/:slug` | Blog post detail |
| `GET` | `/api/policies` | Policy page content |
| `POST` | `/api/upload` | File upload |
| `POST` | `/api/track-event` | Analytics event ingestion |
| `POST` | `/api/track-view` | Page view tracking |
| `POST` | `/api/track-abandoned` | Abandoned cart tracking |

### Admin Routes (`/api/admin/*`)

| Method | Path | Description |
|---|---|---|
| `GET/PUT` | `/api/admin/products` | Product CRUD (**PUT is full-replace — see gotchas**) |
| `GET/POST/PUT/DELETE` | `/api/admin/categories` | Category management |
| `GET/POST/PUT/DELETE` | `/api/admin/banners` | Promo banner management |
| `GET/POST/PUT/DELETE` | `/api/admin/hero-banners` | Hero banner management |
| `GET/POST/PUT/DELETE` | `/api/admin/gift-items` | Gift / care-pack management |
| `GET/PUT` | `/api/admin/settings` | Website settings |
| `GET` | `/api/admin/orders` | Order list |
| `GET` | `/api/admin/analytics` | Analytics data |

> All admin routes backed by `lib/legacy-store.ts` no-op stub. Reads return `[]`,
> writes return `{ error: "Backend disabled..." }`. Do not add new code that depends
> on these routes — use `cmsStore` instead.

### Integration Routes

| Path | Description |
|---|---|
| `/api/auth/*` | Legacy stub auth endpoints (not the Clerk proxy — the real Clerk Frontend API proxy is mounted at `/api/__clerk`). |
| `/api/payments/payhero/stk` | PayHero M-Pesa STK push (**deprecated, use Paystack**) |
| `/api/payments/payhero/status` | PayHero payment status poll |
| `/api/payments/payhero/callback` | PayHero webhook |
| `/api/video/{room,token,heartbeat,end,active,status}` | Daily.co integration — create rooms, mint meeting tokens, heartbeat, end call, live status. Powered by `DAILY_API_KEY`. |
| `GET /api/healthz` | Express health check |

---

## 10. Shared Libraries — `lib/`

### `lib/db` — `@workspace/db`
Drizzle ORM schema and database client. Exports all table definitions and a configured `db`
instance pointing at `DATABASE_URL`.

**Push schema to database:**
```bash
pnpm --filter @workspace/db run push
```

Schema files: `src/schema/{users, catalog, orders, prescriptions, consultations, uploads, payments, chat, notifications, cms}.ts`

### `lib/api-spec` — `@workspace/api-spec`
OpenAPI 3 specification (`openapi.yaml`) and Orval code generation config (`orval.config.ts`).
Orval reads the spec and outputs:
- React Query hooks → `lib/api-client-react/`
- Zod schemas → `lib/api-zod/`

**Regenerate after spec changes:**
```bash
pnpm --filter @workspace/api-spec run codegen
```

### `lib/api-client-react` — `@workspace/api-client-react`
Auto-generated React Query hooks. Import from `@workspace/api-client-react`. Never edit these
files manually — re-run codegen instead.

### `lib/api-zod` — `@workspace/api-zod`
Auto-generated Zod schemas mirroring the OpenAPI spec. Use for server-side request validation
and client-side form schema generation.

---

## 11. Database Schema

All tables are defined in `lib/db/src/schema/` and managed via Drizzle ORM.

| Schema file | Tables / domain |
|---|---|
| `users.ts` | `users` — Clerk user mirror (id, email, name, phone, role) |
| `catalog.ts` | `products`, `product_images`, `product_variations`, `categories` |
| `orders.ts` | `orders`, `order_items` |
| `prescriptions.ts` | `prescriptions` — upload records + status |
| `consultations.ts` | `consultations` — doctor booking records |
| `uploads.ts` | `uploads` — file upload metadata |
| `payments.ts` | `payments` — payment records (pending Drizzle port; in-memory today) |
| `chat.ts` | `chat_threads`, `chat_messages` |
| `notifications.ts` | `notifications` — per-user notification records |
| `cms.ts` | `cms_docs`, `audit_log` — backs the cmsStore single-seam |
| `notifications.ts` | `notifications`, `support_tickets`, `support_messages` |
| `relations.ts` | Drizzle `relations()` declarations wiring every FK above (centralised so the relational query API works). |

---

## 12. Authentication Architecture

### Customer Auth — Clerk (production, May 2026)

```
Browser → Clerk JS SDK → Replit-managed Clerk tenant
                      ↓
               clerkMiddleware() on api-server
                      ↓
               req.auth.userId available to all Express routes
```

**Sign-in flow:**
1. User visits `/account/login` → custom branded `AccountLoginPage` using `useSignIn()`
2. On success → redirected to `/user` (customer dashboard)
3. Google OAuth: redirect to `/account/sso-callback` → `AuthenticateWithRedirectCallback`

**Sign-up flow:**
1. User visits `/account/register` → `AccountRegisterPage` using `useSignUp()`
2. Collects: First Name, Last Name, Email, Phone (+254), Gender, Date of Birth, Password
3. Sends email verification code → user enters code → `attemptEmailAddressVerification`
4. On completion → `upsertCustomer()` mirrors user to NestJS profile store → redirect `/user`

**Protected routes** (redirect to `/account/login` if signed out):
- `/account`, `/account/dashboard`, `/account/settings`, `/account/prescriptions`
- `/user`, `/dashboard`, `/account/chat`

**Unprotected** (guest checkout preserved):
- `/checkout` — no auth required
- All storefront browsing routes

### Admin Auth — Shared token (interim)

Every NestJS admin controller is wrapped in the shared `AdminGuard`
(`artifacts/api-nest/src/common/admin-guard.ts`):

- If `ADMIN_API_TOKEN` is set, every request must present that token in
  the `x-admin-token` header (or `Authorization: Bearer …`). Anything else
  is rejected with 401.
- If `ADMIN_API_TOKEN` is unset, the guard **fails closed in production**
  (or when `ADMIN_REQUIRE_TOKEN=1`) and otherwise allows the call so local
  devs can hit `/api/v2/admin/*` without configuring a token.

The Express `requireAdmin` middleware follows the same model — the
previous behaviour of auto-passing any non-production request even when
a token was configured has been closed off.

Admin identity in the SPA is still hardcoded in `admin-shell.tsx` (the
local super-admin chip). Full RBAC and Clerk-admin SSO are in Phase 2.

### NestJS Session
Cookie name: `shaniidrx_sid`
Lifetime: in-memory Map (process restart clears all sessions)
Migration: swap `SessionMiddleware` body with Clerk JWT verifier → `req.sessionId = clerkUserId`

---

## 13. Payments Architecture

### Active — Paystack M-Pesa (NestJS `/api/v2`)

**Flow:**
```
Storefront CheckoutPage
  → POST /api/v2/payments/paystack/charge  { phone, amount, orderNumber }
  ← { success, reference, status, message }

  → poll GET /api/v2/payments/paystack/status?reference=xxx  (every 3 s)
  ← { status: "pending" | "success" | "failed" }

  Paystack → POST /api/v2/payments/paystack/callback  (webhook, HMAC verified)
```

**Webhook security:** HMAC-SHA512 of raw request body using `PAYSTACK_SECRET_KEY`, compared
constant-time to `x-paystack-signature` header. Forged requests return 401 and change no state.

**Storage:** In-memory `Map<reference, PaymentRecord>` + `Map<orderNumber, reference>` index.
Drizzle swap = replace the Map with a `paystack_payments` table insert/select.

**Phone normalisation:** `07XXXXXXXX` → `2547XXXXXXXX` (Safaricom E.164). Only Safaricom numbers
accepted (regex: `^254[17]\d{8}$`).

### Legacy — PayHero M-Pesa (Express `/api`)
Routes still exist at `/api/payments/payhero/{stk,status,callback}` but the storefront no longer
calls them. Kept for reference until the module is formally deleted in Phase 2.

### Card Payments
Logic exists but UI is hidden behind `VITE_ENABLE_CARD_PAYMENTS=false`. Set to `true` to surface
the card payment option in checkout.

---

## 14. CMS Architecture

All admin-managed content uses a **single seam**: `cmsStore`.

```typescript
// Read
const [doc, setDoc] = useCmsDoc<BannersSchema>("banners")

// Write (auto-audited)
cmsStore("banners").set(newBannersData)
```

**Backed by:** `localStorage` today (key prefix `shaniidrx.cms.*`)
**Audit log:** Every `cmsStore` write automatically appends an entry to the audit log — no extra
code needed in consumers.
**Migration path:** When the NestJS `AdminCmsModule` is ready, replace the localStorage adapter
in `cms-store.ts` with an API call. All admin modules continue to work unchanged.

### CMS Keys in Use

| Key | Content |
|---|---|
| `banners` | Hero, promo, and navbar banner images + links |
| `categories` | Product category tree |
| `popup-offer` | Home-page popup offer (image, discount, expiry) |
| `website-settings` | Brand name, contact info, social links, SEO defaults, commerce config, business hours, feature flags |
| `custom-pages` | CMS-managed static pages (slug, title, body) |
| `footer` | Footer columns, links, social icons |
| `blogs` | Blog post list |
| `policies` | Policy page content by slug |
| `delivery-locations` | Supported delivery areas |
| `announcement-bar` | Top-of-site announcement banner |
| `gift-items` | Care pack / gift product items |
| `message-templates` | SMS / WhatsApp / Email message templates with `{{token}}` interpolation |
| `audit-log` | Append-only audit trail (written automatically) |

---

## 15. Admin Panel — All Modules

The admin panel lives at `/admin` inside the storefront SPA, wrapped in `AdminShell` (wine
`#3D0814` sidebar, top bar with wine accent strip and logged-in user chip).

**Sidebar nav groups:** Overview · Sales · Pharmacy · Catalog · Sourcing (children) ·
Marketing (children) · Integrations (children)

### Overview
| Route | Component | Description |
|---|---|---|
| `/admin` or `/admin/dashboard` | `AdminDashboard` | KPI tiles, sparklines, low-stock alerts, order status mix, quick links |
| `/admin/analytics` | `AdminAnalytics` | Traffic, revenue, conversion analytics |

### Sales
| Route | Component | Description |
|---|---|---|
| `/admin/orders` | `AdminOrders` | Order list, status filter, detail view |
| `/admin/payments` | `AdminPayments` | Payment records, Paystack status |
| `/admin/customers` | `AdminCustomers` | Customer list, profiles |
| `/admin/patients/:id` | `AdminPatientDetail` | Per-patient medical + order history |
| `/admin/support` | `AdminSupportTickets` | Customer support tickets |
| `/admin/support/:id` | `AdminSupportTickets` | Single ticket detail |

### Pharmacy
| Route | Component | Description |
|---|---|---|
| `/admin/prescriptions` | `AdminPrescriptions` | Prescription upload queue + review |
| `/admin/consultations` | `AdminConsultations` | Doctor consultation bookings |
| `/admin/consultation-settings` | `AdminConsultationSettings` | Telemedicine config |
| `/admin/chat` | `AdminChat` | Pharmacist chat interface |
| `/admin/doctors` | `AdminDoctors` | Doctor profiles + onboarding |

### Catalog
| Route | Component | Description |
|---|---|---|
| `/admin/products` | `AdminProducts` | Product CRUD, CSV import/export, bulk delete, stock management |
| `/admin/categories` | `AdminCategories` | Category tree CRUD |
| `/admin/banners` | `AdminBanners` | Hero, promo, navbar banner management |
| `/admin/bulk-import` | `AdminBulkImport` | Bulk product import via CSV or web scraping |
| `/admin/blogs` | `AdminBlogs` | Blog post management |
| `/admin/delivery-locations` | `AdminDelivery` | Delivery area management |
| `/admin/gift-items` (via AdminProducts) | | Care pack / gift item management |

### Sourcing (parent group)
| Route | Component | Description |
|---|---|---|
| `/admin/sourcing` | `AdminSourcing` | Sourcing overview |
| `/admin/sourcing/inventory` | `AdminSourcingInventory` | Inventory levels + reorder points |
| `/admin/sourcing/forecast` | `AdminSourcingForecast` | Demand forecasting |
| `/admin/sourcing/pricing` | `AdminSourcingPricing` | Supplier pricing management |
| `/admin/sourcing/automation` | `AdminSourcingAutomation` | Automated reorder rules |
| `/admin/sourcing/performance` | `AdminSourcingPerformance` | Supplier performance metrics |
| `/admin/trading` | `AdminTrading` | Trading desk overview |
| `/admin/trading/bids` | `AdminTradingBids` | Bid management |
| `/admin/trading/negotiation` | `AdminTradingNegotiation` | Negotiation tracking |
| `/admin/trading/settlements` | `AdminTradingSettlements` | Trade settlements |
| `/admin/qa` | `AdminQa` | Quality assurance overview |
| `/admin/qa/batches` | `AdminQaBatches` | Batch inspection records |
| `/admin/qa/trust-seal` | `AdminQaTrustSeal` | Trust seal assignment |
| `/admin/qa/recalls` | `AdminQaRecalls` | Product recall management |
| `/admin/logistics` | `AdminLogistics` | Logistics operations overview |
| `/admin/logistics/inventory` | `AdminLogisticsInventory` | Warehouse inventory |
| `/admin/logistics/lead-time` | `AdminLogisticsLeadTime` | Lead time tracking |
| `/admin/logistics/fallback` | `AdminLogisticsFallback` | Fallback supplier routing |

### Marketing (parent group)
| Route | Component | Description |
|---|---|---|
| `/admin/campaigns` | `AdminCampaignsOverview` | Marketing campaign overview |
| `/admin/campaigns/email` | `AdminCampaignsEmail` | Email campaign builder |
| `/admin/campaigns/sms` | `AdminCampaignsSms` | SMS campaign builder |
| `/admin/campaigns/audiences` | `AdminCampaignsAudiences` | Audience segment management |
| `/admin/campaigns/pipelines` | `AdminCampaignsPipelines` | Campaign automation pipelines |
| `/admin/campaigns/queue` | `AdminCampaignsQueue` | Message send queue |
| `/admin/campaigns/settings` | `AdminCampaignsSettings` | Campaign global settings |
| `/admin/popup-offer` | `AdminPopupOffer` | Home-page popup offer CMS |
| `/admin/announcement` | `AdminAnnouncementBar` | Announcement bar CMS |
| `/admin/newsletter` | `AdminNewsletter` | Newsletter subscriber list |

### Integrations (parent group)
| Route | Component | Description |
|---|---|---|
| `/admin/integrations` | `AdminIntegrations` | Third-party integration status |
| `/admin/integrations/templates` | `AdminMessageTemplates` | SMS / WhatsApp / Email templates with `{{token}}` interpolation + sample preview |

### Website & Content
| Route | Component | Description |
|---|---|---|
| `/admin/website-settings` | `AdminWebsiteSettings` | Brand, contact, social, SEO, commerce, hours, feature flags |
| `/admin/pages` | `AdminCustomPages` | CMS-managed static pages |
| `/admin/footer` | `AdminFooterCms` | Footer column + link management |
| `/admin/policies` | `AdminPolicies` | Policy page content editor |
| `/admin/card-details` | `AdminCardDetails` | Payment card display config |

### People & System
| Route | Component | Description |
|---|---|---|
| `/admin/users` | `UsersManagement` | Internal staff user management |
| `/admin/roles` | `AdminRolesPermissions` | Role definitions + permission assignments |
| `/admin/suppliers` | `AdminSuppliers` | Verified supplier profiles |
| `/admin/clinics` | `AdminClinics` | Partner clinic management |
| `/admin/logistics-partners` | `AdminLogisticsPartners` | Logistics partner management |
| `/admin/inquiries` | `AdminContactInquiries` | Contact form submissions |
| `/admin/audit-log` | `AdminAuditLog` | CMS write audit trail |
| `/admin/docs` | `AdminDocs` | In-app documentation viewer |
| `/admin/profile` | `AdminProfile` | Admin user profile settings |

---

## 16. Customer-Facing Pages & Routes

| Route | Component | Auth required |
|---|---|---|
| `/` | `LandingPage` | No |
| `/shop` | `ShopPage` | No |
| `/shop/:collection` | `CollectionPage` | No |
| `/product/:slug` | `ProductDetailPage` | No |
| `/checkout` | `CheckoutPage` | No (guest checkout) |
| `/wishlist` | `WishlistPage` | No |
| `/search` | `SearchPage` | No |
| `/care-packs` | `CarePacksPage` | No |
| `/blogs` | `BlogsPage` | No |
| `/blogs/:slug` | `BlogDetailPage` | No |
| `/track-order` | `TrackOrderPage` | No |
| `/track-order/:orderNumber` | `TrackOrderByCodePage` | No |
| `/delivery` | `DeliveryPage` | No |
| `/services` | `ServicesPage` | No |
| `/speak-to-a-doctor` | `SpeakToADoctorPage` | No |
| `/upload-prescription` | `UploadPrescriptionPage` | No |
| `/faq` | `FaqPage` | No |
| `/contact` | `ContactPage` | No |
| `/who-we-are` or `/about` | `AboutPage` | No |
| `/careers` or `/career` | `CareersPage` | No |
| `/privacy-policy` | `PolicyPage` | No |
| `/terms-of-service` | `PolicyPage` | No |
| `/payments-policy` | `PolicyPage` | No |
| `/refund-policy` | `PolicyPage` | No |
| `/policies/:slug` | `PolicyPage` | No |
| `/pages/:slug` | `CustomPageView` | No |
| `/account/login` | `AccountLoginPage` | No |
| `/account/register` | `AccountRegisterPage` | No |
| `/account/sso-callback` | `SsoCallbackPage` | No |
| `/account` or `/account/dashboard` | `AccountDashboard` | **Yes** |
| `/account/settings` | `AccountSettingsPage` | **Yes** |
| `/account/prescriptions` | `AccountPrescriptionsPage` | **Yes** |
| `/account/chat` | `AccountChatPage` | **Yes** |
| `/account/support` | `AccountSupportPage` | No |
| `/user` or `/dashboard` | `DashboardPage` | **Yes** |
| `/doctor` | `DoctorPanelPage` | No |

---

## 17. Partner Portals

Standalone pages, no Clerk authentication required. Each portal is a self-contained onboarding /
operations UI for a specific partner type.

| Route | Component | Audience |
|---|---|---|
| `/portal/supplier` | `SupplierPortal` | Verified medicine suppliers |
| `/portal/clinic` | `ClinicPortal` | Partner clinics |
| `/portal/logistics` | `LogisticsPortal` | Logistics / delivery partners |

---

## 18. Architecture Decisions & Patterns

### Strangler-Fig API Migration
New customer modules land in `api-nest` (`/api/v2`). The legacy Express server (`/api`) remains
operational for catalog/admin until those modules are ported. The storefront calls the appropriate
server per module.

### No ValidationPipe in NestJS
`class-validator` and `class-transformer` are not installed. Each controller validates inputs
manually. Future Zod DTOs will go through `nestjs-zod`. Do not add `ValidationPipe` without also
installing those packages.

### CMS Single Seam
Every admin-managed document flows through `cmsStore`. Never write CMS data to `localStorage`
directly, never call legacy admin API routes from new code, never bypass `cmsStore` — it is the
only auditable + migratable path.

### Inline Hover Styles on Admin Sidebar
The sidebar uses inline `style` props throughout (not Tailwind classes). Hover states are applied
via `onMouseEnter` / `onMouseLeave` rather than CSS classes because inline styles take precedence
over class-based styles. Keep this pattern when adding new sidebar nodes.

### Date Bucketing
All day-level analytics use UTC-day arithmetic (`utcDayNumber()` in `dashboard.tsx`) so day
boundaries do not shift for users in non-UTC timezones.

### Admin PUT `/api/admin/products` — Full Replace
This endpoint deletes all `product_images` and `product_variations` rows before re-inserting from
the request body. Never call it with stale cached data and never use it for bulk partial stock
changes. Use the per-row "Set qty" flow or a future scoped PATCH endpoint instead.

### Tailwind CSS Layer Order
```css
@layer theme, base, clerk, components, utilities;
```
The `clerk` layer must appear between `base` and `components`. The Vite Tailwind plugin must run
with `optimize: false` because `@clerk/themes/shadcn.css` is not a standard Tailwind file.

---

## 19. Strangler-Fig Migration Plan

```
Phase 1 (complete):
  api-nest: Profile, Addresses, Wishlist, Orders, Paystack
  api-server: still serving Catalog + Admin (no-op store)

Phase 2 (planned):
  api-nest: Roles & Permissions, Catalog (products, categories, banners),
            Admin Auth, Doctor onboarding, Prescriptions, Cart, Consultations
  api-server: routes deleted as modules port over

Phase 3 (future):
  api-server: fully decommissioned
  api-nest: all routes, Drizzle-backed repositories
```

**Repository swap (any module):**
1. Implement `InMemoryRepository<T>` surface in Drizzle against the corresponding schema table
2. Update the service `import` — no controller changes, no route changes
3. Run `pnpm --filter @workspace/db run push` to apply schema

---

## 20. Known Gotchas

1. **`/api/admin/products` is legacy / no-op.** The Express admin product routes route
   through `legacy-store.ts` (no persistence). The admin Products page now writes to the
   cmsStore `products` key instead — do not add new code that talks to `/api/admin/products`.

2. **`cmsStore` is the only CMS path.** Bypassing it breaks the audit log and prevents
   the NestJS migration from working cleanly. The `audit-log`, `user-*` and `customer-*`
   keys are deliberately local-only; everything else syncs to `/api/v2/admin/cms/:key`.

3. **Supabase is fully removed.** `artifacts/api-server/src/lib/legacy-store.ts` returns
   no-ops. Do not import from any Supabase stub or add new code that depends on those routes.

4. **Pre-existing TypeScript errors** exist in `security.ts`, `traffic-classifier`,
   `contact-inquiries`, `pages/contact`, and `tags.name`. These are out-of-scope for current
   work; do not chase them when validating a focused change.

5. **NestJS `@Inject()` is mandatory** on every controller constructor. `tsx` does not emit
   decorator metadata, so NestJS cannot infer types automatically. The shared `AdminGuard`
   also uses `@Inject(Reflector)` for the same reason.

6. **Tailwind `optimize: false`** is required in the Vite config. Removing it breaks
   `@clerk/themes/shadcn.css`.

7. **Admin sidebar hover states use `onMouseEnter`/`onMouseLeave`**, not CSS classes.
   Inline styles override class-based hover utilities in React.

8. **NestJS in-memory stores reset on restart.** Profile, addresses, wishlist, orders,
   prescriptions, payment records, partner sessions and submissions are all in RAM.
   Intentional until the Drizzle swap lands.

9. **`AdminGuard` blocks unauthenticated writes in production.** When `ADMIN_API_TOKEN` is
   set, the storefront's cmsStore PUTs to `/api/v2/admin/cms/:key` need to either share the
   token (server-to-server) or be replaced by a Clerk-admin JWT flow. Dev/staging without
   the token still works for backwards compatibility.

10. **`SEED_DEMO_ORDERS` env flag.** OrdersModule no longer auto-injects fake orders into
    every new session. Set `SEED_DEMO_ORDERS=1` if you want the demo data back for a
    screenshot or onboarding flow.

---

## 21. Brand Reference

**Positioning:** The trust layer for medicine distribution — community-driven, globally credible,
affordable but dignified, accessible but world-class.

**Brand promise:** Genuine, fairly priced, delivered with integrity.

**Palette (source of truth):**
| Token | Hex | Usage |
|---|---|---|
| Wine (primary) | `#3D0814` | Sidebar bg, avatar chips, primary CTA bg |
| Wine deep | `#4D0F1E` | Sidebar top gradient stop |
| Wine mid | `#6B0F1A` | Gradient accents |
| Orange accent | `#F97316` | CTA hover, active nav bar, gradient end |
| Red accent | `#B91C1C` | Error states, danger actions |
| Golden hover | `#EAB64D` | Sidebar nav item hover bg |
| Cream bg | `#FFFBF5` | Admin content area, card backgrounds |

**Typography:** Inter (sans-serif) for body; UI-serif / Georgia for display headings.

**Voice:** 60 % authority, 40 % warmth. Calm, clear, reassuring, professional, human.

**Avoid:** Generic medical crosses, heartbeat lines, "AI vibe" gradients on content surfaces,
emojis in UI copy, aggressive pricing language.

---

## 22. Phase 2 Roadmap

- **Roles & Permissions module** in `api-nest` — replace the hardcoded super-admin with a real
  RBAC system. `AdminRolesPermissions` UI already exists at `/admin/roles`.
- **Doctor onboarding form + panel** — `DoctorPanelPage` and `AdminDoctors` UI exist;
  backend module pending.
- **Prescription buy flow + pay-before-call** — allow patients to pre-pay for telemedicine
  consultations; triggers prescription dispensing pipeline.
- **Sticky notes per patient** — pharmacist / doctor notes attached to patient profiles.
- **Cart module in api-nest** — move cart from React Context to a server-backed session cart
  to support cross-device persistence.
- **Drizzle repository swap** — replace all `InMemoryRepository<T>` instances with Drizzle-backed
  implementations one module at a time (no controller changes).
- **Admin auth** — replace the shared `ADMIN_API_TOKEN` (interim) with Clerk-issued admin
  JWT claims validated in `api-nest`. The Phase-1 `AdminGuard` already wraps every admin
  controller, so only the token check inside it needs to swap.
- **Partner-portal Clerk migration** — the new server-side `PartnersModule` validates email
  + portal-code today and stamps the session cookie. Phase 2 swaps the body of
  `authenticate()` for a Clerk JWT verifier with `partnerType` custom claim; UI calls
  (`loginPartner`, `submitPartnerOrder`) stay identical.
- **Decommission `api-server`** — once Catalog and Admin modules port to `api-nest`, delete
  the legacy Express server entirely.
