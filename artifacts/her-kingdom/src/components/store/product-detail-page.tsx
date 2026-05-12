"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Link } from "wouter"
import {
  ChevronRight,
  Minus,
  Plus,
  Heart,
  ShoppingBag,
  Truck,
  Shield,
  Play,
  Star,
  ThumbsUp,
  MessageSquare,
  Share2,
  Check,
  Clock,
  Stethoscope,
  Upload,
  ZoomIn,
  X,
  ChevronLeft,
} from "lucide-react"
import { TopBar } from "./top-bar"
import { Navbar } from "./navbar"
import { Footer } from "./footer"
import { ProductCard } from "./product-card"
import { CompactNewsletter } from "./compact-newsletter"
import type { Product } from "@/lib/types"
import { useCart } from "@/lib/cart-context"
import { useWishlist } from "@/lib/wishlist-context"
import { isVideoUrl } from "@/lib/media-utils"
import { ProductImage } from "./product-image"
import useSWR from "swr"
import { useStoreContact } from "@/hooks/use-store-contact"
import { rememberProduct, useRecentlyViewed } from "@/lib/recently-viewed"
import { QuickViewProvider } from "@/lib/quick-view-context"
import { QuickViewModal } from "./quick-view-modal"

const WINE = "#3D0814"
const WINE_SOFT = "#6B0F1A"
const CREAM = "#FFFBF5"
const PEACH_BORDER = "#F2DCC8"
const ACCENT_ORANGE = "#F97316"
const ACCENT_AMBER = "#F59E0B"
const SUCCESS = "#0F8A65"

// ─── Image Lightbox ───────────────────────────────────────────────────────────
function ImageLightbox({
  images,
  startIndex,
  onClose,
}: {
  images: string[]
  startIndex: number
  onClose: () => void
}) {
  const [idx, setIdx] = useState(startIndex)
  const [zoom, setZoom] = useState(false)
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 })
  const imgRef = useRef<HTMLDivElement>(null)

  const prev = useCallback(() => setIdx((i) => (i === 0 ? images.length - 1 : i - 1)), [images.length])
  const next = useCallback(() => setIdx((i) => (i === images.length - 1 ? 0 : i + 1)), [images.length])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      if (e.key === "ArrowLeft") prev()
      if (e.key === "ArrowRight") next()
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [onClose, prev, next])

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imgRef.current || !zoom) return
    const rect = imgRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setZoomPos({ x, y })
  }

  const src = images[idx]

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: "rgba(15,5,10,0.92)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      {/* Close */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full text-white/80 hover:text-white transition-colors"
        style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(4px)" }}
      >
        <X className="h-5 w-5" />
      </button>

      {/* Counter */}
      {images.length > 1 && (
        <span
          className="absolute top-4 left-1/2 -translate-x-1/2 text-xs font-semibold text-white/70 px-3 py-1 rounded-full"
          style={{ background: "rgba(255,255,255,0.12)" }}
        >
          {idx + 1} / {images.length}
        </span>
      )}

      {/* Prev */}
      {images.length > 1 && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); prev() }}
          className="absolute left-3 lg:left-6 top-1/2 -translate-y-1/2 z-10 w-11 h-11 flex items-center justify-center rounded-full text-white/80 hover:text-white transition-colors"
          style={{ background: "rgba(255,255,255,0.12)" }}
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}

      {/* Next */}
      {images.length > 1 && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); next() }}
          className="absolute right-3 lg:right-6 top-1/2 -translate-y-1/2 z-10 w-11 h-11 flex items-center justify-center rounded-full text-white/80 hover:text-white transition-colors"
          style={{ background: "rgba(255,255,255,0.12)" }}
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}

      {/* Main image */}
      <div
        ref={imgRef}
        className="relative w-full max-w-3xl max-h-[80vh] flex items-center justify-center px-16 overflow-hidden"
        style={{ cursor: zoom ? "zoom-out" : "zoom-in" }}
        onClick={(e) => { e.stopPropagation(); setZoom(!zoom) }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => zoom && setZoomPos({ x: 50, y: 50 })}
      >
        <img
          src={src}
          alt=""
          draggable={false}
          className="max-w-full max-h-[75vh] object-contain select-none transition-transform duration-200 rounded-2xl"
          style={
            zoom
              ? {
                  transform: "scale(2.5)",
                  transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                }
              : { transform: "scale(1)" }
          }
        />
      </div>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div
          className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2 max-w-[90vw] overflow-x-auto pb-1"
          onClick={(e) => e.stopPropagation()}
          style={{ scrollbarWidth: "none" }}
        >
          {images.map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => { setIdx(i); setZoom(false) }}
              className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden transition-all"
              style={{
                border: i === idx ? `2.5px solid ${ACCENT_ORANGE}` : "2px solid rgba(255,255,255,0.2)",
                opacity: i === idx ? 1 : 0.55,
              }}
            >
              <img src={img} alt="" className="w-full h-full object-contain bg-white/10 p-1" />
            </button>
          ))}
        </div>
      )}

      {/* Zoom hint */}
      {!zoom && (
        <div
          className="absolute bottom-5 right-5 flex items-center gap-1.5 text-xs text-white/50 pointer-events-none"
        >
          <ZoomIn className="h-3.5 w-3.5" />
          <span>Click to zoom</span>
        </div>
      )}
    </div>
  )
}

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("Failed to fetch")
    return r.json()
  })

