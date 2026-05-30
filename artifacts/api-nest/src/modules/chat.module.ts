/**
 * Chat module — WhatsApp-style patient ↔ pharmacist conversations.
 *
 * Realtime transport: Server-Sent Events (SSE). One thread per patient session
 * (keyed by `req.sessionId`). The pharmacy team ("staff") is a single shared
 * audience — staff presence is global, patient presence is per-thread.
 *
 * Streamed events (StreamEvent union):
 *   message  — a new/updated message (status changes re-emit the message)
 *   thread   — thread metadata changed (last message, unread counts, name)
 *   read     — the other party read the conversation (advance ticks live)
 *   typing   — the other party started/stopped typing
 *   presence — online/last-seen changed for patient or staff
 *   deleted  — thread removed
 *
 * Receipts: a message is "sent" when the server accepts it, "delivered" when the
 * recipient is connected (or connects), and "read" when the recipient opens the
 * conversation.
 *
 * Persistence: PostgreSQL via Drizzle (`@workspace/db` → `chat_threads` /
 * `chat_messages`). Threads, messages, attachments, and read/delivery state are
 * durable across server restarts and deploys. Only the *runtime* transport state
 * — SSE subjects and online/typing presence — stays in memory, because it
 * reflects who is connected right now and is meaningless after a restart.
 *
 * Note on @Inject(ChatService): tsx/esbuild does not emit emitDecoratorMetadata,
 * so explicit @Inject(Token) on every controller constructor is required.
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
  Post,
  Req,
  Sse,
  UseGuards,
} from "@nestjs/common"
import type { Request } from "express"
import { Observable, Subject, interval, map, merge } from "rxjs"
import { and, asc, desc, eq, ne, sql } from "drizzle-orm"
import { db, chatMessages, chatThreads } from "@workspace/db"
import { newId } from "../common/repository"
import { AdminGuard, RequirePerm } from "../common/admin-guard"

export type ChatSender = "patient" | "staff"
export type ChatStatus = "sent" | "delivered" | "read"
export type ChatThreadStatus = "active" | "archived"
export type AttachmentType = "image" | "file"

export type ChatMessage = {
  id: string
  threadId: string
  sender: ChatSender
  text: string
  createdAt: string
  status: ChatStatus
  deliveredAt?: string | null
  readAt?: string | null
  authorName?: string
  attachmentUrl?: string
  attachmentName?: string
  attachmentType?: AttachmentType
}

export type ChatThread = {
  id: string
  patientName: string
  patientPhone: string
  consultationId?: string | null
  lastMessage: string
  lastSender: ChatSender | null
  updatedAt: string
  createdAt: string
  unreadByStaff: number
  unreadByPatient: number
  // Conversation lifecycle. Archived = the consultation ended and the
  // transcript is preserved as a saved record.
  status: ChatThreadStatus
  closedAt?: string | null
}

export type PresencePayload = {
  who: ChatSender
  threadId: string
  online: boolean
  lastSeen: string | null
}

type StreamEvent =
  | { type: "message"; threadId: string; message: ChatMessage }
  | { type: "thread"; thread: ChatThread }
  | { type: "read"; threadId: string; by: ChatSender }
  | { type: "typing"; threadId: string; who: ChatSender; isTyping: boolean }
  | { type: "presence"; presence: PresencePayload }
  | { type: "deleted"; threadId: string }

type Ping = { type: "ping" }

type SendOpts = {
  authorName?: string
  attachmentUrl?: string
  attachmentName?: string
  attachmentType?: AttachmentType
}

// Row shapes inferred from the Drizzle tables.
type ThreadRow = typeof chatThreads.$inferSelect
type MessageRow = typeof chatMessages.$inferSelect

// Only allow attachment URLs that render safely in an <a href>/<img src> sink.
// Accepts site-relative uploads ("/uploads/...") and http(s); rejects unsafe
// schemes (javascript:, data:, vbscript:, etc.) to block script-URL injection.
function isSafeAttachmentUrl(url: string): boolean {
  const u = url.trim()
  if (!u) return false
  if (u.startsWith("/") && !u.startsWith("//")) return true
  try {
    const proto = new URL(u).protocol.toLowerCase()
    return proto === "http:" || proto === "https:"
  } catch {
    return false
  }
}

/** Map a persisted thread row to the API/stream shape (ISO-string timestamps). */
function toApiThread(r: ThreadRow): ChatThread {
  return {
    id: r.id,
    patientName: r.patientName,
    patientPhone: r.patientPhone,
    consultationId: r.consultationId ?? null,
    lastMessage: r.lastMessage ?? "",
    lastSender: (r.lastSender as ChatSender | null) ?? null,
    updatedAt: r.updatedAt.toISOString(),
    createdAt: r.createdAt.toISOString(),
    unreadByStaff: r.unreadByStaff,
    unreadByPatient: r.unreadByPatient,
    status: r.status as ChatThreadStatus,
    closedAt: r.closedAt ? r.closedAt.toISOString() : null,
  }
}

