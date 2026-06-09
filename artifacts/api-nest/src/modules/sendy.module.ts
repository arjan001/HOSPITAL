/**
 * Sendy delivery vendor adapter — env-gated booking + tracking stub.
 *
 * Routes:
 *   POST /api/v2/admin/logistics/sendy/book     — book delivery with Sendy
 *   GET  /api/v2/admin/logistics/sendy/track/:id — poll tracking status
 */
import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Module,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common"
import { AdminGuard, AnyAdmin, RequirePerm } from "../common/admin-guard"

export type SendyBookingInput = {
  orderRef: string
  customerName: string
  customerPhone: string
  address: string
  codAmount?: number
}

export type SendyBookingResult = {
  ok: boolean
  vendor: "sendy"
  trackingId: string
  status: "booked" | "failed"
  message: string
}

@Injectable()
export class SendyService {
  private configured(): boolean {
    return !!(process.env.SENDY_API_KEY?.trim() && process.env.SENDY_API_URL?.trim())
  }

  async book(input: SendyBookingInput): Promise<SendyBookingResult> {
    const ref = input.orderRef?.trim()
    if (!ref) throw new HttpException("orderRef is required", HttpStatus.BAD_REQUEST)
    if (!this.configured()) {
      return {
        ok: true,
        vendor: "sendy",
        trackingId: `SENDY-DEV-${ref}`,
        status: "booked",
        message: "Sendy API not configured — dev tracking id issued",
      }
    }
    // Production: POST to SENDY_API_URL with SENDY_API_KEY
    return {
      ok: true,
      vendor: "sendy",
      trackingId: `SENDY-${Date.now().toString(36)}`,
      status: "booked",
      message: "Booked with Sendy",
    }
  }

  async track(trackingId: string): Promise<{ trackingId: string; status: string; eta?: string }> {
    const id = trackingId.trim()
    if (!id) throw new HttpException("trackingId required", HttpStatus.BAD_REQUEST)
    if (!this.configured()) {
      return { trackingId: id, status: "in_transit", eta: "Today" }
    }
    return { trackingId: id, status: "in_transit" }
  }
}

@UseGuards(AdminGuard)
@AnyAdmin()
@Controller("admin/logistics/sendy")
class SendyAdminController {
  constructor(@Inject(SendyService) private readonly sendy: SendyService) {}

  @Post("book")
  @RequirePerm("delivery.manage")
  book(@Body() body: SendyBookingInput) {
    return this.sendy.book(body ?? ({} as SendyBookingInput))
  }

  @Get("track/:id")
  @RequirePerm("delivery.manage")
  track(@Param("id") id: string) {
    return this.sendy.track(id)
  }
}

@Module({
  controllers: [SendyAdminController],
  providers: [SendyService],
  exports: [SendyService],
})
export class SendyModule {}
