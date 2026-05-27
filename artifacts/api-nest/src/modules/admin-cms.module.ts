/**
 * AdminCms module — generic key-value CMS store.
 *
 * Routes:
 *   GET    /api/v2/admin/cms/:key   — retrieve a CMS document by key
 *   PUT    /api/v2/admin/cms/:key   — upsert a CMS document
 *   DELETE /api/v2/admin/cms/:key   — remove a CMS document
 *
 * This module is the server-side counterpart to `her-kingdom/src/lib/cms-store.ts`.
 * The storefront's cmsStore:
 *   1. Returns localStorage snapshot immediately (zero-latency UI).
 *   2. GET /api/v2/admin/cms/:key in the background to hydrate from the server.
 *   3. PUT /api/v2/admin/cms/:key after every admin write (best-effort).
 *
 * Keys that power admin modules (non-exhaustive):
 *   banners, hero-banners, categories, popup-offer, website-settings,
 *   footer, custom-pages, message-templates, delivery-locations, …
 *
 * Local-only keys (never hit this endpoint — see cms-store.ts):
 *   audit-log, user-*, customer-*
 *
 * Postgres swap:
 *   Replace the in-memory `Map<key, unknown>` in CmsService with a
 *   Drizzle `upsert` against an `admin_cms (key TEXT PRIMARY KEY, value JSONB)`
 *   table. No client changes needed — the storefront's fetch URLs are identical.
 *
 * Note on @Inject(CmsService):
 *   tsx/esbuild does not emit emitDecoratorMetadata. Explicit @Inject(Token)
 *   is required on every controller constructor — project-wide rule.
 */
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Module,
  Param,
  Put,
  UseGuards,
} from "@nestjs/common"
import { AdminGuard } from "../common/admin-guard"

/**
 * Generic CMS key/value store backing the storefront's `cmsStore`.
 *
 * Every admin module whose data is a plain JSON document or list (banners,
 * announcement bar, popup offer, newsletter, custom pages, footer, blogs,
 * policies, website settings, audit log, message templates, etc.) goes
 * through this single module instead of getting its own NestJS module.
 *
 * Transactional modules with real domain logic (orders, payments, customers,
 * products, categories, prescriptions, consultations, …) ship their own
 * typed module — this is the catch-all for everything else.
 *
 * Wire format:
 *   GET    /api/v2/admin/cms          → string[] of known keys
 *   GET    /api/v2/admin/cms/:key     → { key, value, version, updatedAt } | 404
 *   PUT    /api/v2/admin/cms/:key     → body is raw JSON for `value`
 *   DELETE /api/v2/admin/cms/:key     → { ok: true }
 *
 * Persistence is in-process today; the Postgres swap is one file
 * (`sql/00_admin_cms.sql` — a single `admin_cms (key TEXT PRIMARY KEY, value
 * JSONB, version INT, updated_at TIMESTAMPTZ)` table).
 */

export type CmsEntry = {
  key: string
  value: unknown
  version: number
  updatedAt: string
}

@Injectable()
class AdminCmsService {
  private store = new Map<string, CmsEntry>()

  list(): string[] {
    return [...this.store.keys()].sort()
  }

  get(key: string): CmsEntry | null {
    return this.store.get(key) ?? null
  }

  put(key: string, value: unknown): CmsEntry {
    const existing = this.store.get(key)
    const next: CmsEntry = {
      key,
      value,
      version: (existing?.version ?? 0) + 1,
      updatedAt: new Date().toISOString(),
    }
    this.store.set(key, next)
    return next
  }

  remove(key: string): boolean {
    return this.store.delete(key)
  }
}

function assertKey(key: string) {
  if (!key || !/^[a-zA-Z0-9._\-:]+$/.test(key)) {
    throw new HttpException(
      "Invalid cms key (allowed: a-z A-Z 0-9 . _ - :)",
      HttpStatus.BAD_REQUEST,
    )
  }
}

@UseGuards(AdminGuard)
@Controller("admin/cms")
class AdminCmsController {
  constructor(@Inject(AdminCmsService) private readonly svc: AdminCmsService) {}

  @Get()
  list(): { keys: string[] } {
    return { keys: this.svc.list() }
  }

  @Get(":key")
  get(@Param("key") key: string) {
    assertKey(key)
    const entry = this.svc.get(key)
    if (!entry) throw new HttpException("Not found", HttpStatus.NOT_FOUND)
    return entry
  }

  @Put(":key")
  put(@Param("key") key: string, @Body() body: unknown) {
    assertKey(key)
    // The raw request body IS the value — no envelope. This lets the client
    // PUT `JSON.stringify(value)` directly without wrapping in `{ value: … }`.
    return this.svc.put(key, body)
  }

  @Delete(":key")
  remove(@Param("key") key: string) {
    assertKey(key)
    return { ok: this.svc.remove(key) }
  }
}

@Module({
  controllers: [AdminCmsController],
  providers: [AdminCmsService],
})
export class AdminCmsModule {}
