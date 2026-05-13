"use client"

import { Link } from "wouter"
import { useState, useEffect, useCallback } from "react"
import { ArrowRight } from "lucide-react"
import { useCmsCollection } from "@/lib/cms-store"
import {
  HERO_SLIDES_KEY,
  HERO_SLIDES_DEFAULTS,
  type HeroSlide,
} from "@/components/admin/banners"

const FALLBACK_IMAGE = "/images/products/medications/pill-bottle-white.png"

function BannerImage({ src, alt }: { src: string; alt: string }) {
  const [imgSrc, setImgSrc] = useState(src)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    setImgSrc(src)
    setHasError(false)
  }, [src])

  return (
    <img
      src={hasError ? FALLBACK_IMAGE : imgSrc}
      alt={alt}
      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
      onError={() => {
        setHasError(true)
        setImgSrc(FALLBACK_IMAGE)
      }}
    />
  )
}

function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const main = slides[0]
  const images = slides.map((s) => s.image || FALLBACK_IMAGE)

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % images.length)
  }, [images.length])

  useEffect(() => {
    if (images.length <= 1) return
    const t = setInterval(nextSlide, 4000)
    return () => clearInterval(t)
  }, [nextSlide, images.length])

  return (
    <Link
      href={main.buttonLink || "/shop"}
      className="lg:col-span-8 relative overflow-hidden rounded-sm min-h-[400px] lg:min-h-[520px] flex items-end group"
    >
      <div className="absolute inset-0 z-0">
        {images.map((src, i) => (
          <div
            key={`${src}-${i}`}
            className="absolute inset-0 transition-opacity duration-700"
            style={{ opacity: i === currentSlide ? 1 : 0 }}
          >
            <BannerImage src={src} alt={`${main.title} – slide ${i + 1}`} />
          </div>
        ))}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
      </div>
      <div className="relative z-10 p-8 lg:p-12 w-full">
        <p className="text-white/80 text-xs tracking-[0.3em] uppercase mb-3">Online Pharmacy</p>
        <h1 className="text-white text-3xl sm:text-4xl lg:text-5xl font-serif font-bold leading-tight text-balance max-w-xl">
          {main.title}
        </h1>
        <p className="text-white/80 text-sm sm:text-base mt-4 leading-relaxed max-w-md">
          {main.subtitle}
        </p>
        <span className="inline-flex items-center gap-2.5 mt-7 bg-white text-black px-8 py-4 rounded-sm text-sm sm:text-base font-semibold tracking-wide uppercase shadow-md hover:bg-white/90 hover:shadow-lg transition-all">
          {main.buttonText || "Shop Now"}
          <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
        </span>
      </div>
    </Link>
  )
}

export function Hero() {
  const { items } = useCmsCollection<HeroSlide>(HERO_SLIDES_KEY, HERO_SLIDES_DEFAULTS)
  const active = items.filter((s) => s.isActive)
  const slides = active.length > 0 ? active : HERO_SLIDES_DEFAULTS

  // Always guarantee at least one slide for the hero card; pad up to 3 for side cards.
  const padded: HeroSlide[] = slides.slice(0, 3)
  while (padded.length < 3) {
    padded.push(HERO_SLIDES_DEFAULTS[padded.length] || padded[0])
  }

  const sideBanners = padded.slice(1, 3)

  return (
    <section className="bg-secondary">
      <div className="mx-auto max-w-7xl px-4 py-6 lg:py-0">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-stretch">
          <HeroCarousel slides={padded} />

          <div className="lg:col-span-4 flex flex-col gap-4 lg:gap-6">
            {sideBanners.map((banner, i) => (
              <Link
                key={`${banner.id}-${i}`}
                href={banner.buttonLink || "/shop"}
                className="relative overflow-hidden rounded-sm flex-1 min-h-[200px] lg:min-h-0 group flex items-end"
              >
                <BannerImage src={banner.image || FALLBACK_IMAGE} alt={banner.title} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                <div className="relative z-10 p-5 w-full">
                  <h3 className="text-white font-serif text-lg font-semibold leading-snug">
                    {banner.title}
                  </h3>
                  <p className="text-white/70 text-xs mt-1 line-clamp-2">
                    {banner.subtitle}
                  </p>
                  <span className="inline-flex items-center gap-1.5 mt-3 text-white text-xs font-medium tracking-wide uppercase group-hover:underline">
                    {banner.buttonText || "Shop Now"}
                    <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