/** Map a persisted message row to the API/stream shape (ISO-string timestamps). */
function toApiMessage(r: MessageRow): ChatMessage {
  return {
    id: r.id,
    threadId: r.threadId,
    sender: r.sender as ChatSender,
    text: r.text,
    createdAt: r.createdAt.toISOString(),
    status: r.status as ChatStatus,
    deliveredAt: r.deliveredAt ? r.deliveredAt.toISOString() : null,
    readAt: r.readAt ? r.readAt.toISOString() : null,
    authorName: r.authorName ?? undefined,
    attachmentUrl: r.attachmentUrl ?? undefined,
    attachmentName: r.attachmentName ?? undefined,
    attachmentType: (r.attachmentType as AttachmentType | null) ?? undefined,
  }
}

@Injectable()
class ChatService {
  // Persistence is Postgres (Drizzle). The maps below are runtime-only transport
  // state: SSE subjects + connection/last-seen presence. They reset on restart by
  // design — the conversation itself lives in the database.
  private threadStreams = new Map<string, Subject<StreamEvent>>()
  private adminStream = new Subject<StreamEvent>()

  // Presence tracking. Patient presence is per-thread; staff is global.
  private patientConns = new Map<string, number>()
  private patientLastSeen = new Map<string, string>()
  private staffConns = 0
  private staffLastSeen: string | null = null

  private streamFor(threadId: string): Subject<StreamEvent> {
    let s = this.threadStreams.get(threadId)
    if (!s) {
      s = new Subject<StreamEvent>()
      this.threadStreams.set(threadId, s)
    }
    return s
  }

  /** Emit to the thread's own stream and to the global admin stream. */
  private emit(threadId: string, ev: StreamEvent) {
    this.streamFor(threadId).next(ev)
    this.adminStream.next(ev)
  }

  /** Broadcast an event to every patient thread stream + admin (global change). */
  private broadcastAll(ev: StreamEvent) {
    this.threadStreams.forEach((s) => s.next(ev))
    this.adminStream.next(ev)
  }

  private async findThread(id: string): Promise<ThreadRow | null> {
    const rows = await db
      .select()
      .from(chatThreads)
      .where(eq(chatThreads.id, id))
      .limit(1)
    return rows[0] ?? null
  }

  async ensureThread(
    sid: string,
    profile?: { name?: string; phone?: string },
  ): Promise<ChatThread> {
    const existing = await this.findThread(sid)
    if (!existing) {
      const inserted = await db
        .insert(chatThreads)
        .values({
          id: sid,
          patientSessionId: sid,
          patientName: profile?.name?.trim() || "Guest patient",
          patientPhone: profile?.phone?.trim() || "",
          consultationId: null,
          lastMessage: "",
          lastSender: null,
          unreadByStaff: 0,
          unreadByPatient: 0,
          status: "active",
          closedAt: null,
        })
        // Two concurrent first-requests for the same new session would both
        // try to insert — the second is a no-op, then we re-read the winner.
        .onConflictDoNothing()
        .returning()
      if (inserted[0]) {
        const t = toApiThread(inserted[0])
        this.adminStream.next({ type: "thread", thread: t })
        return t
      }
      const again = await this.findThread(sid)
      return toApiThread(again!)
    }

    if (profile) {
      const patch: Partial<typeof chatThreads.$inferInsert> = {}
      const name = profile.name?.trim()
      const phone = profile.phone?.trim()
      if (name && existing.patientName !== name) patch.patientName = name
      if (phone && existing.patientPhone !== phone) patch.patientPhone = phone
      if (Object.keys(patch).length > 0) {
        const updated = await db
          .update(chatThreads)
          .set(patch)
          .where(eq(chatThreads.id, sid))
          .returning()
        const t = toApiThread(updated[0]!)
        this.adminStream.next({ type: "thread", thread: t })
        return t
      }
    }
    return toApiThread(existing)
  }

