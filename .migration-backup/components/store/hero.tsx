"use client"

import Link from "next/link"
import Image from "next/image"
import { useState, useEffect, useCallback } from "react"
import { ArrowRight } from "lucide-react"
import type { HeroBanner } from "@/lib/types"
import useSWR from "swr"
import { safeFetcher, asArray } from "@/lib/fetcher"

const FALLBACK_BANNERS: HeroBanner[] = [
  {
    id: "signature-jewelry",
    title: "The Signature Jewelry Edit",
    subtitle: "Hand-picked crystal sets, drop earrings and statement pieces — curated in Nairobi, made to be worn.",
    collection: "jewelry-sets",
    bannerImage: "/images/products/necklace-sets/crystal-cluster-drop-necklace-set.jpeg",
    linkUrl: "/shop?category=jewelry-sets",
    buttonText: "Shop The Edit",
    sortOrder: 0,
  },
  {
    id: "timepieces",
    title: "Timeless Timepieces",
    subtitle: "Rose-gold chain watches and floral bracelet dials — quietly luxurious, priced to be worn.",
    collection: "women-watches",
    bannerImage: "/images/products/women-watches/gold-flower-bracelet-watch.jpeg",
    linkUrl: "/shop?category=women-watches",
    buttonText: "Browse Watches",
    sortOrder: 1,
  },
  {
    id: "everyday-sparkle",
    title: "Everyday Sparkle",
    subtitle: "Featherlight earrings, dainty studs and drop crystals designed for every hour of the day.",
    collection: "earrings",
    bannerImage: "/images/products/earrings/amara-gemstone-drops.jpeg",
    linkUrl: "/shop?category=earrings",
    buttonText: "Shop Earrings",
    sortOrder: 2,
  },
]

function HeroCarousel({ banners }: { banners: HeroBanner[] }) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const mainBanner = banners[0]
  const carouselImages = banners.map((b) => b.bannerImage)

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % carouselImages.length)
  }, [carouselImages.length])

  useEffect(() => {
    if (carouselImages.length <= 1) return
    const interval = setInterval(nextSlide, 4000)
    return () => clearInterval(interval)
  }, [nextSlide, carouselImages.length])

  return (
    <Link
      href={mainBanner.linkUrl}
      className="lg:col-span-8 relative overflow-hidden rounded-sm min-h-[400px] lg:min-h-[520px] flex items-end group"
    >
      <div className="absolute inset-0 z-0">
        {carouselImages.map((src, i) => (
          <div
            key={src}
            className="absolute inset-0 transition-opacity duration-700"
            style={{ opacity: i === currentSlide ? 1 : 0 }}
          >
            <BannerImage
              src={src}
              alt={`${mainBanner.title} - carousel slide ${i + 1}`}
              priority={i === 0}
            />
          </div>
        ))}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
      </div>
      <div className="relative z-10 p-8 lg:p-12 w-full">
        <p className="text-white/80 text-xs tracking-[0.3em] uppercase mb-2">Women&apos;s Fashion</p>
        <h1 className="text-white text-4xl lg:text-5xl font-serif font-bold leading-tight text-balance">
          {mainBanner.title}
        </h1>
        <p className="text-white/70 text-sm mt-3 leading-relaxed max-w-md">
          {mainBanner.subtitle}
        </p>
        <span className="inline-flex items-center gap-2 mt-5 bg-white text-black px-7 py-3 text-sm font-medium hover:bg-white/90 transition-colors">
          {mainBanner.buttonText}
          <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
        </span>
      </div>
    </Link>
  )
}

function BannerImage({ src, alt, priority = false }: { src: string; alt: string; priority?: boolean }) {
  const [imgSrc, setImgSrc] = useState(src)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    setImgSrc(src)
    setHasError(false)
  }, [src])

  if (hasError) {
    return (
      <Image
        src="/images/products/necklace-sets/crystal-cluster-drop-necklace-set.jpeg"
        alt={alt}
        fill
        className="object-cover"
        priority={priority}
      />
    )
  }

  return (
    <Image
      src={imgSrc}
      alt={alt}
      fill
      className="object-cover group-hover:scale-105 transition-transform duration-700"
      priority={priority}
      onError={() => {
        setHasError(true)
        setImgSrc("/images/products/necklace-sets/crystal-cluster-drop-necklace-set.jpeg")
      }}
    />
  )
}

export function Hero() {
  const { data } = useSWR<HeroBanner[]>("/api/hero-banners", safeFetcher)
  const banners = asArray<HeroBanner>(data)

  // Merge DB banners with fallbacks - always guarantee 3 valid banners
  const items: HeroBanner[] = (() => {
    if (banners.length === 0) return FALLBACK_BANNERS

    return banners.slice(0, 3).map((b) => ({
      ...b,
      bannerImage: b.bannerImage || "/images/products/necklace-sets/crystal-cluster-drop-necklace-set.jpeg",
      linkUrl: b.linkUrl || "/shop",
      buttonText: b.buttonText || "Shop Now",
    }))
  })()

  // Pad to 3 if needed
  while (items.length < 3) {
    items.push(FALLBACK_BANNERS[items.length])
  }

  const sideBanners = items.slice(1, 3)

  return (
    <section className="bg-secondary">
      <div className="mx-auto max-w-7xl px-4 py-6 lg:py-0">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-stretch">
          {/* Main Banner with Carousel - uses images from all banners */}
          <HeroCarousel banners={items} />

          {/* Side Banners */}
          <div className="lg:col-span-4 flex flex-col gap-4 lg:gap-6">
            {sideBanners.map((banner) => (
              <Link
                key={banner.id}
                href={banner.linkUrl}
                className="relative overflow-hidden rounded-sm flex-1 min-h-[200px] lg:min-h-0 group flex items-end"
              >
                <BannerImage
                  src={banner.bannerImage}
                  alt={banner.title}
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                <div className="relative z-10 p-5 w-full">
                  <h3 className="text-white font-serif text-lg font-semibold leading-snug">
                    {banner.title}
                  </h3>
                  <p className="text-white/70 text-xs mt-1 line-clamp-2">
                    {banner.subtitle}
                  </p>
                  <span className="inline-flex items-center gap-1.5 mt-3 text-white text-xs font-medium tracking-wide uppercase group-hover:underline">
                    {banner.buttonText}
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
