# Shaniid RX — API Documentation

Complete reference for every HTTP endpoint exposed by the platform. Two backend services run side-by-side during the strangler migration:

- **`api-server`** — legacy Express server. Mounted at `/api`. Port 8080.
- **`api-nest`** — strangler-fig NestJS server. Mounted at `/api/v2`. Port 8090.

New work goes into `api-nest`. Legacy `/api` routes remain until a Nest module replaces each one.

---

## 0. Conventions

- All bodies are **JSON** (`Content-Type: application/json`).
- All responses are **JSON**, with errors shaped `{ error: string, hint?: string }`.
- All times are **ISO-8601 UTC** strings.
- All money values are **integer KES** (no decimals; no kobo on this side of the wire).
- Session is a `shaniidrx_sid` cookie on api-nest; api-server inherits from `clerkMiddleware()`.
- CORS is open (`origin: true, credentials: true`) on both services.

### Status codes

| Code | Meaning |
| ---- | ------- |
| 200 | OK |
| 201 | Created |
| 400 | Bad request (validation) |
| 401 | Not signed in / missing session |
| 403 | Signed in but lacks permission |
| 404 | Not found |
| 409 | Conflict (e.g. duplicate slug) |
| 422 | Semantic error (logic violation) |
| 502 | Upstream error (Paystack, Clerk, etc.) |
| 503 | Service unavailable (provider not configured) |

---

## 1. api-nest — `/api/v2/*`

### 1.1 Health

```
GET /api/v2/health
```
Returns `{ ok: true, name: "api-nest", time: ISO8601 }`. Use for uptime monitors.

### 1.2 Profile — `/api/v2/me`

| Method | Path | Body | Description |
| ------ | ---- | ---- | ----------- |
| `GET`  | `/me` | — | Returns the current session's profile (or a guest stub). |
| `PATCH`| `/me` | `{ fullName?, phone?, email?, photoUrl? }` | Update profile fields. |

### 1.3 Addresses — `/api/v2/me/addresses`

| Method | Path | Body | Description |
| ------ | ---- | ---- | ----------- |
| `GET`    | `/me/addresses` | — | List the session's saved addresses. |
| `POST`   | `/me/addresses` | `{ name, phone, line1, line2?, city, region, isDefault? }` | Create. |
| `PATCH`  | `/me/addresses/:id` | partial of above | Update. |
| `DELETE` | `/me/addresses/:id` | — | Delete. |

### 1.4 Wishlist — `/api/v2/me/wishlist`

| Method | Path | Body | Description |
| ------ | ---- | ---- | ----------- |
| `GET`    | `/me/wishlist` | — | Items the session has favourited. |
| `POST`   | `/me/wishlist` | `{ productSlug, name, image?, unitPrice }` | Add. |
| `DELETE` | `/me/wishlist/:productSlug` | — | Remove. |

### 1.5 Orders — `/api/v2/me/orders`

| Method | Path | Body | Description |
| ------ | ---- | ---- | ----------- |
| `GET`  | `/me/orders` | — | Most-recent-first list of the session's orders. |
| `GET`  | `/me/orders/:id` | — | Single order detail. |
| `POST` | `/me/orders` | `{ items[], deliveryFee?, paymentMethod, customer{}, shippingAddress{} }` | Create a pending order. |

### 1.6 Prescriptions — `/api/v2/me/prescriptions`

| Method | Path | Body | Description |
| ------ | ---- | ---- | ----------- |
| `GET`  | `/me/prescriptions` | — | Patient's uploaded prescriptions. |
| `POST` | `/me/prescriptions` | `{ uploadId, notes?, patientPhone? }` | Submit a prescription for review. Uses an `uploadId` returned by `/uploads`. |
| `GET`  | `/me/prescriptions/:id` | — | Detail incl. doctor decision (Phase 2). |

### 1.7 Uploads — `/api/v2/uploads`

