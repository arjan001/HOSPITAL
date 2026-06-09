/**
 * Public storefront reads — site-data aggregator, delivery locations, social feed.
 */
import { Controller, Get, Inject, Injectable, Module } from "@nestjs/common"
import { AdminCmsModule, AdminCmsService } from "./admin-cms.module"

const DEFAULT_SETTINGS = {
  store_name: "Shaniid RX",
  store_phone: "+254780406059",
  whatsapp_number: "254780406059",
  maintenance_mode: false,
  show_newsletter: true,
}

@Injectable()
export class StorefrontService {
  constructor(@Inject(AdminCmsService) private readonly cms: AdminCmsService) {}

  private async readKey<T>(key: string, fallback: T): Promise<T> {
    const entry = await this.cms.get(key)
    return (entry?.value as T) ?? fallback
  }

  async siteData() {
    const [navbarOffers, popupOffer, promoBanners, storeSettings] = await Promise.all([
      this.readKey("navbar-offers", []),
      this.readKey("popup-offer", null),
      this.readKey("promo-banners", []),
      this.readKey("store-settings", {} as Record<string, unknown>),
    ])
    return {
      navbarOffers,
      popupOffer,
      settings: { ...DEFAULT_SETTINGS, ...storeSettings },
      midPageBanners: promoBanners,
    }
  }

  async deliveryLocations() {
    return this.readKey("delivery-locations", [])
  }

  async socialFeed() {
    return this.readKey("social-feed", { posts: [] })
  }
}

@Controller()
class StorefrontController {
  constructor(@Inject(StorefrontService) private readonly store: StorefrontService) {}

  @Get("site-data")
  siteData() {
    return this.store.siteData()
  }

  @Get("delivery-locations")
  deliveryLocations() {
    return this.store.deliveryLocations()
  }

  @Get("social-feed")
  socialFeed() {
    return this.store.socialFeed()
  }
}

@Module({
  imports: [AdminCmsModule],
  controllers: [StorefrontController],
  providers: [StorefrontService],
  exports: [StorefrontService],
})
export class StorefrontModule {}
