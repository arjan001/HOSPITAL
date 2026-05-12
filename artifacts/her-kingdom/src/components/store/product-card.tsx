"use client"

import { Link, useLocation } from "wouter"

import { Heart, ShoppingBag, Eye, Play, Check } from "lucide-react"
import { useState } from "react"
import type { Product } from "@/lib/types"
import { formatPrice } from "@/lib/format"
import { useCart } from "@/lib/cart-context"
import { useWishlist } from "@/lib/wishlist-context"
import { isVideoUrl } from "@/lib/media-utils"
import { ProductImage } from "./product-image"

const TEXT_WINE = "#3D0814"
const TEXT_WINE_SOFT = "#6B0F1A"
const ACCENT_ORANGE = "#F97316"
const ACCENT_RED = "#B91C1C"
const BORDER_PEACH = "#F2DCC8"
const CARD_BG = "rgba(255, 251, 245, 0.7)"

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart()
  const { toggleItem, isInWishlist } = useWishlist()
  const [, navigate] = useLocation()
  const [justAdded, setJustAdded] = useState(false)
  const wishlisted = isInWishlist(product.id)
  const primaryMedia = product.images[0] || ""
  const isPrimaryVideo = isVideoUrl(primaryMedia)

  return (
    <div
      className="group relative rounded-2xl p-3 transition-transform hover:-translate-y-1"
      style={{
        background: CARD_BG,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: `1px solid ${BORDER_PEACH}`,
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.65), 0 14px 30px -18px rgba(184,60,30,0.4)",
      }}
    >
      <Link href={`/product/${product.slug}`}>
        <div
          className="relative aspect-square overflow-hidden rounded-xl"
          style={{ background: "#FFF1E6" }}
        >
          {isPrimaryVideo ? (
            <>
              <video
                src={primaryMedia}
                muted
                playsInline
                preload="metadata"
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-10 h-10 bg-white/85 rounded-full flex items-center justify-center">
                  <Play className="h-5 w-5 ml-0.5" style={{ color: TEXT_WINE }} />
                </div>
              </div>
            </>
          ) : (
            <ProductImage
              src={primaryMedia || "/placeholder.svg"}
              alt={product.name}
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          )}

          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1.5">
            {product.isNew && (
              <span
                className="text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full text-white"
                style={{ background: TEXT_WINE }}
              >
                New
              </span>
            )}
            {product.isOnOffer && product.offerPercentage && (
              <span
                className="text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full text-white"
                style={{ background: ACCENT_RED }}
              >
                -{product.offerPercentage}%
              </span>
            )}
          </div>

          {/* Quick Actions */}
          <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); toggleItem(product) }}
              className="w-8 h-8 flex items-center justify-center rounded-full shadow-md hover:scale-110 transition-transform"
              style={{ background: "rgba(255,255,255,0.9)", backdropFilter: "blur(8px)" }}
              aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
            >
              <Heart
                className="h-4 w-4"
                fill={wishlisted ? ACCENT_RED : "none"}
                style={{ color: ACCENT_RED }}
              />
            </button>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); navigate(`/product/${product.slug}`) }}
              className="w-8 h-8 flex items-center justify-center rounded-full shadow-md hover:scale-110 transition-transform text-white"
              style={{ background: ACCENT_RED }}
              aria-label="Quick view"
              title="Quick view"
            >
              <Eye className="h-4 w-4" />
            </button>
          </div>
        </div>
      </Link>

      <div className="mt-3 px-1">
        <p
          className="text-[10px] uppercase tracking-[0.18em]"
          style={{ color: TEXT_WINE_SOFT, opacity: 0.75 }}
        >
          {product.category}
        </p>
        <Link href={`/product/${product.slug}`}>
          <h3
            className="text-sm font-bold mt-1 line-clamp-1 group-hover:underline"
            style={{ color: TEXT_WINE }}
          >
            {product.name}
          </h3>
        </Link>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm font-bold" style={{ color: TEXT_WINE }}>
            {formatPrice(product.price)}
          </span>
          {product.originalPrice && (
            <span
              className="text-xs line-through"
              style={{ color: TEXT_WINE_SOFT, opacity: 0.6 }}
            >
              {formatPrice(product.originalPrice)}
            </span>
          )}
        </div>
      </div>

      {/* Add to Cart */}
      <button
        type="button"
        aria-live="polite"
        onClick={(e) => {
          e.preventDefault()
          addItem(product)
          setJustAdded(true)
          window.setTimeout(() => setJustAdded(false), 1400)
        }}
        className="mt-3 w-full flex items-center justify-center gap-1.5 h-10 rounded-full font-semibold text-sm transition-transform hover:scale-[1.02] text-white"
        style={
          justAdded
            ? {
                background: "#15803D",
                boxShadow: "0 10px 22px -10px rgba(21,128,61,0.55)",
              }
            : {
                background: `linear-gradient(135deg, ${ACCENT_ORANGE} 0%, ${ACCENT_RED} 100%)`,
                boxShadow: "0 10px 22px -10px rgba(185,28,28,0.55)",
              }
        }
      >
        {justAdded ? <Check className="h-4 w-4" /> : <ShoppingBag className="h-4 w-4" />}
        {justAdded ? "Added" : "Add To Cart"}
      </button>
    </div>
  )
}