| Method | Path | Body | Description |
| ------ | ---- | ---- | ----------- |
| `POST` | `/uploads` | `{ filename, mime, data (base64) }` (≤ 8 MB after b64) | Store a file, returns `{ id, url, expiresAt }`. URL is served from the same origin and requires the session cookie. |

### 1.8 Chat — `/api/v2/me/chat`

Lightweight transcript bridge between customer ↔ pharmacist. Backed by an in-memory store today.

| Method | Path | Body | Description |
| ------ | ---- | ---- | ----------- |
| `GET`  | `/me/chat/threads` | — | List the session's chat threads. |
| `GET`  | `/me/chat/threads/:id` | — | Get messages in a thread. |
| `POST` | `/me/chat/threads/:id/messages` | `{ text, attachmentUrl? }` | Append a message. |

### 1.9 Admin — `/api/v2/admin/*`

The admin namespace requires an admin session (today: hardcoded super-admin; Phase 2: real role check).

| Method | Path | Description |
| ------ | ---- | ----------- |
| `GET`  | `/admin/cms/:collection` | Read a CMS collection (banners, categories, popup-offer, website-settings, custom-pages, footer, audit-log, message-templates, **suppliers**, **clinics**, **logistics-partners**). |
| `PUT`  | `/admin/cms/:collection` | Replace an entire collection. |
| `GET`  | `/admin/orders` | All orders across customers. |
| `PATCH`| `/admin/orders/:id` | Update status, add notes. |
| `GET`  | `/admin/payments` | All Paystack transactions. |

### 1.10 Payments — Paystack — `/api/v2/payments/paystack/*`

The active payment integration. **M-PESA STK Push via Paystack mobile money for Kenya.** Env-gated by `PAYSTACK_SECRET_KEY`.

#### `GET /api/v2/payments/paystack/config`

Returns the public flag set so the client knows whether the integration is live.

```jsonc
// 200 OK
{
  "configured": true,
  "publicKey": "pk_test_…" // null if PAYSTACK_PUBLIC_KEY is unset
}
```

#### `POST /api/v2/payments/paystack/charge`

Initiates an M-PESA STK push.

```jsonc
// Request
{
  "orderNumber": "SHX-AB12CD",
  "phone": "0712345678",        // accepts 07…, 254…, +254…
  "amount": 1250,                // integer KES
  "email": "patient@example.com",// optional; defaults to "{phone}@shaniidrx.local"
  "customerName": "Aisha Mwangi" // optional, surfaces on the STK prompt
}

// 200 OK
{
  "success": true,
  "status": "pending",          // "pending" | "success" | "failed" | "cancelled"
  "reference": "psk_abc123",
  "publicKey": "pk_test_…" | null,
  "message": "STK push sent to your phone"
}

// 503 — provider not configured
{
  "error": "Payment provider not configured",
  "hint": "Set PAYSTACK_SECRET_KEY (and optionally PAYSTACK_PUBLIC_KEY, PAYSTACK_CALLBACK_URL) and restart the api-nest service."
}

// 400 — bad input
{ "error": "Enter a valid Safaricom number (e.g. 0712345678)" }

// 502 — Paystack rejected
{ "error": "Insufficient funds", "status": 400, "raw": { … } }
```

#### `GET /api/v2/payments/paystack/status?reference=psk_abc123`

Polls the current status. Either `reference` or `orderNumber` is required.

```jsonc
// 200 OK
{
  "reference": "psk_abc123",
  "orderNumber": "SHX-AB12CD",
  "phone": "254712345678",
  "amount": 1250,
  "currency": "KES",
  "status": "success",
  "mpesaReceipt": "QGH7X8Y9Z2",
  "message": "Approved",
  "createdAt": "2026-05-22T08:14:02.000Z",
  "updatedAt": "2026-05-22T08:14:48.000Z"
}

// 404 — unknown reference
{ "error": "Unknown payment reference" }
```

The status endpoint will **lazily call Paystack's `/transaction/verify`** while the record is still `pending`, so the storefront's poll loop is the only thing that needs to fire.

#### `POST /api/v2/payments/paystack/callback`

