/**
 * Prescriptions module — prescription upload, storage, and admin review.
 *
 * Routes:
 *   POST  /api/v2/prescriptions              — upload a new prescription (base64 image/PDF)
 *   GET   /api/v2/prescriptions              — list all prescriptions for the session
 *   GET   /api/v2/prescriptions/:id          — fetch a single prescription
 *   PATCH /api/v2/prescriptions/:id/status   — admin: update review status
 *                                              (pending → reviewing → approved | rejected)
 *   GET   /api/v2/prescriptions/admin/all    — admin: list all prescriptions across sessions
 *
 * Data model:
 *   Prescription {
 *     id, sessionId, patientName, patientPhone, notes,
 *     fileUrl,       — served from /api/v2/uploads/* (gated by session cookie)
 *     fileName, fileType, fileSize,
 *     status: "pending" | "reviewing" | "approved" | "rejected",
 *     adminNotes, reviewedAt, createdAt, updatedAt
 *   }
 *
 * File handling:
 *   Accepts base64-encoded file content in the POST body.
 *   Decodes and saves via Storage.put() → local disk today, S3 later.
 *   Max body size is 8 MB (set in main.ts to accommodate prescription scans).
 *
 * Postgres swap:
 *   Replace `new InMemoryRepository<Prescription>()` in PrescriptionsService
 *   with a Drizzle-backed implementation. No controller changes.
 *
 * Note on @Inject(PrescriptionsService):
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
  Req,
  UseGuards,
} from "@nestjs/common"
import type { Request } from "express"
import { InMemoryRepository, newId } from "../common/repository"
import { AdminGuard } from "../common/admin-guard"

export type PrescriptionStatus = "pending" | "verified" | "dispensed" | "rejected"
export type PaymentMethod = "cash" | "insurance" | "unknown"

export type ApprovedDrug = {
  name: string
  dosage: string
  instructions: string
}

export type TimelineEvent = {
  at: string
  kind: "uploaded" | "received" | "in_review" | "verified" | "dispensed" | "rejected" | "note"
  label: string
  by?: "system" | "pharmacist" | "patient"
}

export type Prescription = {
  id: string
  rxNumber: string
  patientName: string
  recipient: string
  dob?: string
  phone: string
  email: string
  files: { name: string; size?: number; type?: string; url?: string; key?: string }[]
  notes: string
  status: PrescriptionStatus
  paymentMethod: PaymentMethod
  pharmacistNote: string
  approvedDrugs: ApprovedDrug[]
  rejectedReason?: string
  timeline: TimelineEvent[]
  createdAt: string
  updatedAt: string
}

type CreateInput = {
  patientName?: string
  recipient?: string
  dob?: string
  phone?: string
  email?: string
  files?: Array<{ name?: string; size?: number; type?: string; url?: string; key?: string }>
  notes?: string
  paymentMethod?: PaymentMethod
}

type UpdateInput = Partial<Pick<Prescription,
  "status" | "pharmacistNote" | "approvedDrugs" | "rejectedReason"
>>

function nextRxNumber(): string {
  // Short, human-readable; uniqueness comes from `id`.
  return `${Date.now().toString(36).toUpperCase().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`
}

@Injectable()
class PrescriptionsService {
  private repo = new InMemoryRepository<Prescription>()
  // Tracks which session owns which prescription id — admin endpoints don't
  // know the patient's sessionId but still need to read/update records.
  private ownerOf = new Map<string, string>()

  list(sid: string): Prescription[] {
    return [...this.repo.listFor(sid)].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  get(sid: string, id: string): Prescription {
    const r = this.repo.findById(sid, id)
    if (!r) throw new HttpException("Prescription not found", HttpStatus.NOT_FOUND)
    return r
  }

  /** Admin-only: list every prescription across all sessions, newest first. */
  listAll(): Prescription[] {
    const all: Prescription[] = []
    for (const sid of this.ownerOf.values()) {
      // ownerOf may contain duplicates per prescription, dedupe by `id`.
    }
    // Walk distinct sessions via Set so we don't process duplicates.
    const sessions = new Set(this.ownerOf.values())
    for (const sid of sessions) {
      for (const rx of this.repo.listFor(sid)) all.push(rx)
    }
    return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  /** Admin-only: find a prescription by id without knowing the session. */
  findAnywhere(id: string): { sid: string; rx: Prescription } {
    const sid = this.ownerOf.get(id)
    if (sid) {
      const rx = this.repo.findById(sid, id)
      if (rx) return { sid, rx }
    }
    throw new HttpException("Prescription not found", HttpStatus.NOT_FOUND)
  }

  create(sid: string, data: CreateInput): Prescription {
    const now = new Date().toISOString()
    const recipient = String(data.recipient ?? data.patientName ?? "").trim()
    if (!recipient) {
      throw new HttpException("Recipient name is required", HttpStatus.BAD_REQUEST)
    }
    const rec: Prescription = {
      id: newId("rx"),
      rxNumber: nextRxNumber(),
      patientName: String(data.patientName ?? recipient),
      recipient,
      dob: data.dob ? String(data.dob) : undefined,
      phone: String(data.phone ?? ""),
      email: String(data.email ?? ""),
      files: (data.files ?? []).map((f) => ({
        name: String(f?.name ?? "attachment"),
        size: typeof f?.size === "number" ? f.size : undefined,
        type: f?.type ? String(f.type) : undefined,
        url: f?.url ? String(f.url) : undefined,
        key: f?.key ? String(f.key) : undefined,
      })),
      notes: String(data.notes ?? ""),
      status: "pending",
      paymentMethod: data.paymentMethod === "insurance" ? "insurance" : data.paymentMethod === "cash" ? "cash" : "unknown",
      pharmacistNote: "",
      approvedDrugs: [],
      timeline: [
        { at: now, kind: "uploaded", label: "Prescription uploaded by you", by: "patient" },
        { at: now, kind: "received", label: "Received by the Shaniid RX pharmacy team", by: "system" },
      ],
      createdAt: now,
      updatedAt: now,
    }
    this.ownerOf.set(rec.id, sid)
    return this.repo.add(sid, rec)
  }

  update(sid: string, id: string, patch: UpdateInput): Prescription {
    const current = this.get(sid, id)
    const now = new Date().toISOString()
    const next: Prescription = {
      ...current,
      ...(patch.pharmacistNote !== undefined ? { pharmacistNote: String(patch.pharmacistNote) } : {}),
      ...(Array.isArray(patch.approvedDrugs)
        ? { approvedDrugs: patch.approvedDrugs.map((d) => ({
            name: String(d?.name ?? ""),
            dosage: String(d?.dosage ?? ""),
            instructions: String(d?.instructions ?? ""),
          })).filter((d) => d.name) }
        : {}),
      ...(patch.rejectedReason !== undefined ? { rejectedReason: String(patch.rejectedReason) } : {}),
      ...(patch.status ? { status: patch.status } : {}),
      updatedAt: now,
    }

    if (patch.status && patch.status !== current.status) {
      const labelMap: Record<PrescriptionStatus, string> = {
        pending:   "Marked as awaiting review",
        verified:  "Verified by pharmacist — approved medication added",
        dispensed: "Medication dispensed and on its way",
        rejected:  `Prescription rejected${(patch.rejectedReason ?? current.rejectedReason) ? ` — ${patch.rejectedReason ?? current.rejectedReason}` : ""}`,
      }
      const kindMap: Record<PrescriptionStatus, TimelineEvent["kind"]> = {
        pending:   "in_review",
        verified:  "verified",
        dispensed: "dispensed",
        rejected:  "rejected",
      }
      next.timeline = [
        ...current.timeline,
        { at: now, kind: kindMap[patch.status], label: labelMap[patch.status], by: "pharmacist" },
      ]
    } else if (patch.pharmacistNote && patch.pharmacistNote !== current.pharmacistNote) {
      next.timeline = [
        ...current.timeline,
        { at: now, kind: "note", label: "Pharmacist added a note", by: "pharmacist" },
      ]
    }

    const saved = this.repo.update(sid, id, next)
    if (!saved) throw new HttpException("Prescription not found", HttpStatus.NOT_FOUND)
    return saved
  }
}

