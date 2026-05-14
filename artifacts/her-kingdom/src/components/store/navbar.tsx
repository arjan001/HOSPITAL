"use client"

import React from "react"
import { Link } from "wouter"

import { useState, useRef, useEffect } from "react"
import { useLocation } from "wouter"
import { Search, ShoppingBag, Menu, PhoneCall, User, Package, Camera, Heart, Settings, PackageCheck } from "lucide-react"
import { useCart } from "@/lib/cart-context"
import { useWishlist } from "@/lib/wishlist-context"
import type { Product } from "@/lib/types"
import { useCategories } from "@/components/admin/categories"
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
  const { data: allProductsData } = useSWR<Product[]>("/api/products", safeFetcher)
  const categories = useCategories()
  const allProducts = asArray<Product>(allProductsData)

  const [searchQuery, setSearchQuery] = useState("")
  const [suggestions, setSuggestions] = useState<Product[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const accountRef = useRef<HTMLDivElement>(null)

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

  const navItems: { label: string; href: string }[] = [
    { label: "Home", href: "/" },
    { label: "Shop", href: "/shop" },
    { label: "Care Packs", href: "/care-packs" },
    { label: "Services", href: "/services" },
  ]

  const isHomeActive = location === "/"

  return (
    <header className="sticky top-0 z-50">
      {/* Main bar — warm cream with logo, centered nav, action chips */}
      <div style={{ background: BG_CREAM, color: TEXT_WINE, borderBottom: "1px solid #F2DCC8" }}>
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex items-center justify-between gap-4 h-16 lg:h-18">
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
                  <Link href="/" className="inline-flex items-center">
                    <img src="/logo-rx.png" alt="Shaniid RX" width={120} height={60} className="h-14 w-auto object-contain" />
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
            <Link href="/" className="flex items-center shrink-0" aria-label="Shaniid RX - Home">
              <img
                src="/logo-rx.png"
                alt="Shaniid RX"
                width={180}
                height={90}
                className="h-24 lg:h-28 w-auto object-contain"
              />
            </Link>

            {/* Centered primary nav */}
            <nav className="hidden lg:flex items-center gap-10 mx-auto">
              {navItems.map((item) => {
                const isActive =
                  (item.href === "/" && isHomeActive) ||
                  (item.href !== "/" && location.startsWith(item.href.split("?")[0]))
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="text-[15px] font-semibold transition-colors hover:text-[#B91C1C]"
                    style={{ color: isActive ? ACCENT_RED : TEXT_WINE }}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </nav>

            {/* Right action chips */}
            <div className="flex items-center gap-2 lg:gap-4 shrink-0">
              <Link
                href="/delivery"
                className="hidden md:inline-flex items-center gap-2 h-10 px-4 rounded-full text-sm font-semibold transition-shadow hover:shadow-md"
                style={{ background: PILL_BG, border: `1px solid ${PILL_BORDER}`, color: TEXT_WINE }}
              >
                <Package className="h-4 w-4" style={{ color: ACCENT_RED }} />
                <span>Delivery</span>
              </Link>

              {/* Account dropdown */}
              <div
                ref={accountRef}
                className="hidden lg:block relative"
                onMouseEnter={() => setAccountOpen(true)}
                onMouseLeave={() => setAccountOpen(false)}
              >
                <button
                  type="button"
                  className="inline-flex flex-col items-center gap-0.5 transition-opacity hover:opacity-80"
                  style={{ color: TEXT_WINE }}
                >
                  <User className="h-5 w-5" style={{ color: ACCENT_RED }} />
                  <span className="text-[11px] font-semibold leading-none">Account</span>
                </button>

                {/* Account dropdown — broad white card matching reference */}
                {accountOpen && (
                  <div className="absolute top-full right-0 pt-3 w-[400px] z-50">
                    <div
                      className="rounded-2xl overflow-hidden"
                      style={{
                        background: "#ffffff",
                        border: `1px solid ${PILL_BORDER}`,
                        boxShadow: "0 20px 60px -12px rgba(61,8,20,0.22), 0 6px 16px -6px rgba(61,8,20,0.10)",
                      }}
                    >
                      {/* Header */}
                      <div className="px-6 pt-5 pb-4 border-b" style={{ borderColor: "#F2DCC8" }}>
                        <p className="font-extrabold text-lg leading-tight" style={{ color: TEXT_WINE }}>My Account</p>
                        <div className="mt-2 h-px" style={{ background: "#F2DCC8" }} />
                        <p className="text-sm mt-3 text-center" style={{ color: "#888" }}>
                          Sign in for a more personalized experience
                        </p>
                      </div>

                      {/* CTA buttons */}
                      <div className="px-6 py-4 flex gap-3 border-b" style={{ borderColor: "#F2DCC8" }}>
                        <Link
                          href="/sign-in"
                          className="flex-1 h-12 rounded-lg font-bold text-sm flex items-center justify-center text-white transition-opacity hover:opacity-90"
                          style={{
                            background: `linear-gradient(135deg, ${ACCENT_ORANGE} 0%, ${ACCENT_RED} 100%)`,
                            boxShadow: "0 6px 18px -6px rgba(185,28,28,0.45)",
                          }}
                          onClick={() => setAccountOpen(false)}
                        >
                          Log In
                        </Link>
                        <Link
                          href="/sign-up"
                          className="flex-1 h-12 rounded-lg font-bold text-sm flex items-center justify-center transition-colors hover:bg-[#FFF6EE]"
                          style={{
                            border: `1.5px solid ${PILL_BORDER}`,
                            color: TEXT_WINE,
                            background: "#fff",
                          }}
                          onClick={() => setAccountOpen(false)}
                        >
                          Create Account
                        </Link>
                      </div>

                      {/* Quick links — with dividers like the reference */}
                      <div>
                        {[
                          {
                            icon: <PackageCheck className="h-5 w-5" />,
                            label: "Orders",
                            desc: "View and track online or pickup orders",
                            href: "/track-order",
                          },
                          {
                            icon: <Heart className="h-5 w-5" />,
                            label: "Favourites",
                            desc: "View saved products",
                            href: "/wishlist",
                            iconColor: ACCENT_RED,
                          },
                          {
                            icon: <Settings className="h-5 w-5" />,
                            label: "Account Settings",
                            desc: "Payment, contact info, addresses, password",
                            href: "/account",
                          },
                        ].map((item, idx, arr) => (
                          <Link
                            key={item.label}
                            href={item.href}
                            className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-[#FFF9F5]"
                            style={{ borderBottom: idx < arr.length - 1 ? `1px solid #F2DCC8` : "none" }}
                            onClick={() => setAccountOpen(false)}
                          >
                            <span
                              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{
                                background: "#FFF1E6",
                                color: item.iconColor || TEXT_WINE_SOFT,
                              }}
                            >
                              {item.icon}
                            </span>
                            <div>
                              <p className="text-sm font-bold leading-tight" style={{ color: TEXT_WINE }}>
                                {item.label}
                              </p>
                              <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "#888" }}>
                                {item.desc}
                              </p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <Link
                href="/wishlist"
                className="hidden md:inline-flex flex-col items-center gap-0.5 transition-opacity hover:opacity-80"
                style={{ color: TEXT_WINE }}
                aria-label={`Wishlist with ${wishlistCount} items`}
              >
                <span className="relative">
                  <Heart className="h-5 w-5" style={{ color: ACCENT_RED }} fill={wishlistCount > 0 ? ACCENT_RED : "none"} />
                  {wishlistCount > 0 && (
                    <span
                      className="absolute -top-1.5 -right-1.5 flex items-center justify-center rounded-full text-white text-[10px] font-bold min-w-[18px] h-[18px]"
                      style={{ background: ACCENT_RED }}
                    >
                      {wishlistCount}
                    </span>
                  )}
                </span>
                <span className="text-[11px] font-semibold leading-none">Wishlist</span>
              </Link>

              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className="hidden md:inline-flex flex-col items-center gap-0.5 transition-opacity hover:opacity-80"
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
                <span className="text-[11px] font-semibold leading-none">Cart</span>
              </button>

              {/* Mobile wishlist + cart icons */}
              <Link
                href="/wishlist"
                className="md:hidden relative p-2"
                aria-label={`Wishlist with ${wishlistCount} items`}
              >
                <Heart className="h-5 w-5" style={{ color: ACCENT_RED }} fill={wishlistCount > 0 ? ACCENT_RED : "none"} />
                {wishlistCount > 0 && (
                  <span
                    className="absolute top-0 right-0 flex items-center justify-center rounded-full text-white text-[10px] font-bold min-w-[18px] h-[18px]"
                    style={{ background: ACCENT_RED }}
                  >
                    {wishlistCount}
                  </span>
                )}
              </Link>
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
              <Link
                href="/speak-to-a-doctor"
                className="inline-flex items-center justify-center gap-2 h-12 px-5 rounded-full text-sm font-semibold whitespace-nowrap shadow-sm hover:shadow-md transition-shadow"
                style={{ background: PILL_BG, border: `1px solid ${PILL_BORDER}`, color: TEXT_WINE }}
              >
                <PhoneCall className="h-4 w-4" style={{ color: ACCENT_RED }} />
                <span>Speak to a doctor</span>
              </Link>

              {/* Upload Prescription */}
              <Link
                href="/upload-prescription"
                className="inline-flex items-center justify-center gap-2 h-12 px-5 rounded-full text-sm font-semibold whitespace-nowrap text-white shadow-sm hover:shadow-md transition-shadow"
                style={{
                  background: `linear-gradient(135deg, ${ACCENT_ORANGE} 0%, ${ACCENT_RED} 100%)`,
                }}
              >
                <Camera className="h-4 w-4" />
                <span>Upload Prescription</span>
              </Link>
            </div>

          </div>
        </div>
      </div>

      <CartDrawer />
    </header>
  )
}
