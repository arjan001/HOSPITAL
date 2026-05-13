"use client"

import { useMemo, useState, useEffect } from "react"
import { useLocation } from "wouter"
import { Link } from "wouter"
import { Search, X, SlidersHorizontal, PackageSearch, ArrowRight, Sparkles, Tag } from "lucide-react"
import useSWR from "swr"
import { TopBar } from "./top-bar"
import { Navbar } from "./navbar"
import { Footer } from "./footer"
import { ProductCard } from "./product-card"
import { PaginationControls } from "@/components/pagination-controls"
import { usePagination } from "@/hooks/use-pagination"
import { safeFetcher, asArray } from "@/lib/fetcher"
import type { Product, Category } from "@/lib/types"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Seo, organizationJsonLd, websiteJsonLd, breadcrumbJsonLd, faqJsonLd, productJsonLd } from "@/components/seo"

// ── Brand tokens ──────────────────────────────────────────────────────────────
const WINE        = "#3D0814"
const WINE_CARD   = "#7A2535"
const CREAM       = "#FFFBF5"
const PEACH_LIGHT = "#FAE0BE"
const PEACH_MED   = "#F2DCC8"
const ORANGE      = "#F97316"
const ACCENT_RED  = "#B91C1C"
const PEACH_BORDER = "#E8C9A8"

// ── Search scoring (unchanged logic) ─────────────────────────────────────────
const STOP_WORDS = new Set([
  "and", "or", "the", "a", "an", "of", "for", "with", "to", "in", "on", "at", "by",
])

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w))
}

function scoreProduct(product: Product, tokens: string[], rawQuery: string): number {
  if (tokens.length === 0) return 0
  const nameLc = product.name.toLowerCase()
  const catLc  = product.category.toLowerCase()
  const descLc = product.description.toLowerCase()
  const tagsLc = product.tags.map((t) => t.toLowerCase())
  const rawLc  = rawQuery.toLowerCase().trim()

  let score = 0
  if (rawLc && nameLc.includes(rawLc)) score += 100
  if (rawLc && catLc.includes(rawLc))  score += 50

  for (const tok of tokens) {
    if (nameLc === tok)             score += 80
    else if (nameLc.startsWith(tok)) score += 40
    else if (nameLc.includes(tok))  score += 25
    if (catLc.includes(tok))        score += 15
    if (tagsLc.some((t) => t === tok))          score += 20
    else if (tagsLc.some((t) => t.includes(tok))) score += 8
    if (descLc.includes(tok))       score += 4
  }
  return score
}

// ── Sub-components ────────────────────────────────────────────────────────────
function SectionHeading({ title, count, sub }: { title: string; count?: number; sub?: string }) {
  return (
    <div className="mb-5">
      <Seo
        title="Search Medicines & Health Products"
        description="Find genuine medicines, vitamins and health products across Shaniid RX. Search by name, condition or brand — verified results, transparent pricing."
        canonicalPath="/search"
      />
      <div className="flex items-end justify-between gap-3">
        <h2 className="font-serif text-xl font-bold" style={{ color: WINE }}>{title}</h2>
        {count !== undefined && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: PEACH_LIGHT, color: WINE_CARD }}>
            {count} item{count !== 1 ? "s" : ""}
          </span>
        )}
      </div>
      <div className="mt-1.5 flex gap-1.5">
        <div className="h-[3px] w-10 rounded-full" style={{ background: ORANGE }} />
        <div className="h-[3px] w-6 rounded-full" style={{ background: `${ORANGE}55` }} />
      </div>
      {sub && <p className="text-xs mt-2" style={{ color: "#6b7280" }}>{sub}</p>}
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl overflow-hidden animate-pulse" style={{ background: PEACH_LIGHT, border: `1px solid ${PEACH_BORDER}` }}>
      <div className="aspect-square" style={{ background: PEACH_MED }} />
      <div className="p-3 space-y-2">
        <div className="h-3 rounded-full w-3/4" style={{ background: PEACH_MED }} />
        <div className="h-3 rounded-full w-1/2" style={{ background: PEACH_MED }} />
        <div className="h-4 rounded-full w-1/3" style={{ background: PEACH_MED }} />
      </div>
    </div>
  )
}

