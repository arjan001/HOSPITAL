/**
 * Partner webhook admin API + registration (Stage 5.5).
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
  Post,
  Query,
  UseGuards,
} from "@nestjs/common"
import {
  dispatchPartnerWebhook,
  listRecentDeliveries,
  listWebhookEndpoints,
  upsertWebhookEndpoint,
} from "../common/partner-webhooks"
import { AdminGuard, RequirePerm } from "../common/admin-guard"

@Injectable()
class PartnerWebhooksService {
  list(partnerId?: string) {
    return listWebhookEndpoints(partnerId)
  }

  register(body: Record<string, unknown>) {
    return upsertWebhookEndpoint(body)
  }

  deliveries(limit?: number) {
    return listRecentDeliveries(limit)
  }

  async testDispatch(body: { partnerId?: string; event?: string }) {
    const partnerId = String(body.partnerId ?? "").trim()
    const event = (body.event ?? "po.issued") as "po.issued"
    if (!partnerId) throw new HttpException("partnerId required", HttpStatus.BAD_REQUEST)
    return dispatchPartnerWebhook(partnerId, event, {
      test: true,
      poNumber: "PO-TEST",
      total: 0,
    })
  }
}

@UseGuards(AdminGuard)
@RequirePerm("suppliers.manage", "procurement.manage")
@Controller("admin/partner-webhooks")
class PartnerWebhooksController {
  constructor(@Inject(PartnerWebhooksService) private readonly svc: PartnerWebhooksService) {}

  @Get()
  list(@Query("partnerId") partnerId?: string) {
    return this.svc.list(partnerId?.trim() || undefined)
  }

  @Get("deliveries")
  deliveries(@Query("limit") limit?: string) {
    return this.svc.deliveries(Math.round(Number(limit) || 50))
  }

  @Post()
  register(@Body() body: Record<string, unknown>) {
    return this.svc.register(body ?? {})
  }

  @Post("test")
  test(@Body() body: Record<string, unknown>) {
    return this.svc.testDispatch(body ?? {})
  }
}

@Module({
  controllers: [PartnerWebhooksController],
  providers: [PartnerWebhooksService],
  exports: [PartnerWebhooksService],
})
export class PartnerWebhooksModule {}