  async listThreads(): Promise<ChatThread[]> {
    const rows = await db
      .select()
      .from(chatThreads)
      .orderBy(desc(chatThreads.updatedAt))
    return rows.map(toApiThread)
  }

  async getThread(id: string): Promise<ChatThread> {
    const t = await this.findThread(id)
    if (!t) throw new HttpException("Thread not found", HttpStatus.NOT_FOUND)
    return toApiThread(t)
  }

  async listMessages(threadId: string): Promise<ChatMessage[]> {
    const rows = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.threadId, threadId))
      .orderBy(asc(chatMessages.createdAt))
    return rows.map(toApiMessage)
  }

  /** Is the recipient of a message from `sender` currently connected? */
  private recipientOnline(threadId: string, sender: ChatSender): boolean {
    if (sender === "patient") return this.staffConns > 0
    return (this.patientConns.get(threadId) ?? 0) > 0
  }

  async sendMessage(
    threadId: string,
    sender: ChatSender,
    text: string,
    opts: SendOpts = {},
  ): Promise<ChatMessage> {
    const trimmed = (text ?? "").toString().trim()
    if (opts.attachmentUrl && !isSafeAttachmentUrl(opts.attachmentUrl)) {
      throw new HttpException("Invalid attachment URL", HttpStatus.BAD_REQUEST)
    }
    const hasAttachment = !!opts.attachmentUrl
    if (!trimmed && !hasAttachment) {
      throw new HttpException("Message text is required", HttpStatus.BAD_REQUEST)
    }
    if (trimmed.length > 4000) {
      throw new HttpException("Message too long", HttpStatus.BAD_REQUEST)
    }
    const t = await this.findThread(threadId)
    if (!t) throw new HttpException("Thread not found", HttpStatus.NOT_FOUND)

    // A connected recipient means the message is delivered immediately.
    const now = new Date()
    const delivered = this.recipientOnline(threadId, sender)
    const insertedMsg = await db
      .insert(chatMessages)
      .values({
        id: newId("msg"),
        threadId,
        sender,
        authorName: opts.authorName ?? null,
        text: trimmed,
        attachmentUrl: opts.attachmentUrl ?? null,
        attachmentName: opts.attachmentName ?? null,
        attachmentType: opts.attachmentType ?? null,
        deliveredAt: delivered ? now : null,
        readAt: null,
        status: delivered ? "delivered" : "sent",
      })
      .returning()
    const msg = toApiMessage(insertedMsg[0]!)

    // New activity reopens an archived (ended) consultation thread.
    const updatedThread = await db
      .update(chatThreads)
      .set({
        lastMessage:
          trimmed || (opts.attachmentType === "image" ? "Photo" : "Attachment"),
        lastSender: sender,
        updatedAt: now,
        status: "active",
        closedAt: null,
        unreadByStaff: t.unreadByStaff + (sender === "patient" ? 1 : 0),
        unreadByPatient: t.unreadByPatient + (sender === "staff" ? 1 : 0),
      })
      .where(eq(chatThreads.id, threadId))
      .returning()
    const thread = toApiThread(updatedThread[0]!)

    this.emit(threadId, { type: "message", threadId, message: msg })
    this.emit(threadId, { type: "thread", thread })
    return msg
  }

  /** Mark all messages addressed TO `to` that are still "sent" as "delivered". */
  private async markDelivered(threadId: string, to: ChatSender): Promise<void> {
    const now = new Date()
    const updated = await db
      .update(chatMessages)
      .set({ status: "delivered", deliveredAt: now })
      .where(
        and(
          eq(chatMessages.threadId, threadId),
          ne(chatMessages.sender, to),
          eq(chatMessages.status, "sent"),
        ),
      )
      .returning()
    updated.forEach((r) =>
      this.emit(threadId, { type: "message", threadId, message: toApiMessage(r) }),
    )
  }

  async markRead(threadId: string, by: ChatSender): Promise<ChatThread> {
    const t = await this.findThread(threadId)
    if (!t) throw new HttpException("Thread not found", HttpStatus.NOT_FOUND)
    const updated = await db
      .update(chatThreads)
      .set(by === "staff" ? { unreadByStaff: 0 } : { unreadByPatient: 0 })
      .where(eq(chatThreads.id, threadId))
      .returning()
    const now = new Date()
    await db
      .update(chatMessages)
      .set({
        status: "read",
        readAt: now,
        // A message read before it was ever marked delivered still gets a
        // delivered timestamp so the sender's ticks remain monotonic.
        deliveredAt: sql`COALESCE(${chatMessages.deliveredAt}, ${now})`,
      })
      .where(
        and(
          eq(chatMessages.threadId, threadId),
          ne(chatMessages.sender, by),
          ne(chatMessages.status, "read"),
        ),
      )
    const thread = toApiThread(updated[0]!)
    this.emit(threadId, { type: "read", threadId, by })
    this.emit(threadId, { type: "thread", thread })
    return thread
  }

  /**
   * End a consultation and preserve its transcript. Marks the thread
   * "archived" + timestamps `closedAt`. The conversation and all messages
   * are kept (not deleted) so they remain a retrievable saved record.
   */
  async closeThread(
    threadId: string,
    consultationId?: string,
  ): Promise<ChatThread> {
    const t = await this.findThread(threadId)
    if (!t) throw new HttpException("Thread not found", HttpStatus.NOT_FOUND)
    const patch: Partial<typeof chatThreads.$inferInsert> = {
      status: "archived",
      closedAt: new Date(),
    }
    if (consultationId) patch.consultationId = consultationId
    const updated = await db
      .update(chatThreads)
      .set(patch)
      .where(eq(chatThreads.id, threadId))
      .returning()
    const thread = toApiThread(updated[0]!)
    this.emit(threadId, { type: "thread", thread })
    return thread
  }

  setTyping(threadId: string, who: ChatSender, isTyping: boolean): void {
    // Typing is ephemeral and high-frequency (fires on keystrokes), so we emit
    // without a DB round-trip. A typing event for a missing thread is harmless.
    this.emit(threadId, { type: "typing", threadId, who, isTyping })
  }

  async deleteThread(threadId: string): Promise<void> {
    // chat_messages cascade-delete via the thread FK.
    const deleted = await db
      .delete(chatThreads)
      .where(eq(chatThreads.id, threadId))
      .returning()
    if (deleted.length === 0) {
      throw new HttpException("Thread not found", HttpStatus.NOT_FOUND)
    }
    this.patientConns.delete(threadId)
    this.patientLastSeen.delete(threadId)
    this.emit(threadId, { type: "deleted", threadId })
    this.threadStreams.get(threadId)?.complete()
    this.threadStreams.delete(threadId)
  }

  /* ── Presence (runtime-only, in-memory) ──────────────────── */

  private staffPresence(threadId: string): PresencePayload {
    return {
      who: "staff",
      threadId,
      online: this.staffConns > 0,
      lastSeen: this.staffConns > 0 ? null : this.staffLastSeen,
    }
  }

  private patientPresence(threadId: string): PresencePayload {
    const online = (this.patientConns.get(threadId) ?? 0) > 0
    return {
      who: "patient",
      threadId,
      online,
      lastSeen: online ? null : this.patientLastSeen.get(threadId) ?? null,
    }
  }

  /** Thread ids we currently hold any presence info for (online or last-seen). */
  private presenceThreadIds(): string[] {
    return [
      ...new Set([...this.patientConns.keys(), ...this.patientLastSeen.keys()]),
    ]
  }

  /** A patient SSE connection opened. Returns the initial snapshot to push. */
  patientConnect(threadId: string): StreamEvent[] {
    this.patientConns.set(threadId, (this.patientConns.get(threadId) ?? 0) + 1)
    // Deliver any pending staff→patient messages (fire-and-forget; emits land
    // on the just-subscribed stream).
    void this.markDelivered(threadId, "patient").catch(() => {})
    // Tell staff this patient is online.
    this.adminStream.next({ type: "presence", presence: this.patientPresence(threadId) })
    // Snapshot for the patient: is the pharmacy online?
    return [{ type: "presence", presence: this.staffPresence(threadId) }]
  }

  patientDisconnect(threadId: string): void {
    const n = Math.max(0, (this.patientConns.get(threadId) ?? 0) - 1)
    if (n === 0) {
      this.patientConns.delete(threadId)
      this.patientLastSeen.set(threadId, new Date().toISOString())
    } else {
      this.patientConns.set(threadId, n)
    }
    this.adminStream.next({ type: "presence", presence: this.patientPresence(threadId) })
  }

  /** Deliver pending patient→staff messages across every thread. */
  private async deliverAllToStaff(): Promise<void> {
    const rows = await db.select({ id: chatThreads.id }).from(chatThreads)
    for (const r of rows) await this.markDelivered(r.id, "staff")
  }

  /** A staff (admin) SSE connection opened. Returns the initial snapshot. */
  staffConnect(): StreamEvent[] {
    this.staffConns++
    if (this.staffConns === 1) {
      // First staff online: deliver pending patient→staff messages everywhere
      // and tell every patient the pharmacy is online.
      void this.deliverAllToStaff().catch(() => {})
      this.broadcastAll({ type: "presence", presence: this.staffPresence("") })
    }
    // Snapshot for this admin: every known patient's presence + staff.
    const snap: StreamEvent[] = this.presenceThreadIds().map((id) => ({
      type: "presence" as const,
      presence: this.patientPresence(id),
    }))
    snap.push({ type: "presence", presence: this.staffPresence("") })
    return snap
  }

  staffDisconnect(): void {
    this.staffConns = Math.max(0, this.staffConns - 1)
    if (this.staffConns === 0) {
      this.staffLastSeen = new Date().toISOString()
      this.broadcastAll({ type: "presence", presence: this.staffPresence("") })
    }
  }

  threadStream$(threadId: string): Observable<StreamEvent> {
    return this.streamFor(threadId).asObservable()
  }

  adminStream$(): Observable<StreamEvent> {
    return this.adminStream.asObservable()
  }
}