Paystack webhook. Verifies the `x-paystack-signature` header with HMAC-SHA512 using `PAYSTACK_SECRET_KEY`. Forged callbacks return 401 and never mutate state.

```jsonc
// Request body (subset)
{
  "event": "charge.success",
  "data": {
    "reference": "psk_abc123",
    "status": "success",
    "gateway_response": "Approved",
    "metadata": { "receipt_number": "QGH7X8Y9Z2" }
  }
}

// 200 OK
{ "ok": true }
```

### 1.11 Monitoring — `/api/v2/monitoring/*`

Internal health metrics. Not for public consumption — surfaced inside `/admin/system/monitoring`.

---

## 2. Partner Portal CMS Collections

Partner data (suppliers, clinics, logistics partners) is currently persisted via `cmsStore` in the browser. In Phase 2 this migrates to dedicated NestJS REST modules — the admin UI and portals will switch by updating a single import file.

The collections are accessed via `cmsStore("suppliers")`, `cmsStore("clinics")`, and `cmsStore("logistics-partners")`. Their schemas are documented below.

### 2.1 Suppliers — `cmsStore("suppliers")`

Each entry is a `Supplier` object:

```typescript
interface Supplier {
  id: string                    // uuid v4
  companyName: string
  email: string                 // unique; used for portal login
  portalCode: string            // "SUP-XXXX-XXXX"; used for portal login
  phone?: string
  address: string
  city: string
  country: string
  contactPerson?: string
  registrationNumber?: string
  taxId?: string                // KRA PIN
  status: "pending" | "verified" | "suspended" | "blacklisted"
  categories: SupplierCategory[]// e.g. ["generics", "medical_devices"]
  paymentTerms: string          // e.g. "Net 30"
  creditLimit: number           // integer KES
  // KYC flags
  hasLicense: boolean
  hasFdaCert: boolean
  hasInsurance: boolean
  kycNotes?: string
  // Performance (readonly — updated by ops)
  activePoCount: number
  totalPoValue: number
  onTimeDeliveryRate: number    // 0–100 %
  qualityScore: number          // 0–5
  createdAt: string             // ISO-8601
  updatedAt: string
}
```

**Portal authentication:** supplier visits `/portal/supplier`, enters their `email` (case-insensitive) and `portalCode` (case-insensitive). The frontend matches them against `cmsStore("suppliers")` — no server round-trip today. Phase 2 moves this check to `POST /api/v2/partners/suppliers/auth`.

**Portal code format:** `SUP-` followed by two groups of four uppercase alphanumerics, e.g. `SUP-AX4K-7RQ2`. Generated by the admin onboarding modal and shown once. Admin can copy it from the supplier drawer.

### 2.2 Clinics — `cmsStore("clinics")`

Each entry is a `Clinic` object:

```typescript
interface Clinic {
  id: string
  clinicName: string
  clinicType: "hospital" | "clinic" | "dispensary" | "nursing_home" | "specialist_centre"
  email: string                 // unique; used for portal login
  portalCode: string            // "CLN-XXXX-XXXX"
  phone?: string
  address: string
  town: string
  county: string
  licenseNumber?: string
  nhifNumber?: string           // NHIF / SHIF facility number
  medicalDirector?: string
  status: "pending_kyc" | "approved" | "suspended" | "rejected"
  tier: "standard" | "partner" | "preferred"
  creditLimit: number           // integer KES
  creditUsed: number            // integer KES; tracks outstanding balance
  paymentTerms: string
  specialties: string[]
  // KYC flags
  hasLicense: boolean
  hasNhifCert: boolean
  hasPinCert: boolean
  hasDirectorId: boolean
  // Bulk order summary (readonly — updated by ops)
  orderCount: number
  totalOrderValue: number
  createdAt: string
  updatedAt: string
}
```

**Portal authentication:** clinic visits `/portal/clinic`, enters `email` + `portalCode` (`CLN-XXXX-XXXX`).

