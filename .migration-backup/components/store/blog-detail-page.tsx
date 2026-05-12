"use client"

import Link from "next/link"
import Image from "next/image"
import useSWR, { mutate } from "swr"
import { useEffect, useMemo, useState } from "react"
import {
  Clock,
  Star,
  Calendar,
  ChevronLeft,
  Share2,
  MessageCircle,
  Eye,
  Sparkles,
  Heart,
  TrendingUp,
  Send,
} from "lucide-react"
import { Navbar } from "./navbar"
import { Footer } from "./footer"
import { TopBar } from "./top-bar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { sanitizeHtml } from "@/lib/sanitize-html"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

type BlogPost = {
  id: string
  slug: string
  title: string
  excerpt: string | null
  content: string
  cover_image: string | null
  author: string
  author_role: string | null
  author_avatar: string | null
  tags: string[]
  category: string | null
  read_time_minutes: number | null
  views: number | null
  published_at: string
  rating_avg: number
  rating_count: number
}

type RelatedPost = Pick<
  BlogPost,
  "id" | "slug" | "title" | "excerpt" | "cover_image" | "author" | "tags" | "category" | "read_time_minutes" | "published_at"
>

type Comment = {
  id: string
  name: string
  comment: string
  created_at: string
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  } catch {
    return ""
  }
}

function timeAgo(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "just now"
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 30) return `${days}d ago`
    return formatDate(iso)
  } catch {
    return ""
  }
}

function getSessionId(): string {
  if (typeof window === "undefined") return ""
  let sid = localStorage.getItem("hk_blog_sid")
  if (!sid) {
    sid = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random()
    localStorage.setItem("hk_blog_sid", sid)
  }
  return sid
}

function StarRating({
  value,
  onChange,
  readOnly = false,
  size = 20,
}: {
  value: number
  onChange?: (v: number) => void
  readOnly?: boolean
  size?: number
}) {
  const [hover, setHover] = useState<number | null>(null)
  const display = hover ?? value
  return (
    <div className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= display
        return (
          <button
            key={n}
            type="button"
            disabled={readOnly}
            aria-label={`${n} stars`}
            onMouseEnter={() => !readOnly && setHover(n)}
            onMouseLeave={() => !readOnly && setHover(null)}
            onClick={() => !readOnly && onChange?.(n)}
            className={`transition-transform ${readOnly ? "cursor-default" : "hover:scale-125 cursor-pointer"}`}
          >
            <Star
              style={{ width: size, height: size }}
              className={
                filled
                  ? "fill-amber-400 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.4)]"
                  : "text-black/20"
              }
            />
          </button>
        )
      })}
    </div>
  )
}

function ReadProgressBar() {
  const [progress, setProgress] = useState(0)
  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement
      const scrollTop = doc.scrollTop || document.body.scrollTop
      const height = doc.scrollHeight - doc.clientHeight
      setProgress(height > 0 ? (scrollTop / height) * 100 : 0)
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener("scroll", onScroll)
  }, [])
  return (
    <div className="fixed top-0 left-0 right-0 h-0.5 bg-transparent z-50 pointer-events-none">
      <div
        className="h-full bg-gradient-to-r from-pink-400 via-rose-500 to-amber-400 transition-[width] duration-150"
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}

