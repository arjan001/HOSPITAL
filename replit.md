# Shaniid RX

The trusted pharmaceutical infrastructure for Africa — a digital storefront and pharmacy back-office that connects verified suppliers, community pharmacies, and patients with genuine, fairly-priced medicine delivered to the door.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — legacy Express API (port 8080, `/api`)
- `pnpm --filter @workspace/api-nest run dev` — NestJS backend (port 8090, `/api/v2`)
- `pnpm --filter @workspace/shaniid run dev` — storefront / admin
- `pnpm run typecheck` / `pnpm run build` — typecheck / build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks + Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` (Postgres), `SESSION_SECRET` (api-nest fails to boot without it)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 (legacy) + NestJS 11 (`tsx watch`, CommonJS output)
- DB: PostgreSQL + Drizzle ORM (`@workspace/db` at `lib/db`); validation via Zod (`zod/v4`) + `drizzle-zod`
- API codegen: Orval; Build: esbuild (CJS bundle)
- Storefront/admin: Vite + React + wouter, SWR, shadcn/ui

## Where things live

- Storefront + admin app: `artifacts/her-kingdom/` (NestJS client: `src/lib/api-nest.ts`; shared types: `src/lib/types.ts`)
- Legacy Express API: `artifacts/api-server/`; NestJS backend: `artifacts/api-nest/` (`/api/v2`)
- Customer account dashboard: `src/pages/account/dashboard.tsx` (`/account`)
- CMS persistence seam: `src/lib/cms-store.ts` — **all** admin-managed content (banners, categories, popup, settings, pages, footer, templates, audit log) goes through `cmsStore` / `useCmsDoc(...)`. Never persist CMS data any other way.
- Admin nav + routes: `src/components/admin/admin-shell.tsx` + `src/App.tsx`. Sidebar is a tree; expand state persists in `localStorage["shaniidrx.admin.sidebarExpanded"]`.
- Sourcing sub-routes: `/admin/sourcing/{inventory,forecast,pricing,automation,performance}` (`components/admin/sourcing-pages.tsx`).
- Message templates (SMS/WhatsApp/Email): `components/admin/message-templates.tsx` (`/admin/integrations/templates`), persists via `cmsStore("message-templates")`, `{{token}}` interpolation.

## Architecture decisions

- **Customer auth = Clerk (May 2026).** ClerkProvider wraps the storefront. Sign-in/up at `/sign-in`, `/sign-up` (legacy `/account/login` etc. redirect in). **Guest checkout preserved** — only `/account*` requires sign-in. Server-side `clerkMiddleware()` is mounted in `api-server/src/app.ts`. CSS layer order in `index.css` is `theme, base, clerk, components, utilities`; Vite tailwind plugin runs `optimize: false` (required by `@clerk/themes/shadcn.css` — see clerk-auth skill).
- **Admin auth.** `AdminAuthModule` (`/api/v2/admin/auth/*`) checks `ADMIN_EMAIL`/`ADMIN_PASSWORD`, issues a token signed with `SESSION_SECRET` (verifiable without `ADMIN_API_TOKEN` env). `AdminGuard` fails **open in dev, closed in prod**. **To enable admin sign-in on the published app, set `ADMIN_EMAIL` + `ADMIN_PASSWORD` (and optionally `ADMIN_API_TOKEN`) as production secrets.** Multi-user admin roles are future work.
  - **Admin panel read-auth gap:** storefront admin fetchers must attach `adminAuthHeaders()` or they 503 in prod. Fixed for orders (`orders-store.ts`); cms-store / notifications / prescriptions fetchers still omit it.
- **NestJS strangler migration.** `api-nest` (`/api/v2`) serves customer + admin modules; legacy `/api` still backs storefront catalog/banners until ported. **All api-nest modules are Postgres-durable via Drizzle.** Session→user bridge: `common/session-user.ts` (`ensureUserId(sid)` upserts a `users` row with `clerkId = req.sessionId`); per-session entities resolve `userId` from it. When Clerk lands, swap `SessionMiddleware` to set `req.sessionId = clerkUserId` — services don't change.
  - Explicit `@Inject(ServiceClass)` on every controller constructor (tsx/esbuild emits no `emitDecoratorMetadata`). Don't add `ValidationPipe` without installing `class-validator` + `class-transformer`.
  - Server→server persistence goes through **service injection**, never an HTTP loopback to a guarded route (the loopback needs `ADMIN_API_TOKEN` and 502s without it). Guest/public flows must never be the source-of-truth writer to an admin-guarded route — mirror server-side instead (e.g. `OrdersService.create()` mirrors into `admin_orders` via `AdminOrdersService`).
- **Payments (Paystack only).** Legacy PayHero routes removed. Storefront uses `PaystackPaymentModal` (`/api/v2/payments/paystack/*`). KES `mobile_money.phone` MUST be E.164 with leading `+`. Never grant value on a client-supplied reference — verify server-side and bind to the order.
- **Supabase fully removed.** Legacy `/api/admin/*` + public `/api/*` back a no-op stub (`api-server/src/lib/legacy-store.ts`): empty reads, soft-error writes. Don't import from it; persist via `cmsStore`.
- **CMS internals.** Audit log auto-captures CMS writes via a `writeRaw` hook in `cms-store.ts`. Date bucketing uses UTC-day arithmetic (`dashboard.tsx → utcDayNumber`).

### api-nest subsystems (detail in code + `.agents/memory/`)

- **Live chat** (`/api/v2/chat`, realtime via SSE — no extra env/service). Postgres-durable threads/messages (`chat_threads`/`chat_messages`); only SSE subjects + presence are in-memory. Three surfaces (patient `/account/chat`, doctor inbox `/admin/chat` with Daily.co AV, `speak-to-a-doctor` funnel), one backend. Ending a consultation archives the thread (`status: active|archived` + `closedAt`, optional `consultationId` FK) and keeps every message as a saved transcript; a new message reopens it. Features: typing, presence, sent→delivered→read receipts, image/PDF attachments (8MB).
- **WhatsApp** (`/api/v2/notifications/whatsapp`): Meta Cloud API primary (Twilio fallback), auto-detected from creds (`WHATSAPP_PROVIDER` override). Env-gated, fails soft. Pipeline sends interpolated **text** within Meta's 24h window; proactive Meta **templates** need explicit ordered `variables`. Auto-send-on-trigger not yet wired.
- **Error reporting** (`@Global`, `/api/v2/admin/error-reporting/*`): forwards `error`/`fatal` events to Sentry + Slack, fail-soft, 60s per-fingerprint dedup. Secrets in env: `SENTRY_DSN`, `SLACK_WEBHOOK_URL` (+ optional `SENTRY_ENVIRONMENT`/`SENTRY_RELEASE`). Non-secret toggles in cmsStore `error-reporting`.
- **Storage** (`/api/v2/admin/storage/*`): pluggable `local` (default) / `s3` (any S3-compatible) / `cloudinary`, resolved live from cmsStore `storage`.provider → `STORAGE_PROVIDER` env, falls back to local if creds missing. Secrets in env (`S3_*`, `CLOUDINARY_*`). Secrets for both features stay in env, never cmsStore.
- **Resilience layer** (`src/common/`, mounted globally): sliding-window rate limit (`RATE_LIMIT_WINDOW_MS`/`RATE_LIMIT_MAX`; trust `x-forwarded-for` only when `TRUST_PROXY=1`); `AllExceptionsFilter` normalizes errors (adds `detail`+`stack` in dev only); `SESSION_SECRET` fails closed; SSRF guard on outbound fetches; storefront `ErrorBoundary` + non-silent data hooks.

### DB-schema discipline (REQUIRED)

Any change that adds/alters persisted data MUST land the matching Drizzle table + Zod schema in `packages/db` in the same change, then `pnpm --filter @workspace/db run push` (dev). `packages/db` is the single source of truth for production Postgres. Public/high-concurrency appends to a `cms_docs` JSON array must use CAS (createIfAbsent/putIfVersion + retry), not read-modify-write.

## Product

Storefront: catalogue, prescription upload, consultations, contact inquiries, popup offers, custom CMS pages, configurable footer.
Admin: dashboard (KPIs/sparklines/low-stock), products (CSV import/export, bulk delete), categories tree, banners CRUD, popup offer, website settings, custom pages, footer CMS, audit log, payments, prescriptions, consultations, contact inquiries.

## Brand (source of truth: SHANIID RX – BRAND BRIEF, 09.04.2026)

**Positioning.** Not "another pharmacy app." Shaniid RX is the **trust layer for medicine distribution** — community-driven and globally credible, affordable but dignified, accessible but world-class. Attribution: "Shaniid RX — A Shaniid Group Company."

**Brand promise (non-negotiable).** "If it comes through Shaniid RX, it is genuine, fairly priced, and delivered with integrity." Emotional territory = **Trust + Relief**.

**Personality.** A calm, competent pharmacist trusted by the community. Trustworthy · Responsible · Intelligent · Compassionate · Reliable.

**Voice.** Calm · Clear · Reassuring · Professional · Human. Not corporate, not slangy, not jargony. **60% authority, 40% warmth**. Tone by audience (values constant): Patients → warm/simple/reassuring; Pharmacies → professional/operational; Suppliers → strategic/data-driven; Regulators → formal/compliance-oriented.

**Visual language.**
- Approved metaphors: shield (anti-counterfeit), network (supply chain), hand + medicine (care + access), circle (community/trust), pathway/bridge (access/delivery).
- Avoid: generic medical crosses, heartbeat lines, Western-only metaphors, hype gradients / "AI vibe" surfaces, decorative cultural pastiche.
- Style: human-centered healthcare + clean tech minimalism — calm palette, strong typography, generous whitespace, confidence over decoration. Subtle Somali / East African / Islamic cues only when clarity and trust aren't compromised.

**Tagline candidates:** "Medicine You Can Trust. Delivered." · "Health in Every Home." · "Real Medicine, Right to Your Door." · "Trusted Care, Anytime, Anywhere."

**"Trust Seal" motif.** Verified medicines/suppliers carry a shield-based trust seal — surface on PDPs, listings, supplier cards.

**Cultural rules.** Respectful forms of address, modesty in imagery, recognition of family/community roles in healthcare, no aggressive sales language, no exploitative pricing copy.

## User preferences

- **Customer auth = Clerk.** Sign-in/up at `/sign-in`, `/sign-up`; guest checkout preserved — only `/account*` requires sign-in.
- **Visual style:** clean white / Medilazar-style for product surfaces (modals, cards). Wine `#3D0814` / `#6B0F1A` for brand chrome (header, hero, footer); orange/red `#F97316` / `#B91C1C` for CTAs. No emojis, no "AI vibe" gradients on content surfaces.
- **References:** MyDawa and Medilazar for pharmacy UX patterns.
- **Brand brief is the source of truth** for positioning, voice, and visual metaphors.

## Gotchas

- `/api/admin/products` PUT is **full-replace** — deletes `product_images` + `product_variations` then re-inserts. Never call with stale cached objects; use the per-row "Set qty" flow for bulk stock changes.
- `cmsStore` is the only path for admin-managed content; bypassing it loses auditability + clean NestJS migration.
- `lib/legacy-store.ts` stub returns chainable no-ops (`[]` reads, soft-error writes) — expected. Nothing in the panel should depend on those routes.
- Pre-existing repo-wide `tsc` errors live in `analytics-store`, `security.ts`, `traffic-classifier`, `contact-inquiries`, `pages/contact`, `tags.name` — out of scope; don't chase them when validating a focused change.

## Pointers

- `pnpm-workspace` skill — workspace structure, TypeScript setup, package details.
- `.agents/memory/` — durable lessons (payment trust gate, admin auth gap, cms concurrency, etc.).
- Brand brief PDF: `attached_assets/SHANIID_RX_-_BRAND_BRIEF__1778680863193.pdf`.
