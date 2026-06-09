/**
 * Partner directory client — Postgres-backed supplier / clinic / logistics profiles.
 * Replaces cmsStore keys: suppliers, clinics, logistics-partners.
 */
import { useCallback } from "react"
import useSWR from "swr"
import { nestFetch } from "./api-nest"

export type PartnerDirectoryKey = "suppliers" | "clinics" | "logistics-partners"

async function fetchDirectory<T>(key: PartnerDirectoryKey): Promise<T[]> {
  return nestFetch<T[]>(`/admin/partner-directory/${key}`)
}

async function saveDirectory<T>(key: PartnerDirectoryKey, items: T[]): Promise<void> {
  await nestFetch(`/admin/partner-directory/${key}`, {
    method: "PUT",
    body: JSON.stringify(items),
  })
}

/** Drop-in replacement for `useCmsDoc<T[]>(key, [])` on partner directory keys. */
export function usePartnerDirectoryDoc<T>(
  key: PartnerDirectoryKey,
  defaults: T[] = [],
): [T[], (next: T[] | ((prev: T[]) => T[])) => void] {
  const { data, mutate } = useSWR<T[]>(`partner-directory:${key}`, () => fetchDirectory<T>(key), {
    fallbackData: defaults,
  })
  const items = data ?? defaults

  const setItems = useCallback(
    (next: T[] | ((prev: T[]) => T[])) => {
      const resolved = typeof next === "function" ? next(items) : next
      void saveDirectory(key, resolved).then(() => mutate(resolved, false))
    },
    [key, items, mutate],
  )

  return [items, setItems]
}

export type LogisticsPartnerMatch = {
  id: string
  status: string
  coverageCounties: string[]
  activeDeliveries: number
}

/** Public logistics partners for checkout county matching. */
export async function fetchActiveLogisticsPartners(): Promise<LogisticsPartnerMatch[]> {
  const res = await fetch("/api/v2/partner-directory/logistics/active")
  if (!res.ok) return []
  return (await res.json()) as LogisticsPartnerMatch[]
}

/** SWR hook for checkout page. */
export function useActiveLogisticsPartners() {
  return useSWR<LogisticsPartnerMatch[]>("partner-directory:logistics:active", fetchActiveLogisticsPartners)
}
