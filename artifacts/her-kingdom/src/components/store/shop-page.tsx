"use client"

import { useState, useMemo, useEffect, type ReactNode } from "react"
import { Link } from "wouter"
import { Seo, organizationJsonLd, websiteJsonLd, breadcrumbJsonLd, faqJsonLd, productJsonLd } from "@/components/seo"

import {
  SlidersHorizontal,
  X,
  Search,
  ChevronDown,
  ChevronUp,
  Pill,
  Stethoscope,
  Activity,
  HeartPulse,
  Dumbbell,
  Baby,
  User as UserIcon,
} from "lucide-react"
import { usePagination } from "@/hooks/use-pagination"
import { PaginationControls } from "@/components/pagination-controls"
import { TopBar } from "./top-bar"
import { Navbar } from "./navbar"
import { Footer } from "./footer"
import { ProductCard } from "./product-card"
import { QuickViewProvider } from "@/lib/quick-view-context"
import { QuickViewModal } from "./quick-view-modal"
import type { Product, Category } from "@/lib/types"
import { useCategories } from "@/components/admin/categories"
import { analyticsUrls } from "@/lib/analytics-track"
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import useSWR from "swr"
import { safeFetcher, asArray } from "@/lib/fetcher"

function formatPrice(price: number): string {
  return `KSh ${price.toLocaleString()}`
}

const TEXT_WINE = "#3D0814"
const TEXT_WINE_SOFT = "#6B0F1A"
const ACCENT_RED = "#B91C1C"
const ACCENT_ORANGE = "#F97316"
const PEACH_BORDER = "#F2DCC8"
const PEACH_GRADIENT =
  "linear-gradient(115deg, #FCE3CB 0%, #F8CDB1 50%, #F1B59A 100%)"
const PEACH_TAB_GRADIENT =
  "linear-gradient(135deg, #FFE7D1 0%, #F8CFB3 100%)"

const sortOptions = [
  { value: "random", label: "Recommended" },
  { value: "newest", label: "Newest" },
  { value: "price-low", label: "Price: Low to High" },
  { value: "price-high", label: "Price: High to Low" },
  { value: "name", label: "Name A-Z" },
]

// Top tab strip categories — visual grouping that filters by collection.
type TopTab = {
  key: string
  label: string
  match: (p: Product) => boolean
}

const topTabs: TopTab[] = [
  { key: "all", label: "All", match: () => true },
  {
    key: "otc",
    label: "OTC",
    match: (p) =>
      p.categorySlug === "medications" ||
      p.tags.some((t) => /otc|over.the.counter|pain|cold|flu|fever/i.test(t)),
  },
  {
    key: "care-packs",
    label: "Care packs",
    match: (p) =>
      p.collection === "care-packs" ||
      p.tags.some((t) => /care.?pack/i.test(t)),
  },
  {
    key: "devices",
    label: "Devices",
    match: (p) =>
      p.categorySlug === "devices" ||
      p.tags.some((t) => /device|monitor|thermometer|meter/i.test(t)),
  },
  {
    key: "supplements",
    label: "Supplements",
    match: (p) =>
      p.categorySlug === "supplements" ||
      p.tags.some((t) => /supplement|vitamin|protein/i.test(t)),
  },
  {
    key: "gym",
    label: "GYM",
    match: (p) =>
      p.tags.some((t) => /gym|fitness|protein|sport|workout/i.test(t)),
  },
]

const carePackOptions = [
  { id: "diabetes", label: "Diabetes Care Packs", match: /diabet/i },
  { id: "bp", label: "Blood Pressure Care Packs", match: /blood.?pressure|hypertension/i },
  { id: "asthma", label: "Asthma & Respiratory Packs", match: /asthma|respirat|inhal/i },
  { id: "cold-flu", label: "Cold & Flu Pack", match: /cold|flu/i },
]

