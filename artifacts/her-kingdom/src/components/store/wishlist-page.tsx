"use client"

import { Link } from "wouter"
import { Heart, ShoppingBag, Trash2, ChevronRight, ShoppingCart, Star } from "lucide-react"
import { TopBar } from "./top-bar"
import { Navbar } from "./navbar"
import { Footer } from "./footer"
import { useWishlist } from "@/lib/wishlist-context"
import { useCart } from "@/lib/cart-context"
import { formatPrice } from "@/lib/format"
import { ProductImage } from "./product-image"
import { useState } from "react"
import { Seo, organizationJsonLd, websiteJsonLd, breadcrumbJsonLd, faqJsonLd, productJsonLd } from "@/components/seo"

const WINE        = "#3D0814"
const WINE_SOFT   = "#6B0F1A"
const CREAM       = "#FFFBF5"
const PEACH_BORDER= "#F2DCC8"
const ACCENT_ORANGE = "#F97316"

/* Per-card gradient pool — warm peach → dusty rose, matching Figma palette */
const CARD_GRADIENTS = [
  "linear-gradient(160deg, #FAD4AC 0%, #E89E8A 100%)",
  "linear-gradient(160deg, #F5C9B0 0%, #D98C80 100%)",
  "linear-gradient(160deg, #F8CEAA 0%, #E29484 100%)",
  "linear-gradient(160deg, #F4C4A8 0%, #DB9070 100%)",
  "linear-gradient(160deg, #FAD0B8 0%, #E49A86 100%)",
]

function WishlistCard({
  product,
  gradientIndex,
  onAddToCart,
  onRemove,
}: {
  product: ReturnType<typeof useWishlist>["items"][0]
  gradientIndex: number
  onAddToCart: () => void
  onRemove: () => void
}) {
  const [adding, setAdding] = useState(false)
  const gradient = CARD_GRADIENTS[gradientIndex % CARD_GRADIENTS.length]

  const handleAddToCart = () => {
    setAdding(true)
    onAddToCart()
    setTimeout(() => setAdding(false), 800)
  }

  /* Pseudo-stable rating from product id */
  const seed = Array.from(product.id).reduce((s, c) => s + c.charCodeAt(0), 0)
  const rating = Math.min(5, Math.max(3.5, Number((((seed % 30) + 35) / 10).toFixed(1))))

  return (
    <div
      className="relative rounded-2xl overflow-hidden group"
      style={{
        background: gradient,
        boxShadow: "0 6px 28px -8px rgba(61,8,20,0.22)",
      }}
    >
      <Seo
        title="Your Wishlist"
        description="Save medicines and health essentials to come back to later. Move items to your cart anytime — Shaniid RX keeps your list ready and private."
        canonicalPath="/wishlist"
        noindex
      />
      {/* Remove button */}
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove from wishlist"
        className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full grid place-items-center transition-all opacity-0 group-hover:opacity-100 hover:scale-110"
        style={{ background: "rgba(255,255,255,0.85)", color: WINE }}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>

      {/* Offer badge */}
      {product.isOnOffer && product.offerPercentage && (
        <div className="absolute top-3 left-3 z-10">
          <span
            className="text-[10px] font-bold px-2 py-1 rounded-full text-white"
            style={{
              background: `linear-gradient(135deg, #E11D48 0%, ${ACCENT_ORANGE} 100%)`,
            }}
          >
            {product.offerPercentage}% Off
          </span>
        </div>
      )}

      {/* Image area — sits on the gradient */}
      <Link href={`/product/${product.slug}`}>
        <div className="relative h-52 overflow-hidden flex items-end justify-center pt-6 px-6">
          <div className="w-full h-full absolute inset-0 opacity-10 rounded-t-2xl" />
          <ProductImage
            src={product.images?.[0] || "/placeholder.svg"}
            alt={product.name}
            className="w-full h-full object-contain drop-shadow-xl group-hover:scale-105 transition-transform duration-500"
            loaderSize="sm"
          />
        </div>
      </Link>

      {/* Card body — white card floating up from bottom */}
      <div className="bg-white mx-3 mb-3 rounded-xl p-4 -mt-4 relative z-10" style={{ border: `1px solid ${PEACH_BORDER}` }}>
        {/* Stars */}
        <div className="flex items-center gap-1 mb-1.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className="h-3 w-3"
              fill={i < Math.round(rating) ? "#F59E0B" : "none"}
              style={{ color: "#F59E0B" }}
            />
          ))}
          <span className="text-[10px] text-neutral-400 ml-1">{rating.toFixed(1)}</span>
        </div>

        <Link href={`/product/${product.slug}`}>
          <h3
            className="font-bold text-sm leading-snug line-clamp-2 hover:underline mb-0.5"
            style={{ color: WINE }}
          >
            {product.name}
          </h3>
        </Link>
        <p className="text-[11px] text-neutral-500 line-clamp-1 mb-3">{product.category}</p>

        {/* Price row */}
        <div className="flex items-center gap-2 mb-3">
          <span className="font-extrabold text-sm" style={{ color: WINE }}>
            {formatPrice(product.price)}
          </span>
          {product.originalPrice && (
            <span className="text-[11px] text-neutral-400 line-through">
              {formatPrice(product.originalPrice)}
            </span>
          )}
        </div>

        {/* Add to Cart button — creative hover: fill from left */}
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={!product.inStock || adding}
          className="w-full h-9 rounded-full text-xs font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
          style={
            adding
              ? { background: `linear-gradient(135deg, ${WINE} 0%, ${WINE_SOFT} 100%)`, color: "white", border: "none" }
              : { background: WINE, color: "white", border: "none" }
          }
          onMouseEnter={(e) => { if (!adding) (e.currentTarget as HTMLButtonElement).style.background = `linear-gradient(135deg, #F97316 0%, #B91C1C 100%)` }}
          onMouseLeave={(e) => { if (!adding) (e.currentTarget as HTMLButtonElement).style.background = WINE }}
        >
          <ShoppingBag className="h-3.5 w-3.5" />
          {adding ? "Added!" : !product.inStock ? "Out of Stock" : "Add To Cart"}
        </button>
      </div>
    </div>
  )
}

