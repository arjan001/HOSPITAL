/**
 * Prescription refill subscriptions — reminder-based recurring refills.
 *
 * Routes:
 *   POST   /api/v2/me/prescriptions/:id/subscribe   — start refill plan
 *   GET    /api/v2/me/refill-reminders                — due + upcoming refills
 *   POST   /api/v2/me/refills/:id/pay                 — pay a due refill
 *   PATCH  /api/v2/me/subscriptions/:id               — pause / cancel
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
  Patch,
  Post,
  Req,
} from "@nestjs/common"
import type { Request } from "express"
import { and, desc, eq, lte } from "drizzle-orm"
import {
  db,
  prescriptions as rxTable,
  prescriptionSubscriptions,
  prescriptionRefills,
  type SubscriptionFrequency,
} from "@workspace/db"
import { newId } from "../common/repository"
import { ensureUserId } from "../common/session-user"
import { PrescriptionsModule, PrescriptionsService, itemizedTotal } from "./prescriptions.module"
import { CrmModule, CrmService } from "./crm.module"

const FREQ_DAYS: Record<SubscriptionFrequency, number> = {
  weekly: 7,
  biweekly: 14,
  monthly: 30,
  quarterly: 90,
}

@Injectable()
export class PrescriptionSubscriptionsService {
  constructor(
    @Inject(PrescriptionsService) private readonly rx: PrescriptionsService,
    @Inject(CrmService) private readonly crm: CrmService,
  ) {}

  private async assertOwnedRx(sid: string, rxId: string) {
    const rx = await this.rx.get(sid, rxId)
    if (rx.status !== "verified" && rx.status !== "dispensed" && rx.status !== "accepted") {
      throw new HttpException(
        "Subscribe after your prescription is reviewed and priced",
        HttpStatus.BAD_REQUEST,
      )
    }
    const amount = itemizedTotal(rx.approvedDrugs)
    if (amount <= 0) {
      throw new HttpException("No priced items on this prescription yet", HttpStatus.BAD_REQUEST)
    }
    return { rx, amount }
  }

  async subscribe(
    sid: string,
    rxId: string,
    frequency: SubscriptionFrequency = "monthly",
  ) {
    const uid = await ensureUserId(sid)
    const { rx, amount } = await this.assertOwnedRx(sid, rxId)
    const intervalDays = FREQ_DAYS[frequency] ?? 30
    const next = new Date()
    next.setDate(next.getDate() + intervalDays)

    const existing = await db
      .select()
      .from(prescriptionSubscriptions)
      .where(
        and(
          eq(prescriptionSubscriptions.prescriptionId, rxId),
          eq(prescriptionSubscriptions.userId, uid),
          eq(prescriptionSubscriptions.status, "active"),
        ),
      )
      .limit(1)

    if (existing[0]) {
      return { subscription: existing[0], created: false }
    }

    const id = newId("sub")
    const now = new Date()
    await db.insert(prescriptionSubscriptions).values({
      id,
      userId: uid,
      prescriptionId: rxId,
      status: "active",
      frequency,
      intervalDays,
      amount,
      nextRefillAt: next,
      refillCount: 0,
      createdAt: now,
      updatedAt: now,
    })

    await this.crm.recordSessionEvent(sid, "subscriber", {
      phone: rx.phone,
      name: rx.patientName,
      metadata: { prescriptionId: rxId, subscriptionId: id },
    })

    const row = await db
      .select()
      .from(prescriptionSubscriptions)
      .where(eq(prescriptionSubscriptions.id, id))
      .limit(1)
    return { subscription: row[0]!, created: true }
  }

  /** Lazily materialise due refill rows for active subscriptions. */
  private async ensureDueRefills(uid: string) {
    const subs = await db
      .select()
      .from(prescriptionSubscriptions)
      .where(
        and(
          eq(prescriptionSubscriptions.userId, uid),
          eq(prescriptionSubscriptions.status, "active"),
        ),
      )
    const now = new Date()
    for (const sub of subs) {
      if (sub.nextRefillAt > now) continue
      const due = await db
        .select()
        .from(prescriptionRefills)
        .where(
          and(
            eq(prescriptionRefills.subscriptionId, sub.id),
            eq(prescriptionRefills.status, "scheduled"),
            lte(prescriptionRefills.dueAt, now),
          ),
        )
        .limit(1)
      if (due[0]) continue
      await db.insert(prescriptionRefills).values({
        id: newId("rfl"),
        subscriptionId: sub.id,
        prescriptionId: sub.prescriptionId,
        dueAt: sub.nextRefillAt,
        status: "scheduled",
        amount: sub.amount,
        createdAt: now,
      })
      await this.crm.recordEvent(sub.userId ? `usr:${sub.userId}` : sub.id, "refill_eligible", {
        userId: sub.userId ?? undefined,
        metadata: { subscriptionId: sub.id },
      })
    }
  }

  async listReminders(sid: string) {
    const uid = await ensureUserId(sid)
    await this.ensureDueRefills(uid)
    const now = new Date()

    const subs = await db
      .select()
      .from(prescriptionSubscriptions)
      .where(eq(prescriptionSubscriptions.userId, uid))
      .orderBy(desc(prescriptionSubscriptions.updatedAt))

    const allRefills = await db
      .select()
      .from(prescriptionRefills)
      .where(eq(prescriptionRefills.status, "scheduled"))
    const subIds = new Set(subs.map((s) => s.id))
    const due = allRefills.filter(
      (r) => subIds.has(r.subscriptionId) && r.dueAt <= now,
    )

    const upcoming = subs
      .filter((s) => s.status === "active" && s.nextRefillAt > now)
      .map((s) => ({
        subscriptionId: s.id,
        prescriptionId: s.prescriptionId,
        dueAt: s.nextRefillAt.toISOString(),
        amount: s.amount,
        frequency: s.frequency,
      }))

    const subById = Object.fromEntries(subs.map((s) => [s.id, s]))
    return {
      subscriptions: subs,
      dueRefills: due.map((r) => ({ ...r, subscription: subById[r.subscriptionId] })),
      upcoming,
    }
  }

  async payRefill(sid: string, refillId: string, input: { reference: string; receipt?: string }) {
    const uid = await ensureUserId(sid)
    const ref = String(input.reference ?? "").trim()
    if (!ref) throw new HttpException("reference is required", HttpStatus.BAD_REQUEST)

    const rflRows = await db
      .select()
      .from(prescriptionRefills)
      .where(eq(prescriptionRefills.id, refillId))
      .limit(1)
    const rfl = rflRows[0]
    if (!rfl) throw new HttpException("Refill not found", HttpStatus.NOT_FOUND)

    const subRows = await db
      .select()
      .from(prescriptionSubscriptions)
      .where(eq(prescriptionSubscriptions.id, rfl.subscriptionId))
      .limit(1)
    const sub = subRows[0]
    if (!sub || sub.userId !== uid) {
      throw new HttpException("Refill not found", HttpStatus.NOT_FOUND)
    }
    if (rfl.status !== "scheduled") {
      throw new HttpException("Refill is not payable", HttpStatus.BAD_REQUEST)
    }

    const paidAt = new Date()
    await db
      .update(prescriptionRefills)
      .set({
        status: "paid",
        paymentReference: ref,
        paymentReceipt: input.receipt ?? null,
        paidAt,
      })
      .where(eq(prescriptionRefills.id, refillId))

    const next = new Date()
    next.setDate(next.getDate() + sub.intervalDays)
    await db
      .update(prescriptionSubscriptions)
      .set({
        nextRefillAt: next,
        lastRefillAt: paidAt,
        refillCount: sub.refillCount + 1,
        updatedAt: paidAt,
      })
      .where(eq(prescriptionSubscriptions.id, sub.id))

    return { ok: true, nextRefillAt: next.toISOString(), amount: rfl.amount }
  }

  async updateSubscription(
    sid: string,
    subId: string,
    status: "active" | "paused" | "cancelled",
  ) {
    const uid = await ensureUserId(sid)
    const rows = await db
      .select()
      .from(prescriptionSubscriptions)
      .where(
        and(
          eq(prescriptionSubscriptions.id, subId),
          eq(prescriptionSubscriptions.userId, uid),
        ),
      )
      .limit(1)
    if (!rows[0]) throw new HttpException("Subscription not found", HttpStatus.NOT_FOUND)
    await db
      .update(prescriptionSubscriptions)
      .set({ status, updatedAt: new Date() })
      .where(eq(prescriptionSubscriptions.id, subId))
    return { ok: true, status }
  }
}

