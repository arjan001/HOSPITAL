/**
 * Public product catalogue — serves CMS-backed products from api-nest so the
 * storefront can drop the legacy api-server /api/products dependency.
 */
import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Module,
  Param,
} from "@nestjs/common"
import { AdminCmsModule, AdminCmsService } from "./admin-cms.module"

export type StoreProduct = {
  id: string
  slug: string
  name: string
  price: number
  originalPrice?: number
  images: string[]
  category: string
  categorySlug: string
  description: string
  tags: string[]
  inStock: boolean
  stockCount?: number
  trustSeal?: boolean
  variations?: Array<{ type: string; options: string[] }>
  isNew?: boolean
  isOnOffer?: boolean
  offerPercentage?: number
  createdAt?: string
}

@Injectable()
export class CatalogService {
  constructor(@Inject(AdminCmsService) private readonly cms: AdminCmsService) {}

  private async rawProducts(): Promise<StoreProduct[]> {
    const entry = await this.cms.get("products")
    return Array.isArray(entry?.value) ? (entry.value as StoreProduct[]) : []
  }

  async list(): Promise<StoreProduct[]> {
    return this.rawProducts()
  }

  async listCategories(): Promise<unknown[]> {
    const entry = await this.cms.get("categories")
    return Array.isArray(entry?.value) ? entry.value : []
  }

  async getBySlug(slug: string): Promise<StoreProduct> {
    const { product } = await this.getDetailBySlug(slug)
    return product
  }

  async getDetailBySlug(slug: string): Promise<{ product: StoreProduct; related: StoreProduct[] }> {
    const items = await this.rawProducts()
    const product = items.find((x) => x.slug === slug)
    if (!product) throw new HttpException("Product not found", HttpStatus.NOT_FOUND)
    const collection = (product as StoreProduct & { collection?: string }).collection
    const related = items
      .filter((p) => {
        if (p.id === product.id) return false
        const pCollection = (p as StoreProduct & { collection?: string }).collection
        return p.categorySlug === product.categorySlug || (collection && pCollection === collection)
      })
      .slice(0, 8)
    return { product, related }
  }
}

@Controller("products")
class PublicProductsController {
  constructor(@Inject(CatalogService) private readonly catalog: CatalogService) {}

  @Get()
  list() {
    return this.catalog.list()
  }

  @Get(":slug")
  get(@Param("slug") slug: string) {
    return this.catalog.getDetailBySlug(slug)
  }
}

@Controller("categories")
class PublicCategoriesController {
  constructor(@Inject(CatalogService) private readonly catalog: CatalogService) {}

  @Get()
  list() {
    return this.catalog.listCategories()
  }
}

@Module({
  imports: [AdminCmsModule],
  controllers: [PublicProductsController, PublicCategoriesController],
  providers: [CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}
