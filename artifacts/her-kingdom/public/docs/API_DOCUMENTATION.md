# Shaniid RX — API Documentation

Complete reference for every HTTP endpoint exposed by the platform, the authentication model that protects them, and the end-to-end **workflows** that tie them together.

Two backend services run side-by-side during the strangler migration:

- **`api-nest`** — the active NestJS server. Mounted at **`/api/v2`**. Port 8090. **All new work goes here.**
- **`api-server`** — legacy Express server. Mounted at **`/api`**. Port 8080. Frozen; routes retire as Nest modules replace them.

> Reading order: start with **§1 Authentication & Authorization** (how requests are trusted), then **§2 Module reference** (every endpoint), then **§3 Workflows** (how the endpoints combine into real journeys). §4–§9 are schemas, legacy notes, env vars, and policy.

---

## 0. Conventions

- All request and response bodies are **JSON** (`Content-Type: application/json`).
- Errors are shaped `{ error: string, hint?: string, status?: number, raw?: object }`.
- All times are **ISO-8601 UTC** strings unless noted (the health probe returns epoch-ms).
- Money values are **integer KES** (no decimals).
- The customer/guest session is a signed **`shaniidrx_sid`** cookie (see §1.1).
- CORS is open (`origin: true, credentials: true`) on both services so the storefront can send the cookie.

### Status codes

| Code | Meaning |
| ---- | ------- |
| 200 | OK |
| 201 | Created |
| 400 | Bad request (validation) |
| 401 | Not authenticated (missing/invalid session or admin token) |
| 403 | Authenticated but lacks permission |
| 404 | Not found |
| 409 | Conflict (e.g. duplicate slug) |
| 422 | Semantic error (logic violation) |
| 429 | Rate limited (see `Retry-After`) |
| 502 | Upstream error (Paystack, email/WhatsApp provider, etc.) |
| 503 | Service unavailable (provider or admin token not configured) |

---

## 1. Authentication & Authorization

Every `/api/v2` request passes through the same global pipeline, in this order:

1. **`cookieParser(SESSION_SECRET)`** — verifies signed cookies. **In production** `SESSION_SECRET` must be set: the app **refuses to start** if it's still the built-in dev fallback (fails closed). In development a dev fallback secret is used so local work needs no setup.
2. **Rate-limit middleware** — sliding-window per client (see §1.5).
3. **`SessionMiddleware`** — establishes `req.sessionId` for data isolation (§1.1).
4. **Route guards** — `AdminGuard` on admin routes (§1.2); customer routes rely on the session.
5. **`AllExceptionsFilter`** — normalizes every error into the standard JSON shape.

There are **four** distinct identities in the system. Knowing which one a route expects is the key to using the API correctly.

| Identity | Used by | Mechanism | Where |
| -------- | ------- | --------- | ----- |
| **Guest / customer session** | Storefront shoppers | Signed `shaniidrx_sid` cookie | §1.1 |
| **Admin / operator** | Admin panel | `ADMIN_API_TOKEN` via header, issued by admin login | §1.2 |
| **Partner** | Supplier / clinic / logistics portals | Email + portal code → session-scoped server auth | §1.3 |
| **Customer (Clerk)** | Branded storefront account area | Clerk (front-end), `clerkMiddleware()` on api-server | §1.4 |

### 1.1 Customer / guest session — `SessionMiddleware`

- On the first request, the middleware issues a **signed UUID** in the `shaniidrx_sid` cookie:
  - `httpOnly: true` — JavaScript cannot read it.
  - `sameSite: "lax"` — blocks most CSRF.
  - `signed: true` — HMAC-signed with `SESSION_SECRET`; a forged or tampered cookie is dropped by `cookie-parser` and never reaches `req.signedCookies`.
- The verified value is attached as **`req.sessionId`**. Every customer-facing service (profile, addresses, wishlist, orders, prescriptions, chat, notifications, support, uploads) reads `req.sessionId` and never the raw cookie.
- **This is data-isolation scoping, not full identity.** It guarantees "this browser sees only its own data," not "this is a verified human." Real identity arrives when Clerk lands: the middleware body is swapped for a JWT verifier that sets `req.sessionId = clerkUserId` — **no service or controller changes**.

### 1.2 Admin / operator — `AdminGuard` + admin login

Admin routes are gated by `@UseGuards(AdminGuard)` (`src/common/admin-guard.ts`).

**How a request is authorized:**

- The client sends the admin token in **`x-admin-token`** or as **`Authorization: Bearer <token>`**.
- The guard compares it to `ADMIN_API_TOKEN`:
  - **Token set + match** → allowed; a minimal `req.adminUser = { role, email, name }` is attached.
  - **Token set + mismatch** → `401 Unauthorized`.
  - **Token NOT set** → behaviour depends on environment:
    - **Production** (or `ADMIN_REQUIRE_TOKEN=1`) → **fails closed** with `503` ("Admin authentication is not configured").
    - **Development** → allowed for convenience (dev token `shaniidrx-admin-dev-token`), so local work needs no setup.
