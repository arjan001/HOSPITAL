"use client"

import Link from "next/link"
import Image from "next/image"
import { Heart, ShoppingBag, Eye, Play } from "lucide-react"
import type { Product } from "@/lib/types"
import { formatPrice } from "@/lib/format"
import { useCart } from "@/lib/cart-context"
import { useWishlist } from "@/lib/wishlist-context"
import { isVideoUrl } from "@/lib/media-utils"
import { ProductImage } from "./product-image"

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart()
  const { toggleItem, isInWishlist } = useWishlist()
  const wishlisted = isInWishlist(product.id)
  const primaryMedia = product.images[0] || ""
  const isPrimaryVideo = isVideoUrl(primaryMedia)

  return (
    <div className="group">
      <Link href={`/product/${product.slug}`}>
        <div className="relative aspect-[3/4] overflow-hidden rounded-sm bg-secondary">
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
                <div className="w-10 h-10 bg-background/80 rounded-full flex items-center justify-center">
                  <Play className="h-5 w-5 text-foreground ml-0.5" />
                </div>
              </div>
            </>
          ) : (
            <ProductImage
              src={primaryMedia || "/placeholder.svg"}
              alt={product.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          )}

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            {product.isNew && (
              <span className="bg-foreground text-background text-[10px] font-semibold tracking-wider uppercase px-2.5 py-1">
                New
              </span>
            )}
            {product.isOnOffer && product.offerPercentage && (
              <span className="bg-foreground text-background text-[10px] font-semibold tracking-wider uppercase px-2.5 py-1">
                -{product.offerPercentage}%
              </span>
            )}
          </div>

          {/* Quick Actions */}
          <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); toggleItem(product) }}
              className="w-9 h-9 flex items-center justify-center bg-background rounded-full shadow-sm hover:bg-secondary transition-colors"
              aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
            >
              <Heart className={`h-4 w-4 transition-colors ${wishlisted ? "fill-pink-500 text-pink-500" : "text-pink-500"}`} />
            </button>
            <button
              type="button"
              className="w-9 h-9 flex items-center justify-center bg-background rounded-full shadow-sm hover:bg-secondary transition-colors"
              aria-label="Quick view"
            >
              <Eye className="h-4 w-4" />
            </button>
          </div>

          {/* Add to Cart */}
          <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                addItem(product)
              }}
              className="w-full flex items-center justify-center gap-2 bg-pink-200 text-foreground py-2.5 text-xs font-medium uppercase tracking-wider hover:bg-pink-300 transition-colors"
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              Add to Cart
            </button>
          </div>
        </div>
      </Link>

      <div className="mt-3">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">
          {product.category}
        </p>
        <Link href={`/product/${product.slug}`}>
          <h3 className="text-sm font-medium mt-1 group-hover:underline line-clamp-1">
            {product.name}
          </h3>
        </Link>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-sm font-semibold">{formatPrice(product.price)}</span>
          {product.originalPrice && (
            <span className="text-xs text-muted-foreground line-through">
              {formatPrice(product.originalPrice)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
