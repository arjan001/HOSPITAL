/**
 * Campaign admin data — Postgres-backed pipelines/queue + CMS docs via api-nest.
 */
import useSWR from "swr"
import { nestFetch } from "./api-nest"
import { adminAuthHeaders } from "./api-client"

export type CampaignDocKey =
  | "campaign-emails"
  | "campaign-sms"
  | "campaign-audiences"
  | "campaign-settings"

const docPath = (key: CampaignDocKey) => `/admin/campaigns/doc/${encodeURIComponent(key)}`

export function useCampaignDoc<T>(key: CampaignDocKey, fallback: T) {
  const { data, error, isLoading, mutate } = useSWR<T>(
    `/admin/campaigns/doc/${key}`,
    () => nestFetch<T>(docPath(key)),
  )
  const value = data ?? fallback
  const set = async (next: T | ((prev: T) => T)) => {
    const resolved = typeof next === "function" ? (next as (p: T) => T)(value) : next
    await nestFetch(docPath(key), {
      method: "PUT",
      body: JSON.stringify(resolved),
      headers: { "Content-Type": "application/json", ...adminAuthHeaders() },
    })
    await mutate(resolved, false)
  }
  return [value, set, { isLoading, error, refresh: mutate }] as const
}

export function useCampaignPipelines<T>(fallback: T) {
  const { data, mutate } = useSWR<T>("/admin/campaigns/pipelines", () =>
    nestFetch<T>("/admin/campaigns/pipelines"),
  )
  const value = data ?? fallback
  const set = async (next: T | ((prev: T) => T)) => {
    const resolved = typeof next === "function" ? (next as (p: T) => T)(value) : next
    await nestFetch("/admin/campaigns/pipelines", {
      method: "PUT",
      body: JSON.stringify(resolved),
      headers: { "Content-Type": "application/json", ...adminAuthHeaders() },
    })
    await mutate(resolved, false)
  }
  return [value, set] as const
}

export function useCampaignQueue<T>(fallback: T) {
  const { data, mutate } = useSWR<T>("/admin/campaigns/queue", () =>
    nestFetch<T>("/admin/campaigns/queue"),
  )
  const value = data ?? fallback
  const set = async (next: T | ((prev: T) => T)) => {
    const resolved = typeof next === "function" ? (next as (p: T) => T)(value) : next
    await nestFetch("/admin/campaigns/queue", {
      method: "PUT",
      body: JSON.stringify(resolved),
      headers: { "Content-Type": "application/json", ...adminAuthHeaders() },
    })
    await mutate(resolved, false)
  }
  return [value, set] as const
}

/** Sync read/write for campaign queue during send loops (mirrors cmsStore.get/set). */
export async function fetchCampaignQueue<T>(): Promise<T> {
  return nestFetch<T>("/admin/campaigns/queue")
}

export async function saveCampaignQueue<T>(items: T): Promise<T> {
  return nestFetch<T>("/admin/campaigns/queue", {
    method: "PUT",
    body: JSON.stringify(items),
    headers: { "Content-Type": "application/json", ...adminAuthHeaders() },
  })
}

export async function fetchCampaignDoc<T>(key: CampaignDocKey): Promise<T> {
  return nestFetch<T>(docPath(key))
}

export async function saveCampaignDoc<T>(key: CampaignDocKey, value: T): Promise<T> {
  return nestFetch<T>(docPath(key), {
    method: "PUT",
    body: JSON.stringify(value),
    headers: { "Content-Type": "application/json", ...adminAuthHeaders() },
  })
}
