/**
 * Partner directory client — Postgres-backed supplier / clinic / logistics profiles.
 */
import { useCallback } from "react"
import useSWR from "swr"
import { nestFetch } from "./api-nest"

export type PartnerDirectoryKey = "suppliers" | "clinics" | "logistics-partners"

export type PartnerDirectorySummary = {
  partner: Record<string, unknown>
  clerkOrgId: string | null
  directoryStatus: string
  kyc: Record<string, unknown>
  employees: {
    total: number
    active: number
    invited: number
    suspended: number
    byRole: Record<string, number>
  }
  portalAccounts: Array<{
    id: string
    email: string
    displayName: string
    status: string
    lastLoginAt: string | null
  }>
  fleetSize: number
}

async function fetchDirectory<T>(key: PartnerDirectoryKey): Promise<T[]> {
  return nestFetch<T[]>(`/admin/partner-directory/${key}`)
}

async function saveDirectory<T>(key: PartnerDirectoryKey, items: T[]): Promise<void> {
  await nestFetch(`/admin/partner-directory/${key}`, {
    method: "PUT",
    body: JSON.stringify(items),
  })
}

export async function fetchPartnerDirectorySummary(
  key: PartnerDirectoryKey,
  id: string,
): Promise<PartnerDirectorySummary> {
  return nestFetch<PartnerDirectorySummary>(`/admin/partner-directory/${key}/items/${encodeURIComponent(id)}/summary`)
}

export async function patchPartnerDirectoryItem(
  key: PartnerDirectoryKey,
  id: string,
  patch: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  return nestFetch<Record<string, unknown>>(`/admin/partner-directory/${key}/items/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  })
}

export async function deletePartnerDirectoryItem(
  key: PartnerDirectoryKey,
  id: string,
): Promise<{ ok: true }> {
  return nestFetch<{ ok: true }>(`/admin/partner-directory/${key}/items/${encodeURIComponent(id)}`, {
    method: "DELETE",
  })
}

/** Drop-in replacement for `useCmsDoc<T[]>(key, [])` on partner directory keys. */
export function usePartnerDirectoryDoc<T extends { id: string }>(
  key: PartnerDirectoryKey,
  defaults: T[] = [],
): [T[], (next: T[] | ((prev: T[]) => T[])) => void, { refresh: () => void }] {
  const { data, mutate } = useSWR<T[]>(`partner-directory:${key}`, () => fetchDirectory<T>(key), {
    fallbackData: defaults,
  })
  const items = data ?? defaults

  const setItems = useCallback(
    (next: T[] | ((prev: T[]) => T[])) => {
      void mutate(
        async (current) => {
          const base = current ?? defaults
          const resolved = typeof next === "function" ? next(base) : next
          await saveDirectory(key, resolved)
          return resolved
        },
        { revalidate: false },
      )
    },
    [key, mutate, defaults],
  )

  const refresh = useCallback(() => {
    void mutate()
  }, [mutate])

  return [items, setItems, { refresh }]
}

export type LogisticsPartnerMatch = {
  id: string
  status: string
  coverageCounties: string[]
  activeDeliveries: number
}

export async function fetchActiveLogisticsPartners(): Promise<LogisticsPartnerMatch[]> {
  const res = await fetch("/api/v2/partner-directory/logistics/active")
  if (!res.ok) return []
  return (await res.json()) as LogisticsPartnerMatch[]
}

export function useActiveLogisticsPartners() {
  return useSWR<LogisticsPartnerMatch[]>("partner-directory:logistics:active", fetchActiveLogisticsPartners)
}
