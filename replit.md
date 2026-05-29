# Shaniid RX

The trusted pharmaceutical infrastructure for Africa — a digital storefront and pharmacy back-office that connects verified suppliers, community pharmacies, and patients with genuine, fairly-priced medicine delivered to the door.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the legacy Express API server (port 8080, mounted at `/api`)
- `pnpm --filter @workspace/api-nest run dev` — run the NestJS user backend (port 8090, mounted at `/api/v2`)
- `pnpm --filter @workspace/shaniid run dev` — run the storefront / admin
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
- Legacy Express API server: `artifacts/api-server/`
- **NestJS user backend (new):** `artifacts/api-nest/` — mounted at `/api/v2`. Cookie-based guest session today (Clerk-ready); per-session in-memory repos for profile/addresses/wishlist/orders. Swap to Postgres by replacing `InMemoryRepository<T>` in `src/common/repository.ts` with a Drizzle-backed implementation — no other code changes needed.
- Storefront client for the NestJS backend: `artifacts/her-kingdom/src/lib/api-nest.ts`
- Customer account dashboard: `artifacts/her-kingdom/src/pages/account/dashboard.tsx` (route `/account`)
- CMS persistence layer (single seam for future NestJS swap): `artifacts/her-kingdom/src/lib/cms-store.ts`
  - All admin-managed content (banners, categories, popup offer, website settings, custom pages, footer, audit log, etc.) goes through `cmsStore` / `useCmsDoc(...)`. Never persist CMS data directly.
- Admin nav + routes: `artifacts/her-kingdom/src/components/admin/admin-shell.tsx` and `src/App.tsx`
  - Sidebar uses a tree (`NavGroup → NavNode → children?: NavNode[]`). Expandable parents persist their open/closed state in `localStorage["shaniidrx.admin.sidebarExpanded"]`. Order = visual hierarchy — Overview/Sales/Pharmacy/Catalog up top, Marketing intentionally last.
  - Sourcing and Integrations are parent groups with their own children (sub-routes), so internal tab strips don't have to overflow horizontally.
- Sourcing sub-routes: `/admin/sourcing/{inventory,forecast,pricing,automation,performance}` (thin wrappers in `components/admin/sourcing-pages.tsx` around the existing `Sourcing*Tab` components).
- Marketing message templates (SMS / WhatsApp / Email): `components/admin/message-templates.tsx` at `/admin/integrations/templates`. Persists via `cmsStore("message-templates")`. Permission-gated by `integrations.manage`. Variables use `{{token}}` interpolation; sample preview built in.
- Shared types: `artifacts/her-kingdom/src/lib/types.ts`

## Architecture decisions

