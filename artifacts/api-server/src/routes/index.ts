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
import adminBlogsRouter from "./api/admin/blogs.js";
import adminGiftItemsRouter from "./api/admin/gift-items.js";
import adminDeliveryRouter from "./api/admin/delivery.js";
import adminNewsletterRouter from "./api/admin/newsletter.js";
import adminSettingsRouter from "./api/admin/settings.js";
import adminPoliciesRouter from "./api/admin/policies.js";
import adminAnalyticsRouter from "./api/admin/analytics.js";
import adminUsersRouter from "./api/admin/users.js";
import authRouter from "./api/auth.js";
import payheroRouter from "./api/payments/payhero.js";
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
router.use("/admin/blogs", adminBlogsRouter);
router.use("/admin/gift-items", adminGiftItemsRouter);
router.use("/admin/delivery", adminDeliveryRouter);
router.use("/admin/newsletter", adminNewsletterRouter);
router.use("/admin/settings", adminSettingsRouter);
router.use("/admin/policies", adminPoliciesRouter);
router.use("/admin/analytics", adminAnalyticsRouter);
router.use("/admin/users", adminUsersRouter);
router.use("/auth", authRouter);
router.use("/payments/payhero", payheroRouter);
router.use("/video", videoDailyRouter);

export default router;
