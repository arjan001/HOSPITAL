import { Router } from "express"
import { desc, eq } from "drizzle-orm"
import { db, abandonedCheckouts } from "@workspace/db"

const router = Router()

function newId(): string {
  return `aban_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
}

/* POST — record (or refresh) an abandoned checkout for a session. To avoid
   piling up duplicate rows for the same session, the most recent open cart for
   the session is updated in place; otherwise a new row is created. */
router.post("/", async (req, res) => {
  try {
    const b = (req.body || {}) as Record<string, unknown>
    const sessionId = String(b.sessionId || "")
    if (!sessionId) return res.json({ ok: false })
    const items = Array.isArray(b.items) ? (b.items as Array<{ name: string; qty: number; price: number }>) : []
    const fields = {
      customerName: String(b.customerName || ""),
      customerPhone: String(b.customerPhone || ""),
      items,
      subtotal: Math.max(0, Math.round(Number(b.subtotal) || 0)),
      stepReached: String(b.stepReached || "").slice(0, 120),
      reason: String(b.reason || "").slice(0, 200),
      updatedAt: new Date(),
    }
    const [existing] = await db
      .select({ id: abandonedCheckouts.id })
      .from(abandonedCheckouts)
      .where(eq(abandonedCheckouts.sessionId, sessionId))
      .orderBy(desc(abandonedCheckouts.createdAt))
      .limit(1)
    if (existing) {
      await db.update(abandonedCheckouts).set(fields).where(eq(abandonedCheckouts.id, existing.id))
    } else {
      await db.insert(abandonedCheckouts).values({ id: newId(), sessionId, ...fields })
    }
    res.json({ ok: true })
  } catch {
    res.json({ ok: false })
  }
})

/* PATCH — mark a session's latest abandoned cart as recovered (checkout
   completed after the abandonment ping). */
router.patch("/", async (req, res) => {
  try {
    const b = (req.body || {}) as Record<string, unknown>
    const sessionId = String(b.sessionId || "")
    if (!sessionId) return res.json({ ok: false })
    const [existing] = await db
      .select({ id: abandonedCheckouts.id })
      .from(abandonedCheckouts)
      .where(eq(abandonedCheckouts.sessionId, sessionId))
      .orderBy(desc(abandonedCheckouts.createdAt))
      .limit(1)
    if (existing) {
      await db.update(abandonedCheckouts).set({ recovered: true, updatedAt: new Date() }).where(eq(abandonedCheckouts.id, existing.id))
    }
    res.json({ ok: true })
  } catch {
    res.json({ ok: false })
  }
})

export default router