**Trade on behalf:** Clinic staff use the **Place Order** tab to source medicines on behalf of patients. Each order line optionally records a patient name. The total is checked against `creditLimit - creditUsed` before submission. Clinics with `status !== "approved"` see a KYC-pending banner and cannot submit orders.

### 2.3 Logistics Partners — `cmsStore("logistics-partners")`

Each entry is a `LogisticsPartner` object:

```typescript
interface LogisticsPartner {
  id: string
  companyName: string
  email: string                 // unique; used for portal login
  portalCode: string            // "LOG-XXXX-XXXX"
  phone?: string
  address: string
  county: string
  registrationNumber?: string
  insuranceNumber?: string
  status: "pending" | "active" | "suspended" | "inactive"
  coverageCounties: string[]    // Kenyan county names
  vehicleTypes: VehicleType[]   // motorcycle | bicycle | tuktuk | van | cold_van | truck
  vehicles: LogisticsVehicle[]
  ratePerKm: number             // integer KES
  ratePerDelivery: number       // integer KES
  // KYC flags
  hasInsurance: boolean
  hasRegistration: boolean
  hasDriverLicenses: boolean
  hasSafetyTraining: boolean
  kycNotes?: string
  // Performance (readonly — updated by ops)
  activeDeliveries: number
  totalDeliveries: number
  onTimeRate: number            // 0–100 %
  successRate: number           // 0–100 %
  slaScore: number              // 0–5
  avgDeliveryTime: number       // minutes
  createdAt: string
  updatedAt: string
}

interface LogisticsVehicle {
  id: string
  plateNumber: string
  type: VehicleType
  driver?: string
  status: "available" | "on_delivery" | "maintenance" | "offline"
}
```

**Portal authentication:** logistics company visits `/portal/logistics`, enters `email` + `portalCode` (`LOG-XXXX-XXXX`).

### 2.4 Portal Session Schema

Portal sessions are stored in `localStorage["shaniidrx.portal.session"]`:

```typescript
interface PortalSession {
  portalType: "supplier" | "clinic" | "logistics"
  partnerId: string       // matches the id in the cmsStore record
  partnerName: string
  portalCode: string
  email: string
  loginAt: string         // ISO-8601
}
```

Helper functions in `src/lib/portal-auth.ts`:

| Function | Description |
| -------- | ----------- |
| `getPortalSession()` | Read current session from localStorage (or `null`). |
| `getPortalSessionForType(type)` | Read session only if `portalType` matches; returns `null` otherwise. |
| `setPortalSession(session)` | Persist a new session. |
| `clearPortalSession()` | Log out — removes the localStorage key. |

**Phase 2 migration path:** replace the localStorage check in each portal page with a call to `POST /api/v2/partners/:type/auth` (returns a JWT). The portal-auth helpers will be updated to use the JWT cookie; portal dashboards require no changes.

---

## 3. api-server — `/api/*` (legacy)

These routes are still in production but will be retired as their NestJS replacements land.

| Method | Path | Description | Status |
| ------ | ---- | ----------- | ------ |
| `POST` | `/api/orders` | Create a customer order (storefront still uses this for the pending-order step). | Active |
| `GET`  | `/api/orders/:orderNumber` | Lookup by order number. | Active |
| `POST` | `/api/payments/payhero/stk` | Legacy PayHero STK push. | **Deprecated** — replaced by Paystack. Endpoint stays for in-flight orders. |
| `GET`  | `/api/payments/payhero/status` | Legacy PayHero status. | **Deprecated**. |
| `POST` | `/api/payments/payhero/callback` | Legacy PayHero webhook. | **Deprecated**. |
| `*`    | `/api/admin/*` | Legacy CMS read/write endpoints. Most back onto a no-op stub now (`legacy-store.ts`). | **Stubbed** — persist via `cmsStore` on the frontend instead. |

### Why the legacy server is still running

- Some long-tail integrations still hit `POST /api/orders` directly.
- The PayHero callback may still arrive for transactions started before the Paystack cutover.
- We do not gain anything from a hard cutover. Each module ports in turn.

