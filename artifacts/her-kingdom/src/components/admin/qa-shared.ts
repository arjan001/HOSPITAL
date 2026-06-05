/**
 * Shared QA types, validation, and helpers (Postgres-backed via /admin/qa/*).
 */

import type {
  QaConfigDto,
  QaDispatchCheckDto,
  QaInventoryDto,
} from "@/lib/qa-logistics-types"

export type ItemKind = "medication" | "device" | "consumable"
export type QaInventoryItem = QaInventoryDto
export type QaDispatchCheck = QaDispatchCheckDto
export type QaConfig = QaConfigDto

export type QaStepKey =
  | "dispatch_prep"
  | "batch_verification"
  | "expiry_validation"
  | "prescription_match"
  | "storage_compliance"
  | "final_pack"
  | "qa_approved"

export const QA_STEP_ORDER: QaStepKey[] = [
  "dispatch_prep",
  "batch_verification",
  "expiry_validation",
  "prescription_match",
  "storage_compliance",
  "final_pack",
  "qa_approved",
]

export const QA_STEP_LABEL: Record<QaStepKey, string> = {
  dispatch_prep: "Dispatch preparation",
  batch_verification: "Medication batch verification",
  expiry_validation: "Expiry validation",
  prescription_match: "Prescription matching",
  storage_compliance: "Storage compliance",
  final_pack: "Final pack inspection",
  qa_approved: "QA approved",
}

export const QA_KEYS = {
  inventory: "qa.inventory",
  dispatch: "qa.dispatch-checks",
  config: "qa.config",
} as const

export const LOGISTICS_BATCHES_KEY = "logistics.batches"

export const QA_DEFAULT_CONFIG: QaConfig = {
  expiryWarningDays: 90,
  expiryCriticalDays: 30,
  requireAllStepsForApproval: true,
  blockExpiredFromDispatch: true,
}

export function blankQaSteps(): Record<string, boolean> {
  return QA_STEP_ORDER.reduce(
    (acc, k) => {
      acc[k] = false
      return acc
    },
    {} as Record<string, boolean>,
  )
}

export function daysUntilExpiry(iso?: string): number | null {
  if (!iso) return null
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000)
}

export type QaCheckUiStatus = "pending" | "approved" | "rejected"

export function qaCheckStatus(c: QaDispatchCheck): QaCheckUiStatus {
  if (c.approvedAt) return "approved"
  if (c.rejectedAt) return "rejected"
  return "pending"
}

export function stepsCompleted(c: QaDispatchCheck): number {
  return QA_STEP_ORDER.filter((k) => c.steps[k]).length
}

/** Best matching QA record for a logistics batch ref (exact ref, else per-order). */
export function findChecksForBatch(
  batchRef: string,
  orderIds: string[],
  checks: QaDispatchCheck[],
): QaDispatchCheck[] {
  const ref = batchRef.trim()
  const orders = new Set(orderIds.map((o) => o.trim()).filter(Boolean))
  return checks.filter(
    (c) =>
      c.batchRef === ref ||
      (c.orderRef && orders.has(c.orderRef)) ||
      orders.has(c.batchRef),
  )
}

export function batchHasQaApproval(
  batchRef: string,
  orderIds: string[],
  checks: QaDispatchCheck[],
): boolean {
  return findChecksForBatch(batchRef, orderIds, checks).some((c) => !!c.approvedAt)
}

export function orderHasQaApproval(orderNo: string, checks: QaDispatchCheck[]): boolean {
  const ref = orderNo.trim()
  return checks.some(
    (c) =>
      c.approvedAt &&
      (c.orderRef === ref || c.batchRef === ref),
  )
}

export function validateQaApproval(
  check: QaDispatchCheck,
  inventory: QaInventoryItem[],
  config: QaConfig,
): { ok: true } | { ok: false; message: string } {
  if (config.requireAllStepsForApproval) {
    const allDone = QA_STEP_ORDER.every((k) => check.steps[k])
    if (!allDone) {
      return {
        ok: false,
        message: "Complete all 7 QA steps before approval.",
      }
    }
  }
  if (config.blockExpiredFromDispatch) {
    const expired = inventory.filter(
      (i) =>
        i.batchRef &&
        i.batchRef === check.batchRef &&
        i.expiryDate &&
        daysUntilExpiry(i.expiryDate)! < 0,
    )
    if (expired.length > 0) {
      return {
        ok: false,
        message: `${expired.length} SKU(s) in batch ${check.batchRef} are expired.`,
      }
    }
  }
  return { ok: true }
}

export type BatchQaSummary = {
  status: "none" | "pending" | "approved" | "rejected"
  check: QaDispatchCheck | null
  stepsDone: number
}

export function summarizeBatchQa(
  batchRef: string,
  orderIds: string[],
  checks: QaDispatchCheck[],
): BatchQaSummary {
  const related = findChecksForBatch(batchRef, orderIds, checks)
  const approved = related.find((c) => c.approvedAt)
  if (approved) {
    return { status: "approved", check: approved, stepsDone: stepsCompleted(approved) }
  }
  const rejected = related.find((c) => c.rejectedAt)
  if (rejected) {
    return { status: "rejected", check: rejected, stepsDone: stepsCompleted(rejected) }
  }
  const pending = related[0]
  if (pending) {
    return { status: "pending", check: pending, stepsDone: stepsCompleted(pending) }
  }
  return { status: "none", check: null, stepsDone: 0 }
}
