# Shaniid RX — API Documentation

Complete reference for every HTTP endpoint exposed by the platform. Two backend services run side-by-side during the strangler migration:

- **`api-server`** — legacy Express server. Mounted at `/api`. Port 8080.
- **`api-nest`** — NestJS strangler server. Mounted at `/api/v2`. Port 8090.

All new development goes into `api-nest`. Legacy `/api` routes remain until a Nest module replaces each one.

---

## 0. Conventions

- All bodies are **JSON** (`Content-Type: application/json`).
- All responses are **JSON**, with errors shaped `{ error: string, hint?: string }`.
- All timestamps are **ISO-8601 UTC** strings.
- All money values are **integer KES** (no decimals).
- Sessions use the `shaniidrx_sid` cookie on api-nest. api-server reads Clerk JWTs via `clerkMiddleware()`.
- CORS is open (`origin: true, credentials: true`) on both services in development. Lock `origin` in production.

### HTTP Status Codes

| Code | Meaning |
|---|---|
| 200 | OK |
| 201 | Created |
| 400 | Bad request — input validation failed |
| 401 | Not signed in / session missing |
| 403 | Signed in but lacks permission |
| 404 | Resource not found |
| 409 | Conflict (e.g. duplicate slug) |
| 422 | Semantic error (logic violation) |
| 502 | Upstream error (PayHero, Clerk, Resend, etc.) |
| 503 | Service unavailable — provider not configured |

---

## 1. api-nest — `/api/v2/*`

### 1.1 Health

```
GET /api/v2/healthz
```

Returns `{ ok: true, service: "api-nest", ts: <unix-ms> }`. Use for uptime monitors and load-balancer health checks.

---

### 1.2 Profile — `/api/v2/me`

| Method | Path | Body | Returns | Notes |
|---|---|---|---|---|
| `GET` | `/me` | — | `Profile` | Returns the current session's profile or a guest stub. |
| `PATCH` | `/me` | `{ fullName?, phone?, email?, photoUrl?, preferences? }` | `Profile` | Partial update — only supplied fields change. |

```jsonc
// Profile shape
{
  "id": "sid_abc123",
  "fullName": "Aisha Mwangi",
  "email": "aisha@example.com",
  "phone": "0712345678",
  "photoUrl": null,
  "preferences": { "newsletter": true, "smsAlerts": false }
}
```

---

### 1.3 Addresses — `/api/v2/me/addresses`

| Method | Path | Body | Returns |
|---|---|---|---|
| `GET` | `/me/addresses` | — | `Address[]` |
| `POST` | `/me/addresses` | `{ label, fullName, phone, line1, line2?, city, region, isDefault? }` | `Address` |
| `PUT` | `/me/addresses/:id` | partial `Address` | `Address` |
| `DELETE` | `/me/addresses/:id` | — | `204` |

```jsonc
// Address shape
{
  "id": "addr_xyz",
  "label": "Home",
  "fullName": "Aisha Mwangi",
  "phone": "0712345678",
  "line1": "14 Ngong Road",
  "line2": "Apt 3B",
  "city": "Nairobi",
  "region": "Nairobi",
  "isDefault": true
}
```

---

### 1.4 Wishlist — `/api/v2/me/wishlist`

| Method | Path | Body | Returns |
|---|---|---|---|
| `GET` | `/me/wishlist` | — | `WishlistItem[]` |
| `POST` | `/me/wishlist` | `{ productSlug, name, image?, unitPrice }` | `WishlistItem` |
| `DELETE` | `/me/wishlist/:productSlug` | — | `204` |

---

### 1.5 Orders — `/api/v2/me/orders`

| Method | Path | Body | Returns |
|---|---|---|---|
| `GET` | `/me/orders` | — | `Order[]` (most recent first) |
| `GET` | `/me/orders/:id` | — | `Order` |
| `POST` | `/me/orders` | see below | `Order` |

