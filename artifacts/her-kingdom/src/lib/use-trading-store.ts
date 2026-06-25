import { useCallback } from "react"
import useSWR from "swr"
import {
  apiAdminTrading,
  type TradingBidDto,
  type TradingDealDto,
  type TradingNegotiationDto,
  type TradingSettlementDto,
} from "./api-admin-trading"

export function useTradingDeals() {
  const { data, mutate, isLoading, error } = useSWR("/admin/trading/deals", apiAdminTrading.listDeals, {
    revalidateOnFocus: true,
  })
  const deals = data ?? []

  const add = useCallback(
    async (d: Omit<TradingDealDto, "id" | "createdAt">) => {
      const row = await apiAdminTrading.createDeal(d)
      void mutate((prev) => [...(prev ?? []), row], { revalidate: false })
    },
    [mutate],
  )

  const update = useCallback(
    async (id: string, patch: Partial<TradingDealDto>) => {
      const row = await apiAdminTrading.patchDeal(id, patch)
      void mutate((prev) => (prev ?? []).map((d) => (d.id === id ? row : d)), { revalidate: false })
    },
    [mutate],
  )

  const remove = useCallback(
    async (id: string) => {
      await apiAdminTrading.deleteDeal(id)
      void mutate((prev) => (prev ?? []).filter((d) => d.id !== id), { revalidate: false })
    },
    [mutate],
  )

  const refresh = useCallback(() => mutate(), [mutate])

  return { deals, add, update, remove, refresh, loading: isLoading, error }
}

export function useTradingBids() {
  const { data, mutate, isLoading } = useSWR("/admin/trading/bids", apiAdminTrading.listBids, {
    revalidateOnFocus: true,
  })
  const bids = data ?? []

  const add = useCallback(
    async (b: Omit<TradingBidDto, "id" | "submittedAt">) => {
      const row = await apiAdminTrading.createBid(b)
      void mutate((prev) => [...(prev ?? []), row], { revalidate: false })
    },
    [mutate],
  )

  const update = useCallback(
    async (id: string, patch: Partial<TradingBidDto>) => {
      const row = await apiAdminTrading.patchBid(id, patch)
      void mutate((prev) => (prev ?? []).map((b) => (b.id === id ? row : b)), { revalidate: false })
    },
    [mutate],
  )

  const remove = useCallback(
    async (id: string) => {
      await apiAdminTrading.deleteBid(id)
      void mutate((prev) => (prev ?? []).filter((b) => b.id !== id), { revalidate: false })
    },
    [mutate],
  )

  return { bids, add, update, remove, loading: isLoading }
}

export function useTradingNegotiations() {
  const { data, mutate, isLoading } = useSWR(
    "/admin/trading/negotiations",
    apiAdminTrading.listNegotiations,
    { revalidateOnFocus: true },
  )
  const rounds = data ?? []

  const add = useCallback(
    async (n: Omit<TradingNegotiationDto, "id" | "createdAt">) => {
      const row = await apiAdminTrading.createNegotiation(n)
      void mutate((prev) => [...(prev ?? []), row], { revalidate: false })
    },
    [mutate],
  )

  const update = useCallback(
    async (id: string, patch: Partial<TradingNegotiationDto>) => {
      const row = await apiAdminTrading.patchNegotiation(id, patch)
      void mutate((prev) => (prev ?? []).map((r) => (r.id === id ? row : r)), { revalidate: false })
    },
    [mutate],
  )

  const remove = useCallback(
    async (id: string) => {
      await apiAdminTrading.deleteNegotiation(id)
      void mutate((prev) => (prev ?? []).filter((r) => r.id !== id), { revalidate: false })
    },
    [mutate],
  )

  return { rounds, add, update, remove, loading: isLoading }
}

export function useTradingSettlements() {
  const { data, mutate, isLoading } = useSWR(
    "/admin/trading/settlements",
    apiAdminTrading.listSettlements,
    { revalidateOnFocus: true },
  )
  const settlements = data ?? []

  const add = useCallback(
    async (s: Omit<TradingSettlementDto, "id" | "createdAt">) => {
      const row = await apiAdminTrading.createSettlement(s)
      void mutate((prev) => [...(prev ?? []), row], { revalidate: false })
    },
    [mutate],
  )

  const update = useCallback(
    async (id: string, patch: Partial<TradingSettlementDto>) => {
      const row = await apiAdminTrading.patchSettlement(id, patch)
      void mutate((prev) => (prev ?? []).map((s) => (s.id === id ? row : s)), { revalidate: false })
    },
    [mutate],
  )

  const remove = useCallback(
    async (id: string) => {
      await apiAdminTrading.deleteSettlement(id)
      void mutate((prev) => (prev ?? []).filter((s) => s.id !== id), { revalidate: false })
    },
    [mutate],
  )

  return { settlements, add, update, remove, loading: isLoading }
}
