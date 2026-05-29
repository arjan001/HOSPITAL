/**
 * PatientNotesModule — sticky notes per patient / customer record.
 *
 * Routes (admin-only, under /api/v2/admin/patients/:patientId/notes):
 *   GET    /                — list all notes for the patient (pinned first)
 *   POST   /                — create a new note
 *   PUT    /:noteId         — update note text, color, or pinned state
 *   DELETE /:noteId         — delete a note
 *
 * patientId may be either a Clerk userId or a prescription sessionId.
 * Data is in-memory today; swap InMemoryRepository for a Drizzle-backed
 * implementation against the patient_notes table when DATABASE_URL lands.
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
import { AdminGuard } from "../common/admin-guard"
import { InMemoryRepository, newId } from "../common/repository"

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

// ─────────────── Service ───────────────

@Injectable()
class PatientNotesService {
  private repo = new InMemoryRepository<PatientNote>()

  list(patientId: string): PatientNote[] {
    return this.repo.listFor(patientId).sort(
      (a, b) =>
        (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) ||
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
  }

  create(patientId: string, dto: CreateNoteDto): PatientNote {
    if (!dto.note?.trim()) {
      throw new HttpException("Note text is required", HttpStatus.BAD_REQUEST)
    }
    const now = new Date().toISOString()
    const note: PatientNote = {
      id: newId("note"),
      patientId,
      note: dto.note.trim(),
      color: dto.color || "yellow",
      pinned: dto.pinned ?? false,
      createdBy: dto.createdBy || "admin",
      createdByName: dto.createdByName,
      prescriptionId: dto.prescriptionId,
      consultationId: dto.consultationId,
      createdAt: now,
      updatedAt: now,
    }
    this.repo.add(patientId, note)
    return note
  }

  update(patientId: string, noteId: string, patch: Partial<CreateNoteDto>): PatientNote {
    const existing = this.repo.findById(patientId, noteId)
    if (!existing) throw new HttpException("Note not found", HttpStatus.NOT_FOUND)
    const updated: PatientNote = {
      ...existing,
      ...(typeof patch.note === "string" ? { note: patch.note.trim() } : {}),
      ...(patch.color !== undefined ? { color: patch.color } : {}),
      ...(patch.pinned !== undefined ? { pinned: patch.pinned } : {}),
      updatedAt: new Date().toISOString(),
    }
    return this.repo.update(patientId, noteId, updated) ?? updated
  }

  remove(patientId: string, noteId: string): void {
    const existing = this.repo.findById(patientId, noteId)
    if (!existing) throw new HttpException("Note not found", HttpStatus.NOT_FOUND)
    this.repo.remove(patientId, noteId)
  }
}

// ─────────────── Controller ───────────────

@UseGuards(AdminGuard)
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
  remove(@Param("patientId") patientId: string, @Param("noteId") noteId: string) {
    this.svc.remove(patientId, noteId)
    return { ok: true }
  }
}

// ─────────────── Module ───────────────

@Module({
  controllers: [PatientNotesController],
  providers: [PatientNotesService],
})
export class PatientNotesModule {}
