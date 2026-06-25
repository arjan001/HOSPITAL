/**
 * Postgres-backed admin state for sourcing inventory, requests, and POs.
 */
import { useCallback, useEffect, useRef } from "react"
import useSWR from "swr"
import {
  apiAdminSourcing,
  mapPurchaseOrderDto,
  mapRequestRow,
  type SourcingInventoryDto,
} from "./api-admin-sourcing"
import type { InventoryItem } from "@/components/admin/sourcing-shared"
import type {
  AutomationRule,
  CompetitorPrice,
  PriceHistoryEntry,
} from "@/components/admin/sourcing-shared"
import type { PurchaseOrder, POStatus, RequestStatus, SourcingRequest } from "@/components/admin/sourcing"

const SAVE_DEBOUNCE_MS = 450

function useRemoteArray<T>(
  swrKey: string,
  load: () => Promise<T[]>,
  save: ((items: T[]) => Promise<T[]>) | null,
  defaults: T[],
): [T[], (next: T[] | ((prev: T[]) => T[])) => void, boolean, string | null, () => void] {
  const { data, error, isLoading, mutate } = useSWR(swrKey, load, {
    fallbackData: defaults,
    revalidateOnFocus: true,
  })
  const latest = useRef<T[]>(defaults)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saving = useRef(false)

  useEffect(() => {
    if (data) latest.current = data
  }, [data])

  const refresh = useCallback(() => {
    void mutate()
  }, [mutate])

  const setValue = useCallback(
    (next: T[] | ((prev: T[]) => T[])) => {
      const resolved = typeof next === "function" ? next(latest.current) : next
      latest.current = resolved
      void mutate(resolved, { revalidate: false })
      if (!save) return
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        saving.current = true
        save(resolved)
          .then((saved) => {
            latest.current = saved
            void mutate(saved, { revalidate: false })
          })
          .catch(() => void mutate())
          .finally(() => {
            saving.current = false
          })
      }, SAVE_DEBOUNCE_MS)
    },
    [mutate, save, swrKey],
  )

  const errMsg = error instanceof Error ? error.message : error ? String(error) : null
  return [data ?? defaults, setValue, isLoading || saving.current, errMsg, refresh]
}

export function useSourcingInventory(defaults: InventoryItem[] = []) {
  return useRemoteArray<SourcingInventoryDto>(
    "/admin/sourcing/inventory",
    apiAdminSourcing.listInventory,
    apiAdminSourcing.replaceInventory,
    defaults,
  )
}

export function useSourcingRequests(defaults: SourcingRequest[] = []) {
  const load = useCallback(
    () => apiAdminSourcing.listRequests().then((rows) => rows.map(mapRequestRow)),
    [],
  )
  const [items, , loading, err, refresh] = useRemoteArray(
    "/admin/sourcing/requests",
    load,
    null,
    defaults,
  )

  const createOpen = useCallback(
    async (body: Parameters<typeof apiAdminSourcing.createOpenRequest>[0]) => {
      await apiAdminSourcing.createOpenRequest(body)
      refresh()
    },
    [refresh],
  )

  const patchStatus = useCallback(
    async (id: string, status: RequestStatus) => {
      await apiAdminSourcing.patchRequest(id, { status })
      refresh()
    },
    [refresh],
  )

  const remove = useCallback(
    async (id: string) => {
      await apiAdminSourcing.deleteRequest(id)
      refresh()
    },
    [refresh],
  )

  return { requests: items, loading, error: err, refresh, createOpen, patchStatus, remove }
}

export function usePurchaseOrders(defaults: PurchaseOrder[] = []) {
  const load = useCallback(
    () => apiAdminSourcing.listPurchaseOrders().then((rows) => rows.map(mapPurchaseOrderDto)),
    [],
  )
  const [items, setItems, loading, err, refresh] = useRemoteArray(
    "/admin/supplier-purchase-orders",
    load,
    null,
    defaults,
  )

  const createFromQuote = useCallback(
    async (input: {
      supplierId: string
      productName: string
      qty: number
      unitCost: number
      notes?: string
    }) => {
      const dto = await apiAdminSourcing.createPurchaseOrder({
        supplierId: input.supplierId,
        items: [{ name: input.productName, qty: input.qty, unitPrice: Math.round(input.unitCost) }],
        notes: input.notes,
        status: "draft",
      })
      const mapped = mapPurchaseOrderDto(dto)
      setItems((prev) => [mapped, ...prev])
      return mapped
    },
    [setItems],
  )

  const updateStatus = useCallback(
    async (id: string, status: POStatus) => {
      const dto = await apiAdminSourcing.updatePurchaseOrderStatus(id, status)
      const mapped = mapPurchaseOrderDto(dto)
      setItems((prev) => prev.map((p) => (p.id === id ? mapped : p)))
      return mapped
    },
    [setItems],
  )

  return { pos: items, setPos: setItems, loading, error: err, refresh, createFromQuote, updateStatus }
}