function mulberry32(seed: number) {
  let t = seed >>> 0
  return function () {
    t = (t + 0x6d2b79f5) >>> 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

function shuffleWithSeed<T>(items: T[], seed: number): T[] {
  const rng = mulberry32(seed)
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// ---- Sidebar accordion ---------------------------------------------------

type SidebarGroupProps = {
  id: string
  title: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  open: boolean
  onToggle: () => void
  children: ReactNode
}

function SidebarGroup({ id, title, icon: Icon, open, onToggle, children }: SidebarGroupProps) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "#FFFFFF",
        border: `1px solid ${PEACH_BORDER}`,
        boxShadow: "0 8px 22px -18px rgba(184,60,30,0.35)",
      }}
    >
      <Seo
        title="Shop Medicines, Vitamins & Health Essentials"
        description="Browse Shaniid RX's full pharmacy catalogue: prescription medicines, vitamins, baby care, devices and personal care — verified suppliers, fair prices."
        keywords={["online pharmacy shop","buy medicine online Kenya","vitamins Nairobi","baby care","medical devices Kenya","Shaniid RX shop"]}
        canonicalPath="/shop"
        jsonLd={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Shop", path: "/shop" }])}
      />
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={`sidebar-group-${id}`}
        className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[#FFF6EE]"
        style={{ color: TEXT_WINE }}
      >
        <span className="flex items-center gap-2.5">
          <span
            className="inline-flex items-center justify-center w-7 h-7 rounded-full"
            style={{ background: PEACH_TAB_GRADIENT, color: ACCENT_RED }}
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
          <span className="text-sm font-semibold">{title}</span>
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 opacity-70" />
        ) : (
          <ChevronDown className="h-4 w-4 opacity-70" />
        )}
      </button>
      {open && (
        <div id={`sidebar-group-${id}`} className="px-4 pb-4 pt-1">
          {children}
        </div>
      )}
    </div>
  )
}

