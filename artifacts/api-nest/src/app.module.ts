/**
 * Root NestJS application module.
 *
 * This file is the single place that wires together every feature module and
 * applies global middleware. When adding a new module, import it here and add
 * it to the `imports` array.
 *
 * Middleware:
 *   1. RateLimitMiddleware — abuse protection per IP/session.
 *   2. SessionMiddleware — signed `shaniidrx_sid` cookie → req.sessionId.
 *   3. AuditRequestScopeMiddleware — per-request ALS for audit dedupe.
 *
 * Global interceptors:
 *   AuditInterceptor — auto-logs all successful POST/PUT/PATCH/DELETE for
 *   every actor type (admin, customer, partner, guest).
 *
 * Module groups:
 *   Customer-facing  — Profile, Addresses, Wishlist, Orders, Paystack
 *   Admin            — AdminOrders, AdminPayments, AdminCms, CatalogImport
 *   Infrastructure   — Health, Prescriptions, Uploads, Chat, Monitoring,
 *                       Email, Notifications, Pipeline
 */

import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common"
import { APP_FILTER, APP_INTERCEPTOR } from "@nestjs/core"
import { SessionMiddleware } from "./common/session.middleware"
import { RateLimitMiddleware } from "./common/rate-limit.middleware"
import { AllExceptionsFilter } from "./common/all-exceptions.filter"
import { AuditInterceptor } from "./common/audit.interceptor"
import { AuditRequestScopeMiddleware } from "./common/audit-request-scope.middleware"

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
import { PharmacyModule } from "./modules/pharmacy.module"
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
import { SourcingExtModule } from "./modules/sourcing-ext.module"
import { OperationsFulfillmentModule } from "./modules/operations-fulfillment"
import { QaLogisticsModule } from "./modules/qa-logistics.module"
import { DoctorsModule } from "./modules/doctors.module"
import { CustomerFeedbackModule } from "./modules/customer-feedback.module"
import { CatalogModule } from "./modules/catalog.module"
import { CartModule } from "./modules/cart.module"
import { SendyModule } from "./modules/sendy.module"
import { StorefrontModule } from "./modules/storefront.module"
import { AnalyticsModule } from "./modules/analytics.module"
import { BlogsModule } from "./modules/blogs.module"
import { SeoModule } from "./modules/seo.module"
import { VideoModule } from "./modules/video.module"
import { CampaignsAdminModule } from "./modules/campaigns-admin.module"
import { SupplierPurchaseOrdersModule } from "./modules/supplier-purchase-orders.module"
import { IntegrationsAdminModule } from "./modules/integrations-admin.module"
import { TradingModule } from "./modules/trading.module"
import { PartnerDirectoryModule } from "./modules/partner-directory.module"

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
    PharmacyModule,
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
    SourcingExtModule,
    OperationsFulfillmentModule,
    QaLogisticsModule,
    DoctorsModule,
    CustomerFeedbackModule,
    CatalogModule,
    CartModule,
    SendyModule,
    StorefrontModule,
    AnalyticsModule,
    BlogsModule,
    SeoModule,
    VideoModule,
    CampaignsAdminModule,
    SupplierPurchaseOrdersModule,
    IntegrationsAdminModule,
    TradingModule,
    PartnerDirectoryModule,
  ],
  providers: [
    RateLimitMiddleware,
    SessionMiddleware,
    AuditInterceptor,
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule implements NestModule {
  /**
   * Global middleware order matters:
   *   1. RateLimitMiddleware — reject abusive clients before any work is done.
   *   2. SessionMiddleware   — issue/verify the signed session cookie and
   *      attach `req.sessionId` so every controller can scope data per-tenant.
   *   3. AuditRequestScopeMiddleware — ALS scope for per-request audit dedupe.
   */
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RateLimitMiddleware, SessionMiddleware, AuditRequestScopeMiddleware)
      .forRoutes("*")
  }
}
