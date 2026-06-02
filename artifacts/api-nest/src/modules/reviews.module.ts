/**
 * Reviews module — customer product reviews & ratings (Postgres-backed).
 *
 * Public reads expose a product's reviews plus an aggregate (average, count,
 * star distribution) so every product page renders real, dynamic data.
 *
 * Customer writes are scoped by the signed session cookie (`req.sessionId`):
 *   - POST   /reviews            create a review (one per session per product)
 *   - PATCH  /reviews/:id        edit your own review (rating/body/title)
 *   - DELETE /reviews/:id        delete your own review
 *
 * Ownership is enforced on edit/delete via the session id; the durable
 * `userId` FK is resolved through `ensureUserId` so the row survives the
 * eventual Clerk swap (see common/session-user.ts).
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
  Patch,
  Post,
  Req,
} from "@nestjs/common"
import type { Request } from "express"
import { and, desc, eq, sql } from "drizzle-orm"
import { db, productReviews, type ProductReview } from "@workspace/db"
import { newId } from "../common/repository"
import { ensureUserId } from "../common/session-user"

export type ReviewDTO = {
  id: string
  productId: string
  authorName: string
  rating: number
  title: string | null
  body: string
  helpfulCount: number
  createdAt: string
  updatedAt: string
  mine: boolean
}

export type ReviewAggregate = {
  average: number
  count: number
  distribution: Record<"1" | "2" | "3" | "4" | "5", number>
}

function parseRating(n: unknown): number {
  const v = Number(n)
  if (!Number.isInteger(v) || v < 1 || v > 5) {
    throw new HttpException("Rating must be an integer from 1 to 5", HttpStatus.BAD_REQUEST)
  }
  return v
}

function toDTO(r: ProductReview, sessionId: string): ReviewDTO {
  return {
    id: r.id,
    productId: r.productId,
    authorName: r.authorName,
    rating: r.rating,
    title: r.title ?? null,
    body: r.body,
    helpfulCount: r.helpfulCount,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    mine: !!r.sessionId && r.sessionId === sessionId,
  }
}

@Injectable()
export class ReviewsService {
  async listForProduct(productId: string, sessionId: string): Promise<{ items: ReviewDTO[]; aggregate: ReviewAggregate }> {
    const rows = await db
      .select()
      .from(productReviews)
      .where(and(eq(productReviews.productId, productId), eq(productReviews.status, "published")))
      .orderBy(desc(productReviews.createdAt))
    const items = rows.map((r) => toDTO(r, sessionId))
    const distribution = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 } as ReviewAggregate["distribution"]
    let sum = 0
    for (const r of rows) {
      const key = String(Math.min(5, Math.max(1, r.rating))) as keyof ReviewAggregate["distribution"]
      distribution[key] += 1
      sum += r.rating
    }
    const count = rows.length
    const average = count ? Number((sum / count).toFixed(1)) : 0
    return { items, aggregate: { average, count, distribution } }
  }

  async create(
    sessionId: string,
    input: { productId: string; rating: number; body: string; title?: string; authorName?: string },
  ): Promise<ReviewDTO> {
    const productId = String(input?.productId || "").trim()
    if (!productId) throw new HttpException("productId is required", HttpStatus.BAD_REQUEST)
    const body = String(input?.body || "").trim()
    if (!body) throw new HttpException("Review text is required", HttpStatus.BAD_REQUEST)
    const rating = parseRating(input?.rating)
    const authorName = String(input?.authorName || "").trim() || "Verified customer"
    const title = input?.title?.trim() || null
    const userId = await ensureUserId(sessionId)

    // One review per session per product, enforced by the
    // `product_reviews_product_session_uq` partial unique index. Upsert so
    // concurrent submits (and resubmits) converge to a single row instead of
    // a non-atomic read-then-insert that can race into duplicates.
    const id = newId("rev")
    const [row] = await db
      .insert(productReviews)
      .values({ id, productId, userId, sessionId, authorName, rating, title, body })
      .onConflictDoUpdate({
        target: [productReviews.productId, productReviews.sessionId],
        targetWhere: sql`${productReviews.sessionId} is not null`,
        set: { rating, body, title, authorName, updatedAt: new Date() },
      })
      .returning()
    return toDTO(row, sessionId)
  }

  async update(
    sessionId: string,
    id: string,
    input: { rating?: number; body?: string; title?: string },
  ): Promise<ReviewDTO> {
    const current = await this.requireOwned(sessionId, id)
    const patch: Partial<ProductReview> = { updatedAt: new Date() }
    if (input?.rating !== undefined) patch.rating = parseRating(input.rating)
    if (typeof input?.body === "string") {
      const b = input.body.trim()
      if (!b) throw new HttpException("Review text cannot be empty", HttpStatus.BAD_REQUEST)
      patch.body = b
    }
    if (typeof input?.title === "string") patch.title = input.title.trim() || null
    await db.update(productReviews).set(patch).where(eq(productReviews.id, current.id))
    return this.getOwned(sessionId, current.id)
  }

  async remove(sessionId: string, id: string): Promise<{ ok: true; id: string }> {
    const current = await this.requireOwned(sessionId, id)
    await db.delete(productReviews).where(eq(productReviews.id, current.id))
    return { ok: true, id: current.id }
  }

  private async requireOwned(sessionId: string, id: string): Promise<ProductReview> {
    const rows = await db.select().from(productReviews).where(eq(productReviews.id, id)).limit(1)
    const row = rows[0]
    if (!row || row.sessionId !== sessionId) {
      throw new HttpException("Review not found", HttpStatus.NOT_FOUND)
    }
    return row
  }

  private async getOwned(sessionId: string, id: string): Promise<ReviewDTO> {
    const rows = await db.select().from(productReviews).where(eq(productReviews.id, id)).limit(1)
    if (!rows[0]) throw new HttpException("Review not found", HttpStatus.NOT_FOUND)
    return toDTO(rows[0], sessionId)
  }
}

@Controller("reviews")
class ReviewsController {
  constructor(@Inject(ReviewsService) private readonly svc: ReviewsService) {}

  @Get("product/:productId")
  list(@Req() req: Request, @Param("productId") productId: string) {
    return this.svc.listForProduct(productId, req.sessionId)
  }

  @Post()
  create(
    @Req() req: Request,
    @Body() body: { productId: string; rating: number; body: string; title?: string; authorName?: string },
  ) {
    return this.svc.create(req.sessionId, body)
  }

  @Patch(":id")
  update(@Req() req: Request, @Param("id") id: string, @Body() body: { rating?: number; body?: string; title?: string }) {
    return this.svc.update(req.sessionId, id, body)
  }

  @Delete(":id")
  remove(@Req() req: Request, @Param("id") id: string) {
    return this.svc.remove(req.sessionId, id)
  }
}

@Module({
  controllers: [ReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
