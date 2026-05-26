# Shaniid RX — Training Manual

A practical, end-to-end walkthrough for setting up, running, and operating Shaniid RX. Written for the team that will install the software, configure suppliers and pharmacies, manage day-to-day storefront/admin work, onboard partners, and hand off to support.

> **Audience:** non-technical operators, store managers, pharmacists, procurement teams, and the on-call developer who configures the environment for the first time.
> **Last updated:** May 2026.

---

## 1. What Shaniid RX is

Shaniid RX is the trust layer for medicine distribution in East Africa. It is composed of:

- **Storefront** — the public catalogue, prescription upload, doctor consultation booking, and customer accounts.
- **Admin** — the back-office for products, banners, categories, orders, payments, prescriptions, marketing, sourcing, and CMS.
- **Partner Portals** — three self-service portals for verified Suppliers, Healthcare Facilities (Clinics), and Logistics Partners.
- **APIs** — the two backend services that power everything: the legacy `api-server` (Express) and the strangler-fig `api-nest` (NestJS) that is gradually taking over.

The product promise is non-negotiable: **"If it comes through Shaniid RX, it is genuine, fairly priced, and delivered with integrity."**

---

## 2. System architecture (one screen)

```
                       ┌──────────────────────────────────────┐
                       │       Storefront / Admin             │
                       │   artifacts/her-kingdom              │
                       │                                      │
                       │  /              Storefront           │
                       │  /admin/*       Back-office          │
                       │  /portal/supplier  Supplier portal   │
                       │  /portal/clinic    Clinic portal     │
                       │  /portal/logistics Logistics portal  │
                       └──────────────┬───────────────────────┘
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
                               │ cmsStore /   │  (browser localStorage today)
                               │ Postgres     │  (Drizzle — Phase 2)
                               └──────────────┘
```

Two backends run side-by-side so the storefront keeps working while modules port over. Partner data (suppliers, clinics, logistics partners) lives in `cmsStore` today and migrates to NestJS in Phase 2. Eventually `api-nest` owns everything and `api-server` is removed.

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
2. **Add to cart** → checkout → choose **M-PESA** → enter your test phone (`07XX…`) → confirm the Paystack STK modal appears and reports an error if `PAYSTACK_SECRET_KEY` is unset (this is intentional, friendly behaviour).
3. **Sign up** at `/sign-up` with email + password → confirm you land at `/account`.
4. **Open the admin** at `/admin` → log in as the local super-admin (hardcoded for now) → confirm the dashboard renders KPIs.
5. **Verify a partner portal** — go to `/portal/supplier` → confirm the branded login page loads.

If all five pass, your installation is healthy.

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

`/admin/payments` shows every M-PESA transaction (via Paystack). When `VITE_ENABLE_CARD_PAYMENTS=true`, a second tab surfaces card payments. Each row links back to the order.

> If a customer reports "I paid but my order is still pending", search by **M-PESA receipt** here first. The receipt comes back from Paystack on successful charge and is written to the order record.

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

## 6. Partner Management — full guide

Shaniid RX has three classes of business partner, each with their own admin management page and self-service portal.

| Partner type | Admin page | Portal URL | Portal code prefix |
| ------------ | ---------- | ---------- | ------------------ |
| Supplier | `/admin/suppliers` | `/portal/supplier` | `SUP-XXXX-XXXX` |
| Healthcare Facility (Clinic) | `/admin/clinics` | `/portal/clinic` | `CLN-XXXX-XXXX` |
| Logistics Partner | `/admin/logistics-partners` | `/portal/logistics` | `LOG-XXXX-XXXX` |

### 6.1 How portal codes work

Every partner gets a unique portal code when you onboard them in the admin. The code is displayed once in the onboarding modal and is also visible (and copyable) in the partner's drawer at any time. Partners use this code plus their registered email address to sign into their self-service portal.

Portal codes are **not passwords** — they are access tokens. Keep them confidential. If a code is compromised, generate a new one from the partner's admin drawer and inform the partner.

---

### 6.2 Supplier Management (`/admin/suppliers`)

#### What you can do

