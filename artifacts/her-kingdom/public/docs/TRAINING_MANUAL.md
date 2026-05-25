# Shaniid RX — Training Manual

A practical, end-to-end walkthrough for setting up, running, and operating Shaniid RX. Written for the team that will install the software, configure suppliers and pharmacies, manage day-to-day storefront/admin work, and hand off to support.

> **Audience:** non-technical operators, store managers, pharmacists, doctors, and the on-call developer who configures the environment for the first time.
> **Last updated:** May 2026.

---

## 1. What Shaniid RX is

Shaniid RX is the trust layer for medicine distribution in East Africa. It is composed of:

- **Storefront** — the public catalogue, prescription upload, doctor consultation booking, and customer accounts.
- **Admin** — the back-office for products, banners, categories, orders, payments, prescriptions, marketing, sourcing, trading, QA, logistics, and CMS.
- **APIs** — two backend services: the legacy `api-server` (Express, `/api`) and the strangler-fig `api-nest` (NestJS, `/api/v2`) that is progressively taking over.

The product promise is non-negotiable: **"If it comes through Shaniid RX, it is genuine, fairly priced, and delivered with integrity."**

---

## 2. System architecture

```
                       ┌────────────────────────────────────┐
                       │       Storefront / Admin           │  Vite + React + wouter
                       │    artifacts/her-kingdom           │  port from $PORT env var
                       └───────────────┬────────────────────┘
                                       │
                    ┌──────────────────┴───────────────────┐
                    │                                       │
           /api  (proxy)                          /api/v2  (proxy)
                    │                                       │
        ┌───────────▼──────────┐            ┌──────────────▼──────────┐
        │  api-server (Express)│            │  api-nest (NestJS 11)   │
        │  port 8080           │            │  port 8090              │
        │  legacy catalog +    │            │  customer account, chat,│
        │  PayHero STK (QA)    │            │  prescriptions, payments│
        └──────────────────────┘            │  notifications, pipeline│
                                            └─────────────────────────┘
                                                         │
                                              ┌──────────▼───────────┐
                                              │  PostgreSQL 16       │
                                              │  (Drizzle ORM)       │
                                              │  In-memory today;    │
                                              │  run `db push` for   │
                                              │  production          │
                                              └──────────────────────┘
```

Two backends run side-by-side so the storefront keeps working while modules port over. `api-nest` is the destination for all new development.

---

## 3. Prerequisites

- **Node.js 24+** and **pnpm 9+** on the host.
- **PostgreSQL 16+** reachable via `DATABASE_URL` for production. For development, all services fall back to in-memory stores.
- **A Clerk tenant** for customer authentication. Replit-managed Clerk is the default — no dashboard configuration is needed to start in dev.
- **A PayHero account** (for M-PESA STK Push — primary payment channel). Credentials via environment secrets (see §4.2).
- **(Optional) A Resend account** for transactional email (receipts, prescription approvals). Phase 3.

---

## 4. First-time setup — from zero to running

### 4.1 Clone & install

```bash
git clone <repo-url> shaniidrx
cd shaniidrx
pnpm install
```

### 4.2 Configure environment

Create `.env.local` at the repo root (or set secrets through your hosting provider — on Replit, use the **Secrets** pane in the sidebar):

| Variable | Required? | Scope | Purpose |
|---|---|---|---|
| `DATABASE_URL` | Yes (prod) | api-* | Postgres connection string — `postgres://user:pass@host:5432/db`. |
| `PAYHERO_BASIC_AUTH_TOKEN` | Yes (payments) | api-server | Base64 `user:pass` for PayHero API. |
| `PAYHERO_CHANNEL_ID` | Yes (payments) | api-server | PayHero channel identifier for STK push. |
| `PAYHERO_CALLBACK_URL` | Yes (payments) | api-server | Public HTTPS URL PayHero will POST status updates to. |
| `PAYHERO_API_USERNAME` | Fallback | api-server | Used if `PAYHERO_BASIC_AUTH_TOKEN` is not set. |
| `PAYHERO_API_PASSWORD` | Fallback | api-server | Used if `PAYHERO_BASIC_AUTH_TOKEN` is not set. |
| `VITE_CLERK_PUBLISHABLE_KEY` | Yes | storefront | Clerk publishable key (`pk_test_…` / `pk_live_…`). |
| `CLERK_SECRET_KEY` | Yes | api-server | Clerk server key (`sk_test_…` / `sk_live_…`). |
| `ADMIN_API_TOKEN` | Optional (prod) | api-nest | Tokens prefixed with `x-admin-token` header. In dev, all requests pass. |
| `DAILY_API_KEY` | Optional | api-nest | Daily.co API key for video consultation rooms. |
| `RESEND_API_KEY` | Phase 3 | api-nest | Transactional email via Resend. |
| `RESEND_FROM` | Phase 3 | api-nest | Sender address, e.g. `"Shaniid RX <no-reply@shaniidrx.com>"`. |