function EmptyState({ query }: { query: string }) {
  return (
    <div
      className="rounded-3xl text-center py-16 px-6 flex flex-col items-center"
      style={{ background: `linear-gradient(145deg, ${CREAM} 0%, #FFF0E0 100%)`, border: `1.5px dashed ${PEACH_BORDER}` }}
    >
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
        style={{ background: `linear-gradient(135deg, ${PEACH_LIGHT}, ${PEACH_MED})` }}
      >
        <PackageSearch className="h-9 w-9" style={{ color: WINE_CARD }} />
      </div>
      <h3 className="text-xl font-bold mb-2" style={{ color: WINE }}>No results for &ldquo;{query}&rdquo;</h3>
      <p className="text-sm max-w-xs leading-relaxed" style={{ color: "#6b7280" }}>
        We couldn&rsquo;t find a medicine or product matching that term. Try a different spelling or browse the shop.
      </p>
      <div className="flex flex-wrap justify-center gap-3 mt-8">
        <Link href="/shop">
          <button
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold text-white transition-opacity hover:opacity-90"
            style={{ background: `linear-gradient(135deg, ${WINE_CARD}, ${WINE})` }}
          >
            Browse Shop <ArrowRight className="h-4 w-4" />
          </button>
        </Link>
        <Link href="/care-packs">
          <button
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-colors"
            style={{ background: PEACH_LIGHT, color: WINE, border: `1px solid ${PEACH_BORDER}` }}
          >
            Care Packs
          </button>
        </Link>
      </div>
    </div>
  )
}

