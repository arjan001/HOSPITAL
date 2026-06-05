/** ISO strings for API responses (matches storefront types). */
export function toIso(d: Date | null | undefined): string | undefined {
  if (!d) return undefined
  return d instanceof Date ? d.toISOString() : new Date(d).toISOString()
}

export function parseIso(s: string | undefined | null): Date | null {
  if (!s?.trim()) return null
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

export type QaInventoryDto = {
  id: string
  kind: string
  name: string
  sku: string
  stock: number
  safetyStock: number
  unit: string
  expiryDate?: string
  batchRef?: string
  location: string
  notes?: string
}

export type QaDispatchCheckDto = {
  id: string
  batchRef: string
  orderRef?: string
  steps: Record<string, boolean>
  notes: string
  checkedBy: string
  createdAt: string
  approvedAt?: string
  rejectedAt?: string
  rejectionReason?: string
}

export type QaConfigDto = {
  expiryWarningDays: number
  expiryCriticalDays: number
  requireAllStepsForApproval: boolean
  blockExpiredFromDispatch: boolean
}

export type LogisticsZoneDto = {
  id: string
  name: string
  areas: string
  slaHours: number
  surcharge: number
  coldChainCapable: boolean
  active: boolean
}

export type LogisticsRiderDto = {
  id: string
  name: string
  phone: string
  vehicle: string
  capacity: number
  zoneId: string | null
  coldChainCapable: boolean
  active: boolean
  notes?: string
}

export type LogisticsBatchDto = {
  id: string
  ref: string
  zoneId: string | null
  riderId: string | null
  scheduledAt: string
  status: string
  orderIds: string[]
  coldChain: boolean
  notes?: string
  createdAt: string
  dispatchedAt?: string
  completedAt?: string
}

export type LogisticsDeliveryDto = {
  id: string
  orderRef: string
  customerName: string
  customerPhone: string
  address: string
  zoneId: string | null
  batchId: string | null
  riderId: string | null
  status: string
  attempts: number
  codAmount: number
  estimatedCost: number
  failureReason?: string
  createdAt: string
  dispatchedAt?: string
  deliveredAt?: string
  slaHours?: number
}

export type LogisticsColdCheckDto = {
  id: string
  batchId: string
  tempBefore: number
  tempAfter: number
  packagedBy: string
  packagedAt: string
  passed: boolean
  notes?: string
}

export type LogisticsExceptionDto = {
  id: string
  deliveryId: string | null
  type: string
  summary: string
  resolution: string
  cost?: number
  createdAt: string
  resolvedAt?: string
}

export type LogisticsConfigDto = {
  targetOrdersPerBatch: number
  targetSlaHours: number
  costCapPerDelivery: number
  onlyLeftTurnRule: boolean
  autoAssignRiders: boolean
  smsCustomerOnDispatch: boolean
  smsCustomerOnDelivery: boolean
}
