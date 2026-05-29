/**
 * Partners module — server-side authentication and order submission for the
 * three partner portals (supplier, clinic, logistics).
 *
 * Routes:
 *   POST   /api/v2/partners/:type/auth          — verify portal code + email
 *   POST   /api/v2/partners/:type/orders        — clinic submits an order
 *   GET    /api/v2/partners/:type/orders        — current session's submissions
 *
 * Auth model:
 *   Clinics, suppliers, and logistics partners are still managed via the
 *   admin cmsStore (`clinics`, `suppliers`, `logistics-partners` keys).
 *   On a successful `POST /auth` the server stamps `req.session` (via the
 *   session cookie) with the matched partner id. Subsequent partner API
 *   calls read the stamp from an in-memory map keyed by `req.sessionId`.
 *
 *   This is intentionally lightweight — Phase 2 will move partner identity
 *   into Clerk-issued JWTs. The contract here will not change.
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
  Post,
  Req,
  UseGuards,
} from "@nestjs/common"
import type { Request } from "express"
import { newId } from "../common/repository"
import { EmailModule, EmailService } from "./email.module"
import { AdminGuard } from "../common/admin-guard"

const CMS_BASE = `http://127.0.0.1:${process.env.PORT || 8090}/api/v2/admin/cms`
const CMS_TIMEOUT_MS = 4_000
const INTERNAL_TOKEN = process.env.ADMIN_API_TOKEN?.trim()
const INTERNAL_HEADERS: Record<string, string> = INTERNAL_TOKEN
  ? { "x-admin-token": INTERNAL_TOKEN }
  : {}

async function cmsGet<T>(key: string, fallback: T): Promise<T> {
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), CMS_TIMEOUT_MS)
    try {
      const res = await fetch(`${CMS_BASE}/${encodeURIComponent(key)}`, {
        headers: INTERNAL_HEADERS,
        signal: ctrl.signal,
      })
      if (res.status === 404) return fallback
      if (!res.ok) return fallback
      const body = (await res.json()) as { value: T }
      return body.value ?? fallback
    } finally {
      clearTimeout(timer)
    }
  } catch {
    return fallback
  }
}

async function cmsPut<T>(key: string, value: T): Promise<void> {
  await fetch(`${CMS_BASE}/${encodeURIComponent(key)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...INTERNAL_HEADERS },
    body: JSON.stringify(value),
  }).catch(() => undefined)
}

export type PartnerType = "supplier" | "clinic" | "logistics"

const CMS_KEY_FOR: Record<PartnerType, string> = {
  supplier: "suppliers",
  clinic: "clinics",
  logistics: "logistics-partners",
}

type PartnerRecord = {
  id: string
  email?: string
  portalCode?: string
  // Free-form: each partner type adds its own fields. We only care about
  // `email` and `portalCode` for authentication.
  [key: string]: unknown
}

type PartnerStamp = {
  partnerId: string
  partnerType: PartnerType
  loggedInAt: string
}

export type PartnerSubmission = {
  id: string
  partnerType: PartnerType
  partnerId: string
  partnerSessionId: string
  kind: "order" | "kyc" | "product" | "delivery-confirmation" | "message"
  payload: unknown
  status: "submitted" | "received" | "processed"
  createdAt: string
}

const PORTAL_PATHS: Record<PartnerType, string> = {
  supplier: "/portal/supplier",
  clinic: "/portal/clinic",
  logistics: "/portal/logistics",
}

@Injectable()
class PartnersService {
  constructor(@Inject(EmailService) private readonly email: EmailService) {}

  /**
   * In-memory map keyed by req.sessionId → partner stamp. Cleared on
   * process restart; that's intentional today (matches the rest of the
   * NestJS in-memory pattern).
   */
  private sessions = new Map<string, PartnerStamp>()
  /** All partner submissions, newest-first. */
  private submissions: PartnerSubmission[] = []

  async sendWelcome(input: {
    type: string
    name: string
    email: string
    portalCode: string
  }): Promise<{ ok: boolean; reason?: string; skipped?: boolean }> {
    const t = input?.type === "supplier" ? "supplier" : input?.type === "clinic" ? "clinic" : "logistics"
    const baseUrl = process.env.PUBLIC_APP_URL?.trim() || "https://shaniidrx.com"
    return this.email.send({
      to: input.email,
      template: "partner.welcome",
      subject: "Your Shaniid RX partner portal access",
      data: {
        name: input.name || input.email,
        partnerType: t,
        email: input.email,
        portalCode: input.portalCode,
        portalUrl: `${baseUrl}${PORTAL_PATHS[t]}`,
      },
    })
  }

  private assertType(t: string): PartnerType {
    if (t === "supplier" || t === "clinic" || t === "logistics") return t
    throw new HttpException(`Unknown partner type "${t}"`, HttpStatus.BAD_REQUEST)
  }

  async authenticate(
    sessionId: string,
    type: string,
    email: string,
    portalCode: string,
  ): Promise<{ ok: boolean; partner: { id: string; name: string } | null }> {
    const partnerType = this.assertType(type)
    const cleanedEmail = (email || "").trim().toLowerCase()
    const cleanedCode = (portalCode || "").trim().toUpperCase()
    if (!cleanedEmail || !cleanedCode) {
      throw new HttpException("Email and portal code are required", HttpStatus.BAD_REQUEST)
    }

    const partners = await cmsGet<PartnerRecord[]>(CMS_KEY_FOR[partnerType], [])
    const match = partners.find((p) => {
      const pemail = String(p.email ?? "").trim().toLowerCase()
      const pcode = String(p.portalCode ?? "").trim().toUpperCase()
      return pemail === cleanedEmail && pcode === cleanedCode
    })
    if (!match) {
      throw new HttpException("Invalid email or portal code", HttpStatus.UNAUTHORIZED)
    }

    this.sessions.set(sessionId, {
      partnerId: match.id,
      partnerType,
      loggedInAt: new Date().toISOString(),
    })

    const displayName =
      (match["supplierName"] as string) ||
      (match["clinicName"] as string) ||
      (match["companyName"] as string) ||
      (match["name"] as string) ||
      cleanedEmail
    return { ok: true, partner: { id: match.id, name: displayName } }
  }

  signOut(sessionId: string): void {
    this.sessions.delete(sessionId)
  }

  getStamp(sessionId: string, type: PartnerType): PartnerStamp {
    const stamp = this.sessions.get(sessionId)
    if (!stamp || stamp.partnerType !== type) {
      throw new HttpException("Not signed in", HttpStatus.UNAUTHORIZED)
    }
    return stamp
  }

  async submit(
    sessionId: string,
    type: string,
    body: { kind?: PartnerSubmission["kind"]; payload?: unknown },
  ): Promise<PartnerSubmission> {
    const partnerType = this.assertType(type)
    const stamp = this.getStamp(sessionId, partnerType)
    const kind = body?.kind || "order"
    if (!["order", "kyc", "product", "delivery-confirmation", "message"].includes(kind)) {
      throw new HttpException(`Unsupported submission kind "${kind}"`, HttpStatus.BAD_REQUEST)
    }
    const rec: PartnerSubmission = {
      id: newId("psub"),
      partnerType,
      partnerId: stamp.partnerId,
      partnerSessionId: sessionId,
      kind: kind as PartnerSubmission["kind"],
      payload: body?.payload ?? null,
      status: "submitted",
      createdAt: new Date().toISOString(),
    }
    this.submissions.unshift(rec)

    // Best-effort: also persist into cmsStore so AdminClinics/AdminSuppliers
    // can see partner-originated submissions across restarts.
    void this.mirrorToCms(rec).catch(() => undefined)

    // Send confirmation emails after order/quote submissions
    void this.sendSubmissionEmail(rec, stamp, body?.payload).catch(() => undefined)

    return rec
  }

  private async sendSubmissionEmail(
    rec: PartnerSubmission,
    stamp: PartnerStamp,
    payload: unknown,
  ): Promise<void> {
    const partners = await cmsGet<PartnerRecord[]>(CMS_KEY_FOR[stamp.partnerType], [])
    const partner = partners.find((p) => p.id === stamp.partnerId)
    if (!partner?.email) return

    const baseUrl = process.env.PUBLIC_APP_URL?.trim() || "https://shaniidrx.com"
    const name =
      (partner["clinicName"] as string) ||
      (partner["companyName"] as string) ||
      (partner["supplierName"] as string) ||
      (partner.email as string)

    if (rec.kind === "order" && rec.partnerType === "clinic") {
      const p = payload as Record<string, unknown> | null
      const total = (p?.["total"] as number) ?? 0
      const lines = (p?.["lines"] as Array<{ name: string; qty: number }> | undefined) ?? []
      await this.email.send({
        to: partner.email as string,
        template: "order.receipt",
        subject: `[Shaniid RX] Order received — KSH ${total.toLocaleString()}`,
        data: {
          name,
          orderId: rec.id,
          total,
          items: lines.map((l) => `${l.name} × ${l.qty}`).join(", "),
          portalUrl: `${baseUrl}${PORTAL_PATHS.clinic}`,
        },
      })
    } else if (rec.kind === "order" && rec.partnerType === "supplier") {
      const p = payload as Record<string, unknown> | null
      await this.email.send({
        to: partner.email as string,
        template: "generic",
        subject: `[Shaniid RX] Your quote has been received`,
        data: {
          name,
          heading: "Quote received",
          body: `Thank you for submitting your quote (ref: ${rec.id}). Our sourcing team will review it and get back to you within 2 business days.`,
          cta_url: `${baseUrl}${PORTAL_PATHS.supplier}`,
          cta_label: "View your portal",
          p: p ? JSON.stringify(p).slice(0, 200) : "",
        },
      })
    }
  }

  private async mirrorToCms(rec: PartnerSubmission) {
    const key = `${CMS_KEY_FOR[rec.partnerType]}-submissions`
    const existing = await cmsGet<PartnerSubmission[]>(key, [])
    await cmsPut(key, [rec, ...existing].slice(0, 500))
  }

  listForSession(sessionId: string, type: string): PartnerSubmission[] {
    const partnerType = this.assertType(type)
    const stamp = this.getStamp(sessionId, partnerType)
    return this.submissions.filter(
      (s) => s.partnerType === partnerType && s.partnerId === stamp.partnerId,
    )
  }
}

