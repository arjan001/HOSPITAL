/**
 * Prescriptions module — prescription upload, storage, and admin review.
 *
 * Routes:
 *   POST  /api/v2/me/prescriptions             — upload a new prescription
 *   GET   /api/v2/me/prescriptions             — list the session's prescriptions
 *   GET   /api/v2/me/prescriptions/:id         — fetch a single prescription
 *   POST  /api/v2/me/prescriptions/:id/pay     — pay for approved drugs → dispensed
 *   GET   /api/v2/admin/prescriptions          — admin: list all prescriptions
 *   PATCH /api/v2/admin/prescriptions/:id      — admin: update review fields
 *   PATCH /api/v2/admin/prescriptions/:id/status — admin: update review status
 *
 * Persistence:
 *   Postgres-backed via Drizzle (`@workspace/db` → `prescriptions` +
 *   `prescription_drugs` + `prescription_timeline`). Each prescription resolves
 *   a `userId` from the session via the session→user bridge (clerkId = sid), so
 *   records survive restarts and migrate cleanly to a production Postgres.
 *   Approved drugs and the status timeline are first-class child tables;
 *   payment idempotency is enforced by the `payment_reference` unique index.
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
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common"
import type { Request, Response } from "express"
import { and, desc, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm"
import {
  db,
  prescriptions as rxTable,
  prescriptionDrugs as drugTable,
  prescriptionTimeline as tlTable,
  users as usersTable,
} from "@workspace/db"
import { newId } from "../common/repository"
import { ensureUserId } from "../common/session-user"
import { AdminGuard, RequirePerm } from "../common/admin-guard"
import { getStorage } from "../common/storage"
import { PaystackModule, PaystackService } from "./paystack.module"
import { UploadsModule, UploadsService } from "./uploads.module"
import { PatientNotificationsModule, PatientNotificationsService, type PatientNotificationEvent } from "./patient-notifications.module"
import { NotificationsModule, NotificationsService } from "./notifications.module"
import { AuditService } from "./audit.module"
import { CrmModule, CrmService } from "./crm.module"
import { parseWhatsAppIntakeText } from "../common/whatsapp-intake"
import {
  extractMedicationsFromBuffer,
  isRxExtractionEnabled,
} from "../common/rx-extraction"
import type { ExtractedDrug, RxExtractionStatus } from "@workspace/db"

export type PrescriptionStatus =
  | "pending"
  | "verified"
  | "accepted"
  | "declined"
  | "dispensed"
  | "rejected"
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
  kind:
    | "uploaded"
    | "received"
    | "in_review"
    | "extracted"
    | "verified"
    | "accepted"
    | "declined"
    | "dispensed"
    | "rejected"
    | "note"
    | "payment"
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
  extractionStatus: RxExtractionStatus
  extractedDrugs: ExtractedDrug[]
  extractionSummary?: string
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

type RxRow = typeof rxTable.$inferSelect
type DrugRow = typeof drugTable.$inferSelect
type TlRow = typeof tlTable.$inferSelect

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

function buildPrescription(row: RxRow, drugs: DrugRow[], timeline: TlRow[]): Prescription {
  return {
    id: row.id,
    rxNumber: row.rxNumber,
    patientName: row.patientName,
    recipient: row.recipient ?? row.patientName,
    dob: row.dob ?? undefined,
    phone: row.patientPhone ?? "",
    email: row.email ?? "",
    files: (row.files ?? []) as Prescription["files"],
    notes: row.notes ?? "",
    status: row.status as PrescriptionStatus,
    paymentMethod: row.paymentMethod as PaymentMethod,
    pharmacistNote: row.pharmacistNotes ?? "",
    doctorNote: row.doctorNotes ?? "",
    approvedDrugs: [...drugs]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((d) => ({
        name: d.name,
        dosage: d.dosage ?? "",
        instructions: d.instructions ?? "",
        price: d.price ?? null,
        quantity: d.quantity,
      })),
    extractionStatus: (row.extractionStatus ?? "pending") as RxExtractionStatus,
    extractedDrugs: (row.extractedDrugs ?? []) as ExtractedDrug[],
    extractionSummary: row.extractionSummary ?? undefined,
    rejectedReason: row.rejectedReason ?? undefined,
    payment: row.paidAt
      ? {
          amount: row.paidAmount ?? 0,
          reference: row.paymentReference ?? "",
          receipt: row.paymentReceipt ?? undefined,
          at: row.paidAt.toISOString(),
        }
      : undefined,
    timeline: [...timeline]
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((t) => ({
        at: t.createdAt.toISOString(),
        kind: t.event as TimelineEvent["kind"],
        label: t.note ?? "",
        by: (t.actor as TimelineEvent["by"]) ?? undefined,
      })),
    createdAt: row.submittedAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

@Injectable()
export class PrescriptionsService {
  constructor(
    @Inject(PaystackService) private readonly paystack: PaystackService,
    @Inject(UploadsService) private readonly uploads: UploadsService,
    @Inject(PatientNotificationsService) private readonly patientNotify: PatientNotificationsService,
    // In-app notification feed — backs the bell for the patient (customer:<sid>)
    // and the pharmacy team ("admin" audience). Distinct from patientNotify,
    // which is the SMS/WhatsApp transport.
    @Inject(NotificationsService) private readonly inApp: NotificationsService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(CrmService) private readonly crm: CrmService,
  ) {}

  private async rowById(id: string): Promise<RxRow | undefined> {
    const rows = await db.select().from(rxTable).where(eq(rxTable.id, id)).limit(1)
    return rows[0]
  }

  /** Batch-load drug + timeline child rows for a set of prescriptions. */
  private async childMaps(pids: string[]): Promise<{
    drugs: Map<string, DrugRow[]>
    timeline: Map<string, TlRow[]>
  }> {
    if (pids.length === 0) return { drugs: new Map(), timeline: new Map() }
    const [drugs, tl] = await Promise.all([
      db.select().from(drugTable).where(inArray(drugTable.prescriptionId, pids)),
      db.select().from(tlTable).where(inArray(tlTable.prescriptionId, pids)),
    ])
    const dMap = new Map<string, DrugRow[]>()
    for (const d of drugs) {
      const a = dMap.get(d.prescriptionId) ?? []
      a.push(d)
      dMap.set(d.prescriptionId, a)
    }
    const tMap = new Map<string, TlRow[]>()
    for (const t of tl) {
      const a = tMap.get(t.prescriptionId) ?? []
      a.push(t)
      tMap.set(t.prescriptionId, a)
    }
    return { drugs: dMap, timeline: tMap }
  }

  /** Load + build a single prescription by id (no owner check — internal). */
  private async loadById(id: string): Promise<Prescription> {
    const row = await this.rowById(id)
    if (!row) throw new HttpException("Prescription not found", HttpStatus.NOT_FOUND)
    const { drugs, timeline } = await this.childMaps([id])
    return buildPrescription(row, drugs.get(id) ?? [], timeline.get(id) ?? [])
  }

  private buildMany(rows: RxRow[], drugs: Map<string, DrugRow[]>, timeline: Map<string, TlRow[]>): Prescription[] {
    return rows.map((r) => buildPrescription(r, drugs.get(r.id) ?? [], timeline.get(r.id) ?? []))
  }

  async list(sid: string): Promise<Prescription[]> {
    const uid = await ensureUserId(sid)
    const rows = await db
      .select()
      .from(rxTable)
      .where(eq(rxTable.userId, uid))
      .orderBy(desc(rxTable.submittedAt))
    const { drugs, timeline } = await this.childMaps(rows.map((r) => r.id))
    return this.buildMany(rows, drugs, timeline)
  }

  async get(sid: string, id: string): Promise<Prescription> {
    const uid = await ensureUserId(sid)
    const row = await this.rowById(id)
    if (!row || row.userId !== uid) {
      throw new HttpException("Prescription not found", HttpStatus.NOT_FOUND)
    }
    const { drugs, timeline } = await this.childMaps([id])
    return buildPrescription(row, drugs.get(id) ?? [], timeline.get(id) ?? [])
  }

  /** Admin-only: list every prescription across all sessions, newest first. */
  async listAll(): Promise<Prescription[]> {
    const rows = await db.select().from(rxTable).orderBy(desc(rxTable.submittedAt))
    const { drugs, timeline } = await this.childMaps(rows.map((r) => r.id))
    return this.buildMany(rows, drugs, timeline)
  }

  /**
   * Admin paginated list with status counts. Status/search filters are applied
   * in the DB so pagination stays correct; the KPI counts aggregate the whole
   * table (not just the current page).
   */
  async listAllPaged(opts: {
    page?: number
    pageSize?: number
    status?: string
    search?: string
  }): Promise<{
    items: Prescription[]
    total: number
    page: number
    pageSize: number
    counts: Record<PrescriptionStatus | "all", number>
  }> {
    const page = Math.max(1, Number(opts.page) || 1)
    const pageSize = Math.min(100, Math.max(1, Number(opts.pageSize) || 20))
    const offset = (page - 1) * pageSize

    const filters = []
    const status = (opts.status ?? "").toLowerCase()
    if (status && status !== "all") {
      filters.push(eq(rxTable.status, status))
    }
    if (opts.search) {
      const q = `%${opts.search.trim()}%`
      filters.push(
        or(
          ilike(rxTable.rxNumber, q),
          ilike(rxTable.patientName, q),
          ilike(rxTable.patientPhone, q),
          ilike(rxTable.email, q),
        ),
      )
    }
    const where = filters.length ? and(...filters) : undefined

    const [rows, countRows, statusRows] = await Promise.all([
      db
        .select()
        .from(rxTable)
        .where(where)
        .orderBy(desc(rxTable.submittedAt))
        .limit(pageSize)
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(rxTable).where(where),
      db.select({ status: rxTable.status, count: sql<number>`count(*)::int` }).from(rxTable).groupBy(rxTable.status),
    ])

    const counts: Record<PrescriptionStatus | "all", number> = {
      all: 0,
      pending: 0,
      verified: 0,
      accepted: 0,
      declined: 0,
      dispensed: 0,
      rejected: 0,
    }
    for (const r of statusRows) {
      const st = r.status as PrescriptionStatus
      const n = Number(r.count ?? 0)
      counts.all += n
      if (st in counts) counts[st] = n
    }

    const { drugs, timeline } = await this.childMaps(rows.map((r) => r.id))
    return {
      items: this.buildMany(rows, drugs, timeline),
      total: Number(countRows[0]?.count ?? 0),
      page,
      pageSize,
      counts,
    }
  }

  /** Admin-only: find a prescription by id, resolving its owner session. */
  async findAnywhere(id: string): Promise<{ sid: string; rx: Prescription }> {
    const row = await this.rowById(id)
    if (!row || !row.userId) {
      throw new HttpException("Prescription not found", HttpStatus.NOT_FOUND)
    }
    const owner = await db
      .select({ clerkId: usersTable.clerkId })
      .from(usersTable)
      .where(eq(usersTable.id, row.userId))
      .limit(1)
    const sid = owner[0]?.clerkId
    if (!sid) throw new HttpException("Prescription not found", HttpStatus.NOT_FOUND)
    const { drugs, timeline } = await this.childMaps([id])
    return { sid, rx: buildPrescription(row, drugs.get(id) ?? [], timeline.get(id) ?? []) }
  }

  async create(sid: string, data: CreateInput): Promise<Prescription> {
    const uid = await ensureUserId(sid)
    const now = new Date()
    const recipient = String(data.recipient ?? data.patientName ?? "").trim()
    if (!recipient) {
      throw new HttpException("Recipient name is required", HttpStatus.BAD_REQUEST)
    }
    const files = await Promise.all(
      (data.files ?? []).map(async (f) => {
        const key = f?.key ? String(f.key) : undefined
        // Only bind a storage key the *current session* actually uploaded.
        // Trusting an arbitrary client-supplied key would let one user attach
        // (and then read, via the owner-checked file route) another user's
        // scan. A key not owned by this session is dropped to undefined.
        const ownedKey = key && (await this.uploads.ownsKey(sid, key)) ? key : undefined
        return {
          name: String(f?.name ?? "attachment"),
          size: typeof f?.size === "number" ? f.size : undefined,
          type: f?.type ? String(f.type) : undefined,
          url: ownedKey ? String(f?.url ?? "") : undefined,
          key: ownedKey,
        }
      }),
    )
    const id = newId("rx")
    const rxNumber = nextRxNumber()
    const paymentMethod: PaymentMethod =
      data.paymentMethod === "insurance" ? "insurance" : data.paymentMethod === "cash" ? "cash" : "unknown"
    const hasScans = files.some((f) => Boolean(f.key))
    const extractionStatus: RxExtractionStatus =
      !isRxExtractionEnabled() || !hasScans ? "skipped" : "pending"

    await db.insert(rxTable).values({
      id,
      rxNumber,
      userId: uid,
      uploadId: null,
      patientName: String(data.patientName ?? recipient),
      recipient,
      dob: data.dob ? String(data.dob) : null,
      patientPhone: String(data.phone ?? ""),
      email: String(data.email ?? ""),
      notes: String(data.notes ?? ""),
      status: "pending",
      paymentMethod,
      pharmacistNotes: "",
      doctorNotes: "",
      files,
      extractionStatus,
      extractedDrugs: [],
      extractionSummary: null,
      submittedAt: now,
      updatedAt: now,
    })
    await db.insert(tlTable).values([
      {
        id: newId("tl"),
        prescriptionId: id,
        event: "uploaded",
        note: "Prescription uploaded by you",
        actor: "patient",
        createdAt: now,
      },
      {
        id: newId("tl"),
        prescriptionId: id,
        event: "received",
        note: "Received by the Shaniid RX pharmacy team",
        actor: "system",
        createdAt: new Date(now.getTime() + 1),
      },
    ])

    const saved = await this.loadById(id)
    // Auto-text the patient: "we've received your prescription".
    this.patientNotify.notify("prescription_uploaded", {
      phone: saved.phone,
      name: saved.recipient || saved.patientName,
      variables: { rx_id: saved.rxNumber },
    })
    // In-app: confirm to the patient and alert the pharmacy team to review.
    this.inApp.push(sid, {
      module: "prescriptions",
      level: "success",
      title: "Prescription received",
      body: `We've received Rx ${saved.rxNumber} and our pharmacy team will review it shortly.`,
      href: "/account/prescriptions",
    })
    this.inApp.push("admin", {
      module: "prescriptions",
      level: "alert",
      title: "Prescription upload awaiting review",
      body: `${saved.recipient || saved.patientName} · Rx ${saved.rxNumber}`,
      href: "/admin/prescriptions",
    })
    void this.audit.record({
      module: "Prescriptions",
      action: "create",
      key: `RX-${saved.rxNumber}`,
      summary: `Rx RX-${saved.rxNumber} uploaded by ${saved.recipient || saved.patientName}`,
      after: { status: saved.status },
    })
    void this.crm.recordSessionEvent(sid, "prescription_uploaded", {
      name: saved.patientName,
      phone: saved.phone,
      email: saved.email,
      source: "web_upload",
      metadata: { prescriptionId: id, rxNumber: saved.rxNumber },
    })
    if (extractionStatus === "pending") {
      void this.runExtraction(id)
    }
    return saved
  }

  /**
   * Order capture automation: read uploaded scan(s), extract medication lines
   * for pharmacist confirmation (does not approve or price automatically).
   */
  async runExtraction(rxId: string): Promise<void> {
    const row = await this.rowById(rxId)
    if (!row) return

    const files = (row.files ?? []) as Prescription["files"]
    const target = files.find((f) => f.key)
    if (!target?.key) {
      await db
        .update(rxTable)
        .set({ extractionStatus: "skipped", updatedAt: new Date() })
        .where(eq(rxTable.id, rxId))
      return
    }

    const now = new Date()
    await db
      .update(rxTable)
      .set({ extractionStatus: "processing", updatedAt: now })
      .where(eq(rxTable.id, rxId))

    try {
      const stored = await getStorage().read(target.key)
      if (!stored?.body?.byteLength) {
        throw new Error("Prescription file could not be read from storage")
      }
      const result = await extractMedicationsFromBuffer(stored.body, stored.contentType)
      const status: RxExtractionStatus =
        result.drugs.length > 0 ? "completed" : "failed"
      const summary =
        result.summary ??
        (result.drugs.length > 0
          ? `${result.drugs.length} medication(s) extracted`
          : "No medications detected on scan")

      await db
        .update(rxTable)
        .set({
          extractionStatus: status,
          extractedDrugs: result.drugs,
          extractionSummary: summary,
          updatedAt: new Date(),
        })
        .where(eq(rxTable.id, rxId))

      await db.insert(tlTable).values({
        id: newId("tl"),
        prescriptionId: rxId,
        event: "extracted",
        note:
          result.drugs.length > 0
            ? `System read Rx — ${result.drugs.length} medication line(s) extracted for pharmacist review`
            : "System read Rx — no medication lines detected; pharmacist to enter manually",
        actor: "system",
        createdAt: new Date(),
      })

      if (result.drugs.length > 0) {
        this.inApp.push("admin", {
          module: "prescriptions",
          level: "info",
          title: "Rx scan processed",
          body: `Rx ${row.rxNumber}: ${result.drugs.length} medication(s) extracted — review and confirm`,
          href: "/admin/prescriptions",
        })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Extraction failed"
      await db
        .update(rxTable)
        .set({
          extractionStatus: "failed",
          extractionSummary: msg.slice(0, 500),
          updatedAt: new Date(),
        })
        .where(eq(rxTable.id, rxId))
      console.warn(`[rx-extraction] ${rxId}:`, msg)
    }
  }

  /** Copy extracted lines into the pharmacist medication list (unpriced). */
  async applyExtractedDrugs(sid: string, rxId: string): Promise<Prescription> {
    const current = await this.get(sid, rxId)
    const extracted = current.extractedDrugs ?? []
    if (extracted.length === 0) {
      throw new HttpException("No extracted medications to apply", HttpStatus.BAD_REQUEST)
    }
    const existing = new Set(current.approvedDrugs.map((d) => d.name.toLowerCase()))
    const merged = [...current.approvedDrugs]
    for (const d of extracted) {
      const name = d.name.trim()
      if (!name || existing.has(name.toLowerCase())) continue
      existing.add(name.toLowerCase())
      merged.push(
        normalizeDrug({
          name,
          dosage: d.dosage ?? "",
          instructions: d.instructions ?? "",
          price: null,
          quantity: d.quantity ?? 1,
        }),
      )
    }
    return this.update(sid, rxId, { approvedDrugs: merged })
  }

  /** WhatsApp bot / offline intake — keys user by `wa:<msisdn>`. */
  async createFromWhatsApp(input: {
    phone: string
    text?: string
    name?: string
    email?: string
  }): Promise<Prescription> {
    const digits = (input.phone || "").replace(/\D/g, "")
    if (digits.length < 9) {
      throw new HttpException("Valid phone number required", HttpStatus.BAD_REQUEST)
    }
    const sid = `wa:${digits}`
    const parsed = parseWhatsAppIntakeText(input.text ?? "")
    const recipient = (parsed.name || input.name || "WhatsApp patient").trim()
    const notes =
      `WhatsApp intake.\n${input.text ?? ""}`.trim() +
      (parsed.ailment ? `\nIssue: ${parsed.ailment}` : "") +
      (parsed.service ? `\nService: ${parsed.service}` : "")

    void this.crm.recordEvent(sid, "prescription_uploaded", {
      userId: (await ensureUserId(sid)),
      name: recipient,
      phone: digits,
      email: parsed.email ?? input.email,
      source: "whatsapp",
    })

    return this.create(sid, {
      patientName: recipient,
      recipient,
      phone: digits,
      email: parsed.email ?? input.email ?? "",
      notes,
      paymentMethod: "unknown",
      files: [],
    })
  }

  /**
   * Create a doctor-issued prescription from inside a live consultation. Unlike
   * {@link create} (a patient uploading a scan to be reviewed), this lands the
   * Rx already `verified` with the doctor's chosen medication line-items, linked
   * back to the consultation it came from so it's retrievable from that record.
   */
  async createFromConsultation(
    sid: string,
    input: {
      patientName?: string
      phone?: string
      consultationId?: string | null
      doctorNote?: string
      reviewedBy?: string
      drugs: Array<Partial<ApprovedDrug>>
    },
  ): Promise<Prescription> {
    const uid = await ensureUserId(sid)
    const now = new Date()
    const drugs = (input.drugs ?? []).map(normalizeDrug).filter((d) => d.name)
    if (drugs.length === 0) {
      throw new HttpException("At least one medication is required", HttpStatus.BAD_REQUEST)
    }
    const recipient = String(input.patientName ?? "").trim() || "Patient"
    const id = newId("rx")
    const rxNumber = nextRxNumber()
    await db.insert(rxTable).values({
      id,
      rxNumber,
      userId: uid,
      consultationId: input.consultationId ?? null,
      uploadId: null,
      patientName: recipient,
      recipient,
      patientPhone: String(input.phone ?? ""),
      email: "",
      notes: "",
      status: "verified",
      paymentMethod: "unknown",
      pharmacistNotes: "",
      doctorNotes: String(input.doctorNote ?? ""),
      reviewedBy: input.reviewedBy ?? "Doctor",
      reviewedAt: now,
      files: [],
      extractionStatus: "skipped",
      extractedDrugs: [],
      extractionSummary: null,
      submittedAt: now,
      updatedAt: now,
    })
    await db.insert(drugTable).values(
      drugs.map((d, i) => ({
        id: newId("drug"),
        prescriptionId: id,
        name: d.name,
        dosage: d.dosage,
        instructions: d.instructions,
        price: d.price,
        quantity: d.quantity,
        sortOrder: i,
      })),
    )
    await db.insert(tlTable).values({
      id: newId("tl"),
      prescriptionId: id,
      event: "verified",
      note: "Prescribed by your doctor during the consultation",
      actor: "pharmacist",
      createdAt: now,
    })

    const saved = await this.loadById(id)
    this.patientNotify.notify("prescription_verified", {
      phone: saved.phone,
      name: saved.recipient || saved.patientName,
      variables: { rx_id: saved.rxNumber },
    })
    this.inApp.push(sid, {
      module: "prescriptions",
      level: "success",
      title: "New prescription from your consultation",
      body: `Your doctor prescribed ${drugs.length} item${drugs.length > 1 ? "s" : ""} — Rx ${saved.rxNumber}. Tap to review and order.`,
      href: "/account/prescriptions",
    })
    this.inApp.push("admin", {
      module: "prescriptions",
      level: "info",
      title: "Prescription issued in consultation",
      body: `${saved.recipient || saved.patientName} · Rx ${saved.rxNumber}`,
      href: "/admin/prescriptions",
    })
    void this.audit.record({
      module: "Prescriptions",
      action: "create",
      key: `RX-${saved.rxNumber}`,
      summary: `Rx RX-${saved.rxNumber} issued during consultation — ${drugs.length} item${drugs.length > 1 ? "s" : ""}`,
      after: { rxNumber: saved.rxNumber, drugs: drugs.length, source: "consultation" },
    })
    return saved
  }

  async update(sid: string, id: string, patch: UpdateInput): Promise<Prescription> {
    const current = await this.get(sid, id)
    const now = new Date()

    const set: Partial<typeof rxTable.$inferInsert> = { updatedAt: now }
    if (patch.pharmacistNote !== undefined) set.pharmacistNotes = String(patch.pharmacistNote)
    if (patch.doctorNote !== undefined) set.doctorNotes = String(patch.doctorNote)
    if (patch.rejectedReason !== undefined) set.rejectedReason = String(patch.rejectedReason)
    if (patch.status) set.status = patch.status
    if (
      patch.status &&
      patch.status !== current.status &&
      (patch.status === "verified" || patch.status === "rejected")
    ) {
      set.reviewedAt = now
      set.reviewedBy = set.reviewedBy ?? "Pharmacist"
    }
    await db.update(rxTable).set(set).where(eq(rxTable.id, id))

    // Approved drugs are a full replace (mirrors the previous in-memory shape).
    if (Array.isArray(patch.approvedDrugs)) {
      const drugs = patch.approvedDrugs.map(normalizeDrug).filter((d) => d.name)
      await db.delete(drugTable).where(eq(drugTable.prescriptionId, id))
      if (drugs.length > 0) {
        await db.insert(drugTable).values(
          drugs.map((d, i) => ({
            id: newId("drug"),
            prescriptionId: id,
            name: d.name,
            dosage: d.dosage,
            instructions: d.instructions,
            price: d.price,
            quantity: d.quantity,
            sortOrder: i,
          })),
        )
      }
    }

    if (patch.status && patch.status !== current.status) {
      if (patch.status === "verified") {
        void this.crm.recordSessionEvent(sid, "qualified", {
          phone: current.phone,
          name: current.patientName,
          metadata: { prescriptionId: id },
        })
        void this.crm.recordSessionEvent(sid, "quoted", {
          phone: current.phone,
          name: current.patientName,
          metadata: { prescriptionId: id },
        })
      }
      if (patch.status === "dispensed") {
        void this.crm.recordSessionEvent(sid, "delivered", {
          phone: current.phone,
          name: current.patientName,
          metadata: { prescriptionId: id },
        })
      }
      const labelMap: Record<PrescriptionStatus, string> = {
        pending:   "Marked as awaiting review",
        verified:  "Verified by pharmacist — quotation ready for your approval",
        accepted:  "Quotation accepted — ready to pay",
        declined:  "Quotation declined",
        dispensed: "Medication dispensed and on its way",
        rejected:  `Prescription rejected${(patch.rejectedReason ?? current.rejectedReason) ? ` — ${patch.rejectedReason ?? current.rejectedReason}` : ""}`,
      }
      const kindMap: Record<PrescriptionStatus, TimelineEvent["kind"]> = {
        pending:   "in_review",
        verified:  "verified",
        accepted:  "accepted",
        declined:  "declined",
        dispensed: "dispensed",
        rejected:  "rejected",
      }
      await db.insert(tlTable).values({
        id: newId("tl"),
        prescriptionId: id,
        event: kindMap[patch.status],
        note: labelMap[patch.status],
        actor: "pharmacist",
        createdAt: now,
      })
    } else if (patch.pharmacistNote && patch.pharmacistNote !== current.pharmacistNote) {
      await db.insert(tlTable).values({
        id: newId("tl"),
        prescriptionId: id,
        event: "note",
        note: "Pharmacist added a note",
        actor: "pharmacist",
        createdAt: now,
      })
    }

    const saved = await this.loadById(id)

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
      // In-app feed for the patient bell — fires on every meaningful transition
      // so the status the pharmacist sets reflects on the patient's panel.
      const inAppForStatus: Partial<Record<PrescriptionStatus, { level: "success" | "warning"; title: string; body: string }>> = {
        verified: {
          level: "success",
          title: "Quotation ready",
          body: `Rx ${saved.rxNumber} — your medication list and pricing are ready. Review and accept the quotation to pay.`,
        },
        accepted: {
          level: "success",
          title: "Quotation accepted",
          body: `Rx ${saved.rxNumber} — complete payment when you're ready.`,
        },
        declined: {
          level: "warning",
          title: "Quotation declined",
          body: `Rx ${saved.rxNumber} — contact us if you'd like a revised quotation.`,
        },
        dispensed: {
          level: "success",
          title: "Medication on its way",
          body: `Rx ${saved.rxNumber} has been dispensed.`,
        },
        rejected: {
          level: "warning",
          title: "Prescription needs attention",
          body: saved.rejectedReason
            ? `Rx ${saved.rxNumber}: ${saved.rejectedReason}`
            : `Rx ${saved.rxNumber} could not be approved.`,
        },
      }
      const inApp = inAppForStatus[patch.status]
      if (inApp) {
        this.inApp.push(sid, {
          module: "prescriptions",
          level: inApp.level,
          title: inApp.title,
          body: inApp.body,
          href: "/account/prescriptions",
        })
      }
    }
    if (patch.status && patch.status !== current.status) {
      void this.audit.record({
        module: "Prescriptions",
        action: "status",
        key: `RX-${saved.rxNumber}`,
        summary: `Rx RX-${saved.rxNumber}: ${current.status} → ${patch.status}`,
        before: { status: current.status },
        after: { status: patch.status },
      })
    } else {
      // Capture meaningful non-status edits (pharmacist/doctor notes, approved-drug
      // replacement) that would otherwise bypass the audit trail entirely.
      const changedFields: string[] = []
      if (patch.pharmacistNote !== undefined && patch.pharmacistNote !== current.pharmacistNote) {
        changedFields.push("pharmacist note")
      }
      if (patch.doctorNote !== undefined && patch.doctorNote !== current.doctorNote) {
        changedFields.push("doctor note")
      }
      if (Array.isArray(patch.approvedDrugs)) changedFields.push("approved medication")
      if (changedFields.length > 0) {
        void this.audit.record({
          module: "Prescriptions",
          action: "update",
          key: `RX-${saved.rxNumber}`,
          summary: `Rx RX-${saved.rxNumber}: updated ${changedFields.join(", ")}`,
          after: { changed: changedFields },
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
  /** Patient accepts the pharmacist quotation (order capture: customer accepts). */
  async acceptQuotation(sid: string, id: string): Promise<Prescription> {
    const current = await this.get(sid, id)
    if (current.status !== "verified") {
      throw new HttpException(
        "Only a verified prescription with a quotation can be accepted.",
        HttpStatus.CONFLICT,
      )
    }
    if (current.approvedDrugs.length === 0) {
      throw new HttpException("No medication list to accept yet.", HttpStatus.BAD_REQUEST)
    }
    const now = new Date()
    await db.update(rxTable).set({ status: "accepted", updatedAt: now }).where(eq(rxTable.id, id))
    await db.insert(tlTable).values({
      id: newId("tl"),
      prescriptionId: id,
      event: "accepted",
      note: "Quotation accepted — ready to pay",
      actor: "patient",
      createdAt: now,
    })
    return this.loadById(id)
  }

  /** Patient declines the quotation. */
  async declineQuotation(sid: string, id: string, reason?: string): Promise<Prescription> {
    const current = await this.get(sid, id)
    if (current.status !== "verified") {
      throw new HttpException(
        "Only a verified prescription quotation can be declined.",
        HttpStatus.CONFLICT,
      )
    }
    const now = new Date()
    const note = reason?.trim() || "Quotation declined by patient"
    await db
      .update(rxTable)
      .set({ status: "declined", updatedAt: now })
      .where(eq(rxTable.id, id))
    await db.insert(tlTable).values({
      id: newId("tl"),
      prescriptionId: id,
      event: "declined",
      note,
      actor: "patient",
      createdAt: now,
    })
    return this.loadById(id)
  }

  async pay(sid: string, id: string, input: PayInput): Promise<Prescription> {
    const current = await this.get(sid, id)
    if (current.status !== "accepted" && current.status !== "verified") {
      throw new HttpException(
        "Accept your quotation before paying, or wait for pharmacist review.",
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
    // Idempotency: a payment reference can be redeemed exactly once. The unique
    // index on `payment_reference` is the hard backstop; this pre-check turns a
    // replay into a friendly 409 instead of a DB error.
    const dup = await db
      .select({ id: rxTable.id })
      .from(rxTable)
      .where(eq(rxTable.paymentReference, reference))
      .limit(1)
    if (dup[0]) {
      throw new HttpException(
        "This payment reference has already been used.",
        HttpStatus.CONFLICT,
      )
    }
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
    const now = new Date()
    // Atomic state transition: only the first concurrent caller whose row is
    // still `verified` and unpaid wins. Guarding on `status`/`paidAt` in the
    // WHERE clause makes the redeem idempotent at the row level — a replay or a
    // second concurrent `pay()` updates zero rows and is rejected below, so the
    // timeline/notification side effects below run exactly once.
    let updated: { id: string }[]
    try {
      updated = await db
        .update(rxTable)
        .set({
          status: "dispensed",
          paidAt: now,
          paidAmount: amount,
          paymentReference: reference,
          paymentReceipt: verified.mpesaReceipt || (input?.receipt ? String(input.receipt) : null),
          updatedAt: now,
        })
        .where(
          and(
            eq(rxTable.id, id),
            eq(rxTable.status, "verified"),
            isNull(rxTable.paidAt),
          ),
        )
        .returning({ id: rxTable.id })
    } catch (err) {
      // Unique-violation race (two concurrent redemptions of the same ref).
      if ((err as { code?: string }).code === "23505") {
        throw new HttpException(
          "This payment reference has already been used.",
          HttpStatus.CONFLICT,
        )
      }
      throw err
    }
    if (updated.length === 0) {
      // Lost the race — another concurrent pay() already transitioned this Rx.
      throw new HttpException(
        "This prescription has already been paid.",
        HttpStatus.CONFLICT,
      )
    }
    await db.insert(tlTable).values([
      {
        id: newId("tl"),
        prescriptionId: id,
        event: "payment",
        note: `Payment received — KSh ${amount.toLocaleString()}`,
        actor: "patient",
        createdAt: now,
      },
      {
        id: newId("tl"),
        prescriptionId: id,
        event: "dispensed",
        note: "Medication dispensed and on its way",
        actor: "pharmacist",
        createdAt: new Date(now.getTime() + 1),
      },
    ])

    const saved = await this.loadById(id)
    void this.audit.record({
      module: "Prescriptions",
      action: "payment",
      key: `RX-${saved.rxNumber}`,
      summary: `Rx RX-${saved.rxNumber} paid — KSh ${amount.toLocaleString()}`,
      after: { status: "dispensed", amount, reference },
    })
    void this.crm.recordSessionEvent(sid, "purchased", {
      phone: saved.phone,
      name: saved.patientName,
      metadata: { prescriptionId: id, reference },
    })
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
    // In-app: payment received + dispensed (paying is the primary path to
    // dispensed, so the patient bell must reflect it).
    this.inApp.push(sid, {
      module: "prescriptions",
      level: "success",
      title: "Payment received",
      body: `Rx ${saved.rxNumber} is paid (KSh ${amount.toLocaleString()}) and being dispensed.`,
      href: "/account/prescriptions",
    })
    return saved
  }

  /** Resolve the storage key for a prescription file by index, owner-checked. */
  async fileKey(sid: string, id: string, index: number): Promise<string> {
    const rx = await this.get(sid, id)
    const file = rx.files[index]
    if (!file || !file.key) {
      throw new HttpException("File not found", HttpStatus.NOT_FOUND)
    }
    return file.key
  }

  /**
   * Admin variant of {@link fileKey} — resolves the file across any session so
   * the pharmacy team can view a patient's uploaded scan in the review screen.
   * Guarded by AdminGuard at the controller, not by session ownership.
   */
  async adminFileKey(id: string, index: number): Promise<string> {
    const { rx } = await this.findAnywhere(id)
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

  /** Accept the pharmacist quotation before payment. */
  @Post(":id/accept")
  accept(@Req() req: Request, @Param("id") id: string) {
    return this.svc.acceptQuotation(req.sessionId, id)
  }

  /** Decline the pharmacist quotation. */
  @Post(":id/decline")
  decline(@Req() req: Request, @Param("id") id: string, @Body() body: { reason?: string }) {
    return this.svc.declineQuotation(req.sessionId, id, body?.reason)
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
    const key = await this.svc.fileKey(req.sessionId, id, i)
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
  list(
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Query("status") status?: string,
    @Query("search") search?: string,
  ) {
    // Paginated when ?page is present; otherwise return the full list so any
    // existing caller keeps working unchanged.
    if (page === undefined && pageSize === undefined && !status && !search) {
      return this.svc.listAll()
    }
    return this.svc.listAllPaged({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      status,
      search,
    })
  }

  @Get(":id")
  async get(@Param("id") id: string) {
    return (await this.svc.findAnywhere(id)).rx
  }

  @Patch(":id")
  @RequirePerm("rx.verify")
  async patch(@Param("id") id: string, @Body() body: UpdateInput) {
    const { sid } = await this.svc.findAnywhere(id)
    const safe: UpdateInput = {}
    if (body?.status) safe.status = body.status
    if (typeof body?.pharmacistNote === "string") safe.pharmacistNote = body.pharmacistNote
    if (typeof body?.doctorNote === "string") safe.doctorNote = body.doctorNote
    if (typeof body?.rejectedReason === "string") safe.rejectedReason = body.rejectedReason
    if (Array.isArray(body?.approvedDrugs)) safe.approvedDrugs = body.approvedDrugs
    return this.svc.update(sid, id, safe)
  }

  @Patch(":id/status")
  @RequirePerm("rx.verify")
  async patchStatus(@Param("id") id: string, @Body() body: { status?: PrescriptionStatus; reason?: string }) {
    const { sid } = await this.svc.findAnywhere(id)
    if (!body?.status) {
      throw new HttpException("status is required", HttpStatus.BAD_REQUEST)
    }
    const patch: UpdateInput = { status: body.status }
    if (body.status === "rejected" && typeof body.reason === "string") {
      patch.rejectedReason = body.reason
    }
    return this.svc.update(sid, id, patch)
  }

  /** Merge OCR-extracted medication lines into the approved drug list. */
  @Post(":id/apply-extraction")
  @RequirePerm("rx.verify")
  async applyExtraction(@Param("id") id: string) {
    const { sid } = await this.svc.findAnywhere(id)
    return this.svc.applyExtractedDrugs(sid, id)
  }

  /** Re-run automated Rx read on the uploaded scan. */
  @Post(":id/reextract")
  @RequirePerm("rx.verify")
  async reextract(@Param("id") id: string) {
    await this.svc.findAnywhere(id)
    void this.svc.runExtraction(id)
    return { ok: true, message: "Extraction started" }
  }

  /** Stream a patient's prescription file to staff (cross-session, admin-only). */
  @Get(":id/files/:index")
  async file(
    @Param("id") id: string,
    @Param("index") index: string,
    @Res() res: Response,
  ) {
    const i = Number.parseInt(index, 10)
    if (!Number.isInteger(i) || i < 0) {
      throw new HttpException("Invalid file index", HttpStatus.BAD_REQUEST)
    }
    const key = await this.svc.adminFileKey(id, i)
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

@Module({
  imports: [PaystackModule, UploadsModule, PatientNotificationsModule, NotificationsModule, CrmModule],
  controllers: [MyPrescriptionsController, AdminPrescriptionsController],
  providers: [PrescriptionsService],
  exports: [PrescriptionsService],
})
export class PrescriptionsModule {}
