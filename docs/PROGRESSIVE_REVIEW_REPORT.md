# Shaniid RX — Progress Update

**June 2026**  
**For:** Founders, leadership & wider team  
**From:** Product & engineering  

---

## The headline

We spent this cycle making Shaniid RX **more trustworthy, more accountable, and easier to run at scale** — especially around partners, activity tracking, and getting the live site to publish reliably on Replit.

Think of it in three words: **fix, record, launch.**

---

## Highlights

✅ **Partners stay deleted** — no more “ghost” suppliers coming back after refresh  
✅ **Full activity history** — who did what, stored permanently, for admins, customers, and partners  
✅ **Google partner onboarding** — new suppliers, clinics, and logistics companies can register and wait for approval  
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

### 4. Partner admin experience

- Delete no longer fights with the screen “saving” stale data  
- Same look and feel across Suppliers, Clinics, and Logistics  
- Suspend and remove behave predictably  

---

## Trust & security (in plain terms)

| What | Why it matters |
|------|----------------|
| Permanent activity log | You can see who changed what, and when |
| No clearing the log from admin | History can’t be wiped by mistake or misuse |
| Secure sessions on live | Weak default passwords can’t run in production |
| Partner removal | Deleted partners lose portal access, not just a line on a list |
| Sensitive data masked in logs | Passwords and tokens aren’t stored in activity records |

---

## What your teams will notice

**Admin team**

- Audit Log is a real, searchable record — not browser memory  
- Partner lists are easier to manage with one actions menu  
- New Google registrations will show up as **pending** until you approve  

**Partner team (suppliers, clinics, logistics)**

- Clear path after Google sign-in: register → wait for approval → get access  
- Professional first impression aligned with Shaniid RX brand standards  

**Customers**

- No visible change this cycle — storefront and checkout continue as before  

---

## Going live on Replit (simple checklist)

| Item | Action needed? |
|------|----------------|
| Replit database | **No manual URL** — link production database in **Publishing → Production database settings** |
| Session security (`SESSION_SECRET`) | **Yes** — add in Replit Secrets (Deployments) |
| Sign-in (Clerk / Google) | **Yes** — Clerk keys in Replit Secrets |
| Payments (Paystack) | **Yes** — if checkout is live |
| Admin login | **Yes** — admin email/password or token in Secrets |

**Remember:** You code in Cursor and push to Replit. Replit runs its own environment. Only what you set in the Replit UI (secrets + linked database) applies to the live site.

---

## Done vs still to do

### ✅ Delivered this cycle

- Partner delete fix (suppliers, clinics, logistics)  
- Server-side audit log for all user types  
- Audit Log admin screen (filters, detail view, no clear button)  
- Partner KYC fields and unified actions menu  
- Google sign-in → registration form → pending approval (all portals)  
- Replit publish startup fix (fast health response)  
- Auto database URL from Replit managed Postgres  
- Auto database sync on deploy when DB is linked  

### 🔄 To implement or verify next

| Item | Status | Notes |
|------|--------|-------|
| `SESSION_SECRET` + Clerk keys on Replit Deployments | **Ops — high priority** | Required for secure live logins; separate from the database |
| Production database linked in Publishing | **Ops — verify once** | Should already be set if you use Replit managed DB |
| Approve pending partner applications | **Ongoing** | New Google registrations will queue for admin |
| Confirm partner delete on live production data | **Verify** | After next successful publish |
| Newsletter subscribers screen (admin) | **Fix queued** | Some admin pages still hit missing routes — minor, not a launch blocker |
| Admin/partner routing mix-up (`partners/admin`) | **Fix queued** | Wrong path in one admin screen — minor |
| Demand forecasting & advanced analytics | **Phase 2** | Planned later, not in this release |

---

## Closing note for founders

Shaniid RX is moving from “it works in dev” to “it holds up in production.” Partners are managed properly. Activity is recorded properly. New partners get a credible onboarding path. Publishing is less fragile.

The main handoff for go-live is **operational, not code**: link the production database in Replit Publishing (if not already), set **session and sign-in secrets**, then publish again. The engineering work for this cycle is in place and ready to ship.

---

*Shaniid RX — A Shaniid Group Company*  
*Questions? Share this document with your technical lead.*