```jsonc
// POST /me/orders body
{
  "items": [{ "productSlug": "panadol-extra-24", "qty": 2, "unitPrice": 250 }],
  "deliveryFee": 150,
  "paymentMethod": "mpesa",      // "mpesa" | "card" | "cod"
  "customer": {
    "name": "Aisha Mwangi",
    "phone": "0712345678",
    "email": "aisha@example.com"
  },
  "shippingAddress": {
    "line1": "14 Ngong Road", "city": "Nairobi", "region": "Nairobi"
  },
  "notes": "Leave at the gate"
}

// 201 Created
{ "id": "ord_abc", "orderNumber": "SHX-AB12CD", "status": "pending", ... }
```

---

### 1.6 Prescriptions — `/api/v2/me/prescriptions`

| Method | Path | Body | Returns |
|---|---|---|---|
| `GET` | `/me/prescriptions` | — | `Prescription[]` |
| `POST` | `/me/prescriptions` | `{ uploadId, notes?, patientPhone?, patientName? }` | `Prescription` |
| `GET` | `/me/prescriptions/:id` | — | `Prescription` with decision + timeline |
| `PATCH` | `/me/prescriptions/:id` | `{ status?, pharmacistNotes?, decision? }` | `Prescription` |

```jsonc
// Prescription shape
{
  "id": "rx_001",
  "rxNumber": "RX-20260525-001",
  "uploadId": "upl_xyz",
  "patientName": "Aisha Mwangi",
  "patientPhone": "0712345678",
  "notes": "For my mother",
  "status": "pending",           // "pending" | "approved" | "rejected" | "info_requested"
  "pharmacistNotes": null,
  "submittedAt": "2026-05-25T08:00:00.000Z",
  "timeline": [
    { "event": "submitted", "at": "2026-05-25T08:00:00.000Z" }
  ]
}
```

---

### 1.7 Uploads — `/api/v2/uploads`

| Method | Path | Body | Returns |
|---|---|---|---|
| `POST` | `/uploads` | `{ namespace?, filename, contentType, data (base64, ≤ 8 MB) }` | `{ id, url, key, size, expiresAt }` |

The returned `url` is served from the same origin and requires the session cookie. Use the `id` as `uploadId` when submitting a prescription.

---

### 1.8 Chat — `/api/v2/chat`

Lightweight real-time support chat between customers (patients) and pharmacy staff. Backed by in-memory store today.

#### Patient side

| Method | Path | Body | Returns |
|---|---|---|---|
| `GET` | `/chat/me` | — | `{ threadId, unreadByPatient }` — creates thread if none exists |
| `GET` | `/chat/me/messages` | — | `ChatMessage[]` |
| `POST` | `/chat/me/messages` | `{ text, attachmentUrl? }` | `ChatMessage` |
| `POST` | `/chat/me/read` | — | `204` — marks all patient messages read |
| `GET` | `/chat/me/stream` | — | **SSE stream** — push events when new staff messages arrive |

#### Admin / staff side

| Method | Path | Body | Returns |
|---|---|---|---|
| `GET` | `/chat/admin/threads` | — | `ChatThread[]` (most recent first, with unread count) |
| `GET` | `/chat/admin/threads/:id` | — | `ChatThread` detail |
| `GET` | `/chat/admin/threads/:id/messages` | — | `ChatMessage[]` |
| `POST` | `/chat/admin/threads/:id/messages` | `{ text, authorName, attachmentUrl? }` | `ChatMessage` |
| `POST` | `/chat/admin/threads/:id/read` | — | `204` — marks all staff messages as read |
| `DELETE` | `/chat/admin/threads/:id` | — | `204` |
| `GET` | `/chat/admin/stream` | — | **SSE stream** — push events for all new patient messages |

```jsonc
// ChatMessage shape
{
  "id": "msg_001",
  "threadId": "thr_xyz",
  "sender": "patient",           // "patient" | "staff"
  "text": "When will my order arrive?",
  "status": "delivered",         // "sent" | "delivered" | "read"
  "authorName": null,
  "createdAt": "2026-05-25T09:00:00.000Z"
}
```

**SSE stream format:** each message is a JSON event on the `data:` line:
```
event: message
data: { "type": "new_message", "threadId": "thr_xyz", "message": { ... } }
```

Clients should reconnect automatically on disconnect (standard `EventSource` behaviour).

---

### 1.9 Notifications — `/api/v2/me/notifications`

In-app notification feed for the signed-in session.

