/**
 * Wishlist module — customer saved-products list (Postgres-backed).
 *
 * Routes (all scoped to the session cookie / req.sessionId):
 *   GET    /api/v2/me/wishlist               — list wishlist items for the session
 *   POST   /api/v2/me/wishlist               — add a product slug to the wishlist
 *   DELETE /api/v2/me/wishlist/:productSlug  — remove an item by product slug
 *
 * Data model:
 *   Rows in `wishlist_items` keyed by `userId` (resolved from the session via
 *   common/session-user.ts). One entry per (userId, productSlug) — duplicate
 *   adds are no-ops. Product name / price are resolved from the catalog by the
 *   storefront, so they are stored empty here and the API response keeps the
 *   original `{ id: productSlug, productSlug, addedAt }` shape (id == slug).
 *
 * Note on @Inject(WishlistService):
 *   tsx/esbuild does not emit emitDecoratorMetadata — explicit @Inject(Token) on
 *   every controller constructor is a project-wide rule.
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
  Post,
  Req,
} from "@nestjs/common"
import type { Request } from "express"
import { and, asc, eq } from "drizzle-orm"
import { db, wishlistItems } from "@workspace/db"
import { ensureUserId } from "../common/session-user"
import { newId } from "../common/repository"

export type WishlistItem = {
  id: string // == productSlug for natural dedupe (preserves the legacy API)
  productSlug: string
  addedAt: string
}

@Injectable()
class WishlistService {
  async list(sid: string): Promise<WishlistItem[]> {
    const uid = await ensureUserId(sid)
    const rows = await db
      .select()
      .from(wishlistItems)
      .where(eq(wishlistItems.userId, uid))
      .orderBy(asc(wishlistItems.addedAt))
    return rows.map((r) => ({ id: r.productSlug, productSlug: r.productSlug, addedAt: r.addedAt.toISOString() }))
  }

  async add(sid: string, productSlug: string): Promise<WishlistItem> {
    if (!productSlug || typeof productSlug !== "string") {
      throw new HttpException("productSlug is required", HttpStatus.BAD_REQUEST)
    }
    const uid = await ensureUserId(sid)
    const existing = await db
      .select()
      .from(wishlistItems)
      .where(and(eq(wishlistItems.userId, uid), eq(wishlistItems.productSlug, productSlug)))
      .limit(1)
    if (existing[0]) {
      return { id: productSlug, productSlug, addedAt: existing[0].addedAt.toISOString() }
    }
    const rows = await db
      .insert(wishlistItems)
      .values({ id: newId("wl"), userId: uid, productSlug, productName: "", unitPrice: 0 })
      .returning()
    return { id: productSlug, productSlug, addedAt: rows[0].addedAt.toISOString() }
  }

  async remove(sid: string, productSlug: string): Promise<{ ok: boolean }> {
    const uid = await ensureUserId(sid)
    const rows = await db
      .delete(wishlistItems)
      .where(and(eq(wishlistItems.userId, uid), eq(wishlistItems.productSlug, productSlug)))
      .returning({ id: wishlistItems.id })
    return { ok: rows.length > 0 }
  }
}

@Controller("me/wishlist")
class WishlistController {
  constructor(@Inject(WishlistService) private readonly svc: WishlistService) {}

  @Get()
  list(@Req() req: Request) {
    return this.svc.list(req.sessionId)
  }

  @Post()
  add(@Req() req: Request, @Body() body: { productSlug?: string }) {
    return this.svc.add(req.sessionId, body?.productSlug ?? "")
  }

  @Delete(":productSlug")
  remove(@Req() req: Request, @Param("productSlug") slug: string) {
    return this.svc.remove(req.sessionId, slug)
  }
}

@Module({
  controllers: [WishlistController],
  providers: [WishlistService],
})
export class WishlistModule {}
