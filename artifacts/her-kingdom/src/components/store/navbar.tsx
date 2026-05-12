"use client"

import React from "react"
import { Link } from "wouter"

import { useState, useRef, useEffect } from "react"
import { useLocation } from "wouter"
import { Search, ShoppingBag, Menu, ChevronDown, PhoneCall, User, Package, Camera } from "lucide-react"
import { useCart } from "@/lib/cart-context"
import { useWishlist } from "@/lib/wishlist-context"
import type { Product, Category } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { CartDrawer } from "./cart-drawer"
import useSWR from "swr"
import { safeFetcher, asArray } from "@/lib/fetcher"
import { useStoreContact } from "@/hooks/use-store-contact"

function formatPrice(price: number): string {
  return `KSh ${price.toLocaleString()}`
}

function getSessionId(): string {
  if (typeof window === "undefined") return ""
  let sid = sessionStorage.getItem("kf_sid")
  if (!sid) {
    sid = crypto.randomUUID()
    sessionStorage.setItem("kf_sid", sid)
  }
  return sid
}

function trackSearch(query: string, action: "submit" | "suggestion_click", suggestion?: string) {
  if (typeof window === "undefined") return
  const normalised = query.trim().toLowerCase().slice(0, 80)
  if (!normalised) return
  try {
    fetch("/api/track-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType: "search",
        eventTarget: normalised,
        eventData: { action, suggestion: suggestion || null, raw: query.slice(0, 200) },
        pagePath: window.location.pathname,
        sessionId: getSessionId(),
      }),
      keepalive: true,
    }).catch(() => {})
  } catch {}
}

// RX warm theme tokens (from the Figma reference)
const BG_CREAM = "#FFFBF5"
const TEXT_WINE = "#3D0814"
const TEXT_WINE_SOFT = "#6B0F1A"
const ACCENT_ORANGE = "#F97316"
const ACCENT_RED = "#B91C1C"
const PILL_BG = "linear-gradient(135deg, #FFF1E6 0%, #FFE2D1 100%)"
const PILL_BORDER = "#F8D9C4"

type SiteSettings = {
  store_phone?: string
  whatsapp_number?: string
  free_shipping_threshold?: string
  footer_instagram?: string
  footer_tiktok?: string
}

