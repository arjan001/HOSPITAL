import { useEffect, useRef } from "react";
import { Switch, Route, Redirect, useLocation, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ClerkProvider, AuthenticateWithRedirectCallback, Show, useClerk } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { Toaster } from "@/components/ui/sonner";
import NotFound from "@/pages/not-found";
import { CartProvider } from "@/lib/cart-context";
import { WishlistProvider } from "@/lib/wishlist-context";
import { PageViewTracker } from "@/components/page-view-tracker";
import { ErrorBoundary } from "@/components/error-boundary";
import { BackToTop } from "@/components/store/back-to-top";

// Store pages
import { LandingPage } from "@/components/store/landing-page";
import { ShopPage } from "@/components/store/shop-page";
import { CollectionPage } from "@/components/store/collection-page";
import { ProductDetailPage } from "@/components/store/product-detail-page";
import { CheckoutPage } from "@/components/store/checkout-page";
import { WishlistPage } from "@/components/store/wishlist-page";
import { BlogsPage } from "@/components/store/blogs-page";
import { BlogDetailPage } from "@/components/store/blog-detail-page";
import { SearchPage } from "@/components/store/search-page";
import { DeliveryPage } from "@/components/store/delivery-page";
import { ServicesPage } from "@/components/store/services-page";
import { TrackOrderForm } from "@/components/store/track-order-form";
import { CarePacksPage } from "@/components/store/care-packs-page";
import FaqPage from "@/pages/faq";
import ContactPage from "@/pages/contact";

// Admin pages
import { AdminDashboard } from "@/components/admin/dashboard";
import { AdminAnalytics } from "@/components/admin/analytics";
import { AdminBanners } from "@/components/admin/banners";
import { AdminBlogs } from "@/components/admin/blogs";

import { AdminCategories } from "@/components/admin/categories";
import { AdminDelivery } from "@/components/admin/delivery";
import { NewsletterComponent as AdminNewsletter } from "@/components/admin/newsletter";
import { AdminOrders } from "@/components/admin/orders";
import { AdminPayments } from "@/components/admin/payments";
import { AdminPolicies } from "@/components/admin/policies";
import { AdminProducts } from "@/components/admin/products";
import { AdminSourcing } from "@/components/admin/sourcing";
import {
  AdminSourcingInventory,
  AdminSourcingForecast,
  AdminSourcingPricing,
  AdminSourcingAutomation,
  AdminSourcingPerformance,
} from "@/components/admin/sourcing-pages";
import {
  AdminTrading,
  AdminTradingBids,
  AdminTradingNegotiation,
  AdminTradingSettlements,
  AdminQaBatches,
  AdminQaTrustSeal,
  AdminQaRecalls,
  AdminLogisticsInventory,
  AdminLogisticsLeadTime,
  AdminLogisticsFallback,
} from "@/components/admin/flow-pages";
import { AdminLogistics } from "@/components/admin/logistics-ops";
import { AdminQa } from "@/components/admin/qa-ops";
import { AdminMessageTemplates } from "@/components/admin/message-templates";
import { AdminMessageOutbox } from "@/components/admin/message-outbox";
import {
  AdminCampaignsOverview,
  AdminCampaignsEmail,
  AdminCampaignsSms,
  AdminCampaignsAudiences,
  AdminCampaignsPipelines,
  AdminCampaignsQueue,
  AdminCampaignsSettings,
} from "@/components/admin/campaigns";
import { AdminSettings } from "@/components/admin/settings";
// import { AdminPos } from "@/components/admin/pos"; // hidden until client requests POS module
import { UsersManagement } from "@/components/admin/users";
import { AdminSuppliers } from "@/components/admin/suppliers";
import { AdminClinics } from "@/components/admin/clinics";
import { AdminLogisticsPartners } from "@/components/admin/logistics-partners";