- View KPI summary: **Total Suppliers**, **Verified**, **Pending KYC**, **Suspended**.
- Search by company name, email, or portal code.
- Filter by status and supply category.
- **Onboard a new supplier** → **+ Add Supplier** → complete the form.
- Click any row to open the **supplier drawer** with four tabs: Profile, Orders, Performance, KYC.

#### Onboarding a new supplier — step by step

1. Click **+ Add Supplier** (top right).
2. Fill in **Company name**, **Email**, **Phone**, **Address / City / Country**.
3. Enter the **Registration number** (business reg cert) and **Tax ID** (KRA PIN).
4. Select the **supply categories** (Generics, Branded, Medical Devices, Cold Chain, Diagnostics, etc.).
5. Set **Payment terms** (e.g. Net 30) and **Credit limit** (integer KES).
6. Optionally check any KYC documents already received: **Business License**, **FDA / KEBS Certificate**, **Liability Insurance**.
7. Click **Onboard Supplier**. The system generates a `SUP-XXXX-XXXX` portal code.
8. The portal code is shown in the modal. **Copy it and share it with the supplier.** They will need it to log into `/portal/supplier`.

#### KYC review workflow

1. Supplier submits documents to `kyc@shaniidrx.com` with their portal code in the subject line.
2. Open their drawer → **KYC** tab → check the boxes for documents received.
3. Optionally add **Reviewer notes** (displayed to the supplier in their portal).
4. Click **Approve KYC** to set status to `verified` (Trust Seal granted) or use the status dropdown to suspend / blacklist if there is a compliance issue.
5. The supplier sees their updated status immediately the next time they log into the portal.

#### What the supplier sees in their portal

After signing in at `/portal/supplier` with their email + portal code:

- **Overview** — KPI cards (active POs, total PO value, on-time rate, quality score), status banner (pending / verified / suspended), supply categories, quick-action grid.
- **My Products** — products they supply through Shaniid RX (populated by your ops team).
- **Purchase Orders** — POs raised by Shaniid RX. Populated in Phase 2.
- **KYC & Trust Seal** — checklist of documents with progress bar. Pending items show the KRA PIN and email for submission. Reviewer notes are shown here.
- **My Profile** — read-only company details (contact the account manager to update).

---

### 6.3 Clinic & Healthcare Facility Management (`/admin/clinics`)

#### What you can do

- View KPI summary: **Total Facilities**, **Approved**, **Pending KYC**, **Credit Limit** (total across all clinics).
- Search by clinic name, county, or portal code.
- Filter by status, type, tier, and county.
- **Onboard a new facility** → **+ Add Clinic**.
- Click any row to open the **clinic drawer** with four tabs: Profile, Orders, KYC, Trade on Behalf.

#### Onboarding a new clinic — step by step

1. Click **+ Add Clinic**.
2. Fill in **Clinic / Hospital name** and select the **Facility type** (Hospital, Clinic, Dispensary, Nursing Home, Specialist Centre).
3. Enter **Email**, **Phone**, **Address**, **Town**, **County**.
4. Enter the **License number** (facility registration), **NHIF / SHIF number**, and **Medical Director** name.
5. Set the **Credit limit** (integer KES), **Payment terms** (Net 7, Net 14, etc.), and **Tier** (Standard, Partner, Preferred).
6. Select **Specialties** (General Practice, Paediatrics, Oncology, etc.).
7. Check any KYC documents already in hand: **Facility License**, **NHIF Certificate**, **KRA PIN Certificate**, **Director ID**.
8. Click **Onboard Clinic**. System generates a `CLN-XXXX-XXXX` portal code.
9. Copy the portal code and share with the procurement officer at the facility.

#### Credit line management

Each clinic has a `creditLimit` (max allowable outstanding) and a `creditUsed` (current balance). When a clinic places an order through their portal, the order total is checked against `creditLimit - creditUsed`. If the order would exceed the credit, it is blocked with a clear message.

To adjust credit:
- Open the clinic's drawer → **Profile** tab → edit `Credit limit` → save.
- To record a repayment (reduce `creditUsed`), use the **Adjust Credit** button (Phase 2 formalises this into a proper ledger).

#### KYC review workflow

