# Shaniid RX — Training Manual

A practical, end-to-end walkthrough for setting up, running, and operating Shaniid RX. Written for the team that will install the software, configure suppliers and pharmacies, manage day-to-day storefront/admin work, and hand off to support.

> **Audience:** non-technical operators, store managers, pharmacists, and the on-call developer who configures the environment for the first time.
> **Last updated:** May 2026.

---

## 1. What Shaniid RX is

Shaniid RX is the trust layer for medicine distribution in East Africa. It is composed of:

- **Storefront** — the public catalogue, prescription upload, doctor consultation booking, and customer accounts.
- **Admin** — the back-office for products, banners, categories, orders, payments, prescriptions, marketing, sourcing, and CMS.
- **APIs** — the two backend services that power the storefront and admin: the legacy `api-server` (Express) and the strangler-fig `api-nest` (NestJS) that is gradually taking over.

The product promise is non-negotiable: **"If it comes through Shaniid RX, it is genuine, fairly priced, and delivered with integrity."**

---

## 2. System architecture (one screen)

```
                       ┌────────────────────────────┐
                       │      Storefront / Admin    │   (Vite + React + wouter)
                       │  artifacts/her-kingdom     │
                       └─────────────┬──────────────┘
                                     │ /api  + /api/v2
                                     ▼
        ┌──────────────────────┐            ┌──────────────────────┐
        │  api-server (Express)│            │  api-nest (NestJS)   │
        │  /api/*              │            │  /api/v2/*           │
        │  legacy + payments   │            │  user account, KYC,  │
        │  + admin reads       │            │  payments, prescr.,  │
        │  port 8080           │            │  uploads, chat       │
        └──────────────────────┘            └──────────────────────┘
                                     │
                                     ▼
                              ┌──────────────┐
                              │ Postgres /   │  (Drizzle)
                              │ In-memory    │  (today, until Postgres swap)
                              └──────────────┘
```

Two backends run side-by-side so the storefront keeps working while modules port over. Eventually `api-nest` owns everything and `api-server` is removed.

---

## 3. Prerequisites

- **Node.js 24+** and **pnpm 9+** on the host.
- **PostgreSQL 15+** reachable via `DATABASE_URL` for production. For development, in-memory stores are fine.
- **A Clerk tenant** (for customer authentication). Replit-managed Clerk is the default — no dashboard configuration is required to start.
- **A Paystack account** (for M-PESA STK Push payments). Test keys are fine to start.
- **(Optional) A Resend account** for transactional email (verification, prescription approvals, receipts). Phase 3.

---

## 4. First-time setup — from zero to running

### 4.1 Clone & install

```bash
git clone <repo-url> shaniidrx
cd shaniidrx
pnpm install
```

### 4.2 Configure environment

Create `.env.local` at the repo root (or set the secrets through your hosting provider). The minimum required entries:

| Variable | Required? | Purpose |
| -------- | --------- | ------- |
| `DATABASE_URL` | Yes (prod) | Postgres connection string. |
| `PAYSTACK_SECRET_KEY` | Yes for payments | Server-side Paystack key (`sk_test_…` / `sk_live_…`). |
| `PAYSTACK_PUBLIC_KEY` | Recommended | Surfaced on `/charge` response for client-side use. |
| `PAYSTACK_CALLBACK_URL` | Optional | Public webhook URL. Defaults to `{host}/api/v2/payments/paystack/callback`. |
| `VITE_ENABLE_CARD_PAYMENTS` | Optional | `true` to surface card payment UI. Default hidden. |
| `RESEND_API_KEY` | Phase 3 | Transactional email. |
| `VITE_CLERK_PUBLISHABLE_KEY` | Yes | Storefront Clerk key. |
| `CLERK_SECRET_KEY` | Yes | Server Clerk key. |

> **Never** commit `.env*` files. On Replit, use the Secrets pane.

### 4.3 Push the database schema (production / staging only)

```bash
pnpm --filter @workspace/db run push
```

This applies all Drizzle migrations to `DATABASE_URL`. Skip for local dev — the apps work in-memory.

### 4.4 Run everything in dev

Open three terminals (or three Replit workflows — already configured):

```bash
pnpm --filter @workspace/api-server  run dev    # http://localhost:8080
pnpm --filter @workspace/api-nest    run dev    # http://localhost:8090
pnpm --filter @workspace/her-kingdom run dev    # http://localhost:5173 (Vite)
```

The storefront proxies `/api/*` to api-server and `/api/v2/*` to api-nest. You should see:

- `[api-server]` log line on 8080
- `[api-nest] listening on :8090 (prefix /api/v2)` on 8090
- Vite dev URL printed on its workflow

Open the printed Vite URL and you should land on the homepage.

### 4.5 Smoke-test in 5 minutes