- **Customer auth = Clerk (May 2026).** ClerkProvider wraps the storefront in `App.tsx`. Routes `/sign-in/*?` and `/sign-up/*?` host Clerk's hosted-style components inline (branded with the wine/orange palette + `public/logo.svg`). Legacy routes `/account/login`, `/account/register`, `/account/verify-phone`, `/account/email-verified` redirect to `/sign-in` or `/sign-up`. **Guest checkout is preserved** — `/checkout` is not gated. Only `/account`, `/account/dashboard`, and `/account/settings` require sign-in (via `<ProtectedAccount>` → `<Show when="signed-in">` + `<Redirect to="/sign-in">`). Server-side: `clerkMiddleware()` is mounted in `api-server/src/app.ts` between the Clerk proxy and the API router. CSS layer order in `index.css` is `theme, base, clerk, components, utilities` and Vite's tailwind plugin runs with `optimize: false` (required by `@clerk/themes/shadcn.css` — see clerk-auth skill).
- **PayHero M-Pesa STK Push (May 2026).** Implemented at `artifacts/api-server/src/routes/api/payments/payhero.ts`, mounted at `/api/payments/payhero/{stk,status,callback}`. Uses `PAYHERO_BASIC_AUTH_TOKEN` (preferred) or `PAYHERO_API_USERNAME` + `PAYHERO_API_PASSWORD`, plus `PAYHERO_CHANNEL_ID`, `PAYHERO_CALLBACK_URL`. State is an in-memory `Map<orderNumber, PaymentRecord>` — swap to Drizzle when the orders module ports to NestJS. Storefront flow: `MpesaPaymentModal` (now in brand wine/orange, was the green M-Pesa palette) calls these routes from `checkout-page.tsx`.
- **NestJS user backend (May 2026).** New artifact `api-nest` runs at `/api/v2` alongside the legacy Express server. Strangler migration: customer modules (profile, addresses, wishlist, orders) are served by NestJS today; legacy `/api` keeps backing the storefront catalog/banners until those modules port over. Repository layer is in-memory + Clerk-pending session — see the dedicated section below.
- **Supabase has been fully removed (May 2026).** All admin-managed content lives in `cmsStore` (browser localStorage today, NestJS later). The legacy `/api/admin/*` and public `/api/*` routes still exist but back onto a no-op stub in `artifacts/api-server/src/lib/legacy-store.ts` that returns empty reads / soft-error writes — they're scheduled to be deleted as the NestJS port lands. Do **not** add new code that imports from the supabase stubs; persist via `cmsStore` instead.
- **No real auth backend yet.** `requireAdmin` is a pass-through; `admin-shell.tsx` hardcodes the local super-admin. Customer auth = Clerk (planned). Admin auth = TBD with the NestJS port.
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

- **Customer auth = Clerk** (shipped May 2026). Sign-in/sign-up live at `/sign-in` and `/sign-up`; legacy `/account/login` etc. redirect into them. Guest checkout is preserved — only the `/account` dashboard area requires sign-in.
- **Visual style:** clean white / Medilazar-style for product surfaces (modals, cards). Wine palette `#3D0814` / `#6B0F1A` reserved for primary brand chrome (header, hero, footer band); orange/red accent `#F97316` / `#B91C1C` for CTAs. No emojis, no "AI vibe" gradients on content surfaces.
- **References:** MyDawa and Medilazar for pharmacy UX patterns.
- **Brand brief is the source of truth** for positioning, voice, and visual metaphors — anchor copy and design choices to the section above, not to ad-hoc inspiration.

## NestJS api-nest (`/api/v2`)

- **Stack:** NestJS 11 + Express + cookie-parser, run via `tsx watch`. CommonJS module output to keep DI/decorator metadata simple.
- **Why explicit `@Inject(ServiceClass)` on every controller constructor:** `tsx`/esbuild does NOT emit `emitDecoratorMetadata`, so Nest can't infer constructor types. Explicit `@Inject()` removes the dependency on metadata. Keep this pattern when adding new modules.
- **Session model.** `SessionMiddleware` issues a `shaniidrx_sid` cookie per browser and writes `req.sessionId`. All services read from `req.sessionId`. When Clerk lands, replace the middleware body with a JWT verifier that sets `req.sessionId = clerkUserId` — services don't change.
- **Database swap.** Each service uses either `Map<sid, T[]>` directly (profile) or the generic `InMemoryRepository<T>` in `src/common/repository.ts`. Postgres swap = implement the same surface against Drizzle (`packages/db`) and swap the import in each module. No controller changes.
- **Don't add `ValidationPipe`** unless you also install `class-validator` + `class-transformer`. Today each controller validates inputs manually; future Zod DTOs go through `nestjs-zod`.
- **Modules shipped:** `health`, `profile` (`/me`), `addresses` (`/me/addresses`), `wishlist` (`/me/wishlist`), `orders` (`/me/orders`), `paystack` (`/payments/paystack/{charge,status,callback}`). Cart, prescriptions, consultations, and admin modules are pending.

### Resilience & abuse protection (api-nest)

