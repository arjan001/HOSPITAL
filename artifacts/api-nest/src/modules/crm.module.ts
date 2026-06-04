/**
 * CRM pipeline — customer demand funnel (Postgres-durable).
 *
 * Stages: lead → assessment_completed → prescription_uploaded → qualified →
 * quoted → purchased → delivered → refill_eligible → subscriber.
 *
 * Routes:
 *   POST /api/v2/crm/events              — advance funnel (session-scoped)
 *   GET  /api/v2/admin/crm/contacts      — list contacts by stage (admin)
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
  Req,
  UseGuards,
} from "@nestjs/common"
import type { Request } from "express"
import { and, desc, eq } from "drizzle-orm"
import {
  db,
  crmContacts,
  CRM_STAGES,
  type CrmStage,
} from "@workspace/db"
import { newId } from "../common/repository"
import { ensureUserId } from "../common/session-user"
import { AdminGuard, RequirePerm, AnyAdmin } from "../common/admin-guard"

const STAGE_INDEX = Object.fromEntries(CRM_STAGES.map((s, i) => [s, i])) as Record<CrmStage, number>

export type CrmEventType =
  | "assessment_completed"
  | "prescription_uploaded"
  | "qualified"
  | "quoted"
  | "purchased"
  | "delivered"
  | "refill_eligible"
  | "subscriber"

const EVENT_TO_STAGE: Record<CrmEventType, CrmStage> = {
  assessment_completed: "assessment_completed",
  prescription_uploaded: "prescription_uploaded",
  qualified: "qualified",
  quoted: "quoted",
  purchased: "purchased",
  delivered: "delivered",
  refill_eligible: "refill_eligible",
  subscriber: "subscriber",
}

@Injectable()
export class CrmService {
  private stageRank(stage: string): number {
    return STAGE_INDEX[stage as CrmStage] ?? -1
  }

  async upsertContact(input: {
    channelKey: string
    userId?: string
    name?: string
    email?: string
    phone?: string
    source?: string
    metadata?: Record<string, unknown>
    stage?: CrmStage
  }): Promise<typeof crmContacts.$inferSelect> {
    const key = input.channelKey.trim()
    if (!key) throw new HttpException("channelKey required", HttpStatus.BAD_REQUEST)

    const existing = await db
      .select()
      .from(crmContacts)
      .where(eq(crmContacts.channelKey, key))
      .limit(1)

    const now = new Date()
    const targetStage = input.stage ?? "lead"

    if (existing[0]) {
      const cur = existing[0].stage
      const next =
        this.stageRank(targetStage) > this.stageRank(cur) ? targetStage : cur
      await db
        .update(crmContacts)
        .set({
          userId: input.userId ?? existing[0].userId,
          name: input.name?.trim() || existing[0].name,
          email: input.email?.trim() || existing[0].email,
          phone: input.phone?.trim() || existing[0].phone,
          source: input.source ?? existing[0].source,
          metadata: { ...(existing[0].metadata ?? {}), ...(input.metadata ?? {}) },
          stage: next,
          updatedAt: now,
        })
        .where(eq(crmContacts.id, existing[0].id))
      const row = await db.select().from(crmContacts).where(eq(crmContacts.id, existing[0].id)).limit(1)
      return row[0]!
    }

    const id = newId("crm")
    await db.insert(crmContacts).values({
      id,
      channelKey: key,
      userId: input.userId ?? null,
      name: input.name?.trim() || null,
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      stage: targetStage,
      source: input.source ?? null,
      metadata: input.metadata ?? {},
      createdAt: now,
      updatedAt: now,
    })
    const row = await db.select().from(crmContacts).where(eq(crmContacts.id, id)).limit(1)
    return row[0]!
  }

  async recordEvent(
    channelKey: string,
    event: CrmEventType,
    patch?: {
      userId?: string
      name?: string
      email?: string
      phone?: string
      source?: string
      metadata?: Record<string, unknown>
    },
  ) {
    const stage = EVENT_TO_STAGE[event]
    return this.upsertContact({
      channelKey,
      stage,
      ...patch,
    })
  }

  async recordSessionEvent(
    sid: string,
    event: CrmEventType,
    patch?: {
      name?: string
      email?: string
      phone?: string
      source?: string
      metadata?: Record<string, unknown>
    },
  ) {
    const userId = await ensureUserId(sid)
    const channelKey = sid.startsWith("wa:") ? sid : `usr:${userId}`
    return this.recordEvent(channelKey, event, { userId, ...patch })
  }

  async listAdmin(opts?: { stage?: string }) {
    const stage = (opts?.stage ?? "").trim()
    const rows = stage
      ? await db
          .select()
          .from(crmContacts)
          .where(eq(crmContacts.stage, stage))
          .orderBy(desc(crmContacts.updatedAt))
      : await db.select().from(crmContacts).orderBy(desc(crmContacts.updatedAt))

    const counts = Object.fromEntries(CRM_STAGES.map((s) => [s, 0])) as Record<CrmStage, number>
    for (const s of CRM_STAGES) {
      const c = await db
        .select({ n: crmContacts.id })
        .from(crmContacts)
        .where(eq(crmContacts.stage, s))
      counts[s] = c.length
    }
    return { items: rows, counts, stages: CRM_STAGES }
  }
}

@Controller("crm")
class CrmEventsController {
  constructor(@Inject(CrmService) private readonly crm: CrmService) {}

  @Post("events")
  async record(
    @Req() req: Request,
    @Body()
    body: {
      event?: CrmEventType
      name?: string
      email?: string
      phone?: string
      source?: string
      metadata?: Record<string, unknown>
    },
  ) {
    const sid = req.sessionId
    if (!sid) throw new HttpException("Session required", HttpStatus.UNAUTHORIZED)
    if (!body?.event || !(body.event in EVENT_TO_STAGE)) {
      throw new HttpException("event is required", HttpStatus.BAD_REQUEST)
    }
    const contact = await this.crm.recordSessionEvent(sid, body.event, {
      name: body.name,
      email: body.email,
      phone: body.phone,
      source: body.source ?? "web",
      metadata: body.metadata,
    })
    return { ok: true, contact }
  }
}

@UseGuards(AdminGuard)
@AnyAdmin()
@Controller("admin/crm")
class AdminCrmController {
  constructor(@Inject(CrmService) private readonly crm: CrmService) {}

  @Get("contacts")
  @RequirePerm("marketing.view")
  async list(@Query("stage") stage?: string) {
    return this.crm.listAdmin({ stage })
  }
}

@Module({
  controllers: [CrmEventsController, AdminCrmController],
  providers: [CrmService],
  exports: [CrmService],
})
export class CrmModule {}
