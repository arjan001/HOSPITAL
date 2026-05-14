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
import { InMemoryRepository } from "../common/repository"

export type WishlistItem = {
  id: string // == productSlug for natural dedupe
  productSlug: string
  addedAt: string
}

@Injectable()
class WishlistService {
  private repo = new InMemoryRepository<WishlistItem>()

  list(sid: string): WishlistItem[] {
    return this.repo.listFor(sid)
  }

  add(sid: string, productSlug: string): WishlistItem {
    if (!productSlug || typeof productSlug !== "string") {
      throw new HttpException("productSlug is required", HttpStatus.BAD_REQUEST)
    }
    const existing = this.repo.findById(sid, productSlug)
    if (existing) return existing
    return this.repo.add(sid, {
      id: productSlug,
      productSlug,
      addedAt: new Date().toISOString(),
    })
  }

  remove(sid: string, productSlug: string): { ok: boolean } {
    return { ok: this.repo.remove(sid, productSlug) }
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
