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

**Guest checkout must NEVER be the source-of-truth writer to an admin-guarded
route.** The storefront wrote each order into the admin Sales & Orders feed via
`POST /api/v2/admin/orders` — a guest has no admin token, so in prod AdminGuard
fails closed and the (fire-and-forget) write is silently dropped → orders never
reach admin. Fix pattern: **mirror server-side**. `OrdersService.create()`
(`/me/orders`, session-authed, works in prod) `@Inject`s `AdminOrdersService` and
upserts into `admin_orders` (best-effort try/catch; status confirmed if `paid`
else pending). admin_orders is a SEPARATE table from customer `orders`, so no
collision. Same shape as the loopback→direct-injection rule above: server→server
goes through service injection, not an HTTP call to a guarded route.

**Read side, header-capable surface now closed:** every admin *list/mutate*
fetcher must spread `adminAuthHeaders()` (from `lib/api-client.ts`, reads
localStorage `shaniidrx.admin.token`) so the signed per-user admin token rides
along — the guard's path-2 verifies it WITHOUT `ADMIN_API_TOKEN` env. The fix is
now central: `nestFetch` (api-nest.ts) always spreads the header (harmless on
`/me/*` — guard only checks it on `/admin/*`), and `cms-store`,
`pipeline-client`, `notifications-client`, `bulk-import`, `payments`,
`admin-accounts`, `orders-store` all attach it. Note **two distinct token keys**:
api-nest uses `shaniidrx.admin.token` (DOT, via `adminAuthHeaders`); legacy
Express `lib/api.ts` uses `shaniidrx.admin-token` (HYPHEN) — don't cross them.

**Header-less channels solved via HttpOnly cookie:** admin chat SSE
(`chatStreamUrl("admin")` → `EventSource`) and admin file reads (`adminRxFileUrl`
via `<img>/<a>`) cannot set custom headers. Admin login now also sets an HttpOnly
`shaniidrx_admin_token` cookie (same signed token as localStorage), and AdminGuard
accepts it as a fallback after the header check. Same-origin browser requests send
it automatically (EventSource needs `{ withCredentials: true }`); SameSite=lax
keeps it off cross-site mutations so it's not a CSRF vector for non-GET admin
routes. **Why a cookie, not a query-param token:** query tokens leak into access
logs/referrers; the HttpOnly cookie does not, and it covers both SSE and `<img>`
in one mechanism. Proven prod-like (ADMIN_REQUIRE_TOKEN=1): cookie→200,
no-cookie→503 on both `/chat/admin/stream` and `/admin/orders`.