export function WishlistPage() {
  const { items, removeItem, clearWishlist } = useWishlist()
  const { addItem } = useCart()

  const handleAddToCart = (product: (typeof items)[0]) => {
    addItem(product)
    removeItem(product.id)
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: CREAM }}>
      <TopBar />
      <Navbar />

      <main className="flex-1">
        {/* Page header */}
        <div
          className="border-b"
          style={{
            background: "linear-gradient(160deg, #FFFBF5 0%, #FFF0E0 100%)",
            borderColor: PEACH_BORDER,
          }}
        >
          <div className="mx-auto max-w-7xl px-4 py-6">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-xs text-neutral-400 mb-4">
              <Link href="/" className="hover:text-neutral-600 transition-colors">Home</Link>
              <ChevronRight className="h-3 w-3" />
              <span style={{ color: WINE }}>My Wishlist</span>
            </nav>

            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h1
                  className="text-3xl font-extrabold tracking-tight"
                  style={{
                    color: WINE,
                    fontFamily: "var(--font-serif, ui-serif, Georgia, serif)",
                  }}
                >
                  My Wishlist
                </h1>
                <p className="text-sm text-neutral-500 mt-0.5">
                  {items.length === 0
                    ? "Nothing saved yet"
                    : `${items.length} ${items.length === 1 ? "item" : "items"} saved`}
                </p>
              </div>

              {/* "Your Wishlist" pill — matching Figma reference */}
              <div
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold"
                style={{
                  background: "linear-gradient(135deg, #FAD4AC 0%, #E8A888 100%)",
                  color: WINE,
                  boxShadow: "0 6px 18px -8px rgba(232,168,136,0.6)",
                }}
              >
                <ShoppingCart className="h-4 w-4" />
                Your Wishlist
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-8">
          {items.length === 0 ? (
            /* ── Empty state ── */
            <div className="flex flex-col items-center justify-center py-24">
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center mb-6"
                style={{
                  background: "linear-gradient(135deg, #FAD4AC 0%, #E8A888 100%)",
                  boxShadow: "0 12px 30px -10px rgba(232,168,136,0.5)",
                }}
              >
                <Heart className="h-11 w-11 text-white" fill="white" />
              </div>
              <h2
                className="text-2xl font-bold"
                style={{ color: WINE, fontFamily: "var(--font-serif, ui-serif, Georgia, serif)" }}
              >
                Your wishlist is empty
              </h2>
              <p className="text-sm text-neutral-500 mt-2 max-w-xs text-center leading-relaxed">
                Browse our range of medicines and health products, and tap the heart icon to save your favourites here.
              </p>
              <Link href="/shop">
                <button
                  type="button"
                  className="mt-7 px-8 h-11 rounded-full text-sm font-semibold text-white transition-transform hover:scale-105"
                  style={{
                    background: `linear-gradient(135deg, ${WINE} 0%, ${WINE_SOFT} 100%)`,
                    boxShadow: "0 14px 28px -12px rgba(61,8,20,0.45)",
                  }}
                >
                  Browse Shop
                </button>
              </Link>
            </div>
          ) : (
            <>
              {/* Clear all + count row */}
              <div className="flex items-center justify-between mb-6">
                <p className="text-sm font-medium" style={{ color: WINE }}>
                  {items.length} saved {items.length === 1 ? "item" : "items"}
                </p>
                <button
                  type="button"
                  onClick={clearWishlist}
                  className="text-xs text-neutral-400 hover:text-red-500 transition-colors px-3 h-8 rounded-full border hover:border-red-200"
                  style={{ borderColor: PEACH_BORDER }}
                >
                  Clear all
                </button>
              </div>

              {/* Product grid */}
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-5">
                {items.map((product, i) => (
                  <WishlistCard
                    key={product.id}
                    product={product}
                    gradientIndex={i}
                    onAddToCart={() => handleAddToCart(product)}
                    onRemove={() => removeItem(product.id)}
                  />
                ))}
              </div>

              {/* Footer CTA */}
              <div className="mt-12 text-center">
                <Link href="/shop">
                  <button
                    type="button"
                    className="px-8 h-11 rounded-full text-sm font-semibold transition-all hover:scale-105"
                    style={{
                      border: `1.5px solid ${PEACH_BORDER}`,
                      color: WINE,
                      background: "white",
                    }}
                  >
                    Continue Shopping →
                  </button>
                </Link>
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
