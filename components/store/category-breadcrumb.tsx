"use client"

import Image from "next/image"
import Link from "next/link"
import { ChevronRight, Sparkles } from "lucide-react"
import { useEffect, useState } from "react"

export interface CategoryBreadcrumbItem {
  label: string
  href?: string
}

interface CategoryBreadcrumbProps {
  items: CategoryBreadcrumbItem[]
  title: string
  subtitle?: string
  imageUrl: string
  imageAlt?: string
  eyebrow?: string
  productCount?: number
}

export function CategoryBreadcrumb({
  items,
  title,
  subtitle,
  imageUrl,
  imageAlt,
  eyebrow,
  productCount,
}: CategoryBreadcrumbProps) {
  const safeImage = imageUrl && imageUrl.trim().length > 0 ? imageUrl : "/placeholder.svg"
  const [activeImage, setActiveImage] = useState(safeImage)
  const [isSwapping, setIsSwapping] = useState(false)

  useEffect(() => {
    if (safeImage === activeImage) return
    setIsSwapping(true)
    const t = setTimeout(() => {
      setActiveImage(safeImage)
      setIsSwapping(false)
    }, 180)
    return () => clearTimeout(t)
  }, [safeImage, activeImage])

  return (
    <section
      className="relative w-full overflow-hidden rounded-sm mb-6 min-h-[170px] md:min-h-[240px] bg-muted isolate"
      aria-label="Category header"
    >
      <div
        className={`absolute inset-0 transition-opacity duration-500 ${
          isSwapping ? "opacity-0" : "opacity-100"
        }`}
      >
        <Image
          key={activeImage}
          src={activeImage}
          alt={imageAlt || title}
          fill
          priority
          sizes="(max-width: 768px) 100vw, 1280px"
          className="object-cover object-center animate-ken-burns"
        />
      </div>

      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/55 to-black/25" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/40" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,215,170,0.18),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(255,255,255,0.08),transparent_60%)]" />

      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

      <div className="pointer-events-none absolute -top-16 -left-16 w-56 h-56 rounded-full bg-white/5 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -right-10 w-72 h-72 rounded-full bg-amber-200/10 blur-3xl" />

      <div className="relative z-10 flex flex-col justify-between h-full min-h-[170px] md:min-h-[240px] px-5 md:px-10 py-5 md:py-7">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1.5 text-xs md:text-[13px]">
            {items.map((item, i) => (
              <li key={`${item.label}-${i}`} className="flex items-center gap-1.5">
                {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-white/45" />}
                {item.href ? (
                  <Link
                    href={item.href}
                    className="text-white/75 hover:text-white transition-colors underline-offset-4 hover:underline"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className="text-white font-medium">{item.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-6 max-w-3xl animate-fade-in-up">
          {eyebrow && (
            <div className="inline-flex items-center gap-1.5 mb-3">
              <Sparkles className="h-3 w-3 text-amber-200/90" />
              <span className="text-[10px] md:text-[11px] tracking-[0.35em] uppercase text-white/80 font-medium">
                {eyebrow}
              </span>
            </div>
          )}
          <h1 className="text-white text-2xl md:text-4xl font-serif font-bold leading-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]">
            {title}
          </h1>
          {subtitle && (
            <p className="text-white/80 text-sm md:text-base mt-2 max-w-2xl drop-shadow">
              {subtitle}
            </p>
          )}
          {typeof productCount === "number" && (
            <p className="text-white/65 text-xs md:text-sm mt-3 tracking-wide">
              <span className="text-white font-semibold">{productCount}</span> product
              {productCount !== 1 ? "s" : ""} curated for you
            </p>
          )}
        </div>
      </div>

      <div className="hidden sm:flex absolute top-4 right-4 md:top-6 md:right-6 z-10 items-center gap-1.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-3 py-1.5">
        <span className="relative inline-flex w-1.5 h-1.5">
          <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
          <span className="relative inline-flex rounded-full w-1.5 h-1.5 bg-emerald-400" />
        </span>
        <span className="text-[10px] tracking-[0.2em] uppercase text-white/90 font-medium">
          In Stock
        </span>
      </div>
    </section>
  )
}