// Partner portals
import SupplierPortal from "@/pages/portal/supplier";
import ClinicPortal from "@/pages/portal/clinic";
import LogisticsPortal from "@/pages/portal/logistics";
import { AdminCustomers } from "@/components/admin/customers";
import { useCustomerMirror } from "@/lib/use-customer-mirror";
import { AdminAnnouncementBar } from "@/components/admin/announcement-bar";
import { AdminCustomPages } from "@/components/admin/custom-pages";
import { AdminFooterCms } from "@/components/admin/footer-cms";
import { AdminWebsiteSettings } from "@/components/admin/website-settings";
import { AdminIntegrations } from "@/components/admin/integrations";
import { AdminPopupOffer } from "@/components/admin/popup-offer";
import { AdminProfile } from "@/components/admin/profile";
import { AdminPrescriptions } from "@/components/admin/prescriptions";
import { AdminChat } from "@/components/admin/chat";
import AccountChatPage from "@/pages/account/chat";
import { AdminRolesPermissions } from "@/components/admin/roles-permissions";
import { AdminConsultations } from "@/components/admin/consultations";
import { AdminConsultationSettings } from "@/components/admin/consultation-settings-page";
import { AdminContactInquiries } from "@/components/admin/contact-inquiries";
import { AdminAuditLog } from "@/components/admin/audit-log";
import { AdminDocs } from "@/components/admin/docs";
import { AdminBulkImport } from "@/components/admin/bulk-import";
import { PopupOffer } from "@/components/store/popup-offer";

// Account pages (customer-facing)
import AccountSettingsPage from "@/pages/account/settings";
import AccountDashboard from "@/pages/account/dashboard";
import AccountPrescriptionsPage from "@/pages/account/prescriptions";
import AccountLoginPage from "@/pages/account/login";
import AccountRegisterPage from "@/pages/account/register";
import AccountSupportPage from "@/pages/account/support";
import DashboardPage from "@/pages/dashboard";
import UploadPrescriptionPage from "@/pages/upload-prescription";
import SpeakToADoctorPage from "@/pages/speak-to-a-doctor";
import DoctorPanelPage from "@/pages/doctor/panel";
import { AdminDoctors } from "@/components/admin/doctors";
import { AdminPatientDetail } from "@/components/admin/patient-detail";
import { AdminSupportTickets } from "@/components/admin/support-tickets";
import { AdminLoginPage } from "@/pages/admin/login";

// Policy pages
import PolicyPage from "@/pages/policy";
import AboutPage from "@/pages/about";
import CareersPage from "@/pages/careers";
import CustomPageView from "@/pages/custom-page";

// Store layout wrappers
import { TopBar } from "@/components/store/top-bar";
import { Navbar } from "@/components/store/navbar";
import { Footer } from "@/components/store/footer";

const queryClient = new QueryClient();

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "#3D0814",
    colorForeground: "#1f1115",
    colorMutedForeground: "#6b5a60",
    colorDanger: "#B91C1C",
    colorBackground: "#FFFBF5",
    colorInput: "#ffffff",
    colorInputForeground: "#1f1115",
    colorNeutral: "#F2DCC8",
    fontFamily: "Inter, system-ui, sans-serif",
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox:
      "bg-white rounded-2xl w-[440px] max-w-full overflow-hidden shadow-xl border border-[#F2DCC8]",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-[#3D0814] font-bold",
    headerSubtitle: "text-[#6b5a60]",
    socialButtonsBlockButton:
      "border border-[#F2DCC8] bg-white hover:bg-[#FFF7EE] text-[#3D0814]",
    socialButtonsBlockButtonText: "text-[#3D0814] font-medium",
    formFieldLabel: "text-[#3D0814] font-semibold",
    formFieldInput:
      "bg-white border border-[#F2DCC8] text-[#1f1115] focus:border-[#3D0814]",
    formButtonPrimary:
      "!bg-gradient-to-br !from-[#F97316] !to-[#B91C1C] !text-white hover:opacity-90",
    footerActionLink: "text-[#B91C1C] font-semibold hover:text-[#F97316]",
    footerActionText: "text-[#6b5a60]",
    dividerLine: "bg-[#F2DCC8]",
    dividerText: "text-[#6b5a60]",
  },
};

function TrackOrderHero({ subtitle }: { subtitle?: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden" style={{ minHeight: 220 }}>
      <img
        src="/track-order-banner.jpg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover object-center"
      />
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(135deg, rgba(61,8,20,0.88) 0%, rgba(122,37,53,0.75) 50%, rgba(61,8,20,0.4) 100%)" }}
      />
      <div className="absolute bottom-0 left-0 right-0 h-12" style={{ background: "linear-gradient(to bottom, transparent, #ffffff)" }} />
      <div className="relative z-10 mx-auto max-w-3xl px-4 text-center flex flex-col items-center justify-center" style={{ minHeight: 220 }}>
        <h1 className="font-bold text-3xl lg:text-4xl text-white" style={{ textShadow: "0 2px 12px rgba(0,0,0,0.3)" }}>
          Track My Order
        </h1>
        <p className="mt-2 text-sm max-w-md" style={{ color: "rgba(255,251,245,0.85)" }}>
          {subtitle ?? "Enter your order number or phone number to check your delivery status."}
        </p>
      </div>
    </div>
  );
}