- `@Public()` exempts a specific handler from the controller-level guard (e.g. the login route, the Paystack webhook, the monitoring event sink).

**Admin login flow — `/api/v2/admin/auth`:**

| Method | Path | Guard | Body | Description |
| ------ | ---- | ----- | ---- | ----------- |
| `POST` | `/admin/auth/login` | public | `{ email, password }` | Validates against `ADMIN_EMAIL` / `ADMIN_PASSWORD`. On success returns `{ token, role, name, email }`. The client stores `token` and sends it as `x-admin-token` on every later admin call. Wrong credentials → `401`. |
| `POST` | `/admin/auth/forgot-password` | public | `{ email }` | Always returns `{ ok: true }` (never leaks whether an email is registered). Sends a real recovery email once `RESEND_API_KEY` is configured. |
| `GET`  | `/admin/auth/me` | token | — | Verifies the bearer/`x-admin-token` and returns `{ role, name, email }`. Used to bootstrap the panel on load. |

> **Today's roles** are coarse: a single `super_admin`. Fine-grained roles (`admin`, `pharmacist`, `doctor`) are the next iteration — they slot in behind the same guard with no route changes.

### 1.3 Partner portals — `/api/v2/partners/:type`

Suppliers, clinics, and logistics companies authenticate **server-side** (no Clerk). `:type` is one of `supplier | clinic | logistics`.

| Method | Path | Guard | Body | Description |
| ------ | ---- | ----- | ---- | ----------- |
| `POST` | `/partners/welcome` | public | `{ type, name, email, portalCode }` | Email the partner their portal credentials. `503` if no email provider is configured. |
| `POST` | `/partners/:type/auth` | session | `{ email, portalCode }` | Authenticate a partner against their record. The result is bound to the current `sessionId`. |
| `POST` | `/partners/:type/signout` | session | — | Clear the partner session binding. |
| `POST` | `/partners/:type/orders` | session | `{ kind, payload }` | Submit a partner action (e.g. clinic places a bulk order, logistics confirms a delivery). |
| `GET`  | `/partners/:type/orders` | session | — | List submissions/orders for this partner session. |

Partner business records (the supplier/clinic/logistics objects, including KYC and portal codes) are detailed in **§4**.

### 1.4 Customer auth (Clerk)

- The storefront wraps `<ClerkProvider>` in `App.tsx`. Hosted-style sign-in/up live at `/sign-in` and `/sign-up`; the branded `/account/login` and `/account/register` use Clerk hooks and accept **username OR email**.
- `<ProtectedAccount>` guards `/account/*` **and `/upload-prescription`**. A signed-out visitor is redirected to `/account/login?redirect=<path>` and, after signing in or registering, is sent **back** to where they started (open-redirect-safe — only same-origin relative paths are honoured; see `src/lib/auth-redirect.ts`).
- **Guest checkout is preserved** — `/checkout` is never gated.
- Server side: `clerkMiddleware()` runs on **api-server**. The api-nest session cookie and Clerk coexist; when Clerk identity is wired into api-nest, `req.sessionId` becomes the Clerk user id.

### 1.5 Resilience layer (applies to every route)

- **Rate limiting** — sliding-window in-memory counter on all `/api/v2` traffic. Tunables: `RATE_LIMIT_WINDOW_MS` (default `60000`), `RATE_LIMIT_MAX` (default `600`/window). `x-forwarded-for` is only trusted when `TRUST_PROXY=1` (set in deployment); otherwise the raw socket address + signed sid form the key, so a client cannot forge its way around the limit. Responses carry `X-RateLimit-Limit/Remaining/Reset`; a breach returns `429` + `Retry-After`.
- **Global error filter** — `AllExceptionsFilter` normalizes everything to `{ statusCode, error, timestamp }` and never leaks internals.
- **SSRF guard** — outbound fetches (payment callbacks, scraping) validate the target host first.

---

## 2. Module reference — `/api/v2/*`

Guard legend: **session** = requires the `shaniidrx_sid` cookie (any browser); **admin** = `AdminGuard`; **public** = no auth.

### 2.1 Health — `/api/v2/healthz`

| Method | Path | Guard | Description |
| ------ | ---- | ----- | ----------- |
| `GET` | `/healthz` | public | Liveness probe. Returns `{ ok: true, service: "api-nest", ts: <epoch-ms> }`. No DB/external calls so it can't cascade-fail. |

### 2.2 Profile — `/api/v2/me`

| Method | Path | Guard | Body | Description |
| ------ | ---- | ----- | ---- | ----------- |
| `GET` | `/me` | session | — | Current session's profile (guest stub if new). |
| `PUT` | `/me` | session | `{ fullName?, phone?, email?, photoUrl? }` | Update profile fields. |

### 2.3 Addresses — `/api/v2/me/addresses`

