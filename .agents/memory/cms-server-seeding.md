---
name: CMS server-side seeding & default-seed availability
description: How admin-managed CMS defaults reach the NestJS server, and why a server-side consumer can still find nothing for a never-edited key.
---

The storefront `cmsStore` (her-kingdom) is the editing surface for admin-managed
content; the NestJS `AdminCmsService` (api-nest) persists it to **Postgres
`cms_docs` via Drizzle** (durable — survives restart/deploy).

One non-obvious constraint any server-side CMS consumer must respect:

- **Default seeds reach the server only via a client read, not automatically.**
  `cmsStore` PUTs to `/api/v2/admin/cms/:key` on every admin *edit*, and also on
  first read when the server returns 404 (it pushes the local/default value up —
  see `hydrateFromServer`'s 404 branch + `isSeedable`). So a key whose default
  seed was never edited (e.g. `message-templates`) exists in `cms_docs` only
  after some admin page has *read* that key at least once. The row is durable
  once seeded; the gap is purely "never-seeded", not "lost on restart".

**Why:** server-side consumers (e.g. the Communications auto-send pipeline
resolving `message-templates` by trigger in `pipeline.module.ts`; the public
`newsletter` module appending to `newsletter-subscribers`) read these keys
server-side. For a never-seeded key they find nothing and skip — the 404-seed on
first client read makes defaults available without a manual edit.

**Production dependency:** the internal loopback CMS read/write path
(partners.module, newsletter.module → `http://127.0.0.1:PORT/api/v2/admin/cms`)
is AdminGuard-protected, so it needs `ADMIN_API_TOKEN` set in production (guard
fails open only in dev). Without it, those server-side cms_docs writes 502. See
`admin-apinest-auth-gap.md`.

**How to apply:** when adding a server-side consumer of cmsStore data, don't
assume the key exists — handle empty/404 gracefully. Persistence is Postgres now,
so a seeded key is durable; the only "missing" case is a default that no client
has read yet.
