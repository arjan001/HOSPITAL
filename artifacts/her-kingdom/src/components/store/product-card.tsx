"use client"

import { Link } from "wouter"

import { Heart, ShoppingBag, Eye, Play, Check } from "lucide-react"
import { useState } from "react"
import type { Product } from "@/lib/types"
import { formatPrice } from "@/lib/format"
import { useCart } from "@/lib/cart-context"
import { useWishlist } from "@/lib/wishlist-context"
import { useQuickView } from "@/lib/quick-view-context"
import { isVideoUrl } from "@/lib/media-utils"

const ACCENT_ORANGE = "#F97316"
const ACCENT_RED = "#B91C1C"

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart()
  const { toggleItem, isInWishlist } = useWishlist()
  const { openQuickView } = useQuickView()
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
              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
            />
          )}

          {/* Top-left discount / new badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1.5 z-10">
            {product.isNew && (
              <span className="text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full text-white"
                style={{ background: "#3D0814" }}>
                New
              </span>
            )}
            {hasDiscount && (
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full text-white"
                style={{ background: "#E91E8C" }}>
                {product.offerPercentage}% Off
              </span>
            )}
          </div>

          {/* Top-right: eye + heart — always visible */}
          <div className="absolute top-2 right-2 flex flex-col gap-1.5 z-10">
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); openQuickView(product.slug) }}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white shadow-sm hover:shadow-md transition-shadow"
              style={{ border: "1px solid #E8E8E8" }}
              aria-label="Quick view"
              title="Quick view"
            >
              <Eye className="h-4 w-4 text-gray-500" />
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

        {/* Add To Cart — neutral default, themed on hover */}
        <button
          type="button"
          aria-live="polite"
          onClick={() => {
            addItem(product)
            setJustAdded(true)
            window.setTimeout(() => setJustAdded(false), 1400)
          }}
          onMouseEnter={() => setHoverBtn(true)}
          onMouseLeave={() => setHoverBtn(false)}
          className="mt-3 w-full flex items-center justify-center gap-1.5 h-10 rounded-full font-semibold text-sm transition-all duration-200"
          style={
            justAdded
              ? { background: "#15803D", color: "white", border: "none" }
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
          {justAdded ? <Check className="h-4 w-4" /> : <ShoppingBag className="h-4 w-4" />}
          {justAdded ? "Added" : "+ Add To Cart"}
        </button>
      </div>
    </div>
  )
}
