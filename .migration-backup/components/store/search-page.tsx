"use client"

import { useMemo, useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Search, X, SlidersHorizontal } from "lucide-react"
import useSWR from "swr"
import { TopBar } from "./top-bar"
import { Navbar } from "./navbar"
import { Footer } from "./footer"
import { ProductCard } from "./product-card"
import { CategoryBreadcrumb } from "./category-breadcrumb"
import { PaginationControls } from "@/components/pagination-controls"
import { usePagination } from "@/hooks/use-pagination"
import { safeFetcher, asArray } from "@/lib/fetcher"
import type { Product, Category } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Checkbox } from "@/components/ui/checkbox"

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
  const catLc = product.category.toLowerCase()
  const descLc = product.description.toLowerCase()
  const tagsLc = product.tags.map((t) => t.toLowerCase())
  const rawLc = rawQuery.toLowerCase().trim()

  let score = 0

  if (rawLc && nameLc.includes(rawLc)) score += 100
  if (rawLc && catLc.includes(rawLc)) score += 50

  for (const tok of tokens) {
    if (nameLc === tok) score += 80
    else if (nameLc.startsWith(tok)) score += 40
    else if (nameLc.includes(tok)) score += 25

    if (catLc.includes(tok)) score += 15
    if (tagsLc.some((t) => t === tok)) score += 20
    else if (tagsLc.some((t) => t.includes(tok))) score += 8
    if (descLc.includes(tok)) score += 4
  }

  return score
}

