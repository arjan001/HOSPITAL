/**
 * Public SEO endpoints — dynamic sitemap from live catalogue + blog CMS.
 */
import { Controller, Get, Header, Inject, Injectable, Module, Res } from "@nestjs/common"
import type { Response } from "express"
import {
  STATIC_SITEMAP_PAGES,
  blogSitemapEntries,
  buildSitemapXml,
  productSitemapEntries,
} from "../common/sitemap-builder"
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
}

@Module({
  imports: [CatalogModule, BlogsModule],
  providers: [SeoService],
  controllers: [SeoController],
  exports: [SeoService],
})
export class SeoModule {}
