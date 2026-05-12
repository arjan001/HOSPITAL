"use client"

import Link from "next/link"
import Image from "next/image"
import useSWR from "swr"
import { useMemo, useState } from "react"
import { Clock, MessageCircle, Star, Search, Sparkles, ArrowRight } from "lucide-react"
import { Navbar } from "./navbar"
import { Footer } from "./footer"
import { TopBar } from "./top-bar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export type BlogListItem = {
  id: string
  slug: string
  title: string
  excerpt: string | null
  cover_image: string | null
  author: string
  author_role: string | null
  author_avatar: string | null
  tags: string[]
  category: string | null
  read_time_minutes: number | null
  views: number | null
  is_featured: boolean
  published_at: string
  rating_avg?: number
  rating_count?: number
  comment_count?: number
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  } catch {
    return ""
  }
}

function BlogCard({ post, featured = false }: { post: BlogListItem; featured?: boolean }) {
  return (
    <Link
      href={`/blogs/${post.slug}`}
      className={`group relative flex flex-col overflow-hidden rounded-3xl bg-white border border-black/5 shadow-[0_4px_30px_-12px_rgba(0,0,0,0.08)] hover:shadow-[0_20px_60px_-20px_rgba(236,72,153,0.35)] transition-all duration-500 hover:-translate-y-1 ${
        featured ? "lg:col-span-2 lg:row-span-2" : ""
      }`}
    >
      <div
        className={`relative overflow-hidden ${featured ? "aspect-[16/10]" : "aspect-[4/3]"} bg-gradient-to-br from-pink-50 via-white to-rose-50`}
      >
        {post.cover_image ? (
          <Image
            src={post.cover_image}
            alt={post.title}
            fill
            className="object-cover transition-transform duration-[1600ms] ease-out group-hover:scale-110"
            sizes={featured ? "(max-width: 1024px) 100vw, 66vw" : "(max-width: 768px) 100vw, 33vw"}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-4xl font-serif text-pink-300">
            HK
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        {post.category && (
          <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 bg-white/95 backdrop-blur px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider text-foreground shadow-sm">
            <Sparkles className="h-3 w-3 text-pink-500" />
            {post.category}
          </span>
        )}
        {post.is_featured && (
          <span className="absolute top-4 right-4 inline-flex items-center gap-1 bg-pink-500 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-md">
            Editor's Pick
          </span>
        )}
      </div>

      <div className={`flex flex-col gap-3 p-6 ${featured ? "lg:p-8" : ""}`}>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground uppercase tracking-wider">
          <span>{formatDate(post.published_at)}</span>
          <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {post.read_time_minutes ?? 5} min read
          </span>
        </div>

        <h3
          className={`font-serif font-semibold leading-tight text-foreground group-hover:text-pink-600 transition-colors ${
            featured ? "text-3xl lg:text-4xl" : "text-xl"
          }`}
        >
          {post.title}
        </h3>

        {post.excerpt && (
          <p className={`text-muted-foreground leading-relaxed ${featured ? "text-base" : "text-sm line-clamp-2"}`}>
            {post.excerpt}
          </p>
        )}

        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {post.tags.slice(0, featured ? 4 : 2).map((tag) => (
              <span
                key={tag}
                className="text-[10px] font-medium uppercase tracking-wider text-pink-700 bg-pink-50 border border-pink-100 px-2 py-0.5 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-4 mt-auto border-t border-black/5">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-pink-200 to-rose-300 flex items-center justify-center text-white font-semibold text-sm">
              {post.author?.[0] || "H"}
            </div>
            <div className="leading-tight">
              <p className="text-xs font-semibold text-foreground">{post.author}</p>
              {post.author_role && (
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{post.author_role}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {post.rating_count && post.rating_count > 0 ? (
              <span className="inline-flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-pink-400 text-pink-400" />
                {post.rating_avg?.toFixed(1)}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1">
              <MessageCircle className="h-3.5 w-3.5" />
              {post.comment_count ?? 0}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}

export function BlogsPage() {
  const { data, isLoading } = useSWR<{ posts: BlogListItem[] }>("/api/blogs", fetcher, {
    revalidateOnFocus: false,
  })
  const [query, setQuery] = useState("")
  const [activeTag, setActiveTag] = useState<string | null>(null)

  const posts = data?.posts || []

  const allTags = useMemo(() => {
    const set = new Set<string>()
    posts.forEach((p) => (p.tags || []).forEach((t) => set.add(t)))
    return Array.from(set).slice(0, 12)
  }, [posts])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return posts.filter((p) => {
      if (activeTag && !(p.tags || []).includes(activeTag)) return false
      if (!q) return true
      const hay = `${p.title} ${p.excerpt || ""} ${(p.tags || []).join(" ")} ${p.author}`.toLowerCase()
      return hay.includes(q)
    })
  }, [posts, query, activeTag])

  const featured = filtered[0]
  const rest = filtered.slice(1)

  return (
    <div className="min-h-screen flex flex-col bg-[#fdfaf7]">
      <TopBar />
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-black/5">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-50 via-[#fdfaf7] to-amber-50" aria-hidden="true" />
          <div
            className="absolute -top-40 -right-40 w-[520px] h-[520px] rounded-full bg-gradient-to-br from-pink-200/40 to-rose-200/20 blur-3xl"
            aria-hidden="true"
          />
          <div
            className="absolute -bottom-40 -left-40 w-[440px] h-[440px] rounded-full bg-gradient-to-br from-amber-200/30 to-orange-100/10 blur-3xl"
            aria-hidden="true"
          />

          <div className="relative max-w-6xl mx-auto px-4 py-20 lg:py-28 text-center">
            <span className="inline-flex items-center gap-2 bg-white/80 backdrop-blur border border-pink-100 px-4 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-[0.2em] text-pink-600 mb-6">
              <Sparkles className="h-3.5 w-3.5" />
              The Her Kingdom Journal
            </span>
            <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl font-semibold leading-[1.05] text-foreground text-balance">
              Stories, style notes &amp;<br />
              <span className="italic bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 bg-clip-text text-transparent">
                quiet luxury
              </span>
            </h1>
            <p className="mt-6 max-w-xl mx-auto text-muted-foreground text-base md:text-lg leading-relaxed">
              A slow, considered read from our editors — on jewelry, gifting, and the small rituals that make a life feel well-dressed.
            </p>

            {/* Search */}
            <div className="mt-10 max-w-md mx-auto relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search stories, tags, authors…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-11 h-12 rounded-full bg-white/80 backdrop-blur border-black/10 focus-visible:ring-pink-300"
              />
            </div>

            {allTags.length > 0 && (
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <button
                  onClick={() => setActiveTag(null)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-colors ${
                    activeTag === null
                      ? "bg-foreground text-background"
                      : "bg-white/80 text-foreground hover:bg-white border border-black/5"
                  }`}
                >
                  All
                </button>
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-colors ${
                      activeTag === tag
                        ? "bg-pink-500 text-white"
                        : "bg-white/80 text-foreground hover:bg-white border border-black/5"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Grid */}
        <section className="max-w-6xl mx-auto px-4 py-14 lg:py-20">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-[4/5] rounded-3xl bg-white/50 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-muted-foreground">No stories match that filter yet.</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setQuery("")
                  setActiveTag(null)
                }}
              >
                Clear filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 auto-rows-fr">
              {featured && <BlogCard post={featured} featured />}
              {rest.map((post) => (
                <BlogCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </section>

        {/* Newsletter strip */}
        <section className="border-t border-black/5 bg-white/60">
          <div className="max-w-4xl mx-auto px-4 py-14 text-center">
            <Badge className="bg-pink-100 text-pink-700 hover:bg-pink-100 uppercase tracking-wider text-[10px] mb-4">
              Journal Dispatch
            </Badge>
            <h2 className="font-serif text-3xl md:text-4xl font-semibold mb-3">
              A slower kind of newsletter
            </h2>
            <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
              One thoughtful essay, monthly. Styling notes, gifting ideas and a quiet look at what our editors are wearing.
            </p>
            <Link href="/#newsletter">
              <Button className="bg-foreground text-background hover:bg-foreground/90 rounded-full px-8 h-12">
                Subscribe
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
