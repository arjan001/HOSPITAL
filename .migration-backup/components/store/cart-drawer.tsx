"use client"

import { useState } from "react"
import Link from "next/link"
import { X, Minus, Plus, ShoppingBag, Truck, ChevronDown } from "lucide-react"
import { useCart } from "@/lib/cart-context"
import { formatPrice } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { ProductImage } from "./product-image"

const FREE_SHIPPING_THRESHOLD = 7000

export function CartDrawer() {
  const { items, removeItem, updateQuantity, totalPrice, isCartOpen, setIsCartOpen } = useCart()
  const [notesOpen, setNotesOpen] = useState(false)
  const [specialInstructions, setSpecialInstructions] = useState("")
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - totalPrice)
  const reachedFreeShipping = totalPrice >= FREE_SHIPPING_THRESHOLD
  const progressPct = Math.min(100, Math.round((totalPrice / FREE_SHIPPING_THRESHOLD) * 100))

  return (
    <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
      <SheetContent className="w-full sm:max-w-md bg-background text-foreground p-0 flex flex-col">
        <VisuallyHidden><SheetTitle>Shopping Cart</SheetTitle></VisuallyHidden>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-serif font-semibold">Your Cart</h2>
          <button type="button" onClick={() => setIsCartOpen(false)}>
            <X className="h-5 w-5" />
            <span className="sr-only">Close cart</span>
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
            <ShoppingBag className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">Your cart is empty</p>
            <Button
              onClick={() => setIsCartOpen(false)}
              className="bg-foreground text-background hover:bg-foreground/90"
            >
              Continue Shopping
            </Button>
          </div>
        ) : (
          <>
            {/* Free shipping progress */}
            <div className="px-5 pt-4 pb-1 text-center">
              {reachedFreeShipping ? (
                <p className="text-sm font-medium text-[#00843D] flex items-center justify-center gap-1.5">
                  <Truck className="h-4 w-4" />
                  You qualify for <span className="font-semibold">FREE shipping!</span>
                </p>
              ) : (
                <p className="text-sm text-[#00843D]">
                  Spend <span className="font-semibold">{formatPrice(remaining)}</span> more to reach free shipping!
                </p>
              )}
              <div className="mt-2 h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full bg-[#00843D] rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {items.map((item) => (
                <div key={item.product.id} className="flex gap-4">
                  <div className="relative w-20 h-24 flex-shrink-0 bg-secondary rounded-sm overflow-hidden">
                    <ProductImage
                      src={item.product.images[0] || "/placeholder.svg"}
                      alt={item.product.name}
                      fill
                      loaderSize="sm"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium truncate">{item.product.name}</h3>
                    <p className="text-sm font-semibold mt-1">{formatPrice(item.product.price)}</p>
                    {item.selectedVariations &&
                      Object.entries(item.selectedVariations).map(([key, val]) => (
                        <p key={key} className="text-xs text-muted-foreground mt-0.5">
                          {key}: {val}
                        </p>
                      ))}
                    <div className="flex items-center gap-3 mt-2">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="w-7 h-7 flex items-center justify-center border border-border rounded-sm"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="text-sm font-medium">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className="w-7 h-7 flex items-center justify-center border border-border rounded-sm"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.product.id)}
                    className="self-start p-1"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                    <span className="sr-only">Remove item</span>
                  </button>
                </div>
              ))}

              {/* Special order instructions */}
              <div className="border border-border rounded-sm bg-secondary/40">
                <button
                  type="button"
                  onClick={() => setNotesOpen((v) => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left"
                  aria-expanded={notesOpen}
                >
                  <span className="text-sm font-medium">Add Special Order Instructions</span>
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${notesOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {notesOpen && (
                  <div className="px-4 pb-4">
                    <Textarea
                      value={specialInstructions}
                      onChange={(e) => setSpecialInstructions(e.target.value)}
                      placeholder="Order special instructions"
                      rows={4}
                      className="bg-background resize-none"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-border p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Subtotal</span>
                <span className="font-semibold">{formatPrice(totalPrice)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Shipping calculated at checkout
              </p>
              <div className="flex flex-col gap-2">
                <Link href="/checkout" onClick={() => setIsCartOpen(false)}>
                  <Button className="w-full bg-foreground text-background hover:bg-foreground/90 h-12 text-sm font-medium">
                    Checkout
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  className="w-full h-12 text-sm font-medium bg-transparent"
                  onClick={() => setIsCartOpen(false)}
                >
                  Continue Shopping
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
