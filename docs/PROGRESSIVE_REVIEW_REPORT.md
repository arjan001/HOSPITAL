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

**Problem:** When publishing to Replit, the deployment sometimes fails with errors about the API not responding, even though the build completes successfully.

**What we found:**

- The **storefront** and **older API layer** start fine.
- The **main new API** (which powers prescriptions, partners, payments, audit log, etc.) was **not starting** because required production settings were missing on Replit.
- `.env.local` on a developer’s machine **does not** carry over to the live published app — secrets must be set separately in Replit.

**What we improved in code:**

- Clearer error messages when something required is missing (so logs are easier to read).
- A simple **health check** endpoint so Replit can confirm the API is running.
- Automatic database sync step during deploy.

**What still needs to be done (operations, not code):**  
Someone with Replit access must add the production secrets listed in the section below, then publish again.

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

## Going live on Replit — action needed

For the published (live) app to work, these must be set in **Replit → Secrets** for **Production / Deployments**:

| Setting | Why it matters |
|---------|----------------|
| **Database connection** | Stores orders, partners, prescriptions, audit log, etc. |
| **Session secret** | Keeps user and partner sessions secure |
| **Clerk keys** | Powers customer and partner sign-in (including Google) |
| **Paystack keys** | Powers payments (if checkout is enabled) |
| **Admin login** | Allows the team to access the admin panel on live |

After adding these, **publish again** and confirm the deploy logs show the main API as **running** (not exiting immediately).

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
