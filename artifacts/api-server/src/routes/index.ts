/**
 * api-server root router.
 *
 * Mounts every sub-router under the `/api` prefix that app.ts already
 * establishes. Grouped into:
 *
 *   Public routes  — no auth, consumed by the React storefront
 *   Admin routes   — gated by requireAdmin in each sub-router
 *   Auth / video   — Clerk helpers, Daily.co video
 *
 * Payments: M-Pesa is handled entirely by the NestJS api-nest service
 * at /api/v2/payments/paystack. There are no payment routes here.
 *
 * Adding a new route:
 *   1. Create `src/routes/api/<feature>.ts` exporting an Express Router.
 *   2. Import it here and add `router.use("/<feature>", featureRouter)`.
 *   3. Document the endpoint in `docs/API_DOCUMENTATION.md`.
 *
 * Strangler note:
 *   When a route is ported to api-nest (/api/v2), remove it from here and
 *   drop the corresponding file. Don't leave dead routers in this file.
 */
import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import productsRouter from "./api/products.js";
import categoriesRouter from "./api/categories.js";
import heroBannersRouter from "./api/hero-banners.js";
import deliveryLocationsRouter from "./api/delivery-locations.js";
import siteDataRouter from "./api/site-data.js";
import ordersRouter from "./api/orders.js";
import trackOrderRouter from "./api/track-order.js";
import newsletterRouter from "./api/newsletter.js";
import giftItemsRouter from "./api/gift-items.js";
import blogsRouter from "./api/blogs.js";
import policiesRouter from "./api/policies.js";
import uploadRouter from "./api/upload.js";
import trackViewRouter from "./api/track-view.js";
import trackEventRouter from "./api/track-event.js";
import trackAbandonedRouter from "./api/track-abandoned.js";

import adminOrdersRouter from "./api/admin/orders.js";
import adminProductsRouter from "./api/admin/products.js";
import adminCategoriesRouter from "./api/admin/categories.js";
import adminBannersRouter from "./api/admin/banners.js";
import adminHeroBannersRouter from "./api/admin/hero-banners.js";
import adminGiftItemsRouter from "./api/admin/gift-items.js";
import adminAnalyticsRouter from "./api/admin/analytics.js";
import authRouter from "./api/auth.js";
import videoDailyRouter from "./api/video/daily.js";

const router: IRouter = Router();

router.use(healthRouter);

// Public routes
router.use("/products", productsRouter);
router.use("/categories", categoriesRouter);
router.use("/hero-banners", heroBannersRouter);
router.use("/delivery-locations", deliveryLocationsRouter);
router.use("/site-data", siteDataRouter);
router.use("/orders", ordersRouter);
router.use("/track-order", trackOrderRouter);
router.use("/newsletter", newsletterRouter);
router.use("/gift-items", giftItemsRouter);
router.use("/blogs", blogsRouter);
router.use("/policies", policiesRouter);
router.use("/upload", uploadRouter);
router.use("/track-view", trackViewRouter);
router.use("/track-event", trackEventRouter);
router.use("/track-abandoned", trackAbandonedRouter);

// Admin routes
router.use("/admin/orders", adminOrdersRouter);
router.use("/admin/products", adminProductsRouter);
router.use("/admin/categories", adminCategoriesRouter);
router.use("/admin/banners", adminBannersRouter);
router.use("/admin/hero-banners", adminHeroBannersRouter);
router.use("/admin/gift-items", adminGiftItemsRouter);
router.use("/admin/analytics", adminAnalyticsRouter);
router.use("/auth", authRouter);
router.use("/video", videoDailyRouter);

export default router;
