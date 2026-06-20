/**
 * Keeps partner-portal `delivery_jobs` in sync with admin `logistics_deliveries`.
 */
import { and, eq, isNull, or } from "drizzle-orm"
import { db, deliveryJobs, logisticsDeliveries, partnerDirectory } from "@workspace/db"
import { newId } from "./repository"
import { parseIso } from "../modules/qa-logistics.dto"
import type { LogisticsDeliveryDto, LogisticsRiderDto } from "../modules/qa-logistics.dto"

const PICKUP_ADDRESS = "Shaniid RX Fulfillment Center, Nairobi, Kenya"

/** Logistics delivery statuses that should surface a partner job. */
const JOB_WORTHY_STATUSES = new Set([
  "assigned",
  "dispatched",
  "out_for_delivery",
  "delivered",
  "failed",
])

function mapLogisticsStatusToJobStatus(status: string): string {
  switch (status) {
    case "assigned":
      return "pending"
    case "dispatched":
      return "assigned"
    case "out_for_delivery":
      return "in_transit"
    case "delivered":
      return "delivered"
    case "failed":
      return "failed"
    default:
      return "pending"
  }
}

function mapJobStatusToLogisticsStatus(status: string): string | null {
  switch (status) {
    case "pending":
      return "assigned"
    case "assigned":
    case "picked_up":
      return "dispatched"
    case "in_transit":
      return "out_for_delivery"
    case "delivered":
      return "delivered"
    case "failed":
      return "failed"
    case "cancelled":
      return "pending"
    default:
      return null
  }
}

async function resolveLogisticsPartnerId(): Promise<string | null> {
  const rows = await db
    .select({ id: partnerDirectory.id })
    .from(partnerDirectory)
    .where(
      and(
        eq(partnerDirectory.partnerType, "logistics"),
        isNull(partnerDirectory.deletedAt),
        or(eq(partnerDirectory.status, "active"), eq(partnerDirectory.status, "verified")),
      ),
    )
    .orderBy(partnerDirectory.createdAt)
    .limit(1)
  return rows[0]?.id ?? null
}

export async function syncDeliveryJobsFromLogistics(
  deliveries: LogisticsDeliveryDto[],
  riders: LogisticsRiderDto[],
  batchColdChain = new Map<string, boolean>(),
): Promise<{ created: number; updated: number; cancelled: number; skipped: boolean }> {
  const partnerId = await resolveLogisticsPartnerId()
  if (!partnerId) {
    return { created: 0, updated: 0, cancelled: 0, skipped: true }
  }

  const riderById = new Map(riders.map((r) => [r.id, r]))
  const active = deliveries.filter((d) => JOB_WORTHY_STATUSES.has(d.status))
  const activeOrderRefs = new Set(active.map((d) => d.orderRef))

  let created = 0
  let updated = 0
  let cancelled = 0

  for (const d of active) {
    const rider = d.riderId ? riderById.get(d.riderId) : undefined
    const jobStatus = mapLogisticsStatusToJobStatus(d.status)
    const now = new Date()

    const [existing] = await db
      .select()
      .from(deliveryJobs)
      .where(and(eq(deliveryJobs.orderId, d.orderRef), eq(deliveryJobs.orderType, "storefront")))
      .limit(1)

    const row = {
      jobRef: d.orderRef,
      orderId: d.orderRef,
      orderType: "storefront",
      logisticsPartnerId: partnerId,
      pickupAddress: PICKUP_ADDRESS,
      deliveryAddress: d.address?.trim() || "Address pending",
      recipientName: d.customerName || null,
      recipientPhone: d.customerPhone || null,
      assignedRiderId: d.riderId,
      assignedRiderName: rider?.name ?? null,
      status: jobStatus,
      coldChain: d.batchId ? (batchColdChain.get(d.batchId) ?? false) : false,
      estimatedMinutes: d.slaHours ? d.slaHours * 60 : null,
      notes: `Synced from logistics delivery ${d.id}`,
      assignedAt:
        jobStatus === "assigned" || jobStatus === "in_transit"
          ? parseIso(d.dispatchedAt) ?? now
          : existing?.assignedAt ?? null,
      pickedUpAt:
        jobStatus === "in_transit" || jobStatus === "delivered"
          ? parseIso(d.dispatchedAt) ?? existing?.pickedUpAt ?? now
          : existing?.pickedUpAt ?? null,
      deliveredAt: parseIso(d.deliveredAt) ?? existing?.deliveredAt ?? null,
      updatedAt: now,
    }

    if (existing) {
      await db.update(deliveryJobs).set(row).where(eq(deliveryJobs.id, existing.id))
      updated++
    } else {
      await db.insert(deliveryJobs).values({
        id: newId("djob"),
        ...row,
        createdAt: parseIso(d.createdAt) ?? now,
      })
      created++
    }
  }

  const partnerJobs = await db
    .select()
    .from(deliveryJobs)
    .where(and(eq(deliveryJobs.logisticsPartnerId, partnerId), eq(deliveryJobs.orderType, "storefront")))

  for (const job of partnerJobs) {
    if (!job.orderId || activeOrderRefs.has(job.orderId)) continue
    if (job.status === "cancelled" || job.status === "delivered") continue
    await db
      .update(deliveryJobs)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(deliveryJobs.id, job.id))
    cancelled++
  }

  return { created, updated, cancelled, skipped: false }
}

/** When a logistics partner updates a job, mirror status onto admin logistics_deliveries. */
export async function syncLogisticsDeliveryFromJob(
  job: typeof deliveryJobs.$inferSelect,
): Promise<void> {
  if (!job.orderId || job.orderType !== "storefront") return
  const logisticsStatus = mapJobStatusToLogisticsStatus(job.status)
  if (!logisticsStatus) return

  const now = new Date()
  const patch: Partial<typeof logisticsDeliveries.$inferInsert> = {
    status: logisticsStatus,
    updatedAt: now,
  }
  if (logisticsStatus === "dispatched" || logisticsStatus === "out_for_delivery") {
    patch.dispatchedAt = job.pickedUpAt ?? job.assignedAt ?? now
  }
  if (logisticsStatus === "delivered") {
    patch.deliveredAt = job.deliveredAt ?? now
  }

  await db
    .update(logisticsDeliveries)
    .set(patch)
    .where(eq(logisticsDeliveries.orderRef, job.orderId))
}