1. **Browse a product** — click any card on the homepage, confirm the PDP loads.
2. **Add to cart** → checkout → choose **M-PESA** → enter your test phone (`07XX…`) → confirm the Paystack STK modal appears and reports an error if `PAYSTACK_SECRET_KEY` is unset (this is intentional, friendly behavior).
3. **Sign up** at `/sign-up` with email + password → confirm you land at `/account`.
4. **Open the admin** at `/admin` → log in as the local super-admin (hardcoded for now) → confirm the dashboard renders KPIs.

If all four pass, your installation is healthy.

---

## 5. Daily operations — admin walkthrough

### 5.1 Catalogue

`/admin/catalog/products`
- **Add product** → fill title, slug, price, stock, images, category. Set `Featured` to surface on the home grid.
- **Bulk import** → CSV with the documented columns (download a sample from the page). Validates before commit.
- **Bulk delete** → only soft-deletes; recoverable for 30 days.

`/admin/catalog/categories`
- Tree editor. Drag to reorder, click to nest. Each category can have its own SEO meta (title + description).

### 5.2 Sales & Orders

`/admin/sales` shows confirmed sales (paid).
`/admin/orders` shows the entire funnel including `pending`, `cancelled`, `fulfilled`.

To mark an order fulfilled: click the row → **Mark fulfilled** → enter tracking note → save. Customers see the status change inside `/account/orders`.

### 5.3 Payments

`/admin/payments` shows every M-PESA transaction (via Paystack). When `VITE_ENABLE_CARD_PAYMENTS=true`, a second tab surfaces the card payments. Each row links back to the order.

> If a customer reports "I paid but my order is still pending", search by **M-PESA receipt** here first. The receipt comes back from Paystack on successful charge and is also written to the order record.

### 5.4 Prescriptions

`/admin/prescriptions` — patients upload scans at `/upload-prescription`. Each upload lands here as **pending review**. Click to view the image, then **Approve** (with notes), **Request more info**, or **Reject**.

Phase 2 wires this into the doctor panel and a per-patient "Buy this prescription" purchase flow.

### 5.5 Banners + popup + footer + custom pages

`/admin/marketing/banners` — hero / promo / navbar slots. Live preview on the right.
`/admin/marketing/popup-offer` — one popup at a time. Set `active=false` to disable.
`/admin/cms/pages` — author about pages, policies, etc. Each page gets `/pages/{slug}`.
`/admin/cms/footer` — re-order columns, edit links.

All of the above persist via `cmsStore` (browser-local today, NestJS later).

### 5.6 Website settings

`/admin/settings` — brand colors, contact info, social handles, SEO defaults, commerce flags (free-shipping threshold, COD enabled, etc.), business hours.

Anything edited here goes live immediately on the storefront.

### 5.7 Marketing — message templates

`/admin/integrations/templates` — SMS / WhatsApp / Email templates with `{{token}}` interpolation. Variables include `customer_name`, `order_number`, `total`, `tracking_url`, `prescription_number`, `appointment_time`. Sample preview rendered inline.

### 5.8 Audit log

Every `cmsStore` write is auto-captured. View at `/admin/system/audit`. Filter by user, module, date.

---

## 6. Customer-facing flows (what the user actually sees)

### 6.1 Browse → buy

`/` → `/shop` → `/product/:slug` → **Add to cart** → cart drawer → **Checkout** → 3-step form (Address → Delivery → Payment) → M-PESA STK → success receipt screen.

### 6.2 Upload a prescription

`/upload-prescription` — drag-and-drop image, enter notes, submit. Upload lands in admin queue. Customer sees status updates inside `/account/prescriptions`.

### 6.3 Speak to a doctor

`/speak-to-a-doctor` — pick a specialty, see available doctors (Phase 2 surfaces the full directory), book a slot. **Payment via Paystack happens before the consultation link is issued** (Phase 2 enforcement).

### 6.4 Account dashboard

`/account` (requires sign-in) — orders, addresses, wishlist, prescriptions, chat, settings.

### 6.5 Sign-in / sign-up

- `/sign-in` — Clerk-hosted UI, plus our branded `/account/login` (accepts **email OR username** + password, with Google OAuth).
- `/sign-up` — `/account/register`. Phone, email, password, name, optional newsletter opt-in.

**Guest checkout is preserved** — `/checkout` does not require an account.

---

## 7. Roles & access (current + planned)

**Today (May 2026):**
- Customer (Clerk-authenticated). Can browse, buy, manage own orders + prescriptions.
- Local super-admin (hardcoded in `admin-shell.tsx`). Full admin access. Will be replaced by real auth when the NestJS port lands.

**Phase 2 plan (next release):**
- `admin` — everything.
- `pharmacist` — orders, prescriptions, inventory.
- `doctor` — own consultations, prescription approvals, sticky notes on assigned patients.
- `customer` — default for new sign-ups.

Roles will be assigned from `/admin/system/users` and enforced by middleware in `api-nest`.

---