> **Never** commit `.env*` files to source control. On Replit, use the Secrets pane exclusively.

### 4.3 Push the database schema (production / staging only)

```bash
pnpm --filter @workspace/db run push
```

This applies all Drizzle migrations to the `DATABASE_URL` you configured. Skip for local development — all services run in-memory by default.

See `lib/db/schema.ts` for the complete database schema.

### 4.4 Run everything in development

Three workflows are pre-configured in Replit. To run manually:

```bash
# Terminal 1
pnpm --filter @workspace/api-server  run dev    # Express — http://localhost:8080

# Terminal 2
pnpm --filter @workspace/api-nest    run dev    # NestJS — http://localhost:8090

# Terminal 3
pnpm --filter @workspace/her-kingdom run dev    # Vite — http://localhost:$PORT
```

The storefront Vite dev server proxies `/api/*` → `api-server` and `/api/v2/*` → `api-nest`. Both backends must be running for full functionality.

### 4.5 Smoke-test in 5 minutes

1. **Homepage** — open the printed Vite URL, confirm the catalogue loads.
2. **Add to cart → Checkout** — select M-PESA, enter a test Safaricom number, confirm the STK modal appears.
3. **Sign up** at `/sign-up` with email + password → confirm you land on `/account/dashboard`.
4. **Open admin** at `/admin` → confirm the dashboard renders with KPIs.
5. **Upload a prescription** at `/upload-prescription` → confirm the success screen appears.

All five passing = healthy installation.

---

## 5. Daily operations — admin walkthrough

### 5.1 Dashboard (`/admin`)

KPI cards: Revenue (today / 7d / 30d), Orders, Prescriptions pending, Active doctors. Sparklines show trends. Low-stock alerts appear inline.

### 5.2 Catalogue

**`/admin/catalog/products`**
- **Add product** → fill title, slug, price, stock, images, category, tags. Toggle `Featured` to promote on the home grid.
- **Bulk import** → CSV or Google Sheet URL. Validates before committing. Download a sample template from the page.
- **URL scrape** → paste a supplier or competitor product URL → the system extracts title, description, price, and images automatically.
- **Bulk delete** → deletes the selected products. Confirm before proceeding — this is permanent.

**`/admin/catalog/categories`**
Tree editor. Drag to reorder, nest up to three levels deep. Each category supports its own SEO meta (title, description, canonical).

### 5.3 Sales & Orders (`/admin/orders`)

Shows the full order funnel: `pending`, `confirmed`, `processing`, `shipped`, `delivered`, `cancelled`.

To advance an order: click the row → select the new status → optionally enter a tracking note → **Save**.

Customers see their status update live in `/account/orders`.

### 5.4 Payments (`/admin/payments`)

Displays every M-PESA transaction. Columns: order number, customer phone, amount, status (pending / success / failed), M-PESA receipt code.

> **If a customer reports "I paid but my order is still pending"** — search by phone number here first. If the receipt is visible, click into the order and manually mark it confirmed.

### 5.5 Prescriptions (`/admin/prescriptions`)

New prescription uploads arrive here in real time — an alert notification fires to both the **admin** and **pharmacist** audiences the moment a patient submits.

Click any row to:
- **View** the uploaded image(s).
- **Approve** with pharmacist notes. The patient is notified via their account.
- **Request more info** — adds a comment thread.
- **Reject** — patient is notified.

### 5.6 Consultations (`/admin/consultations`)

Booked consultations. When a patient completes payment for a consultation, the **doctor** audience receives an alert notification immediately. Clicking a row shows the consultation type, specialty, payment receipt, and assigned doctor (Phase 2).

### 5.7 Doctors panel (`/admin/doctors`)

List of verified doctors — name, specialty, availability flag, consultation fee. Edit a doctor's profile, adjust their fee, or toggle them active/inactive.

> Doctors log in via the same `/sign-in` route as customers. Their Clerk user ID is linked to their doctor record by the admin.

### 5.8 Notifications (`/admin/system/notifications`)

