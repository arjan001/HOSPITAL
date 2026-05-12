"use client"

import { useState, useMemo, useEffect } from "react"
import { SlidersHorizontal, Grid3X3, LayoutList, X, Search } from "lucide-react"
import { usePagination } from "@/hooks/use-pagination"
import { PaginationControls } from "@/components/pagination-controls"
import { TopBar } from "./top-bar"
import { Navbar } from "./navbar"
import { Footer } from "./footer"
import { ProductCard } from "./product-card"
import { CategoryBreadcrumb } from "./category-breadcrumb"
import type { Product, Category } from "@/lib/types"
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import useSWR from "swr"
import { safeFetcher, asArray } from "@/lib/fetcher"

function formatPrice(price: number): string {
  return `KSh ${price.toLocaleString()}`
}

const COLLECTION_INFO: Record<string, { label: string; tagline: string; fallbackImage: string }> = {
  men: {
    label: "Men's Collection",
    tagline: "Stylish watches, necklaces & accessories for the modern man",
    fallbackImage: "/banners/men-page-banner.jpg",
  },
  women: {
    label: "Women's Collection",
    tagline: "Curated necklaces, bracelets, earrings & accessories for every occasion",
    fallbackImage: "/banners/women-page-banner.jpg",
  },
  babyshop: {
    label: "Kali-ttos Little Wardrobe",
    tagline: "Playful gifts, flowers & wardrobe staples for little ones",
    fallbackImage: "/banners/women-collection.jpg",
  },
}

const sortOptions = [
  { value: "newest", label: "Newest" },
  { value: "price-low", label: "Price: Low to High" },
  { value: "price-high", label: "Price: High to Low" },
  { value: "name", label: "Name A-Z" },
]