Same pattern as suppliers — clinics send documents to `clinics@shaniidrx.com` with their portal code. Update the KYC flags in the admin drawer, add reviewer notes, and click **Approve** to change status to `approved`. Clinics cannot place orders until approved.

#### Trade on behalf of patients

Approved clinics can place bulk medicine orders through their portal for their patients:

1. Clinic logs into `/portal/clinic`.
2. Goes to **Place Order** tab.
3. Adds one or more order lines (medicine / product name, quantity, unit price, optional patient name).
4. Checks the credit gauge — if the order total exceeds available credit, the submit button is disabled.
5. Adds any delivery instructions (cold chain, urgency, etc.).
6. Submits. The order goes into your **Orders** queue with the clinic name and individual patient names attached.

In the admin, you can also initiate a "trade on behalf" action from the **Trade on Behalf** tab in the clinic's drawer, which opens a guided order form pre-populated with the clinic's details.

#### What the clinic sees in their portal

After signing in at `/portal/clinic`:

- **Overview** — KPI cards (total orders, total spend, KYC score, specialties count), status banner, credit line gauge in sidebar.
- **Place Order** — itemised order form with credit check.
- **My Orders** — order history (Phase 2 populates this from the database).
- **KYC Status** — document checklist with submission instructions.
- **Facility Profile** — read-only facility details.

---

### 6.4 Logistics Partner Management (`/admin/logistics-partners`)

#### What you can do

- View KPI summary: **Total Partners**, **Active**, **Pending**, **Total Fleet Size**.
- Filter by status and county.
- **Register a new partner** → **+ Add Partner**.
- Click any row to open the **partner drawer** with four tabs: Fleet, Performance, KYC, Profile.

#### Registering a logistics partner — step by step

1. Click **+ Add Partner**.
2. Fill in **Company name**, **Email**, **Phone**, **Address**, **County**.
3. Enter **Registration number** (company reg) and **Insurance number** (liability insurance policy).
4. Select **Vehicle types** operated (Motorcycle, Bicycle, Tuktuk, Van, Cold Van, Truck).
5. Select **Coverage counties** — all Kenyan counties the company covers.
6. Set **Rate per km** and **Rate per delivery** (integer KES).
7. Check any KYC documents on hand: **Public Liability Insurance**, **Company Registration**, **Driver Licenses**, **Safety / Cold Chain Training Certs**.
8. Click **Register Partner**. System generates a `LOG-XXXX-XXXX` portal code.
9. Copy the portal code and share with the operations contact at the company.

#### Fleet management

From the partner's admin drawer → **Fleet** tab:
- **Add vehicle** → plate number, vehicle type, assigned driver name, initial status.
- **Edit vehicle** → update driver, change status (Available / On Delivery / Maintenance / Offline).
- Fleet summary (available, on delivery, maintenance) is surfaced in the admin and mirrored in the partner's portal sidebar.

#### KYC review workflow

Same pattern — documents to `logistics@shaniidrx.com` with portal code. Update flags in the drawer, add notes, click **Activate Partner** to set status to `active`. Only active partners receive delivery assignments.

#### What the logistics partner sees in their portal

After signing in at `/portal/logistics`:

- **Overview** — KPI cards (active deliveries, fleet size, on-time rate, total deliveries), fleet mini-status in sidebar, status banner, coverage county chips.
- **My Deliveries** — active and recent delivery assignments (Phase 2 populates from the database).
- **Fleet** — vehicle grid with plate number, type, driver, and live status badge.
- **Performance** — bar charts for on-time rate, success rate, SLA score, KYC completeness, plus totals.
- **KYC & Compliance** — document checklist, admin notes, company profile.

---

## 7. Customer-facing flows (what the user actually sees)

### 7.1 Browse → buy

`/` → `/shop` → `/product/:slug` → **Add to cart** → cart drawer → **Checkout** → 3-step form (Address → Delivery → Payment) → M-PESA STK → success receipt screen.

### 7.2 Upload a prescription

`/upload-prescription` — drag-and-drop image, enter notes, submit. Upload lands in admin queue. Customer sees status updates inside `/account/prescriptions`.

### 7.3 Speak to a doctor

`/speak-to-a-doctor` — pick a specialty, see available doctors (Phase 2 surfaces the full directory), book a slot. **Payment via Paystack happens before the consultation link is issued** (Phase 2 enforcement).

