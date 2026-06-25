/**
 * Outbound partner webhooks (Stage 5.5).
 */
import { createHmac } from "node:crypto"
import { and, desc, eq } from "drizzle-orm"
import { db, partnerWebhookDeliveries, partnerWebhookEndpoints } from "@workspace/db"
import { newId } from "./repository"

export type PartnerWebhookEvent = "po.issued" | "delivery.job_assigned" | "delivery.job_updated"

export async function dispatchPartnerWebhook(
  partnerId: string,
  event: PartnerWebhookEvent,
  payload: Record<string, unknown>,
): Promise<{ dispatched: number; delivered: number }> {
  const endpoints = await db
    .select()
    .from(partnerWebhookEndpoints)
    .where(and(eq(partnerWebhookEndpoints.partnerId, partnerId), eq(partnerWebhookEndpoints.isActive, true)))

  let dispatched = 0
  let delivered = 0

  for (const ep of endpoints) {
    const events = ep.events ?? []
    if (events.length > 0 && !events.includes(event)) continue
    dispatched++
    const body = JSON.stringify({ event, partnerId, at: new Date().toISOString(), data: payload })
    const deliveryId = newId("whd")
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "ShaniidRX-Webhooks/1.0",
      "X-Shaniid-Event": event,
    }
    if (ep.secret) {
      headers["X-Shaniid-Signature"] = createHmac("sha256", ep.secret).update(body).digest("hex")
    }

    let status = "failed"
    let responseCode: number | null = null
    let error: string | null = null

    try {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), 8000)
      const res = await fetch(ep.url, { method: "POST", headers, body, signal: ctrl.signal })
      clearTimeout(timer)
      responseCode = res.status
      if (res.ok) {
        status = "delivered"
        delivered++
      } else {
        error = `HTTP ${res.status}`
      }
    } catch (err) {
      error = err instanceof Error ? err.message : String(err)
    }

    await db.insert(partnerWebhookDeliveries).values({
      id: deliveryId,
      endpointId: ep.id,
      event,
      status,
      attempt: 1,
      responseCode,
      error,
      payload: payload as Record<string, unknown>,
      deliveredAt: status === "delivered" ? new Date() : null,
      createdAt: new Date(),
    })
  }

  return { dispatched, delivered }
}

export async function listWebhookEndpoints(partnerId?: string) {
  const rows = partnerId
    ? await db
        .select()
        .from(partnerWebhookEndpoints)
        .where(eq(partnerWebhookEndpoints.partnerId, partnerId))
    : await db.select().from(partnerWebhookEndpoints)
  return rows.map((r) => ({
    id: r.id,
    partnerId: r.partnerId,
    partnerType: r.partnerType,
    url: r.url,
    events: r.events ?? [],
    isActive: r.isActive,
    hasSecret: Boolean(r.secret),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }))
}

export async function upsertWebhookEndpoint(body: Record<string, unknown>) {
  const partnerId = String(body.partnerId ?? "").trim()
  const url = String(body.url ?? "").trim()
  if (!partnerId || !url) throw new Error("partnerId and url required")
  const id = String(body.id ?? newId("wh"))
  const now = new Date()
  const events = Array.isArray(body.events) ? body.events.map(String) : []
  const [row] = await db
    .insert(partnerWebhookEndpoints)
    .values({
      id,
      partnerId,
      partnerType: String(body.partnerType ?? "supplier"),
      url,
      secret: typeof body.secret === "string" ? body.secret : null,
      events,
      isActive: body.isActive !== false,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: partnerWebhookEndpoints.id,
      set: {
        url,
        secret: typeof body.secret === "string" ? body.secret : null,
        events,
        isActive: body.isActive !== false,
        updatedAt: now,
      },
    })
    .returning()
  return row!
}

export async function listRecentDeliveries(limit = 50) {
  const rows = await db
    .select()
    .from(partnerWebhookDeliveries)
    .orderBy(desc(partnerWebhookDeliveries.createdAt))
    .limit(Math.min(100, limit))
  return rows.map((r) => ({
    id: r.id,
    endpointId: r.endpointId,
    event: r.event,
    status: r.status,
    responseCode: r.responseCode,
    error: r.error,
    createdAt: r.createdAt.toISOString(),
  }))
}