export function BlogDetailPage({ slug }: { slug: string }) {
  const postKey = `/api/blogs/${slug}`
  const commentsKey = `/api/blogs/${slug}/comments`

  const { data: postData, isLoading } = useSWR<{ post: BlogPost; related: RelatedPost[] }>(
    postKey,
    fetcher,
    { revalidateOnFocus: false }
  )
  const { data: commentsData } = useSWR<{ comments: Comment[] }>(commentsKey, fetcher, {
    revalidateOnFocus: false,
  })

  const post = postData?.post
  const related = postData?.related || []
  const comments = commentsData?.comments || []

  const [myRating, setMyRating] = useState(0)
  const [submittingRating, setSubmittingRating] = useState(false)
  const [liked, setLiked] = useState(false)

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [comment, setComment] = useState("")
  const [submittingComment, setSubmittingComment] = useState(false)

  useEffect(() => {
    if (!post) return
    fetch(postKey, { method: "POST" }).catch(() => {})
    try {
      const saved = Number(localStorage.getItem(`hk_blog_rating_${slug}`) || 0)
      if (saved) setMyRating(saved)
      setLiked(localStorage.getItem(`hk_blog_liked_${slug}`) === "1")
    } catch {}
  }, [post?.id, postKey, slug])

  const sectionHeadings = useMemo(() => {
    if (!post?.content) return [] as { id: string; text: string }[]
    if (typeof window === "undefined") return []
    const parser = new DOMParser()
    const doc = parser.parseFromString(post.content, "text/html")
    const h2s = Array.from(doc.querySelectorAll("h2"))
    return h2s.map((h, i) => ({
      id: `section-${i}`,
      text: h.textContent || `Section ${i + 1}`,
    }))
  }, [post?.content])

  async function handleRate(n: number) {
    if (!post || submittingRating) return
    setSubmittingRating(true)
    setMyRating(n)
    try {
      localStorage.setItem(`hk_blog_rating_${slug}`, String(n))
      const res = await fetch(`/api/blogs/${slug}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stars: n, sessionId: getSessionId() }),
      })
      if (res.ok) {
        toast.success("Thanks — your rating is in")
        mutate(postKey)
      } else {
        toast.error("Could not save rating")
      }
    } catch {
      toast.error("Could not save rating")
    } finally {
      setSubmittingRating(false)
    }
  }

  function handleLike() {
    const next = !liked
    setLiked(next)
    try {
      localStorage.setItem(`hk_blog_liked_${slug}`, next ? "1" : "0")
    } catch {}
  }

  async function handleShare() {
    const url = typeof window !== "undefined" ? window.location.href : ""
    const data = { title: post?.title, text: post?.excerpt || "", url }
    try {
      if (navigator.share) {
        await navigator.share(data)
        return
      }
    } catch {}
    try {
      await navigator.clipboard.writeText(url)
      toast.success("Link copied to clipboard")
    } catch {
      toast.error("Could not share")
    }
  }

  async function handleSubmitComment(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !comment.trim() || submittingComment) return
    setSubmittingComment(true)
    try {
      const res = await fetch(commentsKey, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, comment }),
      })
      if (res.ok) {
        setName("")
        setEmail("")
        setComment("")
        toast.success("Comment posted")
        mutate(commentsKey)
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || "Could not post comment")
      }
    } catch {
      toast.error("Could not post comment")
    } finally {
      setSubmittingComment(false)
    }
  }

  if (isLoading || !post) {
    return (
      <div className="min-h-screen flex flex-col bg-[#fdfaf7]">
        <TopBar />
        <Navbar />
        <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-16">
          <div className="h-10 w-2/3 bg-white/70 rounded animate-pulse mb-6" />
          <div className="aspect-[16/9] bg-white/70 rounded-3xl animate-pulse mb-8" />
          <div className="space-y-3">
            <div className="h-4 w-full bg-white/70 rounded animate-pulse" />
            <div className="h-4 w-11/12 bg-white/70 rounded animate-pulse" />
            <div className="h-4 w-3/4 bg-white/70 rounded animate-pulse" />
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#fdfaf7]">
      <ReadProgressBar />
      <TopBar />
      <Navbar />

      <main className="flex-1">
        {/* Hero cover */}
        <section className="relative border-b border-black/5 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-50 via-[#fdfaf7] to-amber-50" aria-hidden="true" />
          <div className="relative max-w-5xl mx-auto px-4 pt-10 lg:pt-14 pb-12">
            <Link
              href="/blogs"
              className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              The Journal
            </Link>

            <div className="mt-6 flex flex-wrap items-center gap-3 text-[11px] font-semibold uppercase tracking-widest">
              {post.category && (
                <span className="inline-flex items-center gap-1 bg-pink-500 text-white px-3 py-1 rounded-full">
                  <Sparkles className="h-3 w-3" />
                  {post.category}
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {formatDate(post.published_at)}
              </span>
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3 w-3" />
                {post.read_time_minutes ?? 5} min read
              </span>
              {post.views ? (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <Eye className="h-3 w-3" />
                  {post.views.toLocaleString()} reads
                </span>
              ) : null}
            </div>

            <h1 className="mt-5 font-serif text-4xl md:text-5xl lg:text-6xl font-semibold leading-[1.05] text-foreground text-balance max-w-3xl">
              {post.title}
            </h1>

            {post.excerpt && (
              <p className="mt-5 text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl">
                {post.excerpt}
              </p>
            )}

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-pink-300 to-rose-400 flex items-center justify-center text-white font-semibold">
                  {post.author?.[0] || "H"}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{post.author}</p>
                  {post.author_role && (
                    <p className="text-[11px] text-muted-foreground uppercase tracking-widest">{post.author_role}</p>
                  )}
                </div>
              </div>
              <Separator orientation="vertical" className="h-10 hidden sm:block" />
              <div className="flex items-center gap-2">
                <StarRating value={Math.round(post.rating_avg || 0)} readOnly size={18} />
                <span className="text-xs text-muted-foreground">
                  {post.rating_count > 0 ? `${post.rating_avg.toFixed(1)} · ${post.rating_count} ratings` : "Be first to rate"}
                </span>
              </div>
            </div>

            {post.cover_image && (
              <div className="mt-10 relative aspect-[16/9] rounded-3xl overflow-hidden shadow-[0_30px_80px_-30px_rgba(236,72,153,0.4)]">
                <Image
                  src={post.cover_image}
                  alt={post.title}
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 1024px) 100vw, 1024px"
                />
              </div>
            )}
          </div>
        </section>

        {/* Body + Sidebar */}
        <section className="max-w-6xl mx-auto px-4 py-14 lg:py-20 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-12">
          {/* Article */}
          <article>
            {/* Floating action rail on desktop */}
            <div className="hidden lg:flex fixed left-6 top-1/2 -translate-y-1/2 flex-col gap-2 z-30">
              <button
                onClick={handleLike}
                aria-label="Love this article"
                className={`w-11 h-11 rounded-full flex items-center justify-center border transition-all ${
                  liked
                    ? "bg-pink-500 text-white border-pink-500 shadow-[0_6px_20px_-6px_rgba(236,72,153,0.6)]"
                    : "bg-white text-foreground border-black/10 hover:border-pink-300 hover:text-pink-600"
                }`}
              >
                <Heart className={`h-4 w-4 ${liked ? "fill-white" : ""}`} />
              </button>
              <button
                onClick={handleShare}
                aria-label="Share"
                className="w-11 h-11 rounded-full flex items-center justify-center bg-white text-foreground border border-black/10 hover:border-pink-300 hover:text-pink-600 transition-all"
              >
                <Share2 className="h-4 w-4" />
              </button>
              <a
                href="#comments"
                aria-label="Comments"
                className="w-11 h-11 rounded-full flex items-center justify-center bg-white text-foreground border border-black/10 hover:border-pink-300 hover:text-pink-600 transition-all"
              >
                <MessageCircle className="h-4 w-4" />
              </a>
            </div>

            <div
              className="blog-article max-w-none text-foreground/85
                [&_h2]:font-serif [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:text-3xl [&_h2]:mt-12 [&_h2]:mb-4 [&_h2]:leading-tight
                [&_h3]:font-serif [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:text-2xl [&_h3]:mt-10 [&_h3]:mb-3
                [&_p]:text-[17px] [&_p]:leading-[1.85] [&_p]:my-5
                [&_a]:text-pink-600 [&_a]:font-medium [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-pink-700
                [&_strong]:text-foreground [&_strong]:font-semibold
                [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-5 [&_ul]:space-y-2
                [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-5 [&_ol]:space-y-2
                [&_li]:leading-[1.75] [&_li]:text-[17px] [&_li]:marker:text-pink-400
                [&_blockquote]:not-italic [&_blockquote]:border-l-4 [&_blockquote]:border-pink-400
                [&_blockquote]:bg-gradient-to-br [&_blockquote]:from-pink-50 [&_blockquote]:to-rose-50/60
                [&_blockquote]:rounded-r-2xl [&_blockquote]:py-5 [&_blockquote]:px-6 [&_blockquote]:my-8
                [&_blockquote]:text-foreground [&_blockquote]:font-serif [&_blockquote]:text-xl [&_blockquote]:leading-snug
                [&_p.lead]:text-xl [&_p.lead]:leading-[1.7] [&_p.lead]:font-medium [&_p.lead]:text-foreground
                [&_p.lead]:first-letter:font-serif [&_p.lead]:first-letter:text-[4rem] [&_p.lead]:first-letter:font-semibold
                [&_p.lead]:first-letter:float-left [&_p.lead]:first-letter:mr-3 [&_p.lead]:first-letter:mt-1
                [&_p.lead]:first-letter:leading-[0.9] [&_p.lead]:first-letter:text-pink-600
              "
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.content) }}
            />

            {/* Tag cloud */}
            {post.tags && post.tags.length > 0 && (
              <div className="mt-12 pt-8 border-t border-black/5">
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold mb-3">
                  Filed under
                </p>
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-3 py-1.5 rounded-full bg-white border border-pink-100 text-pink-700 text-xs font-medium hover:border-pink-300 transition-colors"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Rating CTA */}
            <div className="mt-10 p-8 rounded-3xl bg-gradient-to-br from-rose-50 via-white to-amber-50 border border-pink-100 text-center">
              <p className="text-[11px] uppercase tracking-widest text-pink-600 font-semibold mb-2">
                Enjoyed this story?
              </p>
              <h3 className="font-serif text-2xl font-semibold mb-4">
                Leave us a rating
              </h3>
              <div className="flex justify-center">
                <StarRating value={myRating || Math.round(post.rating_avg)} onChange={handleRate} size={28} />
              </div>
              {myRating > 0 && (
                <p className="mt-3 text-xs text-muted-foreground">
                  You rated {myRating} / 5 — tap again to change your rating.
                </p>
              )}
            </div>

            {/* Mobile actions */}
            <div className="lg:hidden mt-8 flex items-center justify-center gap-3">
              <Button
                onClick={handleLike}
                variant={liked ? "default" : "outline"}
                className={`rounded-full ${liked ? "bg-pink-500 hover:bg-pink-600 text-white" : ""}`}
              >
                <Heart className={`h-4 w-4 mr-2 ${liked ? "fill-white" : ""}`} />
                {liked ? "Loved" : "Love this"}
              </Button>
              <Button onClick={handleShare} variant="outline" className="rounded-full">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>

            {/* Comments */}
            <div id="comments" className="mt-14 pt-10 border-t border-black/5 scroll-mt-24">
              <h2 className="font-serif text-3xl font-semibold mb-2 flex items-center gap-3">
                <MessageCircle className="h-6 w-6 text-pink-500" />
                Comments
                <span className="text-sm text-muted-foreground font-sans font-normal">({comments.length})</span>
              </h2>
              <p className="text-sm text-muted-foreground mb-8">
                Join the conversation — thoughtful comments only, please.
              </p>

              <form
                onSubmit={handleSubmitComment}
                className="mb-10 p-6 rounded-3xl bg-white border border-black/5 shadow-sm"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <Input
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    maxLength={80}
                    className="bg-[#fdfaf7] border-black/10 focus-visible:ring-pink-300"
                  />
                  <Input
                    type="email"
                    placeholder="Email (optional, not published)"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    maxLength={160}
                    className="bg-[#fdfaf7] border-black/10 focus-visible:ring-pink-300"
                  />
                </div>
                <Textarea
                  placeholder="Share your thoughts…"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  required
                  maxLength={2000}
                  rows={4}
                  className="bg-[#fdfaf7] border-black/10 focus-visible:ring-pink-300 resize-none"
                />
                <div className="flex items-center justify-between mt-4">
                  <span className="text-[11px] text-muted-foreground">
                    {comment.length}/2000
                  </span>
                  <Button
                    type="submit"
                    disabled={submittingComment || !name.trim() || !comment.trim()}
                    className="bg-foreground text-background hover:bg-foreground/90 rounded-full"
                  >
                    {submittingComment ? "Posting…" : "Post Comment"}
                    <Send className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </form>

              <div className="space-y-5">
                {comments.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic text-center py-8">
                    Be the first to share your thoughts on this story.
                  </p>
                ) : (
                  comments.map((c) => (
                    <div
                      key={c.id}
                      className="p-5 rounded-2xl bg-white border border-black/5 hover:border-pink-100 transition-colors"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-pink-200 to-rose-300 flex items-center justify-center text-white font-semibold text-sm">
                          {c.name?.[0]?.toUpperCase() || "?"}
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{c.name}</p>
                          <p className="text-[11px] text-muted-foreground">{timeAgo(c.created_at)}</p>
                        </div>
                      </div>
                      <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-line">{c.comment}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </article>

          {/* Sidebar */}
          <aside className="space-y-8 lg:sticky lg:top-24 self-start">
            {sectionHeadings.length > 0 && (
              <div className="p-6 rounded-3xl bg-white border border-black/5">
                <p className="text-[11px] uppercase tracking-widest font-semibold text-pink-600 mb-3">
                  In this story
                </p>
                <ul className="space-y-2 text-sm">
                  {sectionHeadings.map((h, i) => (
                    <li key={h.id} className="text-muted-foreground hover:text-foreground transition-colors">
                      <span className="text-pink-400 font-semibold mr-2">0{i + 1}</span>
                      {h.text}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="p-6 rounded-3xl bg-gradient-to-br from-foreground to-black/85 text-background relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-pink-500/20 blur-3xl" aria-hidden="true" />
              <TrendingUp className="h-5 w-5 text-pink-300 mb-3" />
              <p className="font-serif text-xl font-semibold leading-tight mb-2">Shop the story</p>
              <p className="text-xs text-background/70 mb-4 leading-relaxed">
                Every piece in the Her Kingdom journal is wearable today. Browse the pieces our editors reach for.
              </p>
              <Link href="/shop">
                <Button
                  size="sm"
                  className="bg-background text-foreground hover:bg-background/90 rounded-full w-full"
                >
                  Shop the edit
                </Button>
              </Link>
            </div>

            {related.length > 0 && (
              <div>
                <p className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground mb-4">
                  Related stories
                </p>
                <div className="space-y-4">
                  {related.map((r) => (
                    <Link
                      key={r.id}
                      href={`/blogs/${r.slug}`}
                      className="group flex gap-3 p-3 rounded-2xl bg-white border border-black/5 hover:border-pink-200 transition-colors"
                    >
                      <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-pink-50 to-rose-50">
                        {r.cover_image && (
                          <Image
                            src={r.cover_image}
                            alt={r.title}
                            fill
                            className="object-cover group-hover:scale-110 transition-transform duration-700"
                            sizes="80px"
                          />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        {r.category && (
                          <p className="text-[10px] uppercase tracking-widest text-pink-600 font-semibold mb-1">
                            {r.category}
                          </p>
                        )}
                        <p className="text-sm font-semibold leading-tight line-clamp-2 group-hover:text-pink-600 transition-colors">
                          {r.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {r.read_time_minutes ?? 5} min
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </section>
      </main>

      <Footer />
    </div>
  )
}
