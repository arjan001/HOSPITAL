/**
 * Public SEO endpoints — dynamic sitemap from live catalogue + blog CMS.
 */
import { Controller, Get, Header, Inject, Injectable, Module, Query, Res } from "@nestjs/common"
import type { Response } from "express"
import {
  STATIC_SITEMAP_PAGES,
  blogSitemapEntries,
  buildSitemapXml,
  productSitemapEntries,
} from "../common/sitemap-builder"
import { buildCrawlHtml } from "../common/crawl-html"
import { CatalogModule, CatalogService } from "./catalog.module"
import { BlogsModule, BlogsService } from "./blogs.module"

@Injectable()
export class SeoService {
  constructor(
    @Inject(CatalogService) private readonly catalog: CatalogService,
    @Inject(BlogsService) private readonly blogs: BlogsService,
  ) {}

  async buildSitemap(): Promise<string> {
    const [products, blogList] = await Promise.all([
      this.catalog.list().catch(() => []),
      this.blogs.list().catch(() => ({ posts: [] as Array<{ slug: string; published_at?: string }> })),
    ])

    const urls = [
      ...STATIC_SITEMAP_PAGES,
      ...productSitemapEntries(products),
      ...blogSitemapEntries(blogList.posts ?? []),
    ]

    return buildSitemapXml(urls)
  }

  /** SSR-lite crawl HTML for paths not covered by build-time prerender. */
  async crawlHtml(pathRaw: string): Promise<string | null> {
    const path = pathRaw.startsWith("/") ? pathRaw : `/${pathRaw}`
    if (path === "/" || path === "/shop" || path === "/faq" || path === "/blogs") {
      const staticMeta: Record<string, { title: string; description: string }> = {
        "/": {
          title: "Shaniid RX — Trusted Online Pharmacy in Kenya",
          description: "Genuine medicine, vitamins and devices delivered across Kenya.",
        },
        "/shop": {
          title: "Shop Medicines & Health Products | Shaniid RX",
          description: "Browse verified medicines and health products from Shaniid RX.",
        },
        "/faq": {
          title: "FAQ | Shaniid RX",
          description: "Delivery, prescriptions, and payment questions answered.",
        },
        "/blogs": {
          title: "Health Notes | Shaniid RX",
          description: "Pharmacy articles and health notes from Kenya's trusted online pharmacy.",
        },
      }
      const meta = staticMeta[path]
      if (!meta) return null
      return buildCrawlHtml({ path, ...meta })
    }

    const productMatch = path.match(/^\/product\/([^/]+)$/)
    if (productMatch) {
      const slug = productMatch[1]!
      const products = await this.catalog.list().catch(() => [])
      const p = products.find((x) => x.slug === slug || x.id === slug)
      if (!p) return null
      const desc = (p.description || `Buy ${p.name} from Shaniid RX.`).slice(0, 160)
      return buildCrawlHtml({
        path,
        title: `${p.name} | Shaniid RX`,
        description: desc,
        jsonLd: {
          "@context": "https://schema.org",
          "@type": "Product",
          name: p.name,
          description: desc,
        },
      })
    }

    const blogMatch = path.match(/^\/blogs\/([^/]+)$/)
    if (blogMatch) {
      const slug = blogMatch[1]!
      const { posts } = await this.blogs.list().catch(() => ({ posts: [] as Array<{ slug: string; title: string; excerpt?: string }> }))
      const post = (posts ?? []).find((x) => x.slug === slug)
      if (!post) return null
      return buildCrawlHtml({
        path,
        title: `${post.title} | Shaniid RX`,
        description: (post.excerpt || post.title).slice(0, 160),
      })
    }

    return null
  }
}

@Controller("seo")
class SeoController {
  constructor(@Inject(SeoService) private readonly seo: SeoService) {}

  @Get("sitemap.xml")
  @Header("Content-Type", "application/xml; charset=utf-8")
  @Header("Cache-Control", "public, max-age=3600")
  async sitemap(@Res() res: Response) {
    const xml = await this.seo.buildSitemap()
    res.status(200).send(xml)
  }

  @Get("crawl-html")
  @Header("Content-Type", "text/html; charset=utf-8")
  @Header("Cache-Control", "public, max-age=600")
  async crawlHtml(@Query("path") path: string, @Res() res: Response) {
    const html = await this.seo.crawlHtml(path || "/")
    if (!html) {
      res.status(404).send("Not found")
      return
    }
    res.status(200).send(html)
  }
}

@Module({
  imports: [CatalogModule, BlogsModule],
  providers: [SeoService],
  controllers: [SeoController],
  exports: [SeoService],
})
export class SeoModule {}
