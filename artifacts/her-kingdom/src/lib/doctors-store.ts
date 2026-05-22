/**
 * Doctors + sticky-notes store.
 *
 * Persists through `cmsStore` so admin-managed doctor profiles round-trip
 * to api-nest via the same `/api/v2/admin/cms/:key` seam every other CMS
 * surface uses. Per-patient sticky notes use the key pattern
 * `patient-notes:<patientId>` so each patient detail page only loads its
 * own thread.
 */
import { useCmsCollection, useCmsDoc, cmsStore, newId } from "@/lib/cms-store"
import type { CmsRecord } from "@/lib/cms-store"

export type DoctorAvailability = {
  monFri: boolean
  weekends: boolean
  hours: string // free-form "08:00–18:00 EAT"
}

export interface Doctor extends CmsRecord {
  id: string
  name: string
  title: string // "MBChB", "Pharm.D"
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

export interface StickyNote extends CmsRecord {
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

const DOCTORS_KEY = "doctors"

export function useDoctors() {
  return useCmsCollection<Doctor>(DOCTORS_KEY, [])
}

export function getDoctors(): Doctor[] {
  return cmsStore.get<Doctor[]>(DOCTORS_KEY, [])
}

export function activeDoctors(): Doctor[] {
  return getDoctors().filter((d) => d.active)
}

export function makeDoctor(partial: Partial<Doctor>): Doctor {
  const now = new Date().toISOString()
  return {
    id: partial.id ?? newId("doc"),
    name: partial.name ?? "",
    title: partial.title ?? "MBChB",
    specialization: partial.specialization ?? "General Practice",
    licenseNumber: partial.licenseNumber ?? "",
    bio: partial.bio ?? "",
    avatarUrl: partial.avatarUrl,
    languages: partial.languages ?? ["English", "Swahili"],
    consultationRateKES: partial.consultationRateKES ?? 500,
    availability: partial.availability ?? { monFri: true, weekends: false, hours: "08:00–18:00 EAT" },
    email: partial.email ?? "",
    phone: partial.phone ?? "",
    active: partial.active ?? true,
    createdAt: partial.createdAt ?? now,
    updatedAt: now,
  }
}

export function useStickyNotes(patientId: string) {
  return useCmsCollection<StickyNote>(`patient-notes:${patientId}`, [])
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