@Controller("me/prescriptions")
class SubscribeController {
  constructor(
    @Inject(PrescriptionSubscriptionsService) private readonly subs: PrescriptionSubscriptionsService,
  ) {}

  @Post(":id/subscribe")
  async subscribe(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: { frequency?: SubscriptionFrequency },
  ) {
    const sid = req.sessionId
    if (!sid) throw new HttpException("Session required", HttpStatus.UNAUTHORIZED)
    return this.subs.subscribe(sid, id, body?.frequency ?? "monthly")
  }
}

@Controller("me")
class RefillRemindersController {
  constructor(
    @Inject(PrescriptionSubscriptionsService) private readonly subs: PrescriptionSubscriptionsService,
  ) {}

  @Get("refill-reminders")
  async list(@Req() req: Request) {
    const sid = req.sessionId
    if (!sid) throw new HttpException("Session required", HttpStatus.UNAUTHORIZED)
    return this.subs.listReminders(sid)
  }

  @Post("refills/:id/pay")
  async pay(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: { reference?: string; receipt?: string },
  ) {
    const sid = req.sessionId
    if (!sid) throw new HttpException("Session required", HttpStatus.UNAUTHORIZED)
    return this.subs.payRefill(sid, id, { reference: body?.reference ?? "", receipt: body?.receipt })
  }

  @Patch("subscriptions/:id")
  async patch(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: { status?: "active" | "paused" | "cancelled" },
  ) {
    const sid = req.sessionId
    if (!sid) throw new HttpException("Session required", HttpStatus.UNAUTHORIZED)
    if (!body?.status) throw new HttpException("status required", HttpStatus.BAD_REQUEST)
    return this.subs.updateSubscription(sid, id, body.status)
  }
}

@Module({
  imports: [PrescriptionsModule, CrmModule],
  controllers: [SubscribeController, RefillRemindersController],
  providers: [PrescriptionSubscriptionsService],
  exports: [PrescriptionSubscriptionsService],
})
export class PrescriptionSubscriptionsModule {}
