"use client"

import { useEffect, useState } from "react"
import { Link } from "wouter"
import useSWR from "swr"
import { X, Heart, ShoppingBag, Check, Pill, Truck, ShieldCheck, Star, ArrowRight, Minus, Plus } from "lucide-react"
import { useQuickView } from "@/lib/quick-view-context"
import { useCart } from "@/lib/cart-context"
import { useWishlist } from "@/lib/wishlist-context"
import { safeFetcher } from "@/lib/fetcher"
import { formatPrice } from "@/lib/format"
import { ProductImage } from "./product-image"
import type { Product } from "@/lib/types"

const ACCENT_ORANGE = "#F97316"
const ACCENT_RED = "#B91C1C"
const TEXT_DARK = "#1F2937"
const TEXT_MUTED = "#6B7280"
const BORDER_GRAY = "#E5E7EB"
const BG_LIGHT = "#F9FAFB"

export function QuickViewModal() {
  const { openSlug, closeQuickView } = useQuickView()
  const open = openSlug !== null

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

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
      {/* Backdrop — simple dark overlay */}
      <div
        className="absolute inset-0 animate-rx-fade-in"
        style={{
          background: "rgba(17, 24, 39, 0.55)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
        }}
        onClick={closeQuickView}
      />

      {/* Panel — pure white */}
      <div
        className="relative z-10 w-full max-w-5xl max-h-[92vh] overflow-hidden rounded-lg animate-rx-modal-in bg-white"
        style={{
          boxShadow: "0 25px 60px -20px rgba(0,0,0,0.35)",
        }}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={closeQuickView}
          className="absolute top-4 right-4 z-20 w-9 h-9 flex items-center justify-center rounded-full bg-white border border-gray-200 transition-colors hover:bg-gray-50"
          aria-label="Close quick view"
        >
          <X className="h-4 w-4" style={{ color: TEXT_DARK }} />
        </button>

        <QuickViewBody slug={openSlug!} onClose={closeQuickView} />
      </div>
    </div>
  )
}

function QuickViewBody({ slug, onClose }: { slug: string; onClose: () => void }) {
  const { data, error, isLoading } = useSWR<{ product: Product; related?: Product[] }>(
    `/api/products/${slug}`,
    safeFetcher,
  )

  const [minDelayDone, setMinDelayDone] = useState(false)
  useEffect(() => {
    setMinDelayDone(false)
    const t = window.setTimeout(() => setMinDelayDone(true), 350)
    return () => window.clearTimeout(t)
  }, [slug])

  if (isLoading || !minDelayDone) return <QuickViewLoader />
  if (error || !data?.product) return <QuickViewError onClose={onClose} />

  return <QuickViewContent product={data.product} onClose={onClose} />
}

function QuickViewLoader() {
  return (
    <div
      className="flex flex-col items-center justify-center gap-5 py-24 px-6 bg-white"
      style={{ minHeight: 480 }}
    >
      <div className="relative w-16 h-16 flex items-center justify-center">
        <span
          className="absolute inset-0 rounded-full animate-rx-loader-ring"
          style={{
            background: `conic-gradient(from 0deg, ${ACCENT_ORANGE}, ${ACCENT_RED}, ${ACCENT_ORANGE})`,
            WebkitMask:
              "radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 3px))",
            mask: "radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 3px))",
          }}
        />
        <Pill className="relative h-6 w-6" style={{ color: ACCENT_RED }} />
      </div>
      <p className="text-sm font-semibold" style={{ color: TEXT_DARK }}>
        Loading product…
      </p>
    </div>
  )
}

