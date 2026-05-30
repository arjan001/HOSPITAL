/**
 * Notifications module — in-app notification feed + support tickets (Postgres-backed).
 *
 * Two surfaces in one module so they can share the optional Resend email hook:
 *   1. In-app notifications  ──  per-audience event feed (admin / doctor /
 *      pharmacist / customer:<sessionId>). Backs the bell icon in every shell.
 *      Persisted in `notifications`, keyed by the free-text `audience` string.
 *   2. Support tickets       ──  customer-initiated thread that a staff reply
 *      turns into a back-and-forth. Persisted in `support_tickets` +
 *      `support_messages`.
 *
 * All service methods are async (DB-backed). Controllers and the storefront are
 * unchanged — fire-and-forget callers (e.g. prescriptions) simply ignore the
 * returned promise as before.
 *
 * Note on @Inject(NotificationsService):
 *   tsx/esbuild does not emit emitDecoratorMetadata. Explicit @Inject(Token)
 *   is required on every controller constructor — project-wide rule.
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
  Query,
  UseGuards,
  Req,
} from "@nestjs/common"
import type { Request } from "express"
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm"
import {
  db,
  notifications as notificationsTable,
  supportTickets as ticketsTable,
  supportMessages as messagesTable,
} from "@workspace/db"
import { newId } from "../common/repository"
import { EmailModule, EmailService } from "./email.module"
import { AdminGuard, RequirePerm, AnyAdmin } from "../common/admin-guard"

type Audience = "admin" | "doctor" | "pharmacist" | string

export type NotificationLevel = "info" | "success" | "warning" | "alert" | "warn" | "error"
export type NotificationModule =
  | "orders" | "payments" | "prescriptions" | "consultations"
  | "doctors" | "support" | "system" | "marketing"
  | "sourcing" | "trading" | "qa" | "logistics" | "communications"

export type Notification = {
  id: string
  audience: Audience
  module: NotificationModule
  level: NotificationLevel
  title: string
  body?: string
  href?: string
  createdAt: string
  read: boolean
}

export type TicketStatus = "open" | "pending" | "resolved" | "closed"
export type TicketMessage = {
  id: string
  author: "customer" | "staff"
  authorName: string
  body: string
  createdAt: string
}
export type SupportTicket = {
  id: string
  shortId: string
  subject: string
  category: string
  status: TicketStatus
  customer: {
    sessionId: string
    name: string
    email: string
    phone?: string
  }
  messages: TicketMessage[]
  createdAt: string
  updatedAt: string
  assignedTo?: string
}

function toNotification(r: typeof notificationsTable.$inferSelect): Notification {
  return {
    id: r.id,
    audience: r.audience,
    module: r.module as NotificationModule,
    level: r.level as NotificationLevel,
    title: r.title,
    body: r.body ?? undefined,
    href: r.href ?? undefined,
    createdAt: r.createdAt.toISOString(),
    read: r.read,
  }
}

function toMessage(r: typeof messagesTable.$inferSelect): TicketMessage {
  return {
    id: r.id,
    author: r.author === "staff" ? "staff" : "customer",
    authorName: r.authorName,
    body: r.body,
    createdAt: r.createdAt.toISOString(),
  }
}

function toTicket(t: typeof ticketsTable.$inferSelect, messages: (typeof messagesTable.$inferSelect)[]): SupportTicket {
  return {
    id: t.id,
    shortId: t.shortId ?? t.id,
    subject: t.subject,
    category: t.category ?? "general",
    status: (t.status as TicketStatus) ?? "open",
    customer: {
      sessionId: t.sessionId ?? "",
      name: t.customerName ?? "",
      email: t.customerEmail ?? "",
      phone: t.customerPhone ?? undefined,
    },
    messages: messages.map(toMessage),
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    assignedTo: t.assignedTo ?? undefined,
  }
}

@Injectable()
export class NotificationsService {
  constructor(@Inject(EmailService) private readonly email: EmailService) {}

  /* ---- Notifications ---- */

  async list(audience: Audience, opts: { limit?: number; unreadOnly?: boolean } = {}): Promise<Notification[]> {
    const where = opts.unreadOnly
      ? and(eq(notificationsTable.audience, audience), eq(notificationsTable.read, false))
      : eq(notificationsTable.audience, audience)
    let q = db.select().from(notificationsTable).where(where).orderBy(desc(notificationsTable.createdAt)).$dynamic()
    if (opts.limit) q = q.limit(opts.limit)
    const rows = await q
    return rows.map(toNotification)
  }

  async unreadCount(audience: Audience): Promise<number> {
    const rows = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(notificationsTable)
      .where(and(eq(notificationsTable.audience, audience), eq(notificationsTable.read, false)))
    return rows[0]?.n ?? 0
  }

  async push(audience: Audience, n: Omit<Notification, "id" | "createdAt" | "read" | "audience">): Promise<Notification> {
    const [row] = await db
      .insert(notificationsTable)
      .values({
        id: newId("ntf"),
        audience,
        module: n.module,
        level: n.level,
        title: n.title,
        body: n.body ?? null,
        href: n.href ?? null,
        read: false,
      })
      .returning()
    return toNotification(row)
  }

  async markRead(audience: Audience, ids: string[]): Promise<number> {
    if (ids.length === 0) return 0
    const rows = await db
      .update(notificationsTable)
      .set({ read: true })
      .where(
        and(
          eq(notificationsTable.audience, audience),
          eq(notificationsTable.read, false),
          inArray(notificationsTable.id, ids),
        ),
      )
      .returning({ id: notificationsTable.id })
    return rows.length
  }

  async markAllRead(audience: Audience): Promise<number> {
    const rows = await db
      .update(notificationsTable)
      .set({ read: true })
      .where(and(eq(notificationsTable.audience, audience), eq(notificationsTable.read, false)))
      .returning({ id: notificationsTable.id })
    return rows.length
  }

  /* ---- Support tickets ---- */

  private async messagesFor(ticketId: string): Promise<(typeof messagesTable.$inferSelect)[]> {
    return db.select().from(messagesTable).where(eq(messagesTable.ticketId, ticketId)).orderBy(asc(messagesTable.createdAt))
  }

  async listTicketsForCustomer(sessionId: string): Promise<SupportTicket[]> {
    const tickets = await db
      .select()
      .from(ticketsTable)
      .where(eq(ticketsTable.sessionId, sessionId))
      .orderBy(desc(ticketsTable.updatedAt))
    return Promise.all(tickets.map(async (t) => toTicket(t, await this.messagesFor(t.id))))
  }

  async listAllTickets(): Promise<SupportTicket[]> {
    const tickets = await db.select().from(ticketsTable).orderBy(desc(ticketsTable.updatedAt))
    return Promise.all(tickets.map(async (t) => toTicket(t, await this.messagesFor(t.id))))
  }

  async getTicket(id: string): Promise<SupportTicket> {
    const rows = await db
      .select()
      .from(ticketsTable)
      .where(sql`${ticketsTable.id} = ${id} OR ${ticketsTable.shortId} = ${id}`)
      .limit(1)
    if (!rows[0]) throw new HttpException("Ticket not found", HttpStatus.NOT_FOUND)
    return toTicket(rows[0], await this.messagesFor(rows[0].id))
  }

  async createTicket(sessionId: string, input: {
    subject: string
    category?: string
    name: string
    email: string
    phone?: string
    message: string
  }): Promise<SupportTicket> {
    if (!input?.subject?.trim()) throw new HttpException("Subject is required", HttpStatus.BAD_REQUEST)
    if (!input?.message?.trim()) throw new HttpException("Message is required", HttpStatus.BAD_REQUEST)
    if (!input?.email?.trim()) throw new HttpException("Email is required", HttpStatus.BAD_REQUEST)
    const id = newId("tkt")
    const shortId = `SR-${Date.now().toString(36).toUpperCase().slice(-6)}`
    const [t] = await db
      .insert(ticketsTable)
      .values({
        id,
        shortId,
        sessionId,
        customerName: input.name.trim(),
        customerEmail: input.email.trim(),
        customerPhone: input.phone?.trim() || null,
        subject: input.subject.trim(),
        category: input.category?.trim() || "general",
        status: "open",
      })
      .returning()
    await db.insert(messagesTable).values({
      id: newId("msg"),
      ticketId: id,
      author: "customer",
      authorName: input.name.trim() || "Customer",
      body: input.message.trim(),
    })
    // Fan-out: alert admin shell, optionally email the customer ack.
    await this.push("admin", {
      module: "support",
      level: "info",
      title: `New support ticket — ${t.subject}`,
      body: `${input.name.trim()} · ${t.category ?? "general"}`,
      href: `/admin/support/${t.id}`,
    })
    void this.email.send({
      to: input.email.trim(),
      template: "support.ticket.reply",
      subject: `We received your ticket ${shortId}`,
      data: {
        name: input.name,
        ticketId: shortId,
        message: "Thank you for contacting Shaniid RX. We've received your message and will reply shortly.",
        url: "/account/support",
      },
    })
    return this.getTicket(id)
  }

  async appendMessage(id: string, msg: { author: "customer" | "staff"; authorName: string; body: string }): Promise<SupportTicket> {
    const ticket = await this.getTicket(id)
    if (!msg?.body?.trim()) throw new HttpException("Reply body is required", HttpStatus.BAD_REQUEST)
    await db.insert(messagesTable).values({
      id: newId("msg"),
      ticketId: ticket.id,
      author: msg.author,
      authorName: msg.authorName || (msg.author === "staff" ? "Shaniid RX team" : "Customer"),
      body: msg.body.trim(),
    })
    const nextStatus: TicketStatus = msg.author === "staff" ? "pending" : "open"
    await db
      .update(ticketsTable)
      .set({ status: nextStatus, updatedAt: new Date() })
      .where(eq(ticketsTable.id, ticket.id))
    if (msg.author === "staff") {
      await this.push(ticket.customer.sessionId, {
        module: "support",
        level: "info",
        title: `Reply on ticket ${ticket.shortId}`,
        body: msg.body.slice(0, 140),
        href: "/account/support",
      })
      void this.email.send({
        to: ticket.customer.email,
        subject: `Reply on your Shaniid RX ticket ${ticket.shortId}`,
        template: "support.ticket.reply",
        data: { name: ticket.customer.name, ticketId: ticket.shortId, message: msg.body, url: "/account/support" },
      })
    } else {
      await this.push("admin", {
        module: "support",
        level: "info",
        title: `Customer replied — ${ticket.shortId}`,
        body: msg.body.slice(0, 140),
        href: `/admin/support/${ticket.id}`,
      })
    }
    return this.getTicket(ticket.id)
  }

  async setStatus(id: string, status: TicketStatus): Promise<SupportTicket> {
    const ticket = await this.getTicket(id)
    await db.update(ticketsTable).set({ status, updatedAt: new Date() }).where(eq(ticketsTable.id, ticket.id))
    return this.getTicket(ticket.id)
  }
}

