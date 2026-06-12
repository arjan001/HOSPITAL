/**
 * AdminCms module — generic key-value CMS store (Postgres-backed).
 *
 * Routes:
 *   GET    /api/v2/admin/cms        — list known keys
 *   GET    /api/v2/admin/cms/:key   — retrieve a CMS document by key
 *   PUT    /api/v2/admin/cms/:key   — upsert a CMS document (raw body IS the value)
 *   DELETE /api/v2/admin/cms/:key   — remove a CMS document
 *
 * This is the server-side counterpart to `her-kingdom/src/lib/cms-store.ts`.
 * Every admin module whose data is a plain JSON document or list (banners,
 * announcement bar, popup offer, newsletter, custom pages, footer, blogs,
 * policies, website settings, message templates, sourcing/qa/logistics state,
 * etc.) round-trips through this single module — so a single durable table makes
 * ALL of that content survive restarts and deploys.
 *
 * Persistence: PostgreSQL via Drizzle (`@workspace/db` → `cms_docs`).
 *   cms_docs(key TEXT PK, value JSONB, version INT, updated_at TIMESTAMPTZ)
 *
 * Note on @Inject(AdminCmsService):
 *   tsx/esbuild does not emit emitDecoratorMetadata. Explicit @Inject(Token) on
 *   every controller constructor is required — project-wide rule.
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
  Req,
  UseGuards,
} from "@nestjs/common"
import { and, asc, eq, sql } from "drizzle-orm"
import { db, cmsDocs } from "@workspace/db"
import { AdminGuard, AnyAdmin } from "../common/admin-guard"
import { hasPermission } from "../common/admin-permissions"
import type { Request } from "express"

export type CmsEntry = {
  key: string
  value: unknown
  version: number
  updatedAt: string
}

function toEntry(row: typeof cmsDocs.$inferSelect): CmsEntry {
  return {
    key: row.key,
    value: row.value,
    version: row.version,
    updatedAt: row.updatedAt.toISOString(),
  }
}

@Injectable()
export class AdminCmsService {
  /**
   * Best-effort snapshot for SYNCHRONOUS callers (storage provider resolver,
   * error-reporting toggles). Postgres remains the source of truth — this only
   * serves callers that cannot await, and is refreshed from the DB on access.
   */
  private cache = new Map<string, unknown>()

  async list(): Promise<string[]> {
    const rows = await db.select({ key: cmsDocs.key }).from(cmsDocs).orderBy(asc(cmsDocs.key))
    return rows.map((r) => r.key)
  }

  async get(key: string): Promise<CmsEntry | null> {
    const rows = await db.select().from(cmsDocs).where(eq(cmsDocs.key, key)).limit(1)
    const entry = rows[0] ? toEntry(rows[0]) : null
    if (entry) this.cache.set(key, entry.value)
    return entry
  }

  /**
   * Synchronous read for non-awaitable contexts. Returns the last-known value
   * immediately and kicks off a background refresh from Postgres.
   */
  getCachedValue(key: string): unknown {
    void this.get(key).catch(() => undefined)
    return this.cache.get(key)
  }

  async put(key: string, value: unknown): Promise<CmsEntry> {
    // jsonb is NOT NULL; an empty PUT body coerces to JSON null which the column
    // rejects, so normalise undefined → null and store JSON null explicitly.
    const v = value === undefined ? null : value
    const rows = await db
      .insert(cmsDocs)
      .values({ key, value: v, version: 1 })
      .onConflictDoUpdate({
        target: cmsDocs.key,
        set: { value: v, version: sql`${cmsDocs.version} + 1`, updatedAt: new Date() },
      })
      .returning()
    this.cache.set(key, v)
    return toEntry(rows[0])
  }

  /**
   * Insert a brand-new key only if it does not already exist. Returns the new
   * entry, or `null` when another writer created the key first (caller retries).
   * Used for lost-update-safe writes to JSON-array documents (e.g. newsletter).
   */
  async createIfAbsent(key: string, value: unknown): Promise<CmsEntry | null> {
    const v = value === undefined ? null : value
    const rows = await db
      .insert(cmsDocs)
      .values({ key, value: v, version: 1 })
      .onConflictDoNothing({ target: cmsDocs.key })
      .returning()
    if (!rows[0]) return null
    this.cache.set(key, v)
    return toEntry(rows[0])
  }

  /**
   * Optimistic-concurrency update: only writes when the row is still at
   * `expectedVersion`. Returns the updated entry, or `null` on a version
   * mismatch (someone else wrote first — caller should re-read and retry).
   */
  async putIfVersion(key: string, value: unknown, expectedVersion: number): Promise<CmsEntry | null> {
    const v = value === undefined ? null : value
    const rows = await db
      .update(cmsDocs)
      .set({ value: v, version: sql`${cmsDocs.version} + 1`, updatedAt: new Date() })
      .where(and(eq(cmsDocs.key, key), eq(cmsDocs.version, expectedVersion)))
      .returning()
    if (!rows[0]) return null
    this.cache.set(key, v)
    return toEntry(rows[0])
  }

  async remove(key: string): Promise<boolean> {
    const rows = await db.delete(cmsDocs).where(eq(cmsDocs.key, key)).returning({ key: cmsDocs.key })
    this.cache.delete(key)
    return rows.length > 0
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

/**
 * Maps CMS document keys (or key prefixes) to the admin permission required
 * to write/delete them. Any key not listed here requires no specific permission
 * beyond a valid admin token (AnyAdmin). Super-admins always pass.
 */
const CMS_WRITE_PERM: Record<string, string> = {
  "hero-slides":      "cms.banners",
  "promo-banners":    "cms.banners",
  "announcement":     "cms.banners",
  "navbar-offers":    "cms.banners",
  "popup-offer":      "cms.banners",
  "custom-pages":     "cms.pages",
  "footer":           "cms.footer",
  "website-settings": "cms.settings",
  "store-settings":   "cms.settings",
  "categories":       "categories.manage",
  "roles":            "roles.manage",
  "staff":            "users.manage",
  "message-templates":"integrations.manage",
  "error-reporting":  "integrations.manage",
  "storage":          "integrations.manage",
  "clinics":          "sourcing.manage",
  "suppliers":        "sourcing.manage",
  "logistics-partners":"sourcing.manage",
}

function assertCmsWritePerm(key: string, req: Request): void {
  const adminUser = (req as any).adminUser as { permissions?: string[]; role?: string } | undefined
  const perms = adminUser?.permissions ?? []
  const required = CMS_WRITE_PERM[key]
  if (!required) return // no specific perm needed beyond AnyAdmin
  if (!hasPermission(perms, required)) {
    throw new HttpException(
      `Permission denied — '${required}' is required to modify '${key}'`,
      HttpStatus.FORBIDDEN,
    )
  }
}

@UseGuards(AdminGuard)
@AnyAdmin()
@Controller("admin/cms")
class AdminCmsController {
  constructor(@Inject(AdminCmsService) private readonly svc: AdminCmsService) {}

  @Get()
  async list(): Promise<{ keys: string[] }> {
    return { keys: await this.svc.list() }
  }

  @Get(":key")
  async get(@Param("key") key: string) {
    assertKey(key)
    const entry = await this.svc.get(key)
    if (!entry) throw new HttpException("Not found", HttpStatus.NOT_FOUND)
    return entry
  }

  @Put(":key")
  async put(@Param("key") key: string, @Body() body: unknown, @Req() req: Request) {
    assertKey(key)
    assertCmsWritePerm(key, req)
    // The raw request body IS the value — no envelope. This lets the client
    // PUT `JSON.stringify(value)` directly without wrapping in `{ value: … }`.
    return this.svc.put(key, body)
  }

  @Delete(":key")
  async remove(@Param("key") key: string, @Req() req: Request) {
    assertKey(key)
    assertCmsWritePerm(key, req)
    return { ok: await this.svc.remove(key) }
  }
}

/**
 * Storefront-public CMS keys. These documents power content shown to *every*
 * visitor — logged-out shoppers included: the announcement bar, top-nav
 * offers, category menu, hero/promo banners, popup offer, footer, and custom
 * pages. They are served READ-ONLY through the unauthenticated
 * `GET /api/v2/cms/:key` route below. Anything NOT in this set stays behind
 * AdminGuard (audit log, message templates, settings, roles, error/storage
 * config, etc.). Writes for these keys still require an admin token via the
 * guarded PUT on AdminCmsController — only reads are public.
 */
export const PUBLIC_CMS_KEYS: ReadonlySet<string> = new Set([
  "announcement",
  "navbar-offers",
  "categories",
  "hero-slides",
  "promo-banners",
  "popup-offer",
  "footer",
  "custom-pages",
])

@Controller("cms")
export class PublicCmsController {
  constructor(@Inject(AdminCmsService) private readonly svc: AdminCmsService) {}

  /** The keys that are publicly readable (storefront display content). */
  @Get()
  publicKeys(): { keys: string[] } {
    return { keys: [...PUBLIC_CMS_KEYS] }
  }

  /**
   * Read a single storefront-public CMS document. Only allowlisted keys are
   * reachable; anything else 404s exactly as if it did not exist, so this
   * route can never surface admin-only content without a token.
   */
  @Get(":key")
  async get(@Param("key") key: string) {
    assertKey(key)
    if (!PUBLIC_CMS_KEYS.has(key)) {
      throw new HttpException("Not found", HttpStatus.NOT_FOUND)
    }
    const entry = await this.svc.get(key)
    if (!entry) throw new HttpException("Not found", HttpStatus.NOT_FOUND)
    return entry
  }
}

@Module({
  controllers: [AdminCmsController, PublicCmsController],
  providers: [AdminCmsService],
  exports: [AdminCmsService],
})
export class AdminCmsModule {}