function NoQueryState({ categories }: { categories: Category[] }) {
  const suggestions = [
    "Paracetamol", "Vitamin C", "Blood pressure", "Diabetic care",
    "Antibiotic", "Cough syrup", "Glucometer", "Multivitamin",
  ]
  return (
    <div className="py-10">
      {/* Popular searches */}
      <div className="mb-10">
        <SectionHeading title="Popular searches" sub="Tap any term to search instantly" />
        <div className="flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <Link key={s} href={`/search?q=${encodeURIComponent(s)}`}>
              <span
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium cursor-pointer transition-all hover:-translate-y-0.5"
                style={{ background: PEACH_LIGHT, color: WINE, border: `1px solid ${PEACH_BORDER}` }}
              >
                <Search className="h-3 w-3 opacity-60" />
                {s}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Browse by category */}
      {categories.length > 0 && (
        <div>
          <SectionHeading title="Browse by category" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {categories.slice(0, 6).map((cat) => (
              <Link key={cat.id} href={`/search?q=${encodeURIComponent(cat.name)}`}>
                <div
                  className="group relative overflow-hidden rounded-2xl px-5 py-4 cursor-pointer transition-all hover:-translate-y-0.5"
                  style={{
                    background: `linear-gradient(135deg, ${CREAM}, #FFF0E0)`,
                    border: `1.5px solid ${PEACH_BORDER}`,
                    boxShadow: "0 4px 14px -8px rgba(61,8,20,0.15)",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold" style={{ color: WINE }}>{cat.name}</span>
                    <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: ORANGE }} />
                  </div>
                  <Tag className="h-3.5 w-3.5 mt-1.5 opacity-30" style={{ color: WINE }} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function FilterPanel({
  categories,
  selectedCategory,
  setSelectedCategory,
  showNew,
  setShowNew,
  showOffers,
  setShowOffers,
}: {
  categories: Category[]
  selectedCategory: string
  setSelectedCategory: (v: string) => void
  showNew: boolean
  setShowNew: (v: boolean) => void
  showOffers: boolean
  setShowOffers: (v: boolean) => void
}) {
  return (
    <div className="space-y-5">
      {/* Category list */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: `1.5px solid ${PEACH_BORDER}` }}
      >
        <div
          className="px-4 py-3 text-xs font-bold uppercase tracking-widest"
          style={{ background: `linear-gradient(90deg, ${PEACH_LIGHT}, ${CREAM})`, color: WINE }}
        >
          Category
        </div>
        <div style={{ background: CREAM }}>
          <button
            type="button"
            onClick={() => setSelectedCategory("")}
            className="w-full text-left text-sm px-4 py-3 transition-colors"
            style={{
              background: selectedCategory === "" ? PEACH_LIGHT : "transparent",
              color: WINE,
              fontWeight: selectedCategory === "" ? 700 : 400,
              borderTop: `1px solid ${PEACH_BORDER}`,
            }}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.slug)}
              className="w-full text-left text-sm px-4 py-3 transition-colors"
              style={{
                background: selectedCategory === cat.slug ? PEACH_LIGHT : "transparent",
                color: WINE,
                fontWeight: selectedCategory === cat.slug ? 700 : 400,
                borderTop: `1px solid ${PEACH_BORDER}`,
              }}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Toggle filters */}
      <div
        className="rounded-2xl px-4 py-4 space-y-3"
        style={{ background: CREAM, border: `1.5px solid ${PEACH_BORDER}` }}
      >
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: WINE }}>Filter</p>
        {[
          { label: "New Arrivals", value: showNew, set: setShowNew },
          { label: "On Offer", value: showOffers, set: setShowOffers },
        ].map(({ label, value, set }) => (
          <label key={label} className="flex items-center gap-3 cursor-pointer group">
            <button
              type="button"
              role="checkbox"
              aria-checked={value}
              onClick={() => set(!value)}
              className="w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center transition-all"
              style={{
                background: value ? `linear-gradient(135deg, ${WINE_CARD}, ${WINE})` : CREAM,
                border: `2px solid ${value ? WINE : PEACH_BORDER}`,
              }}
            >
              {value && (
                <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3">
                  <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
            <span className="text-sm" style={{ color: WINE }}>{label}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────
export function SearchPage() {
  const [, navigate] = useLocation()
  const initialQuery = new URLSearchParams(window.location.search).get("q") || ""

  const [inputValue, setInputValue]       = useState(initialQuery)
  const [selectedCategory, setSelectedCategory] = useState("")
  const [showNew, setShowNew]             = useState(false)
  const [showOffers, setShowOffers]       = useState(false)
  const [sortBy, setSortBy]               = useState<"relevance" | "price-low" | "price-high" | "newest">("relevance")

  useEffect(() => { setInputValue(initialQuery) }, [initialQuery])

  const { data: productsData, isLoading: productsLoading } = useSWR<Product[]>("/api/products", safeFetcher)
  const { data: categoriesData } = useSWR<Category[]>("/api/categories", safeFetcher)
  const products   = asArray<Product>(productsData)
  const categories = asArray<Category>(categoriesData)

  const query  = initialQuery.trim()
  const tokens = useMemo(() => tokenize(query), [query])

  const scored = useMemo(() => {
    if (!query) return []
    return products
      .map((p) => ({ product: p, score: scoreProduct(p, tokens, query) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
  }, [products, tokens, query])

  const exactMatches = useMemo(() => {
    const lc = query.toLowerCase()
    return scored.filter(({ product }) =>
      product.name.toLowerCase().includes(lc) ||
      product.category.toLowerCase().includes(lc) ||
      product.tags.some((t) => t.toLowerCase().includes(lc))
    )
  }, [scored, query])

  const similarItems = useMemo(() => {
    const exactIds = new Set(exactMatches.map((x) => x.product.id))
    return scored.filter((x) => !exactIds.has(x.product.id))
  }, [scored, exactMatches])

  const relatedByCategory = useMemo(() => {
    const topCats = new Set<string>()
    for (const { product } of [...exactMatches, ...similarItems].slice(0, 5)) {
      if (product.categorySlug) topCats.add(product.categorySlug)
    }
    if (topCats.size === 0 && query) {
      const q = query.toLowerCase()
      for (const cat of categories) {
        if (cat.name.toLowerCase().includes(q) || q.includes(cat.slug)) topCats.add(cat.slug)
      }
    }
    if (topCats.size === 0) return [] as Product[]
    const excluded = new Set([...exactMatches, ...similarItems].map((x) => x.product.id))
    return products.filter((p) => topCats.has(p.categorySlug) && !excluded.has(p.id)).slice(0, 8)
  }, [products, categories, exactMatches, similarItems, query])

  const applyFilters = (items: Product[]) => {
    let r = items
    if (selectedCategory) r = r.filter((p) => p.categorySlug === selectedCategory)
    if (showNew)   r = r.filter((p) => p.isNew)
    if (showOffers) r = r.filter((p) => p.isOnOffer)
    switch (sortBy) {
      case "price-low":  r = [...r].sort((a, b) => a.price - b.price); break
      case "price-high": r = [...r].sort((a, b) => b.price - a.price); break
      case "newest":     r = [...r].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); break
    }
    return r
  }

  const filteredExact   = useMemo(() => applyFilters(exactMatches.map((x) => x.product)),  [exactMatches, selectedCategory, showNew, showOffers, sortBy])
  const filteredSimilar = useMemo(() => applyFilters(similarItems.map((x) => x.product)),  [similarItems, selectedCategory, showNew, showOffers, sortBy])

  const { paginatedItems, currentPage, totalPages, totalItems, itemsPerPage, goToPage, changePerPage, resetPage } =
    usePagination(filteredExact, { defaultPerPage: 12 })

  useEffect(() => { resetPage() }, [selectedCategory, showNew, showOffers, sortBy, query])

  const totalResults = filteredExact.length + filteredSimilar.length

  const activeCategoryName = categories.find((c) => c.slug === selectedCategory)?.name
  const activeFilters = [
    selectedCategory && activeCategoryName,
    showNew   && "New Arrivals",
    showOffers && "On Offer",
  ].filter(Boolean)

  // ── Hero banner copy ──
  const heroEyebrow = query
    ? totalResults > 0
      ? `${totalResults} result${totalResults !== 1 ? "s" : ""} found`
      : "No matches yet"
    : "Shaniid RX Pharmacy"

  const heroTitle = query
    ? `Results for “${query}”`
    : "Find what you need, fast."

  const heroSub = query
    ? totalResults > 0
      ? "Verified medications, devices and wellness products — sorted by relevance to your search."
      : "We couldn't find that one. Try a different spelling or browse the popular categories below."
    : "Search across thousands of medicines, supplements, care packs and devices — delivered the same day across Kenya."

  return (
    <div className="min-h-screen flex flex-col" style={{ background: CREAM }}>
      <TopBar />
      <Navbar />

      <main className="flex-1">
        {/* ── Hero banner — light cream/peach gradient, no duplicate search ── */}
        <div className="relative overflow-hidden">
          {/* Light gradient bg */}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, #FFFBF5 0%, ${PEACH_LIGHT} 55%, #F8D9B6 100%)`,
            }}
          />
          {/* Soft decorative orbs */}
          <div
            className="absolute -top-24 -right-16 w-80 h-80 rounded-full blur-3xl opacity-50"
            style={{ background: "#FBD0AC" }}
          />
          <div
            className="absolute top-10 left-1/3 w-64 h-64 rounded-full blur-3xl opacity-30"
            style={{ background: ORANGE }}
          />
          <div
            className="absolute -bottom-32 -left-20 w-72 h-72 rounded-full blur-3xl opacity-40"
            style={{ background: "#F4C9A0" }}
          />
          {/* Subtle dotted pattern */}
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage: `radial-gradient(${WINE_CARD} 1px, transparent 1px)`,
              backgroundSize: "22px 22px",
            }}
          />
          {/* Bottom fade into cream */}
          <div className="absolute bottom-0 left-0 right-0 h-16" style={{ background: `linear-gradient(to bottom, transparent, ${CREAM})` }} />

          <div className="relative z-10 mx-auto max-w-5xl px-4 pt-14 pb-12 lg:pt-20 lg:pb-16 grid lg:grid-cols-[1fr_auto] gap-8 items-center">
            {/* Left: copy */}
            <div className="text-left">
              <div
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4 border backdrop-blur-md"
                style={{ background: "rgba(255,255,255,0.7)", borderColor: PEACH_BORDER }}
              >
                <Sparkles className="h-3.5 w-3.5" style={{ color: ORANGE }} />
                <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: WINE_CARD }}>
                  {heroEyebrow}
                </span>
              </div>
              <h1
                className="font-serif text-3xl lg:text-5xl font-bold mb-3 leading-tight"
                style={{ color: WINE, letterSpacing: "-0.02em" }}
              >
                {heroTitle}
              </h1>
              <p className="text-sm lg:text-base max-w-xl" style={{ color: "#6B0F1A99" }}>
                {heroSub}
              </p>

              {/* Quick chips — only on idle state */}
              {!query && (
                <div className="flex flex-wrap gap-2 mt-5">
                  {["Pain relief", "Vitamins", "First aid", "Diabetes care", "Skin care"].map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => { setInputValue(t); navigate(`/search?q=${encodeURIComponent(t)}`) }}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold border backdrop-blur-md transition-all hover:scale-105"
                      style={{ background: "rgba(255,255,255,0.85)", borderColor: PEACH_BORDER, color: WINE }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}

              {/* Hint pointing to navbar search */}
              {!query && (
                <p className="text-[11px] mt-5 flex items-center gap-1.5" style={{ color: `${WINE_CARD}AA` }}>
                  <Search className="h-3 w-3" />
                  Use the search bar at the top of the page to begin.
                </p>
              )}
            </div>

            {/* Right: glass icon medallion */}
            <div className="hidden lg:flex justify-end">
              <div
                className="relative w-44 h-44 rounded-3xl flex items-center justify-center backdrop-blur-xl border"
                style={{
                  background: "rgba(255,255,255,0.55)",
                  borderColor: PEACH_BORDER,
                  boxShadow: "0 25px 60px -25px rgba(122,37,53,0.35)",
                }}
              >
                <div
                  className="w-28 h-28 rounded-2xl flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, ${ORANGE}, #ea580c)` }}
                >
                  <PackageSearch className="h-12 w-12 text-white" />
                </div>
                {/* Floating accent dot */}
                <div
                  className="absolute -top-3 -right-3 w-10 h-10 rounded-full flex items-center justify-center shadow-lg"
                  style={{ background: WINE_CARD }}
                >
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="mx-auto max-w-7xl px-4 lg:px-6 py-8">

          {/* Active filter chips + sort */}
          {query && (
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <div className="flex flex-wrap items-center gap-2">
                {activeFilters.length > 0 && activeFilters.map((f) => (
                  <span
                    key={String(f)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
                    style={{ background: PEACH_LIGHT, color: WINE, border: `1px solid ${PEACH_BORDER}` }}
                  >
                    {String(f)}
                    <button
                      type="button"
                      onClick={() => {
                        if (f === activeCategoryName) setSelectedCategory("")
                        if (f === "New Arrivals")     setShowNew(false)
                        if (f === "On Offer")         setShowOffers(false)
                      }}
                      className="ml-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                {activeFilters.length > 1 && (
                  <button
                    type="button"
                    onClick={() => { setSelectedCategory(""); setShowNew(false); setShowOffers(false) }}
                    className="text-xs underline"
                    style={{ color: WINE_CARD }}
                  >
                    Clear all
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Mobile filter sheet */}
                <Sheet>
                  <SheetTrigger asChild>
                    <button
                      type="button"
                      className="lg:hidden inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold"
                      style={{ background: PEACH_LIGHT, color: WINE, border: `1px solid ${PEACH_BORDER}` }}
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5" /> Filters
                    </button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-80 p-6 overflow-y-auto" style={{ background: CREAM }}>
                    <h2 className="text-base font-serif font-semibold mb-5" style={{ color: WINE }}>Filters</h2>
                    <FilterPanel
                      categories={categories}
                      selectedCategory={selectedCategory}
                      setSelectedCategory={setSelectedCategory}
                      showNew={showNew}
                      setShowNew={setShowNew}
                      showOffers={showOffers}
                      setShowOffers={setShowOffers}
                    />
                  </SheetContent>
                </Sheet>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="h-9 px-3 rounded-full text-sm outline-none"
                  style={{
                    background: CREAM,
                    border: `1.5px solid ${PEACH_BORDER}`,
                    color: WINE,
                  }}
                >
                  <option value="relevance">Most Relevant</option>
                  <option value="newest">Newest</option>
                  <option value="price-low">Price: Low → High</option>
                  <option value="price-high">Price: High → Low</option>
                </select>
              </div>
            </div>
          )}

          {/* ── Two-column layout ── */}
          <div className="flex gap-8">
            {/* Sidebar (desktop) */}
            {query && (
              <aside className="hidden lg:block w-60 flex-shrink-0">
                <FilterPanel
                  categories={categories}
                  selectedCategory={selectedCategory}
                  setSelectedCategory={setSelectedCategory}
                  showNew={showNew}
                  setShowNew={setShowNew}
                  showOffers={showOffers}
                  setShowOffers={setShowOffers}
                />
              </aside>
            )}

            {/* Main results */}
            <div className="flex-1 min-w-0">
              {!query ? (
                <NoQueryState categories={categories} />
              ) : productsLoading ? (
                <div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 lg:gap-6">
                    {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
                  </div>
                </div>
              ) : totalResults === 0 ? (
                <>
                  <EmptyState query={query} />
                  {relatedByCategory.length > 0 && (
                    <section className="mt-10">
                      <SectionHeading title="Customer favourites" sub="Popular products our customers love" />
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-5">
                        {relatedByCategory.map((p) => <ProductCard key={p.id} product={p} />)}
                      </div>
                    </section>
                  )}
                </>
              ) : (
                <>
                  {/* Exact / direct matches */}
                  {filteredExact.length > 0 && (
                    <section className="mb-10">
                      <SectionHeading
                        title="Matching results"
                        count={filteredExact.length}
                      />
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 lg:gap-5">
                        {paginatedItems.map((p) => <ProductCard key={p.id} product={p} />)}
                      </div>
                      <PaginationControls
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={totalItems}
                        itemsPerPage={itemsPerPage}
                        onPageChange={(p) => { goToPage(p); window.scrollTo({ top: 0, behavior: "smooth" }) }}
                        onItemsPerPageChange={changePerPage}
                        perPageOptions={[12, 24, 48]}
                      />
                    </section>
                  )}

                  {/* No-exact message */}
                  {filteredExact.length === 0 && filteredSimilar.length > 0 && (
                    <div
                      className="rounded-2xl px-5 py-4 mb-8 flex items-center gap-3"
                      style={{ background: `linear-gradient(90deg, ${PEACH_LIGHT}, ${CREAM})`, border: `1.5px solid ${PEACH_BORDER}` }}
                    >
                      <PackageSearch className="h-5 w-5 flex-shrink-0" style={{ color: WINE_CARD }} />
                      <div>
                        <p className="text-sm font-semibold" style={{ color: WINE }}>
                          No exact match for &ldquo;{query}&rdquo;
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>
                          Showing related products by tag, category &amp; description.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Similar / related */}
                  {filteredSimilar.length > 0 && (
                    <section className="mb-10">
                      <SectionHeading
                        title="Similar products"
                        count={filteredSimilar.length}
                        sub="Related by tag, category or description"
                      />
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 lg:gap-5">
                        {filteredSimilar.slice(0, 12).map((p) => <ProductCard key={p.id} product={p} />)}
                      </div>
                    </section>
                  )}

                  {/* You might also like */}
                  {relatedByCategory.length > 0 && filteredSimilar.length === 0 && filteredExact.length > 0 && (
                    <section>
                      <div className="flex items-center justify-between mb-1">
                        <SectionHeading title="You might also like" />
                        <Link href="/shop" className="text-xs font-semibold flex items-center gap-1 hover:underline" style={{ color: WINE_CARD }}>
                          Shop all <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-5">
                        {relatedByCategory.map((p) => <ProductCard key={p.id} product={p} />)}
                      </div>
                    </section>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
