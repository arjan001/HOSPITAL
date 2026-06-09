/**
 * Server-backed shopping cart — persists per session (and user when signed in).
 *
 * Routes:
 *   GET    /api/v2/me/cart
 *   PUT    /api/v2/me/cart          — replace entire cart
 *   DELETE /api/v2/me/cart          — clear cart
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
  Put,
  Req,
} from "@nestjs/common"
import type { Request } from "express"
import { and, eq, isNull } from "drizzle-orm"
import { cartItems, db } from "@workspace/db"
import { newId } from "../common/repository"
import { ensureUserId } from "../common/session-user"

export type CartLineDto = {
  id: string
  productId: string
  productSlug: string
  name: string
  unitPrice: number
  quantity: number
  variations?: Record<string, string>
  snapshot?: Record<string, unknown>
}

function mapRow(row: typeof cartItems.$inferSelect): CartLineDto {
  return {
    id: row.id,
    productId: row.productId,
    productSlug: row.productSlug,
    name: row.name,
    unitPrice: row.unitPrice,
    quantity: row.quantity,
    variations: row.variations ?? undefined,
    snapshot: (row.snapshot as Record<string, unknown>) ?? undefined,
  }
}

@Injectable()
export class CartService {
  async list(sid: string): Promise<CartLineDto[]> {
    let uid: string | null = null
    try {
      uid = await ensureUserId(sid)
    } catch {
      uid = null
    }
    const rows = uid
      ? await db
          .select()
          .from(cartItems)
          .where(eq(cartItems.userId, uid))
      : await db
          .select()
          .from(cartItems)
          .where(and(eq(cartItems.sessionId, sid), isNull(cartItems.userId)))
    return rows.map(mapRow)
  }

  async replace(
    sid: string,
    lines: Array<{
      productId: string
      productSlug: string
      name: string
      unitPrice: number
      quantity: number
      variations?: Record<string, string>
      snapshot?: Record<string, unknown>
    }>,
  ): Promise<CartLineDto[]> {
    let uid: string | null = null
    try {
      uid = await ensureUserId(sid)
    } catch {
      uid = null
    }
    const now = new Date()
    await db.transaction(async (tx) => {
      if (uid) {
        await tx.delete(cartItems).where(eq(cartItems.userId, uid))
      } else {
        await tx.delete(cartItems).where(eq(cartItems.sessionId, sid))
      }
      if (lines.length) {
        await tx.insert(cartItems).values(
          lines.map((l) => ({
            id: newId("cart"),
            sessionId: sid,
            userId: uid,
            productId: l.productId,
            productSlug: l.productSlug,
            name: l.name,
            unitPrice: Math.round(l.unitPrice),
            quantity: Math.max(1, Math.round(l.quantity)),
            variations: l.variations ?? null,
            snapshot: l.snapshot ?? null,
            updatedAt: now,
          })),
        )
      }
    })
    return this.list(sid)
  }

  async clear(sid: string): Promise<{ ok: true }> {
    await this.replace(sid, [])
    return { ok: true }
  }
}

@Controller("me/cart")
class MeCartController {
  constructor(@Inject(CartService) private readonly cart: CartService) {}

  @Get()
  async get(@Req() req: Request) {
    const sid = req.sessionId
    if (!sid) throw new HttpException("Session required", HttpStatus.UNAUTHORIZED)
    return this.cart.list(sid)
  }

  @Put()
  async put(
    @Req() req: Request,
    @Body()
    body: {
      items?: Array<{
        productId: string
        productSlug: string
        name: string
        unitPrice: number
        quantity: number
        variations?: Record<string, string>
        snapshot?: Record<string, unknown>
      }>
    },
  ) {
    const sid = req.sessionId
    if (!sid) throw new HttpException("Session required", HttpStatus.UNAUTHORIZED)
    return this.cart.replace(sid, Array.isArray(body?.items) ? body.items : [])
  }

  @Delete()
  async del(@Req() req: Request) {
    const sid = req.sessionId
    if (!sid) throw new HttpException("Session required", HttpStatus.UNAUTHORIZED)
    return this.cart.clear(sid)
  }
}

@Module({
  controllers: [MeCartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
