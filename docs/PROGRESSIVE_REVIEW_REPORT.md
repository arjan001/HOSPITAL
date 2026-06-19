# Shaniid RX — Progress Update

**June 2026**  
**For:** Founders, leadership & wider team  
**From:** Product & engineering  

---

## The headline

We spent this cycle making Shaniid RX **more trustworthy, more accountable, easier to find online, and easier to run at scale** — especially around partners, search visibility, activity tracking, and getting the live site to publish reliably on Replit.

Think of it in four words: **fix, record, find, launch.**

---

## Highlights

✅ **Partners stay deleted** — no more “ghost” suppliers coming back after refresh  
✅ **Full activity history** — who did what, stored permanently, for admins, customers, and partners  
✅ **Google partner onboarding** — new suppliers, clinics, and logistics companies can register and wait for approval  
✅ **Partner org sign-in fixed** — uses real company names from Clerk, not broken slugs  
✅ **Search & sharing upgraded** — branded social preview image, dynamic sitemap, crawler-friendly product and blog pages  
✅ **Stronger KYC** — licenses and insurance captured in one place for admin review  
✅ **Smarter publishing** — live site starts faster so Replit stops failing healthy builds  
✅ **Replit database** — uses your managed Replit database automatically; no need to copy connection strings from your laptop  

---

## What’s new

### Partner onboarding after Google sign-in

A supplier, clinic, or logistics company can now:

1. Sign in with Google  
2. Fill in a proper company profile (name, contact, email, phone, location)  
3. Tick what KYC documents they have (licenses, insurance, certifications — depending on type)  
4. Submit and see: **“Application received — awaiting Shaniid RX approval”**

They **cannot** use the full portal until your admin team approves them.  
This works the same way across **all three partner types.**

**Fix this cycle:** If Clerk already had an organization with a proper name, the portal no longer fails with “Organization name is required.” The system reads the name from Clerk when needed.

---

### Search engine & social visibility (SEO)

We audited how Google, Bing, and AI crawlers discover and understand the storefront, then shipped fixes that improve Lighthouse SEO scores and real-world indexing.

**What customers and crawlers get now**

| Area | What changed |
|------|----------------|
| **Social sharing** | Branded 1200×630 preview image (`og-default.jpg`) for WhatsApp, Facebook, X, and LinkedIn link previews |
| **Product pages** | Real product title, description, image, and Product schema after the page loads |
| **Blog articles** | Real headline, excerpt, cover image, and BlogPosting schema |
| **FAQ** | Full FAQPage structured data for all help-centre answers |
| **Sitemap** | Auto-generated from live products and blog posts (not just a static list) |
| **Prerender** | Key routes get crawler-ready HTML with correct titles and meta — even before JavaScript runs |
| **robots.txt** | Blocks admin, checkout, portals, and wishlist from indexing |
| **Footer links** | Visible “Browse by need” pharmacy links — no hidden keyword stuffing |

**Still a SPA (honest note):** The storefront is a modern single-page app. Prerender and structured data close most of the gap, but full server-side rendering would be the next level if we want every crawler to see 100% of content on first fetch.