---

## 4. Auth model

### Customer auth (Clerk)

- Storefront wraps `<ClerkProvider>` in `App.tsx`.
- Sign-in / sign-up at `/sign-in` and `/sign-up`.
- Our branded `/account/login` uses Clerk's `useSignIn()` and accepts **username OR email** in the identifier field.
- `<ProtectedAccount>` guards `/account/*` routes.

### Admin auth

- **Today:** hardcoded super-admin (`admin-shell.tsx`). Bypasses all checks.
- **Phase 2:** real roles (`admin`, `pharmacist`, `doctor`, `customer`) enforced in api-nest middleware.

### Partner Portal auth

- **Today:** email + portal code matched client-side against `cmsStore`. Session stored in localStorage. No server round-trip.
- **Phase 2:** `POST /api/v2/partners/:type/auth` validates credentials server-side and returns a short-lived JWT cookie. The localStorage session is replaced transparently.
- Portal pages live at `/portal/supplier`, `/portal/clinic`, `/portal/logistics` — outside Clerk's `<ProtectedAccount>` wrapper. Partners never use Clerk.
- Suspended / blacklisted / rejected accounts are blocked at the login gate with a clear error message directing the partner to support.

### Server-to-server

No service-to-service tokens are issued today. When that's needed (Phase 3 notifications, webhook signature checks) we'll mint short-lived JWTs signed with `SERVER_INTERNAL_SECRET`.

---

## 5. Environment variables — exhaustive list

| Variable | Required? | Scope | Purpose |
| -------- | --------- | ----- | ------- |
| `DATABASE_URL` | Prod | api-* | Postgres connection string. |
| `PORT` | No | each artifact | Auto-assigned by Replit. |
| `PAYSTACK_SECRET_KEY` | Payments on | api-nest | Server-side Paystack key. |
| `PAYSTACK_PUBLIC_KEY` | Optional | api-nest | Public Paystack key (returned on `/charge`). |
| `PAYSTACK_CALLBACK_URL` | Optional | api-nest | Override the auto-derived webhook URL. |
| `PAYHERO_*` | **Deprecated** | api-server | Legacy. Kept until in-flight transactions settle. |
| `VITE_ENABLE_CARD_PAYMENTS` | Optional | storefront | `"true"` to surface card UI. Default hidden. |
| `VITE_CLERK_PUBLISHABLE_KEY` | Yes | storefront | Clerk client key. |
| `CLERK_SECRET_KEY` | Yes | api-server | Clerk server key. |
| `RESEND_API_KEY` | Phase 3 | api-nest | Transactional email. |
| `RESEND_FROM` | Phase 3 | api-nest | `"Shaniid RX <no-reply@shaniidrx.com>"`. |

---

## 6. Error shapes & client retries

Errors always look like:

```jsonc
{ "error": "Short human message", "hint"?: "What the operator should do next", "status"?: 400, "raw"?: { … } }
```

Clients should:

- Surface `error` verbatim to the end user (it is written in customer-facing English).
- Surface `hint` to admins/operators when present.
- Treat `503` from `/payments/paystack/*` as "provider not configured" and offer COD as fallback.
- Retry transient `502`s up to twice with backoff (200ms, 800ms).
- Never retry `4xx`s automatically — they indicate input or auth problems.

---

## 7. Versioning policy

- `api-nest` lives at `/api/v2`. Breaking changes ship behind `/api/v3` (no need yet).
- `api-server` (`/api/*`) is frozen — no new endpoints. Only bug fixes for in-flight features.
- Deprecations are announced in the release notes at least one release before removal.

---

## 8. Coming in Phase 2

### Customer & Doctor endpoints