/* -------------------------------------------------------------------------- */
/* Controllers                                                                */
/* -------------------------------------------------------------------------- */

@Controller("me/notifications")
class MyNotificationsController {
  constructor(@Inject(NotificationsService) private readonly svc: NotificationsService) {}

  @Get()
  async list(@Req() req: Request, @Query("unreadOnly") unreadOnly?: string, @Query("limit") limit?: string) {
    return {
      items: await this.svc.list(req.sessionId, {
        unreadOnly: unreadOnly === "1" || unreadOnly === "true",
        limit: limit ? Math.max(1, Math.min(200, Number(limit))) : 50,
      }),
      unread: await this.svc.unreadCount(req.sessionId),
    }
  }

  @Post("read")
  async read(@Req() req: Request, @Body() body: { ids?: string[]; all?: boolean }) {
    const updated = body?.all
      ? await this.svc.markAllRead(req.sessionId)
      : await this.svc.markRead(req.sessionId, Array.isArray(body?.ids) ? body!.ids : [])
    return { ok: true, updated }
  }
}

@UseGuards(AdminGuard)
@AnyAdmin()
@Controller("admin/notifications")
class AdminNotificationsController {
  constructor(@Inject(NotificationsService) private readonly svc: NotificationsService) {}

  @Get()
  async list(@Query("audience") audience?: string, @Query("unreadOnly") unreadOnly?: string) {
    const a = (audience === "doctor" || audience === "pharmacist") ? audience : "admin"
    return {
      items: await this.svc.list(a, { unreadOnly: unreadOnly === "1" || unreadOnly === "true", limit: 100 }),
      unread: await this.svc.unreadCount(a),
    }
  }

