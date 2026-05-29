/**
 * Root NestJS application module.
 *
 * This file is the single place that wires together every feature module and
 * applies global middleware. When adding a new module, import it here and add
 * it to the `imports` array.
 *
 * Middleware:
 *   SessionMiddleware is applied to every route ("*"). It reads or issues a
 *   `shaniidrx_sid` cookie and attaches `req.sessionId` so all downstream
 *   controllers can scope data to the current user/guest without needing to
 *   repeat auth logic. When Clerk JWT auth lands, only this middleware file
 *   changes — controllers and services stay the same.
 *
 * Module groups:
 *   Customer-facing  — Profile, Addresses, Wishlist, Orders, Paystack
 *   Admin            — AdminOrders, AdminPayments, AdminCms, CatalogImport, WebScraper
 *   Infrastructure   — Health, Prescriptions, Uploads, Chat, Monitoring,
 *                       Email, Notifications, Pipeline
 */

import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common"
import { SessionMiddleware } from "./common/session.middleware"

// Customer-facing modules
import { ProfileModule } from "./modules/profile.module"
import { AddressesModule } from "./modules/addresses.module"
import { WishlistModule } from "./modules/wishlist.module"
import { OrdersModule } from "./modules/orders.module"
import { PaystackModule } from "./modules/paystack.module"

// Admin modules
import { AdminAuthModule } from "./modules/admin-auth.module"
import { AdminOrdersModule } from "./modules/admin-orders.module"
import { AdminPaymentsModule } from "./modules/admin-payments.module"
import { AdminCmsModule } from "./modules/admin-cms.module"
import { CatalogImportModule } from "./modules/catalog-import.module"
import { WebScraperModule } from "./modules/web-scraper.module"
import { PatientNotesModule } from "./modules/patient-notes.module"

// Infrastructure modules
import { HealthModule } from "./modules/health.module"
import { PrescriptionsModule } from "./modules/prescriptions.module"
import { UploadsModule } from "./modules/uploads.module"
import { ChatModule } from "./modules/chat.module"
import { MonitoringModule } from "./modules/monitoring.module"
import { EmailModule } from "./modules/email.module"
import { NotificationsModule } from "./modules/notifications.module"
import { PipelineModule } from "./modules/pipeline.module"
import { PartnersModule } from "./modules/partners.module"

@Module({
  imports: [
    // Customer-facing
    ProfileModule,
    AddressesModule,
    WishlistModule,
    OrdersModule,
    PaystackModule,

    // Admin
    AdminAuthModule,
    AdminOrdersModule,
    AdminPaymentsModule,
    AdminCmsModule,
    CatalogImportModule,
    WebScraperModule,
    PatientNotesModule,

    // Infrastructure
    HealthModule,
    PrescriptionsModule,
    UploadsModule,
    ChatModule,
    MonitoringModule,
    EmailModule,
    NotificationsModule,
    PipelineModule,
    PartnersModule,
  ],
})
export class AppModule implements NestModule {
  /**
   * Apply SessionMiddleware globally so every request — regardless of which
   * module handles it — has `req.sessionId` available.
   */
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SessionMiddleware).forRoutes("*")
  }
}