function formatPrice(price: number): string {
  return `KES ${price.toLocaleString()}`
}

interface ProductPageData {
  product: Product
  related: Product[]
}

export function ProductDetailPage({ slug }: { slug: string }) {
  return (
    <QuickViewProvider>
      <ProductDetailPageInner slug={slug} />
      <QuickViewModal />
    </QuickViewProvider>
  )
}

function ProductDetailPageInner({ slug }: { slug: string }) {
  const { data, error, isLoading } = useSWR<ProductPageData>(`/api/products/${slug}`, fetcher)
  const product = data?.product || null
  const related = data?.related || []
  const { addItem } = useCart()
  const { toggleItem, isInWishlist } = useWishlist()
  const { whatsappNumber } = useStoreContact()
  const wishlisted = product ? isInWishlist(product.id) : false
  const [selectedImage, setSelectedImage] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [selectedVariations, setSelectedVariations] = useState<Record<string, string>>({})
  const [added, setAdded] = useState(false)
  const recentlyViewed = useRecentlyViewed(product?.id)

  // Persist this product to recently-viewed
  useEffect(() => {
    if (product) rememberProduct(product)
  }, [product])

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: CREAM }}>
        <TopBar />
        <Navbar />
        <main className="flex-1 grid place-items-center">
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-8 h-8 rounded-full animate-rx-loader-ring"
              style={{
                background: `conic-gradient(from 0deg, ${WINE} 0%, ${WINE_SOFT} 50%, transparent 100%)`,
                WebkitMask:
                  "radial-gradient(circle, transparent 55%, #000 56%)",
                mask: "radial-gradient(circle, transparent 55%, #000 56%)",
              }}
            />
            <p className="text-sm" style={{ color: WINE_SOFT }}>
              Loading product…
            </p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: CREAM }}>
        <TopBar />
        <Navbar />
        <main className="flex-1 grid place-items-center">
          <div className="text-center">
            <h1 className="text-2xl font-serif font-bold" style={{ color: WINE }}>
              Product Not Found
            </h1>
            <p className="text-sm text-neutral-500 mt-2">
              This product may have been removed or the link is incorrect.
            </p>
            <Link
              href="/shop"
              className="text-sm mt-4 inline-block underline"
              style={{ color: WINE }}
            >
              Back to Shop
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const handleAddToCart = () => {
    addItem(
      product,
      quantity,
      Object.keys(selectedVariations).length > 0 ? selectedVariations : undefined,
    )
    setAdded(true)
    setTimeout(() => setAdded(false), 1600)
  }

  const productUrl =
    typeof window !== "undefined" ? `${window.location.origin}/product/${product.slug}` : ""
  const productImage = product.images[0] || ""
  const whatsappMessage = encodeURIComponent(
    `Hi! I'd like to order:\n\n*${product.name}*\nPrice: ${formatPrice(product.price)}\nQuantity: ${quantity}${
      Object.entries(selectedVariations).length > 0
        ? `\n${Object.entries(selectedVariations).map(([k, v]) => `${k}: ${v}`).join("\n")}`
        : ""
    }\n\nProduct: ${productUrl}\nImage: ${productImage}\n\nPlease confirm availability.`,
  )

  // Pseudo-stable rating + sold count derived from id so it's consistent.
  const seed = Array.from(product.id).reduce((s, c) => s + c.charCodeAt(0), 0)
  const ratingValue = Number((((seed % 30) + 35) / 10).toFixed(1)) // 3.5–6.4 → clamp
  const rating = Math.min(5, Math.max(3.5, ratingValue))
  const ratingsCount = (seed % 87) + 4
  const reviewsCount = Math.max(1, Math.floor(ratingsCount / 6))
  const soldLast7 = (seed % 22) + 5

  return (
    <div className="min-h-screen flex flex-col" style={{ background: CREAM }}>
      <TopBar />
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-[1280px] px-4 lg:px-6 pt-6 pb-12">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-[12px] text-neutral-500 mb-6 flex-wrap">
            <Link href="/" className="hover:text-[color:var(--ink)] transition-colors" style={{ ["--ink" as never]: WINE }}>
              Home
            </Link>
            <ChevronRight className="h-3 w-3" />
            <Link href="/shop" className="hover:text-[color:var(--ink)] transition-colors" style={{ ["--ink" as never]: WINE }}>
              Products
            </Link>
            <ChevronRight className="h-3 w-3" />
            <Link
              href={`/shop?category=${product.categorySlug}`}
              className="hover:text-[color:var(--ink)] transition-colors"
              style={{ ["--ink" as never]: WINE }}
            >
              {product.category}
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span style={{ color: WINE }} className="font-medium truncate max-w-[260px]">
              {product.name}
            </span>
          </nav>

          {/* Main grid: gallery | info | sticky purchase card */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
            {/* Gallery */}
            <div className="lg:col-span-5">
              <div className="flex gap-3">
                <div className="hidden sm:flex flex-col gap-3">
                  {product.images.map((img, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedImage(i)}
                      aria-label={`View image ${i + 1}`}
                      className="relative w-16 h-16 lg:w-20 lg:h-20 overflow-hidden rounded-xl transition-all"
                      style={{
                        background: "#FFF1E6",
                        border:
                          selectedImage === i
                            ? `2px solid ${WINE}`
                            : `1px solid ${PEACH_BORDER}`,
                        boxShadow:
                          selectedImage === i
                            ? "0 8px 18px -10px rgba(61,8,20,0.35)"
                            : "none",
                      }}
                    >
                      {isVideoUrl(img) ? (
                        <>
                          <video
                            src={img}
                            muted
                            playsInline
                            preload="metadata"
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 grid place-items-center">
                            <Play className="h-3 w-3 text-white drop-shadow" />
                          </div>
                        </>
                      ) : (
                        <ProductImage
                          src={img || "/placeholder.svg"}
                          alt={`${product.name} view ${i + 1}`}
                          fill
                          loaderSize="sm"
                          className="object-contain p-1"
                        />
                      )}
                    </button>
                  ))}
                </div>

                <div
                  className="relative flex-1 aspect-square overflow-hidden rounded-2xl group"
                  style={{
                    background:
                      "linear-gradient(155deg, #FFF6EB 0%, #FFE9D4 100%)",
                    border: `1px solid ${PEACH_BORDER}`,
                    boxShadow:
                      "0 1px 0 rgba(255,255,255,0.7) inset, 0 24px 60px -30px rgba(61,8,20,0.35)",
                  }}
                >
                  {/* share button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({ title: product.name, url: productUrl }).catch(() => {})
                      } else if (navigator.clipboard) {
                        navigator.clipboard.writeText(productUrl)
                      }
                    }}
                    aria-label="Share product"
                    className="absolute top-3 left-3 z-10 grid place-items-center h-9 w-9 rounded-full transition-transform hover:scale-105"
                    style={{
                      background: "rgba(255,255,255,0.85)",
                      backdropFilter: "blur(6px)",
                      border: `1px solid ${PEACH_BORDER}`,
                    }}
                  >
                    <Share2 className="h-4 w-4" style={{ color: WINE }} />
                  </button>

                  {/* zoom icon – visible on hover */}
                  {!isVideoUrl(product.images[selectedImage]) && (
                    <button
                      type="button"
                      aria-label="Zoom image"
                      onClick={() => setLightboxOpen(true)}
                      className="absolute bottom-3 right-3 z-10 grid place-items-center h-9 w-9 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
                      style={{
                        background: "rgba(255,255,255,0.88)",
                        backdropFilter: "blur(6px)",
                        border: `1px solid ${PEACH_BORDER}`,
                      }}
                    >
                      <ZoomIn className="h-4 w-4" style={{ color: WINE }} />
                    </button>
                  )}

                  {isVideoUrl(product.images[selectedImage]) ? (
                    <video
                      key={selectedImage}
                      src={product.images[selectedImage]}
                      controls
                      playsInline
                      className="absolute inset-0 w-full h-full object-contain bg-black"
                    />
                  ) : (
                    <button
                      type="button"
                      aria-label="Open full image"
                      onClick={() => setLightboxOpen(true)}
                      className="absolute inset-0 w-full h-full"
                      style={{ cursor: "zoom-in" }}
                    >
                      <ProductImage
                        key={selectedImage}
                        src={product.images[selectedImage] || "/placeholder.svg"}
                        alt={product.name}
                        className="object-contain p-6 transition-transform duration-300 group-hover:scale-[1.04]"
                      />
                    </button>
                  )}

                  {product.isOnOffer && product.offerPercentage && (
                    <span
                      className="absolute top-3 right-3 text-[11px] font-semibold tracking-wide uppercase px-2.5 py-1 rounded-full text-white"
                      style={{ background: ACCENT_ORANGE }}
                    >
                      -{product.offerPercentage}%
                    </span>
                  )}
                </div>
              </div>

              {/* mobile thumbnail row */}
              <div className="sm:hidden mt-3 flex gap-2 overflow-x-auto pb-1">
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedImage(i)}
                    className="relative shrink-0 w-16 h-16 overflow-hidden rounded-lg"
                    style={{
                      border:
                        selectedImage === i
                          ? `2px solid ${WINE}`
                          : `1px solid ${PEACH_BORDER}`,
                      background: "#FFF1E6",
                    }}
                    aria-label={`View image ${i + 1}`}
                  >
                    <ProductImage
                      src={img || "/placeholder.svg"}
                      alt=""
                      fill
                      loaderSize="sm"
                      className="object-contain p-1"
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Info */}
            <div className="lg:col-span-4">
              <h1
                className="text-2xl lg:text-[28px] font-bold leading-tight tracking-tight"
                style={{ color: WINE, fontFamily: "var(--font-serif, ui-serif, Georgia, serif)" }}
              >
                {product.name}
              </h1>

              <Link
                href={`/shop?brand=${encodeURIComponent(product.tags[0] ?? "")}`}
                className="inline-block mt-2 text-[13px] font-medium hover:underline"
                style={{ color: WINE_SOFT }}
              >
                Visit {product.tags[0] ? product.tags[0].toUpperCase() : "Shaniid RX"} Store
              </Link>

              {/* Rating row */}
              <div className="flex items-center gap-3 mt-3 text-[13px]">
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className="h-4 w-4"
                      style={{
                        color: i < Math.round(rating) ? ACCENT_AMBER : "#E8D9C9",
                        fill: i < Math.round(rating) ? ACCENT_AMBER : "transparent",
                      }}
                    />
                  ))}
                  <span className="ml-1 font-semibold" style={{ color: WINE }}>
                    {rating.toFixed(1)}
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 text-neutral-500">
                  <ThumbsUp className="h-3.5 w-3.5" />
                  {ratingsCount} Ratings
                </span>
                <span className="inline-flex items-center gap-1 text-neutral-500">
                  <MessageSquare className="h-3.5 w-3.5" />
                  {reviewsCount} Reviews
                </span>
                <button
                  type="button"
                  className="ml-auto text-[12px] font-medium hover:underline"
                  style={{ color: WINE_SOFT }}
                >
                  Write a Review
                </button>
              </div>

              {/* Stock pill */}
              <div className="mt-4">
                {product.inStock ? (
                  <span
                    className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1 rounded-full"
                    style={{
                      color: SUCCESS,
                      background: "#E6F4EE",
                      border: "1px solid #BFE3D2",
                    }}
                  >
                    <Check className="h-3.5 w-3.5" /> In Stock
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1 rounded-full"
                    style={{ color: "#9b1c1c", background: "#FBEAEA", border: "1px solid #F1C9C9" }}
                  >
                    Out of Stock
                  </span>
                )}
              </div>

              {/* Variations */}
              {product.variations &&
                product.variations.map((variation) => (
                  <div key={variation.type} className="mt-6">
                    <p className="text-sm font-medium mb-2" style={{ color: WINE }}>
                      {variation.type}
                      {selectedVariations[variation.type] && (
                        <span className="text-neutral-500 font-normal ml-2">
                          — {selectedVariations[variation.type]}
                        </span>
                      )}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {variation.options.map((opt) => {
                        const active = selectedVariations[variation.type] === opt
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() =>
                              setSelectedVariations((prev) => ({ ...prev, [variation.type]: opt }))
                            }
                            className="px-4 py-2 text-sm rounded-full transition-all"
                            style={{
                              background: active ? WINE : "white",
                              color: active ? "white" : WINE,
                              border: `1px solid ${active ? WINE : PEACH_BORDER}`,
                              boxShadow: active
                                ? "0 8px 18px -10px rgba(61,8,20,0.45)"
                                : "none",
                            }}
                          >
                            {opt}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}

              {/* Tags */}
              {product.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-6">
                  {product.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[11px] px-2.5 py-1 rounded-full"
                      style={{
                        color: WINE_SOFT,
                        background: "#FFF1E2",
                        border: `1px solid ${PEACH_BORDER}`,
                      }}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Purchase card */}
            <aside className="lg:col-span-3">
              <div className="lg:sticky lg:top-6">
                <div
                  className="relative rounded-2xl p-5 lg:p-6"
                  style={{
                    background:
                      "linear-gradient(160deg, #FFFFFF 0%, #FFF6EB 100%)",
                    border: `1px solid ${PEACH_BORDER}`,
                    boxShadow:
                      "0 1px 0 rgba(255,255,255,0.7) inset, 0 24px 60px -30px rgba(61,8,20,0.35)",
                  }}
                >
                  {product.isOnOffer && product.offerPercentage && (
                    <div className="absolute -top-3 left-5">
                      <span
                        className="text-[11px] font-semibold tracking-wide px-3 py-1.5 rounded-full text-white"
                        style={{
                          background: `linear-gradient(135deg, #E11D48 0%, ${ACCENT_ORANGE} 100%)`,
                          boxShadow: "0 6px 16px -8px rgba(225,29,72,0.55)",
                        }}
                      >
                        {product.offerPercentage}% Off
                      </span>
                    </div>
                  )}

                  {/* Price */}
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-[26px] font-extrabold leading-none" style={{ color: WINE }}>
                      {formatPrice(product.price)}
                    </span>
                  </div>
                  {product.originalPrice && (
                    <div className="mt-1 text-sm text-neutral-400 line-through">
                      {formatPrice(product.originalPrice)}
                    </div>
                  )}

                  {/* Sold metric */}
                  <div
                    className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-full"
                    style={{
                      color: WINE,
                      background: "#FFF1E2",
                      border: `1px solid ${PEACH_BORDER}`,
                    }}
                  >
                    <ThumbsUp className="h-3.5 w-3.5" />
                    {soldLast7} sold in the last 7 days
                  </div>

                  {/* Delivery */}
                  <div className="mt-4 text-sm leading-relaxed">
                    <p className="font-semibold" style={{ color: WINE }}>
                      Delivery within 4 hours
                    </p>
                    <p className="text-neutral-500 mt-0.5">
                      on all orders placed between{" "}
                      <span className="font-semibold" style={{ color: SUCCESS }}>
                        8:00 AM
                      </span>{" "}
                      &amp;{" "}
                      <span className="font-semibold" style={{ color: SUCCESS }}>
                        8:00 PM
                      </span>
                    </p>
                  </div>

                  {/* Quantity */}
                  <div className="mt-5">
                    <p className="text-xs font-semibold mb-1.5 text-neutral-500 uppercase tracking-wider">
                      Quantity
                    </p>
                    <div
                      className="inline-flex items-center rounded-full overflow-hidden"
                      style={{ border: `1px solid ${PEACH_BORDER}`, background: "white" }}
                    >
                      <button
                        type="button"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="w-9 h-9 grid place-items-center hover:bg-[#FFF1E2] transition-colors"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-4 w-4" style={{ color: WINE }} />
                      </button>
                      <span
                        className="w-10 h-9 grid place-items-center text-sm font-semibold"
                        style={{ color: WINE }}
                      >
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuantity(quantity + 1)}
                        className="w-9 h-9 grid place-items-center hover:bg-[#FFF1E2] transition-colors"
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-4 w-4" style={{ color: WINE }} />
                      </button>
                    </div>
                  </div>

                  {/* Actions */}
                  <button
                    onClick={handleAddToCart}
                    disabled={!product.inStock}
                    className="mt-5 w-full h-12 rounded-full text-sm font-semibold transition-transform hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 text-white"
                    style={{
                      background: added
                        ? `linear-gradient(135deg, ${SUCCESS} 0%, #0A6F50 100%)`
                        : `linear-gradient(135deg, ${WINE} 0%, ${WINE_SOFT} 100%)`,
                      boxShadow: "0 14px 28px -14px rgba(61,8,20,0.5)",
                    }}
                  >
                    {added ? (
                      <>
                        <Check className="h-4 w-4" /> Added to Cart
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="h-4 w-4" /> Add To Cart
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => product && toggleItem(product)}
                    className="mt-3 w-full h-12 rounded-full text-sm font-semibold transition-colors inline-flex items-center justify-center gap-2"
                    style={{
                      background: wishlisted ? "#FFF1E2" : "white",
                      color: WINE,
                      border: `1px solid ${PEACH_BORDER}`,
                    }}
                  >
                    <Heart
                      className="h-4 w-4"
                      style={{
                        color: WINE,
                        fill: wishlisted ? WINE : "transparent",
                      }}
                    />
                    {wishlisted ? "Added To Wish List" : "Add To Wish List"}
                  </button>

                  <a
                    href={`https://wa.me/${whatsappNumber}?text=${whatsappMessage}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 w-full h-11 rounded-full text-[13px] font-semibold transition-colors inline-flex items-center justify-center gap-2 text-white"
                    style={{ background: "#25D366" }}
                  >
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" />
                    </svg>
                    Order via WhatsApp
                  </a>

                  {/* Trust */}
                  <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t" style={{ borderColor: PEACH_BORDER }}>
                    <TrustChip icon={Truck} label="Fast Delivery" />
                    <TrustChip icon={Shield} label="Verified" />
                    <TrustChip icon={Clock} label="24/7 Support" />
                  </div>
                </div>
              </div>
            </aside>
          </div>

          {/* Sub-nav strip */}
          <div className="mt-10">
            <div
              className="flex items-center gap-3 lg:gap-6 overflow-x-auto rounded-2xl px-4 lg:px-6 py-3"
              style={{
                background: "white",
                border: `1px solid ${PEACH_BORDER}`,
                boxShadow: "0 14px 30px -22px rgba(61,8,20,0.18)",
              }}
            >
              <SubNavLink href={`/shop?category=${product.categorySlug}`} label="Shop by Category" />
              <SubNavLink href="/shop" label="Shop by Condition" />
              <SubNavLink href="/shop" label="Shop by Brand" />
              <SubNavLink href="/services" label="Services" />
              <SubNavLink href="/services" label="My Health Center" />
              <div className="ml-auto hidden md:flex items-center gap-2">
                <Link
                  href="/talk-to-doctor"
                  className="inline-flex items-center gap-1.5 px-4 h-9 rounded-full text-[12.5px] font-semibold whitespace-nowrap text-white transition-transform hover:scale-[1.02]"
                  style={{
                    background: `linear-gradient(135deg, ${WINE} 0%, ${WINE_SOFT} 100%)`,
                    boxShadow: "0 10px 20px -10px rgba(61,8,20,0.4)",
                  }}
                >
                  <Stethoscope className="h-3.5 w-3.5" /> Speak to a Doctor
                </Link>
                <Link
                  href="/prescription"
                  className="inline-flex items-center gap-1.5 px-4 h-9 rounded-full text-[12.5px] font-semibold whitespace-nowrap text-white transition-transform hover:scale-[1.02]"
                  style={{
                    background: `linear-gradient(135deg, ${ACCENT_ORANGE} 0%, #E04E10 100%)`,
                    boxShadow: "0 10px 20px -10px rgba(249,115,22,0.45)",
                  }}
                >
                  <Upload className="h-3.5 w-3.5" /> Upload a Prescription
                </Link>
              </div>
            </div>
          </div>

          {/* Description */}
          <section className="mt-8">
            <div
              className="rounded-2xl p-6 lg:p-8"
              style={{
                background: "white",
                border: `1px solid ${PEACH_BORDER}`,
                boxShadow: "0 14px 30px -22px rgba(61,8,20,0.18)",
              }}
            >
              <h2 className="text-lg font-bold mb-3" style={{ color: WINE }}>
                Product Description
              </h2>
              <p className="text-sm leading-relaxed text-neutral-700 max-w-3xl">
                {product.description}
              </p>

              <div
                className="mt-5 flex items-start gap-2 p-3 rounded-xl"
                style={{ background: "#FFF7E6", border: "1px solid #F4E1B8" }}
              >
                <Shield className="h-4 w-4 mt-0.5 shrink-0" style={{ color: ACCENT_AMBER }} />
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Always read the label and use only as directed. Consult a pharmacist or doctor
                  before use if you are pregnant, breastfeeding, or taking other medication.
                </p>
              </div>
            </div>
          </section>

          {/* Similar Products */}
          {related.length > 0 && (
            <section className="mt-12">
              <div className="flex items-end justify-between mb-5">
                <h2
                  className="text-2xl lg:text-3xl font-bold tracking-tight"
                  style={{ color: WINE, fontFamily: "var(--font-serif, ui-serif, Georgia, serif)" }}
                >
                  Similar Products
                </h2>
                <Link href="/shop" className="text-[13px] font-semibold hover:underline" style={{ color: WINE_SOFT }}>
                  View all →
                </Link>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 lg:gap-5">
                {related.slice(0, 5).map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </section>
          )}

          {/* Recently Viewed */}
          {recentlyViewed.length > 0 && (
            <section className="mt-12">
              <div className="flex items-end justify-between mb-5">
                <h2
                  className="text-2xl lg:text-3xl font-bold tracking-tight"
                  style={{ color: WINE, fontFamily: "var(--font-serif, ui-serif, Georgia, serif)" }}
                >
                  Recently Viewed
                </h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 lg:gap-5">
                {recentlyViewed.slice(0, 5).map((p) => (
                  <ProductCard key={p.id} product={p as Product} />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Compact newsletter banner */}
        <CompactNewsletter />
      </main>

      {/* Sticky mobile CTA */}
      <a
        href={`https://wa.me/${whatsappNumber}?text=${whatsappMessage}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Order ${product.name} via WhatsApp`}
        className="lg:hidden fixed bottom-5 left-5 z-40 inline-flex items-center gap-2 rounded-full px-4 py-2.5 shadow-lg text-white text-xs"
        style={{ background: "#25D366" }}
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" />
        </svg>
        <span className="font-medium whitespace-nowrap">Order via WhatsApp</span>
      </a>

      <Footer />

      {/* Image lightbox */}
      {lightboxOpen && (
        <ImageLightbox
          images={product.images}
          startIndex={selectedImage}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  )
}

function TrustChip({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  label: string
}) {
  return (
    <div className="flex flex-col items-center text-center gap-1">
      <Icon className="h-4 w-4" style={{ color: WINE_SOFT }} />
      <p className="text-[10.5px] leading-tight text-neutral-500 font-medium">{label}</p>
    </div>
  )
}

function SubNavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="text-[13px] font-medium whitespace-nowrap hover:opacity-80 transition-opacity"
      style={{ color: WINE }}
    >
      {label}
    </Link>
  )
}