| Method | Path | Guard | Body |
| ------ | ---- | ----- | ---- |
| `GET` | `/me/addresses` | session | — |
| `POST` | `/me/addresses` | session | `{ name, phone, line1, line2?, city, region, isDefault? }` |
| `PUT` | `/me/addresses/:id` | session | partial of above |
| `DELETE` | `/me/addresses/:id` | session | — |

### 2.4 Wishlist — `/api/v2/me/wishlist`

| Method | Path | Guard | Body |
| ------ | ---- | ----- | ---- |
| `GET` | `/me/wishlist` | session | — |
| `POST` | `/me/wishlist` | session | `{ productSlug, name, image?, unitPrice }` |
| `DELETE` | `/me/wishlist/:productSlug` | session | — |

### 2.5 Orders (customer) — `/api/v2/me/orders`

| Method | Path | Guard | Body |
| ------ | ---- | ----- | ---- |
| `GET` | `/me/orders` | session | — (most-recent-first) |
| `GET` | `/me/orders/:id` | session | — |
| `POST` | `/me/orders` | session | `{ items[], deliveryFee?, paymentMethod, customer{}, shippingAddress{} }` |

### 2.6 Prescriptions — `/api/v2/me/prescriptions` + `/api/v2/admin/prescriptions`

| Method | Path | Guard | Body | Description |
| ------ | ---- | ----- | ---- | ----------- |
| `GET` | `/me/prescriptions` | session | — | Patient's uploads. |
| `POST` | `/me/prescriptions` | session | `{ uploadId, notes?, patientPhone? }` | Submit for review (uses an `uploadId` from §2.7). |
| `GET` | `/me/prescriptions/:id` | session | — | Detail incl. pharmacist/doctor decision. |
| `PATCH` | `/me/prescriptions/:id` | session | `{ notes? }` | Patient updates notes. |
| `GET` | `/admin/prescriptions` | admin | — | Review queue (all patients). |
| `GET` | `/admin/prescriptions/:id` | admin | — | Full detail + scan. |
| `PATCH` | `/admin/prescriptions/:id` | admin | metadata | Edit metadata. |
| `PATCH` | `/admin/prescriptions/:id/status` | admin | `{ status, ... }` | Approve / reject / dispense. |

### 2.7 Uploads — `/api/v2/uploads`

| Method | Path | Guard | Body | Description |
| ------ | ---- | ----- | ---- | ----------- |
| `POST` | `/uploads` | session | `{ filename, mime, data (base64) }` (≤ 8 MB) | Store a file; returns `{ id, url, expiresAt }`. The URL is same-origin and needs the session cookie. |

### 2.8 Chat — `/api/v2/chat`

Customer ↔ pharmacist transcript bridge.

| Method | Path | Guard | Body | Description |
| ------ | ---- | ----- | ---- | ----------- |
| `GET` | `/chat/me` | session | — | The session's thread status. |
| `GET` | `/chat/me/messages` | session | — | Messages in the session's thread. |
| `POST` | `/chat/me/messages` | session | `{ text, attachmentUrl? }` | Customer sends a message. |
| `POST` | `/chat/me/read` | session | — | Mark agent messages read. |
| `GET` | `/chat/me/stream` | session | — | **SSE** live message stream for the customer's thread. |
| `GET` | `/chat/admin/stream` | admin | — | **SSE** live stream across admin threads. |
| `GET` | `/chat/admin/threads` | admin | — | All active customer threads. |
| `GET` | `/chat/admin/threads/:id` | admin | — | Thread detail. |
| `GET` | `/chat/admin/threads/:id/messages` | admin | — | Thread messages. |
| `POST` | `/chat/admin/threads/:id/messages` | admin | `{ text }` | Agent reply. |
| `POST` | `/chat/admin/threads/:id/read` | admin | — | Mark read by agent. |
| `DELETE` | `/chat/admin/threads/:id` | admin | — | Close/delete thread. |

### 2.9 Notifications & Support tickets — `/api/v2/...`

| Method | Path | Guard | Description |
| ------ | ---- | ----- | ----------- |
| `GET` | `/me/notifications` | session | List the session's notifications. |
| `POST` | `/me/notifications/read` | session | Bulk mark read. |
| `GET` | `/admin/notifications` | admin | System-wide notifications. |
| `POST` | `/admin/notifications` | admin | Send a manual notification. |
| `POST` | `/admin/notifications/read` | admin | Mark admin notifications read. |
| `GET` | `/me/support/tickets` | session | The session's support tickets. |
| `GET` | `/me/support/tickets/:id` | session | Ticket detail + messages. |
| `POST` | `/me/support/tickets` | session | Open a ticket. |
| `POST` | `/me/support/tickets/:id/messages` | session | Reply to a ticket. |
| `GET` | `/admin/support/tickets` | admin | All tickets. |
| `GET` | `/admin/support/tickets/:id` | admin | Ticket detail. |
| `POST` | `/admin/support/tickets/:id/messages` | admin | Agent reply. |
| `PATCH` | `/admin/support/tickets/:id/status` | admin | Open/close/update status. |

