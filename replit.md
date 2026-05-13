# Shaniid RX

The trusted pharmaceutical infrastructure for Africa — a digital storefront and pharmacy back-office that connects verified suppliers, community pharmacies, and patients with genuine, fairly-priced medicine delivered to the door.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/her-kingdom run dev` — run the storefront / admin
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Storefront/admin: Vite + React + wouter, SWR for data, shadcn/ui

## Where things live

- Storefront + admin app: `artifacts/her-kingdom/`
- API server: `artifacts/api-server/`
- CMS persistence layer (single seam for future NestJS swap): `artifacts/her-kingdom/src/lib/cms-store.ts`
  - All admin-managed content (banners, categories, popup offer, website settings, custom pages, footer, audit log, etc.) goes through `cmsStore` / `useCmsDoc(...)`. Never persist CMS data directly.
- Admin nav + routes: `artifacts/her-kingdom/src/components/admin/admin-shell.tsx` and `src/App.tsx`
- Shared types: `artifacts/her-kingdom/src/lib/types.ts`

## Architecture decisions

- **One CMS seam.** Every admin module reads/writes through `cmsStore` so the entire admin can swap to a NestJS-backed API in one file later.
- **Audit log auto-captures CMS writes** via a `writeRaw` hook in `cms-store.ts`; consumers use a cached snapshot to avoid `useSyncExternalStore` loops.
- **Server PUT `/api/admin/products` is a full-replace** that rewrites images and variations. Never call it from cached list data — bulk stock changes must use the per-row "Set qty" flow (or a future scoped PATCH endpoint) to avoid wiping nested data.
- **Date bucketing uses UTC-day arithmetic** (see `dashboard.tsx → utcDayNumber`) so day boundaries don't shift for non-UTC users.

## Product

Storefront: catalogue, prescription upload, consultations, contact inquiries, popup offers, custom CMS pages, configurable footer.
Admin: dashboard with KPIs/sparklines/low-stock alerts, products (with CSV import/export and bulk delete), categories tree, banners (hero/promo/navbar) CRUD, popup offer, website settings (brand/contact/social/SEO/commerce/hours/flags), custom pages, footer CMS, audit log, payments, prescriptions, consultations, contact inquiries.

## Brand (source of truth: SHANIID RX – BRAND BRIEF, 09.04.2026)

**Positioning.** Not "another pharmacy app." Shaniid RX is the **trust layer for medicine distribution** — community-driven and globally credible, affordable but dignified, accessible but world-class. Short-term attribution: "Shaniid RX — A Shaniid Group Company."

**Brand promise (non-negotiable).** "If it comes through Shaniid RX, it is genuine, fairly priced, and delivered with integrity." Emotional territory = **Trust + Relief**.

**Personality.** A calm, competent pharmacist trusted by the community. Trustworthy · Responsible · Intelligent · Compassionate · Reliable.

**Voice.** Calm · Clear · Reassuring · Professional · Human. Not corporate, not slangy, not jargony. Target balance: **60% authority, 40% warmth**. Tone shifts by audience but values stay constant:
- Patients → warm, simple, reassuring
- Pharmacies → professional, operational
- Suppliers → strategic, data-driven
- Regulators → formal, compliance-oriented

**Visual language.**
- Approved metaphors: shield (protection from counterfeit), network (connected supply chain), hand + medicine (care + access), circle (community, trust), pathway/bridge (access, delivery).
- Avoid: generic medical crosses, heartbeat lines, Western-only metaphors, hype gradients / "AI vibe" surfaces, decorative cultural pastiche.
- Style: human-centered healthcare + clean tech minimalism — calm palette, strong typography, generous whitespace, visual confidence over decoration. Subtle Somali / East African / Islamic cues are welcome only when clarity and trust are not compromised.

**Tagline candidates** (use as headlines/CTA copy until one is locked):
"Medicine You Can Trust. Delivered." · "Health in Every Home." · "Real Medicine, Right to Your Door." · "Trusted Care, Anytime, Anywhere."

**"Trust Seal" motif.** Verified medicines/suppliers should carry a clear trust seal (shield-based). Worth surfacing on PDPs, listings, and supplier cards as the brand matures.

**Cultural rules.** Respectful forms of address, modesty in imagery, recognition of family/community roles in healthcare decisions, no aggressive sales language, no exploitative pricing copy.

## User preferences

- **Customer auth (login/registration): use Clerk.** To be implemented later as a dedicated task. Until then, leave the placeholder `/account/login`, `/account/register`, `/account/verify-phone`, `/account/email-verified` routes in place — do not build a custom auth flow.
- **Visual style:** clean white / Medilazar-style for product surfaces (modals, cards). Wine palette `#3D0814` / `#6B0F1A` reserved for primary brand chrome (header, hero, footer band); orange/red accent `#F97316` / `#B91C1C` for CTAs. No emojis, no "AI vibe" gradients on content surfaces.
- **References:** MyDawa and Medilazar for pharmacy UX patterns.
- **Brand brief is the source of truth** for positioning, voice, and visual metaphors — anchor copy and design choices to the section above, not to ad-hoc inspiration.

## Gotchas

- `/api/admin/products` PUT is full-replace and deletes `product_images` + `product_variations` before re-inserting from the request body. Don't call it with stale cached objects, and don't use it for bulk partial updates.
- `cmsStore` is the only path for admin-managed content. Anything that bypasses it won't be auditable and won't migrate to NestJS cleanly.
- A handful of pre-existing repo-wide `tsc` errors live in `analytics-store`, `security.ts`, `supabase-data`, `traffic-classifier`, `contact-inquiries`, `pages/contact`, and `tags.name` — out of scope for current admin work; don't chase them when validating a focused change.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
- Brand brief PDF: `attached_assets/SHANIID_RX_-_BRAND_BRIEF__1778680863193.pdf`.