| Method | Path | Body | Returns |
|---|---|---|---|
| `GET` | `/me/notifications` | — | `Notification[]` (most recent first) |
| `POST` | `/me/notifications/read` | `{ ids?: string[] }` | `204` — mark specified IDs (or all if omitted) as read |

---

### 1.10 Support Tickets — `/api/v2/me/support/tickets`

| Method | Path | Body | Returns |
|---|---|---|---|
| `GET` | `/me/support/tickets` | — | `SupportTicket[]` |
| `GET` | `/me/support/tickets/:id` | — | `SupportTicket` with full message thread |
| `POST` | `/me/support/tickets` | `{ subject, body, category? }` | `SupportTicket` |
| `POST` | `/me/support/tickets/:id/messages` | `{ body }` | `TicketMessage` |

```jsonc
// SupportTicket shape
{
  "id": "tkt_001",
  "subject": "Wrong item delivered",
  "status": "open",              // "open" | "pending" | "resolved" | "closed"
  "category": "order",
  "createdAt": "2026-05-25T10:00:00.000Z",
  "messages": [
    { "id": "msg_001", "author": "customer", "body": "...", "createdAt": "..." }
  ]
}
```

---

### 1.11 Admin — Notifications — `/api/v2/admin/notifications`

Push a notification to one or more staff audiences. Used by the storefront after prescription upload and consultation payment.

| Method | Path | Body | Returns |
|---|---|---|---|
| `GET` | `/admin/notifications` | `?audience=admin` | `Notification[]` |
| `POST` | `/admin/notifications` | see below | `Notification` |
| `POST` | `/admin/notifications/read` | `{ ids?: string[] }` | `204` |

```jsonc
// POST /admin/notifications body
{
  "audience": "pharmacist",      // "admin" | "doctor" | "pharmacist"
  "module": "Prescriptions",
  "level": "alert",              // "info" | "success" | "warning" | "alert" | "error"
  "title": "Prescription needs review",
  "body": "RX-001 from Aisha Mwangi is pending verification.",
  "href": "/admin/prescriptions"
}
```

---

### 1.12 Admin — Orders — `/api/v2/admin/orders`

| Method | Path | Body | Returns |
|---|---|---|---|
| `GET` | `/admin/orders` | — | `AdminOrderRecord[]` |
| `POST` | `/admin/orders` | full order body | `AdminOrderRecord` |
| `PATCH` | `/admin/orders/:id` | `{ status?, notes?, trackingNumber? }` | `AdminOrderRecord` |
| `DELETE` | `/admin/orders` | — | Clears in-memory store (dev only) |

```jsonc
// AdminOrderRecord shape
{
  "id": "ord_001",
  "orderNumber": "SHX-AB12CD",
  "customerName": "Aisha Mwangi",
  "customerPhone": "0712345678",
  "customerEmail": "aisha@example.com",
  "items": [{ "name": "Panadol Extra", "qty": 2, "unitPrice": 250 }],
  "subtotal": 500,
  "deliveryFee": 150,
  "total": 650,
  "paymentMethod": "mpesa",
  "status": "confirmed",
  "notes": "",
  "trackingNumber": null,
  "placedAt": "2026-05-25T08:00:00.000Z"
}
```

---

### 1.13 Admin — Payments — `/api/v2/admin/payments`

| Method | Path | Query | Returns |
|---|---|---|---|
| `GET` | `/admin/payments` | `action=stats` | `{ totalRevenue, successCount, pendingCount }` |
| `GET` | `/admin/payments` | `action=transactions&method=mpesa` | `PaymentTransaction[]` |

---

### 1.14 Admin — CMS — `/api/v2/admin/cms`

Generic key-value document store. Backs every cmsStore collection in the storefront.

| Method | Path | Body | Returns |
|---|---|---|---|
| `GET` | `/admin/cms` | — | All `CmsEntry[]` (without `value` bodies) |
| `GET` | `/admin/cms/:key` | — | `{ key, value, version, updatedAt }` |
| `PUT` | `/admin/cms/:key` | `{ value: any }` | `{ key, version, updatedAt }` |
| `DELETE` | `/admin/cms/:key` | — | `204` |

**Known CMS keys used by the storefront:**

