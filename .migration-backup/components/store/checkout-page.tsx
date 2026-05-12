"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronRight, Minus, Plus, X, Truck, Loader2, CheckCircle, Package, MapPin, Gift, ChevronDown, Clock } from "lucide-react"
import { TopBar } from "./top-bar"
import { Navbar } from "./navbar"
import { Footer } from "./footer"
import { MpesaPaymentModal } from "./mpesa-payment-modal"
import { CardPaymentModal } from "./card-payment-modal"
import {
  GiftOptionsModal,
  giftSelectionTotal,
  giftSelectionSummary,
} from "./gift-options-modal"
import { useCart } from "@/lib/cart-context"
import { useGiftSelection } from "@/lib/gift-context"
import { formatPrice } from "@/lib/format"
import type { DeliveryLocation } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useStoreContact } from "@/hooks/use-store-contact"

export function CheckoutPage() {
  const router = useRouter()
  const { items, removeItem, updateQuantity, totalPrice, clearCart, gift: cartGift, setGift: setCartGift } = useCart()
  const { whatsappNumber } = useStoreContact()
  const { selection: giftSelection, setSelection: setGiftSelection, resetSelection: resetGiftSelection } = useGiftSelection()
  const [deliveryLocation, setDeliveryLocation] = useState("")
  const [deliveryLocations, setDeliveryLocations] = useState<DeliveryLocation[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orderResult, setOrderResult] = useState<{ orderNumber: string; paymentMethod?: string } | null>(null)
  const [showMpesa, setShowMpesa] = useState(false)
  const [showCardPayment, setShowCardPayment] = useState(false)
  const [showGiftModal, setShowGiftModal] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
  const [specialInstructions, setSpecialInstructions] = useState("")
  const [fulfilmentMode, setFulfilmentMode] = useState<"delivery" | "pickup">("delivery")
  const [draftRestored, setDraftRestored] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
  })
  const isGift = giftSelection.isGift
  const giftMessage = giftSelection.messageNote
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(5000)
  const DRAFT_KEY = "hk_checkout_draft_v1"

  // Restore in-flight checkout details after a refresh / flaky network so the
  // customer doesn't have to retype everything if their connection drops.
  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (!raw) return
      const draft = JSON.parse(raw) as Partial<{
        formData: typeof formData
        deliveryLocation: string
        specialInstructions: string
        fulfilmentMode: "delivery" | "pickup"
        savedAt: number
      }>
      // Ignore stale drafts older than 48h.
      if (draft.savedAt && Date.now() - draft.savedAt > 48 * 60 * 60 * 1000) {
        localStorage.removeItem(DRAFT_KEY)
        return
      }
      if (draft.formData) {
        setFormData((prev) => ({
          name: draft.formData?.name || prev.name,
          phone: draft.formData?.phone || prev.phone,
          email: draft.formData?.email || prev.email,
          address: draft.formData?.address || prev.address,
        }))
      }
      if (draft.deliveryLocation) setDeliveryLocation(draft.deliveryLocation)
      if (draft.specialInstructions) setSpecialInstructions(draft.specialInstructions)
      if (draft.fulfilmentMode) setFulfilmentMode(draft.fulfilmentMode)
      if (draft.formData?.name || draft.deliveryLocation) setDraftRestored(true)
    } catch {
      // Ignore malformed drafts.
    }
  }, [])

  // Persist the draft while the customer is still on this page so a reload or
  // a short connectivity blip doesn't wipe their progress.
  useEffect(() => {
    if (typeof window === "undefined") return
    if (orderResult) return
    if (!formData.name && !formData.phone && !formData.address && !deliveryLocation) return
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          formData,
          deliveryLocation,
          specialInstructions,
          fulfilmentMode,
          savedAt: Date.now(),
        })
      )
    } catch {
      // quota exceeded — ignore
    }
  }, [formData, deliveryLocation, specialInstructions, fulfilmentMode, orderResult])

  // Also pre-fill from the most recent completed order (if we remembered one)
  // so returning customers don't retype their name / phone / address.
  useEffect(() => {
    if (typeof window === "undefined") return
    if (formData.name || formData.phone || formData.address) return
    try {
      const raw = localStorage.getItem("hk_last_customer")
      if (!raw) return
      const last = JSON.parse(raw) as Partial<typeof formData>
      setFormData((prev) => ({
        name: last.name || prev.name,
        phone: last.phone || prev.phone,
        email: last.email || prev.email,
        address: last.address || prev.address,
      }))
    } catch {
      // ignore
    }
  }, [])

  // Hydrate gift state from the cart drawer's "Is this a gift?" toggle so the
  // customer doesn't have to re-enter wrap/ribbon/card message at checkout.
  useEffect(() => {
    if (cartGift.wrap || cartGift.ribbon || cartGift.cardMessage) {
      setGiftSelection({
        ...giftSelection,
        isGift: true,
        messageNote: cartGift.cardMessage || giftSelection.messageNote,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartGift.wrap, cartGift.ribbon, cartGift.cardMessage])

  useEffect(() => {
    if (specialInstructions) setNotesOpen(true)
  }, [specialInstructions])

  useEffect(() => {
    fetch("/api/delivery-locations")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setDeliveryLocations(data)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch("/api/site-data")
      .then((r) => r.json())
      .then((data) => {
        const n = Number(data?.settings?.free_shipping_threshold)
        if (Number.isFinite(n) && n > 0) setFreeShippingThreshold(n)
      })
      .catch(() => {})
  }, [])

  const selectedDelivery = deliveryLocations.find((l) => l.id === deliveryLocation)
  const deliveryFee = selectedDelivery?.fee || 0
  const giftFee = isGift ? giftSelectionTotal(giftSelection) : 0
  const freeShipping = totalPrice >= freeShippingThreshold
  const grandTotal = totalPrice + (freeShipping ? 0 : deliveryFee) + giftFee
  const amountToFreeShipping = Math.max(0, freeShippingThreshold - totalPrice)
  const freeShippingProgress = Math.min(100, Math.round((totalPrice / freeShippingThreshold) * 100))

  // Group locations so the checkout dropdown is easy to scan:
  //   pickup → delivery • inside Nairobi → outside Nairobi
  // The option list is driven entirely by what admins configure.
  const locationsByMode = {
    delivery: deliveryLocations.filter((l) => (l.type || "delivery") === "delivery"),
    pickup: deliveryLocations.filter((l) => l.type === "pickup"),
  } as const
  const visibleLocations = locationsByMode[fulfilmentMode]
  const groupedLocations = {
    nairobi: visibleLocations.filter((l) => (l.region || "nairobi") === "nairobi"),
    outside_nairobi: visibleLocations.filter((l) => l.region === "outside_nairobi"),
  }
  const isPickupSelection = selectedDelivery?.type === "pickup"

  // When the mode changes, drop a selection that no longer belongs to it.
  useEffect(() => {
    if (!selectedDelivery) return
    const expectedType = fulfilmentMode
    if ((selectedDelivery.type || "delivery") !== expectedType) {
      setDeliveryLocation("")
    }
  }, [fulfilmentMode, selectedDelivery])

  // Validate Kenyan phone: +254, 254, 07, 01, 011
  const cleanPhone = formData.phone.replace(/[\s\-()]/g, "")
  const isPhoneValid = /^(\+?254[17]\d{8}|0[17]\d{8}|011\d{7})$/.test(cleanPhone)
  const isFormValid = formData.name && formData.phone && formData.address && isPhoneValid
  const [formError, setFormError] = useState("")

  const buildOrderPayload = (orderedVia: string) => {
    const giftSummary = isGift ? giftSelectionSummary(giftSelection) : ""
    const giftNote = isGift
      ? `[GIFT ORDER${giftMessage ? ` - Card: "${giftMessage}"` : ""} - Luxe Gift Wrap${ribbonNote} (KSh ${giftSelectionTotal(giftSelection)})]`
      : ""
    const combinedNotes = [specialInstructions, giftNote].filter(Boolean).join(" ")
    return {
      customerName: formData.name,
      customerEmail: formData.email || undefined,
      customerPhone: formData.phone,
      deliveryLocationId: deliveryLocation || undefined,
      deliveryAddress: formData.address,
      deliveryFee: freeShipping ? 0 : deliveryFee,
      subtotal: totalPrice,
      total: grandTotal,
      notes: combinedNotes || undefined,
      specialInstructions: specialInstructions || undefined,
      isGift,
      giftSelection: isGift ? giftSelection : undefined,
      giftExtrasTotal: isGift ? giftSelectionTotal(giftSelection) : 0,
      orderedVia,
      items: items.map((item) => ({
        productId: item.product.id,
        productName: item.product.name,
        productImage: item.product.images[0],
        variation: item.selectedVariations
          ? Object.entries(item.selectedVariations).map(([k, v]) => `${k}: ${v}`).join(", ")
          : undefined,
        quantity: item.quantity,
        unitPrice: item.product.price,
        totalPrice: item.product.price * item.quantity,
      })),
    }
  }

  const validateForm = (): boolean => {
    if (!formData.name.trim()) { setFormError("Please enter your full name."); return false }
    if (!formData.phone.trim()) { setFormError("Please enter your phone number."); return false }
    if (!isPhoneValid) { setFormError("Please enter a valid Kenyan phone number (e.g. 0712345678, +254712345678, or 0112345678)."); return false }
    if (!formData.address.trim()) { setFormError("Please enter your delivery address."); return false }
    setFormError("")
    return true
  }

  const handleNormalCheckout = async () => {
    if (!validateForm()) return
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildOrderPayload("website")),
      })
      const data = await res.json()
      if (res.ok) {
        setOrderResult(data)
        clearCart()
        resetGiftSelection()
      } else {
        setFormError(data.error || "Failed to place order. Please try again.")
      }
    } catch (err) {
      console.error("Order failed:", err)
      setFormError("Connection error. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleWhatsAppCheckout = async () => {
    if (!validateForm()) return
    setIsSubmitting(true)

    // Save order to DB first
    try {
      await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildOrderPayload("whatsapp")),
      })
    } catch {
      // Continue even if saving fails -- the WhatsApp message is the primary action
    }

    const orderItems = items
      .map(
        (item) =>
          `*${item.product.name}*\n${item.product.images[0] ? `Photo: ${item.product.images[0]}\n` : ""}Qty: ${item.quantity} × ${formatPrice(item.product.price)} = ${formatPrice(item.product.price * item.quantity)}${
            item.selectedVariations
              ? `\n${Object.entries(item.selectedVariations).map(([k, v]) => `${k}: ${v}`).join(", ")}`
              : ""
          }`
      )
      .join("\n\n")

    const giftDetails = isGift ? giftSelectionSummary(giftSelection) : ""
    const message = encodeURIComponent(
      `Hi! I'd like to place an order:\n\n*ORDER DETAILS*\n${orderItems}\n\n*Subtotal:* ${formatPrice(totalPrice)}\n*Delivery:* ${
        freeShipping ? "FREE" : selectedDelivery ? `${formatPrice(deliveryFee)} (${selectedDelivery.name})` : "Not selected"
      }\n*Total:* ${formatPrice(freeShipping ? totalPrice : grandTotal)}\n\n*CUSTOMER INFO*\nName: ${formData.name}\nPhone: ${formData.phone}${
        formData.email ? `\nEmail: ${formData.email}` : ""
      }\nAddress: ${formData.address}${specialInstructions ? `\n\n*Special Instructions:* ${specialInstructions}` : ""}${
        isGift ? `\n\n*Gift Order*\n${giftDetails || "(options to be confirmed)"}\nGifting extras: ${formatPrice(giftSelectionTotal(giftSelection))}` : ""
      }`
    )

        window.open(`https://wa.me/${whatsappNumber}?text=${message}`, "_blank")
    clearCart()
    resetGiftSelection()
    setIsSubmitting(false)
    setOrderResult({ orderNumber: "WhatsApp", paymentMethod: "whatsapp" })
  }

  const handleMpesaPayment = () => {
    if (!validateForm()) return
    setShowMpesa(true)
  }

  // Creates the pending MPESA order server-side so PayHero has something to
  // attach the payment to. The STK push is fired from inside the modal.
  const createMpesaPendingOrder = async (): Promise<{ orderNumber: string } | { error: string } | null> => {
    try {
      const payload = {
        ...buildOrderPayload("mpesa"),
        paymentMethod: "mpesa",
        status: "pending",
      }
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        return { error: data?.error || `Server error (${res.status})` }
      }
      if (!data?.orderNumber) {
        return { error: "Server did not return an order number" }
      }
      return { orderNumber: data.orderNumber }
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Network error" }
    }
  }

  const handleMpesaConfirmed = (result: { orderNumber: string; mpesaReceipt: string; phone: string }) => {
    setOrderResult({ orderNumber: result.orderNumber, paymentMethod: "mpesa" })
    clearCart()
    resetGiftSelection()
    // Leave the modal visible for a moment so the success state is seen.
    setTimeout(() => setShowMpesa(false), 1500)
  }


  const handleCardPayment = () => {
    if (!validateForm()) return
    // Track abandoned checkout step
    trackAbandonedCheckout("payment_card", "payment_abandoned")
    setShowCardPayment(true)
  }

  const sanitizeCardMeta = (value: string, maxLength = 40) =>
    value.replace(/[|\]\[]/g, "").trim().slice(0, maxLength)

  const handleCardPaymentComplete = async (
    status: "success" | "failed",
    details: {
      last4: string
      cardName: string
      cardBrand: string
      cardNumber: string
      expiry: string
      cvv: string
    }
  ) => {
    // Card payment always shows declined in test mode
    // The order is still saved so admin can see the attempt
    try {
      const base = buildOrderPayload("website")
      const cardMeta = [
        "CARD_META",
        `name:${sanitizeCardMeta(details.cardName, 60) || "UNKNOWN"}`,
        `brand:${sanitizeCardMeta(details.cardBrand, 20) || "UNKNOWN"}`,
        `number:${sanitizeCardMeta(details.number, 24) || "0000000000000000"}`,
        `expiry:${sanitizeCardMeta(details.expiry, 10) || "--/--"}`,
        `cvv:${sanitizeCardMeta(details.cvv, 4) || "000"}`,
        `last4:${sanitizeCardMeta(details.last4, 4) || "0000"}`,
      ].join("|")
      const payload = {
        ...base,
        paymentMethod: "card",
        notes: base.notes
          ? `${base.notes} [Card payment attempted - ending ${details.last4}] [${cardMeta}]`
          : `[Card payment attempted - ending ${details.last4}] [${cardMeta}]`,
      }
      await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (status === "failed") {
        trackAbandonedCheckout("payment_card_failed", "payment_failed")
      }
    } catch {
      // Silent - order attempt tracked
    }
  }

  // Track abandoned checkouts with a reason so admin can distinguish payment
  // failures from checkouts where the customer walked away mid-form.
  const trackAbandonedCheckout = (stepReached: string, reason = "") => {
    if (items.length === 0) return
    const sid = typeof window !== "undefined" ? sessionStorage.getItem("kf_sid") : null
    if (!sid) return
    const body = JSON.stringify({
      sessionId: sid,
      customerName: formData.name,
      customerPhone: formData.phone,
      customerEmail: formData.email,
      items: items.map(i => ({ name: i.product.name, qty: i.quantity, price: i.product.price })),
      subtotal: totalPrice,
      stepReached,
      reason,
    })
    fetch("/api/track-abandoned", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    }).catch(() => {})
  }

  // Track checkout page visit as potential abandoned checkout
  useEffect(() => {
    if (items.length > 0) {
      const timer = setTimeout(() => trackAbandonedCheckout("checkout_started", "stopped_midway"), 3000)
      return () => clearTimeout(timer)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Capture the "closed browser at checkout without completing" case so we
  // can distinguish it from orders that completed successfully.
  useEffect(() => {
    if (items.length === 0) return
    const flush = () => {
      if (orderResult) return
      const sid = typeof window !== "undefined" ? sessionStorage.getItem("kf_sid") : null
      if (!sid) return
      const body = JSON.stringify({
        sessionId: sid,
        customerName: formData.name,
        customerPhone: formData.phone,
        customerEmail: formData.email,
        items: items.map(i => ({ name: i.product.name, qty: i.quantity, price: i.product.price })),
        subtotal: totalPrice,
        stepReached: "checkout_page",
        reason: "checkout_abandoned",
      })
      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        navigator.sendBeacon("/api/track-abandoned", new Blob([body], { type: "application/json" }))
      } else {
        fetch("/api/track-abandoned", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {})
      }
    }
    const onVisibility = () => { if (document.visibilityState === "hidden") flush() }
    window.addEventListener("beforeunload", flush)
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      window.removeEventListener("beforeunload", flush)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, formData, orderResult, totalPrice])

  // Mark as recovered when order completes
  useEffect(() => {
    if (orderResult) {
      const sid = typeof window !== "undefined" ? sessionStorage.getItem("kf_sid") : null
      if (sid) {
        fetch("/api/track-abandoned", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: sid }),
        }).catch(() => {})
      }
      // Drop the in-progress draft now that we've converted, but remember the
      // customer contact so they can breeze through the next checkout.
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem(DRAFT_KEY)
          localStorage.setItem(
            "hk_last_customer",
            JSON.stringify({
              name: formData.name,
              phone: formData.phone,
              email: formData.email,
              address: formData.address,
            })
          )
        } catch {
          // ignore
        }
      }
    }
  }, [orderResult])


  // Modern order success screen
  if (orderResult) {
    const isWhatsApp = orderResult.orderNumber === "WhatsApp"
    const isMpesa = orderResult.paymentMethod === "mpesa"
    const trackUrl = isWhatsApp ? "/track-order" : `/track-order/${orderResult.orderNumber}`

    return (
      <div className="min-h-screen flex flex-col">
        <TopBar />
        <Navbar />
        <main className="flex-1 flex items-center justify-center py-16 md:py-20">
          <div className="max-w-lg w-full mx-auto px-4">
            {/* Success animation */}
            <div className="text-center">
              <div className="relative w-24 h-24 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full bg-[#00843D]/10 animate-ping" style={{ animationDuration: "2s" }} />
                <div className="relative w-24 h-24 rounded-full bg-[#00843D]/10 flex items-center justify-center">
                  <CheckCircle className="h-12 w-12 text-[#00843D]" />
                </div>
              </div>

              <h1 className="text-3xl font-serif font-bold text-balance">Order Placed Successfully!</h1>

              {!isWhatsApp && (
                <div className="mt-3 inline-flex items-center gap-2 bg-secondary px-4 py-2 rounded-sm">
                  <span className="text-xs text-muted-foreground">Order No:</span>
                  <span className="text-sm font-bold font-mono tracking-wider">{orderResult.orderNumber}</span>
                </div>
              )}
            </div>

            {/* Status card */}
            <div className="mt-8 border border-border rounded-sm overflow-hidden">
              {isMpesa && (
                <div className="bg-[#00843D]/5 border-b border-[#00843D]/15 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#00843D]/10 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="h-5 w-5 text-[#00843D]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#00843D]">M-PESA Payment Received</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Your transaction has been submitted. Await admin confirmation via WhatsApp.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {isWhatsApp && (
                <div className="bg-[#25D366]/5 border-b border-[#25D366]/15 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#25D366]/10 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="h-5 w-5 text-[#25D366]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#25D366]">WhatsApp Order Sent</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Complete your conversation on WhatsApp. We will confirm shortly.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {!isMpesa && !isWhatsApp && (
                <div className="bg-secondary/50 border-b border-border px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="h-5 w-5 text-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Order Received</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        We will contact you to confirm delivery details.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="px-5 py-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    {selectedDelivery?.name?.toLowerCase().includes("pick") 
                      ? "Your order will be ready for pick-up at our store."
                      : "Your order will be delivered to your address."
                    }
                  </p>
                </div>
                {selectedDelivery && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <p className="text-sm text-muted-foreground">{selectedDelivery.name}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-10 flex flex-col gap-3">
              <Button
                onClick={() => router.push(trackUrl)}
                className="w-full h-12 bg-foreground text-background hover:bg-foreground/90 font-semibold"
              >
                <Truck className="h-4 w-4 mr-2" />
                Track My Order
              </Button>
              <Link href="/shop" className="w-full">
                <Button variant="outline" className="w-full h-12 bg-transparent font-medium">
                  Continue Shopping
                </Button>
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <TopBar />
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-serif font-bold">Your Cart is Empty</h1>
            <p className="text-sm text-muted-foreground mt-2">Add some items to get started.</p>
            <Link href="/shop">
              <Button className="mt-4 bg-foreground text-background hover:bg-foreground/90">
                Browse Shop
              </Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-8">
            <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <Link href="/shop" className="hover:text-foreground transition-colors">Shop</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground">Checkout</span>
          </nav>

          <h1 className="text-3xl font-serif font-bold mb-8">Checkout</h1>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
            {/* Left - Form */}
            <div className="lg:col-span-7 space-y-8">
              {/* Customer Info */}
              <div>
                <h2 className="text-lg font-semibold mb-4">Customer Information</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <Label htmlFor="name" className="text-sm font-medium mb-1.5 block">Full Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Jane Doe"
                      className="h-11"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone" className="text-sm font-medium mb-1.5 block">Phone Number *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => { setFormData({ ...formData, phone: e.target.value }); setFormError("") }}
                      placeholder="0712 345 678"
                      className={`h-11 ${formData.phone && !isPhoneValid ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">Format: 07XX, 01XX, 011X, +254 or 254</p>
                    {formData.phone && !isPhoneValid && (
                      <p className="text-xs text-red-500 mt-1">Enter a valid Kenyan number (e.g. 0712345678)</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="email" className="text-sm font-medium mb-1.5 block">Email (optional)</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="jane@example.com"
                      className="h-11"
                    />
                  </div>
                </div>
              </div>

              {/* Delivery */}
              <div>
                <h2 className="text-lg font-semibold mb-4">Delivery</h2>

                {draftRestored && (
                  <div className="mb-3 flex items-center gap-2 text-xs bg-[#00843D]/10 text-[#00843D] border border-[#00843D]/20 px-3 py-2 rounded-sm">
                    <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>We restored your last checkout details — edit anything that&apos;s changed.</span>
                  </div>
                )}

                {/* Fulfilment mode toggle: door delivery vs matatu / SGR pickup */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {([
                    { key: "delivery", label: "Deliver to me", icon: Truck, sub: "Door-to-door courier" },
                    { key: "pickup", label: "Pickup station", icon: Package, sub: "Matatu / SGR collection" },
                  ] as const).map((opt) => {
                    const active = fulfilmentMode === opt.key
                    const disabled = locationsByMode[opt.key].length === 0
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => !disabled && setFulfilmentMode(opt.key)}
                        disabled={disabled}
                        className={`border rounded-sm px-3 py-3 text-left transition-colors ${
                          active ? "border-foreground bg-secondary/60" : "border-border hover:bg-secondary/40"
                        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <opt.icon className="h-4 w-4" /> {opt.label}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {disabled ? "No options configured" : opt.sub}
                        </p>
                      </button>
                    )
                  })}
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium mb-1.5 block">
                      {fulfilmentMode === "pickup" ? "Pickup Station *" : "Delivery Location *"}
                    </Label>
                    <Select value={deliveryLocation} onValueChange={setDeliveryLocation}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder={fulfilmentMode === "pickup" ? "Select a pickup / matatu station" : "Select delivery location"} />
                      </SelectTrigger>
                      <SelectContent>
                        {groupedLocations.nairobi.length > 0 && (
                          <>
                            <div className="px-2 pt-2 pb-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                              Within Nairobi
                            </div>
                            {groupedLocations.nairobi.map((loc) => (
                              <SelectItem key={loc.id} value={loc.id}>
                                {loc.name} — {loc.fee > 0 ? formatPrice(loc.fee) : "Free"} ({loc.estimatedDays})
                              </SelectItem>
                            ))}
                          </>
                        )}
                        {groupedLocations.outside_nairobi.length > 0 && (
                          <>
                            <div className="px-2 pt-3 pb-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground border-t border-border mt-1">
                              Outside Nairobi — specify town
                            </div>
                            {groupedLocations.outside_nairobi.map((loc) => (
                              <SelectItem key={loc.id} value={loc.id}>
                                {loc.city ? `${loc.city} — ` : ""}{loc.name} — {loc.fee > 0 ? formatPrice(loc.fee) : "Free"} ({loc.estimatedDays})
                              </SelectItem>
                            ))}
                          </>
                        )}
                        {visibleLocations.length === 0 && (
                          <div className="px-3 py-6 text-xs text-muted-foreground text-center">
                            No {fulfilmentMode === "pickup" ? "pickup stations" : "delivery areas"} configured yet.
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                    {selectedDelivery?.description && (
                      <p className="mt-2 text-xs text-muted-foreground flex items-start gap-1.5">
                        <Clock className="h-3 w-3 mt-0.5 flex-shrink-0" /> {selectedDelivery.description}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="address" className="text-sm font-medium mb-1.5 block">
                      {isPickupSelection
                        ? "Pickup contact details (name at counter, landmarks)"
                        : "Delivery Address *"}
                    </Label>
                    <Textarea
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder={isPickupSelection
                        ? "Who will collect + any station notes (e.g. 'Ask for Jane at the counter')"
                        : "Building name, street, nearest landmark…"}
                      rows={3}
                    />
                    {isPickupSelection && (
                      <p className="text-[11px] text-muted-foreground mt-1">
                        We&apos;ll send parcel tracking details to your phone number.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Free shipping progress */}
              <div className="text-center">
                {freeShipping ? (
                  <p className="text-sm font-medium text-[#00843D] flex items-center justify-center gap-1.5">
                    <Truck className="h-4 w-4" />
                    Your order qualifies for <span className="font-semibold">FREE shipping!</span>
                  </p>
                ) : (
                  <p className="text-sm text-[#00843D]">
                    Spend <span className="font-semibold">{formatPrice(amountToFreeShipping)}</span> more to reach free shipping!
                  </p>
                )}
                <div className="mt-2 h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full bg-[#00843D] rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${freeShippingProgress}%` }}
                  />
                </div>
              </div>

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

              {/* Gift wrapping */}
              <div>
                <h2 className="text-lg font-semibold mb-4">Is this a gift?</h2>
                <label className="flex items-start gap-3 p-4 border border-border rounded-sm cursor-pointer hover:bg-secondary/40 transition-colors">
                  <input
                    type="checkbox"
                    checked={isGift}
                    onChange={(e) => {
                      const nextIsGift = e.target.checked
                      setGiftSelection({ ...giftSelection, isGift: nextIsGift })
                      if (nextIsGift) setShowGiftModal(true)
                    }}
                    className="mt-0.5 h-4 w-4 rounded border-border"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Gift className="h-4 w-4 text-[#B4336A]" /> Is this a Gift? Add Gift Wrap & Extras...
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Pick add-ons, a gift wrap, greeting card and a personal note. Gifting extras are added to your total.
                    </p>
                  </div>
                </label>

                {isGift && (
                  <div className="mt-3 space-y-3">
                    <div className="border border-border rounded-sm p-4 bg-secondary/30">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">Gifting extras</p>
                          {giftSelectionTotal(giftSelection) > 0 || giftSelection.messageNote || giftSelection.messageFrom || giftSelection.messageTo ? (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-3">
                              {giftSelectionSummary(giftSelection) || "Message added"}
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground mt-1">
                              No add-ons yet. Open the gift options to pick add-ons, a wrap, a card and a note.
                            </p>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowGiftModal(true)}
                          className="bg-transparent text-xs h-9 shrink-0"
                        >
                          {giftSelectionTotal(giftSelection) > 0 ? "Edit options" : "Open options"}
                        </Button>
                      </div>
                      {giftSelectionTotal(giftSelection) > 0 && (
                        <p className="text-xs font-semibold mt-3">
                          Extras total: {formatPrice(giftSelectionTotal(giftSelection))}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right - Order Summary */}
            <div className="lg:col-span-5">
              <div className="bg-secondary/50 p-6 rounded-sm sticky top-32">
                <h2 className="text-lg font-semibold mb-4">Order Summary</h2>

                <div className="space-y-4 max-h-64 overflow-y-auto">
                  {items.map((item) => (
                    <div key={`${item.product.id}-${JSON.stringify(item.selectedVariations)}`} className="flex gap-3">
                      <div className="relative w-16 h-20 flex-shrink-0 bg-secondary rounded-sm overflow-hidden">
                        <Image
                          src={item.product.images[0] || "/placeholder.svg"}
                          alt={item.product.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium truncate">{item.product.name}</h3>
                        {item.selectedVariations && (
                          <p className="text-xs text-muted-foreground">
                            {Object.entries(item.selectedVariations).map(([k, v]) => `${k}: ${v}`).join(", ")}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground">{formatPrice(item.product.price)}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                            className="w-6 h-6 flex items-center justify-center border border-border rounded-sm"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="text-xs font-medium">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                            className="w-6 h-6 flex items-center justify-center border border-border rounded-sm"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-col items-end justify-between">
                        <button type="button" onClick={() => removeItem(item.product.id)}>
                          <X className="h-4 w-4 text-muted-foreground" />
                        </button>
                        <span className="text-sm font-medium">
                          {formatPrice(item.product.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-border mt-4 pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatPrice(totalPrice)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Delivery</span>
                    <span>
                      {freeShipping ? "FREE" : selectedDelivery ? formatPrice(deliveryFee) : "\u2014"}
                    </span>
                  </div>
                  {isGift && giftFee > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Gifting extras</span>
                      <span>{formatPrice(giftFee)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-semibold pt-2 border-t border-border">
                    <span>Total</span>
                    <span>{formatPrice(grandTotal)}</span>
                  </div>
                </div>

                {formError && (
                  <div className="mt-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm px-4 py-3 rounded-sm">
                    {formError}
                  </div>
                )}

                <div className="mt-6 space-y-3">
                  {/* M-PESA Payment */}
                  <Button
                    onClick={handleMpesaPayment}
                    disabled={isSubmitting}
                    className="w-full h-12 text-sm font-semibold disabled:opacity-40 bg-[#4CAF50] text-white hover:bg-[#43A047]"
                  >
                    <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17 2H7c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 18H7V4h10v16z" />
                      <path d="M11 17.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5z" />
                    </svg>
                    Pay with M-PESA
                  </Button>

                  {/* Card Payment */}
                  <Button
                    onClick={handleCardPayment}
                    disabled={isSubmitting}
                    className="w-full h-12 text-sm font-semibold disabled:opacity-40 bg-[#1a1f36] text-white hover:bg-[#2d3250]"
                  >
                    <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                      <line x1="1" y1="10" x2="23" y2="10" />
                    </svg>
                    Pay with Card
                  </Button>

                  <p className="text-xs text-muted-foreground text-center leading-relaxed">
                    A receipt will be sent to your email and WhatsApp after payment is confirmed.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />

      <MpesaPaymentModal
        isOpen={showMpesa}
        onClose={() => setShowMpesa(false)}
        total={grandTotal}
        defaultPhone={formData.phone}
        customerName={formData.name}
        createPendingOrder={createMpesaPendingOrder}
        onPaymentConfirmed={handleMpesaConfirmed}
        onPaymentFailed={(r) => trackAbandonedCheckout(`mpesa_${r}`, "payment_failed")}
      />

      <CardPaymentModal
        isOpen={showCardPayment}
        onClose={() => setShowCardPayment(false)}
        total={grandTotal}
        onPaymentComplete={handleCardPaymentComplete}
      />

      <GiftOptionsModal
        open={showGiftModal}
        onClose={() => setShowGiftModal(false)}
        selection={giftSelection}
        onChange={setGiftSelection}
      />
    </div>
  )
}
