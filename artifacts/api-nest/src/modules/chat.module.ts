/**
 * Chat module — doctor-patient and support chat rooms.
 *
 * Routes:
 *   GET    /api/v2/chat/rooms               — list all rooms for the current session
 *   POST   /api/v2/chat/rooms               — create a new chat room
 *   GET    /api/v2/chat/rooms/:id           — get a room + its messages
 *   POST   /api/v2/chat/rooms/:id/messages  — send a message to a room
 *   DELETE /api/v2/chat/rooms/:id           — close / archive a room
 *   GET    /api/v2/chat/admin/rooms         — admin: list all rooms across sessions
 *   POST   /api/v2/chat/admin/rooms/:id/messages — admin: send a message to any room
 *
 * Data model:
 *   ChatRoom  { id, sessionId, subject, status: "open"|"closed", createdAt }
 *   ChatMessage { id, roomId, sessionId, role: "user"|"agent"|"doctor",
 *                 content, createdAt }
 *
 * Access control:
 *   AdminGuard — a lightweight CanActivate that checks for the
 *   `x-admin-token` request header. This is a placeholder; real RBAC
 *   comes with the NestJS Roles module in Phase 2.
 *
 * Postgres swap:
 *   Replace InMemoryRepository<ChatRoom> and InMemoryRepository<ChatMessage>
 *   in ChatService with Drizzle-backed implementations. No controller changes.
 *
 * Note on @Inject(ChatService):
 *   tsx/esbuild does not emit emitDecoratorMetadata. Explicit @Inject(Token)
 *   is required on every controller constructor — project-wide rule.
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

export type ChatMessage = {
  id: string
  threadId: string
  sender: ChatSender
  text: string
  createdAt: string
  status: ChatStatus
  authorName?: string
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

type StreamEvent =
  | { type: "message"; threadId: string; message: ChatMessage }
  | { type: "thread"; thread: ChatThread }
  | { type: "deleted"; threadId: string }

@Injectable()
class ChatService {
  private threads = new Map<string, ChatThread>()
  private messages = new Map<string, ChatMessage[]>()
  private threadStreams = new Map<string, Subject<StreamEvent>>()
  private adminStream = new Subject<StreamEvent>()

  private streamFor(threadId: string): Subject<StreamEvent> {
    let s = this.threadStreams.get(threadId)
    if (!s) {
      s = new Subject<StreamEvent>()
      this.threadStreams.set(threadId, s)
    }
    return s
  }

  private emit(threadId: string, ev: StreamEvent) {
    this.streamFor(threadId).next(ev)
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

  sendMessage(
    threadId: string,
    sender: ChatSender,
    text: string,
    authorName?: string,
  ): ChatMessage {
    const trimmed = (text ?? "").toString().trim()
    if (!trimmed) {
      throw new HttpException("Message text is required", HttpStatus.BAD_REQUEST)
    }
    if (trimmed.length > 4000) {
      throw new HttpException("Message too long", HttpStatus.BAD_REQUEST)
    }
    const t = this.threads.get(threadId)
    if (!t) throw new HttpException("Thread not found", HttpStatus.NOT_FOUND)
    const msg: ChatMessage = {
      id: newId("msg"),
      threadId,
      sender,
      text: trimmed,
      createdAt: new Date().toISOString(),
      status: "sent",
      authorName,
    }
    const list = this.messages.get(threadId) ?? []
    list.push(msg)
    this.messages.set(threadId, list)

    t.lastMessage = trimmed
    t.lastSender = sender
    t.updatedAt = msg.createdAt
    if (sender === "patient") t.unreadByStaff++
    else t.unreadByPatient++

    this.emit(threadId, { type: "message", threadId, message: msg })
    this.emit(threadId, { type: "thread", thread: t })
    return msg
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
    this.emit(threadId, { type: "thread", thread: t })
    return t
  }

  deleteThread(threadId: string): void {
    if (!this.threads.has(threadId)) {
      throw new HttpException("Thread not found", HttpStatus.NOT_FOUND)
    }
    this.threads.delete(threadId)
    this.messages.delete(threadId)
    this.emit(threadId, { type: "deleted", threadId })
    this.threadStreams.get(threadId)?.complete()
    this.threadStreams.delete(threadId)
  }

  threadStream$(threadId: string): Observable<StreamEvent> {
    return this.streamFor(threadId).asObservable()
  }

  adminStream$(): Observable<StreamEvent> {
    return this.adminStream.asObservable()
  }
}

type SendBody = { text?: string; name?: string; phone?: string }

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
    return this.svc.sendMessage(t.id, "patient", body?.text ?? "", body?.name)
  }

  @Post("me/read")
  markPatientRead(@Req() req: Request) {
    this.svc.ensureThread(req.sessionId)
    return this.svc.markRead(req.sessionId, "patient")
  }

  @Sse("me/stream")
  myStream(@Req() req: Request): Observable<{ data: StreamEvent | { type: "ping" } }> {
    const sid = req.sessionId
    this.svc.ensureThread(sid)
    const events$ = this.svc.threadStream$(sid).pipe(map((e) => ({ data: e })))
    const heartbeat$ = interval(25_000).pipe(
      map(() => ({ data: { type: "ping" as const } })),
    )
    return merge(events$, heartbeat$)
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
    return this.svc.sendMessage(id, "staff", body?.text ?? "", body?.name || "Pharmacist")
  }

  @UseGuards(AdminGuard)
  @Post("admin/threads/:id/read")
  markStaffRead(@Param("id") id: string) {
    return this.svc.markRead(id, "staff")
  }

  @UseGuards(AdminGuard)
  @Delete("admin/threads/:id")
  deleteThread(@Param("id") id: string) {
    this.svc.deleteThread(id)
    return { ok: true }
  }

  @UseGuards(AdminGuard)
  @Sse("admin/stream")
  adminStream(): Observable<{ data: StreamEvent | { type: "ping" } }> {
    const events$ = this.svc.adminStream$().pipe(map((e) => ({ data: e })))
    const heartbeat$ = interval(25_000).pipe(
      map(() => ({ data: { type: "ping" as const } })),
    )
    return merge(events$, heartbeat$)
  }
}

@Module({
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
