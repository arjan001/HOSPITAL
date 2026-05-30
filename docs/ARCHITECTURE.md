# Shaniid RX — System Architecture

> **Source of truth.** This document describes every service, module, data flow,
> auth strategy, and integration in the platform as of May 2026.  
> Keep it in sync whenever a new module ships or a service boundary changes.

---

## Table of Contents

1. [High-Level Overview](#1-high-level-overview)
2. [Service Map](#2-service-map)
3. [Request Routing](#3-request-routing)
4. [Authentication Flow](#4-authentication-flow)
5. [Session Model](#5-session-model)
6. [Payment Flow — Paystack M-Pesa](#6-payment-flow--paystack-m-pesa)
7. [CMS Persistence Layer](#7-cms-persistence-layer)
8. [Module Inventory](#8-module-inventory)
   - [api-nest modules](#api-nest-modules-apiv2)
   - [api-server routes](#api-server-routes-api)
   - [Storefront routes](#storefront-routes--admin-pages)
9. [Shared Libraries](#9-shared-libraries)
10. [Data / Database Strategy](#10-data--database-strategy)
11. [File Storage](#11-file-storage)
12. [Environment Variables](#12-environment-variables)
13. [Strangler Migration Plan](#13-strangler-migration-plan)
14. [Architecture Decisions Log](#14-architecture-decisions-log)

---

## 1. High-Level Overview

```
 Browser (Customer / Admin)
        │
        │ HTTPS  (path-based routing via Replit proxy)
        ▼
 ┌─────────────────────────────────────────────────────────────┐
 │               Replit Reverse Proxy  (port 80)               │
 │  /          → artifacts/her-kingdom  (Vite SPA, port 21470) │
 │  /api       → artifacts/api-server   (Express, port 8080)   │
 │  /api/v2    → artifacts/api-nest     (NestJS, port 8090)    │
 │  /api/__clerk → Clerk proxy (forwarded by api-server)       │
 └─────────────────────────────────────────────────────────────┘
        │                  │                    │
        ▼                  ▼                    ▼
   React SPA          Express API          NestJS API
 (Storefront +       (Legacy catalog,    (Customer modules,
  Admin Panel)        payments stub,      Paystack, Prescriptions,
                       Clerk proxy)        Admin CMS, Chat…)
```

**Design philosophy:** Strangler-fig migration — the NestJS backend grows
module by module while the legacy Express server keeps the catalog/admin
routes alive. No big-bang rewrite, no downtime.

---

## 2. Service Map

| Artifact | Package | Port | Prefix | Purpose |
|---|---|---|---|---|
| `artifacts/her-kingdom` | `@workspace/shaniid` | 21470 | `/` | React storefront + admin SPA |
| `artifacts/api-server` | `@workspace/api-server` | 8080 | `/api` | Legacy Express: catalog, Clerk proxy |
| `artifacts/api-nest` | `@workspace/api-nest` | 8090 | `/api/v2` | NestJS: customer modules, payments |
| `artifacts/mockup-sandbox` | `@workspace/mockup-sandbox` | — | — | UI prototyping only (dev) |

### Shared packages

| Package | Path | Purpose |
|---|---|---|
| `@workspace/db` | `packages/db` | Drizzle ORM schemas + migrations |
| `@workspace/api-spec` | `packages/api-spec` | OpenAPI YAML + Orval config |
| `@workspace/api-client-react` | `packages/api-client-react` | Generated SWR hooks |
| `@workspace/api-zod` | `packages/api-zod` | Generated Zod schemas |

---

## 3. Request Routing

### Storefront page request

```
User hits https://<domain>/product/paracetamol-500mg
    │
    ▼
Replit proxy → her-kingdom Vite SPA (index.html)
    │
    ▼ (client-side router — wouter)
ProductDetailPage renders
    │
    ├── GET /api/products/:slug  → api-server (catalog data)
    └── GET /api/v2/me/wishlist  → api-nest   (wishlist state)
```

### Admin request

```
User hits https://<domain>/admin/orders
    │
    ▼
Replit proxy → her-kingdom Vite SPA (index.html)
    │
    ▼ (client-side router)
AdminOrders component
    │
    ├── GET /api/admin/orders    → api-server (legacy orders list)
    └── GET /api/v2/admin/orders → api-nest   (new orders module)
```

### Clerk authentication proxy

```
Browser Clerk SDK → POST /api/__clerk/v1/client/sessions
    │
    ▼
api-server clerkProxyMiddleware → forward to Clerk's EU/US cluster
    │
    ▼
Clerk responds → cookie set on first-party domain → browser
```

---

## 4. Authentication Flow

Shaniid RX uses **Clerk** for customer authentication (shipped May 2026).

### Sign-in paths

```
Path A — Email / Password
─────────────────────────
  1. User visits /account/login
  2. login.tsx calls signIn.create({ identifier, password })
     • identifier = email address OR username (Clerk native)
  3. status === "complete"  →  setActive({ session })  →  /user
  4. status !== "complete"  →  prompt user to verify email

Path B — Google OAuth
──────────────────────
  1. User clicks Google button
  2. signIn.authenticateWithRedirect({ strategy: "oauth_google",
       redirectUrl: "/account/sso-callback" })
  3. Browser → accounts.google.com → consent → Clerk
  4. Clerk → /account/sso-callback
  5. SsoCallbackPage renders <AuthenticateWithRedirectCallback>
  6. Session finalised → /user

Path C — Password Reset
────────────────────────
  1. User clicks "Forgot Password"
  2. signIn.create({ strategy: "reset_password_email_code",
       identifier: email })
  3. Clerk emails 6-digit OTP
  4. User enters code + new password
  5. signIn.attemptFirstFactor({ strategy: "reset_password_email_code",
       code, password })
  6. status === "complete"  →  setActive  →  /user
```

### Protected routes

```
/account           → ProtectedAccount wrapper (redirect to /account/login if signed out)
/account/dashboard → ProtectedAccount
/account/settings  → ProtectedAccount
/account/prescriptions → ProtectedAccount
/dashboard         → ProtectedAccount
/user              → ProtectedAccount
/checkout          → NOT protected (guest checkout is intentional)
/admin/*           → Currently no server-side guard (TBD with Phase 2 roles)
```

### Clerk session on the backend

- `clerkMiddleware()` is mounted in `api-server/src/app.ts`.
- Every request to `/api` carries the Clerk JWT cookie.
- `requireAdmin` in `middlewares/admin-auth.ts` is currently a pass-through
  (hardcoded super-admin) — real RBAC comes with the NestJS Roles module.

---

## 5. Session Model

The NestJS backend uses a **cookie-based guest session** today, ready to swap
to Clerk JWT with a one-line change.

```
Request → SessionMiddleware (app.module.ts, applied to all routes)
  │
  ├── Cookie "shaniidrx_sid" present? ──YES──→ use as sessionId
  │
  └── NO ──→ generate randomUUID()
              set httpOnly cookie (1 year, sameSite: lax, secure in prod)
              req.sessionId = uuid
  │
  ▼
Controller reads req.sessionId
Service reads/writes InMemoryRepository<T> scoped to that sessionId
```

**Migration to Clerk (Phase 2):**  
Replace the cookie read in `session.middleware.ts` with:
```ts
req.sessionId = verifyClerkJwt(req.headers.authorization).sub
```
Controllers and services don't change — they only ever read `req.sessionId`.

---

## 6. Payment Flow — Paystack M-Pesa

Endpoint base: `POST /api/v2/payments/paystack`

```
Storefront checkout
  │
  ├─ 1. User clicks "Pay with M-Pesa"
  │       MpesaPaymentModal opens
  │
  ├─ 2. POST /api/v2/payments/paystack/charge
  │       body: { phone, amount, orderNumber, email }
  │       ─────────────────────────────────────────
  │       PaystackService → POST https://api.paystack.co/charge
  │         mobile_money: { phone, provider: "mpesa" }
  │       ─────────────────────────────────────────
  │       Returns: { reference, status: "pending" }
  │
  ├─ 3. Storefront polls GET /api/v2/payments/paystack/status?reference=…
  │       Every 3 s for up to 2 min
  │       Returns: { status: "pending" | "success" | "failed" }
  │
  ├─ 4. Paystack → POST /api/v2/payments/paystack/callback  (webhook)
  │       HMAC-SHA512 signature verified against raw request body
  │       event "charge.success" → status updated to "success"
  │       event "charge.failed"  → status updated to "failed"
  │
  └─ 5. Storefront poll detects "success" → order confirmed
         Status "failed" → error message shown
```

**Env variables required:**
- `PAYSTACK_SECRET_KEY` — required; missing → 503 on all endpoints
- `PAYSTACK_PUBLIC_KEY` — optional, surfaced in charge response
- `PAYSTACK_CALLBACK_URL` — optional, defaults to `{host}/api/v2/payments/paystack/callback`

**State store:** In-memory `Map<reference, PaymentRecord>`. Replace with
a `paystack_payments` Drizzle table when orders port to NestJS.

---

## 7. CMS Persistence Layer

All admin-managed content goes through **one seam**: `cms-store.ts`.

```
Admin component
  │
  ├── useCmsDoc("banners", [])          reads + subscribes
  │      │
  │      ▼
  │   cmsStore.get("banners")
  │      │
  │      ├── Sync: return localStorage snapshot (instant)
  │      └── Async: GET /api/v2/admin/cms/banners
  │               update snapshot if server differs
  │               fire "cms-store:change" event
  │               useSyncExternalStore re-renders component
  │
  └── cmsStore.set("banners", newValue)
         │
         ├── 1. Update localStorage snapshot (instant UI)
         ├── 2. Fire "cms-store:change" event (all tabs update)
         ├── 3. Append to audit log
         └── 4. PUT /api/v2/admin/cms/banners  (background, best-effort)
```

**Local-only keys** (never sent to server):
- `audit-log` — append-only; dedicated endpoint planned
- `user-*` — per-visitor storefront state
- `customer-*` — per-visitor preferences

**Postgres swap:** Replace the in-memory Map in
`api-nest/src/modules/admin-cms.module.ts` with a Drizzle-backed
implementation against the `admin_cms` table. No client changes needed.

---

## 8. Module Inventory

### api-nest modules (`/api/v2`)

> Routes verified against `@Controller`/method decorators. Guard legend: **session** = signed `shaniidrx_sid` cookie (`SessionMiddleware`); **admin** = `AdminGuard` (`x-admin-token` / Bearer); **public** = `@Public()`. See `docs/API_DOCUMENTATION.md` §1–§2 for full detail.

#### Authentication

| Module | Controller | Routes | Guard | Description |
|---|---|---|---|---|
| `AdminAuthModule` | `AdminAuthController` | `POST /admin/auth/login`, `POST /admin/auth/forgot-password`, `GET /admin/auth/me` | public / public / token | Admin email+password login → issues the admin token |
| `PartnersModule` | `PartnerWelcome` + `PartnersController` | `POST /partners/welcome`, `POST /partners/:type/auth`, `POST /partners/:type/signout`, `GET/POST /partners/:type/orders` | public / session | Server-side supplier/clinic/logistics portal auth + actions |

#### Customer-facing (session)

| Module | Controller | Routes | Description |
|---|---|---|---|
| `ProfileModule` | `ProfileController` | `GET /me`, `PUT /me` | Guest/customer profile |
| `AddressesModule` | `AddressesController` | `GET/POST /me/addresses`, `PUT/DELETE /me/addresses/:id` | Delivery address book |
| `WishlistModule` | `WishlistController` | `GET/POST /me/wishlist`, `DELETE /me/wishlist/:productSlug` | Saved products list |
| `OrdersModule` | `OrdersController` | `GET/POST /me/orders`, `GET /me/orders/:id` | Customer order history |
| `PrescriptionsModule` | `PrescriptionsController` (+ admin) | `GET/POST /me/prescriptions`, `GET/PATCH /me/prescriptions/:id`; admin: `GET /admin/prescriptions`, `GET/PATCH /admin/prescriptions/:id`, `PATCH /admin/prescriptions/:id/status` | Upload + pharmacist review/dispense |
| `ChatModule` | `ChatController` | `GET /chat/me`, `GET/POST /chat/me/messages`, `POST /chat/me/read`, `GET /chat/me/stream` (SSE); admin: `…/chat/admin/threads…`, `GET /chat/admin/stream` (SSE) | Customer ↔ pharmacist chat |
| `NotificationsModule` | notifications + support | `GET /me/notifications`, `POST /me/notifications/read`, `GET/POST /me/support/tickets`, `POST /me/support/tickets/:id/messages`; admin mirrors under `/admin/...` | In-app alerts + support tickets |
| `PaystackModule` | `PaystackController` | `GET /payments/paystack/config`, `POST /payments/paystack/charge`, `GET /payments/paystack/status`, `POST /payments/paystack/callback` (public) | M-Pesa STK push via Paystack |
| `UploadsModule` | `UploadsController` | `POST /uploads` | File upload to local disk (S3 swap ready) |

#### Admin (`AdminGuard`)

| Module | Controller | Routes | Description |
|---|---|---|---|
| `AdminOrdersModule` | `AdminOrdersController` | `GET/POST /admin/orders`, `GET/PATCH /admin/orders/:id`, `DELETE /admin/orders` | Order fulfillment dashboard |
| `AdminPaymentsModule` | `AdminPaymentsController` | `GET /admin/payments` | Transaction ledger view |
| `AdminCmsModule` | `AdminCmsController` | `GET /admin/cms`, `GET/PUT/DELETE /admin/cms/:key` | Generic CMS key-value store backing cmsStore |
| `CatalogImportModule` | `CatalogImportController` | `POST /admin/catalog/{categories/import, products/import, google-sheet}` | CSV/JSON/Sheet bulk ingestion |
| `PatientNotesModule` | `PatientNotesController` | `GET/POST /admin/patients/:patientId/notes`, `PUT/DELETE /admin/patients/:patientId/notes/:noteId` | Clinical sticky notes |
| `PipelineModule` | 6 controllers | `GET /admin/pipeline/status`, `POST /admin/pipeline/{sourcing/scan, trading/recompute-margins, qa/scan-expiry, logistics/auto-assign, communications/send, communications/preview}` | Operations automation |

#### Notifications transport & infrastructure

| Module | Controller | Routes | Guard | Description |
|---|---|---|---|---|
| `HealthModule` | `HealthController` | `GET /healthz` | public | Liveness probe |
| `EmailModule` | `EmailController` | `GET /notifications/email/status`, `POST /notifications/email/send` | none | Transactional email (Resend). Returns `503` when unconfigured (the pipeline path is what falls back to the outbox) |
| `WhatsAppModule` | `WhatsAppController` | `GET /notifications/whatsapp/status`, `POST /notifications/whatsapp/send` | admin | WhatsApp (Meta primary / Twilio alt), fails soft |
| `MonitoringModule` | `MonitoringController` | `POST /monitoring/events` (public); `GET/DELETE /monitoring/events`, `GET /monitoring/issues…`, `GET /monitoring/{stats,health,config}`, `PUT /monitoring/config` (admin) | mixed | Telemetry + issue triage |

---

### api-server routes (`/api`)

#### Public

| Route | Description |
|---|---|
| `GET /api/products` | Product catalogue list |
| `GET /api/products/:slug` | Single product detail |
| `GET /api/categories` | Category tree |
| `GET /api/hero-banners` | Homepage hero banner data |
| `GET /api/delivery-locations` | Coverage areas |
| `GET /api/site-data` | Aggregated storefront config |
| `GET /api/orders` | Order lookup (by phone/order number) |
| `POST /api/orders` | Place a new order |
| `GET /api/track-order` | Order tracking status |
| `POST /api/newsletter` | Newsletter subscription |
| `GET /api/gift-items` | Gift / care pack items |
| `GET /api/blogs` | Blog post list |
| `GET /api/blogs/:slug` | Blog detail |
| `GET /api/policies/:slug` | Policy document |
| `POST /api/upload` | File upload (legacy) |
| `POST /api/track-view` | Page view analytics |
| `POST /api/track-event` | Custom event analytics |
| `POST /api/track-abandoned` | Abandoned cart signal |

#### Admin

| Route | Description |
|---|---|
| `GET/PUT /api/admin/products` | Full product replace (see gotcha below) |
| `GET/POST/PUT/DELETE /api/admin/categories` | Category management |
| `GET/PUT /api/admin/banners` | Promotional banners |
| `GET/PUT /api/admin/hero-banners` | Hero images |
| `GET/PUT /api/admin/gift-items` | Gift / care packs |
| `GET/PUT /api/admin/settings` | Site-wide settings |
| `GET /api/admin/analytics` | Analytics aggregations |
| `GET/PUT /api/admin/orders` | Order management |

> **Gotcha:** `PUT /api/admin/products` is a **full replace** — it deletes all
> `product_images` and `product_variations` before re-inserting from the request
> body. Never call it with stale cached data. Partial updates need a scoped
> PATCH endpoint (planned).

#### Other

| Route | Description |
|---|---|
| `POST /api/auth/*` | Auth helpers (legacy, mostly pass-through) |
| `POST /api/payments/payhero/*` | Legacy PayHero M-Pesa (kept, not used) |
| `GET/POST /api/video/daily` | Daily.co video consultation tokens |
| `GET /api/__clerk/*` | Clerk API proxy (forwarded by clerkProxyMiddleware) |

---

### Storefront routes & admin pages

#### Customer-facing pages

| Route | Component | Auth |
|---|---|---|
| `/` | `LandingPage` | Public |
| `/shop` | `ShopPage` | Public |
| `/shop/:collection` | `CollectionPage` | Public |
| `/product/:slug` | `ProductDetailPage` | Public |
| `/checkout` | `CheckoutPage` | Public (guest checkout preserved) |
| `/wishlist` | `WishlistPage` | Public |
| `/care-packs` | `CarePacksPage` | Public |
| `/services` | `ServicesPage` | Public |
| `/blogs` / `/blogs/:slug` | `BlogsPage` / `BlogDetailPage` | Public |
| `/search` | `SearchPage` | Public |
| `/contact` | `ContactPage` | Public |
| `/faq` | `FaqPage` | Public |
| `/delivery` | `DeliveryPage` | Public |
| `/track-order` / `/track-order/:number` | `TrackOrderPage` | Public |
| `/speak-to-a-doctor` | `SpeakToADoctorPage` | Public |
| `/upload-prescription` | `UploadPrescriptionPage` | Public |
| `/who-we-are` / `/about` | `AboutPage` | Public |
| `/careers` | `CareersPage` | Public |
| `/privacy-policy` etc. | `PolicyPage` | Public |
| `/pages/:slug` | `CustomPageView` | Public |

#### Customer account (signed-in only)

| Route | Component |
|---|---|
| `/account/login` | `AccountLoginPage` (custom Clerk UI) |
| `/account/register` | `AccountRegisterPage` |
| `/account/sso-callback` | `SsoCallbackPage` |
| `/account` / `/account/dashboard` | `AccountDashboard` |
| `/account/settings` | `AccountSettingsPage` |
| `/account/prescriptions` | `AccountPrescriptionsPage` |
| `/account/support` | `AccountSupportPage` |
| `/account/chat` | `AccountChatPage` |
| `/dashboard` / `/user` | `DashboardPage` |
| `/doctor` | `DoctorPanelPage` |

#### Admin pages (`/admin/*`)

| Route | Component |
|---|---|
| `/admin` / `/admin/dashboard` | `AdminDashboard` — KPIs, sparklines, low-stock |
| `/admin/analytics` | `AdminAnalytics` |
| `/admin/products` | `AdminProducts` — CSV import/export, bulk ops |
| `/admin/categories` | `AdminCategories` — tree editor |
| `/admin/orders` | `AdminOrders` |
| `/admin/payments` | `AdminPayments` |
| `/admin/prescriptions` | `AdminPrescriptions` |
| `/admin/consultations` | `AdminConsultations` |
| `/admin/consultation-settings` | `AdminConsultationSettings` |
| `/admin/doctors` | `AdminDoctors` |
| `/admin/patients/:id` | `AdminPatientDetail` |
| `/admin/sourcing` + sub-routes | `AdminSourcing*` — inventory, forecast, pricing, automation, performance |
| `/admin/trading` + sub-routes | `AdminTrading*` — bids, negotiation, settlements |
| `/admin/qa` + sub-routes | `AdminQa*` — batches, trust seal, recalls |
| `/admin/logistics` + sub-routes | `AdminLogistics*` — inventory, lead-time, fallback |
| `/admin/campaigns` + sub-routes | `AdminCampaigns*` — email, SMS, audiences, pipelines, queue |
| `/admin/integrations` | `AdminIntegrations` |
| `/admin/integrations/templates` | `AdminMessageTemplates` |
| `/admin/banners` | `AdminBanners` |
| `/admin/website-settings` | `AdminWebsiteSettings` |
| `/admin/settings` | `AdminSettings` |
| `/admin/popup-offer` | `AdminPopupOffer` |
| `/admin/announcement` | `AdminAnnouncementBar` |
| `/admin/pages` | `AdminCustomPages` |
| `/admin/footer` | `AdminFooterCms` |
| `/admin/blogs` | `AdminBlogs` |
| `/admin/policies` | `AdminPolicies` |
| `/admin/delivery-locations` | `AdminDelivery` |
| `/admin/newsletter` | `AdminNewsletter` |
| `/admin/customers` | `AdminCustomers` |
| `/admin/users` | `UsersManagement` |
| `/admin/roles` | `AdminRolesPermissions` |
| `/admin/audit-log` | `AdminAuditLog` |
| `/admin/chat` | `AdminChat` |
| `/admin/docs` | `AdminDocs` (training manual + API docs viewer) |
| `/admin/bulk-import` | `AdminBulkImport` |
| `/admin/support` | `AdminSupportTickets` |
| `/admin/profile` | `AdminProfile` |
| `/admin/inquiries` | `AdminContactInquiries` |

---

## 9. Shared Libraries

### `packages/db` — Drizzle ORM

Defines the PostgreSQL schema and exposes a typed `db` client.

```
packages/db/
  src/
    schema/
      catalog.ts   — products, categories, product_images, product_variations
      orders.ts    — orders, order_lines
      users.ts     — customer_profiles, addresses
    index.ts       — drizzle(pool) export
    migrate.ts     — runs pending migrations
  drizzle/         — SQL migration files
```

**Key tables:**
- `products` — slug, name, price, stock_qty, prescription_required
- `product_images` — FK to products (deleted on full replace!)
- `product_variations` — FK to products (deleted on full replace!)
- `categories` — parent_id for tree structure
- `orders`, `order_lines` — customer purchases
- `admin_cms` — KV store for all CMS documents

### `packages/api-spec` — OpenAPI

Single YAML spec at `openapi.yaml`. `pnpm --filter @workspace/api-spec run codegen`
regenerates:
- `packages/api-client-react` — SWR hooks
- `packages/api-zod` — Zod schemas

### `packages/api-zod` — Validation schemas

Auto-generated from OpenAPI. Import these in both the Express routes and
the React forms to keep validation in sync.

---

## 10. Data / Database Strategy

```
Today (in-memory + localStorage)
──────────────────────────────────
  api-nest services     → InMemoryRepository<T>  (per-session Map)
  Admin CMS             → localStorage + /api/v2/admin/cms/:key
  PayHero / Paystack    → in-memory Map<reference, PaymentRecord>
  api-server catalog    → legacy-store.ts stubs  (empty reads)

Tomorrow (Postgres)
───────────────────
  1. Set DATABASE_URL pointing to a Postgres instance.
  2. Run `pnpm --filter @workspace/db run push` to create tables.
  3. Replace InMemoryRepository<T> in each NestJS service with a
     Drizzle-backed implementation (same listFor/add/update/remove surface).
  4. Replace in-memory payment Map with `paystack_payments` table.
  5. Replace localStorage CMS with `admin_cms` table via NestJS endpoint
     (already wired: /api/v2/admin/cms/:key PUT / GET).
```

### Repository pattern

Every NestJS service that stores data uses `InMemoryRepository<T>`:

```ts
class MyService {
  private repo = new InMemoryRepository<MyEntity>()

  list(sid: string) { return this.repo.listFor(sid) }
  create(sid: string, data: Omit<MyEntity, "id">) {
    return this.repo.add(sid, { id: newId("ent"), ...data })
  }
}
```

The Postgres swap replaces `InMemoryRepository<T>` with
`DrizzleRepository<T>` — controllers don't change.

---

## 11. File Storage

Both API services use the same local-disk storage abstraction:

```
Storage.put(filename, buffer)  →  /uploads/<sha256>/<filename>
Storage.get(filename)          →  Buffer | null
Storage.url(filename)          →  "/api/v2/uploads/<sha256>/<filename>"
```

`main.ts` in api-nest serves `/api/v2/uploads/*` as static files, gated
behind the `shaniidrx_sid` session cookie (PII guard).

**S3 swap path:**
1. Implement `Storage.put` using `@aws-sdk/client-s3` PutObject.
2. Implement `Storage.url` to return a signed URL.
3. Remove the `express.static` mount from `main.ts`.
4. No controller or service changes needed.

---

## 12. Environment Variables

### api-nest (`artifacts/api-nest`)

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `PORT` | No | `8090` | HTTP listen port |
| `NODE_ENV` | No | `development` | Controls cookie `secure` flag |
| `PAYSTACK_SECRET_KEY` | **Yes** for payments | — | Paystack API auth |
| `PAYSTACK_PUBLIC_KEY` | No | — | Surfaced to storefront |
| `PAYSTACK_CALLBACK_URL` | No | auto | Webhook target URL |

### api-server (`artifacts/api-server`)

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `PORT` | No | `8080` | HTTP listen port |
| `DATABASE_URL` | No | — | Postgres (unused until Drizzle swap) |
| `CLERK_PUBLISHABLE_KEY` | No | — | Clerk proxy host resolution |
| `DAILY_API_KEY` | No | — | Daily.co video consultation |
| `PAYHERO_*` | No | — | Legacy PayHero (not used) |

### her-kingdom (`artifacts/her-kingdom`)

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | **Yes** | — | Clerk customer auth |
| `VITE_CLERK_PROXY_URL` | No | — | Clerk API proxy override |
| `VITE_ENABLE_CARD_PAYMENTS` | No | `false` | Show card payment UI |

---

## 13. Strangler Migration Plan

```
Phase 1 (done — May 2026)
  ✓ NestJS api-nest scaffold
  ✓ Profile, Addresses, Wishlist, Orders modules
  ✓ Paystack M-Pesa payments (replaces PayHero)
  ✓ Admin CMS module (replaces localStorage-only path)
  ✓ Prescriptions, Uploads, Chat, Email, Notifications, Pipeline
  ✓ Clerk customer auth (sign-in / sign-up / OAuth / password reset)

Phase 2 (planned)
  ☐ Roles & permissions module (NestJS)
  ☐ Admin auth guard (Clerk JWT, replaces pass-through requireAdmin)
  ☐ Doctor onboarding form + panel (NestJS)
  ☐ Prescription pay-before-call flow
  ☐ Sticky notes per patient
  ☐ Postgres swap (InMemoryRepository → Drizzle)

Phase 3 (future)
  ☐ Catalog module ports to NestJS → retire api-server /api/products
  ☐ Orders module ports to NestJS → retire api-server /api/orders
  ☐ Delete api-server legacy routes one by one
  ☐ S3 file storage swap
  ☐ Apple / Facebook OAuth
```

---

## 14. Architecture Decisions Log

| Date | Decision | Rationale |
|---|---|---|
| Apr 2026 | Clerk for customer auth | Hosted auth removes password storage burden; free for low volumes |
| Apr 2026 | Wouter over React Router | Smaller bundle; base-path support needed for Replit proxy routing |
| Apr 2026 | SWR over React Query | Simpler cache API; Orval generates SWR hooks natively |
| May 2026 | NestJS for new backend | Dependency injection + decorator pattern scales team well; Strangler migration risk-free |
| May 2026 | Paystack replaces PayHero | Paystack supports KE M-Pesa natively; better SDK + webhook docs |
| May 2026 | localStorage CMS with NestJS background sync | Zero-latency writes + auditable; swap to Postgres is one-file change |
| May 2026 | In-memory repos (no Postgres yet) | Fastest path to working features; Postgres swap is designed in from the start |
| May 2026 | rawBody: true on NestJS | Paystack/Clerk webhook HMAC verification requires the original byte stream |
| May 2026 | No ValidationPipe on NestJS | Avoids class-validator/class-transformer dependency; controllers validate manually; Zod DTOs planned |
| May 2026 | Supabase removed | Replaced by cmsStore + NestJS CMS module; simpler operational model |