  @Post()
  create(
    @Body() body: { audience?: string; module: NotificationModule; level: NotificationLevel; title: string; body?: string; href?: string },
  ) {
    if (!body?.title) throw new HttpException("Title required", HttpStatus.BAD_REQUEST)
    const a = (body.audience === "doctor" || body.audience === "pharmacist" || body.audience === "admin")
      ? body.audience : "admin"
    return this.svc.push(a, {
      module: body.module || "system",
      level: body.level || "info",
      title: body.title,
      body: body.body,
      href: body.href,
    })
  }

  @Post("read")
  async read(@Body() body: { audience?: string; ids?: string[]; all?: boolean }) {
    const a = (body?.audience === "doctor" || body?.audience === "pharmacist") ? body.audience : "admin"
    const updated = body?.all ? await this.svc.markAllRead(a) : await this.svc.markRead(a, Array.isArray(body?.ids) ? body!.ids : [])
    return { ok: true, updated }
  }
}

@Controller("me/support/tickets")
class MyTicketsController {
  constructor(@Inject(NotificationsService) private readonly svc: NotificationsService) {}

  @Get()
  list(@Req() req: Request) {
    return this.svc.listTicketsForCustomer(req.sessionId)
  }

  @Get(":id")
  async get(@Req() req: Request, @Param("id") id: string) {
    const t = await this.svc.getTicket(id)
    if (t.customer.sessionId !== req.sessionId) {
      throw new HttpException("Not found", HttpStatus.NOT_FOUND)
    }
    return t
  }

