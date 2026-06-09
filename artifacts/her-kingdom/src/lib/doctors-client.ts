/**
 * doctors-client.ts — HTTP client + SWR hooks for clinician directory + portal auth.
 */
import useSWR, { mutate as globalMutate } from "swr"
import type { Doctor, DoctorAvailability } from "./doctors-store"

const BASE = "/api/v2/doctors"

export type DoctorRecord = Doctor & {
  accountStatus: "none" | "invited" | "active" | "suspended"
  hasPortalLogin: boolean
  yearsExperience: number
}

export type DoctorAccount = {
  id: string
  email: string
  doctorId: string
  displayName: string
  status: "invited" | "active" | "suspended"
  inviteExpiresAt: string | null
  lastLoginAt: string | null
  hasPassword: boolean
  createdAt: string
  updatedAt: string
}

async function dFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  })
  if (!res.ok) {
    let message = res.statusText
    try {
      const body = await res.json()
      message = body?.detail || body?.message || body?.error || message
      if (Array.isArray(message)) message = message.join(", ")
    } catch {
      /* non-JSON */
    }
    throw new Error(typeof message === "string" ? message : `Request failed (${res.status})`)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const { nestFetch } = await import("./api-nest")
  return nestFetch<T>(path, init)
}

function toDoctor(d: DoctorRecord): Doctor {
  return {
    id: d.id,
    name: d.name,
    title: d.title,
    specialization: d.specialization,
    licenseNumber: d.licenseNumber,
    bio: d.bio,
    avatarUrl: d.avatarUrl,
    languages: d.languages,
    consultationRateKES: d.consultationRateKES,
    availability: d.availability,
    email: d.email,
    phone: d.phone,
    active: d.active,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  }
}

export function usePublicDoctors() {
  const { data, error, isLoading, mutate } = useSWR<DoctorRecord[]>(
    `${BASE}`,
    (url: string) => fetch(url, { credentials: "include" }).then((r) => r.json()),
  )
  return {
    items: (data ?? []).map(toDoctor),
    records: data ?? [],
    error,
    isLoading,
    refresh: mutate,
  }
}

export function useAdminDoctors() {
  const { data, error, isLoading, mutate } = useSWR<DoctorRecord[]>(
    "/api/v2/admin/doctors",
    () => adminFetch<DoctorRecord[]>("/admin/doctors"),
  )
  return {
    items: (data ?? []).map(toDoctor),
    records: data ?? [],
    error,
    isLoading,
    refresh: mutate,
    upsert: async (doc: Doctor) => {
      const body = {
        name: doc.name,
        title: doc.title,
        specialization: doc.specialization,
        licenseNumber: doc.licenseNumber,
        bio: doc.bio,
        avatarUrl: doc.avatarUrl,
        languages: doc.languages,
        consultationRateKES: doc.consultationRateKES,
        availability: doc.availability,
        email: doc.email,
        phone: doc.phone,
        active: doc.active,
      }
      const existing = (data ?? []).find((d) => d.id === doc.id)
      if (existing?.id && doc.id) {
        await adminFetch<DoctorRecord>(`/admin/doctors/${doc.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        })
      } else {
        await adminFetch<DoctorRecord>("/admin/doctors", {
          method: "POST",
          body: JSON.stringify(body),
        })
      }
      await mutate()
    },
    remove: async (id: string) => {
      await adminFetch(`/admin/doctors/${id}`, { method: "DELETE" })
      await mutate()
    },
    invite: async (id: string) => {
      const result = await adminFetch<{ doctor: DoctorRecord; account: DoctorAccount }>(
        `/admin/doctors/${id}/invite`,
        { method: "POST" },
      )
      await mutate()
      return result
    },
  }
}

export function useDoctorMe(enabled = true) {
  return useSWR<{ ok: true; account: DoctorAccount; doctor: DoctorRecord } | null>(
    enabled ? `${BASE}/auth/me` : null,
    async () => {
      try {
        return await dFetch("/auth/me")
      } catch {
        return null
      }
    },
    { shouldRetryOnError: false, revalidateOnFocus: false },
  )
}

export async function doctorLogin(email: string, password: string) {
  const result = await dFetch<{
    ok: true
    token: string
    account: DoctorAccount
    doctor: DoctorRecord
  }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  })
  await globalMutate(`${BASE}/auth/me`)
  return result
}

export async function doctorAcceptInvite(token: string, password: string) {
  const result = await dFetch<{
    ok: true
    token: string
    account: DoctorAccount
    doctor: DoctorRecord
  }>("/auth/accept", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  })
  await globalMutate(`${BASE}/auth/me`)
  return result
}

export async function doctorSignout() {
  await dFetch("/auth/signout", { method: "POST" })
  await globalMutate(`${BASE}/auth/me`, undefined, { revalidate: false })
}

export type DoctorPatient = {
  patientId: string
  patientName: string
  patientPhone: string
  lastSeen: string
  consultationCount: number
}

export function useDoctorPatients(enabled = true) {
  return useSWR<DoctorPatient[]>(
    enabled ? `${BASE}/me/patients` : null,
    () => dFetch<DoctorPatient[]>("/me/patients"),
    { shouldRetryOnError: false },
  )
}

export function activeDoctorsFrom(records: Doctor[]): Doctor[] {
  return records.filter((d) => d.active)
}
