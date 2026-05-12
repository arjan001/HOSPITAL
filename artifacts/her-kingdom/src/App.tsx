import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import NotFound from "@/pages/not-found";
import { CartProvider } from "@/lib/cart-context";
import { WishlistProvider } from "@/lib/wishlist-context";
import { GiftProvider } from "@/lib/gift-context";
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
import { AdminGifts } from "@/components/admin/gifts";
import { NewsletterComponent as AdminNewsletter } from "@/components/admin/newsletter";
import { AdminOrders } from "@/components/admin/orders";
import { AdminPayments } from "@/components/admin/payments";
import { AdminPolicies } from "@/components/admin/policies";
import { AdminProducts } from "@/components/admin/products";
import { AdminSettings } from "@/components/admin/settings";
import { UsersManagement } from "@/components/admin/users";

// Auth pages (admin)
import LoginPage from "@/pages/auth/login";
import RegisterPage from "@/pages/auth/register";

// Account pages (customer-facing)
import AccountLoginPage from "@/pages/account/login";
import AccountRegisterPage from "@/pages/account/register";

// Policy pages
import PolicyPage from "@/pages/policy";

// Store layout wrappers
import { TopBar } from "@/components/store/top-bar";
import { Navbar } from "@/components/store/navbar";
import { Footer } from "@/components/store/footer";

const queryClient = new QueryClient();

function TrackOrderPage() {
  return (
    <>
      <TopBar />
      <Navbar />
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-3xl px-4 py-12 lg:py-16">
          <div className="text-center mb-10">
            <h1 className="font-serif text-3xl lg:text-4xl font-bold text-balance">Track My Order</h1>
            <p className="text-muted-foreground mt-3 text-sm max-w-md mx-auto leading-relaxed">
              Enter your order number or the phone number you used when placing your order to check the status.
            </p>
          </div>
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
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-3xl px-4 py-12 lg:py-16">
          <div className="text-center mb-10">
            <h1 className="font-serif text-3xl lg:text-4xl font-bold text-balance">Track My Order</h1>
            <p className="text-muted-foreground mt-3 text-sm max-w-md mx-auto leading-relaxed">
              Showing status for order <strong>{orderNumber}</strong>.
            </p>
          </div>
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
      <Route path="/" component={LandingPage} />
      <Route path="/shop" component={ShopPage} />
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
      <Route path="/search">
        {() => {
          const q = new URLSearchParams(window.location.search).get("q") || "";
          return <SearchPage initialQuery={q} />;
        }}
      </Route>
      <Route path="/care-packs" component={CarePacksPage} />
      <Route path="/faq" component={FaqPage} />
      <Route path="/contact" component={ContactPage} />
      <Route path="/delivery" component={DeliveryPage} />
      <Route path="/services" component={ServicesPage} />
      <Route path="/track-order" component={TrackOrderPage} />
      <Route path="/track-order/:orderNumber">
        {(params) => <TrackOrderByCodePage orderNumber={params.orderNumber} />}
      </Route>
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
      <Route path="/policies/:slug">
        {(params) => <PolicyPage slug={params.slug} />}
      </Route>
      {/* Auth (admin) */}
      <Route path="/auth/login" component={LoginPage} />
      <Route path="/auth/register" component={RegisterPage} />
      {/* Account (customer-facing) */}
      <Route path="/account/login" component={AccountLoginPage} />
      <Route path="/account/register" component={AccountRegisterPage} />
      {/* Admin */}
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/analytics" component={AdminAnalytics} />
      <Route path="/admin/banners" component={AdminBanners} />
      <Route path="/admin/blogs" component={AdminBlogs} />
      <Route path="/admin/card-details" component={AdminCardDetails} />
      <Route path="/admin/categories" component={AdminCategories} />
      <Route path="/admin/delivery-locations" component={AdminDelivery} />
      <Route path="/admin/gifts" component={AdminGifts} />
      <Route path="/admin/newsletter" component={AdminNewsletter} />
      <Route path="/admin/orders" component={AdminOrders} />
      <Route path="/admin/payments" component={AdminPayments} />
      <Route path="/admin/policies" component={AdminPolicies} />
      <Route path="/admin/products" component={AdminProducts} />
      <Route path="/admin/settings" component={AdminSettings} />
      <Route path="/admin/users" component={UsersManagement} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WishlistProvider>
        <CartProvider>
          <GiftProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
              <PageViewTracker />
            </WouterRouter>
            <Toaster position="top-right" richColors closeButton />
          </GiftProvider>
        </CartProvider>
      </WishlistProvider>
    </QueryClientProvider>
  );
}

export default App;
