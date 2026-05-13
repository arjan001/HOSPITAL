import { Link } from "wouter"
import { Eye, Heart, Plus, ArrowRight } from "lucide-react"

const BRAND = "#3D0814"
const ACCENT = "#F97316"
const PINK = "#EC4899"
const PINK_DARK = "#BE185D"

type PopularProduct = {
  id: string
  name: string
  price: number
  image: string
  badge?: string
  href: string
}

const PRODUCTS: PopularProduct[] = [
  {
    id: "p1",
    name: "Molfix Pants Jumbo Size 4 Large (9.1–15kg) 56's",
    price: 1799,
    image: "https://images.unsplash.com/photo-1631815588090-d4bfec5b1f9d?auto=format&fit=crop&w=600&q=70",
    badge: "Buy 2 Get 1 Free",
    href: "/shop",
  },
  {
    id: "p2",
    name: "NipNap Diaper Jumbo Max 60's",
    price: 1485,
    image: "https://images.unsplash.com/photo-1609220136736-443140cffec6?auto=format&fit=crop&w=600&q=70",
    badge: "Buy 2 Get 1 Free",
    href: "/shop",
  },
  {
    id: "p3",
    name: "NipNap Diaper New Born 48's",
    price: 999,
    image: "https://images.unsplash.com/photo-1607344645866-009c320b63e0?auto=format&fit=crop&w=600&q=70",
    badge: "Buy 2 Get 1 Free",
    href: "/shop",
  },
  {
    id: "p4",
    name: "NipNap Black & White Junior 18's",
    price: 636,
    image: "https://images.unsplash.com/photo-1584473457409-ce95a9c00017?auto=format&fit=crop&w=600&q=70",
    badge: "Buy 2 Get 1 Free",
    href: "/shop",
  },
  {
    id: "p5",
    name: "Molfix Pants Jumbo Size 6 XXL (20+ Kg) 44's",
    price: 1799,
    image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=600&q=70",
    badge: "Buy 2 Get 1 Free",
    href: "/shop",
  },
  {
    id: "p6",
    name: "Panadol Extra Tablets 24's",
    price: 350,
    image: "https://images.unsplash.com/photo-1550572017-edd951b55104?auto=format&fit=crop&w=600&q=70",
    href: "/shop",
  },
  {
    id: "p7",
    name: "Centrum Multivitamin 60 Tablets",
    price: 2450,
    image: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=600&q=70",
    badge: "New",
    href: "/shop",
  },
  {
    id: "p8",
    name: "Glucometer + 50 Test Strips Pack",
    price: 3200,
    image: "https://images.unsplash.com/photo-1631815589968-fdb09a223b1e?auto=format&fit=crop&w=600&q=70",
    href: "/shop",
  },
  {
    id: "p9",
    name: "Dettol Antiseptic Liquid 500ml",
    price: 720,
    image: "https://images.unsplash.com/photo-1583947582886-f40ec95dd752?auto=format&fit=crop&w=600&q=70",
    href: "/shop",
  },
  {
    id: "p10",
    name: "Always Ultra Sanitary Pads 16's",
    price: 540,
    image: "https://images.unsplash.com/photo-1631549916768-4119b2e5f926?auto=format&fit=crop&w=600&q=70",
    badge: "Bestseller",
    href: "/shop",
  },
]

function formatKes(n: number) {
  return `KSH ${n.toLocaleString()}`
}

export function PopularProducts() {
  return (
    <section className="bg-white py-14 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 lg:px-6">
        {/* Header */}
        <div className="flex items-end justify-between mb-8">
          <h2
            className="font-serif text-2xl sm:text-3xl lg:text-[34px] font-semibold"
            style={{ color: BRAND, letterSpacing: "-0.01em" }}
          >
            Popular Products
          </h2>
          <Link
            href="/shop"
            className="inline-flex items-center gap-1.5 text-sm font-semibold underline underline-offset-4"
            style={{ color: PINK_DARK }}
          >
            View All <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 lg:gap-5">
          {PRODUCTS.map((p) => (
            <article
              key={p.id}
              className="group relative bg-white border border-neutral-200 rounded-md overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Top icons row */}
              <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
                <button
                  type="button"
                  aria-label="Quick view"
                  className="grid place-items-center w-8 h-8 rounded-full bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                >
                  <Eye className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Add to wishlist"
                  className="grid place-items-center w-8 h-8 rounded-full bg-white border border-neutral-200 transition-colors"
                  style={{ color: PINK }}
                >
                  <Heart className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Badge */}
              {p.badge && (
                <div
                  className="absolute top-3 left-3 z-10 px-2 py-1 text-[10px] font-bold leading-tight text-white rounded-sm shadow-sm"
                  style={{ background: PINK }}
                >
                  {p.badge.split(" ").map((w, i, arr) => (
                    <span key={i} className="block uppercase tracking-wide">
                      {w}
                      {i < arr.length - 1 ? "" : ""}
                    </span>
                  ))}
                </div>
              )}

              {/* Image */}
              <Link href={p.href} className="block aspect-square bg-neutral-50 overflow-hidden">
                <img
                  src={p.image}
                  alt={p.name}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><rect fill='%23f5f5f5' width='200' height='200'/><text x='50%' y='50%' fill='%23999' font-family='sans-serif' font-size='14' text-anchor='middle' dy='.3em'>No image</text></svg>"
                  }}
                />
              </Link>

              {/* Body */}
              <div className="p-4 flex flex-col gap-2">
                <Link
                  href={p.href}
                  className="text-[13px] font-semibold text-neutral-800 leading-snug line-clamp-2 min-h-[34px] hover:text-neutral-900"
                >
                  {p.name}
                </Link>
                <p className="text-sm font-bold text-neutral-900">{formatKes(p.price)}</p>
                <button
                  type="button"
                  className="mt-2 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold text-white transition-colors"
                  style={{ background: ACCENT }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#EA580C")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = ACCENT)}
                >
                  <Plus className="h-3.5 w-3.5" /> Add To Cart
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
