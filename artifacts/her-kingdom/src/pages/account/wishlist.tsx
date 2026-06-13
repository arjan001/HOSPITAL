"use client"

import { useState } from "react"
import { Link } from "wouter"
import useSWR from "swr"
import { AccountShell } from "@/components/account/account-shell"
import { Seo } from "@/components/seo"
import { useMe, useWishlistRemote, apiNest, type AccountWishlistItem } from "@/lib/api-nest"
import { mutate } from "swr"
import {
  Heart, Trash2, ShoppingCart, Loader2, Package, ArrowRight, Eye,
} from "lucide-react"
import { useCart } from "@/lib/cart-context"

const WINE = "#3D0814"
const ACCENT = "#F97316"
const ACCENT_RED = "#B91C1C"
const PEACH_BORDER = "#F2DCC8"

type Product = {
  id: string
  slug: string
  name: string
  price: number
  images?: string[]
  inStock?: boolean
  category?: string
}

function ProductCard({ item }: { item: AccountWishlistItem }) {
  const { data: product, isLoading } = useSWR<Product>(
    `/api/v2/products/${encodeURIComponent(item.productSlug)}`,
    (url: string) => fetch(url).then((r) => r.ok ? r.json() : null),
  )
  const { addItem } = useCart()
  const [removing, setRemoving] = useState(false)
  const [addedToCart, setAddedToCart] = useState(false)

  async function remove() {
    setRemoving(true)
    try {
      await apiNest.removeWishlist(item.productSlug)
      await mutate("/me/wishlist")
    } catch {
      alert("Failed to remove item")
    } finally {
      setRemoving(false)
    }
  }

  function addToCart() {
    if (!product) return
    addItem({
      id: product.id,
      slug: product.slug,
      name: product.name,
      price: product.price,
      image: product.images?.[0],
    })
    setAddedToCart(true)
    setTimeout(() => setAddedToCart(false), 2000)
  }

  return (
    <div
      className="rounded-2xl border bg-white overflow-hidden group hover:shadow-md transition-shadow"
      style={{ borderColor: PEACH_BORDER }}
    >
      {/* Image */}
      <Link href={`/products/${item.productSlug}`}>
        <div className="aspect-video bg-gray-50 relative overflow-hidden">
          {isLoading ? (
            <div className="w-full h-full flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : product?.images?.[0] ? (
            <img
              src={product.images[0]}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center opacity-20">
              <Package className="h-10 w-10" />
            </div>
          )}

          {product && !product.inStock && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="text-white text-xs font-bold px-3 py-1 rounded-full bg-black/60">
                Out of Stock
              </span>
            </div>
          )}
        </div>
      </Link>

      <div className="p-4">
        <Link href={`/products/${item.productSlug}`}>
          <p className="text-sm font-semibold leading-snug line-clamp-2 hover:underline" style={{ color: WINE }}>
            {product?.name ?? item.productSlug.replace(/-/g, " ")}
          </p>
        </Link>

        {product?.category && (
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{product.category}</p>
        )}

        {product && (
          <p className="text-sm font-black mt-1" style={{ color: ACCENT_RED }}>
            KES {Number(product.price).toLocaleString()}
          </p>
        )}

        <p className="text-[10px] text-muted-foreground mt-1">
          Added {new Date(item.addedAt).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" })}
        </p>

        <div className="flex gap-2 mt-3">
          {product?.inStock !== false && (
            <button
              type="button"
              onClick={addToCart}
              className="flex-1 h-8 rounded-full text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-all"
              style={{ background: addedToCart ? "#166534" : `linear-gradient(135deg, ${ACCENT}, ${ACCENT_RED})` }}
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              {addedToCart ? "Added!" : "Add to Cart"}
            </button>
          )}
          <Link
            href={`/products/${item.productSlug}`}
            className="h-8 w-8 rounded-full border flex items-center justify-center hover:bg-[#FFFBF5] transition-colors"
            style={{ borderColor: PEACH_BORDER }}
            title="View product"
          >
            <Eye className="h-3.5 w-3.5" style={{ color: WINE }} />
          </Link>
          <button
            type="button"
            onClick={() => void remove()}
            disabled={removing}
            className="h-8 w-8 rounded-full border flex items-center justify-center hover:bg-red-50 transition-colors disabled:opacity-50"
            style={{ borderColor: PEACH_BORDER }}
            title="Remove from wishlist"
          >
            {removing
              ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              : <Trash2 className="h-3.5 w-3.5 text-red-500" />
            }
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AccountWishlistPage() {
  const { data: me } = useMe()
  const { data, isLoading, error } = useWishlistRemote()
  const items = data ?? []

  const user = {
    name: me?.fullName ?? "You",
    email: me?.email ?? "",
    phone: me?.phone,
    avatarUrl: me?.avatarUrl,
  }

  return (
    <AccountShell
      title="Wishlist"
      subtitle="Products you've saved — ready to add to your cart anytime"
      user={user}
    >
      <Seo title="My Wishlist — Shaniid RX" />

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: WINE }} />
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          Could not load wishlist. Please refresh.
        </div>
      )}

      {!isLoading && items.length === 0 && (
        <div
          className="rounded-2xl border border-dashed flex flex-col items-center justify-center py-16 gap-3"
          style={{ borderColor: PEACH_BORDER }}
        >
          <div
            className="h-14 w-14 rounded-full flex items-center justify-center"
            style={{ background: "#FEE2E2" }}
          >
            <Heart className="h-7 w-7" style={{ color: ACCENT_RED }} />
          </div>
          <p className="font-medium text-sm" style={{ color: WINE }}>Your wishlist is empty</p>
          <p className="text-xs text-muted-foreground">Browse our shop and tap the heart icon to save products</p>
          <Link
            href="/shop"
            className="mt-1 inline-flex items-center gap-2 h-9 px-5 rounded-full text-sm font-semibold text-white"
            style={{ background: `linear-gradient(135deg, ${ACCENT}, ${WINE})` }}
          >
            Browse Shop <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {items.length > 0 && (
        <>
          <p className="text-xs text-muted-foreground mb-4">{items.length} saved item{items.length !== 1 ? "s" : ""}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
              <ProductCard key={item.id} item={item} />
            ))}
          </div>
        </>
      )}
    </AccountShell>
  )
}
