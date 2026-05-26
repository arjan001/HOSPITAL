/**
 * Notifications module — in-app notification queue.
 *
 * Routes:
 *   GET    /api/v2/notifications               — list unread notifications for the session
 *   POST   /api/v2/notifications               — create a notification (internal use)
 *   PATCH  /api/v2/notifications/:id/read      — mark a single notification as read
 *   POST   /api/v2/notifications/mark-all-read — mark all as read for the session
 *   DELETE /api/v2/notifications/:id           — dismiss a notification
 *   GET    /api/v2/notifications/admin/all     — admin: list all notifications cross-session
 *   POST   /api/v2/notifications/admin/broadcast — admin: push to all sessions
 *
 * Notification types (non-exhaustive):
 *   order_update, prescription_ready, prescription_rejected,
 *   consultation_reminder, support_reply, promo_alert
 *
 * Storage:
 *   InMemoryRepository<Notification> per sessionId.
 *   Postgres swap: replace repo with Drizzle-backed implementation — no controller changes.
 *
 * Future: wire SSE (Server-Sent Events) or WebSocket push instead of
 * client polling. The NestJS @Sse decorator in chat.module.ts shows the pattern.
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
  Req,
} from "@nestjs/common"
import type { Request } from "express"
import { newId } from "../common/repository"
import { EmailModule, EmailService } from "./email.module"

/**
 * Two surfaces in one module so they can share storage and the optional
 * Resend hook:
 *   1. In-app notifications  ──  per-audience event feed (admin / doctor /
 *      pharmacist / customer:<sid>). Backs the bell icon in every shell.
 *   2. Support tickets       ──  customer-initiated thread that a staff
 *      reply turns into a back-and-forth. Replaces the one-shot
 *      "contact inquiries" workflow.
 *
 * Storage is process-memory today; the surface is intentionally narrow so
 * the swap to Drizzle is just a class implementing the same methods.
 */

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

@Injectable()
export class NotificationsService {
  private notifications = new Map<Audience, Notification[]>()
  private tickets: SupportTicket[] = []

  constructor(@Inject(EmailService) private readonly email: EmailService) {}

  /* ---- Notifications ---- */

  list(audience: Audience, opts: { limit?: number; unreadOnly?: boolean } = {}): Notification[] {
    const all = this.notifications.get(audience) ?? []
    let out = all.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    if (opts.unreadOnly) out = out.filter((n) => !n.read)
    if (opts.limit) out = out.slice(0, opts.limit)
    return out
  }

  unreadCount(audience: Audience): number {
    return (this.notifications.get(audience) ?? []).filter((n) => !n.read).length
  }

  push(audience: Audience, n: Omit<Notification, "id" | "createdAt" | "read" | "audience">): Notification {
    const rec: Notification = {
      id: newId("ntf"),
      audience,
      createdAt: new Date().toISOString(),
      read: false,
      ...n,
    }
    const list = this.notifications.get(audience) ?? []
    list.push(rec)
    // Cap memory growth.
    if (list.length > 500) list.splice(0, list.length - 500)
    this.notifications.set(audience, list)
    return rec
  }

  markRead(audience: Audience, ids: string[]): number {
    const list = this.notifications.get(audience) ?? []
    let n = 0
    for (const row of list) {
      if (ids.includes(row.id) && !row.read) { row.read = true; n++ }
    }
    return n
  }

  markAllRead(audience: Audience): number {
    const list = this.notifications.get(audience) ?? []
    let n = 0
    for (const row of list) { if (!row.read) { row.read = true; n++ } }
    return n
  }

  /* ---- Support tickets ---- */

