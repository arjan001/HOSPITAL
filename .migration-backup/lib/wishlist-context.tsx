"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"
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

const WISHLIST_KEY = "herkingdom-wishlist"

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

  useEffect(() => {
    const stored = loadWishlist()
    if (stored.length > 0) setItems(stored)
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated) saveWishlist(items)
  }, [items, hydrated])

  const addItem = useCallback((product: Product) => {
    setItems((prev) => {
      if (prev.some((p) => p.id === product.id)) return prev
      return [...prev, product]
    })
  }, [])

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((p) => p.id !== productId))
  }, [])

  const toggleItem = useCallback((product: Product) => {
    setItems((prev) => {
      if (prev.some((p) => p.id === product.id)) {
        return prev.filter((p) => p.id !== product.id)
      }
      return [...prev, product]
    })
  }, [])

  const isInWishlist = useCallback(
    (productId: string) => items.some((p) => p.id === productId),
    [items]
  )

  const clearWishlist = useCallback(() => setItems([]), [])

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