| Path | Purpose |
| ---- | ------- |
| `/api/v2/admin/users` + `/api/v2/admin/users/:id/roles` | Roles & permissions CRUD. |
| `/api/v2/doctors` | Public directory of verified doctors. |
| `/api/v2/me/doctors/:id/book` | Book a consultation. Triggers a Paystack charge **before** the video link is issued. |
| `/api/v2/doctors/me/patients` | Doctor's assigned-patient list. |
| `/api/v2/doctors/me/patients/:patientId/notes` | Sticky notes on a patient. |
| `/api/v2/me/prescriptions/:id/purchase` | After doctor approval, the patient buys the prescribed items in one click. Returns a receipt. |

### Partner Portal endpoints (server-backed auth)

| Path | Method | Body / Params | Purpose |
| ---- | ------ | ------------- | ------- |
| `/api/v2/partners/suppliers/auth` | `POST` | `{ email, portalCode }` | Authenticate supplier — returns JWT cookie + supplier record. Replaces localStorage auth. |
| `/api/v2/partners/suppliers/me` | `GET` | — | Supplier's own profile (requires JWT). |
| `/api/v2/partners/suppliers/me/orders` | `GET` | — | Purchase orders addressed to this supplier. |
| `/api/v2/partners/clinics/auth` | `POST` | `{ email, portalCode }` | Authenticate clinic. |
| `/api/v2/partners/clinics/me` | `GET` | — | Clinic's own profile. |
| `/api/v2/partners/clinics/me/orders` | `POST` | `{ lines[], notes? }` | Place a bulk order on behalf of patients. |
| `/api/v2/partners/clinics/me/orders` | `GET` | — | Clinic's order history. |
| `/api/v2/partners/logistics/auth` | `POST` | `{ email, portalCode }` | Authenticate logistics partner. |
| `/api/v2/partners/logistics/me` | `GET` | — | Partner's own profile + fleet. |
| `/api/v2/partners/logistics/me/deliveries` | `GET` | — | Assigned deliveries (active + recent). |
| `/api/v2/partners/logistics/me/deliveries/:id/confirm` | `POST` | `{ receivedAt, notes? }` | Confirm a delivery completed. |

### Admin partner management endpoints

| Path | Method | Purpose |
| ---- | ------ | ------- |
| `/api/v2/admin/suppliers` | `GET` | List all suppliers with filters (status, category). |
| `/api/v2/admin/suppliers` | `POST` | Create a new supplier record + generate portal code. |
| `/api/v2/admin/suppliers/:id` | `GET` | Single supplier detail. |
| `/api/v2/admin/suppliers/:id` | `PATCH` | Update supplier fields, KYC flags, status. |
| `/api/v2/admin/suppliers/:id/kyc` | `POST` | Approve / reject KYC with reviewer notes. |
| `/api/v2/admin/clinics` | `GET` / `POST` | List / create clinics. |
| `/api/v2/admin/clinics/:id` | `GET` / `PATCH` | Read / update clinic. |
| `/api/v2/admin/clinics/:id/kyc` | `POST` | Approve / reject clinic KYC. |
| `/api/v2/admin/clinics/:id/credit` | `POST` | Adjust credit limit or record repayment. |
| `/api/v2/admin/logistics-partners` | `GET` / `POST` | List / create partners. |
| `/api/v2/admin/logistics-partners/:id` | `GET` / `PATCH` | Read / update partner. |
| `/api/v2/admin/logistics-partners/:id/vehicles` | `POST` | Add a vehicle to partner's fleet. |
| `/api/v2/admin/logistics-partners/:id/vehicles/:vehicleId` | `PATCH` | Update vehicle status. |

---

## 9. Coming in Phase 3

| Path | Purpose |
| ---- | ------- |
| `/api/v2/notifications` | List in-app alerts for the current session/admin. |
| `/api/v2/notifications/:id/read` | Mark read. |
| `/api/v2/support/tickets` | Customer creates a support ticket. |
| `/api/v2/support/tickets/:id/messages` | Reply thread. |
| `/api/v2/admin/support/tickets` | Admin view of every ticket. |

---

For human-facing operations docs (set up the system, daily workflows, troubleshooting), see [`TRAINING_MANUAL.md`](./TRAINING_MANUAL.md).
