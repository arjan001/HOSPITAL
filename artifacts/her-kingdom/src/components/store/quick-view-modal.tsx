"use client"

import { useEffect, useState } from "react"
import { Link } from "wouter"
import useSWR from "swr"
import { X, Heart, ShoppingBag, Check, Pill, Truck, ShieldCheck, Star, ArrowRight } from "lucide-react"
import { useQuickView } from "@/lib/quick-view-context"
import { useCart } from "@/lib/cart-context"
import { useWishlist } from "@/lib/wishlist-context"
import { safeFetcher } from "@/lib/fetcher"
import { formatPrice } from "@/lib/format"
import { ProductImage } from "./product-image"
import type { Product } from "@/lib/types"

const TEXT_WINE = "#3D0814"
const TEXT_WINE_SOFT = "#6B0F1A"
const ACCENT_ORANGE = "#F97316"
const ACCENT_RED = "#B91C1C"
const BORDER_PEACH = "#F2DCC8"
const BG_CREAM = "#FFFBF5"

export function QuickViewModal() {
  const { openSlug, closeQuickView } = useQuickView()
  const open = openSlug !== null

  // Lock body scroll while modal is open
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeQuickView()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, closeQuickView])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Product quick view"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 animate-rx-fade-in"
        style={{
          background:
            "radial-gradient(circle at 50% 35%, rgba(61,8,20,0.55) 0%, rgba(61,8,20,0.78) 100%)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
        }}
        onClick={closeQuickView}
      />

      {/* Panel */}
      <div
        className="relative z-10 w-full max-w-5xl max-h-[92vh] overflow-hidden rounded-[28px] animate-rx-modal-in"
        style={{
          background: BG_CREAM,
          border: `1px solid ${BORDER_PEACH}`,
          boxShadow:
            "0 50px 100px -30px rgba(61,8,20,0.55), inset 0 1px 0 rgba(255,255,255,0.7)",
        }}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={closeQuickView}
          className="absolute top-4 right-4 z-20 w-10 h-10 flex items-center justify-center rounded-full transition-transform hover:scale-110 hover:rotate-90"
          style={{
            background: "rgba(255,255,255,0.92)",
            border: `1px solid ${BORDER_PEACH}`,
            boxShadow: "0 6px 16px -6px rgba(184,60,30,0.4)",
          }}
          aria-label="Close quick view"
        >
          <X className="h-5 w-5" style={{ color: TEXT_WINE }} />
        </button>

        <QuickViewBody slug={openSlug!} onClose={closeQuickView} />
      </div>
    </div>
  )
}

function QuickViewBody({ slug, onClose }: { slug: string; onClose: () => void }) {
  // Fetch single product
  const { data, error, isLoading } = useSWR<Product>(`/api/products/${slug}`, safeFetcher)

  // Tiny minimum-display delay so the spinner is visible (avoids flash on cached responses)
  const [minDelayDone, setMinDelayDone] = useState(false)
  useEffect(() => {
    setMinDelayDone(false)
    const t = window.setTimeout(() => setMinDelayDone(true), 450)
    return () => window.clearTimeout(t)
  }, [slug])

  if (isLoading || !minDelayDone) return <QuickViewLoader />
  if (error || !data) return <QuickViewError onClose={onClose} />

  return <QuickViewContent product={data} onClose={onClose} />
}

function QuickViewLoader() {
  return (
    <div
      className="flex flex-col items-center justify-center gap-5 py-24 px-6"
      style={{ minHeight: 480 }}
    >
      {/* Pulsing ring with pill icon */}
      <div className="relative w-24 h-24 flex items-center justify-center">
        <span
          className="absolute inset-0 rounded-full animate-rx-loader-ring"
          style={{
            background: `conic-gradient(from 0deg, ${ACCENT_ORANGE}, ${ACCENT_RED}, ${ACCENT_ORANGE})`,
            WebkitMask:
              "radial-gradient(farthest-side, transparent calc(100% - 6px), #000 calc(100% - 5px))",
            mask: "radial-gradient(farthest-side, transparent calc(100% - 6px), #000 calc(100% - 5px))",
          }}
        />
        <span
          className="absolute inset-2 rounded-full"
          style={{ background: BG_CREAM, boxShadow: "inset 0 0 0 1px rgba(184,60,30,0.15)" }}
        />
        <Pill className="relative h-9 w-9 animate-rx-loader-pulse" style={{ color: ACCENT_RED }} />
      </div>

      <div className="text-center">
        <p
          className="text-base font-bold tracking-tight"
          style={{ color: TEXT_WINE }}
        >
          Fetching product details
        </p>
        <p className="text-xs mt-1" style={{ color: TEXT_WINE_SOFT, opacity: 0.7 }}>
          Just a moment while our pharmacists pull this up…
        </p>
      </div>

      {/* Skeleton shimmer rows */}
      <div className="w-full max-w-md mt-2 space-y-2.5">
        {[90, 70, 80].map((w, i) => (
          <div
            key={i}
            className="h-3 rounded-full animate-rx-shimmer"
            style={{
              width: `${w}%`,
              background:
                "linear-gradient(90deg, rgba(242,220,200,0.45) 0%, rgba(255,255,255,0.95) 50%, rgba(242,220,200,0.45) 100%)",
              backgroundSize: "200% 100%",
            }}
          />
        ))}
      </div>
    </div>
  )
}