This is the documented "settings"/hardening layer that protects every `/api/v2` route, **including admin/settings endpoints as they port over**. All of it lives in `src/common/` and is mounted globally so new modules inherit it for free.

- **Rate limiting / bot protection — `src/common/rate-limit.middleware.ts`.** Sliding-window in-memory counter applied to *all* `/api/v2` traffic.
  - **Tunables (env):** `RATE_LIMIT_WINDOW_MS` (default `60000`), `RATE_LIMIT_MAX` (default `600` req/window). Sized for the ~1000-users/hour target with headroom for normal browsing + admin work; lower `RATE_LIMIT_MAX` to clamp down harder on bots.
  - **Client identity (anti-spoofing).** `x-forwarded-for` is only trusted when `TRUST_PROXY=1` (set this in deployment, where Replit's proxy sets the header). Otherwise the key is the raw socket address, which a client cannot forge. The signed `shaniidrx_sid` cookie is folded into the key so a shared NAT/egress IP can't starve every user behind it — and because the cookie is signed it can't be forged to dodge a limit.
  - **Response contract.** Sets `X-RateLimit-Limit/Remaining/Reset` on every response; on breach returns `429` with `Retry-After` and a friendly JSON error.
  - **Scaling note.** Single-instance store. When scaling horizontally, swap the backing `Map` for Redis behind the same middleware surface — no controller changes.
- **Global error handling — `AllExceptionsFilter`.** Catches everything, normalizes to a stable JSON shape (`statusCode`, `error`, `timestamp`), and avoids leaking internals. New modules don't need their own try/catch plumbing for the response shape.
- **Session secret fails closed.** `SESSION_SECRET` is required to sign the sid cookie; the app refuses to start with an unsigned/insecure session rather than silently degrading.
- **SSRF guard.** Outbound fetches (e.g. payment callbacks) validate the target host before calling.
- **Front-end safety net.** Storefront wraps routes in an `ErrorBoundary`; data hooks surface non-silent errors (e.g. wishlist, shop product list) with explicit loading/error/empty UI instead of blank or misleading states.

### DB-schema discipline (REQUIRED for any follow-up change)

**Any change that adds or alters persisted data MUST land the matching schema in `packages/db` in the same change** — even while a module is still on the in-memory repo. The in-memory repos (`InMemoryRepository<T>` / `Map<sid, T[]>`) are deliberately shaped to mirror the eventual Drizzle tables, so:
- New entity/field → add/extend the Drizzle table + Zod schema in `packages/db` first, then mirror the shape in the in-memory repo.
- Run `pnpm --filter @workspace/db run push` (dev) to apply, and regenerate API types via `pnpm --filter @workspace/api-spec run codegen` when the OpenAPI surface changes.
- Never let the runtime shape drift from `packages/db`; the Postgres swap depends on them staying identical.

## Gotchas

- `/api/admin/products` PUT is full-replace and deletes `product_images` + `product_variations` before re-inserting from the request body. Don't call it with stale cached objects, and don't use it for bulk partial updates.
- `cmsStore` is the only path for admin-managed content. Anything that bypasses it won't be auditable and won't migrate to NestJS cleanly.
- A handful of pre-existing repo-wide `tsc` errors live in `analytics-store`, `security.ts`, `traffic-classifier`, `contact-inquiries`, `pages/contact`, and `tags.name` — out of scope for current admin work; don't chase them when validating a focused change. (`supabase-data.ts` is gone; the type it exported, `CategorySeoMeta`, now lives inline in `components/store/category-intro.tsx`.)
- The `lib/legacy-store.ts` stub on the API server returns chainable no-ops. Hitting an admin route from the UI will return `[]` for reads and `{ error: "Backend disabled…" }` for writes — that's expected. Nothing in the panel should depend on those routes; persist via `cmsStore`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
- Brand brief PDF: `attached_assets/SHANIID_RX_-_BRAND_BRIEF__1778680863193.pdf`.
