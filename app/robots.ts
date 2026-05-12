import type { MetadataRoute } from "next"
import { SITE_SEO } from "@/lib/seo-data"

// Paths that must never be indexed by any crawler (search, social, or AI).
const DISALLOWED_PATHS = ["/admin/", "/api/", "/auth/", "/checkout/"]

// AI-assistant and LLM-training crawlers. Allowing these unlocks
// discoverability on Google AI Overviews / Gemini, ChatGPT browse & search,
// Claude, Perplexity, Apple Intelligence, Bing Copilot, etc.
const AI_CRAWLERS = [
  "GPTBot",             // OpenAI training crawler
  "OAI-SearchBot",      // ChatGPT search index
  "ChatGPT-User",       // ChatGPT browse / on-demand fetch
  "Google-Extended",    // Google Gemini & AI Overviews opt-in
  "GoogleOther",        // Google AI / research crawlers
  "ClaudeBot",          // Anthropic Claude training crawler
  "Claude-Web",         // Anthropic Claude browse
  "anthropic-ai",       // Legacy Anthropic crawler UA
  "PerplexityBot",      // Perplexity AI search
  "Perplexity-User",    // Perplexity on-demand fetch
  "Applebot",           // Apple Search / Spotlight
  "Applebot-Extended",  // Apple Intelligence opt-in
  "CCBot",              // Common Crawl (feeds many LLMs)
  "Bytespider",         // TikTok / ByteDance AI crawler
  "Meta-ExternalAgent", // Meta AI crawler
  "Amazonbot",          // Amazon Alexa / AI crawler
  "cohere-ai",          // Cohere AI crawler
  "Diffbot",            // Knowledge graph crawler used by LLMs
  "DuckAssistBot",      // DuckDuckGo AI
  "YouBot",             // You.com AI search
  "Timpibot",           // Timpi search index
  "ImagesiftBot",       // Reverse image AI
  "Omgilibot",          // Webz / Omgili AI crawler
  "FirecrawlAgent",     // Firecrawl web indexing
  "MistralAI-User",     // Mistral AI fetch
]

export default function robots(): MetadataRoute.Robots {
  const rules: MetadataRoute.Robots["rules"] = [
    {
      userAgent: "Googlebot",
      allow: "/",
      disallow: DISALLOWED_PATHS,
    },
    {
      userAgent: "Bingbot",
      allow: "/",
      disallow: DISALLOWED_PATHS,
    },
    // One rule per AI crawler so operators can see exactly which agents are
    // opted in and tune individual bots later without touching the catch-all.
    ...AI_CRAWLERS.map((agent) => ({
      userAgent: agent,
      allow: "/",
      disallow: DISALLOWED_PATHS,
    })),
    {
      userAgent: "*",
      allow: "/",
      disallow: DISALLOWED_PATHS,
    },
  ]

  return {
    rules,
    sitemap: `${SITE_SEO.siteUrl}/sitemap.xml`,
    host: SITE_SEO.siteUrl,
  }
}