@Controller("partners/welcome")
class PartnerWelcomeController {
  constructor(@Inject(PartnersService) private readonly svc: PartnersService) {}

  @Post()
  async send(@Body() body: { type?: string; name?: string; email?: string; portalCode?: string }) {
    if (!body?.email) throw new HttpException("email is required", HttpStatus.BAD_REQUEST)
    if (!body?.portalCode) throw new HttpException("portalCode is required", HttpStatus.BAD_REQUEST)
    const r = await this.svc.sendWelcome({
      type: body.type ?? "supplier",
      name: body.name ?? body.email,
      email: body.email,
      portalCode: body.portalCode,
    })
    if (!r.ok && r.skipped) {
      throw new HttpException({ ok: false, hint: r.reason }, HttpStatus.SERVICE_UNAVAILABLE)
    }
    return r
  }
}

@Controller("partners/:type")
class PartnersController {
  constructor(@Inject(PartnersService) private readonly svc: PartnersService) {}

  @Post("auth")
  async auth(
    @Req() req: Request,
    @Param("type") type: string,
    @Body() body: { email?: string; portalCode?: string },
  ) {
    return this.svc.authenticate(
      req.sessionId,
      type,
      body?.email ?? "",
      body?.portalCode ?? "",
    )
  }

  @Post("signout")
  signOut(@Req() req: Request) {
    this.svc.signOut(req.sessionId)
    return { ok: true }
  }

  @Post("orders")
  submit(
    @Req() req: Request,
    @Param("type") type: string,
    @Body() body: { kind?: PartnerSubmission["kind"]; payload?: unknown },
  ) {
    return this.svc.submit(req.sessionId, type, body ?? {})
  }

  @Get("orders")
  list(@Req() req: Request, @Param("type") type: string) {
    return this.svc.listForSession(req.sessionId, type)
  }
}

@Module({
  imports: [EmailModule],
  controllers: [PartnerWelcomeController, PartnersController],
  providers: [PartnersService],
})
export class PartnersModule {}