**After you publish:** Submit `https://shaniidrx.co.ke/sitemap.xml` in [Google Search Console](https://search.google.com/search-console) and run Lighthouse on the live homepage.

---

### Richer partner profiles for admin

- KYC checklist visible at a glance (supplier, clinic, logistics each have the right fields)  
- One consistent **actions menu** on every partner list — view details, suspend, or remove  
- Partner summary view — employees, portal accounts, and compliance status in one place  

---

### Activity log you can rely on

Before, some history lived only in the browser and could be cleared from the admin screen.  
That’s gone.

Now:

- Every important action is saved on the **server** — permanent  
- Covers **everyone**: admins, customers, partners, and guests  
- Admin Audit Log loads real data with search and filters  
- **No “clear log” button** — the trail stays for accountability and compliance  

---

### Smoother updates when we publish

When we push a new version live, the platform can **sync database structure automatically** (tables and columns stay up to date with the app).  
Your **Replit managed database** supplies the connection — you don’t paste database URLs from your local machine.

---

## What we fixed

### 1. Deleted partners reappearing

**Before:** Remove a supplier, clinic, or logistics partner → refresh → they’re back.  
**Now:** Delete is permanent. Old copies can’t sneak back in. Portal access for removed partners is turned off.

---

### 2. Live site failing to promote on Replit

**Before:** Build succeeded, but Replit said the app “wasn’t ready” in the first second — and killed the deployment.  
**Now:** Both APIs answer “I’m starting up” immediately, then finish loading in the background.  
This matches how Replit checks health during publish.

---

### 3. Confusion about the database on Replit

**Before:** Docs implied you had to manually copy `DATABASE_URL` into secrets.  
**Now:** The app is built for **Replit’s managed database**. Replit injects the connection when the database is linked to your published app.  
Your `.env.local` on Cursor stays on your laptop — it does **not** travel to Replit when you push code.

---

### 4. Partner portal “Organization name is required”

**Before:** User signs in with Google, Clerk creates the org correctly, but “Continue to portal” failed.  
**Now:** The app uses the real organization name from Clerk, sends the correct session token, and the server can look up the name from Clerk if the client omits it.

---

### 5. Partner admin experience

- Delete no longer fights with the screen “saving” stale data  
- Same look and feel across Suppliers, Clinics, and Logistics  
- Suspend and remove behave predictably  
- Admin portal link hidden from partner login screens  

---

## Trust & security (in plain terms)

| What | Why it matters |
|------|----------------|
| Permanent activity log | You can see who changed what, and when |
| No clearing the log from admin | History can’t be wiped by mistake or misuse |
| Secure sessions on live | Weak default passwords can’t run in production |
| Partner removal | Deleted partners lose portal access, not just a line on a list |
| Sensitive data masked in logs | Passwords and tokens aren’t stored in activity records |
| Private routes blocked from Google | Admin, checkout, and partner dashboards stay out of search results |

---

## What your teams will notice

**Admin team**

- Audit Log is a real, searchable record — not browser memory  
- Partner lists are easier to manage with one actions menu  
- New Google registrations will show up as **pending** until you approve  

**Partner team (suppliers, clinics, logistics)**

- Clear path after Google sign-in: register → wait for approval → get access  
- No more dead-end “organization name required” errors when Clerk already has the company  
- Professional first impression aligned with Shaniid RX brand standards  

**Customers & marketing**

- Better link previews when the site is shared on social media  
- Product and health-article pages are easier for search engines to index  
- FAQ answers can appear in Google rich results  

---

## Going live on Replit (simple checklist)

| Item | Action needed? |
|------|----------------|
| Replit database | **No manual URL** — link production database in **Publishing → Production database settings** |
| Session security (`SESSION_SECRET`) | **Yes** — add in Replit Secrets (Deployments) |
| Sign-in (Clerk / Google) | **Yes** — Clerk keys in Replit Secrets |
| Payments (Paystack) | **Yes** — if checkout is live |
| Admin login | **Yes** — admin email/password or token in Secrets |
| Google Search Console | **Recommended** — submit sitemap after publish |

**Remember:** You code in Cursor and push to Replit. Replit runs its own environment. Only what you set in the Replit UI (secrets + linked database) applies to the live site.

---

## Done vs still to do

### ✅ Delivered this cycle

- Partner delete fix (suppliers, clinics, logistics)  
- Server-side audit log for all user types  
- Audit Log admin screen (filters, detail view, no clear button)  
- Partner KYC fields and unified actions menu  
- Google sign-in → registration form → pending approval (all portals)  
- Partner org name / Clerk session fix (no more false “organization required” errors)  
- Admin link removed from partner portal login screens  
- **SEO:** branded OG image, dynamic sitemap, prerender for key routes, Product/Blog/FAQ schema, robots.txt cleanup  
- Replit publish startup fix (fast health response)  
- Auto database URL from Replit managed Postgres  
- Auto database sync on deploy when DB is linked  

### 🔄 To implement or verify next

| Item | Status | Notes |
|------|--------|-------|
| `SESSION_SECRET` + Clerk keys on Replit Deployments | **Ops — high priority** | Required for secure live logins |
| Production database linked in Publishing | **Ops — verify once** | Should already be set if you use Replit managed DB |
| Approve pending partner applications | **Ongoing** | New Google registrations will queue for admin |
| Confirm partner delete on live production data | **Verify** | After next successful publish |
| Submit sitemap in Google Search Console | **Ops — after publish** | `https://shaniidrx.co.ke/sitemap.xml` |
| Run Lighthouse SEO on production | **Ops — after publish** | Baseline score for future improvements |
| Newsletter subscribers screen (admin) | **Fix queued** | Minor admin routing gap |
| Admin/partner routing mix-up (`partners/admin`) | **Fix queued** | Minor |
| Full server-side rendering (SSR) | **Phase 2** | Optional next step for maximum crawlability |
| Demand forecasting & advanced analytics | **Phase 2** | Planned later |

---

## Closing note for founders

Shaniid RX is moving from “it works in dev” to “it holds up in production and shows up properly online.” Partners are managed properly. Activity is recorded properly. New partners get a credible onboarding path. The storefront is easier for Google and social platforms to understand. Publishing is less fragile.

The main handoff for go-live is **operational, not code**: link the production database in Replit Publishing (if not already), set **session and sign-in secrets**, publish again, then submit the sitemap to Google Search Console.

---

*Shaniid RX — A Shaniid Group Company*  
*Questions? Share this document with your technical lead.*