  listTicketsForCustomer(sessionId: string): SupportTicket[] {
    return this.tickets.filter((t) => t.customer.sessionId === sessionId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }

  listAllTickets(): SupportTicket[] {
    return this.tickets.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }

  getTicket(id: string): SupportTicket {
    const t = this.tickets.find((x) => x.id === id || x.shortId === id)
    if (!t) throw new HttpException("Ticket not found", HttpStatus.NOT_FOUND)
    return t
  }

  createTicket(sessionId: string, input: {
    subject: string
    category?: string
    name: string
    email: string
    phone?: string
    message: string
  }): SupportTicket {
    if (!input?.subject?.trim()) throw new HttpException("Subject is required", HttpStatus.BAD_REQUEST)
    if (!input?.message?.trim()) throw new HttpException("Message is required", HttpStatus.BAD_REQUEST)
    if (!input?.email?.trim()) throw new HttpException("Email is required", HttpStatus.BAD_REQUEST)
    const now = new Date().toISOString()
    const t: SupportTicket = {
      id: newId("tkt"),
      shortId: `SR-${Date.now().toString(36).toUpperCase().slice(-6)}`,
      subject: input.subject.trim(),
      category: input.category?.trim() || "general",
      status: "open",
      customer: {
        sessionId,
        name: input.name.trim(),
        email: input.email.trim(),
        phone: input.phone?.trim(),
      },
      messages: [
        {
          id: newId("msg"),
          author: "customer",
          authorName: input.name.trim() || "Customer",
          body: input.message.trim(),
          createdAt: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
    }
    this.tickets.unshift(t)
    // Fan-out: alert admin shell, optionally email the customer ack.
    this.push("admin", {
      module: "support",
      level: "info",
      title: `New support ticket — ${t.subject}`,
      body: `${t.customer.name} · ${t.category}`,
      href: `/admin/support/${t.id}`,
    })
    void this.email.send({
      to: input.email.trim(),
      template: "support.ticket.reply",
      subject: `We received your ticket ${t.shortId}`,
      data: {
        name: input.name,
        ticketId: t.shortId,
        message: "Thank you for contacting Shaniid RX. We've received your message and will reply shortly.",
        url: "/account/support",
      },
    })
    return t
  }

  appendMessage(id: string, msg: { author: "customer" | "staff"; authorName: string; body: string }): SupportTicket {
    const t = this.getTicket(id)
    if (!msg?.body?.trim()) throw new HttpException("Reply body is required", HttpStatus.BAD_REQUEST)
    const now = new Date().toISOString()
    t.messages.push({
      id: newId("msg"),
      author: msg.author,
      authorName: msg.authorName || (msg.author === "staff" ? "Shaniid RX team" : "Customer"),
      body: msg.body.trim(),
      createdAt: now,
    })
    t.updatedAt = now
    if (msg.author === "staff") {
      t.status = t.status === "closed" ? "pending" : "pending"
      this.push(t.customer.sessionId, {
        module: "support",
        level: "info",
        title: `Reply on ticket ${t.shortId}`,
        body: msg.body.slice(0, 140),
        href: "/account/support",
      })
      void this.email.send({
        to: t.customer.email,
        subject: `Reply on your Shaniid RX ticket ${t.shortId}`,
        template: "support.ticket.reply",
        data: { name: t.customer.name, ticketId: t.shortId, message: msg.body, url: "/account/support" },
      })
    } else {
      t.status = "open"
      this.push("admin", {
        module: "support",
        level: "info",
        title: `Customer replied — ${t.shortId}`,
        body: msg.body.slice(0, 140),
        href: `/admin/support/${t.id}`,
      })
    }
    return t
  }

  setStatus(id: string, status: TicketStatus): SupportTicket {
    const t = this.getTicket(id)
    t.status = status
    t.updatedAt = new Date().toISOString()
    return t
  }
}

/* -------------------------------------------------------------------------- */
/* Controllers                                                                */
/* -------------------------------------------------------------------------- */

function audienceForRequest(req: Request, override?: string): Audience {
  if (override === "admin" || override === "doctor" || override === "pharmacist") return override
  return req.sessionId
}

@Controller("me/notifications")
class MyNotificationsController {
  constructor(@Inject(NotificationsService) private readonly svc: NotificationsService) {}

  @Get()
  list(@Req() req: Request, @Query("unreadOnly") unreadOnly?: string, @Query("limit") limit?: string) {
    return {
      items: this.svc.list(req.sessionId, {
        unreadOnly: unreadOnly === "1" || unreadOnly === "true",
        limit: limit ? Math.max(1, Math.min(200, Number(limit))) : 50,
      }),
      unread: this.svc.unreadCount(req.sessionId),
    }
  }

  @Post("read")
  read(@Req() req: Request, @Body() body: { ids?: string[]; all?: boolean }) {
    const updated = body?.all
      ? this.svc.markAllRead(req.sessionId)
      : this.svc.markRead(req.sessionId, Array.isArray(body?.ids) ? body!.ids : [])
    return { ok: true, updated }
  }
}

@Controller("admin/notifications")
class AdminNotificationsController {
  constructor(@Inject(NotificationsService) private readonly svc: NotificationsService) {}

  @Get()
  list(@Query("audience") audience?: string, @Query("unreadOnly") unreadOnly?: string) {
    const a = (audience === "doctor" || audience === "pharmacist") ? audience : "admin"
    return {
      items: this.svc.list(a, { unreadOnly: unreadOnly === "1" || unreadOnly === "true", limit: 100 }),
      unread: this.svc.unreadCount(a),
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
  read(@Body() body: { audience?: string; ids?: string[]; all?: boolean }) {
    const a = (body?.audience === "doctor" || body?.audience === "pharmacist") ? body.audience : "admin"
    const updated = body?.all ? this.svc.markAllRead(a) : this.svc.markRead(a, Array.isArray(body?.ids) ? body!.ids : [])
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
  get(@Req() req: Request, @Param("id") id: string) {
    const t = this.svc.getTicket(id)
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
  reply(@Req() req: Request, @Param("id") id: string, @Body() body: { body: string; authorName?: string }) {
    const t = this.svc.getTicket(id)
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