  @Post()
  create(@Req() req: Request, @Body() body: { subject: string; category?: string; name: string; email: string; phone?: string; message: string }) {
    return this.svc.createTicket(req.sessionId, body)
  }

  @Post(":id/messages")
  async reply(@Req() req: Request, @Param("id") id: string, @Body() body: { body: string; authorName?: string }) {
    const t = await this.svc.getTicket(id)
    if (t.customer.sessionId !== req.sessionId) {
      throw new HttpException("Not found", HttpStatus.NOT_FOUND)
    }
    return this.svc.appendMessage(t.id, {
      author: "customer",
      authorName: body?.authorName || t.customer.name || "Customer",
      body: body?.body || "",
    })
  }
}

@UseGuards(AdminGuard)
@RequirePerm("chat.respond")
@Controller("admin/support/tickets")
class AdminTicketsController {
  constructor(@Inject(NotificationsService) private readonly svc: NotificationsService) {}

  @Get()
  list() { return this.svc.listAllTickets() }

  @Get(":id")
  get(@Param("id") id: string) { return this.svc.getTicket(id) }

  @Post(":id/messages")
  reply(@Param("id") id: string, @Body() body: { body: string; authorName?: string }) {
    return this.svc.appendMessage(id, {
      author: "staff",
      authorName: body?.authorName || "Shaniid RX team",
      body: body?.body || "",
    })
  }

  @Patch(":id/status")
  status(@Param("id") id: string, @Body() body: { status: TicketStatus }) {
    return this.svc.setStatus(id, body?.status)
  }
}

@Module({
  imports: [EmailModule],
  controllers: [
    MyNotificationsController,
    AdminNotificationsController,
    MyTicketsController,
    AdminTicketsController,
  ],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
