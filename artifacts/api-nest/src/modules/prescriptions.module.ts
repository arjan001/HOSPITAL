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
  Res,
  UseGuards,
} from "@nestjs/common"
import type { Request, Response } from "express"
import { InMemoryRepository, newId } from "../common/repository"
import { AdminGuard, RequirePerm } from "../common/admin-guard"
import { getStorage } from "../common/storage"
import { PaystackModule, PaystackService } from "./paystack.module"
import { UploadsModule, UploadsService } from "./uploads.module"
import { PatientNotificationsModule, PatientNotificationsService, type PatientNotificationEvent } from "./patient-notifications.module"

export type PrescriptionStatus = "pending" | "verified" | "dispensed" | "rejected"
export type PaymentMethod = "cash" | "insurance" | "unknown"

export type ApprovedDrug = {
  name: string
  dosage: string
  instructions: string
  /**
   * Per-unit price in whole KSh the customer pays for this item. `null` means
   * the pharmacist hasn't priced it yet — the storefront applies a sensible
   * default at buy time (see DEFAULT_DRUG_PRICE).
   */
  price: number | null
  /** Quantity to dispense; defaults to 1. */
  quantity: number
}

/** Fallback per-unit price (KSh) when a drug has no explicit price set. */
export const DEFAULT_DRUG_PRICE = 750

