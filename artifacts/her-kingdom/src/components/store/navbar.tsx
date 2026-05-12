"use client"

import React from "react"
import { Link } from "wouter"

import { useState, useRef, useEffect } from "react"
import { useLocation } from "wouter"
import { Search, ShoppingBag, Heart, Menu, ChevronDown, Phone, User } from "lucide-react"
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

const NAV_DARK = "#172B4D"
const NAV_DARK_DEEP = "#11233F"
const TEAL = "#1BBFB8"

type SiteSettings = {
  store_phone?: string
  whatsapp_number?: string
  free_shipping_threshold?: string
  footer_instagram?: string
  footer_tiktok?: string
  footer_twitter?: string
  footer_facebook?: string
}

export function Navbar() {
  const [location, navigate] = useLocation()
  const { totalItems, totalPrice, setIsCartOpen } = useCart()
  const { totalItems: wishlistCount } = useWishlist()
  const { phoneHref, phoneDisplay } = useStoreContact()
  const { data: settingsResp } = useSWR<{ settings?: SiteSettings }>("/api/site-data", safeFetcher)
  const settings = settingsResp?.settings || {}
  const { data: categoriesData } = useSWR<Category[]>("/api/categories", safeFetcher)
  const { data: allProductsData } = useSWR<Product[]>("/api/products", safeFetcher)
  const categories = asArray<Category>(categoriesData)
  const allProducts = asArray<Product>(allProductsData)

  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [suggestions, setSuggestions] = useState<Product[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [shopOpen, setShopOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const mobileSearchRef = useRef<HTMLDivElement>(null)

  const instagram = settings.footer_instagram || "https://www.instagram.com/herkingdom_pharmacy/"
  const facebook = settings.footer_facebook || "#"
  const twitter = settings.footer_twitter || "#"
  const tiktok = settings.footer_tiktok || "https://www.tiktok.com/@herkingdom_pharmacy"
  const freeShippingThreshold = Number(settings.free_shipping_threshold) || 5000
  const freeShippingMsg = `Free Shipping for all Orders over KSh ${freeShippingThreshold.toLocaleString()}`

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
      if (mobileSearchRef.current && !mobileSearchRef.current.contains(e.target as Node)) {
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
      setSearchOpen(false)
    }
  }

  const handleSuggestionClick = (slug: string) => {
    const query = searchQuery.trim()
    if (query) trackSearch(query, "suggestion_click", slug)
    setShowSuggestions(false)
    setSearchQuery("")
    setSearchOpen(false)
    navigate(`/product/${slug}`)
  }

  const navItems: { label: string; href: string; hasMenu?: boolean }[] = [
    { label: "Home", href: "/" },
    { label: "Shop", href: "/shop", hasMenu: true },
    { label: "Categories", href: "/shop", hasMenu: true },
    { label: "Blog", href: "/blogs" },
    { label: "On sale", href: "/shop?filter=offers" },
    { label: "Contact", href: "/contact" },
  ]

  const isHomeActive = location === "/"

  return (
    <header className="sticky top-0 z-50">
      {/* Top utility bar */}
      <div style={{ background: NAV_DARK_DEEP }} className="hidden md:block text-white/80 text-xs">
        <div className="mx-auto max-w-7xl px-4 flex items-center justify-between h-9">
          <p className="font-medium">{freeShippingMsg}</p>
          <div className="flex items-center gap-4">
            <a href={facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="hover:text-white transition-colors">
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.99 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.128 22 16.99 22 12z"/></svg>
            </a>
            <a href={twitter} target="_blank" rel="noopener noreferrer" aria-label="Twitter" className="hover:text-white transition-colors">
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2H21.5l-7.51 8.583L22.5 22h-6.844l-5.36-6.72L4.1 22H.84l8.03-9.183L.5 2h6.97l4.846 6.142L18.244 2z"/></svg>
            </a>
            <a href={instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="hover:text-white transition-colors">
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
            </a>
            <a href={tiktok} target="_blank" rel="noopener noreferrer" aria-label="TikTok" className="hover:text-white transition-colors">
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.87a8.16 8.16 0 004.77 1.52V6.94a4.85 4.85 0 01-1.01-.25z"/></svg>
            </a>
          </div>
        </div>
      </div>

      {/* Main bar */}
      <div style={{ background: NAV_DARK }} className="text-white">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex items-center justify-between gap-4 h-16 lg:h-20">
            {/* Mobile menu trigger */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden text-white hover:bg-white/10 hover:text-white">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 bg-background text-foreground p-0">
                <div className="p-6">
                  <Link href="/" className="inline-flex items-center">
                    <img src="/logo-herkingdom.png" alt="Her Kingdom" width={200} height={80} className="h-12 w-auto object-contain" />
                  </Link>
                </div>
                <nav className="flex flex-col px-6 gap-1">
                  {navItems.map((item) => (
                    <Link key={item.label} href={item.href} className="py-3 text-sm font-medium border-b border-border">{item.label}</Link>
                  ))}
                  <p className="pt-3 pb-1 text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Categories</p>
                  {categories.slice(0, 6).map((cat) => (
                    <Link key={cat.id} href={`/shop?category=${cat.slug}`} className="py-2.5 text-sm font-medium border-b border-border pl-3">
                      {cat.name}
                    </Link>
                  ))}
                  <Link href="/track-order" className="py-3 text-sm font-medium border-b border-border">Track My Order</Link>
                </nav>
                <div className="px-6 py-4 mt-4 space-y-3">
                  <a href={instagram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">Instagram</a>
                  <a href={tiktok} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">TikTok</a>
                  <a href={phoneHref} className="flex items-center gap-2 text-sm font-medium"><Phone className="h-4 w-4" />{phoneDisplay}</a>
                </div>
              </SheetContent>
            </Sheet>

            {/* Logo */}
            <Link href="/" className="flex items-center shrink-0" aria-label="Her Kingdom - Home">
              <img
                src="/logo-herkingdom.png"
                alt="Her Kingdom"
                width={220}
                height={80}
                className="h-10 lg:h-12 w-auto object-contain brightness-0 invert"
              />
            </Link>

            {/* Search pill */}
            <div className="hidden lg:flex items-center flex-1 max-w-2xl" ref={searchRef}>
              <form onSubmit={handleSearch} className="relative w-full">
                <div className="flex items-center bg-white rounded-full shadow-sm overflow-hidden h-12 pl-6 pr-1">
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 h-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                  />
                  <button
                    type="submit"
                    className="h-10 w-12 flex items-center justify-center rounded-full text-white transition-opacity hover:opacity-90"
                    style={{ background: TEAL }}
                    aria-label="Search"
                  >
                    <Search className="h-4 w-4" />
                  </button>
                </div>

                {showSuggestions && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-background text-foreground border border-border shadow-lg rounded-lg z-50 overflow-hidden">
                    {suggestions.length > 0 ? (
                      <>
                        {suggestions.map((p) => (
                          <button key={p.id} type="button" onClick={() => handleSuggestionClick(p.slug)} className="w-full text-left px-4 py-3 hover:bg-secondary transition-colors flex items-center gap-3">
                            <div className="w-10 h-12 bg-secondary rounded-sm overflow-hidden flex-shrink-0">
                              <img src={p.images[0] || "/placeholder.svg"} alt="" className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{p.name}</p>
                              <p className="text-xs text-muted-foreground">{p.category}</p>
                              <p className="text-xs font-medium">{formatPrice(p.price)}</p>
                            </div>
                          </button>
                        ))}
                        <button type="button" onClick={() => { navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`); setShowSuggestions(false); setSearchQuery("") }} className="w-full text-left px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors border-t border-border">
                          {"View all results for \""}{searchQuery}{"\""}
                        </button>
                      </>
                    ) : (
                      <div className="px-4 py-6 text-center">
                        <p className="text-sm text-muted-foreground">{"No products found for \""}{searchQuery}{"\"."}</p>
                      </div>
                    )}
                  </div>
                )}
              </form>
            </div>

            {/* Right: account / wishlist / cart */}
            <div className="flex items-center gap-3 lg:gap-5 shrink-0">
              <button
                type="button"
                className="lg:hidden p-2 text-white hover:bg-white/10 rounded-md"
                onClick={() => setSearchOpen(!searchOpen)}
                aria-label="Search"
              >
                <Search className="h-5 w-5" />
              </button>

              <Link href="/auth/login" className="hidden lg:flex items-center gap-2 text-sm font-semibold tracking-wide hover:opacity-80 transition-opacity">
                <User className="h-4 w-4" />
                <span>SIGN IN / SIGN UP</span>
              </Link>

              <Link href="/wishlist" className="relative hidden sm:flex p-1.5" aria-label="Wishlist">
                <Heart className={`h-5 w-5 transition-colors ${wishlistCount > 0 ? "fill-pink-400 text-pink-400" : "text-white"}`} />
                {wishlistCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center rounded-full text-white text-[10px] font-bold min-w-[18px] h-[18px]" style={{ background: TEAL }}>
                    {wishlistCount}
                  </span>
                )}
              </Link>

              <button type="button" onClick={() => setIsCartOpen(true)} className="flex items-center gap-2.5 group" aria-label="Open cart">
                <span className="relative">
                  <ShoppingBag className="h-5 w-5 text-white" />
                  <span
                    className="absolute -top-1.5 -right-1.5 flex items-center justify-center rounded-full text-white text-[10px] font-bold min-w-[18px] h-[18px]"
                    style={{ background: totalItems > 0 ? "#ef4444" : TEAL }}
                  >
                    {totalItems}
                  </span>
                </span>
                <span className="hidden sm:block text-sm font-semibold">{formatPrice(totalPrice)}</span>
              </button>
            </div>
          </div>

          {/* Mobile search */}
          {searchOpen && (
            <div className="lg:hidden pb-3 animate-fade-in-up" ref={mobileSearchRef}>
              <form onSubmit={handleSearch} className="relative">
                <div className="flex items-center bg-white rounded-full overflow-hidden h-11 pl-5 pr-1">
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 h-full bg-transparent text-sm text-foreground outline-none"
                    autoFocus
                  />
                  <button type="submit" className="h-9 w-10 flex items-center justify-center rounded-full text-white" style={{ background: TEAL }}>
                    <Search className="h-4 w-4" />
                  </button>
                </div>
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-background text-foreground border border-border shadow-lg rounded-lg z-50 overflow-hidden">
                    {suggestions.map((p) => (
                      <button key={p.id} type="button" onClick={() => handleSuggestionClick(p.slug)} className="w-full text-left px-4 py-3 hover:bg-secondary transition-colors flex items-center gap-3">
                        <div className="w-10 h-12 bg-secondary rounded-sm overflow-hidden flex-shrink-0">
                          <img src={p.images[0] || "/placeholder.svg"} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{p.name}</p>
                          <p className="text-xs font-medium">{formatPrice(p.price)}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </form>
            </div>
          )}
        </div>

        {/* Sub-nav row */}
        <div className="hidden lg:block border-t border-white/10">
          <div className="mx-auto max-w-7xl px-4">
            <div className="flex items-center h-12">
              <nav className="flex items-center gap-8 ml-[260px]">
                {navItems.map((item) => {
                  const isActive = (item.href === "/" && isHomeActive) || (item.href !== "/" && location.startsWith(item.href.split("?")[0]))
                  const isShop = item.label === "Shop" || item.label === "Categories"
                  return (
                    <div key={item.label} className="relative" onMouseEnter={() => isShop && setShopOpen(true)} onMouseLeave={() => isShop && setShopOpen(false)}>
                      <Link
                        href={item.href}
                        className="inline-flex items-center gap-1 text-sm font-semibold tracking-wide transition-colors"
                        style={{ color: isActive ? TEAL : "white" }}
                      >
                        {item.label}
                        {item.hasMenu && <ChevronDown className="h-3.5 w-3.5 opacity-70" />}
                      </Link>
                      {isShop && shopOpen && categories.length > 0 && (
                        <div className="absolute top-full left-0 pt-2 w-56 z-50">
                          <div className="bg-white text-foreground rounded-md shadow-xl border border-border py-2">
                            {categories.map((cat) => (
                              <Link
                                key={cat.id}
                                href={`/shop?category=${cat.slug}`}
                                className="block px-4 py-2 text-sm hover:bg-secondary transition-colors"
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
            </div>
          </div>
        </div>
      </div>

      <CartDrawer />
    </header>
  )
}
