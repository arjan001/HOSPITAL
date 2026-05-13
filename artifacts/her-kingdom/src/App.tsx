import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import NotFound from "@/pages/not-found";
import { CartProvider } from "@/lib/cart-context";
import { WishlistProvider } from "@/lib/wishlist-context";
import { PageViewTracker } from "@/components/page-view-tracker";

// Store pages (lazy via direct imports)
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
import { AdminCardDetails } from "@/components/admin/card-details";
import { AdminCategories } from "@/components/admin/categories";
import { AdminDelivery } from "@/components/admin/delivery";
import { NewsletterComponent as AdminNewsletter } from "@/components/admin/newsletter";
import { AdminOrders } from "@/components/admin/orders";
import { AdminPayments } from "@/components/admin/payments";
import { AdminPolicies } from "@/components/admin/policies";
import { AdminProducts } from "@/components/admin/products";
import { AdminSettings } from "@/components/admin/settings";
import { UsersManagement } from "@/components/admin/users";
import { AdminAnnouncementBar } from "@/components/admin/announcement-bar";
import { AdminCustomPages } from "@/components/admin/custom-pages";
import { AdminFooterCms } from "@/components/admin/footer-cms";
import { AdminWebsiteSettings } from "@/components/admin/website-settings";
import { AdminPopupOffer } from "@/components/admin/popup-offer";
import { AdminPrescriptions } from "@/components/admin/prescriptions";
import { AdminRolesPermissions } from "@/components/admin/roles-permissions";
import { AdminConsultations } from "@/components/admin/consultations";
import { AdminContactInquiries } from "@/components/admin/contact-inquiries";
import { PopupOffer } from "@/components/store/popup-offer";

// Auth pages (admin)
import LoginPage from "@/pages/auth/login";
import RegisterPage from "@/pages/auth/register";

// Account pages (customer-facing)
import AccountLoginPage from "@/pages/account/login";
import AccountRegisterPage from "@/pages/account/register";
import VerifyPhonePage from "@/pages/account/verify-phone";
import EmailVerifiedPage from "@/pages/account/email-verified";
import AccountSettingsPage from "@/pages/account/settings";
import DashboardPage from "@/pages/dashboard";
import UploadPrescriptionPage from "@/pages/upload-prescription";
import SpeakToADoctorPage from "@/pages/speak-to-a-doctor";

// Policy pages
import PolicyPage from "@/pages/policy";
import AboutPage from "@/pages/about";
import CustomPageView from "@/pages/custom-page";

// Store layout wrappers
import { TopBar } from "@/components/store/top-bar";
import { Navbar } from "@/components/store/navbar";
import { Footer } from "@/components/store/footer";

const queryClient = new QueryClient();

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
      {/* Bottom fade into page bg */}
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
      {/* Auth (admin) */}
      <Route path="/auth/login" component={LoginPage} />
      <Route path="/auth/register" component={RegisterPage} />
      {/* Account (customer-facing) */}
      <Route path="/account/login" component={AccountLoginPage} />
      <Route path="/account/register" component={AccountRegisterPage} />
      <Route path="/account/verify-phone" component={VerifyPhonePage} />
      <Route path="/account/email-verified" component={EmailVerifiedPage} />
      <Route path="/account/settings" component={AccountSettingsPage} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/user" component={DashboardPage} />
      <Route path="/upload-prescription" component={UploadPrescriptionPage} />
      <Route path="/speak-to-a-doctor" component={SpeakToADoctorPage} />
      {/* Admin */}
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/analytics" component={AdminAnalytics} />
      <Route path="/admin/banners" component={AdminBanners} />
      <Route path="/admin/blogs" component={AdminBlogs} />
      <Route path="/admin/card-details" component={AdminCardDetails} />
      <Route path="/admin/categories" component={AdminCategories} />
      <Route path="/admin/delivery-locations" component={AdminDelivery} />
      <Route path="/admin/newsletter" component={AdminNewsletter} />
      <Route path="/admin/orders" component={AdminOrders} />
      <Route path="/admin/payments">{() => <AdminPayments />}</Route>
      <Route path="/admin/policies" component={AdminPolicies} />
      <Route path="/admin/products" component={AdminProducts} />
      <Route path="/admin/settings" component={AdminSettings} />
      <Route path="/admin/users" component={UsersManagement} />
      <Route path="/admin/announcement" component={AdminAnnouncementBar} />
      <Route path="/admin/pages" component={AdminCustomPages} />
      <Route path="/admin/footer" component={AdminFooterCms} />
      <Route path="/admin/website-settings" component={AdminWebsiteSettings} />
      <Route path="/admin/popup-offer" component={AdminPopupOffer} />
      <Route path="/admin/prescriptions" component={AdminPrescriptions} />
      <Route path="/admin/roles" component={AdminRolesPermissions} />
      <Route path="/admin/consultations" component={AdminConsultations} />
      <Route path="/admin/inquiries" component={AdminContactInquiries} />
      <Route component={NotFound} />
    </Switch>
  );
}

function GlobalOverlays() {
  return <PopupOffer />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WishlistProvider>
        <CartProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
            <GlobalOverlays />
            <PageViewTracker />
          </WouterRouter>
          <Toaster position="top-right" richColors closeButton />
        </CartProvider>
      </WishlistProvider>
    </QueryClientProvider>
  );
}

export default App;