### 2.10 Payments — Paystack — `/api/v2/payments/paystack/*`

The active payment integration. **M-PESA STK Push via Paystack mobile money (Kenya).** Env-gated by `PAYSTACK_SECRET_KEY`.

| Method | Path | Guard | Description |
| ------ | ---- | ----- | ----------- |
| `GET` | `/payments/paystack/config` | session | `{ configured, publicKey }` so the client knows if payments are live. |
| `POST` | `/payments/paystack/charge` | session | Initiate an STK push (details below). |
| `GET` | `/payments/paystack/status` | session | Poll status by `reference` or `orderNumber`. |
| `POST` | `/payments/paystack/callback` | public | Paystack webhook; HMAC-SHA512 verified. |

#### `POST /payments/paystack/charge`

```jsonc
// Request
{
  "orderNumber": "SHX-AB12CD",
  "phone": "0712345678",          // accepts 07…, 254…, +254…
  "amount": 1250,                  // integer KES
  "email": "patient@example.com",  // optional; defaults to "{phone}@shaniidrx.local"
  "customerName": "Aisha Mwangi"   // optional
}
// 200 OK
{ "success": true, "status": "pending", "reference": "psk_abc123",
  "publicKey": "pk_test_…", "message": "STK push sent to your phone" }
// 503 — provider not configured
{ "error": "Payment provider not configured",
  "hint": "Set PAYSTACK_SECRET_KEY (and optionally PAYSTACK_PUBLIC_KEY, PAYSTACK_CALLBACK_URL) and restart api-nest." }
// 400 — bad input    { "error": "Enter a valid Safaricom number (e.g. 0712345678)" }
// 502 — Paystack rejected   { "error": "Insufficient funds", "status": 400, "raw": { … } }
```

#### `GET /payments/paystack/status?reference=psk_abc123`

Returns the live record. While still `pending`, it **lazily calls Paystack `/transaction/verify`**, so the storefront's poll loop is the only thing that needs to fire.

```jsonc
{ "reference": "psk_abc123", "orderNumber": "SHX-AB12CD", "phone": "254712345678",
  "amount": 1250, "currency": "KES", "status": "success", "mpesaReceipt": "QGH7X8Y9Z2",
  "message": "Approved", "createdAt": "…", "updatedAt": "…" }
// 404 — unknown reference  { "error": "Unknown payment reference" }
```

#### `POST /payments/paystack/callback`

Paystack webhook. Verifies `x-paystack-signature` with HMAC-SHA512 using `PAYSTACK_SECRET_KEY`. **Forged callbacks return 401 and never mutate state.**

### 2.11 Admin — CMS, orders, payments

| Method | Path | Guard | Description |
| ------ | ---- | ----- | ----------- |
| `GET` | `/admin/cms` | admin | List CMS content keys. |
| `GET` | `/admin/cms/:key` | admin | Read a CMS document (banners, categories, popup-offer, website-settings, custom-pages, footer, audit-log, message-templates, suppliers, clinics, logistics-partners, …). |
| `PUT` | `/admin/cms/:key` | admin | Create/replace a CMS document. |
| `DELETE` | `/admin/cms/:key` | admin | Remove a CMS document. |
| `GET` | `/admin/orders` | admin | All orders (filterable). |
| `GET` | `/admin/orders/:id` | admin | Order detail. |
| `POST` | `/admin/orders` | admin | Create a manual order (e.g. POS / phone order). |
| `PATCH` | `/admin/orders/:id` | admin | Update status, notes. |
| `DELETE` | `/admin/orders` | admin | Bulk delete. |
| `GET` | `/admin/payments` | admin | All payment transactions. |

> The storefront still persists most admin-managed content through the front-end `cmsStore` seam (browser today, these endpoints later). Wire admin screens to `cmsStore`, not directly to these routes, until the swap is flagged.

### 2.12 Admin — catalog import & web scraper — `/api/v2/admin/catalog`

| Method | Path | Guard | Description |
| ------ | ---- | ----- | ----------- |
| `POST` | `/admin/catalog/categories/import` | admin | Bulk import categories (JSON/CSV). |
| `POST` | `/admin/catalog/products/import` | admin | Bulk import products (JSON/CSV). |
| `POST` | `/admin/catalog/google-sheet` | admin | Sync catalog from a Google Sheet. |
| `POST` | `/admin/catalog/scrape-url` | admin | Scrape an external page for product data (SSRF-guarded). |

### 2.13 Admin — patient notes — `/api/v2/admin/patients/:patientId/notes`

| Method | Path | Guard | Description |
| ------ | ---- | ----- | ----------- |
| `GET` | `/admin/patients/:patientId/notes` | admin | Clinical notes for a patient. |
| `POST` | `/admin/patients/:patientId/notes` | admin | Add a note. |
| `PUT` | `/admin/patients/:patientId/notes/:noteId` | admin | Update a note. |
| `DELETE` | `/admin/patients/:patientId/notes/:noteId` | admin | Remove a note. |

