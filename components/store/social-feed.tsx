"use client"

import Image from "next/image"
import { ExternalLink } from "lucide-react"
import useSWR from "swr"

interface SocialPost {
  id: string
  platform: "instagram" | "tiktok"
  thumbnailUrl: string
  caption: string
  url: string
  authorName: string
}

// Hardcoded fallback posts in case API fails
const fallbackPosts: SocialPost[] = [
  {
    id: "ig-fallback-1",
    platform: "instagram",
    thumbnailUrl: "",
    caption: "New jewelry collection just dropped!",
    url: "https://www.instagram.com/herkingdom_jewelry/",
    authorName: "@herkingdom_jewelry",
  },
  {
    id: "tt-fallback-1",
    platform: "tiktok",
    thumbnailUrl: "",
    caption: "How to style your jewelry for any occasion",
    url: "https://www.tiktok.com/@herkingdom_jewelry",
    authorName: "@herkingdom_jewelry",
  },
  {
    id: "ig-fallback-2",
    platform: "instagram",
    thumbnailUrl: "",
    caption: "Elegant pieces for every occasion",
    url: "https://www.instagram.com/herkingdom_jewelry/",
    authorName: "@herkingdom_jewelry",
  },
  {
    id: "tt-fallback-2",
    platform: "tiktok",
    thumbnailUrl: "",
    caption: "Jewelry haul from Her Kingdom",
    url: "https://www.tiktok.com/@herkingdom_jewelry",
    authorName: "@herkingdom_jewelry",
  },
]

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function PlatformBadge({ platform }: { platform: "instagram" | "tiktok" }) {
  if (platform === "instagram") {
    return (
      <div className="flex items-center gap-1.5 bg-gradient-to-r from-[#f09433] via-[#e6683c] to-[#dc2743] text-white px-2.5 py-1 rounded-sm">
        <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
        <span className="text-[10px] font-semibold uppercase tracking-wider">Instagram</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5 bg-foreground text-background px-2.5 py-1 rounded-sm">
      <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.87a8.16 8.16 0 004.77 1.52V6.94a4.85 4.85 0 01-1.01-.25z" />
      </svg>
      <span className="text-[10px] font-semibold uppercase tracking-wider">TikTok</span>
    </div>
  )
}

function PostCardSkeleton() {
  return (
    <div className="group relative rounded-sm overflow-hidden bg-muted border border-border">
      <div className="aspect-[4/5] bg-secondary animate-pulse" />
      <div className="p-4 space-y-2">
        <div className="h-3 w-20 bg-secondary animate-pulse rounded-sm" />
        <div className="h-3 w-full bg-secondary animate-pulse rounded-sm" />
        <div className="h-3 w-2/3 bg-secondary animate-pulse rounded-sm" />
      </div>
    </div>
  )
}

export function SocialFeed() {
  const { data, isLoading } = useSWR<{ posts: SocialPost[] }>(
    "/api/social-feed",
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 600000, // 10 min dedup
      fallbackData: { posts: [] },
    }
  )

  const posts = data?.posts && data.posts.length >= 4 ? data.posts : fallbackPosts

  return (
    <section className="py-16 lg:py-20 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4">
        {/* Header */}
        <div className="text-center mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
            Follow Our Socials
          </p>
          <h2 className="font-serif text-3xl lg:text-4xl font-bold text-foreground text-balance">
            See What We Are Posting
          </h2>
          <p className="text-muted-foreground text-sm mt-3 max-w-lg mx-auto">
            Follow us on Instagram and TikTok for the latest drops, styling tips, and exclusive collections.
          </p>
        </div>

        {/* Social handles */}
        <div className="flex items-center justify-center gap-6 mb-8">
          <a
            href="https://www.instagram.com/herkingdom_jewelry/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm font-medium text-foreground hover:underline underline-offset-2"
          >
            <div className="w-7 h-7 flex items-center justify-center bg-gradient-to-br from-[#f09433] via-[#e6683c] to-[#dc2743] rounded-md">
              <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </div>
            @herkingdom_jewelry
            <ExternalLink className="h-3 w-3 text-muted-foreground" />
          </a>
          <a
            href="https://www.tiktok.com/@herkingdom_jewelry"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm font-medium text-foreground hover:underline underline-offset-2"
          >
            <div className="w-7 h-7 flex items-center justify-center bg-foreground rounded-md">
              <svg className="h-4 w-4 text-background" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.87a8.16 8.16 0 004.77 1.52V6.94a4.85 4.85 0 01-1.01-.25z" />
              </svg>
            </div>
            @herkingdom_jewelry
            <ExternalLink className="h-3 w-3 text-muted-foreground" />
          </a>
        </div>

        {/* 4 Cards - 2 per row */}
        {isLoading && (!data?.posts || data.posts.length === 0) ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <PostCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {posts.slice(0, 4).map((post) => (
              <a
                key={post.id}
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative rounded-sm overflow-hidden bg-background border border-border hover:border-foreground/20 transition-colors"
              >
                {/* Thumbnail */}
                <div className="relative aspect-[4/5] bg-muted overflow-hidden">
                  <Image
                    src={post.thumbnailUrl}
                    alt={post.caption}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                  {/* Platform badge */}
                  <div className="absolute top-3 left-3">
                    <PlatformBadge platform={post.platform} />
                  </div>
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/30 transition-colors duration-300 flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <ExternalLink className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </div>

                {/* Caption */}
                <div className="p-3 lg:p-4">
                  <p className="text-xs text-muted-foreground mb-1">{post.authorName}</p>
                  <p className="text-sm font-medium text-foreground line-clamp-2 leading-relaxed">{post.caption}</p>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