| Key | Contents |
|---|---|
| `categories` | Product category tree |
| `banners` | Hero / promo / navbar banner objects |
| `popup-offer` | Single popup offer configuration |
| `website-settings` | Brand, contact, social, SEO, commerce flags |
| `custom-pages` | CMS-authored pages (About, Policies, etc.) |
| `footer` | Footer columns and links |
| `audit-log` | Append-only log of every CMS write |
| `message-templates` | SMS / WhatsApp / Email templates |
| `sourcing-inventory` | Live stock snapshot by SKU |
| `sourcing-requests` | Auto-generated and manual refill requests |
| `sourcing-automation-rules` | Low-stock / expiry trigger rules |
| `sourcing-competitor-prices` | Competitor price data for margin computation |
| `trading-deals` | Trade deal pipeline records |
| `trading-bids` | Supplier quotes per deal |
| `trading-negotiations` | Counter-offer rounds |
| `trading-settlements` | PO / invoice matching and payment status |
| `qa.inventory` | QA check records per item |
| `qa.expiry-flags` | Batches within the expiry alert window |
| `logistics.deliveries` | Delivery records with rider assignment |
| `logistics.riders` | Rider profiles and availability |
| `communications.outbox` | Outbound message queue |

---

### 1.15 Admin — Pipeline Automation — `/api/v2/admin/pipeline`

On-demand automation triggers that read from cmsStore and write derived results back.

| Method | Path | Body | Returns | Effect |
|---|---|---|---|---|
| `GET` | `/admin/pipeline/status` | — | `{ pipelines: { name, lastRun, status }[] }` | Status of all pipelines |
| `POST` | `/admin/pipeline/sourcing/scan` | `{}` | `{ requestsCreated, itemsFlagged }` | Creates sourcing requests for below-safety-stock SKUs |
| `POST` | `/admin/pipeline/trading/recompute-margins` | `{}` | `{ itemsRepriced, recommendations[] }` | Refreshes margin recommendations from competitor data |
| `POST` | `/admin/pipeline/qa/scan-expiry` | `{}` | `{ flagged[], cleared[] }` | Flags batches within the configured expiry window |
| `POST` | `/admin/pipeline/logistics/auto-assign` | `{}` | `{ assigned, unassigned }` | Auto-assigns nearest available rider to pending deliveries |
| `POST` | `/admin/pipeline/communications/send` | `{ templateKey, audience, variables }` | `{ sent, failed }` | Resolves a template and dispatches via email (Resend) |
| `POST` | `/admin/pipeline/communications/preview` | `{ templateKey, variables }` | `{ subject, html, text }` | Renders a template without sending |

All pipeline endpoints are **idempotent** — running the same automation twice with the same upstream data yields the same result.

---

### 1.16 Admin — Catalog Import — `/api/v2/admin/catalog`

| Method | Path | Body | Returns |
|---|---|---|---|
| `POST` | `/admin/catalog/categories/import` | `{ categories: CmsCategory[] }` | `{ imported, skipped }` |
| `POST` | `/admin/catalog/products/import` | `{ products: ProductRow[] }` | `{ imported, errors[] }` |
| `POST` | `/admin/catalog/google-sheet` | `{ sheetUrl, tab? }` | `{ rows, products[] }` |
| `POST` | `/admin/catalog/scrape-url` | `{ url }` | `ProductRow` (extracted from JSON-LD / OG / HTML) |

The scraper endpoint extracts: title, description, price, images, brand, category, and availability from any publicly accessible product page.

---

### 1.17 Payments — PayHero (M-PESA) — `/api/payments/payhero/*`

Primary payment integration. **M-PESA STK Push for Kenya.** Lives in `api-server`. Requires `PAYHERO_BASIC_AUTH_TOKEN` (or `PAYHERO_API_USERNAME` + `PAYHERO_API_PASSWORD`) and `PAYHERO_CHANNEL_ID`.

#### `POST /api/payments/payhero/stk`

Initiates an M-PESA STK push.

```jsonc
// Request
{
  "orderNumber": "SHX-AB12CD",
  "phone": "0712345678",          // accepts 07…, 254…, +254…
  "amount": 1250,                 // integer KES
  "customerName": "Aisha Mwangi" // optional
}

// 200 OK
{
  "success": true,
  "reference": "PHR-abc123",
  "status": "pending"
}

// 503 — credentials missing
{ "error": "PayHero not configured", "hint": "Set PAYHERO_BASIC_AUTH_TOKEN and PAYHERO_CHANNEL_ID." }
```

