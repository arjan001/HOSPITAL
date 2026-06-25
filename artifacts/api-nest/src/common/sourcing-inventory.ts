/**
 * Postgres-backed sourcing inventory (replaces cms_docs `sourcing-inventory`).
 */
import { eq } from "drizzle-orm"
import { db, sourcingInventoryItems } from "@workspace/db"
import { newId } from "./repository"

export type SourcingInventoryDto = {
  id: string
  sku: string
  productName: string
  type: string
  onHand: number
  safetyStock: number
  reorderPoint: number
  unitCost?: number
  batchExpiry?: string
  location?: string
  notes?: string
  updatedAt: string
}

function mapRow(row: typeof sourcingInventoryItems.$inferSelect): SourcingInventoryDto {
  return {
    id: row.id,
    sku: row.sku,
    productName: row.productName,
    type: row.type,
    onHand: row.onHand,
    safetyStock: row.safetyStock,
    reorderPoint: row.reorderPoint,
    unitCost: row.unitCost ?? undefined,
    batchExpiry: row.batchExpiry ?? undefined,
    location: row.location ?? undefined,
    notes: row.notes ?? undefined,
    updatedAt: row.updatedAt.toISOString(),
  }
}

export async function listSourcingInventory(): Promise<SourcingInventoryDto[]> {
  const rows = await db.select().from(sourcingInventoryItems).orderBy(sourcingInventoryItems.productName)
  return rows.map(mapRow)
}

export async function replaceSourcingInventory(items: SourcingInventoryDto[]): Promise<SourcingInventoryDto[]> {
  const now = new Date()
  await db.transaction(async (tx) => {
    await tx.delete(sourcingInventoryItems)
    if (items.length === 0) return
    await tx.insert(sourcingInventoryItems).values(
      items.map((i) => ({
        id: i.id?.trim() || newId("inv"),
        sku: String(i.sku).trim(),
        productName: String(i.productName).trim(),
        type: i.type ?? "medication",
        onHand: Math.max(0, Math.round(Number(i.onHand) || 0)),
        safetyStock: Math.max(0, Math.round(Number(i.safetyStock) || 0)),
        reorderPoint: Math.max(0, Math.round(Number(i.reorderPoint) || 0)),
        unitCost: i.unitCost != null ? Number(i.unitCost) : null,
        batchExpiry: i.batchExpiry ?? null,
        location: i.location ?? null,
        notes: i.notes ?? null,
        updatedAt: now,
      })),
    )
  })
  return listSourcingInventory()
}

/** Deduct on-hand qty when fulfillment commits stock (care pack assembled). */
export async function deductSourcingInventory(sku: string, quantity: number): Promise<boolean> {
  const qty = Math.max(1, Math.round(quantity))
  const [row] = await db
    .select()
    .from(sourcingInventoryItems)
    .where(eq(sourcingInventoryItems.sku, sku))
    .limit(1)
  if (!row) return false
  await db
    .update(sourcingInventoryItems)
    .set({
      onHand: Math.max(0, row.onHand - qty),
      updatedAt: new Date(),
    })
    .where(eq(sourcingInventoryItems.id, row.id))
  return true
}