function FilterSidebar({
  categories, selectedCategory, setSelectedCategory, priceRange, setPriceRange, showNew, setShowNew, showOffers, setShowOffers, maxPrice,
}: {
  categories: Category[]; selectedCategory: string; setSelectedCategory: (cat: string) => void; priceRange: number[]; setPriceRange: (range: number[]) => void; showNew: boolean; setShowNew: (show: boolean) => void; showOffers: boolean; setShowOffers: (show: boolean) => void; maxPrice: number
}) {
  return (
    <div className="space-y-8">
      <div className="border border-pink-200 rounded-sm overflow-hidden">
        <h3 className="text-sm font-semibold bg-pink-200 text-foreground px-4 py-3">Product Range</h3>
        <div className="flex flex-col">
          <button type="button" onClick={() => setSelectedCategory("")} className={`text-left text-sm px-4 py-3 border-t border-pink-200 transition-colors ${selectedCategory === "" ? "bg-pink-200 font-semibold text-foreground" : "text-foreground hover:bg-pink-50"}`}>All Categories</button>
          {categories.map((cat) => (
            <button key={cat.id} type="button" onClick={() => setSelectedCategory(cat.slug)} className={`text-left text-sm px-4 py-3 border-t border-pink-200 flex items-center justify-between transition-colors ${selectedCategory === cat.slug ? "bg-pink-200 font-semibold text-foreground" : "text-foreground hover:bg-pink-50"}`}>
              {cat.name}
            </button>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider mb-4">Price Range</h3>
        <Slider min={0} max={maxPrice} step={100} value={priceRange} onValueChange={setPriceRange} className="mb-3" />
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{formatPrice(priceRange[0])}</span><span>{formatPrice(priceRange[1])}</span>
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider mb-4">Filter By</h3>
        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-3 cursor-pointer"><Checkbox checked={showNew} onCheckedChange={(checked) => setShowNew(checked === true)} /><span className="text-sm">New Arrivals</span></label>
          <label className="flex items-center gap-3 cursor-pointer"><Checkbox checked={showOffers} onCheckedChange={(checked) => setShowOffers(checked === true)} /><span className="text-sm">On Offer</span></label>
        </div>
      </div>
    </div>
  )
}

export function CollectionPage({ collection }: { collection: string }) {
  const info = COLLECTION_INFO[collection]
  const { data: allProductsData } = useSWR<Product[]>("/api/products", safeFetcher)
  const { data: categoriesData } = useSWR<Category[]>("/api/categories", safeFetcher)
  const allProducts = asArray<Product>(allProductsData)
  const categories = asArray<Category>(categoriesData)

  // Filter products by collection (category)
  const collectionProducts = useMemo(() => {
    console.log('[v0] Filtering by collection:', { collection, allProducts: allProducts.length })
    const filtered = allProducts.filter((p) => {
      const match = p.category?.toLowerCase() === collection.charAt(0).toUpperCase() + collection.slice(1).toLowerCase()
      if (!match) console.log('[v0] Product category mismatch:', { product: p.name, category: p.category, collection })
      return match
    })
    console.log('[v0] Filtered products:', filtered.length)
    return filtered
  }, [allProducts, collection])

  const [selectedCategory, setSelectedCategory] = useState("")
  const [sortBy, setSortBy] = useState("newest")
  const [showNew, setShowNew] = useState(false)
  const [showOffers, setShowOffers] = useState(false)
  const maxProductPrice = collectionProducts.length > 0 ? Math.max(...collectionProducts.map((p) => p.price)) : 10000
  const maxPrice = Math.ceil(maxProductPrice / 100) * 100
  const [priceRange, setPriceRange] = useState([0, maxPrice])
  const [priceInitialized, setPriceInitialized] = useState(false)
  const [gridView, setGridView] = useState<"grid" | "list">("grid")
  const [localSearch, setLocalSearch] = useState("")

  useEffect(() => {
    if (collectionProducts.length > 0 && !priceInitialized) {
      setPriceRange([0, maxPrice])
      setPriceInitialized(true)
    }
  }, [collectionProducts.length, maxPrice, priceInitialized])

  const filtered = useMemo(() => {
    let result = [...collectionProducts]
    if (localSearch) {
      const q = localSearch.toLowerCase()
      result = result.filter((p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || p.tags.some((t) => t.toLowerCase().includes(q)))
    }
    if (selectedCategory) result = result.filter((p) => p.categorySlug === selectedCategory)
    if (showNew) result = result.filter((p) => p.isNew)
    if (showOffers) result = result.filter((p) => p.isOnOffer)
    if (priceRange[0] > 0 || priceRange[1] < maxPrice) result = result.filter((p) => p.price >= priceRange[0] && p.price <= priceRange[1])
    switch (sortBy) {
      case "price-low": result.sort((a, b) => a.price - b.price); break
      case "price-high": result.sort((a, b) => b.price - a.price); break
      case "name": result.sort((a, b) => a.name.localeCompare(b.name)); break
      default: result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }
    return result
  }, [collectionProducts, selectedCategory, showNew, showOffers, priceRange, sortBy, localSearch, maxPrice])

  const { paginatedItems, currentPage, totalPages, totalItems, itemsPerPage, goToPage, changePerPage, resetPage } = usePagination(filtered, { defaultPerPage: 12 })

  useEffect(() => { resetPage() }, [selectedCategory, showNew, showOffers, sortBy, localSearch])

  const activeFilters = [
    selectedCategory && categories.find((c) => c.slug === selectedCategory)?.name,
    showNew && "New Arrivals",
    showOffers && "On Offer",
    (priceRange[0] > 0 || priceRange[1] < maxPrice) && `${formatPrice(priceRange[0])} - ${formatPrice(priceRange[1])}`,
  ].filter(Boolean)

  const activeCategory = categories.find((c) => c.slug === selectedCategory)
  const collectionCategories = useMemo(
    () =>
      categories.filter((c) =>
        collectionProducts.some((p) => p.categorySlug === c.slug),
      ),
    [categories, collectionProducts],
  )
  const heroImage =
    activeCategory?.image ||
    collectionCategories[0]?.image ||
    info?.fallbackImage ||
    "/placeholder.svg"
  const heroTitle = activeCategory?.name || info?.label || "Collection"
  const heroSubtitle = activeCategory
    ? `Discover our ${activeCategory.name.toLowerCase()} within the ${info?.label || "collection"}.`
    : info?.tagline
  const eyebrow = activeCategory ? info?.label : "Shop the Collection"

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Shop", href: "/shop" },
    { label: info?.label || "Collection", href: activeCategory ? `/shop/${collection}` : undefined },
    ...(activeCategory ? [{ label: activeCategory.name }] : []),
  ]

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
            imageUrl={heroImage}
            imageAlt={`${heroTitle} background`}
            eyebrow={eyebrow}
            productCount={filtered.length}
          />

          <div className="flex items-end justify-between mt-2 mb-6">
            <div>
              <h2 className="text-xl md:text-2xl font-serif font-bold">{heroTitle}</h2>
              <p className="text-sm text-muted-foreground mt-1">{filtered.length} product{filtered.length !== 1 ? "s" : ""}</p>
            </div>
            <div className="hidden md:flex items-center border border-border rounded-sm max-w-xs">
              <input type="text" placeholder="Filter products..." value={localSearch} onChange={(e) => setLocalSearch(e.target.value)} className="flex-1 h-9 px-3 bg-background text-sm outline-none" />
              {localSearch && <button type="button" onClick={() => setLocalSearch("")} className="px-2"><X className="h-3.5 w-3.5 text-muted-foreground" /></button>}
              <div className="px-2 border-l border-border"><Search className="h-3.5 w-3.5 text-muted-foreground" /></div>
            </div>
          </div>

          {activeFilters.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-6">
              {activeFilters.map((filter) => (
                <span key={String(filter)} className="flex items-center gap-1.5 bg-secondary text-foreground text-xs px-3 py-1.5 rounded-sm">
                  {String(filter)}
                  <button type="button" onClick={() => {
                    if (filter === categories.find((c) => c.slug === selectedCategory)?.name) setSelectedCategory("")
                    if (filter === "New Arrivals") setShowNew(false)
                    if (filter === "On Offer") setShowOffers(false)
                    if (String(filter).includes("KSh")) setPriceRange([0, maxPrice])
                  }}><X className="h-3 w-3" /></button>
                </span>
              ))}
              <button type="button" onClick={() => { setSelectedCategory(""); setShowNew(false); setShowOffers(false); setPriceRange([0, maxPrice]); setLocalSearch("") }} className="text-xs text-muted-foreground hover:text-foreground underline">Clear All</button>
            </div>
          )}

          <div className="flex gap-8">
            <aside className="hidden lg:block w-60 flex-shrink-0">
              <FilterSidebar categories={categories} selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} priceRange={priceRange} setPriceRange={setPriceRange} showNew={showNew} setShowNew={setShowNew} showOffers={showOffers} setShowOffers={setShowOffers} maxPrice={maxPrice} />
            </aside>

            <div className="flex-1">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Sheet>
                    <SheetTrigger asChild><Button variant="outline" size="sm" className="lg:hidden bg-transparent"><SlidersHorizontal className="h-4 w-4 mr-2" />Filters</Button></SheetTrigger>
                    <SheetContent side="left" className="w-80 bg-background text-foreground p-6">
                      <h2 className="text-lg font-serif font-semibold mb-6">Filters</h2>
                      <FilterSidebar categories={categories} selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} priceRange={priceRange} setPriceRange={setPriceRange} showNew={showNew} setShowNew={setShowNew} showOffers={showOffers} setShowOffers={setShowOffers} maxPrice={maxPrice} />
                    </SheetContent>
                  </Sheet>
                  <div className="hidden sm:flex items-center border border-border rounded-sm">
                    <button type="button" onClick={() => setGridView("grid")} className={`p-2 ${gridView === "grid" ? "bg-foreground text-background" : ""}`}><Grid3X3 className="h-4 w-4" /></button>
                    <button type="button" onClick={() => setGridView("list")} className={`p-2 ${gridView === "list" ? "bg-foreground text-background" : ""}`}><LayoutList className="h-4 w-4" /></button>
                  </div>
                </div>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="text-sm bg-background border border-border px-3 py-2 rounded-sm outline-none">
                  {sortOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>

              {filtered.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-muted-foreground">No products found in this collection yet.</p>
                  <p className="text-sm text-muted-foreground mt-2">Check back soon for new arrivals!</p>
                </div>
              ) : (
                <>
                  <div className={gridView === "grid" ? "grid grid-cols-2 md:grid-cols-3 gap-4 lg:gap-6" : "grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6"}>
                    {paginatedItems.map((product) => <ProductCard key={product.id} product={product} />)}
                  </div>
                  <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalItems}
                    itemsPerPage={itemsPerPage}
                    onPageChange={(p) => { goToPage(p); window.scrollTo({ top: 0, behavior: "smooth" }) }}
                    onItemsPerPageChange={changePerPage}
                    perPageOptions={[12, 24, 48, 96]}
                  />
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