type SendBody = {
  text?: string
  name?: string
  phone?: string
  attachmentUrl?: string
  attachmentName?: string
  attachmentType?: AttachmentType
}
type TypingBody = { isTyping?: boolean }
type CloseBody = { consultationId?: string }

@Controller("chat")
@RequirePerm("chat.respond")
class ChatController {
  constructor(@Inject(ChatService) private readonly svc: ChatService) {}

  /* ── Patient ── */
  @Get("me")
  myThread(@Req() req: Request) {
    return this.svc.ensureThread(req.sessionId)
  }

  @Get("me/messages")
  async myMessages(@Req() req: Request) {
    await this.svc.ensureThread(req.sessionId)
    return this.svc.listMessages(req.sessionId)
  }

  @Post("me/messages")
  async sendAsPatient(@Req() req: Request, @Body() body: SendBody) {
    const t = await this.svc.ensureThread(req.sessionId, {
      name: body?.name,
      phone: body?.phone,
    })
    return this.svc.sendMessage(t.id, "patient", body?.text ?? "", {
      authorName: body?.name,
      attachmentUrl: body?.attachmentUrl,
      attachmentName: body?.attachmentName,
      attachmentType: body?.attachmentType,
    })
  }

  @Post("me/read")
  async markPatientRead(@Req() req: Request) {
    await this.svc.ensureThread(req.sessionId)
    return this.svc.markRead(req.sessionId, "patient")
  }

