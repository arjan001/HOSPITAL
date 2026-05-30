---
name: CMS server-side seeding & auto-send template availability
description: How admin-managed CMS defaults reach the NestJS server, and why server-side consumers (auto-send pipeline) can still find nothing.
---

The storefront `cmsStore` (her-kingdom) is the source of truth for admin-managed
content; the NestJS `AdminCmsService` (api-nest) is an **in-memory `Map`** mirror.

Two non-obvious constraints any server-side CMS consumer must respect:

1. **Default seeds reach the server only via a client read, not automatically.**
   `cmsStore` PUTs to `/api/v2/admin/cms/:key` on every admin *edit*, and now
   also on first read when the server returns 404 (it pushes the local/default
   value up — see `hydrateFromServer`'s 404 branch + `isSeedable`). So a key
   whose default seed was never edited (e.g. `message-templates`) is present on
   the server only after some admin page has *read* that key at least once.

2. **The server CMS is in-memory and resets on restart/deploy.** After a restart
   the server has no CMS docs until a client read re-seeds them. So server-side
   features that resolve CMS data (the Communications auto-send pipeline resolving
   message templates by trigger in `pipeline.module.ts`) only work once an admin
   has loaded the relevant panel since the last restart.

**Why:** auto-send (patient WhatsApp on prescription/order events) reads
`message-templates` server-side; before the 404-seed it found nothing and
skipped every send. The 404-seed makes defaults available without a manual edit.

**How to apply:** when adding a server-side consumer of cmsStore data, don't
assume the key exists. Handle empty/404 gracefully, and remember a full restart
empties it until a client re-seeds. The durable fix for restart-survival is the
documented Postgres swap of `AdminCmsService` (one file).
