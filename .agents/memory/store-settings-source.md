---
name: store-settings operational source
description: Which settings surface is authoritative and how the storefront consumes it
---

# store-settings is the operational settings source

The main admin **Settings** page persists to the `cms_docs` key `store-settings` (snake_case JSON, via `cmsStore`/`useCmsDoc`). `/api/site-data` (api-server) reads that doc and merges it **over** the `dev-fixtures` defaults (`{...baseSettings, ...overrides}`), failing soft to fixtures. The storefront consumes `/api/site-data` for operational values (free shipping, whatsapp, maintenance_mode, social/footer) and SEO/head fields (title/description/keywords/favicon via the `SiteHead` component in `App.tsx`).

**Why:** Before this rework there were two dead paths — the Settings page wrote to a no-op legacy `/api/admin/settings` (removed), and `website-settings` saved to cms but nothing consumed it. `store-settings` is now the single operational source actually read by the storefront. The separate `website-settings` page remains as an advanced editor; field overlap with `store-settings` is accepted, not unified.

**How to apply:** Add a new operational/SEO setting → extend `STORE_SETTINGS_DEFAULTS` (snake_case) in `settings.tsx`, surface a field, and make sure a storefront consumer reads it from `/api/site-data` (else it's a saved-but-dead field). Never reintroduce a `/api/admin/settings` route — it's a legacy-store no-op stub.
