import { randomUUID } from "node:crypto"

/**
 * Generic per-session in-memory repository.
 *
 * The Postgres swap is one file: implement the same surface against Drizzle
 * and inject it in place of `InMemoryRepository<T>` inside each module's
 * service. Nothing else needs to change.
 */
export class InMemoryRepository<T extends { id: string }> {
  private data = new Map<string, T[]>()

  listFor(sessionId: string): T[] {
    return this.data.get(sessionId) ?? []
  }

  setFor(sessionId: string, items: T[]): void {
    this.data.set(sessionId, items)
  }

  add(sessionId: string, item: T): T {
    const list = [...this.listFor(sessionId), item]
    this.setFor(sessionId, list)
    return item
  }

  update(sessionId: string, id: string, patch: Partial<T>): T | null {
    const list = this.listFor(sessionId)
    const idx = list.findIndex((i) => i.id === id)
    if (idx < 0) return null
    const next = { ...list[idx], ...patch } as T
    const out = [...list]
    out[idx] = next
    this.setFor(sessionId, out)
    return next
  }

  remove(sessionId: string, id: string): boolean {
    const list = this.listFor(sessionId)
    const next = list.filter((i) => i.id !== id)
    if (next.length === list.length) return false
    this.setFor(sessionId, next)
    return true
  }

  findById(sessionId: string, id: string): T | null {
    return this.listFor(sessionId).find((i) => i.id === id) ?? null
  }
}

export function newId(prefix = "id"): string {
  return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 16)}`
}
