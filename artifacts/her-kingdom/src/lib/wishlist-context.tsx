"use client"

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react"
import { useUser } from "@clerk/react"
import { apiNest } from "./api-nest"
import type { Product } from "./types"

interface WishlistContextType {
  items: Product[]
  addItem: (product: Product) => void
  removeItem: (productId: string) => void
  toggleItem: (product: Product) => void
  isInWishlist: (productId: string) => boolean
  totalItems: number
  clearWishlist: () => void
}

/**
 * Wishlist storage strategy (hybrid):
 *
 *   1. localStorage `shaniidrx-wishlist` is the primary client cache so the
 *      UI works offline / for guests and feels instant.
 *   2. When the visitor is signed in via Clerk, every mutation also
 *      fire-and-forget POSTs/DELETEs against `/api/v2/me/wishlist` so the
 *      wishlist survives across devices.
 *   3. On sign-in, the local wishlist is pushed to the server so anything
 *      saved as a guest sticks once the user creates an account.
 */
const WISHLIST_KEY = "shaniidrx-wishlist"

function loadWishlist(): Product[] {
  if (typeof window === "undefined") return []
  try {
    const stored = localStorage.getItem(WISHLIST_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function saveWishlist(items: Product[]) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(items))
  } catch {
    // silently fail
  }
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined)

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Product[]>([])
  const [hydrated, setHydrated] = useState(false)
  const { isSignedIn, isLoaded: clerkLoaded } = useUser()
  const lastSyncedUserId = useRef<string | null>(null)

  useEffect(() => {
    const stored = loadWishlist()
    if (stored.length > 0) setItems(stored)
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated) saveWishlist(items)
  }, [items, hydrated])

  // On sign-in, push local items to the server so guest wishlist isn't lost.
  useEffect(() => {
    if (!clerkLoaded || !isSignedIn || !hydrated) return
    const fingerprint = `${isSignedIn}-${items.length}`
    if (lastSyncedUserId.current === fingerprint) return
    lastSyncedUserId.current = fingerprint
    void (async () => {
      try {
        for (const product of items) {
          if (product.slug) {
            await apiNest.addWishlist(product.slug).catch(() => undefined)
          }
        }
      } catch {
        // best effort — don't block UI
      }
    })()
  }, [clerkLoaded, isSignedIn, hydrated, items])

  const addItem = useCallback(
    (product: Product) => {
      setItems((prev) => {
        if (prev.some((p) => p.id === product.id)) return prev
        return [...prev, product]
      })
      if (isSignedIn && product.slug) {
        apiNest.addWishlist(product.slug).catch(() => undefined)
      }
    },
    [isSignedIn],
  )

  const removeItem = useCallback(
    (productId: string) => {
      let removedSlug: string | undefined
      setItems((prev) => {
        const next = prev.filter((p) => {
          if (p.id === productId) {
            removedSlug = p.slug
            return false
          }
          return true
        })
        return next
      })
      if (isSignedIn && removedSlug) {
        apiNest.removeWishlist(removedSlug).catch(() => undefined)
      }
    },
    [isSignedIn],
  )

  const toggleItem = useCallback(
    (product: Product) => {
      setItems((prev) => {
        const exists = prev.some((p) => p.id === product.id)
        if (exists) {
          if (isSignedIn && product.slug) {
            apiNest.removeWishlist(product.slug).catch(() => undefined)
          }
          return prev.filter((p) => p.id !== product.id)
        }
        if (isSignedIn && product.slug) {
          apiNest.addWishlist(product.slug).catch(() => undefined)
        }
        return [...prev, product]
      })
    },
    [isSignedIn],
  )

  const isInWishlist = useCallback(
    (productId: string) => items.some((p) => p.id === productId),
    [items],
  )

  const clearWishlist = useCallback(() => {
    const snapshot = items
    setItems([])
    if (isSignedIn) {
      for (const p of snapshot) {
        if (p.slug) apiNest.removeWishlist(p.slug).catch(() => undefined)
      }
    }
  }, [items, isSignedIn])

  const totalItems = items.length

  return (
    <WishlistContext.Provider value={{ items, addItem, removeItem, toggleItem, isInWishlist, totalItems, clearWishlist }}>
      {children}
    </WishlistContext.Provider>
  )
}

export function useWishlist() {
  const context = useContext(WishlistContext)
  if (!context) throw new Error("useWishlist must be used within a WishlistProvider")
  return context
}