The bell icon in the header shows unread counts. Every new prescription, consultation payment, order, or system event fires a notification to the relevant audience (`admin`, `doctor`, `pharmacist`). Click **Mark all read** to clear.

### 5.9 Marketing

**`/admin/marketing/banners`** — hero / promo / navbar banner slots. Live preview on the right. Banners support image + title + CTA link.

**`/admin/marketing/popup-offer`** — a single timed popup (e.g. "10% off your first order"). Toggle `active` to show/hide. Only one popup can be active at a time.

**`/admin/integrations/templates`** — SMS / WhatsApp / Email message templates with `{{token}}` interpolation. Available tokens: `customer_name`, `order_number`, `total`, `tracking_url`, `prescription_number`, `appointment_time`, `doctor_name`, `rx_status`. A sample preview renders inline.

### 5.10 CMS

**`/admin/cms/pages`** — author custom pages (About, Policies, FAQs). Each page gets `/pages/{slug}` on the storefront. Supports Markdown with rich previewing.

**`/admin/cms/footer`** — reorder columns and links in the footer. Changes go live immediately.

### 5.11 Website Settings (`/admin/settings`)

Brand name, logo, contact info, social handles, SEO defaults, commerce flags (free-shipping threshold, COD enabled), and business hours. All changes are live immediately on the storefront.

### 5.12 Audit Log (`/admin/system/audit`)

Every CMS write (product change, banner update, settings edit) is auto-captured here with user, module, action, and timestamp. Filter by module or date range. Non-destructive — read only.

### 5.13 Sourcing Pipeline (`/admin/sourcing/*`)

Five sub-sections manage the buy side:

| Sub-section | What it does |
|---|---|
| **Inventory** | Live stock snapshot by SKU. Safety stock and reorder levels. |
| **Demand Forecast** | Historical consumption + trend to predict reorder quantities. |
| **Pricing & Competitors** | Competitor price tracking. Recommended margin floor computed. |
| **Automation Rules** | Trigger-based auto-creation of sourcing requests (low stock, expiry window, forecast breach). |
| **Supplier Performance** | Scorecard per supplier: on-time rate, defect rate, price variance. |

### 5.14 Trading Pipeline (`/admin/trading/*`)

Four fully functional sub-sections manage the deal lifecycle:

| Sub-section | What it does |
|---|---|
| **Deal Pipeline** | Create and advance trade deals through `open → bidding → awarded → settled`. KPI counts per stage. |
| **Bids & Quotes** | Add supplier quotes per deal. Lowest-price badge highlights best offer. Shortlist, award, or reject each quote. |
| **Price Negotiation** | Two-round counter-offer workspace. Flags when counter-offer falls below your margin floor. Accept / reject / expire each round. |
| **Settlements** | Track POs vs invoices. 3-way match with variance alert (> 2%). Inline payment status (unpaid / paid / overdue). Running totals for financial overview. |

All data persists in `cmsStore` (localStorage today, NestJS-backed once the Trading module ports).

### 5.15 QA & Assurance (`/admin/qa/*`)

| Sub-section | Purpose |
|---|---|
| **Stock & Dispatch QA** | Per-item quality checks before dispatch. Pass/fail with photo evidence. |
| **Batch Verification** | Lot # + expiry + CoA file. QR / blockchain anchor for end-customer verification. |
| **Trust Seal Registry** | Verified medicines carry the Shaniid RX shield on the PDP. Issue / revoke seals. |
| **Recalls & Compliance** | Regulator or supplier recalls. Notifies customers automatically via comms templates. |

### 5.16 Logistics (`/admin/logistics/*`)

| Sub-section | Purpose |
|---|---|
| **Operations** | Live rider map. Assign deliveries, track ETAs, resolve exceptions. |
| **Inventory Optimization** | Min/max levels, ABC classification. Pushes reorder alerts to Sourcing. |
| **Lead Time Monitoring** | Promised vs actual lead times per supplier. Variance penalties feed the supplier scorecard. |
| **Retail Emergency Fallback** | When stock runs out, match to the nearest verified retail pharmacy partner. |

### 5.17 Live Chat (`/admin/chat`)

Real-time support chat between customers and pharmacy staff. New messages appear immediately via SSE. Reply from the admin thread view. Unread counts shown on the sidebar badge.

### 5.18 Support Tickets (`/admin/support`)

Customer-initiated support tickets (from `/contact` or `/account/support`). Each ticket is a multi-turn thread. Change status: `open → pending → resolved → closed`. Resolved tickets auto-notify the customer.

