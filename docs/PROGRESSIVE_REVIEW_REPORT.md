# Shaniid RX — Progress Update

**Date:** 18 June 2026  
**Prepared for:** Founders & leadership team  
**Purpose:** Summary of recent improvements, fixes, and what we still need to go live smoothly

---

## At a glance

Over the past few weeks we strengthened three areas that matter for trust and day-to-day operations:

1. **Partner management** — suppliers, clinics, and logistics partners now stay deleted when removed, and new partners can register properly after signing in with Google.
2. **Activity history (audit log)** — the platform now keeps a proper record of who did what, stored securely on the server (not in the browser).
3. **Publishing readiness** — we improved how the live site starts up, but the app still needs the correct secrets configured on Replit before publish will succeed.

---

## What’s new

### Partner registration after Google sign-in

When a supplier, clinic, or logistics company signs in with Google for the first time, they now see a **registration form** (similar to what admins use when adding a partner manually).

They can enter:

- Company name  
- Contact person  
- Email and phone  
- Location (county)  
- KYC checklist (licenses, insurance, certifications — depending on partner type)  
- Any extra notes for our review team  

After submitting, they see a clear message: **application received — awaiting Shaniid RX approval.** They cannot use the full portal until an admin approves them.

This applies to all three partner types: **Suppliers, Clinics, and Logistics.**

---

### Stronger partner profiles (KYC)

We added structured **KYC (Know Your Customer)** fields for partners so the admin team can see at a glance whether licenses, insurance, and certifications have been declared.

Admins can also use a single **actions menu** (view details, suspend, delete) on supplier, clinic, and logistics lists — making partner management more consistent across the platform.

---

### Proper activity log for the whole platform

Previously, some activity history lived only in the browser and could be cleared from the admin screen. That is no longer acceptable for a healthcare platform.

**What changed:**

- Every important change is now saved to our **database** as a permanent record.
- The log captures **admins, customers, partners, and guests** — not just admin users.
- The admin **Audit Log** page now loads real data from the server, with search and filters (by module, action, person type, date, severity).
- The **“Clear log”** option was removed — records cannot be wiped from the admin panel.
- Old browser-only log data is ignored on load so the screen shows only real server records.

This supports accountability, troubleshooting, and future compliance needs.

---

### Database stays in sync when we deploy

When we publish an update, the system can now **automatically apply database structure changes** (as long as the database connection is configured). This reduces the risk of the live site running with an outdated database layout.

---

## Bugs fixed

### Deleted partners coming back

**Problem:** After deleting a supplier, clinic, or logistics partner in admin, the record sometimes **reappeared** after refreshing the page.

**Why it happened:** Old data was being copied back from a legacy storage location, and the screen was saving a filtered list in a way that overwrote the delete.

**Fix:**

- Deletes are now **permanent** on the server.
- Removed partners are **blocked from being re-imported**.
- The admin screen **refreshes from the server** after delete instead of trying to save a local list.
- Linked portal logins are **suspended** when a partner is removed.

**What to test:** Delete a test supplier → refresh the page → confirm it stays gone.

---

### Live site health check failing on publish

**Problem:** Build completes, but Replit marks the deployment as failed because `/api` and `/api/v2` return errors in the first second after startup.

**Why it happened:** Replit checks that both APIs are running **immediately** after launch. Our main API (Nest) takes about 1–2 seconds to finish loading all modules. During that window, the health check sees “not ready” and the promotion step fails — even though the app would work fine a moment later.

**Fix applied (code):**

- Both APIs now **open their ports right away** and answer health checks with a simple “starting up, OK” response.
- Full routes and features load in the background immediately after.
- Legacy API also responds on `/api` (not only `/api/healthz`), which is what Replit was probing.

**You still need:** `SESSION_SECRET` and Clerk keys in Replit Secrets. The **database URL is automatic** on Replit when the managed database is linked to your deployment — you do not copy it from `.env.local`.

**After you publish again**, deploy logs should show:

- `[api-server] port open (health probe ready)` within ~1 second  
- `[api-nest] port :8090 open (health probe ready)` within ~1 second  
- Both ports detected (`expected=2 detected=2`)  
- Then `[api-nest] ready` and `[api-server] ready`

---

## Security & trust improvements

| Area | Improvement |
|------|-------------|
| Activity log | Permanent server-side records; cannot be cleared from admin |
| Session security | Live site refuses to start with a default/guessable security key |
| Database | Live site refuses to start without a proper database connection |
| Partner delete | Removing a partner also suspends their portal access |
| Sensitive data in logs | Passwords and tokens are not stored in activity records |
| Who did what | Actions are tied to the signed-in person (admin, partner, customer, or guest) |

---

## Admin panel updates

- **Audit Log** — real data table with filters, detail view, export; no dummy or local-only data.
- **Suppliers / Clinics / Logistics** — consistent partner actions menu; reliable delete.
- **Partner summaries** — view employees, portal accounts, and KYC status from one place.

---

## Partner portal updates

- **Google sign-in** → registration form → pending approval flow (all three portal types).
- Clear **pending approval** message so partners know they must wait for admin review.
- Registration details flow into the same partner records admins manage.

---

## Going live on Replit — what you actually need to set

| Item | Do you set it manually? | Notes |
|------|-------------------------|-------|
| **Replit database** | **No** (usually) | Replit injects `DATABASE_URL` when your managed database is linked. In **Publishing → Production database settings**, make sure production database is enabled/linked. |
| **SESSION_SECRET** | **Yes** | Add in Replit **Secrets** (Deployments). Not provided by the database — needed for secure logins. |
| **Clerk keys** | **Yes** | For customer and partner sign-in (including Google). |
| **Paystack keys** | **Yes** | If checkout is enabled. |
| **Admin login** | **Yes** | `ADMIN_EMAIL` / `ADMIN_PASSWORD` or admin token. |

**Cursor vs Replit:** You code in Cursor and push to Replit. Your `.env.local` file stays on your machine — it is **not** sent to Replit. Replit uses its own environment (managed database URL + secrets you set in the Replit UI).

**If deploy says “no database”:** The database exists in Replit but may not be **linked to the published app**. Open Publishing → Production database → turn on / link production database, then republish.

---

## What still needs attention

| Item | Priority | Notes |
|------|----------|-------|
| Configure Replit production secrets | **High** | Blocks successful publish until done |
| Run partner delete test on live database | Medium | Confirm fix works on production data |
| Review pending partner applications | Ongoing | New Google registrations will queue for approval |
| Phase 2 analytics (demand forecasting, etc.) | Low | Not part of this update |

---

## Suggested checks before sharing with wider team

1. **Partners** — Add a test supplier, delete it, refresh — it should stay deleted.  
2. **Audit log** — Make a small change in admin, open Audit Log — a new entry should appear.  
3. **Partner Google sign-in** — Sign in on a portal, complete the registration form — “pending approval” should show.  
4. **Publish** — After secrets are set, publish and open the live site — storefront and admin should load without API errors.

---

## Summary for founders

We fixed a frustrating partner-delete bug, moved activity tracking to a proper permanent audit trail, and gave new partners a professional registration experience after Google sign-in. Security around sessions and logging is tighter. The main remaining blocker for going live is **configuring production secrets on Replit** — once that is done, publish should complete successfully.

---

*Shaniid RX — A Shaniid Group Company*  
*Questions about this update: share with your technical lead or development team.*
