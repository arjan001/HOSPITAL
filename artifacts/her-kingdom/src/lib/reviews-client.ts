/**
 * Customer product reviews client (api-nest, /api/v2/reviews).
 *
 * Reads are public; writes are scoped to the signed session cookie, so all
 * requests use `credentials: "include"`. The hook never throws on a network
 * failure — a product page must still render if the reviews backend is down.
 */
import { useCallback, useEffect, useState } from "react"

export type ClientReview = {
  id: string
  productId: string
  authorName: string
  rating: number
  title: string | null
  body: string
  helpfulCount: number
  createdAt: string
  updatedAt: string
  mine: boolean
}

export type ReviewAggregate = {
  average: number
  count: number
  distribution: Record<"1" | "2" | "3" | "4" | "5", number>
}

export type ReviewsResponse = {
  items: ClientReview[]
  aggregate: ReviewAggregate
}

const BASE = "/api/v2"

const EMPTY_AGGREGATE: ReviewAggregate = {
  average: 0,
  count: 0,
  distribution: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 },
}

async function safeJson<T>(p: Promise<Response>, fallback: T): Promise<T> {
  try {
    const r = await p
    if (!r.ok) return fallback
    return (await r.json()) as T
  } catch {
    return fallback
  }
}

export type CreateReviewInput = {
  productId: string
  rating: number
  body: string
  title?: string
  authorName?: string
}

export async function createReview(input: CreateReviewInput): Promise<ClientReview | null> {
  return safeJson<ClientReview | null>(
    fetch(`${BASE}/reviews`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
    null,
  )
}

export async function updateReview(
  id: string,
  patch: { rating?: number; body?: string; title?: string },
): Promise<ClientReview | null> {
  return safeJson<ClientReview | null>(
    fetch(`${BASE}/reviews/${encodeURIComponent(id)}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }),
    null,
  )
}

export async function deleteReview(id: string): Promise<boolean> {
  try {
    const r = await fetch(`${BASE}/reviews/${encodeURIComponent(id)}`, {
      method: "DELETE",
      credentials: "include",
    })
    return r.ok
  } catch {
    return false
  }
}

export function useProductReviews(productId: string | null | undefined) {
  const [data, setData] = useState<ReviewsResponse>({ items: [], aggregate: EMPTY_AGGREGATE })
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!productId) {
      setData({ items: [], aggregate: EMPTY_AGGREGATE })
      setLoading(false)
      return
    }
    const r = await safeJson<ReviewsResponse>(
      fetch(`${BASE}/reviews/product/${encodeURIComponent(productId)}`, { credentials: "include" }),
      { items: [], aggregate: EMPTY_AGGREGATE },
    )
    setData(r)
    setLoading(false)
  }, [productId])

  useEffect(() => {
    setLoading(true)
    void refresh()
  }, [refresh])

  return { ...data, loading, refresh }
}
