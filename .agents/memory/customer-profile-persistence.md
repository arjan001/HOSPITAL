---
name: Customer profile persistence
description: Where the customer profile (name/phone/DOB/health/prefs) lives and the one rule for editing/reusing it.
---

# Customer profile is backend-durable per session, not a cms_doc

The customer profile editor (`/account/settings`) and every surface that reuses
identity (prescription recipient, checkout, consultations) must read/write the
NestJS profile at `/api/v2/me` (`useMe()` / `apiNest.updateMe`), NOT a cms_docs
doc. First-class columns on `users`: fullName, email, phone, dateOfBirth; the rest
(firstName/lastName/gender/language/country/health/notifications/security) live in
the `users.profile` jsonb (`ProfileDetails` in `@workspace/db`).

**Why:** settings.tsx originally wrote to a SINGLE GLOBAL cms doc
("customer-profile") with dummy defaults — every signed-in user shared and
overwrote one record, and nothing persisted to the backend, so phone/DOB were
re-entered everywhere.

**How to apply:**
- On edit, merge into existing `users.profile` (don't clobber sibling keys); when
  the form supplies first/last, derive `fullName` so the first-class column stays
  consistent.
- When reusing identity on another surface, prefill from `useMe()` first, fall
  back to Clerk (`useUser()`), and fill blank fields ONLY (let the user override /
  prescribe for someone else).
- Seed the settings draft ONCE after both Clerk and `/me` settle, or you flash
  empty/other data and can clobber edits.
- Scope is still keyed to the signed session cookie (clerkId == sessionId bridge);
  true Clerk-verified per-account scoping across devices is future work.
