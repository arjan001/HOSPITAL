"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ChevronRight, Minus, Plus, Heart, ShoppingBag, Truck, RotateCcw, Shield, Play, Gift } from "lucide-react"
import { TopBar } from "./top-bar"
import { Navbar } from "./navbar"
import { Footer } from "./footer"
import { ProductCard } from "./product-card"
import { GiftOptionsModal, giftSelectionTotal, giftSelectionSummary } from "./gift-options-modal"
import type { Product } from "@/lib/types"
import { useCart } from "@/lib/cart-context"
import { useGiftSelection } from "@/lib/gift-context"
import { useWishlist } from "@/lib/wishlist-context"
import { isVideoUrl } from "@/lib/media-utils"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProductImage } from "./product-image"
import useSWR from "swr"
import { useStoreContact } from "@/hooks/use-store-contact"

const fetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) throw new Error("Failed to fetch")
  return r.json()
})

function formatPrice(price: number): string {
  return `KSh ${price.toLocaleString()}`
}

interface ProductPageData {
  product: Product
  related: Product[]
}

export function ProductDetailPage({ slug }: { slug: string }) {
  const { data, error, isLoading } = useSWR<ProductPageData>(`/api/products/${slug}`, fetcher)
  const product = data?.product || null
  const related = data?.related || []
  const { addItem } = useCart()
  const { selection: giftSelection, setSelection: setGiftSelection } = useGiftSelection()
  const { toggleItem, isInWishlist } = useWishlist()
  const { whatsappNumber } = useStoreContact()
  const wishlisted = product ? isInWishlist(product.id) : false
  const [selectedImage, setSelectedImage] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [selectedVariations, setSelectedVariations] = useState<Record<string, string>>({})
  const [showGiftModal, setShowGiftModal] = useState(false)

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <TopBar />
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-6 h-6 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Loading product...</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex flex-col">
        <TopBar />
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-serif font-bold">Product Not Found</h1>
            <p className="text-sm text-muted-foreground mt-2">This product may have been removed or the link is incorrect.</p>
            <Link href="/shop" className="text-sm underline mt-4 inline-block">
              Back to Shop
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const handleAddToCart = () => {
    addItem(product, quantity, Object.keys(selectedVariations).length > 0 ? selectedVariations : undefined)
  }

  const productUrl = typeof window !== "undefined" ? `${window.location.origin}/product/${product.slug}` : ""
  const productImage = product.images[0] || ""
  const whatsappMessage = encodeURIComponent(
    `Hi! I'd like to order:\n\n*${product.name}*\nPrice: ${formatPrice(product.price)}\nQuantity: ${quantity}${
      Object.entries(selectedVariations).length > 0
        ? `\n${Object.entries(selectedVariations).map(([k, v]) => `${k}: ${v}`).join("\n")}`
        : ""
    }\n\nProduct: ${productUrl}\nImage: ${productImage}\n\nPlease confirm availability.`
  )

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
            <Link href={`/shop?category=${product.categorySlug}`} className="hover:text-foreground transition-colors">
              {product.category}
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground">{product.name}</span>
          </nav>

          {/* Product Detail */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14">
            {/* Images */}
            <div className="flex gap-4">
              {/* Thumbnails */}
              <div className="hidden sm:flex flex-col gap-3">
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedImage(i)}
                    className={`relative w-16 h-20 overflow-hidden rounded-sm border-2 transition-colors ${
                      selectedImage === i ? "border-foreground" : "border-border"
                    }`}
                  >
                    {isVideoUrl(img) ? (
                      <>
                        <video src={img} muted playsInline preload="metadata" className="absolute inset-0 w-full h-full object-cover" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Play className="h-3 w-3 text-background drop-shadow" />
                        </div>
                      </>
                    ) : (
                      <ProductImage src={img || "/placeholder.svg"} alt={`${product.name} view ${i + 1} - herkingdomjewelry.shop Gifting`} fill loaderSize="sm" className="object-cover" />
                    )}
                  </button>
                ))}
              </div>

              {/* Main Image / Video */}
              <div className="flex-1 relative aspect-[3/4] overflow-hidden rounded-sm bg-secondary">
                {isVideoUrl(product.images[selectedImage]) ? (
                  <video
                    key={selectedImage}
                    src={product.images[selectedImage]}
                    controls
                    playsInline
                    className="absolute inset-0 w-full h-full object-contain bg-black"
                  />
                ) : (
                  <ProductImage
                    key={selectedImage}
                    src={product.images[selectedImage] || "/placeholder.svg"}
                    alt={`${product.name} - herkingdomjewelry.shop Gifting`}
                    fill
                    className="object-cover"
                    priority
                  />
                )}
                {product.isOnOffer && product.offerPercentage && (
                  <span className="absolute top-4 left-4 bg-foreground text-background text-xs font-semibold tracking-wider uppercase px-3 py-1.5">
                    -{product.offerPercentage}%
                  </span>
                )}
                {product.isNew && (
                  <span className="absolute top-4 right-4 bg-foreground text-background text-xs font-semibold tracking-wider uppercase px-3 py-1.5">
                    New
                  </span>
                )}
              </div>

              {/* Mobile Dots */}
              <div className="sm:hidden absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {product.images.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedImage(i)}
                    className={`w-2 h-2 rounded-full ${selectedImage === i ? "bg-foreground" : "bg-foreground/30"}`}
                  />
                ))}
              </div>
            </div>

            {/* Info */}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{product.category}</p>
              <h1 className="text-2xl lg:text-3xl font-serif font-bold mt-2">{product.name}</h1>

              {/* Price */}
              <div className="flex items-center gap-3 mt-4">
                <span className="text-2xl font-bold">{formatPrice(product.price)}</span>
                {product.originalPrice && (
                  <span className="text-lg text-muted-foreground line-through">
                    {formatPrice(product.originalPrice)}
                  </span>
                )}
                {product.isOnOffer && product.offerPercentage && (
                  <span className="bg-foreground text-background text-xs font-semibold px-2.5 py-1">
                    SAVE {product.offerPercentage}%
                  </span>
                )}
              </div>

              <p className="text-sm text-muted-foreground mt-4 leading-relaxed">
                {product.description}
              </p>

              {/* Variations */}
              {product.variations && product.variations.map((variation) => (
                <div key={variation.type} className="mt-6">
                  <p className="text-sm font-medium mb-2">
                    {variation.type}
                    {selectedVariations[variation.type] && (
                      <span className="text-muted-foreground font-normal ml-2">
                        — {selectedVariations[variation.type]}
                      </span>
                    )}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {variation.options.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() =>
                          setSelectedVariations((prev) => ({ ...prev, [variation.type]: opt }))
                        }
                        className={`px-4 py-2 text-sm border transition-colors ${
                          selectedVariations[variation.type] === opt
                            ? "border-foreground bg-foreground text-background"
                            : "border-border hover:border-foreground"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {/* Is this a gift? */}
              <div className="mt-6">
                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={giftSelection.isGift}
                    onChange={(e) => {
                      const nextIsGift = e.target.checked
                      setGiftSelection({ ...giftSelection, isGift: nextIsGift })
                      if (nextIsGift) setShowGiftModal(true)
                    }}
                    className="h-4 w-4 rounded border-border accent-[#B4336A]"
                  />
                  <span className="text-sm underline underline-offset-2 flex items-center gap-1.5">
                    <Gift className="h-4 w-4 text-[#B4336A]" />
                    is this a gift?
                  </span>
                </label>
                {giftSelection.isGift && (
                  <div className="mt-3 border border-border rounded-sm p-3 bg-secondary/30 text-xs flex items-start gap-3 justify-between">
                    <div className="min-w-0">
                      <p className="font-medium text-sm">Gifting extras</p>
                      <p className="text-muted-foreground mt-1 line-clamp-3">
                        {giftSelectionSummary(giftSelection) || "No add-ons picked yet."}
                      </p>
                      {giftSelectionTotal(giftSelection) > 0 && (
                        <p className="font-semibold mt-1">
                          Extras total: KSh {giftSelectionTotal(giftSelection).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="bg-transparent text-xs h-8"
                      onClick={() => setShowGiftModal(true)}
                    >
                      {giftSelectionTotal(giftSelection) > 0 ? "Edit" : "Open options"}
                    </Button>
                  </div>
                )}
              </div>

              {/* Quantity */}
              <div className="mt-6">
                <p className="text-sm font-medium mb-2">Quantity</p>
                <div className="inline-flex items-center border border-border">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 flex items-center justify-center hover:bg-secondary transition-colors"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-12 h-10 flex items-center justify-center text-sm font-medium border-x border-border">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 flex items-center justify-center hover:bg-secondary transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-8">
                <Button
                  onClick={handleAddToCart}
                  className="flex-1 bg-pink-200 text-foreground hover:bg-pink-300 h-12 text-sm font-medium"
                >
                  <ShoppingBag className="h-4 w-4 mr-2" />
                  Add to Cart
                </Button>
                <a
                  href={`https://wa.me/${whatsappNumber}?text=${whatsappMessage}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 bg-background text-foreground border border-foreground h-12 text-sm font-medium hover:bg-secondary transition-colors"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  Order via WhatsApp
                </a>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 flex-shrink-0 bg-transparent"
                  onClick={() => product && toggleItem(product)}
                >
                  <Heart className={`h-5 w-5 transition-colors ${wishlisted ? "fill-pink-500 text-pink-500" : "text-pink-500"}`} />
                  <span className="sr-only">{wishlisted ? "Remove from wishlist" : "Add to wishlist"}</span>
                </Button>
              </div>

              {/* Trust Badges */}
              <div className="grid grid-cols-3 gap-4 mt-8 pt-8 border-t border-border">
                <div className="flex flex-col items-center text-center gap-2">
                  <Truck className="h-5 w-5 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Fast Delivery</p>
                </div>
                <div className="flex flex-col items-center text-center gap-2">
                  <RotateCcw className="h-5 w-5 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Easy Returns</p>
                </div>
                <div className="flex flex-col items-center text-center gap-2">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Secure Payment</p>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mt-6">
                {product.tags.map((tag) => (
                  <span key={tag} className="text-xs text-muted-foreground bg-secondary px-3 py-1 rounded-sm">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Description Tabs */}
          <div className="mt-16">
            <Tabs defaultValue="description">
              <TabsList className="bg-transparent border-b border-border w-full justify-start rounded-none p-0">
                <TabsTrigger value="description" className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent px-6 pb-3">
                  Description
                </TabsTrigger>
                <TabsTrigger value="shipping" className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent px-6 pb-3">
                  Shipping
                </TabsTrigger>
              </TabsList>
              <TabsContent value="description" className="pt-6">
                <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                  {product.description}
                </p>
              </TabsContent>
              <TabsContent value="shipping" className="pt-6">
                <div className="text-sm text-muted-foreground leading-relaxed max-w-2xl space-y-2">
                  <p>We dispatch orders every Tuesday and Friday.</p>
                  <p>Nairobi CBD & Westlands: Same day delivery</p>
                  <p>Rest of Nairobi: 1-2 business days</p>
                  <p>Upcountry: 3-5 business days</p>
                  <p>Free shipping on orders above KSh 5,000.</p>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* You May Also Like */}
          {related.length > 0 && (
            <div className="mt-16 mb-8">
              <h2 className="text-2xl font-serif font-bold mb-6">You May Also Like</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
                {related.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Sticky "Order via WhatsApp" CTA — persistent on product pages.
         Sits on the left so it never overlaps the global floating chat. */}
      <a
        href={`https://wa.me/${whatsappNumber}?text=${whatsappMessage}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Order ${product.name} via WhatsApp`}
        className="fixed bottom-5 left-5 z-40 inline-flex items-center gap-2 rounded-full bg-[#25D366] text-white px-4 py-2.5 shadow-lg hover:opacity-90 transition-opacity text-xs sm:text-sm"
      >
        <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
        <span className="font-medium whitespace-nowrap">Order This on WhatsApp</span>
      </a>

      <Footer />

      <GiftOptionsModal
        open={showGiftModal}
        onClose={() => setShowGiftModal(false)}
        selection={giftSelection}
        onChange={setGiftSelection}
        mode="save"
      />
    </div>
  )
}
