/**
 * PatientNotesModule — sticky notes per patient / customer record.
 *
 * Routes (admin-only, under /api/v2/admin/patients/:patientId/notes):
 *   GET    /                — list all notes for the patient (pinned first)
 *   POST   /                — create a new note
 *   PUT    /:noteId         — update note text, color, or pinned state
 *   DELETE /:noteId         — delete a note
 *
 * patientId may be either a Clerk userId or a prescription sessionId. It is
 * stored opaquely in the `patient_id` column.
 *
 * Persistence: Postgres-backed via Drizzle (`@workspace/db` → `patient_notes`).
 *
 * NestJS rule: explicit @Inject() on every constructor (tsx / esbuild does
 * NOT emit emitDecoratorMetadata).
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
  Put,
  UseGuards,
} from "@nestjs/common"
import { and, desc, eq } from "drizzle-orm"
import { db, patientNotes as patientNotesTable } from "@workspace/db"
import { AdminGuard, RequirePerm } from "../common/admin-guard"
import { newId } from "../common/repository"

// ─────────────── Types ───────────────

export type NoteColor = "yellow" | "blue" | "green" | "red" | "purple"

export type PatientNote = {
  id: string
  patientId: string
  prescriptionId?: string
  consultationId?: string
  note: string
  color: NoteColor
  pinned: boolean
  createdBy: string
  createdByName?: string
  createdAt: string
  updatedAt: string
}

type CreateNoteDto = {
  note?: string
  color?: NoteColor
  pinned?: boolean
  createdBy?: string
  createdByName?: string
  prescriptionId?: string
  consultationId?: string
}

type PatientNoteRow = typeof patientNotesTable.$inferSelect

function toNote(row: PatientNoteRow): PatientNote {
  return {
    id: row.id,
    patientId: row.patientId ?? "",
    prescriptionId: row.prescriptionId ?? undefined,
    consultationId: row.consultationId ?? undefined,
    note: row.note,
    color: row.color as NoteColor,
    pinned: row.pinned,
    createdBy: row.createdBy,
    createdByName: row.createdByName ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

// ─────────────── Service ───────────────

@Injectable()
class PatientNotesService {
  async list(patientId: string): Promise<PatientNote[]> {
    const rows = await db
      .select()
      .from(patientNotesTable)
      .where(eq(patientNotesTable.patientId, patientId))
      .orderBy(desc(patientNotesTable.pinned), desc(patientNotesTable.createdAt))
    return rows.map(toNote)
  }

  async create(patientId: string, dto: CreateNoteDto): Promise<PatientNote> {
    if (!dto.note?.trim()) {
      throw new HttpException("Note text is required", HttpStatus.BAD_REQUEST)
    }
    const now = new Date()
    const [row] = await db
      .insert(patientNotesTable)
      .values({
        id: newId("note"),
        patientId,
        prescriptionId: dto.prescriptionId ?? null,
        consultationId: dto.consultationId ?? null,
        note: dto.note.trim(),
        color: dto.color || "yellow",
        pinned: dto.pinned ?? false,
        createdBy: dto.createdBy || "admin",
        createdByName: dto.createdByName ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
    return toNote(row)
  }

  async update(
    patientId: string,
    noteId: string,
    patch: Partial<CreateNoteDto>,
  ): Promise<PatientNote> {
    const existing = await db
      .select()
      .from(patientNotesTable)
      .where(and(eq(patientNotesTable.patientId, patientId), eq(patientNotesTable.id, noteId)))
      .limit(1)
    if (!existing[0]) throw new HttpException("Note not found", HttpStatus.NOT_FOUND)
    const [row] = await db
      .update(patientNotesTable)
      .set({
        ...(typeof patch.note === "string" ? { note: patch.note.trim() } : {}),
        ...(patch.color !== undefined ? { color: patch.color } : {}),
        ...(patch.pinned !== undefined ? { pinned: patch.pinned } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(patientNotesTable.patientId, patientId), eq(patientNotesTable.id, noteId)))
      .returning()
    return toNote(row)
  }

  async remove(patientId: string, noteId: string): Promise<void> {
    const removed = await db
      .delete(patientNotesTable)
      .where(and(eq(patientNotesTable.patientId, patientId), eq(patientNotesTable.id, noteId)))
      .returning({ id: patientNotesTable.id })
    if (removed.length === 0) {
      throw new HttpException("Note not found", HttpStatus.NOT_FOUND)
    }
  }
}

// ─────────────── Controller ───────────────

@UseGuards(AdminGuard)
@RequirePerm("rx.view", "consult.handle")
@Controller("admin/patients/:patientId/notes")
class PatientNotesController {
  constructor(@Inject(PatientNotesService) private readonly svc: PatientNotesService) {}

  @Get()
  list(@Param("patientId") patientId: string) {
    return this.svc.list(patientId)
  }

  @Post()
  create(@Param("patientId") patientId: string, @Body() body: CreateNoteDto) {
    return this.svc.create(patientId, body)
  }

  @Put(":noteId")
  update(
    @Param("patientId") patientId: string,
    @Param("noteId") noteId: string,
    @Body() body: Partial<CreateNoteDto>,
  ) {
    return this.svc.update(patientId, noteId, body)
  }

  @Delete(":noteId")
  async remove(@Param("patientId") patientId: string, @Param("noteId") noteId: string) {
    await this.svc.remove(patientId, noteId)
    return { ok: true }
  }
}

// ─────────────── Module ───────────────

@Module({
  controllers: [PatientNotesController],
  providers: [PatientNotesService],
})
export class PatientNotesModule {}
