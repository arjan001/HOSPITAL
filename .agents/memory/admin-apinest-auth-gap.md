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

**Server→server CMS writes must NOT use the HTTP loopback.** A public/server
module that needs to persist into cms_docs (newsletter, partners) should
`@Inject(AdminCmsService)` from `AdminCmsModule` and call `.get()/.put()`
directly — never `fetch("http://127.0.0.1:PORT/api/v2/admin/cms/...")`. The
loopback hits the AdminGuard-protected route, so it needs `ADMIN_API_TOKEN`; with
the token unset it 502s and `AllExceptionsFilter` masks it as "Internal server
error" (the real symptom behind the newsletter bug). Direct service injection
removes the token dependency and works in dev + prod. partners.module still uses
the old loopback and has the same latent failure — convert it the same way.

**Dev error visibility:** `AllExceptionsFilter` now appends `detail` + `stack`
to 5xx JSON responses when `NODE_ENV !== "production"` only; prod stays masked.
So a 5xx in dev shows the real cause instead of a bare "Internal server error".