function QuickViewError({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 px-6 text-center bg-white">
      <p className="text-base font-semibold" style={{ color: TEXT_DARK }}>
        We couldn&apos;t load this product
      </p>
      <p className="text-sm" style={{ color: TEXT_MUTED }}>
        Please try again in a moment.
      </p>
      <button
        onClick={onClose}
        className="mt-2 px-5 py-2 rounded-full text-white font-semibold text-sm"
        style={{ background: ACCENT_RED }}
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

  const images = product.images ?? []
  const [activeImage, setActiveImage] = useState(images[0] ?? "/placeholder.svg")
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
    <div className="grid grid-cols-1 lg:grid-cols-2 max-h-[92vh] overflow-y-auto bg-white">
      {/* LEFT — Gallery (clean white) */}
      <div className="relative p-6 lg:p-8 bg-white border-b lg:border-b-0 lg:border-r" style={{ borderColor: BORDER_GRAY }}>
        {/* Floating tag pills */}
        <div className="absolute top-6 left-6 flex flex-col gap-2 z-10">
          {product.isNew && (
            <span
              className="text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded text-white"
              style={{ background: TEXT_DARK }}
            >
              New
            </span>
          )}
          {product.isOnOffer && product.offerPercentage && (
            <span
              className="text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded text-white"
              style={{ background: ACCENT_RED }}
            >
              -{product.offerPercentage}%
            </span>
          )}
        </div>

        {/* Main image */}
        <div
          className="relative aspect-square rounded-md overflow-hidden bg-white"
          style={{ border: `1px solid ${BORDER_GRAY}` }}
        >
          <ProductImage
            src={activeImage}
            alt={product.name}
            className="object-contain p-6"
          />
        </div>

        {/* Thumbnail strip */}
        {images.length > 1 && (
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {images.slice(0, 6).map((img) => {
              const active = img === activeImage
              return (
                <button
                  key={img}
                  onClick={() => setActiveImage(img)}
                  className="relative shrink-0 w-16 h-16 rounded-md overflow-hidden bg-white transition-colors"
                  style={{
                    border: active
                      ? `2px solid ${ACCENT_RED}`
                      : `1px solid ${BORDER_GRAY}`,
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
      <div className="p-6 lg:p-8 flex flex-col bg-white">
        <p
          className="text-[11px] uppercase tracking-wider font-semibold"
          style={{ color: TEXT_MUTED }}
        >
          {product.category}
        </p>

        <h2
          className="text-2xl lg:text-3xl font-bold leading-tight mt-2"
          style={{ color: TEXT_DARK }}
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
          <span className="text-xs" style={{ color: TEXT_MUTED }}>
            4.0 · 128 reviews
          </span>
        </div>

        {/* Price block */}
        <div className="mt-5 pb-5 border-b" style={{ borderColor: BORDER_GRAY }}>
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="text-3xl font-bold" style={{ color: ACCENT_RED }}>
              {formatPrice(product.price)}
            </span>
            {product.originalPrice && (
              <span
                className="text-base line-through"
                style={{ color: TEXT_MUTED }}
              >
                {formatPrice(product.originalPrice)}
              </span>
            )}
            {savings > 0 && (
              <span
                className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded text-white"
                style={{ background: "#16A34A" }}
              >
                Save {formatPrice(savings)}
              </span>
            )}
          </div>
          <p className="text-xs mt-2" style={{ color: TEXT_MUTED }}>
            Inclusive of taxes ·{" "}
            <span style={{ color: product.inStock ? "#16A34A" : ACCENT_RED }}>
              {product.inStock ? "In stock" : "Out of stock"}
            </span>
          </p>
        </div>

        {/* Description */}
        {product.description && (
          <p
            className="mt-4 text-sm leading-relaxed line-clamp-4"
            style={{ color: TEXT_MUTED }}
          >
            {product.description}
          </p>
        )}

        {/* Quantity + actions */}
        <div className="mt-5 flex items-center gap-3">
          <div
            className="flex items-center rounded-md overflow-hidden bg-white"
            style={{ border: `1px solid ${BORDER_GRAY}` }}
          >
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="w-10 h-10 flex items-center justify-center transition-colors hover:bg-gray-50"
              style={{ color: TEXT_DARK }}
              aria-label="Decrease quantity"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span
              className="w-10 text-center text-sm font-semibold"
              style={{ color: TEXT_DARK }}
            >
              {qty}
            </span>
            <button
              onClick={() => setQty((q) => q + 1)}
              className="w-10 h-10 flex items-center justify-center transition-colors hover:bg-gray-50"
              style={{ color: TEXT_DARK }}
              aria-label="Increase quantity"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          <button
            onClick={() => toggleItem(product)}
            className="w-10 h-10 flex items-center justify-center rounded-md bg-white transition-colors hover:bg-gray-50"
            style={{ border: `1px solid ${BORDER_GRAY}` }}
            aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          >
            <Heart
              className="h-4 w-4"
              fill={wishlisted ? ACCENT_RED : "none"}
              style={{ color: ACCENT_RED }}
            />
          </button>
        </div>

        <div className="mt-3 flex flex-col sm:flex-row gap-2.5">
          <button
            onClick={handleAdd}
            disabled={!product.inStock}
            className="flex-1 inline-flex items-center justify-center gap-2 h-11 rounded-md font-semibold text-sm text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: justAdded ? "#15803D" : "#3D0814",
            }}
            onMouseEnter={(e) => { if (!justAdded) (e.currentTarget as HTMLButtonElement).style.background = "linear-gradient(135deg, #F97316 0%, #B91C1C 100%)" }}
            onMouseLeave={(e) => { if (!justAdded) (e.currentTarget as HTMLButtonElement).style.background = justAdded ? "#15803D" : "#3D0814" }}
          >
            {justAdded ? <Check className="h-4 w-4" /> : <ShoppingBag className="h-4 w-4" />}
            {justAdded ? "Added to cart" : "Add to cart"}
          </button>
          <Link
            href={`/product/${product.slug}`}
            onClick={onClose}
            className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-md font-semibold text-sm bg-white transition-colors hover:bg-gray-50"
            style={{
              color: TEXT_DARK,
              border: `1px solid ${BORDER_GRAY}`,
            }}
          >
            View details
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Trust strip */}
        <div
          className="mt-6 grid grid-cols-3 gap-2 p-3 rounded-md"
          style={{ background: BG_LIGHT }}
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
                style={{ color: TEXT_DARK }}
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
