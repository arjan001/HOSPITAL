import { NextResponse } from "next/server"

export const revalidate = 1800 // cache 30 min

interface SocialPost {
  id: string
  platform: "instagram" | "tiktok"
  thumbnailUrl: string
  caption: string
  url: string
  authorName: string
}

// ── Instagram ─────────────────────────────────────────
async function fetchInstagramPosts(): Promise<SocialPost[]> {
  const username = "herkingdom_jewelry"
  const posts: SocialPost[] = []

  try {
    const res = await fetch(`https://imginn.com/${username}/`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "text/html",
      },
      next: { revalidate: 1800 },
    })

    if (res.ok) {
      const html = await res.text()
      const imgRegex =
        /<a[^>]*href="(\/p\/[^"]+)"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"[^>]*>/g
      let match
      let count = 0
      while ((match = imgRegex.exec(html)) !== null && count < 2) {
        const postPath = match[1]
        const thumbUrl = match[2]
        if (thumbUrl && !thumbUrl.includes("avatar") && !thumbUrl.includes("profile")) {
          const shortcode = postPath.replace("/p/", "").replace("/", "")
          posts.push({
            id: `ig-${shortcode}`,
            platform: "instagram",
            thumbnailUrl: thumbUrl,
            caption: "Latest from @herkingdom_jewelry",
            url: `https://www.instagram.com/p/${shortcode}/`,
            authorName: `@${username}`,
          })
          count++
        }
      }

      if (posts.length >= 2) return posts.slice(0, 2)
    }
  } catch {
    // continue to next approach
  }

  try {
    const res = await fetch(`https://bibliogram.art/u/${username}/rss.xml`, {
      next: { revalidate: 1800 },
    })
    if (res.ok) {
      const xml = await res.text()
      const items = xml.split("<item>").slice(1, 3)
      for (const item of items) {
        const linkMatch = item.match(/<link>([^<]+)<\/link>/)
        const imgMatch =
          item.match(/<media:content[^>]*url="([^"]+)"/) ||
          item.match(/<enclosure[^>]*url="([^"]+)"/) ||
          item.match(/src="(https:\/\/[^"]+\.jpg[^"]*)"/i)
        const titleMatch = item.match(/<title>([^<]*)<\/title>/)
        if (linkMatch) {
          posts.push({
            id: `ig-bib-${posts.length}`,
            platform: "instagram",
            thumbnailUrl: imgMatch?.[1] || "",
            caption: titleMatch?.[1]?.slice(0, 100) || "Latest from Instagram",
            url: linkMatch[1],
            authorName: `@${username}`,
          })
        }
      }
      if (posts.length >= 2) return posts.slice(0, 2)
    }
  } catch {
    // continue
  }

  return posts
}

// ── TikTok ────────────────────────────────────────────
async function fetchTikTokPosts(): Promise<SocialPost[]> {
  const videoUrls = [
    "https://www.tiktok.com/@herkingdom_jewelry/video/7461643744227393798",
    "https://www.tiktok.com/@herkingdom_jewelry/video/7459629757042420998",
  ]

  const posts: SocialPost[] = []

  for (const videoUrl of videoUrls) {
    try {
      const res = await fetch(
        `https://www.tiktok.com/oembed?url=${encodeURIComponent(videoUrl)}`,
        { next: { revalidate: 1800 } }
      )
      if (res.ok) {
        const data = await res.json()
        posts.push({
          id: `tt-${data.embed_product_id || posts.length}`,
          platform: "tiktok",
          thumbnailUrl: data.thumbnail_url || "",
          caption:
            data.title?.slice(0, 100) || "Latest from TikTok",
          url: videoUrl,
          authorName: data.author_name
            ? `@${data.author_name}`
            : "@herkingdom_jewelry",
        })
      }
    } catch {
      // continue
    }
  }

  return posts
}

// ── Fallback posts (used when APIs fail) ──────────────
const fallbackPosts: SocialPost[] = [
  {
    id: "ig-fallback-1",
    platform: "instagram",
    thumbnailUrl: "",
    caption: "New jewelry collection just dropped! Shop now",
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

export async function GET() {
  const [igPosts, ttPosts] = await Promise.all([
    fetchInstagramPosts(),
    fetchTikTokPosts(),
  ])

  const combined: SocialPost[] = []
  const maxLen = Math.max(igPosts.length, ttPosts.length)
  for (let i = 0; i < maxLen && combined.length < 4; i++) {
    if (igPosts[i]) combined.push(igPosts[i])
    if (ttPosts[i]) combined.push(ttPosts[i])
  }

  const result: SocialPost[] = []
  let igIdx = 0
  let ttIdx = 0
  const liveIg = combined.filter((p) => p.platform === "instagram")
  const liveTt = combined.filter((p) => p.platform === "tiktok")
  const fallbackIg = fallbackPosts.filter((p) => p.platform === "instagram")
  const fallbackTt = fallbackPosts.filter((p) => p.platform === "tiktok")

  for (let i = 0; i < 4; i++) {
    if (i % 2 === 0) {
      result.push(liveIg[igIdx] || fallbackIg[igIdx] || fallbackPosts[i])
      igIdx++
    } else {
      result.push(liveTt[ttIdx] || fallbackTt[ttIdx] || fallbackPosts[i])
      ttIdx++
    }
  }

  return NextResponse.json({
    posts: result,
    sources: {
      instagram: liveIg.length > 0 ? "live" : "fallback",
      tiktok: liveTt.length > 0 ? "live" : "fallback",
    },
  })
}
