/**
 * Public blog reads + engagement (CMS-backed `blogs` key + `blog-engagement` meta).
 */
import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Module,
  Param,
  Post,
} from "@nestjs/common"
import { AdminCmsModule, AdminCmsService } from "./admin-cms.module"

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
  tags: string[] | null
  category: string | null
  read_time_minutes: number | null
  views: number | null
  is_published: boolean
  is_featured: boolean
  published_at: string
  created_at: string
  updated_at: string
}

type BlogComment = {
  id: string
  name: string
  email: string
  body: string
  createdAt: string
}

type BlogEngagement = {
  views: number
  ratingSum: number
  ratingCount: number
  comments: BlogComment[]
}

type EngagementStore = Record<string, BlogEngagement>

@Injectable()
export class BlogsService {
  constructor(@Inject(AdminCmsService) private readonly cms: AdminCmsService) {}

  private async posts(): Promise<BlogPost[]> {
    const entry = await this.cms.get("blogs")
    return Array.isArray(entry?.value) ? (entry.value as BlogPost[]) : []
  }

  private async engagement(): Promise<EngagementStore> {
    const entry = await this.cms.get("blog-engagement")
    return (entry?.value as EngagementStore) ?? {}
  }

  private async saveEngagement(store: EngagementStore) {
    await this.cms.put("blog-engagement", store)
  }

  private engFor(store: EngagementStore, slug: string): BlogEngagement {
    return store[slug] ?? { views: 0, ratingSum: 0, ratingCount: 0, comments: [] }
  }

  async list() {
    const published = (await this.posts()).filter((p) => p.is_published)
    return {
      posts: published.map((p) => ({
        slug: p.slug,
        title: p.title,
        excerpt: p.excerpt,
        cover_image: p.cover_image,
        author: p.author,
        category: p.category,
        read_time_minutes: p.read_time_minutes,
        published_at: p.published_at,
        is_featured: p.is_featured,
      })),
    }
  }

  async getBySlug(slug: string) {
    const posts = await this.posts()
    const post = posts.find((p) => p.slug === slug && p.is_published)
    if (!post) throw new HttpException("Not found", HttpStatus.NOT_FOUND)
    const related = posts
      .filter((p) => p.is_published && p.slug !== slug && p.category === post.category)
      .slice(0, 3)
      .map((p) => ({ slug: p.slug, title: p.title, cover_image: p.cover_image }))
    return { post, related }
  }

  async incrementView(slug: string) {
    const store = await this.engagement()
    const e = this.engFor(store, slug)
    e.views += 1
    store[slug] = e
    await this.saveEngagement(store)
    return { ok: true, views: e.views }
  }

  async comments(slug: string) {
    const store = await this.engagement()
    return { comments: this.engFor(store, slug).comments }
  }

  async addComment(slug: string, input: { name?: string; email?: string; body?: string }) {
    const body = String(input.body ?? "").trim()
    if (!body) throw new HttpException("Comment required", HttpStatus.BAD_REQUEST)
    const store = await this.engagement()
    const e = this.engFor(store, slug)
    e.comments.unshift({
      id: `cmt_${Date.now().toString(36)}`,
      name: String(input.name ?? "Guest").slice(0, 80),
      email: String(input.email ?? "").slice(0, 120),
      body: body.slice(0, 2000),
      createdAt: new Date().toISOString(),
    })
    store[slug] = e
    await this.saveEngagement(store)
    return { ok: true }
  }

  async rate(slug: string, stars: number) {
    const n = Math.round(Number(stars))
    if (!Number.isFinite(n) || n < 1 || n > 5) {
      throw new HttpException("stars must be 1–5", HttpStatus.BAD_REQUEST)
    }
    const store = await this.engagement()
    const e = this.engFor(store, slug)
    e.ratingSum += n
    e.ratingCount += 1
    store[slug] = e
    await this.saveEngagement(store)
    const avg = e.ratingCount > 0 ? Math.round((e.ratingSum / e.ratingCount) * 10) / 10 : 0
    return { ok: true, average: avg, count: e.ratingCount }
  }
}

@Controller("blogs")
class BlogsController {
  constructor(@Inject(BlogsService) private readonly blogs: BlogsService) {}

  @Get()
  list() {
    return this.blogs.list()
  }

  @Get(":slug")
  get(@Param("slug") slug: string) {
    return this.blogs.getBySlug(slug)
  }

  @Post(":slug")
  view(@Param("slug") slug: string) {
    return this.blogs.incrementView(slug)
  }

  @Get(":slug/comments")
  comments(@Param("slug") slug: string) {
    return this.blogs.comments(slug)
  }

  @Post(":slug/comments")
  addComment(@Param("slug") slug: string, @Body() body: { name?: string; email?: string; body?: string }) {
    return this.blogs.addComment(slug, body ?? {})
  }

  @Post(":slug/rate")
  rate(@Param("slug") slug: string, @Body() body: { stars?: number }) {
    return this.blogs.rate(slug, body?.stars ?? 0)
  }
}

@Module({
  imports: [AdminCmsModule],
  controllers: [BlogsController],
  providers: [BlogsService],
  exports: [BlogsService],
})
export class BlogsModule {}