#### `GET /api/payments/payhero/status?reference=PHR-abc123`

```jsonc
// 200 OK
{
  "reference": "PHR-abc123",
  "orderNumber": "SHX-AB12CD",
  "status": "success",           // "pending" | "success" | "failed" | "cancelled"
  "mpesaReceipt": "QGH7X8Y9Z2",
  "amount": 1250
}
```

#### `POST /api/payments/payhero/callback`

PayHero webhook. Verifies the request and updates the payment record. Returns `{ ok: true }`.

---

### 1.18 Monitoring — `/api/v2/monitoring`

Internal observability surface. Not for public consumption — accessed from `/admin/system/monitoring`.

| Method | Path | Body | Returns |
|---|---|---|---|
| `POST` | `/monitoring/events` | `{ type, message, stack?, metadata?, severity? }` | `{ id, fingerprint }` |
| `GET` | `/monitoring/events` | — | `MonitoringEvent[]` |
| `DELETE` | `/monitoring/events` | — | Clears store (dev only) |
| `GET` | `/monitoring/issues` | — | `Issue[]` (grouped by fingerprint) |
| `GET` | `/monitoring/issues/:fp` | — | `Issue` with all constituent events |
| `POST` | `/monitoring/issues/:fp/status` | `{ status: "open"\|"resolved"\|"ignored" }` | `Issue` |
| `GET` | `/monitoring/stats` | — | `{ total, byType, bySeverity, recentErrors }` |
| `GET` | `/monitoring/health` | — | `{ ok, errorRate, uptimeMs }` |
| `GET` | `/monitoring/config` | — | Current monitoring configuration |
| `PUT` | `/monitoring/config` | `{ retentionHours?, alertThreshold? }` | Updated config |

---

### 1.19 Email Notifications — `/api/v2/notifications/email`

Transactional email via Resend. Requires `RESEND_API_KEY`.

| Method | Path | Body | Returns |
|---|---|---|---|
| `GET` | `/notifications/email/status` | — | `{ configured: boolean, from: string\|null }` |
| `POST` | `/notifications/email/send` | see below | `{ id, status }` |

```jsonc
// POST /notifications/email/send body
{
  "to": "aisha@example.com",
  "subject": "Your prescription has been approved",
  "template": "prescription_approved",   // matches a cmsStore message-templates key
  "variables": {
    "customer_name": "Aisha",
    "prescription_number": "RX-001",
    "rx_status": "Approved"
  }
}
```

---

## 2. api-server — `/api/*` (legacy)

These routes remain active while their NestJS equivalents land.

| Method | Path | Status | Description |
|---|---|---|---|
| `POST` | `/api/orders` | **Active** | Create a customer order. Still used by storefront for COD and guest orders. |
| `GET` | `/api/orders/:orderNumber` | **Active** | Look up by order number (for the order-tracking page). |
| `POST` | `/api/payments/payhero/stk` | **Active** | M-PESA STK push (primary payment channel). |
| `GET` | `/api/payments/payhero/status` | **Active** | M-PESA payment status polling. |
| `POST` | `/api/payments/payhero/callback` | **Active** | PayHero settlement webhook. |
| `GET` | `/api/video/daily/token` | **Active** | Mints a Daily.co JWT for video consultations. Requires `DAILY_API_KEY`. |
| `*` | `/api/admin/*` | **Stubbed** | Legacy CMS read/write. Backed by a no-op stub (`legacy-store.ts`). Persist via `cmsStore` on the frontend instead. |

### Why the legacy server is still running

- `POST /api/orders` is still the primary order-creation path until the NestJS Orders module takes over.
- PayHero callbacks may still arrive for in-flight transactions.
- Hard cutover provides no benefit — each module ports incrementally.

---

## 3. Auth model

### Customer auth (Clerk)

- `<ClerkProvider>` wraps the storefront in `App.tsx`.
- Sign-in / sign-up at `/sign-in` and `/sign-up` (also `/account/login` and `/account/register`).
- Identifier accepts **username OR email** — the same input handles both.
- `<ProtectedAccount>` guards `/account/*` routes.

