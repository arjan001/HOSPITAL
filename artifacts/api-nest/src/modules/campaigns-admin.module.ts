/**
 * Campaign admin store — Postgres-durable pipelines/queue + CMS docs for definitions.
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
  Put,
  UseGuards,
} from "@nestjs/common"
import { eq } from "drizzle-orm"
import {
  campaignPipelines,
  campaignQueueItems,
  db,
} from "@workspace/db"
import { newId } from "../common/repository"
import { AdminCmsModule, AdminCmsService } from "./admin-cms.module"
import { AdminGuard, AnyAdmin, RequirePerm } from "../common/admin-guard"

const CAMPAIGN_DOC_KEYS = new Set([
  "campaign-emails",
  "campaign-sms",
  "campaign-audiences",
  "campaign-settings",
])

@Injectable()
export class CampaignsAdminService {
  constructor(@Inject(AdminCmsService) private readonly cms: AdminCmsService) {}

  async getDoc(key: string) {
    if (!CAMPAIGN_DOC_KEYS.has(key)) {
      throw new HttpException("Invalid campaign doc key", HttpStatus.BAD_REQUEST)
    }
    const entry = await this.cms.get(key)
    return entry?.value ?? (key === "campaign-settings" ? {} : [])
  }

  async putDoc(key: string, value: unknown) {
    if (!CAMPAIGN_DOC_KEYS.has(key)) {
      throw new HttpException("Invalid campaign doc key", HttpStatus.BAD_REQUEST)
    }
    return this.cms.put(key, value)
  }

  async getPipelines() {
    const entry = await this.cms.get("campaign-pipelines")
    const items = Array.isArray(entry?.value) ? entry.value : []
    const rows = await db.select().from(campaignPipelines)
    if (rows.length === 0 && items.length > 0) {
      await this.putPipelines(items)
    }
    return items
  }

  async putPipelines(items: unknown[]) {
    const list = Array.isArray(items) ? items : []
    const now = new Date()
    await db.transaction(async (tx) => {
      await tx.delete(campaignPipelines)
      if (list.length) {
        await tx.insert(campaignPipelines).values(
          list.map((p) => {
            const row = p as Record<string, unknown>
            return {
              id: String(row.id || newId("pipe")),
              name: String(row.name || "Pipeline"),
              steps: Array.isArray(row.steps) ? row.steps : [],
              active: row.active !== false,
              updatedAt: now,
            }
          }),
        )
      }
    })
    await this.cms.put("campaign-pipelines", list)
    return list
  }

  async getQueue() {
    const entry = await this.cms.get("campaign-queue")
    const items = Array.isArray(entry?.value) ? entry.value : []
    const rows = await db.select().from(campaignQueueItems).limit(1)
    if (rows.length === 0 && items.length > 0) {
      await this.putQueue(items)
    }
    return items
  }

  async putQueue(items: unknown[]) {
    const list = Array.isArray(items) ? items : []
    const now = new Date()
    await db.transaction(async (tx) => {
      await tx.delete(campaignQueueItems)
      if (list.length) {
        await tx.insert(campaignQueueItems).values(
          list.map((q) => {
            const row = q as Record<string, unknown>
            return {
              id: String(row.id || newId("cq")),
              campaignId: String(row.campaignId || row.campaign_id || ""),
              recipient: String(row.recipient || row.to || ""),
              channel: String(row.channel || "email"),
              status: String(row.status || "pending"),
              payload: row as Record<string, unknown>,
              scheduledAt: row.scheduledAt ? new Date(String(row.scheduledAt)) : null,
              sentAt: row.sentAt ? new Date(String(row.sentAt)) : null,
              createdAt: now,
            }
          }),
        )
      }
    })
    await this.cms.put("campaign-queue", list)
    return list
  }
}

@UseGuards(AdminGuard)
@AnyAdmin()
@Controller("admin/campaigns")
class CampaignsAdminController {
  constructor(@Inject(CampaignsAdminService) private readonly svc: CampaignsAdminService) {}

  @Get("pipelines")
  @RequirePerm("marketing.broadcast")
  pipelines() {
    return this.svc.getPipelines()
  }

  @Put("pipelines")
  @RequirePerm("marketing.broadcast")
  putPipelines(@Body() body: unknown[]) {
    return this.svc.putPipelines(Array.isArray(body) ? body : [])
  }

  @Get("queue")
  @RequirePerm("marketing.broadcast")
  queue() {
    return this.svc.getQueue()
  }

  @Put("queue")
  @RequirePerm("marketing.broadcast")
  putQueue(@Body() body: unknown[]) {
    return this.svc.putQueue(Array.isArray(body) ? body : [])
  }

  @Get("doc/:key")
  @RequirePerm("marketing.broadcast")
  getDoc(@Param("key") key: string) {
    return this.svc.getDoc(key)
  }

  @Put("doc/:key")
  @RequirePerm("marketing.broadcast")
  putDoc(@Param("key") key: string, @Body() body: unknown) {
    return this.svc.putDoc(key, body)
  }
}

@Module({
  imports: [AdminCmsModule],
  controllers: [CampaignsAdminController],
  providers: [CampaignsAdminService],
  exports: [CampaignsAdminService],
})
export class CampaignsAdminModule {}
