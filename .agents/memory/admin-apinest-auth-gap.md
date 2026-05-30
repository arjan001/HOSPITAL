---
name: Admin api-nest auth gap
description: Why /api/v2/admin/* calls work in dev but not production, and what a real fix needs.
---

The storefront's `nestFetch` (her-kingdom `lib/api-nest.ts`) sends only the
`shaniidrx_sid` cookie + `credentials:"include"` — it never attaches an admin
token. `AdminGuard` (api-nest `common/admin-guard.ts`) fails **open in dev**
(no token → env super-admin) but **closed in production** (NODE_ENV=production
or ADMIN_REQUIRE_TOKEN). So every admin api-nest surface (prescriptions,
storage, error-reporting, notifications) works in dev and silently 401/503s in
prod unless an auth strategy is wired.

**Why this isn't a one-line fix:** admin file routes are consumed as
`<img src>` / `<a href>` (e.g. `adminRxFileUrl(id,index)`), and browsers can't
attach custom headers to those requests. A correct fix needs either a
cookie-based admin session the guard accepts, or short-lived signed URLs for
file routes — not just adding a Bearer header to `nestFetch`.

**How to apply:** when making any admin api-nest feature production-ready, solve
auth at the transport layer for the whole `/api/v2/admin/*` surface at once;
don't bolt a header onto a single module. Treat dev success as no signal for
prod auth.