@Controller("me/prescriptions")
class MyPrescriptionsController {
  constructor(@Inject(PrescriptionsService) private readonly svc: PrescriptionsService) {}

  @Get()
  list(@Req() req: Request) {
    return this.svc.list(req.sessionId)
  }

  @Get(":id")
  get(@Req() req: Request, @Param("id") id: string) {
    return this.svc.get(req.sessionId, id)
  }

  @Post()
  create(@Req() req: Request, @Body() body: CreateInput) {
    return this.svc.create(req.sessionId, body ?? {})
  }

  // Patients can update their own prescription (e.g. add a follow-up note via
  // the rejectedReason field if they want to clarify). Status changes from
  // patient side are limited — we only let them flip pending → pending and
  // append notes through pharmacistNote-shaped fields server-side later.
  @Patch(":id")
  patch(@Req() req: Request, @Param("id") id: string, @Body() body: UpdateInput) {
    const safe: UpdateInput = {}
    if (typeof body?.rejectedReason === "string") safe.rejectedReason = body.rejectedReason
    return this.svc.update(req.sessionId, id, safe)
  }
}

@UseGuards(AdminGuard)
@Controller("admin/prescriptions")
class AdminPrescriptionsController {
  constructor(@Inject(PrescriptionsService) private readonly svc: PrescriptionsService) {}

  @Get()
  list() {
    return this.svc.listAll()
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.svc.findAnywhere(id).rx
  }

  @Patch(":id")
  patch(@Param("id") id: string, @Body() body: UpdateInput) {
    const { sid } = this.svc.findAnywhere(id)
    const safe: UpdateInput = {}
    if (body?.status) safe.status = body.status
    if (typeof body?.pharmacistNote === "string") safe.pharmacistNote = body.pharmacistNote
    if (typeof body?.rejectedReason === "string") safe.rejectedReason = body.rejectedReason
    if (Array.isArray(body?.approvedDrugs)) safe.approvedDrugs = body.approvedDrugs
    return this.svc.update(sid, id, safe)
  }

  @Patch(":id/status")
  patchStatus(@Param("id") id: string, @Body() body: { status?: PrescriptionStatus; reason?: string }) {
    const { sid } = this.svc.findAnywhere(id)
    if (!body?.status) {
      throw new HttpException("status is required", HttpStatus.BAD_REQUEST)
    }
    const patch: UpdateInput = { status: body.status }
    if (body.status === "rejected" && typeof body.reason === "string") {
      patch.rejectedReason = body.reason
    }
    return this.svc.update(sid, id, patch)
  }
}

@Module({
  controllers: [MyPrescriptionsController, AdminPrescriptionsController],
  providers: [PrescriptionsService],
})
export class PrescriptionsModule {}
