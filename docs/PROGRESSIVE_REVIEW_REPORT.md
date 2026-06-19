# Shaniid RX — Progress Update

**June 2026**  
**For:** Founders, leadership & wider team  
**From:** Product & engineering  

---

## Status at a glance

| Area | Status | Notes |
|------|--------|-------|
| Partner onboarding (Google → pending approval) | **Done** | All three portal types |
| Partner delete / suspend / KYC | **Done** | Permanent delete; unified actions menu |
| Partner org sign-in (Clerk name fix) | **Done** | No false “organization required” errors |
| Server-side audit log | **Done** | All user types; no clear button |
| SEO (OG, sitemap, prerender, schema) | **Done** | Submit sitemap to Google after publish |
| Admin analytics (8 tabs) | **Done** | Wired to `/api/v2` + Postgres |
| Demand forecasting | **Done** | Live API + Sourcing UI |
| Replit publish / DB auto-sync | **Done** | Fast health check; managed DB |
| Live production verification | **Not done** | Ops — verify after next publish |
| Production secrets (session, Clerk, Paystack) | **Not done** | Ops — Replit Deployments |
| Newsletter subscribers (admin) | **Not done** | Code fix queued |
| Admin/partner routing (`partners/admin`) | **Not done** | Code fix queued |
| Full server-side rendering (SSR) | **Not done** | Phase 2 |
| ML demand forecasting | **Not done** | Phase 2 — trend engine ships today |
| Clerk admin SSO (replace token auth) | **Not done** | Phase 2 |

**Summary:** Core product, partners, SEO, analytics, and forecasting are **built and merged**. What remains is mostly **live verification**, **deployment secrets**, **two small admin fixes**, and **Phase 2** enhancements.

---

## ✅ Done this cycle

### Partners & trust

- Permanent partner delete (suppliers, clinics, logistics) — no ghost records after refresh  
- Google sign-in → registration form → **pending approval** workflow (all portal types)  
- Real company name from Clerk; session token fix for “Organization name is required”  
- KYC checklist on partner profiles; unified actions menu on every list  
- Admin portal link hidden from partner login screens  
- Server-side audit log for admins, customers, partners, and guests — searchable, permanent  
- Partner removal turns off portal access, not just list visibility  

### Search & discoverability (SEO)

- Branded social preview image (`og-default.jpg`, 1200×630)  
- Dynamic sitemap from live products and blog posts  
- Post-build prerender for `/`, `/shop`, `/faq`, `/blogs`, products, and posts  
- Product, BlogPosting, and FAQPage structured data  
- `robots.txt` blocks admin, checkout, portals, wishlist  
- Visible footer “Browse by need” links (no hidden keyword stuffing)  

### Admin analytics (`/admin/analytics`)

All eight tabs load live data from Postgres via `/api/v2/admin/analytics`:

| Tab | What it shows |
|-----|----------------|
| Overview | Daily views + clicks, top pages, cities, referrers, recent sessions |
| Live Visitors | Active now, 10-min chart, city heat map, pages in view |
| Website Traffic | Retention, channels, new vs returning, geo, devices, UTM |
| Searches | Queries from navbar and shop |
| Engagement | Clicks, scroll depth, bounce rate, top elements |
| Sales & Orders | Revenue timeline, top products, categories, recent orders |
| Bot Detection | Human vs bot split and daily chart |
| Abandoned Checkouts | Drop-offs by reason, step, recovery count |

Storefront tracking uses `/api/v2/track-*` (production-safe). Period selector: 7 / 30 / 90 days.

### Demand forecasting

- `GET /api/v2/admin/demand/forecast` — orders + Rx + assessments → SKU projections  
- Sourcing → Forecast: **Generate from live data**, reorder math, procurement handoff  
- Demand roll-up at `/admin/operations/demand` links to forecast and procurement  

### Platform & deploy

- Replit publish startup fix (health responds before full boot)  
- Managed Replit database — no manual `DATABASE_URL` copy from laptop  
- Auto Drizzle schema sync on deploy when DB is linked  

---

## ❌ Not done yet

### 1. Operations — do on live (not code)

These block a confident go-live or post-launch SEO; engineering cannot complete them from the repo alone.