### 7.4 Account dashboard

`/account` (requires sign-in) — orders, addresses, wishlist, prescriptions, chat, settings.

### 7.5 Sign-in / sign-up

- `/sign-in` — Clerk-hosted UI, plus our branded `/account/login` (accepts **email OR username** + password, with Google OAuth).
- `/sign-up` — `/account/register`. Phone, email, password, name, optional newsletter opt-in.

**Guest checkout is preserved** — `/checkout` does not require an account.

---

## 8. Roles & access (current + planned)

### Today (May 2026)

| Role | Access | Auth method |
| ---- | ------ | ----------- |
| Customer | Storefront — browse, buy, manage own orders + prescriptions. | Clerk (email / username / Google) |
| Local super-admin | Full admin access at `/admin`. | Hardcoded in `admin-shell.tsx` |
| Supplier partner | Self-service portal at `/portal/supplier`. | Email + `SUP-XXXX-XXXX` portal code |
| Clinic partner | Self-service portal at `/portal/clinic`. | Email + `CLN-XXXX-XXXX` portal code |
| Logistics partner | Self-service portal at `/portal/logistics`. | Email + `LOG-XXXX-XXXX` portal code |

### Phase 2 plan (next release)

Admin roles enforced by NestJS middleware:

| Role | Scope |
| ---- | ----- |
| `admin` | Everything. |
| `pharmacist` | Orders, prescriptions, inventory. |
| `doctor` | Own consultations, prescription approvals, sticky notes on assigned patients. |
| `customer` | Default for new Clerk sign-ups. |
| `supplier` | JWT from partner auth endpoint — own products and POs. |
| `clinic` | JWT from partner auth endpoint — own orders and credit. |
| `logistics` | JWT from partner auth endpoint — own deliveries and fleet. |

Roles will be assigned from `/admin/system/users` and enforced by middleware in `api-nest`.

---

## 9. Payments — Paystack (M-PESA STK Push)

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

## 10. Authentication — Clerk

The storefront uses **Clerk** for customer auth. ClerkProvider wraps the app in `App.tsx`. Routes:

- `/sign-in/*?` and `/sign-up/*?` — Clerk-hosted UIs (branded with our palette).
- `/account/login`, `/account/register` — our branded forms. Legacy `/account/verify-phone` and `/account/email-verified` redirect into Clerk.
- `/account/*` (dashboard, settings) — protected via `<ProtectedAccount>`.

**Username support:** `/account/login` accepts username OR email as the identifier (the same form handles both — type whatever the user remembers). Username sign-up must be enabled in your Clerk instance.

**Google sign-in** is wired and works out of the box once you enable the Google OAuth provider in your Clerk dashboard.

**Partner portals are completely separate from Clerk.** Partners use their email + portal code only. They never interact with the Clerk flow.

---

## 11. SEO

Every user-facing page renders the `<Seo>` component from `@/components/seo` with at minimum:

- `title` — page title (≤60 chars).
- `description` — meta description (≤160 chars).
- `canonicalPath` — canonical URL path (without origin).

JSON-LD helpers (`organizationJsonLd`, `websiteJsonLd`, `breadcrumbJsonLd`, `faqJsonLd`, `productJsonLd`) are exported from the same module and used on PDPs, FAQ, and landing pages.

Admin pages and partner portals are intentionally `noindex`. Page-level overrides are passed via the `noindex` boolean.

---

## 12. Notifications (Phase 3 preview)

Coming in Phase 3:

- **Email** via Resend — verification, prescription approved, order receipt, consultation confirmed, partner KYC approved.
- **In-app alerts** — bell-icon dropdown in the admin header surfacing every new order, prescription, support ticket, consultation request, and partner application.
- **Contact support / ticketing** — public `/contact` form creates a ticket, admin replies inside `/admin/support/tickets`, the customer sees the thread in `/account/support`.
- **Partner email notifications** — portal code delivery email on onboarding, KYC decision email, PO / delivery assignment email.

---

## 13. Troubleshooting

