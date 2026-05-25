"use client"

import { Link, useLocation } from "wouter"

import { Heart, ShoppingBag, Eye, Play, Check, BellRing } from "lucide-react"
import { useState } from "react"
import type { Product } from "@/lib/types"
import { formatPrice } from "@/lib/format"
import { useCart } from "@/lib/cart-context"
import { useWishlist } from "@/lib/wishlist-context"
import { isVideoUrl } from "@/lib/media-utils"

const ACCENT_ORANGE = "#F97316"
const ACCENT_RED = "#B91C1C"

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart()
  const { toggleItem, isInWishlist } = useWishlist()
  const [, navigate] = useLocation()
  const [justAdded, setJustAdded] = useState(false)
  const [hoverBtn, setHoverBtn] = useState(false)
  const wishlisted = isInWishlist(product.id)
  const primaryMedia = product.images[0] || ""
  const isPrimaryVideo = isVideoUrl(primaryMedia)
  const hasDiscount = product.isOnOffer && product.offerPercentage

  return (
    <div
      className="group relative flex flex-col bg-white rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-lg"
      style={{
        border: "1px solid #E8E8E8",
        boxShadow: "0 2px 8px -4px rgba(0,0,0,0.07)",
      }}
    >
      {/* Image area */}
      <Link href={`/product/${product.slug}`} className="block">
        <div className="relative aspect-square overflow-hidden bg-white p-2">
          {isPrimaryVideo ? (
            <>
              <video
                src={primaryMedia}
                muted
                playsInline
                preload="metadata"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-10 h-10 bg-white/85 rounded-full flex items-center justify-center">
                  <Play className="h-5 w-5 ml-0.5 text-gray-600" />
                </div>
              </div>
            </>
          ) : (
            <img
              src={primaryMedia || "/placeholder.svg"}
              alt={product.name}
              className="w-full h-full object-contain group-hover:scale-125 transition-transform duration-500 ease-out"
            />
          )}

          {/* Top-left discount / new badges */}
          <div className="absolute top-0 left-0 flex flex-col gap-1.5 z-10">
            {hasDiscount && (
              <span
                className="text-[11px] font-bold px-3 py-1.5 text-white"
                style={{
                  background: `linear-gradient(135deg, ${ACCENT_ORANGE} 0%, ${ACCENT_RED} 100%)`,
                  borderRadius: "12px 0 12px 0",
                  boxShadow: "0 4px 10px -4px rgba(185,28,28,0.45)",
                }}
              >
                {product.offerPercentage}% Off
              </span>
            )}
            {product.isNew && (
              <span
                className="text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 ml-2 rounded-full text-white"
                style={{ background: "#3D0814" }}
              >
                New
              </span>
            )}
          </div>

          {/* Top-right: eye + heart — always visible */}
          <div className="absolute top-2 right-2 flex flex-col gap-1.5 z-10">
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(`/product/${product.slug}`) }}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white shadow-sm hover:shadow-md transition-shadow"
              style={{ border: "1px solid #E8E8E8" }}
              aria-label="View product"
              title="View product"
            >
              <Eye className="h-4 w-4" style={{ color: "#3D0814" }} />
            </button>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleItem(product) }}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white shadow-sm hover:shadow-md transition-shadow"
              style={{ border: "1px solid #E8E8E8" }}
              aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
            >
              <Heart
                className="h-4 w-4"
                fill={wishlisted ? ACCENT_RED : "none"}
                style={{ color: ACCENT_RED }}
              />
            </button>
          </div>
        </div>
      </Link>

      {/* Info */}
      <div className="px-3 pb-3 flex flex-col flex-1">
        <p className="text-[10px] uppercase tracking-widest text-gray-400 mt-1.5">
          {product.category}
        </p>
        <Link href={`/product/${product.slug}`}>
          <h3 className="text-sm font-semibold mt-0.5 line-clamp-2 leading-snug transition-colors group-hover:text-[#B91C1C]"
            style={{ color: "#1A1A1A" }}>
            {product.name}
          </h3>
        </Link>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className="text-sm font-bold" style={{ color: "#1A1A1A" }}>
            {formatPrice(product.price)}
          </span>
          {product.originalPrice && (
            <span className="text-xs line-through text-gray-400">
              {formatPrice(product.originalPrice)}
            </span>
          )}
        </div>
        <div className="flex-1" />

        {/* Add To Cart — out-of-stock shows Notify Me */}
        {product.inStock === false ? (
          <button
            type="button"
            onClick={(e) => { e.preventDefault() }}
            className="mt-3 w-full flex items-center justify-center gap-2 h-10 rounded-full font-semibold text-sm text-white transition-opacity hover:opacity-90"
            style={{ background: "#1A1A1A" }}
          >
            <BellRing className="h-4 w-4" />
            Notify Me
          </button>
        ) : (
          <button
            type="button"
            aria-live="polite"
            onClick={() => {
              addItem(product)
              setJustAdded(true)
              window.setTimeout(() => setJustAdded(false), 1600)
            }}
            onMouseEnter={() => setHoverBtn(true)}
            onMouseLeave={() => setHoverBtn(false)}
            className={`mt-3 w-full flex items-center justify-center gap-1.5 h-10 rounded-full font-semibold text-sm transition-all duration-200 ${justAdded ? "scale-[1.03]" : ""}`}
            style={
              justAdded
                ? {
                    background: `linear-gradient(135deg, ${ACCENT_ORANGE} 0%, ${ACCENT_RED} 100%)`,
                    color: "white",
                    border: "none",
                    boxShadow: "0 10px 24px -6px rgba(185,28,28,0.55)",
                  }
                : hoverBtn
                  ? {
                      background: `linear-gradient(135deg, ${ACCENT_ORANGE} 0%, ${ACCENT_RED} 100%)`,
                      color: "white",
                      border: "none",
                      boxShadow: "0 8px 20px -8px rgba(185,28,28,0.5)",
                    }
                  : { background: "transparent", color: "#1A1A1A", border: "1.5px solid #D8D8D8" }
            }
          >
            {justAdded ? (
              <>
                <Check className="h-4 w-4 animate-[bounce_0.6s_ease-in-out_1]" strokeWidth={3} />
                Added to cart
              </>
            ) : (
              <>
                <ShoppingBag className="h-4 w-4" />
                Add to cart
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
