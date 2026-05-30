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
 * Persistence: in-memory (survives browser reload; mirrors the Drizzle tables in
 * `lib/db/src/schema/chat.ts`). Postgres swap = replace the Maps with Drizzle —
 * no controller changes. See replit.md "DB-schema discipline".
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
import { newId } from "../common/repository"
import { AdminGuard } from "../common/admin-guard"

export type ChatSender = "patient" | "staff"
export type ChatStatus = "sent" | "delivered" | "read"
export type AttachmentType = "image" | "file"

export type ChatMessage = {
  id: string
  threadId: string
  sender: ChatSender
  text: string
  createdAt: string
  status: ChatStatus
  authorName?: string
  attachmentUrl?: string
  attachmentName?: string
  attachmentType?: AttachmentType
}

export type ChatThread = {
  id: string
  patientName: string
  patientPhone: string
  lastMessage: string
  lastSender: ChatSender | null
  updatedAt: string
  createdAt: string
  unreadByStaff: number
  unreadByPatient: number
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

@Injectable()
class ChatService {
  private threads = new Map<string, ChatThread>()
  private messages = new Map<string, ChatMessage[]>()
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

  ensureThread(sid: string, profile?: { name?: string; phone?: string }): ChatThread {
    let t = this.threads.get(sid)
    if (!t) {
      const now = new Date().toISOString()
      t = {
        id: sid,
        patientName: profile?.name?.trim() || "Guest patient",
        patientPhone: profile?.phone?.trim() || "",
        lastMessage: "",
        lastSender: null,
        updatedAt: now,
        createdAt: now,
        unreadByStaff: 0,
        unreadByPatient: 0,
      }
      this.threads.set(sid, t)
      this.messages.set(sid, [])
      this.adminStream.next({ type: "thread", thread: t })
    } else if (profile) {
      let changed = false
      if (profile.name && profile.name.trim() && t.patientName !== profile.name.trim()) {
        t.patientName = profile.name.trim()
        changed = true
      }
      if (profile.phone && profile.phone.trim() && t.patientPhone !== profile.phone.trim()) {
        t.patientPhone = profile.phone.trim()
        changed = true
      }
      if (changed) this.adminStream.next({ type: "thread", thread: t })
    }
    return t
  }

  listThreads(): ChatThread[] {
    return [...this.threads.values()].sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt),
    )
  }

  getThread(id: string): ChatThread {
    const t = this.threads.get(id)
    if (!t) throw new HttpException("Thread not found", HttpStatus.NOT_FOUND)
    return t
  }

  listMessages(threadId: string): ChatMessage[] {
    return this.messages.get(threadId) ?? []
  }

  /** Is the recipient of a message from `sender` currently connected? */
  private recipientOnline(threadId: string, sender: ChatSender): boolean {
    if (sender === "patient") return this.staffConns > 0
    return (this.patientConns.get(threadId) ?? 0) > 0
  }

  sendMessage(
    threadId: string,
    sender: ChatSender,
    text: string,
    opts: SendOpts = {},
  ): ChatMessage {
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
    const t = this.threads.get(threadId)
    if (!t) throw new HttpException("Thread not found", HttpStatus.NOT_FOUND)

    // A connected recipient means the message is delivered immediately.
    const delivered = this.recipientOnline(threadId, sender)
    const msg: ChatMessage = {
      id: newId("msg"),
      threadId,
      sender,
      text: trimmed,
      createdAt: new Date().toISOString(),
      status: delivered ? "delivered" : "sent",
      authorName: opts.authorName,
      attachmentUrl: opts.attachmentUrl,
      attachmentName: opts.attachmentName,
      attachmentType: opts.attachmentType,
    }
    const list = this.messages.get(threadId) ?? []
    list.push(msg)
    this.messages.set(threadId, list)

    t.lastMessage = trimmed || (opts.attachmentType === "image" ? "Photo" : "Attachment")
    t.lastSender = sender
    t.updatedAt = msg.createdAt
    if (sender === "patient") t.unreadByStaff++
    else t.unreadByPatient++

    this.emit(threadId, { type: "message", threadId, message: msg })
    this.emit(threadId, { type: "thread", thread: t })
    return msg
  }

  /** Mark all messages addressed TO `to` that are still "sent" as "delivered". */
  private markDelivered(threadId: string, to: ChatSender) {
    const list = this.messages.get(threadId) ?? []
    let changed = false
    list.forEach((m) => {
      if (m.sender !== to && m.status === "sent") {
        m.status = "delivered"
        changed = true
        this.emit(threadId, { type: "message", threadId, message: m })
      }
    })
    return changed
  }

  markRead(threadId: string, by: ChatSender): ChatThread {
    const t = this.threads.get(threadId)
    if (!t) throw new HttpException("Thread not found", HttpStatus.NOT_FOUND)
    if (by === "staff") t.unreadByStaff = 0
    else t.unreadByPatient = 0
    const list = this.messages.get(threadId) ?? []
    list.forEach((m) => {
      if (m.sender !== by && m.status !== "read") m.status = "read"
    })
    this.emit(threadId, { type: "read", threadId, by })
    this.emit(threadId, { type: "thread", thread: t })
    return t
  }

  setTyping(threadId: string, who: ChatSender, isTyping: boolean): void {
    if (!this.threads.has(threadId)) return
    this.emit(threadId, { type: "typing", threadId, who, isTyping })
  }

  deleteThread(threadId: string): void {
    if (!this.threads.has(threadId)) {
      throw new HttpException("Thread not found", HttpStatus.NOT_FOUND)
    }
    this.threads.delete(threadId)
    this.messages.delete(threadId)
    this.patientConns.delete(threadId)
    this.patientLastSeen.delete(threadId)
    this.emit(threadId, { type: "deleted", threadId })
    this.threadStreams.get(threadId)?.complete()
    this.threadStreams.delete(threadId)
  }

  /* ── Presence ────────────────────────────────────────────── */

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

  /** A patient SSE connection opened. Returns the initial snapshot to push. */
  patientConnect(threadId: string): StreamEvent[] {
    this.patientConns.set(threadId, (this.patientConns.get(threadId) ?? 0) + 1)
    // Deliver any pending staff→patient messages.
    this.markDelivered(threadId, "patient")
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
    if (this.threads.has(threadId)) {
      this.adminStream.next({ type: "presence", presence: this.patientPresence(threadId) })
    }
  }

  /** A staff (admin) SSE connection opened. Returns the initial snapshot. */
  staffConnect(): StreamEvent[] {
    this.staffConns++
    if (this.staffConns === 1) {
      // First staff online: deliver pending patient→staff messages everywhere
      // and tell every patient the pharmacy is online.
      this.threads.forEach((t) => this.markDelivered(t.id, "staff"))
      this.broadcastAll({ type: "presence", presence: this.staffPresence("") })
    }
    // Snapshot for this admin: every patient's presence + staff.
    const snap: StreamEvent[] = [...this.threads.values()].map((t) => ({
      type: "presence" as const,
      presence: this.patientPresence(t.id),
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

@Controller("chat")
class ChatController {
  constructor(@Inject(ChatService) private readonly svc: ChatService) {}

  /* ── Patient ── */
  @Get("me")
  myThread(@Req() req: Request) {
    return this.svc.ensureThread(req.sessionId)
  }

  @Get("me/messages")
  myMessages(@Req() req: Request) {
    this.svc.ensureThread(req.sessionId)
    return this.svc.listMessages(req.sessionId)
  }

  @Post("me/messages")
  sendAsPatient(@Req() req: Request, @Body() body: SendBody) {
    const t = this.svc.ensureThread(req.sessionId, {
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
  markPatientRead(@Req() req: Request) {
    this.svc.ensureThread(req.sessionId)
    return this.svc.markRead(req.sessionId, "patient")
  }

  @Post("me/typing")
  patientTyping(@Req() req: Request, @Body() body: TypingBody) {
    this.svc.ensureThread(req.sessionId)
    this.svc.setTyping(req.sessionId, "patient", !!body?.isTyping)
    return { ok: true }
  }

  @Post("me/test")
  patientTest(@Req() req: Request, @Body() body: SendBody) {
    const t = this.svc.ensureThread(req.sessionId, { name: body?.name, phone: body?.phone })
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
    this.svc.ensureThread(sid)
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
  sendAsStaff(@Param("id") id: string, @Body() body: SendBody) {
    this.svc.getThread(id)
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
  staffTest(@Param("id") id: string, @Body() body: SendBody) {
    this.svc.getThread(id)
    return this.svc.sendMessage(
      id,
      "staff",
      "Connection test — this message confirms the chat is live.",
      { authorName: body?.name || "Pharmacist" },
    )
  }

  @UseGuards(AdminGuard)
  @Delete("admin/threads/:id")
  deleteThread(@Param("id") id: string) {
    this.svc.deleteThread(id)
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