### Admin auth

- **Today:** hardcoded super-admin in `admin-shell.tsx`. All admin routes pass.
- **Phase 2:** real roles (`admin`, `pharmacist`, `doctor`) enforced in api-nest middleware. `ADMIN_API_TOKEN` gates `x-admin-token` access in production.

### Chat admin guard

The chat admin endpoints (`/chat/admin/*`) check `x-admin-token` or `Authorization: Bearer <token>` against `ADMIN_API_TOKEN`. In development (`NODE_ENV !== "production"`) all requests pass.

---

## 4. Environment variables

| Variable | Required? | Scope | Purpose |
|---|---|---|---|
| `DATABASE_URL` | Prod | api-* | Postgres connection string. |
| `PORT` | No | each artifact | Auto-assigned by Replit. Do not hard-code. |
| `PAYHERO_BASIC_AUTH_TOKEN` | Payments | api-server | Preferred auth for PayHero API. |
| `PAYHERO_CHANNEL_ID` | Payments | api-server | PayHero STK push channel. |
| `PAYHERO_CALLBACK_URL` | Payments | api-server | Public HTTPS URL for PayHero callbacks. |
| `PAYHERO_API_USERNAME` | Fallback | api-server | Used if `PAYHERO_BASIC_AUTH_TOKEN` is unset. |
| `PAYHERO_API_PASSWORD` | Fallback | api-server | Used if `PAYHERO_BASIC_AUTH_TOKEN` is unset. |
| `VITE_CLERK_PUBLISHABLE_KEY` | Yes | storefront | Clerk publishable key. |
| `CLERK_SECRET_KEY` | Yes | api-server | Clerk server key for `clerkMiddleware()`. |
| `ADMIN_API_TOKEN` | Optional (prod) | api-nest | Guards admin SSE and chat admin endpoints. |
| `DAILY_API_KEY` | Optional | api-server | Daily.co key for video consultation rooms. |
| `RESEND_API_KEY` | Phase 3 | api-nest | Transactional email. |
| `RESEND_FROM` | Phase 3 | api-nest | Sender address, e.g. `"Shaniid RX <no-reply@shaniidrx.com>"`. |

---

## 5. Error shapes & client retries

All errors follow the same shape:

```jsonc
{
  "error": "Short human message",
  "hint": "What the operator should do next",   // optional
  "status": 400,                                // mirrors HTTP status, optional
  "raw": { ... }                                // upstream error body, optional
}
```

**Client retry rules:**
- Surface `error` directly to the end user (written in customer-facing English).
- Surface `hint` to admins / operators.
- Treat `503` from `/payments/payhero/*` as "provider not configured" — offer COD as fallback.
- Retry transient `502`s up to twice with exponential back-off (200 ms, 800 ms).
- Never auto-retry `4xx` — they indicate input or auth problems.

---

## 6. Versioning policy

- `api-nest` lives at `/api/v2`. Breaking changes ship behind `/api/v3` (no need yet).
- `api-server` (`/api/*`) is frozen — bug fixes only, no new endpoints.
- Deprecations are announced in the release notes at least one sprint before removal.

---

## 7. Coming in Phase 2

| Path | Purpose |
|---|---|
| `GET/POST /api/v2/admin/users` | Staff user management (admin / pharmacist / doctor). |
| `PATCH /api/v2/admin/users/:id/role` | Assign or revoke a role. |
| `GET /api/v2/doctors` | Public directory of verified doctors. |
| `POST /api/v2/me/doctors/:id/book` | Book a consultation. Triggers payment before the video link is issued. |
| `GET /api/v2/doctors/me/patients` | Doctor's assigned-patient list. |
| `POST /api/v2/doctors/me/patients/:patientId/notes` | Sticky notes per patient. |
| `POST /api/v2/me/prescriptions/:id/purchase` | One-click buy of approved prescription items. Returns a receipt. |

---

For human-facing operations docs (set up the system, daily workflows, troubleshooting), see [`TRAINING_MANUAL.md`](./TRAINING_MANUAL.md).
For the database schema, see [`lib/db/schema.ts`](../../../../lib/db/schema.ts).