function FilterSidebar({
  categories,
  selectedCategory,
  setSelectedCategory,
  priceRange,
  setPriceRange,
  showNew,
  setShowNew,
  showOffers,
  setShowOffers,
  carePacks,
  setCarePacks,
  maxPrice,
}: {
  categories: Category[]
  selectedCategory: string
  setSelectedCategory: (cat: string) => void
  priceRange: number[]
  setPriceRange: (range: number[]) => void
  showNew: boolean
  setShowNew: (show: boolean) => void
  showOffers: boolean
  setShowOffers: (show: boolean) => void
  carePacks: string[]
  setCarePacks: (vals: string[]) => void
  maxPrice: number
}) {
  const [open, setOpen] = useState<Record<string, boolean>>({
    categories: true,
    carepacks: true,
    price: true,
    filters: false,
  })
  const toggle = (k: string) => setOpen((s) => ({ ...s, [k]: !s[k] }))

  const toggleCarePack = (id: string) => {
    if (carePacks.includes(id)) setCarePacks(carePacks.filter((x) => x !== id))
    else setCarePacks([...carePacks, id])
  }

  return (
    <div className="space-y-3">
      <SidebarGroup id="categories" title="Categories" icon={Pill} open={open.categories} onToggle={() => toggle("categories")}>
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => setSelectedCategory("")}
            className="text-left text-sm px-3 py-2 rounded-lg transition-colors"
            style={{
              background: selectedCategory === "" ? PEACH_TAB_GRADIENT : "transparent",
              color: TEXT_WINE,
              fontWeight: selectedCategory === "" ? 600 : 500,
            }}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.slug)}
              className="text-left text-sm px-3 py-2 rounded-lg transition-colors hover:bg-[#FFF6EE]"
              style={{
                background: selectedCategory === cat.slug ? PEACH_TAB_GRADIENT : "transparent",
                color: TEXT_WINE,
                fontWeight: selectedCategory === cat.slug ? 600 : 500,
              }}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </SidebarGroup>

      <SidebarGroup id="carepacks" title="Care Packs" icon={HeartPulse} open={open.carepacks} onToggle={() => toggle("carepacks")}>
        <div className="flex flex-col gap-2.5">
          {carePackOptions.map((opt) => (
            <label key={opt.id} className="flex items-center gap-2.5 cursor-pointer text-sm" style={{ color: TEXT_WINE }}>
              <Checkbox
                checked={carePacks.includes(opt.id)}
                onCheckedChange={() => toggleCarePack(opt.id)}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      </SidebarGroup>

      <SidebarGroup id="otc" title="OTC" icon={Stethoscope} open={!!open.otc} onToggle={() => toggle("otc")}>
        <p className="text-xs leading-relaxed" style={{ color: TEXT_WINE_SOFT }}>
          Pain & fever, cold & flu, allergy and digestive aids. Use the top "OTC" tab for the full list.
        </p>
      </SidebarGroup>

      <SidebarGroup id="supplements" title="Supplements" icon={Activity} open={!!open.supplements} onToggle={() => toggle("supplements")}>
        <p className="text-xs leading-relaxed" style={{ color: TEXT_WINE_SOFT }}>
          Vitamins, minerals and daily wellness picks.
        </p>
      </SidebarGroup>

      <SidebarGroup id="gym" title="GYM" icon={Dumbbell} open={!!open.gym} onToggle={() => toggle("gym")}>
        <p className="text-xs leading-relaxed" style={{ color: TEXT_WINE_SOFT }}>
          Protein, recovery and performance products.
        </p>
      </SidebarGroup>

      <SidebarGroup id="mens" title="Men's Health" icon={UserIcon} open={!!open.mens} onToggle={() => toggle("mens")}>
        <p className="text-xs leading-relaxed" style={{ color: TEXT_WINE_SOFT }}>
          Wellness, hair and lifestyle support for men.
        </p>
      </SidebarGroup>

      <SidebarGroup id="baby" title="Baby Care" icon={Baby} open={!!open.baby} onToggle={() => toggle("baby")}>
        <p className="text-xs leading-relaxed" style={{ color: TEXT_WINE_SOFT }}>
          Infant nutrition, hygiene and care essentials.
        </p>
      </SidebarGroup>

      <SidebarGroup id="price" title="Price Range" icon={Activity} open={open.price} onToggle={() => toggle("price")}>
        <Slider
          min={0}
          max={maxPrice}
          step={100}
          value={priceRange}
          onValueChange={setPriceRange}
          className="my-2"
        />
        <div className="flex items-center justify-between text-xs" style={{ color: TEXT_WINE_SOFT }}>
          <span>{formatPrice(priceRange[0])}</span>
          <span>{formatPrice(priceRange[1])}</span>
        </div>
      </SidebarGroup>

      <SidebarGroup id="filters" title="Quick Filters" icon={SlidersHorizontal} open={open.filters} onToggle={() => toggle("filters")}>
        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-3 cursor-pointer text-sm" style={{ color: TEXT_WINE }}>
            <Checkbox checked={showNew} onCheckedChange={(c) => setShowNew(c === true)} />
            <span>New Arrivals</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer text-sm" style={{ color: TEXT_WINE }}>
            <Checkbox checked={showOffers} onCheckedChange={(c) => setShowOffers(c === true)} />
            <span>On Offer</span>
          </label>
        </div>
      </SidebarGroup>
    </div>
  )
}

// --------------------------------------------------------------------------

export function ShopPage({ seoIntro }: { seoIntro?: ReactNode } = {}) {
  const searchParams = new URLSearchParams(window.location.search)
  const categoryParam = searchParams.get("category") || ""
  const filterParam = searchParams.get("filter") || ""
  const queryParam = searchParams.get("q") || ""
  const tagParam = searchParams.get("tag") || ""

  const {
    data: productsData,
    error: productsError,
    isLoading: productsLoading,
    mutate: refetchProducts,
  } = useSWR<Product[]>("/api/products", safeFetcher)
  const products = asArray<Product>(productsData)
  const categories = useCategories()

  const isShopAll = !categoryParam && !filterParam && !queryParam

  const [selectedCategory, setSelectedCategory] = useState(categoryParam)
  const [activeTab, setActiveTab] = useState<string>(filterParam === "offers" ? "care-packs" : "all")
  const [carePacks, setCarePacks] = useState<string[]>([])
  const [sortBy, setSortBy] = useState(isShopAll ? "random" : "newest")
  const [showNew, setShowNew] = useState(filterParam === "new")
  const [showOffers, setShowOffers] = useState(filterParam === "offers")
  const minProductPrice = products.length > 0 ? Math.min(...products.map((p) => p.price)) : 0
  const maxProductPrice = products.length > 0 ? Math.max(...products.map((p) => p.price)) : 10000
  void minProductPrice
  const maxPrice = Math.ceil(maxProductPrice / 100) * 100
  const [priceRange, setPriceRange] = useState([0, maxPrice])
  const [priceInitialized, setPriceInitialized] = useState(false)
  const [localSearch, setLocalSearch] = useState(queryParam)
  const [randomSeed, setRandomSeed] = useState(1)

  useEffect(() => {
    setRandomSeed(Math.floor(Math.random() * 2 ** 31) || 1)
  }, [])

  useEffect(() => {
    if (!queryParam) return
    if (typeof window === "undefined") return
    const normalised = queryParam.trim().toLowerCase().slice(0, 80)
    if (!normalised) return
    const key = `hk_search_logged_${normalised}`
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, "1")
    const sid = sessionStorage.getItem("kf_sid") || ""
    fetch(analyticsUrls.trackEvent, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType: "search",
        eventTarget: normalised,
        eventData: { action: "url", raw: queryParam.slice(0, 200) },
        pagePath: "/shop",
        sessionId: sid,
      }),
      keepalive: true,
    }).catch(() => {})
  }, [queryParam])

  useEffect(() => {
    if (products.length > 0 && !priceInitialized) {
      setPriceRange([0, maxPrice])
      setPriceInitialized(true)
    }
  }, [products.length, maxPrice, priceInitialized])

  const filtered = useMemo(() => {
    let result = [...products]

    // Top tab filter
    const tab = topTabs.find((t) => t.key === activeTab)
    if (tab && activeTab !== "all") result = result.filter(tab.match)

    if (queryParam) {
      const q = queryParam.toLowerCase()
      result = result.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q)),
      )
    }

    if (localSearch && !queryParam) {
      const q = localSearch.toLowerCase()
      result = result.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q)),
      )
    }

    if (tagParam) {
      const t = tagParam.toLowerCase().replace(/-/g, " ").trim()
      result = result.filter((p) =>
        p.tags.some((pt) => {
          const norm = pt.toLowerCase()
          return norm === t || norm.replace(/-/g, " ") === t || norm.includes(t)
        }),
      )
    }

    if (selectedCategory) result = result.filter((p) => p.categorySlug === selectedCategory)
    if (showNew) result = result.filter((p) => p.isNew)
    if (showOffers) result = result.filter((p) => p.isOnOffer)

    if (carePacks.length > 0) {
      result = result.filter((p) => {
        const blob = `${p.name} ${p.description} ${p.tags.join(" ")}`
        return carePacks.some((id) => {
          const opt = carePackOptions.find((o) => o.id === id)
          return opt ? opt.match.test(blob) : false
        })
      })
    }

    if (priceRange[0] > 0 || priceRange[1] < maxPrice) {
      result = result.filter((p) => p.price >= priceRange[0] && p.price <= priceRange[1])
    }

    switch (sortBy) {
      case "price-low": result.sort((a, b) => a.price - b.price); break
      case "price-high": result.sort((a, b) => b.price - a.price); break
      case "name": result.sort((a, b) => a.name.localeCompare(b.name)); break
      case "random": result = shuffleWithSeed(result, randomSeed); break
      case "newest":
      default:
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }
    return result
  }, [products, activeTab, selectedCategory, showNew, showOffers, carePacks, priceRange, sortBy, queryParam, localSearch, tagParam, randomSeed, maxPrice])

  const topPopular = useMemo(
    () => [...products].sort((a, b) => (b.isOnOffer ? 1 : 0) - (a.isOnOffer ? 1 : 0)).slice(0, 8),
    [products],
  )
  const featuredSupplements = useMemo(
    () =>
      products
        .filter((p) =>
          p.categorySlug === "supplements" ||
          p.tags.some((t) => /supplement|vitamin/i.test(t)),
        )
        .slice(0, 8),
    [products],
  )

  const { paginatedItems, currentPage, totalPages, totalItems, itemsPerPage, goToPage, changePerPage, resetPage } =
    usePagination(filtered, { defaultPerPage: 12 })

  useEffect(() => {
    resetPage()
  }, [activeTab, selectedCategory, showNew, showOffers, sortBy, queryParam, localSearch, carePacks.join(","), resetPage])

  const activeFilters = [
    queryParam && `Search: "${queryParam}"`,
    selectedCategory && categories.find((c) => c.slug === selectedCategory)?.name,
    showNew && "New Arrivals",
    showOffers && "On Offer",
    ...carePacks.map((id) => carePackOptions.find((o) => o.id === id)?.label || id),
    (priceRange[0] > 0 || priceRange[1] < maxPrice) && `${formatPrice(priceRange[0])} - ${formatPrice(priceRange[1])}`,
  ].filter(Boolean) as string[]

  return (
    <QuickViewProvider>
    <div className="min-h-screen flex flex-col" style={{ background: "#FFFFFF" }}>
      <TopBar />
      <Navbar />
      <main className="flex-1">
        {seoIntro}
        <div className="mx-auto max-w-7xl px-4 lg:px-6 py-6 lg:py-8">
          {/* === Peach gradient hero banner ============================== */}
          <section
            className="relative overflow-hidden rounded-[28px] flex items-center"
            style={{
              background: PEACH_GRADIENT,
              minHeight: 200,
              boxShadow: "0 24px 60px -36px rgba(184,60,30,0.35)",
            }}
          >
            <div className="relative z-10 px-8 lg:px-14 py-10 flex-1">
              <h1
                className="font-serif text-4xl lg:text-6xl font-extrabold leading-none"
                style={{ color: TEXT_WINE, textShadow: "0 2px 0 rgba(255,255,255,0.35)" }}
              >
                Shop
              </h1>
              <p className="mt-3 text-sm lg:text-base max-w-md" style={{ color: TEXT_WINE_SOFT }}>
                Browse medications, supplements, devices and care packs — delivered fast across Kenya.
              </p>
            </div>
            {/* Bottle illustration */}
            <div className="hidden md:block relative h-full pr-10 lg:pr-14">
              <div
                className="relative flex items-center justify-center"
                style={{
                  width: 200,
                  height: 200,
                  background: "radial-gradient(circle at 50% 55%, rgba(244,168,123,0.55) 0%, rgba(244,168,123,0) 70%)",
                }}
              >
                <img
                  src="/hero-pills-transparent.png"
                  alt=""
                  className="object-contain max-h-44 drop-shadow-xl"
                />
              </div>
            </div>
          </section>

          {/* === Top tab strip ======================================== */}
          <div
            className="mt-6 rounded-[22px] overflow-x-auto"
            style={{
              background: PEACH_TAB_GRADIENT,
              boxShadow: "0 14px 30px -22px rgba(184,60,30,0.3)",
            }}
          >
            <div className="flex items-center gap-1 px-3 py-2 min-w-max">
              {topTabs.map((tab) => {
                const isActive = activeTab === tab.key
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className="inline-flex items-center gap-1.5 px-5 lg:px-7 py-2.5 rounded-full text-sm font-bold transition-all"
                    style={{
                      background: isActive ? "#FFFFFF" : "transparent",
                      color: isActive ? ACCENT_RED : TEXT_WINE,
                      boxShadow: isActive ? "0 6px 16px -10px rgba(184,60,30,0.45)" : undefined,
                    }}
                  >
                    {tab.label}
                    <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                  </button>
                )
              })}
            </div>
          </div>

          {/* === Active filter chips ================================== */}
          {activeFilters.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-5">
              {activeFilters.map((filter) => (
                <span
                  key={filter}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full"
                  style={{ background: "#FFF1E6", color: TEXT_WINE, border: `1px solid ${PEACH_BORDER}` }}
                >
                  {filter}
                  <button
                    type="button"
                    onClick={() => {
                      if (filter.startsWith("Search:")) window.location.href = "/shop"
                      if (filter === categories.find((c) => c.slug === selectedCategory)?.name) setSelectedCategory("")
                      if (filter === "New Arrivals") setShowNew(false)
                      if (filter === "On Offer") setShowOffers(false)
                      const cp = carePackOptions.find((o) => o.label === filter)
                      if (cp) setCarePacks(carePacks.filter((x) => x !== cp.id))
                      if (filter.includes("KSh")) setPriceRange([0, maxPrice])
                    }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory("")
                  setShowNew(false)
                  setShowOffers(false)
                  setPriceRange([0, maxPrice])
                  setLocalSearch("")
                  setCarePacks([])
                  if (queryParam) window.location.href = "/shop"
                }}
                className="text-xs underline"
                style={{ color: TEXT_WINE_SOFT }}
              >
                Clear All
              </button>
            </div>
          )}

          {/* === Sidebar + content ==================================== */}
          <div className="mt-6 flex gap-6 lg:gap-8">
            <aside className="hidden lg:block w-72 flex-shrink-0">
              <FilterSidebar
                categories={categories}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                priceRange={priceRange}
                setPriceRange={setPriceRange}
                showNew={showNew}
                setShowNew={setShowNew}
                showOffers={showOffers}
                setShowOffers={setShowOffers}
                carePacks={carePacks}
                setCarePacks={setCarePacks}
                maxPrice={maxPrice}
              />
            </aside>

            <div className="flex-1 min-w-0">
              {/* Top Popular Medicines */}
              {topPopular.length > 0 && (
                <section className="mb-10">
                  <div className="flex items-end justify-between mb-4">
                    <h2 className="font-serif text-2xl lg:text-3xl font-bold" style={{ color: TEXT_WINE }}>
                      Top Popular Medicines
                    </h2>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-5">
                    {topPopular.slice(0, 4).map((p) => (
                      <ProductCard key={p.id} product={p} />
                    ))}
                  </div>
                </section>
              )}

              {/* Shop By Category strip */}
              {categories.length > 0 && (
                <section className="mb-10">
                  <div className="flex items-end justify-between mb-4">
                    <h2 className="font-serif text-2xl lg:text-3xl font-bold" style={{ color: TEXT_WINE }}>
                      Shop By Category
                    </h2>
                    <Link
                      href="/shop"
                      className="text-xs font-semibold underline"
                      style={{ color: ACCENT_RED }}
                    >
                      View all
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-5">
                    {categories.slice(0, 4).map((cat) => {
                      const sample = products.find((p) => p.categorySlug === cat.slug)
                      return (
                        <CategoryPeachCard
                          key={cat.id}
                          name={cat.name}
                          imageUrl={cat.image || sample?.images?.[0] || "/placeholder.svg"}
                          href={`/shop?category=${cat.slug}`}
                        />
                      )
                    })}
                  </div>
                </section>
              )}

              {/* Featured Supplements */}
              {featuredSupplements.length > 0 && (
                <section className="mb-10">
                  <div className="flex items-end justify-between mb-4">
                    <h2 className="font-serif text-2xl lg:text-3xl font-bold" style={{ color: TEXT_WINE }}>
                      Featured Supplements
                    </h2>
                    <Link
                      href="/shop?category=supplements"
                      className="text-xs font-semibold underline"
                      style={{ color: ACCENT_RED }}
                    >
                      View all
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-5">
                    {featuredSupplements.slice(0, 4).map((p) => (
                      <ProductCard key={p.id} product={p} />
                    ))}
                  </div>
                </section>
              )}

              {/* Main filtered grid */}
              <section>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                  <div>
                    <h2 className="font-serif text-2xl lg:text-3xl font-bold" style={{ color: TEXT_WINE }}>
                      {activeTab === "all" ? "All Products" : topTabs.find((t) => t.key === activeTab)?.label}
                    </h2>
                    <p className="text-sm mt-1" style={{ color: TEXT_WINE_SOFT }}>
                      {filtered.length} product{filtered.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Sheet>
                      <SheetTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="lg:hidden"
                          style={{ borderColor: PEACH_BORDER, color: TEXT_WINE }}
                        >
                          <SlidersHorizontal className="h-4 w-4 mr-2" />
                          Filters
                        </Button>
                      </SheetTrigger>
                      <SheetContent side="left" className="w-80 p-6 overflow-y-auto" style={{ background: "#FFFBF5" }}>
                        <h3 className="text-base font-serif font-semibold mb-4" style={{ color: TEXT_WINE }}>
                          Filters
                        </h3>
                        <FilterSidebar
                          categories={categories}
                          selectedCategory={selectedCategory}
                          setSelectedCategory={setSelectedCategory}
                          priceRange={priceRange}
                          setPriceRange={setPriceRange}
                          showNew={showNew}
                          setShowNew={setShowNew}
                          showOffers={showOffers}
                          setShowOffers={setShowOffers}
                          carePacks={carePacks}
                          setCarePacks={setCarePacks}
                          maxPrice={maxPrice}
                        />
                      </SheetContent>
                    </Sheet>
                    <div
                      className="hidden md:flex items-center rounded-full overflow-hidden"
                      style={{ background: "#FFF1E6", border: `1px solid ${PEACH_BORDER}` }}
                    >
                      <input
                        type="text"
                        placeholder="Filter products..."
                        value={localSearch}
                        onChange={(e) => setLocalSearch(e.target.value)}
                        className="w-44 lg:w-56 h-9 px-4 bg-transparent text-sm outline-none"
                        style={{ color: TEXT_WINE }}
                      />
                      {localSearch && (
                        <button type="button" onClick={() => setLocalSearch("")} className="px-2">
                          <X className="h-3.5 w-3.5" style={{ color: TEXT_WINE_SOFT }} />
                        </button>
                      )}
                      <span className="px-3" style={{ color: ACCENT_RED }}>
                        <Search className="h-4 w-4" />
                      </span>
                    </div>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="text-sm h-9 px-3 rounded-full outline-none"
                      style={{
                        background: "#FFF1E6",
                        border: `1px solid ${PEACH_BORDER}`,
                        color: TEXT_WINE,
                      }}
                    >
                      {sortOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {productsLoading && products.length === 0 ? (
                  <div
                    className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-5"
                    aria-busy="true"
                    aria-label="Loading products"
                  >
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div
                        key={i}
                        className="rounded-2xl overflow-hidden animate-pulse"
                        style={{ background: "#FFF6EE", border: `1px solid ${PEACH_BORDER}` }}
                      >
                        <div className="aspect-square" style={{ background: "#F6E8DA" }} />
                        <div className="p-3 space-y-2">
                          <div className="h-3 rounded" style={{ background: "#F2DCC8", width: "60%" }} />
                          <div className="h-3 rounded" style={{ background: "#F2DCC8", width: "85%" }} />
                          <div className="h-4 rounded mt-3" style={{ background: "#F2DCC8", width: "40%" }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : productsError && products.length === 0 ? (
                  <div
                    className="text-center py-20 rounded-2xl"
                    style={{ background: "#FFF6EE", border: `1px solid ${PEACH_BORDER}` }}
                    role="alert"
                  >
                    <p className="text-sm font-medium" style={{ color: TEXT_WINE }}>
                      We couldn't load products right now.
                    </p>
                    <p className="text-xs mt-1" style={{ color: TEXT_WINE_SOFT }}>
                      Please check your connection and try again.
                    </p>
                    <button
                      type="button"
                      onClick={() => void refetchProducts()}
                      className="mt-4 inline-flex items-center rounded-full px-5 py-2 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
                      style={{ background: `linear-gradient(135deg, #F97316 0%, ${ACCENT_RED} 100%)` }}
                    >
                      Try again
                    </button>
                  </div>
                ) : filtered.length === 0 ? (
                  <div
                    className="text-center py-20 rounded-2xl"
                    style={{ background: "#FFF6EE", border: `1px solid ${PEACH_BORDER}` }}
                  >
                    <p className="text-sm" style={{ color: TEXT_WINE_SOFT }}>
                      No products found matching your filters.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategory("")
                        setShowNew(false)
                        setShowOffers(false)
                        setPriceRange([0, maxPrice])
                        setLocalSearch("")
                        setCarePacks([])
                        setActiveTab("all")
                      }}
                      className="mt-3 text-sm underline"
                      style={{ color: ACCENT_RED }}
                    >
                      Clear all filters
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-5">
                      {paginatedItems.map((product) => (
                        <ProductCard key={product.id} product={product} />
                      ))}
                    </div>
                    <PaginationControls
                      currentPage={currentPage}
                      totalPages={totalPages}
                      totalItems={totalItems}
                      itemsPerPage={itemsPerPage}
                      onPageChange={(p) => {
                        goToPage(p)
                        window.scrollTo({ top: 0, behavior: "smooth" })
                      }}
                      onItemsPerPageChange={changePerPage}
                      perPageOptions={[12, 24, 48, 96]}
                    />
                  </>
                )}
              </section>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
    <QuickViewModal />
    </QuickViewProvider>
  )
}

function CategoryPeachCard({ name, imageUrl, href }: { name: string; imageUrl: string; href: string }) {
  return (
    <Link href={href} className="block group">
      <div
        className="relative rounded-2xl p-4 lg:p-5 h-full flex flex-col items-center text-center transition-transform group-hover:-translate-y-1"
        style={{
          background: "linear-gradient(160deg, #FCE3CB 0%, #F9CEB1 100%)",
          border: `1px solid ${PEACH_BORDER}`,
          boxShadow: "0 14px 30px -22px rgba(184,60,30,0.35)",
        }}
      >
        <div
          className="w-full aspect-square rounded-xl flex items-center justify-center overflow-hidden mb-3"
          style={{ background: "#FFFFFF" }}
        >
          <img
            src={imageUrl}
            alt={name}
            className="object-contain max-h-[78%] max-w-[78%] group-hover:scale-105 transition-transform"
          />
        </div>
        <h3 className="text-sm lg:text-base font-bold" style={{ color: TEXT_WINE }}>
          {name}
        </h3>
        <p className="text-xs mt-1.5 leading-snug" style={{ color: TEXT_WINE_SOFT }}>
          Shop trusted picks in {name.toLowerCase()}.
        </p>
        <span
          className="mt-3 inline-flex items-center justify-center text-xs font-semibold px-5 h-8 rounded-full text-white transition-transform group-hover:scale-[1.03]"
          style={{
            background: `linear-gradient(135deg, ${ACCENT_ORANGE} 0%, ${ACCENT_RED} 100%)`,
          }}
        >
          Shop Now
        </span>
      </div>
    </Link>
  )
}