function TrackOrderPage() {
  return (
    <>
      <TopBar />
      <Navbar />
      <main className="min-h-screen bg-white">
        <TrackOrderHero />
        <div className="mx-auto max-w-3xl px-4 py-10 lg:py-14">
          <TrackOrderForm />
        </div>
      </main>
      <Footer />
    </>
  );
}

function TrackOrderByCodePage({ orderNumber }: { orderNumber: string }) {
  return (
    <>
      <TopBar />
      <Navbar />
      <main className="min-h-screen bg-white">
        <TrackOrderHero subtitle={<>Showing status for order <strong className="text-neutral-900">{orderNumber}</strong>.</>} />
        <div className="mx-auto max-w-3xl px-4 py-10 lg:py-14">
          <TrackOrderForm initialOrderNumber={orderNumber} />
        </div>
      </main>
      <Footer />
    </>
  );
}

/**
 * Single source of truth for OAuth round-trips. Google (and any future
 * provider) returns to `/account/sso-callback`, which finalises the Clerk
 * session and forwards the user to their dashboard.
 */
function SsoCallbackPage() {
  return (
    <main
      className="min-h-screen flex items-center justify-center px-4 py-14 bg-white"
      role="status"
      aria-live="polite"
    >
      <div className="text-center">
        <div
          className="mx-auto mb-5 h-12 w-12 rounded-full border-4 border-neutral-200 border-t-[#B91C1C] animate-spin"
          aria-hidden="true"
        />
        <p className="text-sm font-semibold" style={{ color: "#3D0814" }}>
          Finishing sign-in…
        </p>
      </div>
      <AuthenticateWithRedirectCallback
        signInFallbackRedirectUrl={`${basePath}/user`}
        signUpFallbackRedirectUrl={`${basePath}/user`}
      />
    </main>
  );
}

