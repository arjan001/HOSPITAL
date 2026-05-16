import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common"
import { SessionMiddleware } from "./common/session.middleware"
import { HealthModule } from "./modules/health.module"
import { ProfileModule } from "./modules/profile.module"
import { AddressesModule } from "./modules/addresses.module"
import { WishlistModule } from "./modules/wishlist.module"
import { OrdersModule } from "./modules/orders.module"
import { ChatModule } from "./modules/chat.module"
import { MonitoringModule } from "./modules/monitoring.module"

@Module({
  imports: [
    HealthModule,
    ProfileModule,
    AddressesModule,
    WishlistModule,
    OrdersModule,
    ChatModule,
    MonitoringModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SessionMiddleware).forRoutes("*")
  }
}
