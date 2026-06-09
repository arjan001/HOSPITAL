/**
 * Doctors store — Postgres-backed via /api/v2/doctors (see doctors-client.ts).
 *
 * Sticky notes persist via Nest PatientNotesModule (`patient-notes-client.ts`).
 */
import { useCallback, useMemo } from "react"
import { useAdminDoctors, usePublicDoctors, type DoctorRecord } from "@/lib/doctors-client"
import { deriveInitials, type StandbyDoctor } from "@/lib/consultation-settings"
import { newId } from "@/lib/cms-store"
import {
  createPatientNote,
  deletePatientNote,
  updatePatientNote,
  usePatientNotes,
  type ApiPatientNote,
} from "@/lib/patient-notes-client"

export type DoctorAvailability = {
  monFri: boolean
  weekends: boolean
  hours: string
}

export interface Doctor {
  id: string
  name: string
  title: string
  specialization: string
  licenseNumber: string
  bio: string
  avatarUrl?: string
  languages: string[]
  consultationRateKES: number
  availability: DoctorAvailability
  email: string
  phone: string
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface StickyNote {
  id: string
  patientId: string
  body: string
  authorName: string
  authorRole: "doctor" | "pharmacist" | "admin"
  pinned: boolean
  color: "yellow" | "wine" | "orange" | "blue"
  createdAt: string
  updatedAt: string
}

type UiColor = StickyNote["color"]
type ApiColor = ApiPatientNote["color"]

function uiToApiColor(c: UiColor): ApiColor {
  if (c === "wine") return "purple"
  if (c === "orange") return "red"
  if (c === "blue") return "blue"
  return "yellow"
}

function apiToUiColor(c: ApiColor): UiColor {
  if (c === "purple") return "wine"
  if (c === "red") return "orange"
  if (c === "blue") return "blue"
  return "yellow"
}

function apiToSticky(n: ApiPatientNote): StickyNote {
  return {
    id: n.id,
    patientId: n.patientId,
    body: n.note,
    authorName: n.createdByName || n.createdBy || "Staff",
    authorRole: n.createdBy === "pharmacist" ? "pharmacist" : n.createdBy === "doctor" ? "doctor" : "admin",
    pinned: n.pinned,
    color: apiToUiColor(n.color),
    createdAt: n.createdAt,
    updatedAt: n.updatedAt,
  }
}

/** Admin doctor directory (Postgres). */
export function useDoctors() {
  const { items, records, error, isLoading, refresh, upsert, remove, invite } = useAdminDoctors()
  return {
    items,
    records,
    error,
    isLoading,
    refresh,
    upsert,
    remove,
    invite,
  }
}

/** Public storefront directory (active doctors only). */
export function usePublicDoctorDirectory() {
  return usePublicDoctors()
}

/** Map a Postgres doctor row to the standby profile shape used on consult screens. */
export function doctorRecordToStandby(d: DoctorRecord): Required<StandbyDoctor> {
  return {
    name: d.name,
    specialty: d.specialization,
    yearsExperience: d.yearsExperience ?? 0,
    initials: deriveInitials(d.name),
    avatarUrl: d.avatarUrl || "",
    bio: d.bio || "",
  }
}

export function makeDoctor(partial: Partial<Doctor>): Doctor {
  const now = new Date().toISOString()
  return {
    id: partial.id ?? newId("doc"),
    name: partial.name ?? "",
    title: partial.title ?? "Dr.",
    specialization: partial.specialization ?? "General Practice",
    licenseNumber: partial.licenseNumber ?? "",
    bio: partial.bio ?? "",
    avatarUrl: partial.avatarUrl,
    languages: partial.languages ?? ["English"],
    consultationRateKES: partial.consultationRateKES ?? 1500,
    availability: partial.availability ?? { monFri: true, weekends: false, hours: "9am – 5pm" },
    email: partial.email ?? "",
    phone: partial.phone ?? "",
    active: partial.active ?? true,
    createdAt: partial.createdAt ?? now,
    updatedAt: now,
  }
}

export function useStickyNotes(patientId: string) {
  const { notes, refresh } = usePatientNotes(patientId)
  const items = useMemo(() => notes.map(apiToSticky), [notes])

  const upsert = useCallback(
    (note: StickyNote) => {
      void (async () => {
        const existing = notes.find((n) => n.id === note.id)
        if (existing) {
          await updatePatientNote(patientId, note.id, {
            note: note.body,
            color: uiToApiColor(note.color),
            pinned: note.pinned,
          })
        } else {
          await createPatientNote(patientId, {
            note: note.body,
            color: uiToApiColor(note.color),
            pinned: note.pinned,
            createdBy: note.authorRole,
            createdByName: note.authorName,
          })
        }
        await refresh()
      })()
    },
    [patientId, notes, refresh],
  )

  const remove = useCallback(
    (id: string) => {
      void (async () => {
        await deletePatientNote(patientId, id)
        await refresh()
      })()
    },
    [patientId, refresh],
  )

  return { items, upsert, remove }
}

export function makeStickyNote(partial: Partial<StickyNote> & { patientId: string }): StickyNote {
  const now = new Date().toISOString()
  return {
    id: partial.id ?? newId("note"),
    patientId: partial.patientId,
    body: partial.body ?? "",
    authorName: partial.authorName ?? "Doctor",
    authorRole: partial.authorRole ?? "doctor",
    pinned: partial.pinned ?? false,
    color: partial.color ?? "yellow",
    createdAt: partial.createdAt ?? now,
    updatedAt: now,
  }
}