  @Post("me/typing")
  async patientTyping(@Req() req: Request, @Body() body: TypingBody) {
    await this.svc.ensureThread(req.sessionId)
    this.svc.setTyping(req.sessionId, "patient", !!body?.isTyping)
    return { ok: true }
  }

  @Post("me/close")
  async closeMyThread(@Req() req: Request, @Body() body: CloseBody) {
    await this.svc.ensureThread(req.sessionId)
    return this.svc.closeThread(req.sessionId, body?.consultationId)
  }

  @Post("me/test")
  async patientTest(@Req() req: Request, @Body() body: SendBody) {
    const t = await this.svc.ensureThread(req.sessionId, { name: body?.name, phone: body?.phone })
    return this.svc.sendMessage(
      t.id,
      "patient",
      "Connection test — this message confirms the chat is live.",
      { authorName: body?.name },
    )
  }

  @Sse("me/stream")
  myStream(@Req() req: Request): Observable<{ data: StreamEvent | Ping }> {
    const sid = req.sessionId
    // Ensure the thread row exists (fire-and-forget; other endpoints also
    // ensure it). Presence is in-memory and synchronous below.
    void this.svc.ensureThread(sid).catch(() => {})
    return new Observable<{ data: StreamEvent | Ping }>((subscriber) => {
      const snapshot = this.svc.patientConnect(sid)
      const sub = merge(
        this.svc.threadStream$(sid),
        interval(25_000).pipe(map((): Ping => ({ type: "ping" }))),
      )
        .pipe(map((e) => ({ data: e })))
        .subscribe(subscriber)
      // Push initial presence snapshot to the freshly-connected patient.
      snapshot.forEach((e) => subscriber.next({ data: e }))
      return () => {
        sub.unsubscribe()
        this.svc.patientDisconnect(sid)
      }
    })
  }