---

## 6. Customer-facing flows

### 6.1 Browse → buy

`/` → `/shop` → `/product/:slug` → **Add to cart** → cart drawer → **Checkout** (3 steps: Address → Delivery → Payment) → M-PESA STK push → success receipt screen.

Checkout supports:
- **M-PESA** (PayHero STK push, default)
- **Credit / Debit Card** (always visible)
- **Cash on Delivery**

### 6.2 Upload a prescription

`/upload-prescription` — drag-and-drop images (JPEG / PNG / PDF), enter recipient name and notes, submit. Progress bar shows upload status. On success the patient lands on a confirmation screen with their RX number.

The prescription appears in `/admin/prescriptions` immediately with an alert to the pharmacist.

### 6.3 Speak to a doctor

`/speak-to-a-doctor` — choose consultation type (Chat or Call/Video), pick a specialty, review doctor cards and fee. **Payment is required before the session opens.** After successful M-PESA payment, the system connects the patient to a doctor and fires an alert to the doctor audience.

### 6.4 Account dashboard (`/account`)

Requires Clerk sign-in. Shows:
- **Orders** — status timeline, re-order button.
- **Prescriptions** — list of submitted RXs with pharmacist decision status.
- **Addresses** — saved delivery addresses (CRUD).
- **Wishlist** — saved products.
- **Support** — open support tickets with reply thread.
- **Settings** — name, phone, email, notification preferences.

### 6.5 Sign-in / sign-up

- `/sign-in` — email **or** username + password, plus Google OAuth.
- `/sign-up` — phone, email, password, name, newsletter opt-in.

**Guest checkout is preserved** — `/checkout` does not require an account.

---

## 7. Roles & access

**Current (May 2026):**

| Role | Access |
|---|---|
| **Customer** (Clerk auth) | Browse, buy, own orders + prescriptions + wishlist + chat. |
| **Local super-admin** | Full admin access. Hardcoded in `admin-shell.tsx` until NestJS auth lands. |

**Planned (Phase 2):**

| Role | Permissions |
|---|---|
| `admin` | Everything. |
| `pharmacist` | Orders, prescriptions, inventory, chat (staff side). |
| `doctor` | Own consultations, prescription approvals, sticky patient notes. |
| `customer` | Default for new sign-ups. |

Roles will be assigned from `/admin/system/users` and enforced by middleware in `api-nest`. Doctor audience notifications already route to this role.

---

## 8. Payments — PayHero (M-PESA STK Push)

Shaniid RX uses **PayHero** for M-PESA STK Push payments in Kenya. The integration lives in `api-server`:

- `POST /api/payments/payhero/stk` — initiates the STK push. Returns a `reference`.
- `GET  /api/payments/payhero/status?reference=…` — polls payment status.
- `POST /api/payments/payhero/callback` — PayHero posts settlement events here.

### Configuring the PayHero webhook

1. Log in to your PayHero dashboard → **Settings → Webhooks**.
2. Set the callback URL to `https://<your-host>/api/payments/payhero/callback`.
3. Copy your **Basic Auth token** (base64 of `username:password`) and your **Channel ID** into the Secrets pane.

### Card payments

Card payment UI is always visible. The handler routes to a Paystack-backed card tokenisation flow. No additional configuration is needed to test — the modal appears immediately.

---

## 9. Authentication — Clerk

The storefront uses **Clerk** for customer authentication. ClerkProvider wraps the app in `App.tsx`.

| Route | Behavior |
|---|---|
| `/sign-in` | Clerk-hosted sign-in form (branded wine / orange). Accepts email or username. |
| `/sign-up` | Clerk-hosted registration form. |
| `/account/login` | Our own branded form (same result — uses `useSignIn()`). |
| `/account/*` | Protected via `<ProtectedAccount>`. Redirects unsigned users to `/sign-in`. |
| `/checkout` | Guest-allowed. No sign-in required. |

**Username support:** both `/sign-in` and `/account/login` accept username OR email in the identifier field. Enable the username field in your Clerk dashboard under **User & Authentication → Email, Phone, Username**.

**Google sign-in:** works once you enable the Google OAuth provider in the Clerk dashboard → **Social Connections**.

---

## 10. Notification system

An in-app notification system connects customer actions to the right staff:

| Event | Notified audiences |
|---|---|
| Prescription submitted | `admin` (info) + `pharmacist` (alert) |
| Consultation payment confirmed | `doctor` (alert) + `admin` (info) |
| New support ticket | `admin` (info) |
| Low stock detected | `admin` (warning) |