function ProtectedAccount({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const loginTarget = `/account/login?redirect=${encodeURIComponent(location)}`;
  return (
    <>
      <Show when="signed-in">{children}</Show>
      <Show when="signed-out">
        <Redirect to={loginTarget} />
      </Show>
    </>
  );
}

function CustomerMirror() {
  useCustomerMirror();
  return null;
}

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [location]);
  return null;
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/">{() => <LandingPage />}</Route>
      <Route path="/shop">{() => <ShopPage />}</Route>
      <Route path="/shop/:collection">
        {(params) => <CollectionPage collection={params.collection} />}
      </Route>
      <Route path="/product/:slug">
        {(params) => <ProductDetailPage slug={params.slug} />}
      </Route>
      <Route path="/checkout" component={CheckoutPage} />
      <Route path="/wishlist" component={WishlistPage} />
      <Route path="/blogs" component={BlogsPage} />
      <Route path="/blogs/:slug">
        {(params) => <BlogDetailPage slug={params.slug} />}
      </Route>
      <Route path="/search">{() => <SearchPage />}</Route>
      <Route path="/care-packs" component={CarePacksPage} />
      <Route path="/faq" component={FaqPage} />
      <Route path="/contact" component={ContactPage} />
      <Route path="/delivery" component={DeliveryPage} />
      <Route path="/services" component={ServicesPage} />
      <Route path="/track-order" component={TrackOrderPage} />
      <Route path="/track-order/:orderNumber">
        {(params) => <TrackOrderByCodePage orderNumber={params.orderNumber} />}
      </Route>
      <Route path="/who-we-are">{() => <AboutPage />}</Route>
      <Route path="/about">{() => <AboutPage />}</Route>
      <Route path="/careers">{() => <CareersPage />}</Route>
      <Route path="/career">{() => <CareersPage />}</Route>
      <Route path="/privacy-policy">
        {() => <PolicyPage slug="privacy-policy" />}
      </Route>
      <Route path="/terms-of-service">
        {() => <PolicyPage slug="terms-of-service" />}
      </Route>
      <Route path="/payments-policy">
        {() => <PolicyPage slug="payments-policy" />}
      </Route>
      <Route path="/refund-policy">
        {() => <PolicyPage slug="refund-policy" />}
      </Route>
      <Route path="/pages/:slug" component={CustomPageView} />
      <Route path="/policies/:slug">
        {(params) => <PolicyPage slug={params.slug} />}
      </Route>
      {/* Customer auth — single source of truth */}
      <Route path="/account/login" component={AccountLoginPage} />
      <Route path="/account/register" component={AccountRegisterPage} />
      <Route path="/account/sso-callback" component={SsoCallbackPage} />
      {/* Legacy aliases → forward to the canonical pages */}
      <Route path="/sign-in/sso-callback" component={SsoCallbackPage} />
      <Route path="/sign-up/sso-callback" component={SsoCallbackPage} />
      <Route path="/sign-in/*?">{() => <Redirect to="/account/login" />}</Route>
      <Route path="/sign-up/*?">{() => <Redirect to="/account/register" />}</Route>
      <Route path="/account/verify-phone">{() => <Redirect to="/account/login" />}</Route>
      <Route path="/account/email-verified">{() => <Redirect to="/account/login" />}</Route>
      {/* Account (signed-in only — guests must sign in to view orders) */}
      <Route path="/account/settings">
        {() => <ProtectedAccount><AccountSettingsPage /></ProtectedAccount>}
      </Route>
      <Route path="/account">
        {() => <ProtectedAccount><AccountDashboard /></ProtectedAccount>}
      </Route>
      <Route path="/account/dashboard">
        {() => <ProtectedAccount><AccountDashboard /></ProtectedAccount>}
      </Route>
      <Route path="/account/prescriptions">
        {() => <ProtectedAccount><AccountPrescriptionsPage /></ProtectedAccount>}
      </Route>
      <Route path="/dashboard">
        {() => <ProtectedAccount><DashboardPage /></ProtectedAccount>}
      </Route>
      <Route path="/user">
        {() => <ProtectedAccount><DashboardPage /></ProtectedAccount>}
      </Route>
      <Route path="/upload-prescription">
        {() => <ProtectedAccount><UploadPrescriptionPage /></ProtectedAccount>}
      </Route>
      <Route path="/speak-to-a-doctor" component={SpeakToADoctorPage} />
      <Route path="/doctor" component={DoctorPanelPage} />
      <Route path="/account/support" component={AccountSupportPage} />
      {/* Admin login — public, no AdminShell wrapper */}
      <Route path="/admin/login" component={AdminLoginPage} />
      {/* Admin */}
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin/analytics" component={AdminAnalytics} />
      <Route path="/admin/banners" component={AdminBanners} />
      <Route path="/admin/blogs" component={AdminBlogs} />
      <Route path="/admin/categories" component={AdminCategories} />
      <Route path="/admin/delivery-locations" component={AdminDelivery} />
      <Route path="/admin/newsletter" component={AdminNewsletter} />
      <Route path="/admin/orders" component={AdminOrders} />
      <Route path="/admin/payments">{() => <AdminPayments />}</Route>
      <Route path="/admin/policies" component={AdminPolicies} />
      <Route path="/admin/products" component={AdminProducts} />
      <Route path="/admin/sourcing" component={AdminSourcing} />
      <Route path="/admin/sourcing/inventory"   component={AdminSourcingInventory} />
      <Route path="/admin/sourcing/forecast"    component={AdminSourcingForecast} />
      <Route path="/admin/sourcing/pricing"     component={AdminSourcingPricing} />
      <Route path="/admin/sourcing/automation"  component={AdminSourcingAutomation} />
      <Route path="/admin/sourcing/performance" component={AdminSourcingPerformance} />
      <Route path="/admin/trading"               component={AdminTrading} />
      <Route path="/admin/trading/bids"          component={AdminTradingBids} />
      <Route path="/admin/trading/negotiation"   component={AdminTradingNegotiation} />
      <Route path="/admin/trading/settlements"   component={AdminTradingSettlements} />
      <Route path="/admin/qa"                    component={AdminQa} />
      <Route path="/admin/qa/batches"            component={AdminQaBatches} />
      <Route path="/admin/qa/trust-seal"         component={AdminQaTrustSeal} />
      <Route path="/admin/qa/recalls"            component={AdminQaRecalls} />
      <Route path="/admin/logistics"             component={AdminLogistics} />
      <Route path="/admin/logistics/inventory"   component={AdminLogisticsInventory} />
      <Route path="/admin/logistics/lead-time"   component={AdminLogisticsLeadTime} />
      <Route path="/admin/logistics/fallback"    component={AdminLogisticsFallback} />
      <Route path="/admin/integrations/templates" component={AdminMessageTemplates} />
      <Route path="/admin/integrations/outbox" component={AdminMessageOutbox} />
      <Route path="/admin/campaigns"            component={AdminCampaignsOverview} />
      <Route path="/admin/campaigns/email"      component={AdminCampaignsEmail} />
      <Route path="/admin/campaigns/sms"        component={AdminCampaignsSms} />
      <Route path="/admin/campaigns/audiences"  component={AdminCampaignsAudiences} />
      <Route path="/admin/campaigns/pipelines"  component={AdminCampaignsPipelines} />
      <Route path="/admin/campaigns/queue"      component={AdminCampaignsQueue} />
      <Route path="/admin/campaigns/settings"   component={AdminCampaignsSettings} />
      {/* <Route path="/admin/pos" component={AdminPos} /> hidden until client requests POS module */}
      <Route path="/admin/settings" component={AdminSettings} />
      <Route path="/admin/users" component={UsersManagement} />
      <Route path="/admin/customers" component={AdminCustomers} />
      <Route path="/admin/consultation-settings" component={AdminConsultationSettings} />
      <Route path="/admin/announcement" component={AdminAnnouncementBar} />
      <Route path="/admin/pages" component={AdminCustomPages} />
      <Route path="/admin/footer" component={AdminFooterCms} />
      <Route path="/admin/website-settings" component={AdminWebsiteSettings} />
      <Route path="/admin/integrations" component={AdminIntegrations} />
      <Route path="/admin/popup-offer" component={AdminPopupOffer} />
      <Route path="/admin/profile" component={AdminProfile} />
      <Route path="/admin/prescriptions" component={AdminPrescriptions} />
      <Route path="/admin/chat" component={AdminChat} />
      <Route path="/account/chat">
        {() => <ProtectedAccount><AccountChatPage /></ProtectedAccount>}
      </Route>
      <Route path="/admin/roles" component={AdminRolesPermissions} />
      <Route path="/admin/audit-log" component={AdminAuditLog} />
      <Route path="/admin/docs" component={AdminDocs} />
      <Route path="/admin/bulk-import" component={AdminBulkImport} />
      <Route path="/admin/consultations" component={AdminConsultations} />
      <Route path="/admin/inquiries" component={AdminContactInquiries} />
      <Route path="/admin/doctors" component={AdminDoctors} />
      <Route path="/admin/patients/:id" component={AdminPatientDetail} />
      <Route path="/admin/support" component={AdminSupportTickets} />
      <Route path="/admin/support/:id" component={AdminSupportTickets} />
      {/* Partner management (admin) */}
      <Route path="/admin/suppliers" component={AdminSuppliers} />
      <Route path="/admin/clinics" component={AdminClinics} />
      <Route path="/admin/logistics-partners" component={AdminLogisticsPartners} />
      {/* Partner portals — standalone, no Clerk requirement */}
      <Route path="/portal/supplier" component={SupplierPortal} />
      <Route path="/portal/clinic" component={ClinicPortal} />
      <Route path="/portal/logistics" component={LogisticsPortal} />
      <Route component={NotFound} />
    </Switch>
  );
}

function GlobalOverlays() {
  return (
    <>
      <PopupOffer />
      <BackToTop />
    </>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/account/login`}
      signUpUrl={`${basePath}/account/register`}
      localization={{
        signIn: {
          start: {
            title: "Welcome back to Shaniid RX",
            subtitle: "Sign in to track orders and manage your prescriptions",
          },
        },
        signUp: {
          start: {
            title: "Create your Shaniid RX account",
            subtitle: "Genuine medicine, fair pricing, delivered with integrity",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <CustomerMirror />
        <ScrollToTop />
        <WishlistProvider>
          <CartProvider>
            <ErrorBoundary scope="routes">
              <Router />
            </ErrorBoundary>
            <GlobalOverlays />
            <PageViewTracker />
          </CartProvider>
        </WishlistProvider>
        <Toaster position="top-right" richColors closeButton />
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
