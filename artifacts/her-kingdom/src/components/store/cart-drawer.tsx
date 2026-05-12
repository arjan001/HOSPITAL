"use client"

import { Link } from "wouter"
import { X, Minus, Plus, ShoppingBag, Truck, ArrowRight } from "lucide-react"
import { useCart } from "@/lib/cart-context"
import { formatPrice } from "@/lib/format"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { ProductImage } from "./product-image"

const FREE_SHIPPING_THRESHOLD = 7000

/* ── Brand tokens ── */
const WINE        = "#3D0814"
const WINE_CARD   = "#7A2535"
const CREAM       = "#FFFBF5"
const PEACH_LIGHT = "#FAE0BE"
const PEACH_MED   = "#F2DCC8"
const ORANGE      = "#F97316"

export function CartDrawer() {
  const { items, removeItem, updateQuantity, totalPrice, isCartOpen, setIsCartOpen } = useCart()
  const remaining   = Math.max(0, FREE_SHIPPING_THRESHOLD - totalPrice)
  const reached     = totalPrice >= FREE_SHIPPING_THRESHOLD
  const progressPct = Math.min(100, Math.round((totalPrice / FREE_SHIPPING_THRESHOLD) * 100))

  return (
    <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
      <SheetContent
        className="w-full sm:max-w-md p-0 flex flex-col border-0"
        style={{ background: CREAM }}
      >
        <VisuallyHidden><SheetTitle>Shopping Cart</SheetTitle></VisuallyHidden>

        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: `1.5px solid ${PEACH_MED}` }}
        >
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" style={{ color: WINE }} />
            <h2 className="text-base font-bold" style={{ color: WINE }}>My Cart</h2>
            {items.length > 0 && (
              <span
                className="w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center text-white"
                style={{ background: WINE_CARD }}
              >
                {items.reduce((s, i) => s + i.quantity, 0)}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setIsCartOpen(false)}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-[#F2DCC8]"
          >
            <X className="h-4 w-4" style={{ color: WINE }} />
            <span className="sr-only">Close cart</span>
          </button>
        </div>

        {/* Empty state */}
        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-5 p-8">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: PEACH_LIGHT }}
            >
              <ShoppingBag className="h-9 w-9" style={{ color: WINE_CARD }} />
            </div>
            <div className="text-center">
              <p className="font-bold" style={{ color: WINE }}>Your cart is empty</p>
              <p className="text-sm mt-1" style={{ color: "#6b7280" }}>Add some medicines to get started</p>
            </div>
            <button
              onClick={() => setIsCartOpen(false)}
              className="px-6 py-2.5 rounded-full text-sm font-bold text-white transition-opacity hover:opacity-85"
              style={{ background: WINE_CARD }}
            >
              Browse Shop
            </button>
          </div>
        ) : (
          <>
            {/* Free shipping progress */}
            <div className="px-5 pt-4 pb-3" style={{ borderBottom: `1px solid ${PEACH_MED}` }}>
              {reached ? (
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 flex-shrink-0" style={{ color: WINE_CARD }} />
                  <p className="text-sm font-semibold" style={{ color: WINE_CARD }}>
                    You qualify for <span style={{ color: WINE }}>FREE shipping!</span>
                  </p>
                </div>
              ) : (
                <p className="text-sm" style={{ color: "#6b7280" }}>
                  Add <span className="font-bold" style={{ color: WINE }}>{formatPrice(remaining)}</span> more for free shipping
                </p>
              )}
              <div
                className="mt-2 h-1.5 w-full rounded-full overflow-hidden"
                style={{ background: PEACH_MED }}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%`, background: `linear-gradient(90deg, ${ORANGE}, ${WINE_CARD})` }}
                />
              </div>
            </div>

            {/* Items list */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {items.map((item) => (
                <div
                  key={item.product.id}
                  className="flex gap-3 p-3 rounded-2xl"
                  style={{ background: PEACH_LIGHT }}
                >
                  {/* Product image */}
                  <div className="relative w-16 h-20 flex-shrink-0 rounded-xl overflow-hidden bg-white">
                    <ProductImage
                      src={item.product.images[0] || "/placeholder.svg"}
                      alt={item.product.name}
                      loaderSize="sm"
                      className="object-cover"
                    />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold leading-tight truncate" style={{ color: WINE }}>{item.product.name}</p>
                    {item.selectedVariations &&
                      Object.entries(item.selectedVariations).map(([key, val]) => (
                        <p key={key} className="text-xs mt-0.5" style={{ color: "#6b7280" }}>{key}: {val}</p>
                      ))
                    }
                    <p className="text-sm font-bold mt-1" style={{ color: WINE_CARD }}>{formatPrice(item.product.price)}</p>

                    {/* Qty controls */}
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
                        style={{ background: "rgba(61,8,20,0.12)", color: WINE }}
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="text-sm font-bold w-5 text-center" style={{ color: WINE }}>{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
                        style={{ background: "rgba(61,8,20,0.12)", color: WINE }}
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {/* Remove */}
                  <div className="flex flex-col items-end justify-between">
                    <button
                      type="button"
                      onClick={() => removeItem(item.product.id)}
                      className="w-6 h-6 rounded-full flex items-center justify-center transition-colors hover:bg-white"
                    >
                      <X className="h-3.5 w-3.5" style={{ color: WINE_CARD }} />
                    </button>
                    <span className="text-sm font-bold" style={{ color: WINE }}>
                      {formatPrice(item.product.price * item.quantity)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer summary + CTA */}
            <div
              className="px-5 py-5 space-y-4"
              style={{ borderTop: `1.5px solid ${PEACH_MED}` }}
            >
              {/* Subtotal row */}
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: "#6b7280" }}>Subtotal ({items.reduce((s, i) => s + i.quantity, 0)} items)</span>
                <span className="font-bold text-base" style={{ color: WINE }}>{formatPrice(totalPrice)}</span>
              </div>
              <p className="text-xs" style={{ color: "#9ca3af" }}>Delivery calculated at checkout</p>

              {/* Checkout button */}
              <Link href="/checkout" onClick={() => setIsCartOpen(false)}>
                <button
                  type="button"
                  className="w-full h-12 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
                  style={{ background: `linear-gradient(135deg, ${WINE_CARD} 0%, ${WINE} 100%)` }}
                >
                  Checkout
                  <ArrowRight className="h-4 w-4" />
                </button>
              </Link>

              {/* Continue shopping */}
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="w-full h-10 rounded-2xl text-sm font-semibold transition-colors"
                style={{ background: PEACH_LIGHT, color: WINE }}
              >
                Continue Shopping
              </button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
