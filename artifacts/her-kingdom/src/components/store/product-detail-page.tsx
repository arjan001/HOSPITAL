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
  const wishlisted = product ? isInWishlist(product.id) : false
  const [selectedImage, setSelectedImage] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [selectedVariations, setSelectedVariations] = useState<Record<string, string>>({})
  const [added, setAdded] = useState(false)
  const [activeTab, setActiveTab] = useState<"overview" | "spec" | "howto" | "precautions" | "reviews">("overview")
  const [reviewSort, setReviewSort] = useState("latest")
  // Hover zoom state for main product image
  const [imgHovered, setImgHovered] = useState(false)
  const [zoomOrigin, setZoomOrigin] = useState({ x: 50, y: 50 })
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const mainImgRef = useRef<HTMLDivElement>(null)
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
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[13px] text-neutral-500 mb-6 flex-wrap">
            <Link href="/" className="hover:text-neutral-900 transition-colors">
              Home
            </Link>
            <span className="text-neutral-300">/</span>
            <Link href="/shop" className="hover:text-neutral-900 transition-colors">
              Products
            </Link>
            <span className="text-neutral-300">/</span>
            <Link
              href={`/shop?category=${product.categorySlug}`}
              className="hover:text-neutral-900 transition-colors"
            >
              {product.category}
            </Link>
            <span className="text-neutral-300">/</span>
            <span className="font-medium text-neutral-900 truncate max-w-[280px]">
              {product.name}
            </span>
          </nav>

          {/* Main grid: gallery | info | sticky purchase card */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
            {/* Gallery */}
            <div className="lg:col-span-5">
              <div className="flex flex-col gap-3">
                <div
                  ref={mainImgRef}
                  className="relative w-full aspect-square overflow-hidden rounded-2xl"
                  style={{
                    background: "linear-gradient(155deg, #FFF6EB 0%, #FFE9D4 100%)",
                    border: `1px solid ${PEACH_BORDER}`,
                    boxShadow: "0 1px 0 rgba(255,255,255,0.7) inset, 0 24px 60px -30px rgba(61,8,20,0.35)",
                    cursor: imgHovered ? "zoom-out" : "zoom-in",
                  }}
                  onMouseEnter={() => !isVideoUrl(product.images[selectedImage]) && setImgHovered(true)}
                  onMouseLeave={() => { setImgHovered(false); setZoomOrigin({ x: 50, y: 50 }) }}
                  onMouseMove={(e) => {
                    if (!mainImgRef.current || isVideoUrl(product.images[selectedImage])) return
                    const rect = mainImgRef.current.getBoundingClientRect()
                    setZoomOrigin({
                      x: ((e.clientX - rect.left) / rect.width) * 100,
                      y: ((e.clientY - rect.top) / rect.height) * 100,
                    })
                  }}
                  onClick={() => !isVideoUrl(product.images[selectedImage]) && setLightboxOpen(true)}
                >
                  {/* Share button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (navigator.share) {
                        navigator.share({ title: product.name, url: productUrl }).catch(() => {})
                      } else if (navigator.clipboard) {
                        navigator.clipboard.writeText(productUrl)
                      }
                    }}
                    aria-label="Share product"
                    className="absolute top-3 left-3 z-10 grid place-items-center h-9 w-9 rounded-full transition-transform hover:scale-105"
                    style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(6px)", border: `1px solid ${PEACH_BORDER}` }}
                  >
                    <Share2 className="h-4 w-4" style={{ color: WINE }} />
                  </button>

                  {/* Fullscreen hint */}
                  {!isVideoUrl(product.images[selectedImage]) && (
                    <div
                      className="absolute bottom-3 right-3 z-10 flex items-center gap-1 text-[10px] font-medium px-2.5 py-1.5 rounded-full pointer-events-none transition-opacity"
                      style={{ background: "rgba(255,255,255,0.85)", color: WINE, opacity: imgHovered ? 0 : 1 }}
                    >
                      <ZoomIn className="h-3 w-3" /> Hover to zoom
                    </div>
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
                    <div className="absolute inset-0 overflow-hidden p-6">
                      <img
                        key={selectedImage}
                        src={product.images[selectedImage] || "/placeholder.svg"}
                        alt={product.name}
                        draggable={false}
                        className="w-full h-full object-contain select-none"
                        style={{
                          transform: imgHovered ? "scale(2.2)" : "scale(1)",
                          transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%`,
                          transition: imgHovered ? "transform 0.08s ease-out" : "transform 0.25s ease-out",
                        }}
                      />
                    </div>
                  )}

                  {product.isOnOffer && product.offerPercentage && (
                    <span
                      className="absolute top-3 right-3 z-10 text-[11px] font-semibold tracking-wide uppercase px-2.5 py-1 rounded-full text-white"
                      style={{ background: ACCENT_ORANGE }}
                    >
                      -{product.offerPercentage}%
                    </span>
                  )}
                </div>

                {/* Thumbnail row — below main image (matches reference) */}
                <div className="flex gap-2.5 overflow-x-auto pb-1">
                  {product.images.map((img, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedImage(i)}
                      aria-label={`View image ${i + 1}`}
                      className="relative shrink-0 w-16 h-16 lg:w-[72px] lg:h-[72px] overflow-hidden rounded-lg transition-all"
                      style={{
                        background: "#FAFAFA",
                        border:
                          selectedImage === i
                            ? `2px solid ${WINE}`
                            : `1px solid #E5E7EB`,
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
                  onClick={() => setReviewModalOpen(true)}
                  className="ml-auto text-[13px] font-medium underline underline-offset-2 hover:opacity-80"
                  style={{ color: "#0EA5E9" }}
                >
                  Write a Review
                </button>
              </div>

              {/* Stock — simple text (matches reference) */}
              <div className="mt-3">
                {product.inStock ? (
                  <span className="text-[13px] font-medium" style={{ color: SUCCESS }}>
                    In Stock
                  </span>
                ) : (
                  <span className="text-[13px] font-medium text-red-600">
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

                  {/* Actions — peach pill + outlined wishlist (matches reference) */}
                  <button
                    onClick={handleAddToCart}
                    disabled={!product.inStock}
                    className="mt-5 w-full h-11 rounded-full text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                    style={{
                      background: added ? "#E6F4EE" : "#F2DCC8",
                      color: added ? SUCCESS : WINE,
                    }}
                  >
                    {added ? (
                      <>
                        <Check className="h-4 w-4" /> Added to Cart
                      </>
                    ) : (
                      <>
                        Add To Cart
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => product && toggleItem(product)}
                    className="mt-2.5 w-full h-11 rounded-full text-sm font-semibold transition-colors inline-flex items-center justify-center gap-2 bg-white hover:bg-neutral-50"
                    style={{
                      color: WINE,
                      border: `1px solid #E5E7EB`,
                    }}
                  >
                    {wishlisted ? (
                      <Heart className="h-4 w-4" style={{ color: WINE, fill: WINE }} />
                    ) : null}
                    {wishlisted ? "Added To Wish List" : "Add To Wish List"}
                  </button>

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


          {/* ── Product Content Tabs ── */}
          {(() => {
            const REVIEWERS = [
              { name: "Shiru Ndung'u", initials: "SN", color: "#F97316" },
              { name: "James Mwangi",  initials: "JM", color: "#8B5CF6" },
              { name: "Amina Hassan",  initials: "AH", color: "#0EA5E9" },
              { name: "Peter Kamau",   initials: "PK", color: "#10B981" },
              { name: "Grace Wanjiku", initials: "GW", color: "#F43F5E" },
            ]
            const REVIEW_TEXTS = [
              `the best ${product.category.toLowerCase()} product I have used ?? Highly recommended!`,
              "Very effective. I noticed results within a few days and delivery was super fast.",
              "Good quality for the price. Shaniid RX packaging is always neat and discreet.",
              "Exactly what I needed. The pharmacist guidance was also really helpful.",
              "Will definitely reorder. Works as described and arrived ahead of schedule.",
            ]
            const DATES = ["15-03-2026", "02-04-2026", "18-02-2026", "07-01-2026", "28-03-2026"]
            const HELPFUL = [100, 48, 67, 23, 89]

            const reviewsData = Array.from({ length: Math.min(reviewsCount, 3) }, (_, i) => {
              const ri = (seed + i * 7) % REVIEWERS.length
              const ti = (seed + i * 3) % REVIEW_TEXTS.length
              const di = (seed + i * 5) % DATES.length
              const hi = (seed + i * 11) % HELPFUL.length
              return {
                ...REVIEWERS[ri],
                text: REVIEW_TEXTS[ti],
                date: DATES[di],
                helpful: HELPFUL[hi],
                stars: i === 0 ? Math.ceil(rating) : (((seed + i) % 3 === 0) ? 4 : 5),
                badge: i === 0 ? "Most Helpful" : null,
              }
            })

            const starBreakdown = [5, 4, 3, 2, 1].map((s) => {
              const pct = s === 5 ? 65 : s === 4 ? 25 : s === 3 ? 7 : s === 2 ? 2 : 1
              return { star: s, pct }
            })

            const TABS = [
              { id: "overview",     label: "Overview" },
              { id: "spec",         label: "Product specification" },
              { id: "howto",        label: "How to use" },
              { id: "precautions",  label: "Precautions & Disclaimer" },
              { id: "reviews",      label: "Reviews" },
            ] as const

            return (
              <section className="mt-8">
                {/* Tab bar — clean underline style matching reference */}
                <div
                  className="flex items-center gap-0 overflow-x-auto border-b"
                  style={{ borderColor: "#e5e7eb" }}
                >
                  {TABS.map((tab) => {
                    const isActive = activeTab === tab.id
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id as typeof activeTab)}
                        className="relative px-4 py-3 text-sm whitespace-nowrap transition-colors"
                        style={{
                          color: isActive ? "#111827" : "#6b7280",
                          fontWeight: isActive ? 600 : 400,
                          borderBottom: isActive ? "2px solid #111827" : "2px solid transparent",
                          marginBottom: -1,
                          background: "transparent",
                        }}
                      >
                        {tab.label}
                        {tab.id === "reviews" && (
                          <span className="ml-1.5 text-[11px] text-neutral-400">
                            ({reviewsCount})
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>

                {/* Tab content — white, no card styling */}
                <div className="pt-6 pb-8"  style={{ background: "white" }}>
                  {/* ── Overview ── plain paragraph layout matching reference */}
                  {activeTab === "overview" && (
                    <div className="max-w-4xl">
                      <p className="text-[14px] leading-[1.7] text-neutral-700 whitespace-pre-line">
                        {product.description}
                      </p>
                    </div>
                  )}

                  {/* ── Product specification ── */}
                  {activeTab === "spec" && (
                    <div className="max-w-3xl">
                      <table className="w-full text-sm border-collapse">
                        <tbody>
                          {[
                            ["Category",      product.category],
                            ["Brand",         product.tags[0] ?? "Shaniid RX"],
                            ["Price",         formatPrice(product.price)],
                            ["Availability",  product.inStock ? "In Stock" : "Out of Stock"],
                            ["SKU",           product.id.slice(0, 8).toUpperCase()],
                            ["Tags",          product.tags.join(", ") || "—"],
                          ].map(([label, value], i) => (
                            <tr key={label} className="border-b last:border-b-0" style={{ borderColor: "#f3f4f6" }}>
                              <td className="py-3 pr-6 text-neutral-500 font-medium w-44" style={{ background: i % 2 === 0 ? "#fafafa" : "white" }}>
                                {label}
                              </td>
                              <td className="py-3 text-neutral-800" style={{ background: i % 2 === 0 ? "#fafafa" : "white" }}>
                                {value}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* ── How to use ── */}
                  {activeTab === "howto" && (
                    <div className="max-w-3xl space-y-5">
                      <div>
                        <h3 className="text-sm font-semibold text-neutral-800 mb-3">Directions for Use</h3>
                        <ol className="space-y-3 text-sm text-neutral-600 leading-relaxed list-none">
                          {[
                            "Read the full product label carefully before use.",
                            "Follow the dosage instructions as indicated on the packaging or as directed by your pharmacist.",
                            "Take with a full glass of water unless otherwise specified.",
                            "Do not crush, chew, or break tablets unless instructed to do so.",
                            "If a dose is missed, take it as soon as you remember — do not double up.",
                            "Complete the full course of treatment even if symptoms improve.",
                          ].map((step, i) => (
                            <li key={i} className="flex items-start gap-3">
                              <span className="flex-shrink-0 w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center text-white mt-0.5" style={{ background: WINE }}>
                                {i + 1}
                              </span>
                              {step}
                            </li>
                          ))}
                        </ol>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-neutral-800 mb-2">Storage</h3>
                        <p className="text-sm text-neutral-600 leading-relaxed">
                          Store in a cool, dry place below 25&deg;C. Keep away from direct sunlight, heat, and moisture. Keep out of reach of children.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* ── Precautions & Disclaimer ── */}
                  {activeTab === "precautions" && (
                    <div className="max-w-3xl space-y-7">
                      <div>
                        <h3 className="text-sm font-semibold text-neutral-800 mb-3">Warnings &amp; Precautions</h3>
                        <ul className="space-y-2.5 text-sm text-neutral-600 leading-relaxed">
                          {[
                            "Keep out of reach of children.",
                            "Do not exceed the recommended dose unless advised by a healthcare professional.",
                            "Stop use and consult a pharmacist or doctor if symptoms persist or worsen.",
                            "If you are pregnant, planning to become pregnant, or breastfeeding, seek medical advice before use.",
                            "Do not use if you have a known allergy to any of the listed ingredients.",
                            "Store in a cool, dry place away from direct sunlight and moisture.",
                          ].map((item, i) => (
                            <li key={i} className="flex items-start gap-2.5">
                              <span className="mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-neutral-400" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-neutral-800 mb-3">Drug Interactions</h3>
                        <ul className="space-y-2.5 text-sm text-neutral-600 leading-relaxed">
                          {[
                            "Inform your doctor or pharmacist of all medications you are currently taking.",
                            "This product may interact with certain prescription drugs, supplements, or herbal remedies.",
                            "Always disclose your full medication list before starting any new treatment.",
                          ].map((item, i) => (
                            <li key={i} className="flex items-start gap-2.5">
                              <span className="mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-neutral-400" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-neutral-800 mb-3">Disclaimer</h3>
                        <ul className="space-y-2.5 text-sm text-neutral-600 leading-relaxed">
                          {[
                            "This product is intended to supplement, not replace, professional medical advice, diagnosis, or treatment.",
                            "Shaniid RX sources all products directly from licensed manufacturers and distributors verified by the Pharmacy and Poisons Board of Kenya.",
                            "Product information is for general informational purposes. Always consult a qualified healthcare provider for personal medical guidance.",
                          ].map((item, i) => (
                            <li key={i} className="flex items-start gap-2.5">
                              <span className="mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-neutral-400" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* ── Reviews ── */}
                  {activeTab === "reviews" && (
                    <div>
                      {/* Top row: summary + sort */}
                      <div className="flex flex-col sm:flex-row sm:items-start gap-6 pb-6 border-b" style={{ borderColor: PEACH_BORDER }}>
                        {/* Left: aggregate */}
                        <div className="flex-shrink-0 w-48">
                          <div className="flex items-baseline gap-1.5 mb-1">
                            <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                            <span className="text-3xl font-black" style={{ color: WINE }}>{rating.toFixed(1)}</span>
                            <span className="text-sm text-neutral-400">/ 5.0</span>
                          </div>
                          <p className="text-xs text-neutral-500 mb-4">
                            {ratingsCount} Ratings · {reviewsCount} Reviews
                          </p>
                          <div className="space-y-1.5">
                            {starBreakdown.map(({ star, pct }) => (
                              <div key={star} className="flex items-center gap-2">
                                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 flex-shrink-0" />
                                <span className="text-[11px] w-2 text-neutral-500">{star}</span>
                                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "#F3F4F6" }}>
                                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "#F59E0B" }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Right: sort controls */}
                        <div className="flex-1 flex items-center gap-3 flex-wrap">
                          <div className="flex items-center gap-2 text-sm text-neutral-500">
                            <span>Sort By :</span>
                            <select
                              value={reviewSort}
                              onChange={(e) => setReviewSort(e.target.value)}
                              className="text-sm px-3 h-9 rounded-lg border outline-none"
                              style={{ borderColor: PEACH_BORDER, color: WINE, background: "white" }}
                            >
                              <option value="latest">Latest</option>
                              <option value="helpful">Most Helpful</option>
                              <option value="highest">Highest Rated</option>
                              <option value="lowest">Lowest Rated</option>
                            </select>
                          </div>
                          <button
                            type="button"
                            onClick={() => setReviewSort("latest")}
                            className="text-sm px-4 h-9 rounded-lg border transition-colors hover:bg-[#FFF1E2]"
                            style={{ borderColor: PEACH_BORDER, color: WINE }}
                          >
                            Clear Filter
                          </button>
                          <button
                            type="button"
                            onClick={() => setReviewModalOpen(true)}
                            className="ml-auto text-sm font-semibold underline underline-offset-2 hover:opacity-80"
                            style={{ color: "#0EA5E9" }}
                          >
                            Write a Review
                          </button>
                        </div>
                      </div>

                      {/* Review cards */}
                      <div className="mt-5 space-y-5">
                        {reviewsData.map((rev, i) => (
                          <div key={i} className="pb-5 border-b last:border-b-0 last:pb-0" style={{ borderColor: PEACH_BORDER }}>
                            <div className="flex items-start gap-3">
                              {/* Avatar */}
                              <div
                                className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                                style={{ background: rev.color }}
                              >
                                {rev.initials}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-semibold" style={{ color: WINE }}>{rev.name}</span>
                                  {rev.badge && (
                                    <span
                                      className="text-[11px] px-2 py-0.5 rounded-full font-semibold"
                                      style={{ background: "#EDE9FE", color: "#6D28D9" }}
                                    >
                                      {rev.badge}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-neutral-400 mt-0.5">{rev.date}</p>

                                {/* Stars */}
                                <div className="flex items-center gap-1 mt-2">
                                  {Array.from({ length: 5 }).map((_, si) => (
                                    <Star
                                      key={si}
                                      className="h-3.5 w-3.5"
                                      fill={si < rev.stars ? "#F59E0B" : "none"}
                                      style={{ color: "#F59E0B" }}
                                    />
                                  ))}
                                  <span className="text-xs text-neutral-500 ml-1">({rev.stars}.0)</span>
                                </div>

                                {/* Text */}
                                <p className="text-sm text-neutral-700 mt-2 leading-relaxed">{rev.text}</p>

                                {/* Actions */}
                                <div className="flex items-center gap-3 mt-3">
                                  <button
                                    type="button"
                                    className="text-xs font-medium hover:underline"
                                    style={{ color: SUCCESS }}
                                  >
                                    Helpful ({rev.helpful})
                                  </button>
                                  <span className="text-neutral-300 text-xs">|</span>
                                  <button
                                    type="button"
                                    className="text-xs text-neutral-400 hover:underline"
                                  >
                                    Report
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )
          })()}

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

      <Footer />

      {/* Image lightbox */}
      {lightboxOpen && (
        <ImageLightbox
          images={product.images}
          startIndex={selectedImage}
          onClose={() => setLightboxOpen(false)}
        />
      )}

      {/* Write Review modal */}
      {reviewModalOpen && (
        <WriteReviewModal
          productName={product.name}
          onClose={() => setReviewModalOpen(false)}
        />
      )}
    </div>
  )
}

// ─── Write Review Modal ──────────────────────────────────────────────────────
function WriteReviewModal({
  productName,
  onClose,
}: {
  productName: string
  onClose: () => void
}) {
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [description, setDescription] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  const ratingLabels = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"]
  const activeRating = hover || rating

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rating || !description.trim()) return
    setSubmitting(true)
    // Stub: simulate submit. Wire to API later.
    await new Promise((r) => setTimeout(r, 600))
    setSubmitting(false)
    setSubmitted(true)
    setTimeout(onClose, 1200)
  }

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center p-4"
      style={{ background: "rgba(15,5,10,0.55)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: "#F3F4F6" }}>
          <h3 className="text-lg font-bold" style={{ color: "#111827" }}>
            Product Review
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-neutral-400 hover:text-neutral-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {submitted ? (
          <div className="px-6 py-10 text-center">
            <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center" style={{ background: "#E6F4EE" }}>
              <Check className="h-6 w-6" style={{ color: SUCCESS }} />
            </div>
            <p className="mt-4 text-sm font-semibold text-neutral-800">Thank you for your review!</p>
            <p className="text-xs text-neutral-500 mt-1">It will appear after moderation.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
            {/* Rate this product */}
            <div>
              <label className="block text-[13px] font-medium text-neutral-700 mb-2">
                Rate This Product
              </label>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRating(n)}
                      onMouseEnter={() => setHover(n)}
                      onMouseLeave={() => setHover(0)}
                      aria-label={`${n} star${n > 1 ? "s" : ""}`}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className="h-6 w-6"
                        style={{
                          color: n <= activeRating ? "#F59E0B" : "#E5E7EB",
                          fill: n <= activeRating ? "#F59E0B" : "transparent",
                        }}
                      />
                    </button>
                  ))}
                </div>
                {activeRating > 0 && (
                  <span className="text-sm font-medium text-neutral-700 ml-1">
                    {ratingLabels[activeRating]}
                  </span>
                )}
              </div>
            </div>

            {/* Review description */}
            <div>
              <label htmlFor="review-desc" className="block text-[13px] font-medium text-neutral-700 mb-2">
                Review This Product
              </label>
              <textarea
                id="review-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description"
                rows={4}
                className="w-full px-3 py-2 text-sm rounded-md border outline-none focus:border-neutral-400 transition-colors resize-none"
                style={{ borderColor: "#E5E7EB" }}
                required
              />
            </div>

            {/* Upload image */}
            <div>
              <label htmlFor="review-file" className="block text-[13px] font-medium text-neutral-700 mb-2">
                Upload Image of Product
              </label>
              <div
                className="flex items-center rounded-md border overflow-hidden"
                style={{ borderColor: "#E5E7EB" }}
              >
                <label
                  htmlFor="review-file"
                  className="px-3 py-2 text-sm font-medium cursor-pointer border-r whitespace-nowrap"
                  style={{ background: "#F9FAFB", color: "#111827", borderColor: "#E5E7EB" }}
                >
                  Choose Files
                </label>
                <span className="px-3 py-2 text-sm text-neutral-500 truncate flex-1">
                  {file ? file.name : "No file chosen"}
                </span>
                <input
                  id="review-file"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>

            {/* Submit */}
            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={submitting || !rating || !description.trim()}
                className="px-7 h-10 rounded-md text-sm font-semibold text-white transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: "#111827" }}
              >
                {submitting ? "Submitting..." : "Submit"}
              </button>
            </div>

            <p className="sr-only">Reviewing: {productName}</p>
          </form>
        )}
      </div>
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

