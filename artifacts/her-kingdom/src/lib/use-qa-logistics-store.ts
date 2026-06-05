/**
 * Postgres-backed admin state for QA & logistics (replaces cmsStore qa.* / logistics.*).
 */
import { useCallback, useEffect, useRef, useState } from "react"
import useSWR from "swr"
import { apiAdminLogistics, apiAdminQa } from "./api-admin-qa-logistics"
import type {
  LogisticsBatchDto,
  LogisticsColdCheckDto,
  LogisticsConfigDto,
  LogisticsDeliveryDto,
  LogisticsExceptionDto,
  LogisticsRiderDto,
  LogisticsZoneDto,
  QaConfigDto,
  QaDispatchCheckDto,
  QaInventoryDto,
} from "./qa-logistics-types"

const SAVE_DEBOUNCE_MS = 450

function useRemoteArray<T>(
  swrKey: string,
  load: () => Promise<T[]>,
  save: (items: T[]) => Promise<T[]>,
  defaults: T[],
): [T[], (next: T[] | ((prev: T[]) => T[])) => void, boolean, string | null] {
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

  const setValue = useCallback(
    (next: T[] | ((prev: T[]) => T[])) => {
      const resolved = typeof next === "function" ? next(latest.current) : next
      latest.current = resolved
      void mutate(resolved, { revalidate: false })
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
  return [data ?? defaults, setValue, isLoading || saving.current, errMsg]
}

function useRemoteConfig<T extends Record<string, unknown>>(
  swrKey: string,
  load: () => Promise<T>,
  save: (config: T) => Promise<T>,
  defaults: T,
): [T, (next: T | ((prev: T) => T)) => void, boolean, string | null] {
  const { data, error, isLoading, mutate } = useSWR(swrKey, load, {
    fallbackData: defaults,
    revalidateOnFocus: true,
  })
  const latest = useRef(defaults)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (data) latest.current = data
  }, [data])

  const setValue = useCallback(
    (next: T | ((prev: T) => T)) => {
      const resolved = typeof next === "function" ? next(latest.current) : next
      latest.current = resolved
      void mutate(resolved, { revalidate: false })
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        void save(resolved).then((saved) => {
          latest.current = saved
          void mutate(saved, { revalidate: false })
        })
      }, SAVE_DEBOUNCE_MS)
    },
    [mutate, save],
  )

  const errMsg = error instanceof Error ? error.message : error ? String(error) : null
  return [data ?? defaults, setValue, isLoading, errMsg]
}

export function useQaInventory(defaults: QaInventoryDto[]) {
  return useRemoteArray(
    "/admin/qa/inventory",
    apiAdminQa.listInventory,
    apiAdminQa.replaceInventory,
    defaults,
  )
}

export function useQaDispatchChecks(defaults: QaDispatchCheckDto[]) {
  return useRemoteArray(
    "/admin/qa/dispatch-checks",
    apiAdminQa.listDispatchChecks,
    apiAdminQa.replaceDispatchChecks,
    defaults,
  )
}

export function useQaConfig(defaults: QaConfigDto) {
  return useRemoteConfig(
    "/admin/qa/config",
    apiAdminQa.getConfig,
    (config) => apiAdminQa.patchConfig(config),
    defaults,
  )
}

export function useLogisticsZones(defaults: LogisticsZoneDto[]) {
  return useRemoteArray(
    "/admin/logistics/zones",
    apiAdminLogistics.listZones,
    apiAdminLogistics.replaceZones,
    defaults,
  )
}

export function useLogisticsRiders(defaults: LogisticsRiderDto[]) {
  return useRemoteArray(
    "/admin/logistics/riders",
    apiAdminLogistics.listRiders,
    apiAdminLogistics.replaceRiders,
    defaults,
  )
}

export function useLogisticsBatches(defaults: LogisticsBatchDto[]) {
  return useRemoteArray(
    "/admin/logistics/batches",
    apiAdminLogistics.listBatches,
    apiAdminLogistics.replaceBatches,
    defaults,
  )
}

export function useLogisticsDeliveries(defaults: LogisticsDeliveryDto[]) {
  return useRemoteArray(
    "/admin/logistics/deliveries",
    apiAdminLogistics.listDeliveries,
    apiAdminLogistics.replaceDeliveries,
    defaults,
  )
}

export function useLogisticsColdChecks(defaults: LogisticsColdCheckDto[]) {
  return useRemoteArray(
    "/admin/logistics/cold-chain-checks",
    apiAdminLogistics.listColdChecks,
    apiAdminLogistics.replaceColdChecks,
    defaults,
  )
}

export function useLogisticsExceptions(defaults: LogisticsExceptionDto[]) {
  return useRemoteArray(
    "/admin/logistics/exceptions",
    apiAdminLogistics.listExceptions,
    apiAdminLogistics.replaceExceptions,
    defaults,
  )
}

export function useLogisticsConfig(defaults: LogisticsConfigDto) {
  return useRemoteConfig(
    "/admin/logistics/config",
    apiAdminLogistics.getConfig,
    (config) => apiAdminLogistics.patchConfig(config),
    defaults,
  )
}

/** Surface load/save errors in admin shells. */
export function usePersistErrorBanner(errors: Array<string | null>) {
  const [visible, setVisible] = useState<string | null>(null)
  useEffect(() => {
    const hit = errors.find(Boolean)
    setVisible(hit ?? null)
  }, [errors])
  return { message: visible, dismiss: () => setVisible(null) }
}
