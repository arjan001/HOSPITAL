"use client"

import React from "react"
import Link from "next/link"
import Image from "next/image"
import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Search, ShoppingBag, Heart, Menu, X, ChevronDown, Phone } from "lucide-react"
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

/** Fire-and-forget search tracking so admin analytics can surface most-searched terms. */
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
  } catch {
    // ignore
  }
}

export function Navbar() {
  const router = useRouter()
  const { totalItems, setIsCartOpen } = useCart()
  const { totalItems: wishlistCount } = useWishlist()
  const { phoneHref, phoneDisplay } = useStoreContact()
  const { data: categoriesData } = useSWR<Category[]>("/api/categories", safeFetcher)
  const { data: allProductsData } = useSWR<Product[]>("/api/products", safeFetcher)
  const categories = asArray<Category>(categoriesData)
  const allProducts = asArray<Product>(allProductsData)
  const [searchOpen, setSearchOpen] = useState(false)
  const [categoriesOpen, setCategoriesOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [suggestions, setSuggestions] = useState<Product[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const mobileSearchRef = useRef<HTMLDivElement>(null)

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
      router.push(`/search?q=${encodeURIComponent(query)}`)
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
    router.push(`/product/${slug}`)
  }

  return (
    <header className="sticky top-0 z-50 bg-background border-b border-border">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex items-center justify-between h-16 lg:h-20">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 bg-background text-foreground p-0">
              <div className="p-6">
                <Link href="/" className="inline-flex items-center">
                  <Image
                    src="/logo-herkingdom.png"
                    alt="Her Kingdom"
                    width={200}
                    height={80}
                    priority
                    className="h-12 w-auto object-contain"
                  />
                </Link>
              </div>
              <nav className="flex flex-col px-6 gap-1">
                <Link href="/" className="py-3 text-sm font-medium border-b border-border">Home</Link>
                <p className="pt-3 pb-1 text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Categories</p>
                {categories.slice(0, 4).map((cat) => {
                  const isNecklaces = cat.slug === "necklaces"
                  return (
                    <Link
                      key={cat.id}
                      href={`/shop?category=${cat.slug}`}
                      className={`relative py-2.5 text-sm font-medium border-b border-border pl-3 ${isNecklaces ? "necklaces-glow font-semibold" : ""}`}
                    >
                      {isNecklaces && (
                        <>
                          <span aria-hidden="true" className="payments-sparkle payments-sparkle-1 absolute left-0 top-1 text-pink-300 text-[9px] leading-none">★</span>
                          <span aria-hidden="true" className="payments-sparkle payments-sparkle-2 absolute right-2 top-1 text-pink-300 text-[10px] leading-none">✦</span>
                          <span aria-hidden="true" className="payments-sparkle payments-sparkle-3 absolute left-1 bottom-1 text-pink-200 text-[9px] leading-none">✧</span>
                          <span aria-hidden="true" className="payments-sparkle payments-sparkle-4 absolute right-3 bottom-1 text-pink-300 text-[10px] leading-none">★</span>
                        </>
                      )}
                      {cat.name}
                    </Link>
                  )
                })}
                <Link href="/track-order" className="py-3 text-sm font-medium border-b border-border">Track My Order</Link>
              </nav>
              <div className="px-6 py-4 mt-4 space-y-3">
                <a href="https://www.instagram.com/herkingdom_jewelry/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">Instagram</a>
                <a href="https://www.tiktok.com/@herkingdom_jewelry" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">TikTok</a>
                <a href={phoneHref} className="flex items-center gap-2 text-sm font-medium"><Phone className="h-4 w-4" />{phoneDisplay}</a>
              </div>
            </SheetContent>
          </Sheet>

          <Link href="/" className="flex items-center shrink-0" aria-label="Her Kingdom - Home">
            <Image
              src="/logo-herkingdom.png"
              alt="Her Kingdom"
              width={220}
              height={80}
              priority
              className="h-10 lg:h-14 w-auto object-contain"
            />
          </Link>

          <div className="hidden lg:flex items-center flex-1 max-w-xl mx-8" ref={searchRef}>
            <form onSubmit={handleSearch} className="relative flex items-center w-full">
              <div className="relative cursor-pointer" onClick={() => setCategoriesOpen(!categoriesOpen)}>
                <div className="flex items-center gap-1 px-4 py-2.5 bg-foreground text-background text-sm font-medium rounded-l-sm">
                  All Categories
                  <ChevronDown className="h-3.5 w-3.5" />
                </div>
                {categoriesOpen && (
                  <div className="absolute top-full left-0 mt-1 w-52 bg-background border border-border shadow-lg rounded-sm z-50">
                    <p className="px-4 pt-3 pb-1 text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Categories</p>
                    {categories.map((cat) => {
                      const isNecklaces = cat.slug === "necklaces"
                      return (
                        <Link
                          key={cat.id}
                          href={`/shop?category=${cat.slug}`}
                          className={`relative block px-4 py-2.5 text-sm font-medium hover:bg-secondary transition-colors ${isNecklaces ? "necklaces-glow font-semibold" : ""}`}
                          onClick={() => setCategoriesOpen(false)}
                        >
                          {isNecklaces && (
                            <>
                              <span aria-hidden="true" className="payments-sparkle payments-sparkle-1 absolute left-1 top-1 text-pink-300 text-[9px] leading-none">★</span>
                              <span aria-hidden="true" className="payments-sparkle payments-sparkle-2 absolute right-2 top-1 text-pink-300 text-[10px] leading-none">✦</span>
                              <span aria-hidden="true" className="payments-sparkle payments-sparkle-3 absolute left-2 bottom-1 text-pink-200 text-[9px] leading-none">✧</span>
                              <span aria-hidden="true" className="payments-sparkle payments-sparkle-4 absolute right-3 bottom-1 text-pink-300 text-[10px] leading-none">★</span>
                            </>
                          )}
                          {cat.name}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
              <input type="text" placeholder="Search necklaces, earrings, bracelets..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1 h-10 px-4 bg-secondary text-sm text-foreground placeholder:text-muted-foreground outline-none" />
              <button type="submit" className="h-10 px-4 bg-foreground text-background rounded-r-sm"><Search className="h-4 w-4" /></button>

              {showSuggestions && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border shadow-lg rounded-sm z-50 overflow-hidden">
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
                      <button type="button" onClick={() => { router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`); setShowSuggestions(false); setSearchQuery("") }} className="w-full text-left px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors border-t border-border">
                        {"View all results for \""}{searchQuery}{"\""}
                      </button>
                    </>
                  ) : (
                    <div className="px-4 py-6 text-center">
                      <p className="text-sm text-muted-foreground">{"No products found for \""}{searchQuery}{"\"."}</p>
                      <button type="button" onClick={() => { router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`); setShowSuggestions(false); setSearchQuery("") }} className="text-xs underline mt-2 text-muted-foreground hover:text-foreground">
                        Search the shop
                      </button>
                    </div>
                  )}
                </div>
              )}
            </form>
          </div>

          <div className="flex items-center gap-1 lg:gap-3">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSearchOpen(!searchOpen)}>
              <Search className="h-5 w-5" /><span className="sr-only">Search</span>
            </Button>
            <Link href="/wishlist" className="hidden lg:flex relative">
              <Button variant="ghost" size="icon"><Heart className={`h-5 w-5 transition-colors ${wishlistCount > 0 ? "fill-pink-500 text-pink-500" : "text-pink-500"}`} /><span className="sr-only">Wishlist</span></Button>
              {wishlistCount > 0 && <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center rounded-full bg-pink-500 text-white text-[10px] font-bold min-w-[18px] h-[18px]">{wishlistCount}</span>}
            </Link>
            <button type="button" className="relative p-2" onClick={() => setIsCartOpen(true)}>
              <ShoppingBag className="h-5 w-5" />
              {totalItems > 0 && <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center rounded-full bg-foreground text-background text-[10px] font-bold min-w-[18px] h-[18px]">{totalItems}</span>}
              <span className="sr-only">Cart</span>
            </button>
          </div>
        </div>

        {searchOpen && (
          <div className="lg:hidden pb-3 animate-fade-in-up" ref={mobileSearchRef}>
            <form onSubmit={handleSearch} className="relative">
              <div className="flex items-center border border-border rounded-sm">
                <input type="text" placeholder="Search jewelry, watches..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1 h-10 px-4 bg-background text-sm outline-none" autoFocus />
                <button type="submit" className="px-3"><Search className="h-4 w-4" /></button>
              </div>
              {showSuggestions && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border shadow-lg rounded-sm z-50 overflow-hidden">
                  {suggestions.length > 0 ? (
                    <>
                      {suggestions.map((p) => (
                        <button key={p.id} type="button" onClick={() => handleSuggestionClick(p.slug)} className="w-full text-left px-4 py-3 hover:bg-secondary transition-colors flex items-center gap-3">
                          <div className="w-10 h-12 bg-secondary rounded-sm overflow-hidden flex-shrink-0"><img src={p.images[0] || "/placeholder.svg"} alt="" className="w-full h-full object-cover" /></div>
                          <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{p.name}</p><p className="text-xs text-muted-foreground">{p.category}</p><p className="text-xs font-medium">{formatPrice(p.price)}</p></div>
                        </button>
                      ))}
                      <button type="button" onClick={() => { handleSearch({ preventDefault: () => {} } as React.FormEvent) }} className="w-full text-left px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors border-t border-border">
                        {"View all results"}
                      </button>
                    </>
                  ) : (
                    <div className="px-4 py-4 text-center">
                      <p className="text-sm text-muted-foreground">{"No products found"}</p>
                    </div>
                  )}
                </div>
              )}
            </form>
          </div>
        )}
      </div>

      <div className="hidden lg:block border-t border-border">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex items-center justify-center h-12">
            <nav className="flex items-center gap-8">
              <Link href="/" className="text-sm font-medium hover:text-muted-foreground transition-colors">Home</Link>
              {categories.slice(0, 4).map((cat) => {
                const isNecklaces = cat.slug === "necklaces"
                return (
                  <Link
                    key={cat.id}
                    href={`/shop?category=${cat.slug}`}
                    className={`relative inline-flex items-center text-sm font-medium transition-colors ${isNecklaces ? "necklaces-glow font-semibold" : "hover:text-muted-foreground"}`}
                  >
                    {isNecklaces && (
                      <>
                        <span aria-hidden="true" className="payments-sparkle payments-sparkle-1 absolute -left-3 -top-2 text-pink-300 text-[10px] leading-none">★</span>
                        <span aria-hidden="true" className="payments-sparkle payments-sparkle-2 absolute -right-3 -top-1 text-pink-300 text-[12px] leading-none">✦</span>
                        <span aria-hidden="true" className="payments-sparkle payments-sparkle-3 absolute -left-2 -bottom-2 text-pink-200 text-[9px] leading-none">✧</span>
                        <span aria-hidden="true" className="payments-sparkle payments-sparkle-4 absolute -right-4 -bottom-1 text-pink-300 text-[11px] leading-none">★</span>
                      </>
                    )}
                    {cat.name}
                  </Link>
                )
              })}
              <Link href="/track-order" className="text-sm font-medium hover:text-muted-foreground transition-colors">Track My Order</Link>
            </nav>
          </div>
        </div>
      </div>

      <CartDrawer />
    </header>
  )
}