  /* ── Admin (gated by AdminGuard: ADMIN_API_TOKEN in prod, open in dev) ── */
  @UseGuards(AdminGuard)
  @Get("admin/threads")
  adminThreads() {
    return this.svc.listThreads()
  }

  @UseGuards(AdminGuard)
  @Get("admin/threads/:id")
  adminThread(@Param("id") id: string) {
    return this.svc.getThread(id)
  }

  @UseGuards(AdminGuard)
  @Get("admin/threads/:id/messages")
  adminMessages(@Param("id") id: string) {
    return this.svc.listMessages(id)
  }

  @UseGuards(AdminGuard)
  @Post("admin/threads/:id/messages")
  async sendAsStaff(@Param("id") id: string, @Body() body: SendBody) {
    await this.svc.getThread(id)
    return this.svc.sendMessage(id, "staff", body?.text ?? "", {
      authorName: body?.name || "Pharmacist",
      attachmentUrl: body?.attachmentUrl,
      attachmentName: body?.attachmentName,
      attachmentType: body?.attachmentType,
    })
  }

  @UseGuards(AdminGuard)
  @Post("admin/threads/:id/read")
  markStaffRead(@Param("id") id: string) {
    return this.svc.markRead(id, "staff")
  }

  @UseGuards(AdminGuard)
  @Post("admin/threads/:id/typing")
  staffTyping(@Param("id") id: string, @Body() body: TypingBody) {
    this.svc.setTyping(id, "staff", !!body?.isTyping)
    return { ok: true }
  }

  @UseGuards(AdminGuard)
  @Post("admin/threads/:id/test")
  async staffTest(@Param("id") id: string, @Body() body: SendBody) {
    await this.svc.getThread(id)
    return this.svc.sendMessage(
      id,
      "staff",
      "Connection test — this message confirms the chat is live.",
      { authorName: body?.name || "Pharmacist" },
    )
  }

  @UseGuards(AdminGuard)
  @Post("admin/threads/:id/close")
  closeThread(@Param("id") id: string, @Body() body: CloseBody) {
    return this.svc.closeThread(id, body?.consultationId)
  }

  @UseGuards(AdminGuard)
  @Delete("admin/threads/:id")
  async deleteThread(@Param("id") id: string) {
    await this.svc.deleteThread(id)
    return { ok: true }
  }

  @UseGuards(AdminGuard)
  @Sse("admin/stream")
  adminStream(): Observable<{ data: StreamEvent | Ping }> {
    return new Observable<{ data: StreamEvent | Ping }>((subscriber) => {
      const snapshot = this.svc.staffConnect()
      const sub = merge(
        this.svc.adminStream$(),
        interval(25_000).pipe(map((): Ping => ({ type: "ping" }))),
      )
        .pipe(map((e) => ({ data: e })))
        .subscribe(subscriber)
      snapshot.forEach((e) => subscriber.next({ data: e }))
      return () => {
        sub.unsubscribe()
        this.svc.staffDisconnect()
      }
    })
  }
}

@Module({
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