export type TimelineEvent = {
  at: string
  kind: "uploaded" | "received" | "in_review" | "verified" | "dispensed" | "rejected" | "note" | "payment"
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
  /** Doctor's clinical note — surfaced when the Rx came from a consultation. */
  doctorNote: string
  approvedDrugs: ApprovedDrug[]
  rejectedReason?: string
  /** Payment of the itemized approved-drug cart (set when the customer buys). */
  payment?: { amount: number; reference: string; receipt?: string; at: string }
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
  "status" | "pharmacistNote" | "doctorNote" | "approvedDrugs" | "rejectedReason"
>>

type PayInput = { amount?: number; reference?: string; receipt?: string }

/** Normalize an untrusted approved-drug payload into the stored shape. */
function normalizeDrug(d: Partial<ApprovedDrug> | undefined): ApprovedDrug {
  const rawPrice = (d as { price?: unknown })?.price
  const price =
    typeof rawPrice === "number" && Number.isFinite(rawPrice) && rawPrice >= 0
      ? Math.round(rawPrice)
      : null
  const rawQty = (d as { quantity?: unknown })?.quantity
  const quantity =
    typeof rawQty === "number" && Number.isFinite(rawQty) && rawQty >= 1
      ? Math.round(rawQty)
      : 1
  return {
    name: String(d?.name ?? ""),
    dosage: String(d?.dosage ?? ""),
    instructions: String(d?.instructions ?? ""),
    price,
    quantity,
  }
}

function nextRxNumber(): string {
  // Short, human-readable; uniqueness comes from `id`.
  return `${Date.now().toString(36).toUpperCase().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`
}

@Injectable()
export class PrescriptionsService {
  constructor(
    @Inject(PaystackService) private readonly paystack: PaystackService,
    @Inject(UploadsService) private readonly uploads: UploadsService,
    @Inject(PatientNotificationsService) private readonly patientNotify: PatientNotificationsService,
  ) {}

  private repo = new InMemoryRepository<Prescription>()
  // Tracks which session owns which prescription id — admin endpoints don't
  // know the patient's sessionId but still need to read/update records.
  private ownerOf = new Map<string, string>()
  // Payment references already consumed by a prescription — prevents replaying
  // one successful charge across multiple prescriptions.
  private consumedReferences = new Set<string>()

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
      files: (data.files ?? []).map((f) => {
        const key = f?.key ? String(f.key) : undefined
        // Only bind a storage key the *current session* actually uploaded.
        // Trusting an arbitrary client-supplied key would let one user attach
        // (and then read, via the owner-checked file route) another user's
        // scan. A key not owned by this session is dropped to undefined.
        const ownedKey = key && this.uploads.ownsKey(sid, key) ? key : undefined
        return {
          name: String(f?.name ?? "attachment"),
          size: typeof f?.size === "number" ? f.size : undefined,
          type: f?.type ? String(f.type) : undefined,
          url: ownedKey ? String(f?.url ?? "") : undefined,
          key: ownedKey,
        }
      }),
      notes: String(data.notes ?? ""),
      status: "pending",
      paymentMethod: data.paymentMethod === "insurance" ? "insurance" : data.paymentMethod === "cash" ? "cash" : "unknown",
      pharmacistNote: "",
      doctorNote: "",
      approvedDrugs: [],
      timeline: [
        { at: now, kind: "uploaded", label: "Prescription uploaded by you", by: "patient" },
        { at: now, kind: "received", label: "Received by the Shaniid RX pharmacy team", by: "system" },
      ],
      createdAt: now,
      updatedAt: now,
    }
    this.ownerOf.set(rec.id, sid)
    const saved = this.repo.add(sid, rec)
    // Auto-text the patient: "we've received your prescription".
    this.patientNotify.notify("prescription_uploaded", {
      phone: saved.phone,
      name: saved.recipient || saved.patientName,
      variables: { rx_id: saved.rxNumber },
    })
    return saved
  }

  update(sid: string, id: string, patch: UpdateInput): Prescription {
    const current = this.get(sid, id)
    const now = new Date().toISOString()
    const next: Prescription = {
      ...current,
      ...(patch.pharmacistNote !== undefined ? { pharmacistNote: String(patch.pharmacistNote) } : {}),
      ...(patch.doctorNote !== undefined ? { doctorNote: String(patch.doctorNote) } : {}),
      ...(Array.isArray(patch.approvedDrugs)
        ? { approvedDrugs: patch.approvedDrugs.map(normalizeDrug).filter((d) => d.name) }
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

    // Auto-text the patient on a meaningful status transition.
    if (patch.status && patch.status !== current.status) {
      const eventForStatus: Partial<Record<PrescriptionStatus, PatientNotificationEvent>> = {
        verified: "prescription_verified",
        dispensed: "prescription_dispensed",
        rejected: "prescription_rejected",
      }
      const event = eventForStatus[patch.status]
      if (event) {
        this.patientNotify.notify(event, {
          phone: saved.phone,
          name: saved.recipient || saved.patientName,
          variables: {
            rx_id: saved.rxNumber,
            ...(event === "prescription_rejected"
              ? { rx_reason: saved.rejectedReason ?? "" }
              : {}),
          },
        })
      }
    }
    return saved
  }

  /**
   * Record payment for the itemized approved-drug cart and advance the Rx to
   * `dispensed`. Only a `verified` prescription with priced drugs can be paid.
   * The amount is validated server-side against the itemized total so a client
   * can't underpay.
   */
  async pay(sid: string, id: string, input: PayInput): Promise<Prescription> {
    const current = this.get(sid, id)
    if (current.status !== "verified") {
      throw new HttpException(
        "Only a verified prescription can be paid for.",
        HttpStatus.CONFLICT,
      )
    }
    if (current.payment) {
      throw new HttpException("This prescription has already been paid.", HttpStatus.CONFLICT)
    }
    const expected = itemizedTotal(current.approvedDrugs)
    if (expected <= 0) {
      throw new HttpException("There is nothing to pay for yet.", HttpStatus.BAD_REQUEST)
    }
    const reference = String(input?.reference ?? "").trim()
    if (!reference) {
      throw new HttpException("A payment reference is required.", HttpStatus.BAD_REQUEST)
    }
    // Reserve the reference *synchronously* (no await between the check and the
    // add) so two concurrent requests can't both pass the guard and redeem one
    // charge twice. Roll the reservation back on any failure below so a
    // legitimate retry (e.g. payment was still pending) can succeed later.
    if (this.consumedReferences.has(reference)) {
      throw new HttpException(
        "This payment reference has already been used.",
        HttpStatus.CONFLICT,
      )
    }
    this.consumedReferences.add(reference)
    try {
      // Trust only a Paystack-confirmed charge — never the client's word. This
      // throws if the reference is forged, unconfirmed, or underpaid.
      const verified = await this.paystack.verifyPaidReference(reference, expected)
      // Bind the charge to *this* prescription so a successful reference for one
      // Rx (or an unrelated order) can't be redeemed against another.
      if (verified.orderNumber !== `RX-${current.rxNumber}`) {
        throw new HttpException(
          "This payment does not match this prescription.",
          HttpStatus.BAD_REQUEST,
        )
      }
      // Trust the server-computed total over any client-supplied amount.
      const amount = expected
      const now = new Date().toISOString()
      const next: Prescription = {
        ...current,
        status: "dispensed",
        payment: {
          amount,
          reference,
          receipt: verified.mpesaReceipt || (input?.receipt ? String(input.receipt) : undefined),
          at: now,
        },
        timeline: [
          ...current.timeline,
          { at: now, kind: "payment", label: `Payment received — KSh ${amount.toLocaleString()}`, by: "patient" },
          { at: now, kind: "dispensed", label: "Medication dispensed and on its way", by: "pharmacist" },
        ],
        updatedAt: now,
      }
      const saved = this.repo.update(sid, id, next)
      if (!saved) throw new HttpException("Prescription not found", HttpStatus.NOT_FOUND)
      // Auto-text the patient: "payment received".
      this.patientNotify.notify("payment_received", {
        phone: saved.phone,
        name: saved.recipient || saved.patientName,
        variables: {
          order_id: `RX-${saved.rxNumber}`,
          order_total: `KSh ${amount.toLocaleString()}`,
          payment_method: "M-Pesa",
          rx_id: saved.rxNumber,
        },
      })
      // Paying advances the Rx straight to "dispensed", so also fire the
      // "your prescription is ready / on its way" notification — this is the
      // primary automatic path to dispensed and must not be skipped. The two
      // texts are intentionally distinct (payment confirmation vs. fulfilment).
      this.patientNotify.notify("prescription_dispensed", {
        phone: saved.phone,
        name: saved.recipient || saved.patientName,
        variables: {
          rx_id: saved.rxNumber,
          order_id: `RX-${saved.rxNumber}`,
        },
      })
      return saved
    } catch (err) {
      this.consumedReferences.delete(reference)
      throw err
    }
  }

  /** Resolve the storage key for a prescription file by index, owner-checked. */
  fileKey(sid: string, id: string, index: number): string {
    const rx = this.get(sid, id)
    const file = rx.files[index]
    if (!file || !file.key) {
      throw new HttpException("File not found", HttpStatus.NOT_FOUND)
    }
    return file.key
  }
}

/** Sum the itemized cost (price × qty, defaulting unpriced drugs) in KSh. */
export function itemizedTotal(drugs: ApprovedDrug[]): number {
  return drugs.reduce((sum, d) => {
    const unit = typeof d.price === "number" && d.price >= 0 ? d.price : DEFAULT_DRUG_PRICE
    const qty = typeof d.quantity === "number" && d.quantity >= 1 ? d.quantity : 1
    return sum + unit * qty
  }, 0)
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

  /** Pay for the approved drugs and advance the Rx to dispensed. */
  @Post(":id/pay")
  pay(@Req() req: Request, @Param("id") id: string, @Body() body: PayInput) {
    return this.svc.pay(req.sessionId, id, body ?? {})
  }

  /**
   * Stream a prescription file (owner-checked) instead of using the cookie-only
   * static mount, so the scan is only served to the patient who uploaded it.
   */
  @Get(":id/files/:index")
  async file(
    @Req() req: Request,
    @Param("id") id: string,
    @Param("index") index: string,
    @Res() res: Response,
  ) {
    const i = Number.parseInt(index, 10)
    if (!Number.isInteger(i) || i < 0) {
      throw new HttpException("Invalid file index", HttpStatus.BAD_REQUEST)
    }
    const key = this.svc.fileKey(req.sessionId, id, i)
    const result = await getStorage().read(key)
    if (!result) {
      throw new HttpException("File not found", HttpStatus.NOT_FOUND)
    }
    res.setHeader("Content-Type", result.contentType)
    res.setHeader("Content-Disposition", "inline")
    res.setHeader("Cache-Control", "private, max-age=300")
    res.send(result.body)
  }
}

@UseGuards(AdminGuard)
@RequirePerm("rx.view", "rx.verify")
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
    if (typeof body?.doctorNote === "string") safe.doctorNote = body.doctorNote
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
  imports: [PaystackModule, UploadsModule, PatientNotificationsModule],
  controllers: [MyPrescriptionsController, AdminPrescriptionsController],
  providers: [PrescriptionsService],
})
export class PrescriptionsModule {}
