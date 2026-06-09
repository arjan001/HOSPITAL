/**
 * Daily.co video rooms — ported from api-server video/daily.ts.
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
} from "@nestjs/common"

const API_BASE = "https://api.daily.co/v1"
const ONE_HOUR = 60 * 60

type Cached = { url: string; name: string; expiresAt: number }
type ActiveSession = {
  name: string
  url: string
  patientName: string
  doctorName: string
  topic: string
  mode: "video" | "voice"
  startedAt: number
  lastSeen: number
  doctorJoined: boolean
}

@Injectable()
export class VideoService {
  private roomCache = new Map<string, Cached>()
  private activeSessions = new Map<string, ActiveSession>()
  private readonly HEARTBEAT_STALE_MS = 90_000

  private dailyKey(): string | null {
    return process.env.DAILY_API_KEY?.trim() || null
  }

  private dailyHeaders(): Record<string, string> | null {
    const key = this.dailyKey()
    if (!key) return null
    return { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }
  }

  private safeRoomName(input: string): string {
    return (
      input
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40) || `room-${Date.now()}`
    )
  }

  private pruneStale() {
    const now = Date.now()
    for (const [k, s] of this.activeSessions) {
      if (now - s.lastSeen > this.HEARTBEAT_STALE_MS) this.activeSessions.delete(k)
    }
  }

  async createRoom(body: {
    name?: string
    expiresInSeconds?: number
    enableChat?: boolean
    enableScreenshare?: boolean
    enableRecording?: boolean
    patientName?: string
    doctorName?: string
    topic?: string
    mode?: "video" | "voice"
  }) {
    const headers = this.dailyHeaders()
    if (!headers) {
      throw new HttpException(
        { error: "Video service not configured. Add DAILY_API_KEY.", configured: false },
        HttpStatus.SERVICE_UNAVAILABLE,
      )
    }
    const name = this.safeRoomName(body.name || `consult-${Date.now()}`)
    const ttl = Math.max(60, Math.min(body.expiresInSeconds ?? 2 * ONE_HOUR, 6 * ONE_HOUR))
    const exp = Math.floor(Date.now() / 1000) + ttl
    const cached = this.roomCache.get(name)
    let url: string | null = cached && Date.now() / 1000 <= cached.expiresAt ? cached.url : null

    if (!url) {
      const getResp = await fetch(`${API_BASE}/rooms/${encodeURIComponent(name)}`, { headers })
      if (getResp.ok) {
        const data = (await getResp.json()) as { url?: string }
        url = data.url ?? null
      }
    }
    if (!url) {
      const createResp = await fetch(`${API_BASE}/rooms`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name,
          privacy: "public",
          properties: {
            exp,
            enable_chat: body.enableChat ?? true,
            enable_screenshare: body.enableScreenshare ?? true,
            ...(body.enableRecording === true ? { enable_recording: "cloud" } : {}),
            start_video_off: false,
            start_audio_off: false,
            enable_prejoin_ui: true,
            lang: "en",
          },
        }),
      })
      if (!createResp.ok) {
        const errText = await createResp.text()
        throw new HttpException({ error: "Could not create video room.", detail: errText }, HttpStatus.BAD_GATEWAY)
      }
      const created = (await createResp.json()) as { url: string }
      url = created.url
    }
    this.roomCache.set(name, { name, url: url!, expiresAt: exp })
    this.pruneStale()
    const existing = this.activeSessions.get(name)
    this.activeSessions.set(name, {
      name,
      url: url!,
      patientName: body.patientName || existing?.patientName || "Patient",
      doctorName: body.doctorName || existing?.doctorName || "",
      topic: body.topic || existing?.topic || "Live consultation",
      mode: body.mode === "voice" ? "voice" : "video",
      startedAt: existing?.startedAt ?? Date.now(),
      lastSeen: Date.now(),
      doctorJoined: existing?.doctorJoined ?? false,
    })
    return { name, url, expiresAt: exp, configured: true }
  }

  async createToken(body: { room?: string; userName?: string; isOwner?: boolean; expiresInSeconds?: number }) {
    const headers = this.dailyHeaders()
    if (!headers) {
      throw new HttpException({ error: "Video service not configured.", configured: false }, HttpStatus.SERVICE_UNAVAILABLE)
    }
    if (!body.room) throw new HttpException("room is required", HttpStatus.BAD_REQUEST)
    const tokenResp = await fetch(`${API_BASE}/meeting-tokens`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        properties: {
          room_name: body.room,
          user_name: body.userName || "Guest",
          is_owner: body.isOwner ?? false,
          exp: Math.floor(Date.now() / 1000) + Math.max(60, body.expiresInSeconds ?? ONE_HOUR),
        },
      }),
    })
    if (!tokenResp.ok) {
      throw new HttpException("Could not create meeting token", HttpStatus.BAD_GATEWAY)
    }
    return tokenResp.json()
  }

  listActive() {
    this.pruneStale()
    return { sessions: [...this.activeSessions.values()] }
  }

  heartbeat(body: { room?: string; doctorJoined?: boolean }) {
    const name = String(body.room ?? "")
    const s = this.activeSessions.get(name)
    if (s) {
      s.lastSeen = Date.now()
      if (body.doctorJoined) s.doctorJoined = true
    }
    return { ok: true }
  }
}

@Controller("video")
class VideoController {
  constructor(@Inject(VideoService) private readonly video: VideoService) {}

  @Post("room")
  room(@Body() body: Record<string, unknown>) {
    return this.video.createRoom(body as Parameters<VideoService["createRoom"]>[0])
  }

  @Post("token")
  token(@Body() body: Record<string, unknown>) {
    return this.video.createToken(body as Parameters<VideoService["createToken"]>[0])
  }

  @Get("active")
  active() {
    return this.video.listActive()
  }

  @Post("heartbeat")
  heartbeat(@Body() body: Record<string, unknown>) {
    return this.video.heartbeat(body as { room?: string; doctorJoined?: boolean })
  }
}

@Module({
  controllers: [VideoController],
  providers: [VideoService],
  exports: [VideoService],
})
export class VideoModule {}