| Task | Priority | Owner | What to do |
|------|----------|-------|------------|
| Set `SESSION_SECRET` on Replit Deployments | **High** | Ops | Replit Secrets → production deployment |
| Set Clerk keys (Google sign-in) | **High** | Ops | Same — customer + partner auth |
| Set Paystack keys (if checkout is live) | **High** | Ops | Same — payments |
| Set admin API token / admin login | **High** | Ops | Required for `/api/v2/admin/*` in production |
| Link production database in Publishing | **Verify** | Ops | Replit → Publishing → Production database |
| Approve pending partner applications | **Ongoing** | Admin team | Queue fills as Google sign-ups arrive |
| Confirm partner delete on production data | **Verify** | Admin + eng | After next successful publish |
| Submit sitemap to Google Search Console | **After publish** | Marketing | `https://shaniidrx.co.ke/sitemap.xml` |
| Run Lighthouse SEO on production | **After publish** | Marketing | Baseline for future improvements |
| Browse storefront → check Analytics tabs populate | **After publish** | Admin / ops | Confirms tracking ingest on live |

### 2. Engineering — queued fixes (small)

| Item | Impact | Notes |
|------|--------|-------|
| Newsletter subscribers admin screen | Admin 404 or routing gap | Minor; subscribers API may exist but UI route broken |
| `partners/admin` routing mix-up | Wrong screen or 404 | Minor; URL guard / route order |

### 3. Phase 2 — planned, not started

| Item | Why it waits |
|------|----------------|
| Full server-side rendering (SSR) | Storefront is SPA + prerender today; SSR is optional crawlability upgrade |
| ML-based demand forecasting | Current engine uses sales trend + Rx/assessment signals; sufficient for v1 |
| Clerk admin SSO | Admin still uses token auth; Clerk admin login is the planned replacement |
| Forecast → automated procurement pipeline | Manual “Create request” from forecast works; full automation is next |
| Geo from IP when CDN headers absent | Analytics geo is empty unless proxy injects country headers |
| Legacy `api-server` retirement | `api-nest` owns v2; old Express routes still exist for some legacy paths |

### 4. Honest limitations (working as designed)

| Limitation | Detail |
|------------|--------|
| SPA, not SSR | Prerender + schema cover most SEO; some crawlers may still prefer full SSR |
| Analytics needs traffic | Empty tabs until real visitors browse the storefront (not admin routes) |
| Inventory in forecast | Reorder suggestions need sourcing inventory CMS data for on-hand / safety stock |
| Search keywords from Google | Often “encrypted” in referrer; organic terms appear when engines expose them |

---

## What we fixed (before → after)

| # | Problem | Resolution |
|---|---------|------------|
| 1 | Deleted partners reappeared on refresh | Delete is permanent; portal access revoked |
| 2 | Replit killed deploy (“not ready”) | APIs return health immediately, boot in background |
| 3 | Confusion about `DATABASE_URL` on Replit | Managed DB injects connection; `.env.local` stays local |
| 4 | Partner “Organization name is required” | Clerk org name + server fallback lookup |
| 5 | Analytics tabs empty on production | Migrated to `/api/v2` + admin token; all tabs wired |
| 6 | Sales metrics hard-coded to zero | Revenue, conversion, timeline from `admin_orders` |
| 7 | Page duration / scroll not updating | `sendBeacon` POST handled on track-view API |

---

## Trust & security

| Control | Status |
|---------|--------|
| Permanent activity log | Done |
| No “clear log” in admin | Done |
| Partner removal disables portal | Done |
| Sensitive fields masked in audit | Done |
| Private routes in `robots.txt` | Done |
| Production requires `SESSION_SECRET` + admin token | **Ops must configure** |

---

## What each team should do next

**Leadership / ops**  
Confirm Replit secrets and production DB are set, publish, then verify partner delete and analytics on live data.

**Admin team**  
Process pending partner applications; use Analytics and Demand Forecast for daily ops; submit sitemap URL to Google Search Console.

**Engineering**  
Ship newsletter admin route fix and `partners/admin` routing fix; plan Phase 2 (SSR, Clerk admin SSO) when prioritized.

**Marketing**  
Run Lighthouse on production after publish; monitor Search Console for indexing.

---

## Closing note

Shaniid RX has moved from “works in dev” to a **production-shaped** platform: partners, audit trail, SEO, analytics, and forecasting run on server data. The gap is no longer missing features in the repo — it is **configuration on live**, **two small admin fixes**, and **optional Phase 2** depth.

---

*Shaniid RX — A Shaniid Group Company*  
*Questions? Share this document with your technical lead.*
