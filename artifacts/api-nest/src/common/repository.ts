import { randomUUID } from "node:crypto"

/**
 * Generic per-session in-memory repository.
 *
 * The Postgres swap is one file: implement the same surface against Drizzle
 * and inject it in place of `InMemoryRepository<T>` inside each module's
 * service. Nothing else needs to change.
 *
 * Memory safety: the backing Map is keyed by sessionId and would otherwise grow
 * without bound — under the ~1000-users/hour load target that means thousands
 * of dead guest sessions accumulating until OOM. To prevent this we cap the
 * number of tracked sessions and evict the least-recently-used ones (LRU). The
 * insertion order of a JS Map is the eviction order; touching a session
 * re-inserts it at the end so active sessions survive. This is a single-process
 * safeguard — the Postgres swap removes the cap entirely.
 */
const DEFAULT_MAX_SESSIONS = Number(process.env["REPO_MAX_SESSIONS"]) || 10_000

export class InMemoryRepository<T extends { id: string }> {
  private data = new Map<string, T[]>()
  private readonly maxSessions: number

  constructor(maxSessions: number = DEFAULT_MAX_SESSIONS) {
    this.maxSessions = Math.max(100, maxSessions)
  }

  /** Mark a session as most-recently-used and evict the oldest if over cap. */
  private touch(sessionId: string): void {
    if (this.data.has(sessionId)) {
      // Re-insert to move to the end (most-recently-used) of the Map.
      const v = this.data.get(sessionId)!
      this.data.delete(sessionId)
      this.data.set(sessionId, v)
    }
    while (this.data.size > this.maxSessions) {
      const oldest = this.data.keys().next().value
      if (oldest === undefined) break
      this.data.delete(oldest)
    }
  }

  listFor(sessionId: string): T[] {
    return this.data.get(sessionId) ?? []
  }

  setFor(sessionId: string, items: T[]): void {
    this.data.set(sessionId, items)
    this.touch(sessionId)
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
