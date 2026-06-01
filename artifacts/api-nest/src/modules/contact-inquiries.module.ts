/**
 * Contact Inquiries module — durable inbound enquiry store.
 *
 * Routes:
 *   PUBLIC
 *     POST /api/v2/contact-inquiries           — guest submits the contact form
 *   ADMIN (AdminGuard)
 *     GET    /api/v2/admin/contact-inquiries        — list (newest first)
 *     PATCH  /api/v2/admin/contact-inquiries/:id     — update status / internal note
 *     DELETE /api/v2/admin/contact-inquiries/:id     — remove an enquiry
 *
 * Why this exists:
 *   Enquiries used to be a single concatenated JSON array in cms_docs
 *   (`contact-inquiries`) written client-side with read-modify-write — racey
 *   under concurrent submits, and seeded with dummy rows in the admin panel.
 *   Each submission is now its own Postgres row (`contact_inquiries`), so the
 *   public form appends atomically and admins triage per row.
 *
 * On every new submission we push a bell notification to the admin audience so
 * the action surfaces immediately (complaints fire at `alert` level).
 *
 * NestJS rule: explicit @Inject(Token) on controllers — tsx/esbuild does not
 * emit emitDecoratorMetadata.
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
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common"
import { desc, eq } from "drizzle-orm"
import { db, contactInquiries } from "@workspace/db"
import { newId } from "../common/repository"
import { AdminGuard, AnyAdmin } from "../common/admin-guard"
import { NotificationsModule, NotificationsService } from "./notifications.module"

const STATUSES = ["new", "in-progress", "resolved", "spam"] as const
type Status = (typeof STATUSES)[number]

const CATEGORIES = [
  "general", "prescription", "order", "delivery",
  "product", "billing", "complaint", "partnership", "other",
] as const

export type ContactInquiry = {
  id: string
  fullName: string
  email: string
  phone: string
  category: string
  subject: string
  message: string
  preferredContact: string
  isExistingPatient: boolean
  patientId: string | null
  dob: string | null
  consent: boolean
  status: Status
  internalNote: string
  source: string
  createdAt: string
  updatedAt: string
}

/** Normalise an arbitrary client-supplied category to a known value. */
export function normalizeCategory(category: unknown): string {
  return CATEGORIES.includes((category ?? "") as never) ? String(category) : "general"
}

/** Bell-notification level for a new enquiry — complaints escalate to alert. */
export function inquiryNotificationLevel(category: string): "info" | "alert" {
  return category === "complaint" ? "alert" : "info"
}

function toInquiry(r: typeof contactInquiries.$inferSelect): ContactInquiry {
  return {
    id: r.id,
    fullName: r.fullName,
    email: r.email,
    phone: r.phone,
    category: r.category,
    subject: r.subject,
    message: r.message,
    preferredContact: r.preferredContact,
    isExistingPatient: r.isExistingPatient,
    patientId: r.patientId ?? null,
    dob: r.dob ?? null,
    consent: r.consent,
    status: (STATUSES.includes(r.status as Status) ? r.status : "new") as Status,
    internalNote: r.internalNote,
    source: r.source,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }
}

@Injectable()
export class ContactInquiriesService {
  constructor(@Inject(NotificationsService) private readonly notifications: NotificationsService) {}

  async list(): Promise<ContactInquiry[]> {
    const rows = await db.select().from(contactInquiries).orderBy(desc(contactInquiries.createdAt))
    return rows.map(toInquiry)
  }

  async create(input: {
    fullName?: string
    email?: string
    phone?: string
    category?: string
    subject?: string
    message?: string
    preferredContact?: string
    isExistingPatient?: boolean
    patientId?: string
    dob?: string
    consent?: boolean
    source?: string
  }): Promise<ContactInquiry> {
    const fullName = String(input?.fullName ?? "").trim()
    const email = String(input?.email ?? "").trim()
    const message = String(input?.message ?? "").trim()
    if (!fullName) throw new HttpException("Name is required", HttpStatus.BAD_REQUEST)
    if (!email) throw new HttpException("Email is required", HttpStatus.BAD_REQUEST)
    if (!message) throw new HttpException("Message is required", HttpStatus.BAD_REQUEST)

    const category = normalizeCategory(input?.category)

    const [row] = await db
      .insert(contactInquiries)
      .values({
        id: newId("inq"),
        fullName,
        email,
        phone: String(input?.phone ?? "").trim(),
        category,
        subject: String(input?.subject ?? "").trim(),
        message,
        preferredContact: String(input?.preferredContact ?? "whatsapp").trim() || "whatsapp",
        isExistingPatient: Boolean(input?.isExistingPatient),
        patientId: input?.patientId?.trim() || null,
        dob: input?.dob?.trim() || null,
        consent: Boolean(input?.consent),
        status: "new",
        source: String(input?.source ?? "Contact Page").trim() || "Contact Page",
      })
      .returning()

    // Surface in the admin bell. Complaints escalate to alert level.
    await this.notifications.push("admin", {
      module: "support",
      level: inquiryNotificationLevel(category),
      title: `New enquiry — ${fullName}`,
      body: `${category}${row.subject ? ` · ${row.subject}` : ""}`,
      href: "/admin/contact-inquiries",
    })

    return toInquiry(row)
  }

  async update(id: string, patch: { status?: string; internalNote?: string; category?: string }): Promise<ContactInquiry> {
    const set: Partial<typeof contactInquiries.$inferInsert> = { updatedAt: new Date() }
    if (patch?.status !== undefined) {
      if (!STATUSES.includes(patch.status as Status)) throw new HttpException("Invalid status", HttpStatus.BAD_REQUEST)
      set.status = patch.status
    }
    if (patch?.internalNote !== undefined) set.internalNote = String(patch.internalNote)
    if (patch?.category !== undefined && CATEGORIES.includes(patch.category as never)) set.category = patch.category
    const [row] = await db.update(contactInquiries).set(set).where(eq(contactInquiries.id, id)).returning()
    if (!row) throw new HttpException("Inquiry not found", HttpStatus.NOT_FOUND)
    return toInquiry(row)
  }

  async remove(id: string): Promise<{ ok: true }> {
    const rows = await db.delete(contactInquiries).where(eq(contactInquiries.id, id)).returning({ id: contactInquiries.id })
    if (rows.length === 0) throw new HttpException("Inquiry not found", HttpStatus.NOT_FOUND)
    return { ok: true }
  }
}

@Controller("contact-inquiries")
class PublicContactInquiriesController {
  constructor(@Inject(ContactInquiriesService) private readonly svc: ContactInquiriesService) {}

  @Post()
  create(@Body() body: Parameters<ContactInquiriesService["create"]>[0]) {
    return this.svc.create(body)
  }
}

@UseGuards(AdminGuard)
@AnyAdmin()
@Controller("admin/contact-inquiries")
class AdminContactInquiriesController {
  constructor(@Inject(ContactInquiriesService) private readonly svc: ContactInquiriesService) {}

  @Get()
  list() {
    return this.svc.list()
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() body: { status?: string; internalNote?: string; category?: string }) {
    return this.svc.update(id, body)
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.svc.remove(id)
  }
}

@Module({
  imports: [NotificationsModule],
  controllers: [PublicContactInquiriesController, AdminContactInquiriesController],
  providers: [ContactInquiriesService],
  exports: [ContactInquiriesService],
})
export class ContactInquiriesModule {}