Notifications are surfaced via the bell icon in the admin header. Staff see a live count of unread items and a dropdown with the latest alerts. Clicking an alert navigates to the relevant admin module.

**Sending a notification programmatically:**

```
POST /api/v2/admin/notifications
Body: { audience, module, level, title, body, href }
```

---

## 11. Pipeline automation

Five automated pipelines run on demand (manual trigger from the admin, or via a cron job hitting the API):

| Pipeline | Endpoint | What it does |
|---|---|---|
| Sourcing scan | `POST /api/v2/admin/pipeline/sourcing/scan` | Checks inventory + forecast rules, creates sourcing requests for anything below safety stock. |
| Trading margins | `POST /api/v2/admin/pipeline/trading/recompute-margins` | Re-prices recommended margins against the latest competitor data. |
| QA expiry | `POST /api/v2/admin/pipeline/qa/scan-expiry` | Flags any batch within the configured expiry window. |
| Logistics assign | `POST /api/v2/admin/pipeline/logistics/auto-assign` | Auto-assigns the nearest available rider to pending deliveries. |
| Communications | `POST /api/v2/admin/pipeline/communications/send` | Resolves a message template and dispatches via email (Resend). |

All endpoints are idempotent — running twice with the same upstream data produces the same result.

---

## 12. SEO

Every user-facing page renders the `<Seo>` component from `@/components/seo` with at minimum:

- `title` — page title (≤ 60 chars).
- `description` — meta description (≤ 160 chars).
- `canonicalPath` — canonical URL path (without origin).

JSON-LD helpers (`organizationJsonLd`, `websiteJsonLd`, `breadcrumbJsonLd`, `faqJsonLd`, `productJsonLd`) are used on PDPs, FAQ, and landing pages.

Admin pages are always `noindex`. Page-level overrides are passed via the `noindex` boolean prop on `<Seo>`.

---

## 13. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Storefront blank, no requests | Vite dev not running or wrong `PORT` | Restart the `her-kingdom` workflow. |
| M-PESA STK push shows "provider not configured" | `PAYHERO_BASIC_AUTH_TOKEN` or `PAYHERO_CHANNEL_ID` missing | Set both secrets and restart api-server. |
| Sign-in throws "first_name is not a valid parameter" | firstName not enabled on Clerk instance | Enable the field under Clerk dashboard → User & Authentication. |
| Admin shows empty data on a legacy route | api-server uses the no-op `legacy-store.ts` stub | Expected. Persist via `cmsStore` on the frontend instead. |
| Prescription image fails to load | Missing session cookie | Sign in again or re-visit `/account`. |
| Bulk product update wiped variations | Full-replace `PUT /api/admin/products` called on stale data | Use the per-row **Set qty** flow for bulk stock changes only. |
| Notification bell shows stale count | Browser tab was in the background during SSE reconnect | Hard-refresh or navigate away and back. |
| Chat messages not appearing in real time | SSE connection dropped | The client auto-reconnects — wait 3 s, or reload. |
| `[api-nest]` fails to start | Missing NestJS dependency or TS error | Run `pnpm --filter @workspace/api-nest run build` and check the output. |
| `pnpm --filter @workspace/db run push` fails | `DATABASE_URL` not set | Export `DATABASE_URL` in your shell or set the Replit secret. |

---

## 14. Going to production

1. Set all required secrets: `DATABASE_URL`, `PAYHERO_*`, `CLERK_*`.
2. Run `pnpm run build` — this type-checks and bundles all apps.
3. Run `pnpm --filter @workspace/db run push` — applies the schema to Postgres.
4. Deploy via Replit's deployment panel — handles TLS, custom domains, and autoscaling.
5. Set your PayHero webhook URL: `https://<your-domain>/api/payments/payhero/callback`.
6. Smoke-test the customer flow: browse → add to cart → M-PESA → success.
7. Hand a 10-minute walkthrough to your operations team using this document.

---

## 15. Where to ask for help

| Topic | Where |
|---|---|
| Replit deployment / hosting | Replit support inside the workspace |
| PayHero integration | PayHero dashboard → Support, or the PayHero developer docs |
| Clerk auth | `dashboard.clerk.com/help` |
| Codebase questions | `API_DOCUMENTATION.md` → then ping the on-call developer |
| Database schema | `lib/db/schema.ts` — fully annotated Drizzle schema |