## 8. Payments — Paystack (M-PESA STK Push)

Shaniid RX uses **Paystack** for M-PESA STK Push payments in Kenya. The integration lives in `api-nest`:

- `POST /api/v2/payments/paystack/charge` — initiates the charge. Returns a `reference` you poll with.
- `GET  /api/v2/payments/paystack/status?reference=…` — current status (`pending` | `success` | `failed` | `cancelled`).
- `POST /api/v2/payments/paystack/callback` — webhook from Paystack on settlement.

The storefront calls these from `paystack-payment-modal.tsx`. If `PAYSTACK_SECRET_KEY` is not set, the endpoints return HTTP 503 with a friendly hint — the rest of the app keeps working.

### Configuring the Paystack webhook

1. Log in to your Paystack dashboard → **Settings → API Keys & Webhooks**.
2. Set the webhook URL to `https://<your-host>/api/v2/payments/paystack/callback`.
3. Enable the `charge.success` and `charge.failed` events.

### Card payments

UI is hidden by default. Set `VITE_ENABLE_CARD_PAYMENTS=true` on the storefront build to surface the card option in checkout and the card tab in admin. **The handler logic stays in tree either way** — enabling is a single env flag, no code restore needed.

---

## 9. Authentication — Clerk

The storefront uses **Clerk** for customer auth. ClerkProvider wraps the app in `App.tsx`. Routes:

- `/sign-in/*?` and `/sign-up/*?` — Clerk-hosted UIs (branded with our palette).
- `/account/login`, `/account/register` — our branded forms. Legacy `/account/verify-phone` and `/account/email-verified` redirect into Clerk.
- `/account/*` (dashboard, settings) — protected via `<ProtectedAccount>`.

**Username support:** `/account/login` accepts username OR email as the identifier (the same form handles both — type whatever the user remembers). Username sign-up must be enabled in your Clerk instance.

**Google sign-in** is wired and works out of the box once you enable the Google OAuth provider in your Clerk dashboard.

---

## 10. SEO

Every user-facing page renders the `<Seo>` component from `@/components/seo` with at minimum:

- `title` — page title (≤60 chars).
- `description` — meta description (≤160 chars).
- `canonicalPath` — canonical URL path (without origin).

JSON-LD helpers (`organizationJsonLd`, `websiteJsonLd`, `breadcrumbJsonLd`, `faqJsonLd`, `productJsonLd`) are exported from the same module and used on PDPs, FAQ, and landing pages.

Admin pages are intentionally `noindex`. Page-level overrides are passed via the `noindex` boolean.

---

## 11. Notifications (Phase 3 preview)

Coming in Phase 3:

- **Email** via Resend — verification, prescription approved, order receipt, consultation confirmed.
- **In-app alerts** — bell-icon dropdown in the admin header surfacing every new order, prescription, support ticket, and consultation request. Mirrors how the Orders module surfaces today.
- **Contact support / ticketing** — public `/contact` form creates a ticket, admin replies inside `/admin/support/tickets`, the customer sees the thread in `/account/support`.

---

## 12. Troubleshooting

| Symptom | Likely cause | Fix |
| ------- | ------------ | --- |
| Storefront blank, no requests | Vite dev not running, or wrong `PORT` | Restart the `her-kingdom` workflow. |
| `/api/v2/payments/paystack/charge` returns 503 | `PAYSTACK_SECRET_KEY` missing | Set the secret and restart api-nest. |
| Sign-in throws "first_name is not a valid parameter" | Username/firstName not enabled on Clerk | Enable the field in Clerk dashboard, or ignore — names already live in `unsafeMetadata`. |
| Admin sees empty data on a legacy route | api-server uses the legacy `cmsStore` stub | Expected. Persist via `cmsStore` on the frontend. |
| Prescription image fails to load | Missing session cookie | Sign in or reissue the cookie by visiting `/account`. |
| Bulk product update wiped variations | You called the full-replace `PUT /api/admin/products` | Use the per-row **Set qty** flow for bulk stock changes. |

---

## 13. Going to production

1. Set `DATABASE_URL`, `PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY`, `CLERK_*` keys.
2. Run `pnpm run build` — this typechecks and bundles all apps.
3. Deploy via Replit's deployment skill (recommended) — handles TLS, custom domains, autoscaling.
4. Add your Paystack webhook URL: `https://<your-domain>/api/v2/payments/paystack/callback`.
5. Smoke test the customer flow again (browse → buy → STK → success).
6. Hand a 10-minute walkthrough to your operations team.

---

## 14. Where to ask for help

- **Replit deployment / hosting** — Replit support inside the workspace.
- **Paystack integration** — Paystack dashboard → Support, or the API reference.
- **Clerk auth** — Clerk dashboard → Support, or `dashboard.clerk.com/help`.
- **Codebase questions** — read the per-module section of `API_DOCUMENTATION.md`, then ping the on-call developer.
