import { nestFetch } from "./api-nest"

export type TradingDealDto = {
  id: string
  ref: string
  sku?: string
  product: string
  supplier: string
  qty: number
  unit: string
  targetPrice: number
  awardedPrice: number
  currency: string
  status: "open" | "bidding" | "awarded" | "settled"
  notes: string
  createdAt: string
}

export type TradingBidDto = {
  id: string
  dealRef: string
  supplier: string
  unitPrice: number
  currency: string
  moq: number
  leadDays: number
  note: string
  status: "pending" | "shortlisted" | "awarded" | "rejected"
  submittedAt: string
}

export type TradingNegotiationDto = {
  id: string
  dealRef: string
  supplier: string
  round: 1 | 2
  ourOffer: number
  theirCounter: number
  currency: string
  floor: number
  status: "pending" | "accepted" | "rejected" | "expired"
  notes: string
  createdAt: string
}

export type TradingSettlementDto = {
  id: string
  dealRef: string
  supplier: string
  poNumber: string
  linkedPurchaseOrderId?: string
  invoiceNumber: string
  poValue: number
  invoiceValue: number
  currency: string
  matchStatus: "pending" | "matched" | "disputed"
  paymentStatus: "unpaid" | "paid" | "overdue"
  dueDate: string
  settledAt: string
  notes: string
  createdAt: string
}

export const apiAdminTrading = {
  listDeals: () => nestFetch<TradingDealDto[]>("/admin/trading/deals"),
  createDeal: (body: Omit<TradingDealDto, "id" | "createdAt">) =>
    nestFetch<TradingDealDto>("/admin/trading/deals", { method: "POST", body: JSON.stringify(body) }),
  createDealFromMargin: (body: {
    sku: string
    recommendedPrice: number
    product?: string
    supplier?: string
    targetMarginPct?: number
    ref?: string
    notes?: string
  }) =>
    nestFetch<TradingDealDto>("/admin/trading/deals/from-margin", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  patchDeal: (id: string, patch: Partial<TradingDealDto>) =>
    nestFetch<TradingDealDto>(`/admin/trading/deals/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteDeal: (id: string) =>
    nestFetch<{ ok: true }>(`/admin/trading/deals/${id}`, { method: "DELETE" }),

  listBids: () => nestFetch<TradingBidDto[]>("/admin/trading/bids"),
  createBid: (body: Omit<TradingBidDto, "id" | "submittedAt">) =>
    nestFetch<TradingBidDto>("/admin/trading/bids", { method: "POST", body: JSON.stringify(body) }),
  patchBid: (id: string, patch: Partial<TradingBidDto>) =>
    nestFetch<TradingBidDto>(`/admin/trading/bids/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteBid: (id: string) =>
    nestFetch<{ ok: true }>(`/admin/trading/bids/${id}`, { method: "DELETE" }),

  listNegotiations: () => nestFetch<TradingNegotiationDto[]>("/admin/trading/negotiations"),
  createNegotiation: (body: Omit<TradingNegotiationDto, "id" | "createdAt">) =>
    nestFetch<TradingNegotiationDto>("/admin/trading/negotiations", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  patchNegotiation: (id: string, patch: Partial<TradingNegotiationDto>) =>
    nestFetch<TradingNegotiationDto>(`/admin/trading/negotiations/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  deleteNegotiation: (id: string) =>
    nestFetch<{ ok: true }>(`/admin/trading/negotiations/${id}`, { method: "DELETE" }),

  listSettlements: () => nestFetch<TradingSettlementDto[]>("/admin/trading/settlements"),
  createSettlement: (body: Omit<TradingSettlementDto, "id" | "createdAt">) =>
    nestFetch<TradingSettlementDto>("/admin/trading/settlements", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  patchSettlement: (id: string, patch: Partial<TradingSettlementDto>) =>
    nestFetch<TradingSettlementDto>(`/admin/trading/settlements/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  deleteSettlement: (id: string) =>
    nestFetch<{ ok: true }>(`/admin/trading/settlements/${id}`, { method: "DELETE" }),
}