| Symptom | Likely cause | Fix |
| ------- | ------------ | --- |
| Storefront blank, no requests | Vite dev not running, or wrong `PORT` | Restart the `her-kingdom` workflow. |
| `/api/v2/payments/paystack/charge` returns 503 | `PAYSTACK_SECRET_KEY` missing | Set the secret and restart api-nest. |
| Sign-in throws "first_name is not a valid parameter" | Username/firstName not enabled on Clerk | Enable the field in Clerk dashboard, or ignore — names already live in `unsafeMetadata`. |
| Admin sees empty data on a legacy route | api-server uses the legacy `cmsStore` stub | Expected. Persist via `cmsStore` on the frontend. |
| Prescription image fails to load | Missing session cookie | Sign in or reissue the cookie by visiting `/account`. |
| Bulk product update wiped variations | You called the full-replace `PUT /api/admin/products` | Use the per-row **Set qty** flow for bulk stock changes. |
| Partner portal login says "incorrect code" | Email or portal code entered incorrectly | Double-check email is exact (case-insensitive) and code format is `XXX-XXXX-XXXX`. Copy the code from the admin drawer rather than typing it. |
| Partner portal login says "account suspended" | Partner was suspended or blacklisted in admin | Re-open their admin drawer and change status to the appropriate active state, or direct the partner to support. |
| Clinic cannot submit order | Status is not "approved" or order exceeds credit | Approve their KYC first, or increase their credit limit in the admin drawer. |
| Logistics partner fleet shows no vehicles | No vehicles were added during onboarding | Open their admin drawer → Fleet tab → Add vehicle. |
| Partner's portal code not known | Code was not saved at onboarding time | Open the admin drawer for that partner — the portal code is always visible and copyable there. |
| `cmsStore` data lost after browser clear | Expected — localStorage is ephemeral in development | Phase 2 moves all partner data to the NestJS database. For now, re-onboard in dev as needed. |

---

## 14. Going to production

1. Set `DATABASE_URL`, `PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY`, `CLERK_*` keys.
2. Run `pnpm run build` — this typechecks and bundles all apps.
3. Deploy via Replit's deployment skill (recommended) — handles TLS, custom domains, autoscaling.
4. Add your Paystack webhook URL: `https://<your-domain>/api/v2/payments/paystack/callback`.
5. Smoke test the customer flow again (browse → buy → STK → success).
6. Smoke test a partner portal (go to `/portal/supplier`, confirm the login page loads).
7. Onboard your first supplier through `/admin/suppliers`, copy their portal code, and verify login at `/portal/supplier`.
8. Hand a 10-minute walkthrough to your operations team.

---

## 15. Quick reference — all partner portal URLs

| Who | Admin management | Self-service portal | Portal code |
| --- | ---------------- | ------------------- | ----------- |
| Pharmaceutical Supplier | `/admin/suppliers` | `/portal/supplier` | `SUP-XXXX-XXXX` |
| Healthcare Facility / Clinic | `/admin/clinics` | `/portal/clinic` | `CLN-XXXX-XXXX` |
| Logistics / Delivery Company | `/admin/logistics-partners` | `/portal/logistics` | `LOG-XXXX-XXXX` |

**Onboarding checklist (all partner types):**

1. Fill the onboarding form in the admin.
2. Copy the generated portal code.
3. Share the portal code + the portal URL with the partner's designated contact.
4. Chase KYC documents (see per-type checklists in Sections 6.2–6.4).
5. Review and approve KYC in the admin drawer.
6. Confirm the partner can log in and see their dashboard.

---

## 16. Where to ask for help

- **Replit deployment / hosting** — Replit support inside the workspace.
- **Paystack integration** — Paystack dashboard → Support, or the API reference.
- **Clerk auth** — Clerk dashboard → Support, or `dashboard.clerk.com/help`.
- **Supplier queries** — direct to `suppliers@shaniidrx.com`.
- **Clinic / healthcare facility queries** — direct to `clinics@shaniidrx.com`.
- **Logistics partner queries** — direct to `logistics@shaniidrx.com`.
- **KYC document submission** — all types submit to `kyc@shaniidrx.com` with their portal code in the subject line.
- **Codebase questions** — read the per-module section of `API_DOCUMENTATION.md`, then ping the on-call developer.