export function SearchPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialQuery = searchParams.get("q") || ""

  const [inputValue, setInputValue] = useState(initialQuery)
  const [selectedCategory, setSelectedCategory] = useState("")
  const [showNew, setShowNew] = useState(false)
  const [showOffers, setShowOffers] = useState(false)
  const [sortBy, setSortBy] = useState<"relevance" | "price-low" | "price-high" | "newest">("relevance")

  useEffect(() => {
    setInputValue(initialQuery)
  }, [initialQuery])

  const { data: productsData, isLoading: productsLoading } = useSWR<Product[]>("/api/products", safeFetcher)
  const { data: categoriesData } = useSWR<Category[]>("/api/categories", safeFetcher)
  const products = asArray<Product>(productsData)
  const categories = asArray<Category>(categoriesData)

  const query = initialQuery.trim()
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
    return scored.filter(({ product }) => {
      if (!lc) return false
      return (
        product.name.toLowerCase().includes(lc) ||
        product.category.toLowerCase().includes(lc) ||
        product.tags.some((t) => t.toLowerCase().includes(lc))
      )
    })
  }, [scored, query])

  const similarItems = useMemo(() => {
    const exactIds = new Set(exactMatches.map((x) => x.product.id))
    return scored.filter((x) => !exactIds.has(x.product.id))
  }, [scored, exactMatches])

  const relatedByCategory = useMemo(() => {
    const topCategories = new Set<string>()
    for (const { product } of [...exactMatches, ...similarItems].slice(0, 5)) {
      if (product.categorySlug) topCategories.add(product.categorySlug)
    }
    if (topCategories.size === 0 && query) {
      const q = query.toLowerCase()
      for (const cat of categories) {
        if (cat.name.toLowerCase().includes(q) || q.includes(cat.slug)) {
          topCategories.add(cat.slug)
        }
      }
    }
    if (topCategories.size === 0) return [] as Product[]
    const excluded = new Set([...exactMatches, ...similarItems].map((x) => x.product.id))
    return products.filter((p) => topCategories.has(p.categorySlug) && !excluded.has(p.id)).slice(0, 8)
  }, [products, categories, exactMatches, similarItems, query])

  const applyFilters = (items: Product[]) => {
    let result = items
    if (selectedCategory) result = result.filter((p) => p.categorySlug === selectedCategory)
    if (showNew) result = result.filter((p) => p.isNew)
    if (showOffers) result = result.filter((p) => p.isOnOffer)
    switch (sortBy) {
      case "price-low":
        result = [...result].sort((a, b) => a.price - b.price)
        break
      case "price-high":
        result = [...result].sort((a, b) => b.price - a.price)
        break
      case "newest":
        result = [...result].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        break
    }
    return result
  }

  const filteredExact = useMemo(() => applyFilters(exactMatches.map((x) => x.product)), [exactMatches, selectedCategory, showNew, showOffers, sortBy])
  const filteredSimilar = useMemo(() => applyFilters(similarItems.map((x) => x.product)), [similarItems, selectedCategory, showNew, showOffers, sortBy])

  const { paginatedItems, currentPage, totalPages, totalItems, itemsPerPage, goToPage, changePerPage, resetPage } =
    usePagination(filteredExact, { defaultPerPage: 12 })

  useEffect(() => { resetPage() }, [selectedCategory, showNew, showOffers, sortBy, query])

  const totalResults = filteredExact.length + filteredSimilar.length

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const v = inputValue.trim()
    if (v) router.push(`/search?q=${encodeURIComponent(v)}`)
    else router.push(`/search`)
  }

  const activeCategoryName = categories.find((c) => c.slug === selectedCategory)?.name
  const activeFilters = [
    selectedCategory && activeCategoryName,
    showNew && "New Arrivals",
    showOffers && "On Offer",
  ].filter(Boolean)

  const FilterPanel = () => (
    <div className="space-y-6">
      <div className="border border-pink-200 rounded-sm overflow-hidden">
        <h3 className="text-sm font-semibold bg-pink-200 text-foreground px-4 py-3">Refine by Category</h3>
        <div className="flex flex-col">
          <button
            type="button"
            onClick={() => setSelectedCategory("")}
            className={`text-left text-sm px-4 py-3 border-t border-pink-200 transition-colors ${selectedCategory === "" ? "bg-pink-200 font-semibold" : "hover:bg-pink-50"}`}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.slug)}
              className={`text-left text-sm px-4 py-3 border-t border-pink-200 transition-colors ${selectedCategory === cat.slug ? "bg-pink-200 font-semibold" : "hover:bg-pink-50"}`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider mb-3">Filter By</h3>
        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <Checkbox checked={showNew} onCheckedChange={(v) => setShowNew(v === true)} />
            <span className="text-sm">New Arrivals</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <Checkbox checked={showOffers} onCheckedChange={(v) => setShowOffers(v === true)} />
            <span className="text-sm">On Offer</span>
          </label>
        </div>
      </div>
    </div>
  )

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Search", href: "/search" },
    ...(query ? [{ label: `"${query}"` }] : []),
  ]

  const heroTitle = query ? `Results for "${query}"` : "Search Her Kingdom"
  const heroSubtitle = query
    ? totalResults === 0
      ? "We couldn't find an exact match. Try browsing similar pieces below."
      : `Found ${totalResults} item${totalResults === 1 ? "" : "s"} matching your search.`
    : "Search thousands of curated jewelry & accessories."

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <CategoryBreadcrumb
            items={breadcrumbItems}
            title={heroTitle}
            subtitle={heroSubtitle}
            imageUrl={categories[0]?.image || "/banners/hero-dress-floral-white.jpg"}
            imageAlt="Search jewelry"
            eyebrow="Search"
            productCount={totalResults}
          />

          <form onSubmit={handleSubmit} className="mt-6 mb-8">
            <div className="flex items-center border border-border rounded-sm overflow-hidden max-w-2xl">
              <div className="pl-4 pr-2 text-muted-foreground">
                <Search className="h-4 w-4" />
              </div>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Search necklaces, earrings, bracelets, watches..."
                className="flex-1 h-11 px-2 bg-background text-sm outline-none"
                autoFocus={!query}
              />
              {inputValue && (
                <button type="button" onClick={() => setInputValue("")} className="px-2 text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              )}
              <button type="submit" className="h-11 px-5 bg-foreground text-background text-sm font-medium">
                Search
              </button>
            </div>
          </form>

          {activeFilters.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-6">
              {activeFilters.map((f) => (
                <span key={String(f)} className="flex items-center gap-1.5 bg-secondary text-foreground text-xs px-3 py-1.5 rounded-sm">
                  {String(f)}
                  <button
                    type="button"
                    onClick={() => {
                      if (f === activeCategoryName) setSelectedCategory("")
                      if (f === "New Arrivals") setShowNew(false)
                      if (f === "On Offer") setShowOffers(false)
                    }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={() => { setSelectedCategory(""); setShowNew(false); setShowOffers(false) }}
                className="text-xs text-muted-foreground hover:text-foreground underline"
              >
                Clear All
              </button>
            </div>
          )}

          <div className="flex gap-8">
            <aside className="hidden lg:block w-60 flex-shrink-0">
              <FilterPanel />
            </aside>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="outline" size="sm" className="lg:hidden bg-transparent">
                        <SlidersHorizontal className="h-4 w-4 mr-2" />Filters
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-80 bg-background text-foreground p-6">
                      <h2 className="text-lg font-serif font-semibold mb-6">Filters</h2>
                      <FilterPanel />
                    </SheetContent>
                  </Sheet>
                </div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="text-sm bg-background border border-border px-3 py-2 rounded-sm outline-none"
                >
                  <option value="relevance">Most Relevant</option>
                  <option value="newest">Newest</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                </select>
              </div>

              {!query ? (
                <div className="text-center py-20 border border-dashed border-border rounded-sm">
                  <Search className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">Enter a search term above to discover jewelry, accessories and more.</p>
                  <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                    {categories.slice(0, 6).map((cat) => (
                      <Link
                        key={cat.id}
                        href={`/search?q=${encodeURIComponent(cat.name)}`}
                        className="text-xs border border-border rounded-full px-3 py-1 hover:bg-secondary"
                      >
                        {cat.name}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : productsLoading ? (
                <div className="text-center py-16 text-sm text-muted-foreground">Loading products...</div>
              ) : (
                <>
                  {filteredExact.length > 0 ? (
                    <>
                      <div className="flex items-end justify-between mb-4">
                        <h2 className="text-lg md:text-xl font-serif font-semibold">
                          Matching results
                        </h2>
                        <p className="text-xs text-muted-foreground">
                          {filteredExact.length} item{filteredExact.length === 1 ? "" : "s"}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 lg:gap-6">
                        {paginatedItems.map((product) => (
                          <ProductCard key={product.id} product={product} />
                        ))}
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
                    </>
                  ) : (
                    <div className="text-center py-12 border border-dashed border-border rounded-sm mb-8">
                      <p className="text-sm text-muted-foreground">
                        No exact matches for <span className="font-medium text-foreground">&ldquo;{query}&rdquo;</span>.
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">Have a look at these similar pieces.</p>
                    </div>
                  )}

                  {filteredSimilar.length > 0 && (
                    <section className="mt-12">
                      <div className="flex items-end justify-between mb-4">
                        <div>
                          <h2 className="text-lg md:text-xl font-serif font-semibold">Similar items</h2>
                          <p className="text-xs text-muted-foreground mt-1">
                            Pieces related to your search by tag, category, or description.
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {filteredSimilar.length} item{filteredSimilar.length === 1 ? "" : "s"}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 lg:gap-6">
                        {filteredSimilar.slice(0, 12).map((product) => (
                          <ProductCard key={product.id} product={product} />
                        ))}
                      </div>
                    </section>
                  )}

                  {filteredExact.length === 0 && filteredSimilar.length === 0 && relatedByCategory.length === 0 && (
                    <div className="text-center py-16">
                      <p className="text-sm text-muted-foreground mb-4">
                        We couldn&rsquo;t find anything matching <span className="font-medium text-foreground">&ldquo;{query}&rdquo;</span>.
                      </p>
                      <Link
                        href="/shop"
                        className="inline-block text-sm underline text-foreground hover:text-muted-foreground"
                      >
                        Browse the full shop
                      </Link>
                    </div>
                  )}

                  {relatedByCategory.length > 0 && filteredSimilar.length === 0 && filteredExact.length > 0 && (
                    <section className="mt-12">
                      <div className="flex items-end justify-between mb-4">
                        <h2 className="text-lg md:text-xl font-serif font-semibold">You might also like</h2>
                        <Link href="/shop" className="text-xs underline text-muted-foreground hover:text-foreground">Shop all</Link>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
                        {relatedByCategory.map((product) => (
                          <ProductCard key={product.id} product={product} />
                        ))}
                      </div>
                    </section>
                  )}

                  {filteredExact.length === 0 && filteredSimilar.length === 0 && relatedByCategory.length > 0 && (
                    <section className="mt-6">
                      <div className="flex items-end justify-between mb-4">
                        <h2 className="text-lg md:text-xl font-serif font-semibold">Customer favourites</h2>
                        <Link href="/shop" className="text-xs underline text-muted-foreground hover:text-foreground">Shop all</Link>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
                        {relatedByCategory.map((product) => (
                          <ProductCard key={product.id} product={product} />
                        ))}
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