export function Navbar() {
  const [location, navigate] = useLocation()
  const { totalItems, totalPrice, setIsCartOpen } = useCart()
  const { totalItems: wishlistCount } = useWishlist()
  const { phoneHref } = useStoreContact()
  const { data: settingsResp } = useSWR<{ settings?: SiteSettings }>("/api/site-data", safeFetcher)
  const settings = settingsResp?.settings || {}
  const { data: categoriesData } = useSWR<Category[]>("/api/categories", safeFetcher)
  const { data: allProductsData } = useSWR<Product[]>("/api/products", safeFetcher)
  const categories = asArray<Category>(categoriesData)
  const allProducts = asArray<Product>(allProductsData)

  const [searchQuery, setSearchQuery] = useState("")
  const [suggestions, setSuggestions] = useState<Product[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [shopOpen, setShopOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (searchQuery.trim().length >= 2 && allProducts.length > 0) {
      const q = searchQuery.toLowerCase()
      const results = allProducts
        .filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            p.tags.some((t) => t.toLowerCase().includes(q))
        )
        .slice(0, 6)
      setSuggestions(results)
      setShowSuggestions(true)
    } else if (searchQuery.trim().length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }, [searchQuery, allProducts.length])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const query = searchQuery.trim()
    if (query) {
      trackSearch(query, "submit")
      navigate(`/search?q=${encodeURIComponent(query)}`)
      setSearchQuery("")
      setShowSuggestions(false)
    }
  }

  const handleSuggestionClick = (slug: string) => {
    const query = searchQuery.trim()
    if (query) trackSearch(query, "suggestion_click", slug)
    setShowSuggestions(false)
    setSearchQuery("")
    navigate(`/product/${slug}`)
  }

  const navItems: { label: string; href: string; hasMenu?: boolean }[] = [
    { label: "Home", href: "/" },
    { label: "Shop", href: "/shop", hasMenu: true },
    { label: "Care Packs", href: "/shop?filter=offers" },
    { label: "Services", href: "/services" },
  ]

  const isHomeActive = location === "/"

  return (
    <header className="sticky top-0 z-50">
      {/* Main bar — warm cream with logo, centered nav, action chips */}
      <div style={{ background: BG_CREAM, color: TEXT_WINE, borderBottom: "1px solid #F2DCC8" }}>
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex items-center justify-between gap-4 h-20 lg:h-24">
            {/* Mobile menu trigger */}
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden hover:bg-[#FFF0E6]"
                  style={{ color: TEXT_WINE }}
                >
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-0" style={{ background: BG_CREAM, color: TEXT_WINE }}>
                <div className="p-6">
                  <Link href="/" className="inline-flex items-center gap-2">
                    <img src="/logo-rx.png" alt="Shaniid RX" width={56} height={56} className="h-12 w-12 object-contain" />
                    <span className="text-lg font-bold tracking-wide" style={{ color: TEXT_WINE }}>Shaniid RX</span>
                  </Link>
                </div>
                <nav className="flex flex-col px-6 gap-1">
                  {navItems.map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      className="py-3 text-sm font-semibold border-b"
                      style={{ borderColor: "#F2DCC8", color: TEXT_WINE }}
                    >
                      {item.label}
                    </Link>
                  ))}
                  <p className="pt-4 pb-1 text-[10px] tracking-[0.2em] uppercase" style={{ color: TEXT_WINE_SOFT }}>
                    Categories
                  </p>
                  {categories.slice(0, 6).map((cat) => (
                    <Link
                      key={cat.id}
                      href={`/shop?category=${cat.slug}`}
                      className="py-2.5 text-sm font-medium border-b pl-3"
                      style={{ borderColor: "#F2DCC8", color: TEXT_WINE_SOFT }}
                    >
                      {cat.name}
                    </Link>
                  ))}
                  <Link
                    href="/track-order"
                    className="py-3 text-sm font-semibold border-b"
                    style={{ borderColor: "#F2DCC8", color: TEXT_WINE }}
                  >
                    Track My Order
                  </Link>
                </nav>
                <div className="px-6 py-4 mt-2 space-y-3">
                  <a href={phoneHref} className="flex items-center gap-2 text-sm font-semibold" style={{ color: ACCENT_RED }}>
                    <PhoneCall className="h-4 w-4" /> Speak to a doctor
                  </a>
                </div>
              </SheetContent>
            </Sheet>

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 shrink-0" aria-label="Shaniid RX - Home">
              <img
                src="/logo-rx.png"
                alt="Shaniid RX"
                width={64}
                height={64}
                className="h-12 lg:h-16 w-auto object-contain"
              />
              <span className="hidden sm:inline text-lg lg:text-xl font-bold tracking-wide" style={{ color: TEXT_WINE }}>
                Shaniid RX
              </span>
            </Link>

            {/* Centered primary nav */}
            <nav className="hidden lg:flex items-center gap-10 mx-auto">
              {navItems.map((item) => {
                const isActive =
                  (item.href === "/" && isHomeActive) ||
                  (item.href !== "/" && location.startsWith(item.href.split("?")[0]))
                const isShop = item.label === "Shop"
                return (
                  <div
                    key={item.label}
                    className="relative"
                    onMouseEnter={() => isShop && setShopOpen(true)}
                    onMouseLeave={() => isShop && setShopOpen(false)}
                  >
                    <Link
                      href={item.href}
                      className="inline-flex items-center gap-1 text-[15px] font-semibold transition-colors hover:text-[#B91C1C]"
                      style={{ color: isActive ? ACCENT_RED : TEXT_WINE }}
                    >
                      {item.label}
                      {item.hasMenu && <ChevronDown className="h-3.5 w-3.5 opacity-70" />}
                    </Link>
                    {isShop && shopOpen && categories.length > 0 && (
                      <div className="absolute top-full left-1/2 -translate-x-1/2 pt-3 w-60 z-50">
                        <div
                          className="rounded-xl shadow-xl py-2"
                          style={{ background: "#fff", border: `1px solid ${PILL_BORDER}` }}
                        >
                          {categories.map((cat) => (
                            <Link
                              key={cat.id}
                              href={`/shop?category=${cat.slug}`}
                              className="block px-4 py-2 text-sm hover:bg-[#FFF1E6] transition-colors"
                              style={{ color: TEXT_WINE }}
                              onClick={() => setShopOpen(false)}
                            >
                              {cat.name}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </nav>

            {/* Right action chips */}
            <div className="flex items-center gap-2 lg:gap-4 shrink-0">
              <Link
                href="/track-order"
                className="hidden md:inline-flex items-center gap-2 h-10 px-4 rounded-full text-sm font-semibold transition-shadow hover:shadow-md"
                style={{ background: PILL_BG, border: `1px solid ${PILL_BORDER}`, color: TEXT_WINE }}
              >
                <Package className="h-4 w-4" style={{ color: ACCENT_RED }} />
                <span>Delivery</span>
              </Link>

              <Link
                href="/auth/login"
                className="hidden lg:inline-flex items-center gap-2 text-sm font-semibold transition-opacity hover:opacity-80"
                style={{ color: TEXT_WINE }}
              >
                <User className="h-5 w-5" style={{ color: ACCENT_RED }} />
                <span>Login/ Register</span>
              </Link>

              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className="hidden md:inline-flex items-center gap-2 text-sm font-semibold transition-opacity hover:opacity-80"
                style={{ color: TEXT_WINE }}
                aria-label="Open cart"
              >
                <span className="relative">
                  <ShoppingBag className="h-5 w-5" style={{ color: ACCENT_RED }} />
                  {totalItems > 0 && (
                    <span
                      className="absolute -top-1.5 -right-1.5 flex items-center justify-center rounded-full text-white text-[10px] font-bold min-w-[18px] h-[18px]"
                      style={{ background: ACCENT_RED }}
                    >
                      {totalItems}
                    </span>
                  )}
                </span>
                <span>My wishlist</span>
              </button>

              {/* Mobile cart icon (icon-only) */}
              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className="md:hidden relative p-2"
                aria-label="Open cart"
              >
                <ShoppingBag className="h-5 w-5" style={{ color: ACCENT_RED }} />
                {totalItems > 0 && (
                  <span
                    className="absolute top-0 right-0 flex items-center justify-center rounded-full text-white text-[10px] font-bold min-w-[18px] h-[18px]"
                    style={{ background: ACCENT_RED }}
                  >
                    {totalItems}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Action row: search + speak to a doctor + upload prescription */}
          <div className="pb-5 pt-1 lg:pt-0 lg:pb-6">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
              {/* Search pill */}
              <div className="flex-1 lg:max-w-3xl" ref={searchRef}>
                <form onSubmit={handleSearch} className="relative w-full">
                  <div
                    className="flex items-center rounded-full overflow-hidden h-12 pl-5 pr-2 shadow-sm"
                    style={{ background: PILL_BG, border: `1px solid ${PILL_BORDER}` }}
                  >
                    <Search className="h-4 w-4 mr-2" style={{ color: ACCENT_RED }} />
                    <input
                      type="text"
                      placeholder="Search medicines name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="flex-1 h-full bg-transparent text-sm outline-none placeholder:text-[#9B6A55]"
                      style={{ color: TEXT_WINE }}
                    />
                  </div>

                  {showSuggestions && (
                    <div
                      className="absolute top-full left-0 right-0 mt-2 bg-white shadow-xl rounded-xl z-50 overflow-hidden"
                      style={{ border: `1px solid ${PILL_BORDER}`, color: TEXT_WINE }}
                    >
                      {suggestions.length > 0 ? (
                        <>
                          {suggestions.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => handleSuggestionClick(p.slug)}
                              className="w-full text-left px-4 py-3 hover:bg-[#FFF1E6] transition-colors flex items-center gap-3"
                            >
                              <div className="w-10 h-12 rounded-sm overflow-hidden flex-shrink-0 bg-[#FFF1E6]">
                                <img src={p.images[0] || "/placeholder.svg"} alt="" className="w-full h-full object-cover" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{p.name}</p>
                                <p className="text-xs" style={{ color: TEXT_WINE_SOFT }}>{p.category}</p>
                                <p className="text-xs font-semibold" style={{ color: ACCENT_RED }}>{formatPrice(p.price)}</p>
                              </div>
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
                              setShowSuggestions(false)
                              setSearchQuery("")
                            }}
                            className="w-full text-left px-4 py-2.5 text-sm font-semibold hover:bg-[#FFF1E6] transition-colors border-t"
                            style={{ borderColor: PILL_BORDER, color: ACCENT_RED }}
                          >
                            {"View all results for \""}{searchQuery}{"\""}
                          </button>
                        </>
                      ) : (
                        <div className="px-4 py-6 text-center">
                          <p className="text-sm" style={{ color: TEXT_WINE_SOFT }}>
                            {"No products found for \""}{searchQuery}{"\"."}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </form>
              </div>

              {/* Speak to a doctor */}
              <a
                href={phoneHref}
                className="inline-flex items-center justify-center gap-2 h-12 px-5 rounded-full text-sm font-semibold whitespace-nowrap shadow-sm hover:shadow-md transition-shadow"
                style={{ background: PILL_BG, border: `1px solid ${PILL_BORDER}`, color: TEXT_WINE }}
              >
                <PhoneCall className="h-4 w-4" style={{ color: ACCENT_RED }} />
                <span>Speak to a doctor</span>
              </a>

              {/* Upload Prescription */}
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 h-12 px-5 rounded-full text-sm font-semibold whitespace-nowrap text-white shadow-sm hover:shadow-md transition-shadow"
                style={{
                  background: `linear-gradient(135deg, ${ACCENT_ORANGE} 0%, ${ACCENT_RED} 100%)`,
                }}
              >
                <Camera className="h-4 w-4" />
                <span>Upload Prescription</span>
              </Link>
            </div>

            {/* Wishlist heart hint (kept for users who like quick wishlist access) */}
            {wishlistCount > 0 && (
              <div className="mt-2 text-xs lg:text-right" style={{ color: TEXT_WINE_SOFT }}>
                <Link href="/wishlist" className="font-semibold underline" style={{ color: ACCENT_RED }}>
                  {wishlistCount} item{wishlistCount === 1 ? "" : "s"} on your wishlist
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      <CartDrawer />
    </header>
  )
}