export function useSourcingPriceHistory() {
  const { data, mutate, isLoading } = useSWR(
    "/admin/sourcing/price-history",
    apiAdminSourcing.listPriceHistory,
    { revalidateOnFocus: true },
  )
  const history = data ?? []
  const add = useCallback(
    async (entry: Omit<PriceHistoryEntry, "id" | "capturedAt">) => {
      const row = await apiAdminSourcing.addPriceHistory(entry)
      void mutate((prev) => [row, ...(prev ?? [])], { revalidate: false })
    },
    [mutate],
  )
  const remove = useCallback(
    async (id: string) => {
      await apiAdminSourcing.deletePriceHistory(id)
      void mutate((prev) => (prev ?? []).filter((h) => h.id !== id), { revalidate: false })
    },
    [mutate],
  )
  return { history, add, remove, loading: isLoading }
}

export function useSourcingCompetitorPrices() {
  const { data, mutate, isLoading } = useSWR(
    "/admin/sourcing/competitor-prices",
    apiAdminSourcing.listCompetitorPrices,
    { revalidateOnFocus: true },
  )
  const competitors = data ?? []
  const add = useCallback(
    async (entry: Omit<CompetitorPrice, "id" | "capturedAt">) => {
      const row = await apiAdminSourcing.addCompetitorPrice(entry)
      void mutate((prev) => [row, ...(prev ?? [])], { revalidate: false })
    },
    [mutate],
  )
  const remove = useCallback(
    async (id: string) => {
      await apiAdminSourcing.deleteCompetitorPrice(id)
      void mutate((prev) => (prev ?? []).filter((c) => c.id !== id), { revalidate: false })
    },
    [mutate],
  )
  return { competitors, add, remove, loading: isLoading }
}

export function useSourcingAutomation() {
  const { data: rules, mutate: mutateRules, isLoading: rulesLoading } = useSWR(
    "/admin/sourcing/automation/rules",
    apiAdminSourcing.listAutomationRules,
    { revalidateOnFocus: true },
  )
  const { data: log, mutate: mutateLog, isLoading: logLoading } = useSWR(
    "/admin/sourcing/automation/log",
    apiAdminSourcing.listAutomationLog,
    { revalidateOnFocus: true },
  )

  const saveRules = useCallback(
    async (next: AutomationRule[]) => {
      const saved = await apiAdminSourcing.replaceAutomationRules(next)
      void mutateRules(saved, { revalidate: false })
    },
    [mutateRules],
  )

  const clearLog = useCallback(async () => {
    await apiAdminSourcing.clearAutomationLog()
    void mutateLog([], { revalidate: false })
  }, [mutateLog])

  const runScan = useCallback(async () => {
    const result = await apiAdminSourcing.runAutomationScan()
    void mutateRules()
    void mutateLog()
    return result
  }, [mutateLog, mutateRules])

  const runForecast = useCallback(
    async (windowDays = 30) => {
      const result = await apiAdminSourcing.runForecastAutomation(windowDays)
      void mutateRules()
      void mutateLog()
      return result
    },
    [mutateLog, mutateRules],
  )

  return {
    rules: rules ?? [],
    log: log ?? [],
    saveRules,
    clearLog,
    runScan,
    runForecast,
    loading: rulesLoading || logLoading,
  }
}

export function useSourcingPerformance() {
  const { data, mutate, isLoading } = useSWR(
    "/admin/sourcing/performance",
    apiAdminSourcing.listPerformance,
    { revalidateOnFocus: true },
  )
  const scores = data ?? []
  const scoreBySupplier = useCallback(
    (supplierId: string) => scores.find((s) => s.supplierId === supplierId),
    [scores],
  )
  const saveOverride = useCallback(
    async (
      supplierId: string,
      body: { qualityScore?: number; complaints?: number; notes?: string },
    ) => {
      await apiAdminSourcing.upsertScoreOverride(supplierId, body)
      void mutate()
    },
    [mutate],
  )
  return { scores, scoreBySupplier, saveOverride, loading: isLoading, refresh: () => void mutate() }
}