function QuickViewError({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 px-6 text-center">
      <p className="text-lg font-bold" style={{ color: TEXT_WINE }}>
        We couldn&apos;t load this product
      </p>
      <p className="text-sm" style={{ color: TEXT_WINE_SOFT }}>
        Please try again in a moment.
      </p>
      <button
        onClick={onClose}
        className="mt-2 px-5 py-2.5 rounded-full text-white font-semibold text-sm"
        style={{
          background: `linear-gradient(135deg, ${ACCENT_ORANGE} 0%, ${ACCENT_RED} 100%)`,
        }}
      >
        Close
      </button>
    </div>
  )
}

function QuickViewContent({ product, onClose }: { product: Product; onClose: () => void }) {
  const { addItem } = useCart()
  const { toggleItem, isInWishlist } = useWishlist()
  const wishlisted = isInWishlist(product.id)

  const [activeImage, setActiveImage] = useState(product.images[0] ?? "/placeholder.svg")
  const [qty, setQty] = useState(1)
  const [justAdded, setJustAdded] = useState(false)

  const handleAdd = () => {
    addItem(product, qty)
    setJustAdded(true)
    window.setTimeout(() => setJustAdded(false), 1500)
  }

  const savings =
    product.originalPrice && product.originalPrice > product.price
      ? product.originalPrice - product.price
      : 0

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] max-h-[92vh] overflow-y-auto">
      {/* LEFT — Gallery */}
      <div
        className="relative p-6 lg:p-8"
        style={{
          background:
            "linear-gradient(160deg, #FFE0CC 0%, #FFF1E6 55%, #FFFBF5 100%)",
        }}
      >
        {/* Floating tag pills */}
        <div className="absolute top-6 left-6 flex flex-col gap-2 z-10">
          {product.isNew && (
            <span
              className="text-[10px] font-bold tracking-[0.2em] uppercase px-3 py-1.5 rounded-full text-white"
              style={{ background: TEXT_WINE }}
            >
              New
            </span>
          )}
          {product.isOnOffer && product.offerPercentage && (
            <span
              className="text-[10px] font-bold tracking-[0.2em] uppercase px-3 py-1.5 rounded-full text-white"
              style={{ background: ACCENT_RED }}
            >
              -{product.offerPercentage}% Off
            </span>
          )}
        </div>

        {/* Main image */}
        <div
          className="relative aspect-square rounded-2xl overflow-hidden"
          style={{
            background: "rgba(255,255,255,0.65)",
            border: `1px solid ${BORDER_PEACH}`,
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8), 0 22px 40px -22px rgba(184,60,30,0.45)",
          }}
        >
          <ProductImage
            src={activeImage}
            alt={product.name}
            className="object-contain p-6"
          />
        </div>

        {/* Thumbnail strip */}
        {product.images.length > 1 && (
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {product.images.slice(0, 6).map((img) => {
              const active = img === activeImage
              return (
                <button
                  key={img}
                  onClick={() => setActiveImage(img)}
                  className="relative shrink-0 w-16 h-16 rounded-xl overflow-hidden transition-transform hover:scale-105"
                  style={{
                    background: "#FFFFFF",
                    border: active
                      ? `2px solid ${ACCENT_RED}`
                      : `1px solid ${BORDER_PEACH}`,
                    boxShadow: active
                      ? "0 6px 14px -6px rgba(185,28,28,0.45)"
                      : "0 4px 10px -6px rgba(184,60,30,0.3)",
                  }}
                  aria-label="Switch image"
                >
                  <ProductImage src={img} alt="" className="object-contain p-1.5" />
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* RIGHT — Details */}
      <div className="p-6 lg:p-8 lg:pr-10 flex flex-col">
        <p
          className="text-[10px] uppercase tracking-[0.25em] font-bold"
          style={{ color: ACCENT_RED }}
        >
          {product.category}
        </p>

        <h2
          className="text-2xl lg:text-3xl font-bold leading-tight mt-2"
          style={{ color: TEXT_WINE }}
        >
          {product.name}
        </h2>

        {/* Rating row */}
        <div className="flex items-center gap-2 mt-3">
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={i}
                className="h-4 w-4"
                fill={i <= 4 ? ACCENT_ORANGE : "none"}
                style={{ color: ACCENT_ORANGE }}
              />
            ))}
          </div>
          <span className="text-xs" style={{ color: TEXT_WINE_SOFT }}>
            4.0 · 128 reviews
          </span>
        </div>

        {/* Price block */}
        <div
          className="mt-5 p-4 rounded-2xl"
          style={{
            background: "rgba(255,255,255,0.7)",
            border: `1px solid ${BORDER_PEACH}`,
          }}
        >
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="text-3xl font-bold" style={{ color: TEXT_WINE }}>
              {formatPrice(product.price)}
            </span>
            {product.originalPrice && (
              <span
                className="text-base line-through"
                style={{ color: TEXT_WINE_SOFT, opacity: 0.6 }}
              >
                {formatPrice(product.originalPrice)}
              </span>
            )}
            {savings > 0 && (
              <span
                className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full text-white"
                style={{ background: "#15803D" }}
              >
                Save {formatPrice(savings)}
              </span>
            )}
          </div>
          <p className="text-xs mt-2" style={{ color: TEXT_WINE_SOFT }}>
            Inclusive of taxes · {product.inStock ? "In stock" : "Out of stock"}
          </p>
        </div>

        {/* Description */}
        {product.description && (
          <p
            className="mt-4 text-sm leading-relaxed line-clamp-4"
            style={{ color: TEXT_WINE_SOFT }}
          >
            {product.description}
          </p>
        )}

        {/* Quantity + actions */}
        <div className="mt-5 flex items-center gap-3">
          <div
            className="flex items-center rounded-full overflow-hidden"
            style={{
              background: "#FFFFFF",
              border: `1px solid ${BORDER_PEACH}`,
            }}
          >
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="w-10 h-10 text-lg font-bold transition-colors hover:bg-[#FFE0CC]"
              style={{ color: TEXT_WINE }}
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span
              className="w-10 text-center font-bold"
              style={{ color: TEXT_WINE }}
            >
              {qty}
            </span>
            <button
              onClick={() => setQty((q) => q + 1)}
              className="w-10 h-10 text-lg font-bold transition-colors hover:bg-[#FFE0CC]"
              style={{ color: TEXT_WINE }}
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>

          <button
            onClick={() => toggleItem(product)}
            className="w-11 h-11 flex items-center justify-center rounded-full transition-transform hover:scale-105"
            style={{
              background: "#FFFFFF",
              border: `1px solid ${BORDER_PEACH}`,
            }}
            aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          >
            <Heart
              className="h-4.5 w-4.5"
              fill={wishlisted ? ACCENT_RED : "none"}
              style={{ color: ACCENT_RED }}
            />
          </button>
        </div>

        <div className="mt-3 flex flex-col sm:flex-row gap-2.5">
          <button
            onClick={handleAdd}
            disabled={!product.inStock}
            className="flex-1 inline-flex items-center justify-center gap-2 h-12 rounded-full font-bold text-sm text-white transition-transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: justAdded
                ? "#15803D"
                : `linear-gradient(135deg, ${ACCENT_ORANGE} 0%, ${ACCENT_RED} 100%)`,
              boxShadow: justAdded
                ? "0 12px 24px -10px rgba(21,128,61,0.55)"
                : "0 12px 24px -10px rgba(185,28,28,0.55)",
            }}
          >
            {justAdded ? <Check className="h-4 w-4" /> : <ShoppingBag className="h-4 w-4" />}
            {justAdded ? "Added to cart" : "Add To Cart"}
          </button>
          <Link
            href={`/product/${product.slug}`}
            onClick={onClose}
            className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full font-bold text-sm transition-colors"
            style={{
              background: "transparent",
              color: TEXT_WINE,
              border: `1.5px solid ${TEXT_WINE}`,
            }}
          >
            View Full Details
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Trust strip */}
        <div
          className="mt-6 grid grid-cols-3 gap-2 p-3 rounded-2xl"
          style={{
            background: "rgba(255,224,204,0.45)",
            border: `1px dashed ${BORDER_PEACH}`,
          }}
        >
          {[
            { icon: ShieldCheck, label: "Verified" },
            { icon: Truck, label: "Same-day Nairobi" },
            { icon: Pill, label: "Pharmacist-checked" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex flex-col items-center text-center gap-1">
              <Icon className="h-4 w-4" style={{ color: ACCENT_RED }} />
              <span
                className="text-[10px] font-semibold leading-tight"
                style={{ color: TEXT_WINE }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
