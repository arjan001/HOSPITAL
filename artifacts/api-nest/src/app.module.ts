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
 *   Admin            — AdminOrders, AdminPayments, AdminCms, CatalogImport
 *   Infrastructure   — Health, Prescriptions, Uploads, Chat, Monitoring,
 *                       Email, Notifications, Pipeline
 */

import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common"
import { APP_FILTER } from "@nestjs/core"
import { SessionMiddleware } from "./common/session.middleware"
import { RateLimitMiddleware } from "./common/rate-limit.middleware"
import { AllExceptionsFilter } from "./common/all-exceptions.filter"

// Customer-facing modules
import { ProfileModule } from "./modules/profile.module"
import { AddressesModule } from "./modules/addresses.module"
import { WishlistModule } from "./modules/wishlist.module"
import { OrdersModule } from "./modules/orders.module"
import { PaystackModule } from "./modules/paystack.module"
import { ReviewsModule } from "./modules/reviews.module"

// Admin modules
import { AdminAuthModule } from "./modules/admin-auth.module"
import { AdminOrdersModule } from "./modules/admin-orders.module"
import { AdminPaymentsModule } from "./modules/admin-payments.module"
import { AdminCmsModule } from "./modules/admin-cms.module"
import { CatalogImportModule } from "./modules/catalog-import.module"
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
import { WhatsAppModule } from "./modules/whatsapp.module"
import { ErrorReportingModule } from "./modules/error-reporting.module"
import { StorageModule } from "./modules/storage.module"
import { NewsletterModule } from "./modules/newsletter.module"
import { AuditModule } from "./modules/audit.module"
import { ContactInquiriesModule } from "./modules/contact-inquiries.module"
import { CrmModule } from "./modules/crm.module"
import { PrescriptionSubscriptionsModule } from "./modules/prescription-subscriptions.module"
import { OperationsModule } from "./modules/operations.module"
import { SourcingModule } from "./modules/sourcing.module"
import { OperationsFulfillmentModule } from "./modules/operations-fulfillment"
import { QaLogisticsModule } from "./modules/qa-logistics.module"

@Module({
  imports: [
    // Customer-facing
    ProfileModule,
    AddressesModule,
    WishlistModule,
    OrdersModule,
    PaystackModule,
    ReviewsModule,

    // Admin
    AdminAuthModule,
    AdminOrdersModule,
    AdminPaymentsModule,
    AdminCmsModule,
    CatalogImportModule,
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
    WhatsAppModule,
    ErrorReportingModule,
    StorageModule,
    NewsletterModule,
    AuditModule,
    ContactInquiriesModule,
    CrmModule,
    PrescriptionSubscriptionsModule,
    OperationsModule,
    SourcingModule,
    OperationsFulfillmentModule,
    QaLogisticsModule,
  ],
  providers: [
    // Global catch-all exception filter: normalises every error response and
    // records server-side (5xx) failures into the monitoring store.
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule implements NestModule {
  /**
   * Global middleware order matters:
   *   1. RateLimitMiddleware — reject abusive clients before any work is done.
   *   2. SessionMiddleware   — issue/verify the signed session cookie and
   *      attach `req.sessionId` so every controller can scope data per-tenant.
   */
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RateLimitMiddleware, SessionMiddleware).forRoutes("*")
  }
}
