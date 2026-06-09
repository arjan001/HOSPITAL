/**
 * Patient sticky notes — Nest `/admin/patients/:id/notes`.
 */
import useSWR from "swr"
import { nestFetch } from "./api-nest"

export type ApiPatientNote = {
  id: string
  patientId: string
  note: string
  color: "yellow" | "blue" | "green" | "red" | "purple"
  pinned: boolean
  createdBy: string
  createdByName?: string
  createdAt: string
  updatedAt: string
}

const path = (patientId: string) => `/admin/patients/${encodeURIComponent(patientId)}/notes`

export function usePatientNotes(patientId: string) {
  const key = patientId ? path(patientId) : null
  const { data, error, isLoading, mutate } = useSWR<ApiPatientNote[]>(
    key,
    () => nestFetch<ApiPatientNote[]>(path(patientId)),
  )
  return { notes: data ?? [], error, isLoading, refresh: mutate }
}

export async function createPatientNote(
  patientId: string,
  input: {
    note: string
    color?: ApiPatientNote["color"]
    pinned?: boolean
    createdBy?: string
    createdByName?: string
  },
) {
  return nestFetch<ApiPatientNote>(path(patientId), {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export async function updatePatientNote(
  patientId: string,
  noteId: string,
  input: Partial<{
    note: string
    color: ApiPatientNote["color"]
    pinned: boolean
  }>,
) {
  return nestFetch<ApiPatientNote>(`${path(patientId)}/${noteId}`, {
    method: "PUT",
    body: JSON.stringify(input),
  })
}

export async function deletePatientNote(patientId: string, noteId: string) {
  return nestFetch<{ ok: boolean }>(`${path(patientId)}/${noteId}`, { method: "DELETE" })
}
