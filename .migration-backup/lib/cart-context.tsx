"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"
import type { CartItem, Product } from "./types"

export interface GiftPersonalization {
  wrap: boolean
  ribbon: boolean
  cardMessage: string
}

interface CartContextType {
  items: CartItem[]
  addItem: (product: Product, quantity?: number, variations?: Record<string, string>) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  totalItems: number
  totalPrice: number
  isCartOpen: boolean
  setIsCartOpen: (open: boolean) => void
  gift: GiftPersonalization
  setGift: (updater: Partial<GiftPersonalization>) => void
}

const CART_KEY = "herkingdom-cart"
const GIFT_KEY = "herkingdom-gift"
const DEFAULT_GIFT: GiftPersonalization = { wrap: false, ribbon: false, cardMessage: "" }

function loadCart(): CartItem[] {
  if (typeof window === "undefined") return []
  try {
    const stored = sessionStorage.getItem(CART_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function saveCart(items: CartItem[]) {
  if (typeof window === "undefined") return
  try {
    sessionStorage.setItem(CART_KEY, JSON.stringify(items))
  } catch {
    // silently fail
  }
}

function loadGift(): GiftPersonalization {
  if (typeof window === "undefined") return DEFAULT_GIFT
  try {
    const stored = sessionStorage.getItem(GIFT_KEY)
    return stored ? { ...DEFAULT_GIFT, ...JSON.parse(stored) } : DEFAULT_GIFT
  } catch {
    return DEFAULT_GIFT
  }
}

function saveGift(gift: GiftPersonalization) {
  if (typeof window === "undefined") return
  try {
    sessionStorage.setItem(GIFT_KEY, JSON.stringify(gift))
  } catch {
    // silently fail
  }
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [specialInstructions, setSpecialInstructionsState] = useState("")
  const [hydrated, setHydrated] = useState(false)
  const [gift, setGiftState] = useState<GiftPersonalization>(DEFAULT_GIFT)

  // Hydrate from sessionStorage on mount
  useEffect(() => {
    const stored = loadCart()
    if (stored.length > 0) {
      setItems(stored)
    }
    setGiftState(loadGift())
    setHydrated(true)
  }, [])

  // Persist to sessionStorage whenever items change (after hydration)
  useEffect(() => {
    if (hydrated) {
      saveCart(items)
    }
  }, [items, hydrated])

  useEffect(() => {
    if (hydrated) {
      saveGift(gift)
    }
  }, [gift, hydrated])

  const addItem = useCallback((product: Product, quantity = 1, variations?: Record<string, string>) => {
    setItems((prev) => {
      const variationKey = variations ? JSON.stringify(variations) : ""
      const existing = prev.find(
        (item) => item.product.id === product.id && JSON.stringify(item.selectedVariations || {}) === (variationKey || "{}")
      )
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id && JSON.stringify(item.selectedVariations || {}) === (variationKey || "{}")
            ? { ...item, quantity: item.quantity + quantity }
            : item
        )
      }
      return [...prev, { product, quantity, selectedVariations: variations }]
    })
    setIsCartOpen(true)
  }, [])

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((item) => item.product.id !== productId))
  }, [])

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((item) => item.product.id !== productId))
      return
    }
    setItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    )
  }, [])

  const clearCart = useCallback(() => {
    setItems([])
    setGiftState(DEFAULT_GIFT)
  }, [])

  const setGift = useCallback((updater: Partial<GiftPersonalization>) => {
    setGiftState((prev) => ({ ...prev, ...updater }))
  }, [])

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalPrice = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0)

  // Bounced-cart tracker. A cart is "bounced" when the customer added items
  // but never reached the checkout page (closed tab / navigated away). On
  // cart changes we upsert a cart-level record; on tab close we flush a final
  // snapshot via sendBeacon so the data lands even when the tab is killed.
  // When the customer reaches /checkout, checkout-page.tsx overwrites the
  // reason to `checkout_abandoned` / `payment_failed` / etc.
  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return
    if (items.length === 0) return
    // Treat non-checkout routes as "cart only" — if they've landed on
    // /checkout, that page's own tracker owns the state.
    if (window.location.pathname.startsWith("/checkout")) return
    const sid = sessionStorage.getItem("kf_sid")
    if (!sid) return
    const payload = {
      sessionId: sid,
      items: items.map(i => ({ name: i.product.name, qty: i.quantity, price: i.product.price })),
      subtotal: totalPrice,
      stepReached: "cart",
      reason: "closed_with_items",
    }
    const t = setTimeout(() => {
      fetch("/api/track-abandoned", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => {})
    }, 1500)
    return () => clearTimeout(t)
  }, [items, totalPrice, hydrated])

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return
    const flushOnExit = () => {
      if (items.length === 0) return
      if (window.location.pathname.startsWith("/checkout")) return
      const sid = sessionStorage.getItem("kf_sid")
      if (!sid) return
      const body = JSON.stringify({
        sessionId: sid,
        items: items.map(i => ({ name: i.product.name, qty: i.quantity, price: i.product.price })),
        subtotal: totalPrice,
        stepReached: "cart",
        reason: "closed_with_items",
      })
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/track-abandoned", new Blob([body], { type: "application/json" }))
      } else {
        fetch("/api/track-abandoned", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {})
      }
    }
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flushOnExit()
    }
    window.addEventListener("beforeunload", flushOnExit)
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      window.removeEventListener("beforeunload", flushOnExit)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [items, totalPrice, hydrated])

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
        isCartOpen,
        setIsCartOpen,
        gift,
        setGift,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}