### 2.14 Admin — operations pipeline — `/api/v2/admin/pipeline/*`

The automation layer for the four operational domains plus communications.

| Method | Path | Guard | Description |
| ------ | ---- | ----- | ----------- |
| `GET` | `/admin/pipeline/status` | admin | Global pipeline health. |
| `POST` | `/admin/pipeline/sourcing/scan` | admin | Run inventory sourcing automation. |
| `POST` | `/admin/pipeline/trading/recompute-margins` | admin | Recompute pricing from supply costs. |
| `POST` | `/admin/pipeline/qa/scan-expiry` | admin | Flag expiring inventory. |
| `POST` | `/admin/pipeline/logistics/auto-assign` | admin | Dispatch orders to optimal riders. |
| `POST` | `/admin/pipeline/communications/send` | admin | Trigger templated notifications (email / WhatsApp / SMS). |
| `POST` | `/admin/pipeline/communications/preview` | admin | Render a template with sample data. |

### 2.15 Notifications transport — Email & WhatsApp

These are **transports** the pipeline (and admins) use to actually deliver messages. Both are env-gated.

| Method | Path | Guard | Description |
| ------ | ---- | ----- | ----------- |
| `GET` | `/notifications/email/status` | none | Email provider readiness. |
| `POST` | `/notifications/email/send` | none | Send a transactional email (Resend). When Resend is **not** configured this returns **`503`** (`{ ok:false, hint }`) — it does **not** soft-skip at the HTTP layer. |
| `GET` | `/notifications/whatsapp/status` | admin | WhatsApp provider readiness. |
| `POST` | `/notifications/whatsapp/send` | admin | Send a WhatsApp message. |

> **Where "fail soft" actually applies.** The underlying `*Service.send()` methods return `{ ok:false, skipped:true }` when their provider is off. The **pipeline** (`/admin/pipeline/communications/send`) relies on that and **falls back to the `communications.outbox` queue** for SMS and unconfigured-WhatsApp paths. The **direct** `/notifications/email/send` endpoint, by contrast, surfaces the unconfigured state as a `503` rather than queuing.

**WhatsApp provider:** **Meta WhatsApp Cloud API is primary** (because templates carry Meta-approved names), with **Twilio** as a drop-in alternative.
- **Meta:** `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_API_VERSION` (default `v21.0`).
- **Twilio:** `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`.
- **Override:** `WHATSAPP_PROVIDER` = `meta` | `twilio` (else auto-detected).
- The pipeline sends the **fully-interpolated body as a text message** (valid in Meta's 24h service window). To send a proactively-initiated Meta *template*, call `WhatsAppService.send({ templateName, variables: string[] })` directly with an ordered `variables` array. Template presets (channel `whatsapp`) live in `message-templates.tsx`.

### 2.16 Monitoring — `/api/v2/monitoring/*`

System telemetry, surfaced inside `/admin/system/monitoring`.

| Method | Path | Guard | Description |
| ------ | ---- | ----- | ----------- |
| `POST` | `/monitoring/events` | public | Client error/event sink. |
| `GET` | `/monitoring/events` | admin | List captured events. |
| `DELETE` | `/monitoring/events` | admin | Clear events. |
| `GET` | `/monitoring/issues` | admin | Aggregated unique issues. |
| `GET` | `/monitoring/issues/:fp` | admin | Issue detail by fingerprint. |
| `POST` | `/monitoring/issues/:fp/status` | admin | Resolve/ignore an issue. |
| `GET` | `/monitoring/stats` | admin | Error/performance stats. |
| `GET` | `/monitoring/health` | admin | Deep health check. |
| `GET` | `/monitoring/config` | admin | Read thresholds. |
| `PUT` | `/monitoring/config` | admin | Update thresholds. |

---

## 3. Workflows

This section explains how the endpoints above combine into the journeys that actually run the business. Each workflow lists the **actor**, the **identity** in play (§1), and the **ordered steps** with the endpoints involved. `→` means "then".

### 3.1 Guest browsing → session bootstrap

**Actor:** any visitor. **Identity:** customer/guest session.

1. The browser hits any storefront page; catalog data comes from api-server (`/api/products`, `/api/categories`, `/api/site-data`).
2. The first `/api/v2/*` call triggers `SessionMiddleware`, which sets the signed `shaniidrx_sid` cookie and `req.sessionId`.
3. From here, wishlist, cart-adjacent data, and profile are all scoped to that session — **no login required to browse or add to a wishlist**.

### 3.2 Customer sign-up / sign-in with safe redirect

**Actor:** shopper. **Identity:** Clerk (front-end).

1. Shopper clicks a gated action (e.g. **Upload prescription** or **My account**).
2. `<ProtectedAccount>` sends them to `/account/login?redirect=<original-path>`.
3. They sign in or register (Clerk; username **or** email accepted). Google OAuth round-trips back to the app's base path.
4. On success, `getSafeRedirect()` validates the `redirect` param (same-origin relative only) and returns them to **exactly where they started**. If absent, they land on `/user`.
5. Guest checkout is never interrupted by this flow.

### 3.3 Prescription upload → pharmacist review → dispense

**Actors:** patient, then pharmacist/admin. **Identity:** session (patient), admin (pharmacist).

1. Patient must be signed in (gate from §3.2).
2. Patient uploads the scan: `POST /api/v2/uploads` → `{ uploadId }`.
3. Patient submits it: `POST /api/v2/me/prescriptions` with `{ uploadId, notes?, patientPhone? }`.
4. *(Roadmap hook)* a WhatsApp/email "prescription received" message can be dispatched via the transports in §2.15 once customer-phone plumbing is wired.
5. Pharmacist opens the queue: `GET /api/v2/admin/prescriptions` → `GET /admin/prescriptions/:id`.
6. Pharmacist decides: `PATCH /admin/prescriptions/:id/status` (approve / reject / dispense). Clinical context can be recorded with patient notes (§2.13).
7. Patient sees the decision via `GET /api/v2/me/prescriptions/:id`.

### 3.4 Order placement → M-PESA payment → fulfilment

**Actors:** customer, payment provider, admin. **Identity:** session + public webhook + admin.

1. Customer (guest or signed-in) creates the order: `POST /api/v2/me/orders` → an order with `orderNumber` in `pending`.
2. Storefront checks payments are live: `GET /api/v2/payments/paystack/config`.
3. Customer pays: `POST /api/v2/payments/paystack/charge` → STK push to their phone, returns a `reference` in `pending`.
4. Storefront **polls** `GET /api/v2/payments/paystack/status?reference=…`; while pending, the server lazily verifies with Paystack.
5. In parallel, Paystack calls `POST /api/v2/payments/paystack/callback` (HMAC-verified) and the record flips to `success` / `failed`.
6. Admin watches `GET /api/v2/admin/payments` and `GET /api/v2/admin/orders`, then advances the order with `PATCH /admin/orders/:id`.
7. If payments aren't configured (`503`), the storefront offers cash-on-delivery as a fallback.

### 3.5 Admin login → operating the panel

**Actor:** operator. **Identity:** admin token.

1. Operator signs in: `POST /api/v2/admin/auth/login` with `{ email, password }` → `{ token }`.
2. The panel stores the token and sends it as `x-admin-token` on **every** admin request.
3. On reload it re-validates with `GET /api/v2/admin/auth/me`.
4. All `/admin/*` routes (orders, payments, prescriptions, CMS, catalog, monitoring, pipeline, patient notes, chat/support) are now reachable.
5. In production, an unset `ADMIN_API_TOKEN` makes every admin route return `503` — set the token before going live.

### 3.6 Catalog management (import / scrape)

**Actor:** merchandiser. **Identity:** admin.

1. Bulk add via file: `POST /api/v2/admin/catalog/products/import` (and `/categories/import`).
2. Or sync a sheet: `POST /api/v2/admin/catalog/google-sheet`.
3. Or pull data from a supplier page: `POST /api/v2/admin/catalog/scrape-url` (SSRF-guarded).
4. Content surfaces through the CMS seam (`/admin/cms/*` / front-end `cmsStore`).

### 3.7 Operations pipeline (automation)

**Actor:** ops/admin (or scheduler). **Identity:** admin.

1. Check overall health: `GET /api/v2/admin/pipeline/status`.
2. **Sourcing:** `POST /admin/pipeline/sourcing/scan` proposes restock from suppliers.
3. **Trading:** `POST /admin/pipeline/trading/recompute-margins` updates prices from supply cost.
4. **QA:** `POST /admin/pipeline/qa/scan-expiry` flags near-expiry stock.
5. **Logistics:** `POST /admin/pipeline/logistics/auto-assign` dispatches orders to riders.
6. **Communications:** `POST /admin/pipeline/communications/preview` to render, then `/send` to dispatch — which calls the email/WhatsApp transports (§2.15), falling back to the outbox when a provider is off.

### 3.8 Partner portal lifecycle

**Actors:** admin (onboarding), partner. **Identity:** admin → partner session.

1. Admin onboards a partner and generates a portal code (supplier/clinic/logistics record, §4).
2. Credentials are emailed: `POST /api/v2/partners/welcome`.
3. Partner signs in at `/portal/<type>`: `POST /api/v2/partners/:type/auth` with `{ email, portalCode }` → bound to their session.
4. Partner acts: `POST /api/v2/partners/:type/orders` (e.g. clinic places a bulk order against its credit limit; logistics confirms a delivery) and reviews `GET /partners/:type/orders`.
5. Partner signs out: `POST /api/v2/partners/:type/signout`.

### 3.9 Customer support (chat + tickets)

**Actors:** customer, agent. **Identity:** session + admin.

- **Live chat:** customer posts to `/api/v2/chat/me/messages`; agent works the queue at `/api/v2/chat/admin/threads` and replies per thread.
- **Tickets (async):** customer opens `/api/v2/me/support/tickets`; agent triages at `/api/v2/admin/support/tickets`, replies, and closes via `PATCH …/:id/status`.
- **Notifications** (`/me/notifications`, `/admin/notifications`) keep both sides informed.

### 3.10 Health & monitoring (operability)

- Uptime checks hit `GET /api/v2/healthz`.
- The storefront posts client errors to `POST /api/v2/monitoring/events` (public sink).
- Operators triage at `/api/v2/monitoring/issues`, watch `/monitoring/stats`, and tune `/monitoring/config`.

---

## 4. Partner business records (CMS schemas)

Partner data (suppliers, clinics, logistics partners) is persisted via the front-end `cmsStore` today and migrates to dedicated NestJS modules behind the same `/api/v2/partners` + `/api/v2/admin/...` surface. The portal auth in §1.3 is already server-backed.

### 4.1 Suppliers — `cmsStore("suppliers")`

```typescript
interface Supplier {
  id: string                    // uuid v4
  companyName: string
  email: string                 // unique; portal login
  portalCode: string            // "SUP-XXXX-XXXX"; portal login
  phone?: string
  address: string; city: string; country: string
  contactPerson?: string; registrationNumber?: string; taxId?: string // KRA PIN
  status: "pending" | "verified" | "suspended" | "blacklisted"
  categories: SupplierCategory[]
  paymentTerms: string          // e.g. "Net 30"
  creditLimit: number           // integer KES
  hasLicense: boolean; hasFdaCert: boolean; hasInsurance: boolean; kycNotes?: string
  activePoCount: number; totalPoValue: number
  onTimeDeliveryRate: number    // 0–100 %
  qualityScore: number          // 0–5
  createdAt: string; updatedAt: string
}
```

**Portal code format:** `SUP-` + two groups of four uppercase alphanumerics, e.g. `SUP-AX4K-7RQ2`. Generated by the admin onboarding modal, shown once.

### 4.2 Clinics — `cmsStore("clinics")`

```typescript
interface Clinic {
  id: string
  clinicName: string
  clinicType: "hospital" | "clinic" | "dispensary" | "nursing_home" | "specialist_centre"
  email: string                 // unique; portal login
  portalCode: string            // "CLN-XXXX-XXXX"
  phone?: string; address: string; town: string; county: string
  licenseNumber?: string; nhifNumber?: string; medicalDirector?: string
  status: "pending_kyc" | "approved" | "suspended" | "rejected"
  tier: "standard" | "partner" | "preferred"
  creditLimit: number; creditUsed: number   // integer KES
  paymentTerms: string; specialties: string[]
  hasLicense: boolean; hasNhifCert: boolean; hasPinCert: boolean; hasDirectorId: boolean
  orderCount: number; totalOrderValue: number
  createdAt: string; updatedAt: string
}
```

**Trade on behalf:** clinic staff use **Place Order** to source on behalf of patients; the total is checked against `creditLimit - creditUsed`. `status !== "approved"` blocks ordering with a KYC-pending banner.

### 4.3 Logistics partners — `cmsStore("logistics-partners")`

```typescript
interface LogisticsPartner {
  id: string
  companyName: string
  email: string                 // unique; portal login
  portalCode: string            // "LOG-XXXX-XXXX"
  phone?: string; address: string; county: string
  registrationNumber?: string; insuranceNumber?: string
  status: "pending" | "active" | "suspended" | "inactive"
  coverageCounties: string[]
  vehicleTypes: VehicleType[]   // motorcycle | bicycle | tuktuk | van | cold_van | truck
  vehicles: LogisticsVehicle[]
  ratePerKm: number; ratePerDelivery: number   // integer KES
  hasInsurance: boolean; hasRegistration: boolean; hasDriverLicenses: boolean; hasSafetyTraining: boolean
  kycNotes?: string
  activeDeliveries: number; totalDeliveries: number
  onTimeRate: number; successRate: number       // 0–100 %
  slaScore: number              // 0–5
  avgDeliveryTime: number       // minutes
  createdAt: string; updatedAt: string
}
interface LogisticsVehicle {
  id: string; plateNumber: string; type: VehicleType; driver?: string
  status: "available" | "on_delivery" | "maintenance" | "offline"
}
```

---

## 5. api-server — `/api/*` (legacy)

Still in production; retires as Nest modules replace each route.

| Method | Path | Description | Status |
| ------ | ---- | ----------- | ------ |
| `GET` | `/api/products`, `/api/categories`, `/api/site-data` | Storefront catalog reads. | Active |
| `POST` | `/api/orders` | Pending-order creation (storefront still uses this). | Active |
| `GET` | `/api/orders/:orderNumber` | Lookup by order number. | Active |
| `POST` | `/api/track-view`, `/api/track-event`, `/api/track-abandoned` | Analytics ingestion. | Active |
| `*` | `/api/payments/payhero/*` | Legacy PayHero STK/status/callback. | **Deprecated** — replaced by Paystack; kept for in-flight transactions. |
| `*` | `/api/admin/*` | Legacy CMS read/write. | **Stubbed** (`legacy-store.ts` no-ops) — persist via `cmsStore` instead. |

**Why it's still running:** some integrations still hit `POST /api/orders`; a stray PayHero callback may still arrive; a hard cutover buys nothing. Each module ports in turn.

---

## 6. Environment variables

| Variable | Required? | Scope | Purpose |
| -------- | --------- | ----- | ------- |
| `SESSION_SECRET` | **Prod** | api-nest | Signs the `shaniidrx_sid` cookie. In production the app refuses to start if it's left as the dev fallback; dev uses a built-in fallback. |
| `DATABASE_URL` | Prod | api-* | Postgres connection string. |
| `PORT` | No | each artifact | Auto-assigned by Replit. |
| `ADMIN_API_TOKEN` | **Prod** | api-nest | Token the admin panel must present. Unset in prod → all admin routes `503`. |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Prod | api-nest | Credentials checked by `/admin/auth/login`. |
| `ADMIN_REQUIRE_TOKEN` | Optional | api-nest | `1` forces admin auth closed even in dev. |
| `TRUST_PROXY` | Deploy | api-nest | `1` to trust `x-forwarded-for` behind Replit's proxy (rate-limit identity). |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX` | Optional | api-nest | Rate-limit tuning (defaults `60000` / `600`). |
| `PAYSTACK_SECRET_KEY` | Payments on | api-nest | Server-side Paystack key. |
| `PAYSTACK_PUBLIC_KEY` | Optional | api-nest | Public key returned on `/charge`. |
| `PAYSTACK_CALLBACK_URL` | Optional | api-nest | Override the auto-derived webhook URL. |
| `WHATSAPP_ACCESS_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` / `WHATSAPP_API_VERSION` | WhatsApp (Meta) | api-nest | Meta Cloud API transport. |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_WHATSAPP_FROM` | WhatsApp (Twilio) | api-nest | Twilio transport (alt). |
| `WHATSAPP_PROVIDER` | Optional | api-nest | `meta` \| `twilio` override. |
| `RESEND_API_KEY` / `RESEND_FROM` | Email on | api-nest | Transactional email transport. |
| `PAYHERO_*` | **Deprecated** | api-server | Legacy; kept until in-flight transactions settle. |
| `VITE_ENABLE_CARD_PAYMENTS` | Optional | storefront | `"true"` to surface card UI. Default hidden. |
| `VITE_CLERK_PUBLISHABLE_KEY` | Yes | storefront | Clerk client key. |
| `CLERK_SECRET_KEY` | Yes | api-server | Clerk server key. |

---

## 7. Error shapes & client retries

Errors always look like:

```jsonc
{ "error": "Short human message", "hint"?: "What the operator should do next", "status"?: 400, "raw"?: { … } }
```

Clients should:

- Surface `error` verbatim (it's customer-facing English); show `hint` to operators.
- Treat `503` from `/payments/paystack/*` as "provider not configured" → offer COD.
- Treat `503` from `/admin/*` as "admin token not set."
- Honour `429` `Retry-After`.
- Retry transient `502`s up to twice with backoff (200ms, 800ms). Never auto-retry `4xx`.

---

## 8. Versioning policy

- `api-nest` lives at `/api/v2`. Breaking changes would ship behind `/api/v3`.
- `api-server` (`/api/*`) is frozen — no new endpoints; bug fixes only.
- Deprecations are announced at least one release before removal.

---

## 9. Roadmap (not yet built)

| Area | Planned surface |
| ---- | --------------- |
| Roles & permissions | `/api/v2/admin/users`, `/admin/users/:id/roles` — replace the single `super_admin` with `admin`/`pharmacist`/`doctor`. |
| Doctor module | `/api/v2/doctors` directory; `/me/doctors/:id/book` (Paystack charge **before** the video link); `/doctors/me/patients`. |
| Prescription purchase | `/api/v2/me/prescriptions/:id/purchase` — one-click buy of approved items. |
| Auto-send on trigger | Fire a WhatsApp/email the moment a prescription is uploaded (needs customer-phone plumbing + trigger→template resolver; transports already ready). |
| Postgres swap | Replace in-memory repos with Drizzle behind the identical service surface — no controller changes. |

---

For human-facing operations docs (setup, daily routines, troubleshooting), see [`TRAINING_MANUAL.md`](./TRAINING_MANUAL.md). For system design and module internals, see [`ARCHITECTURE.md`](./ARCHITECTURE.md).
