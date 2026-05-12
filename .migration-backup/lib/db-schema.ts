/**
 * DATABASE SCHEMA for Classy Collections
 * Database name: classy_collections
 *
 * This file documents the full database schema needed to power
 * both the storefront and admin panel. All tables, columns,
 * types, and relationships are defined here.
 */

// ─── TABLES ──────────────────────────────────────────────

/**
 * 1. categories
 * Stores product categories (e.g. Straight Leg Jeans, Skinny Jeans, etc.)
 */
export interface DBCategory {
  id: string           // uuid, primary key
  name: string         // varchar(255), NOT NULL
  slug: string         // varchar(255), UNIQUE, NOT NULL
  image_url: string    // text, nullable
  description: string  // text, nullable
  sort_order: number   // integer, default 0
  is_active: boolean   // boolean, default true
  created_at: string   // timestamptz, default now()
  updated_at: string   // timestamptz, default now()
}

/**
 * 2. tags
 * Reusable tags for product filtering (e.g. "thrift", "new-arrival", "street")
 */
export interface DBTag {
  id: string           // uuid, primary key
  name: string         // varchar(100), UNIQUE, NOT NULL
  slug: string         // varchar(100), UNIQUE, NOT NULL
  created_at: string   // timestamptz, default now()
}

/**
 * 3. products
 * Core product table
 */
export interface DBProduct {
  id: string                // uuid, primary key
  name: string              // varchar(255), NOT NULL
  slug: string              // varchar(255), UNIQUE, NOT NULL
  description: string       // text, nullable
  price: number             // numeric(10,2), NOT NULL
  original_price: number | null // numeric(10,2), nullable (for showing cut price)
  category_id: string       // uuid, FK -> categories.id, NOT NULL
  is_new: boolean           // boolean, default false
  is_on_offer: boolean      // boolean, default false
  offer_percentage: number | null // integer, nullable
  in_stock: boolean         // boolean, default true
  featured: boolean         // boolean, default false
  created_at: string        // timestamptz, default now()
  updated_at: string        // timestamptz, default now()
}

/**
 * 4. product_images
 * Multiple images per product (supports admin multi-image upload)
 */
export interface DBProductImage {
  id: string           // uuid, primary key
  product_id: string   // uuid, FK -> products.id, ON DELETE CASCADE
  image_url: string    // text, NOT NULL
  alt_text: string     // varchar(255), nullable
  sort_order: number   // integer, default 0
  is_primary: boolean  // boolean, default false
  created_at: string   // timestamptz, default now()
}

/**
 * 5. product_variations
 * Size, Color, Wash, Distress Level etc.
 */
export interface DBProductVariation {
  id: string           // uuid, primary key
  product_id: string   // uuid, FK -> products.id, ON DELETE CASCADE
  type: string         // varchar(100), NOT NULL (e.g. "Size", "Wash", "Color")
  options: string[]    // text[] (Postgres array) or JSON, NOT NULL
  created_at: string   // timestamptz, default now()
}

/**
 * 6. product_tags (junction table)
 * Many-to-many: products <-> tags
 */
export interface DBProductTag {
  product_id: string   // uuid, FK -> products.id, ON DELETE CASCADE
  tag_id: string       // uuid, FK -> tags.id, ON DELETE CASCADE
  // composite primary key (product_id, tag_id)
}

/**
 * 7. orders
 * Customer orders (created via WhatsApp checkout flow)
 */
export interface DBOrder {
  id: string                 // uuid, primary key
  order_no: string           // varchar(20), UNIQUE, NOT NULL (e.g. "KF-001")
  customer_name: string      // varchar(255), NOT NULL
  customer_phone: string     // varchar(20), NOT NULL
  customer_email: string     // varchar(255), nullable
  delivery_location_id: string // uuid, FK -> delivery_locations.id, nullable
  delivery_address: string   // text, NOT NULL
  order_notes: string        // text, nullable
  subtotal: number           // numeric(10,2), NOT NULL
  delivery_fee: number       // numeric(10,2), default 0
  total: number              // numeric(10,2), NOT NULL
  status: OrderStatus        // varchar(20), default 'pending'
  created_at: string         // timestamptz, default now()
  updated_at: string         // timestamptz, default now()
}

export type OrderStatus = "pending" | "confirmed" | "dispatched" | "delivered" | "cancelled"

/**
 * 8. order_items
 * Line items for each order
 */
export interface DBOrderItem {
  id: string              // uuid, primary key
  order_id: string        // uuid, FK -> orders.id, ON DELETE CASCADE
  product_id: string      // uuid, FK -> products.id
  product_name: string    // varchar(255), NOT NULL (snapshot, in case product changes)
  product_price: number   // numeric(10,2), NOT NULL (snapshot)
  quantity: number        // integer, NOT NULL
  selected_variations: Record<string, string> | null // jsonb, nullable
  created_at: string      // timestamptz, default now()
}

/**
 * 9. delivery_locations
 * Delivery zones with fees
 */
export interface DBDeliveryLocation {
  id: string              // uuid, primary key
  name: string            // varchar(255), NOT NULL
  fee: number             // numeric(10,2), NOT NULL
  estimated_days: string  // varchar(100), NOT NULL
  is_active: boolean      // boolean, default true
  sort_order: number      // integer, default 0
  created_at: string      // timestamptz, default now()
  updated_at: string      // timestamptz, default now()
}

/**
 * 10. banners
 * Homepage hero banners and mid-page banners
 */
export interface DBBanner {
  id: string              // uuid, primary key
  title: string           // varchar(255), NOT NULL
  subtitle: string        // varchar(255), nullable
  image_url: string       // text, NOT NULL
  link: string            // varchar(255), nullable
  position: "hero" | "mid-page" // varchar(20), NOT NULL
  is_active: boolean      // boolean, default true
  sort_order: number      // integer, default 0
  created_at: string      // timestamptz, default now()
  updated_at: string      // timestamptz, default now()
}

/**
 * 11. navbar_offers
 * Running text offers in the top announcement bar
 */
export interface DBNavbarOffer {
  id: string              // uuid, primary key
  text: string            // text, NOT NULL
  is_active: boolean      // boolean, default true
  sort_order: number      // integer, default 0
  created_at: string      // timestamptz, default now()
}

/**
 * 12. popup_offers
 * Popup modal offers that appear on first visit
 */
export interface DBPopupOffer {
  id: string              // uuid, primary key
  title: string           // varchar(255), NOT NULL
  description: string     // text, nullable
  discount_label: string  // varchar(100), NOT NULL (e.g. "30% OFF")
  image_url: string       // text, nullable
  link: string            // varchar(255), nullable
  valid_until: string     // date, nullable
  is_active: boolean      // boolean, default true
  created_at: string      // timestamptz, default now()
  updated_at: string      // timestamptz, default now()
}

/**
 * 13. site_settings
 * Key-value store for all admin settings (SEO, theme, footer, store config)
 * Uses a single-row or key-value pattern.
 */
export interface DBSiteSettings {
  id: string              // uuid, primary key (single row, or use key-value)
  // --- Store ---
  store_name: string               // varchar(255)
  store_email: string              // varchar(255)
  store_phone: string              // varchar(50)
  whatsapp_number: string          // varchar(20)
  currency_symbol: string          // varchar(10), default 'KSh'
  free_shipping_threshold: number  // numeric(10,2), default 5000
  order_prefix: string             // varchar(10), default 'KF'
  enable_whatsapp_checkout: boolean // boolean, default true
  enable_quick_checkout: boolean    // boolean, default true
  maintenance_mode: boolean         // boolean, default false

  // --- SEO ---
  site_title: string               // varchar(255)
  site_description: string         // text
  meta_keywords: string            // text
  canonical_url: string            // varchar(500)
  og_image_url: string             // text, nullable
  google_analytics_id: string      // varchar(50), nullable
  facebook_pixel_id: string        // varchar(50), nullable
  robots_txt: string               // text

  // --- Theme ---
  primary_color: string            // varchar(20), default '#0a0a0a'
  accent_color: string             // varchar(20), default '#fafafa'
  font_heading: string             // varchar(100), default 'Playfair Display'
  font_body: string                // varchar(100), default 'Inter'
  logo_text: string                // varchar(255)
  logo_image_url: string           // text, nullable
  favicon_url: string              // text, nullable
  show_recent_purchase: boolean    // boolean, default true
  show_offer_modal: boolean        // boolean, default true
  show_newsletter: boolean         // boolean, default true

  // --- Footer ---
  footer_description: string       // text
  footer_address: string           // text
  footer_phone: string             // varchar(50)
  footer_email: string             // varchar(255)
  footer_whatsapp: string          // varchar(20)
  footer_instagram: string         // varchar(500), nullable
  footer_tiktok: string            // varchar(500), nullable
  footer_twitter: string           // varchar(500), nullable
  footer_open_hours: string        // varchar(255)
  footer_dispatch_days: string     // varchar(255)
  copyright_text: string           // varchar(255)
  show_privacy_policy: boolean     // boolean, default true
  show_terms: boolean              // boolean, default true
  show_refund_policy: boolean      // boolean, default true

  updated_at: string               // timestamptz, default now()
}

/**
 * 14. newsletter_subscribers
 * Email subscribers from the homepage newsletter form
 */
export interface DBNewsletterSubscriber {
  id: string              // uuid, primary key
  email: string           // varchar(255), UNIQUE, NOT NULL
  subscribed_at: string   // timestamptz, default now()
  is_active: boolean      // boolean, default true
}

/**
 * 15. analytics_events (optional, for custom tracking)
 * Tracks page views, add-to-cart, purchases etc.
 */
export interface DBAnalyticsEvent {
  id: string              // uuid, primary key
  event_type: string      // varchar(50), NOT NULL (page_view, add_to_cart, purchase, etc.)
  event_data: Record<string, unknown> // jsonb, nullable
  product_id: string | null // uuid, FK -> products.id, nullable
  session_id: string      // varchar(100), nullable
  ip_address: string      // varchar(45), nullable
  user_agent: string      // text, nullable
  created_at: string      // timestamptz, default now()
}

/**
 * 16. admin_users
 * Admin panel authentication
 */
export interface DBAdminUser {
  id: string              // uuid, primary key
  email: string           // varchar(255), UNIQUE, NOT NULL
  password_hash: string   // text, NOT NULL (bcrypt)
  name: string            // varchar(255), NOT NULL
  role: "super_admin" | "admin" | "editor" // varchar(20), default 'admin'
  last_login_at: string   // timestamptz, nullable
  created_at: string      // timestamptz, default now()
  updated_at: string      // timestamptz, default now()
}

// ─── RELATIONSHIPS SUMMARY ──────────────────────────────
//
// products.category_id        -> categories.id
// product_images.product_id   -> products.id (CASCADE)
// product_variations.product_id -> products.id (CASCADE)
// product_tags.product_id     -> products.id (CASCADE)
// product_tags.tag_id         -> tags.id (CASCADE)
// orders.delivery_location_id -> delivery_locations.id
// order_items.order_id        -> orders.id (CASCADE)
// order_items.product_id      -> products.id
//
// ─── INDEXES ─────────────────────────────────────────────
//
// products: slug (UNIQUE), category_id, is_on_offer, is_new, created_at
// categories: slug (UNIQUE)
// tags: slug (UNIQUE)
// orders: order_no (UNIQUE), status, created_at
// order_items: order_id
// product_images: product_id, sort_order
// product_tags: (product_id, tag_id) composite PK
// newsletter_subscribers: email (UNIQUE)
// analytics_events: event_type, created_at, product_id
// admin_users: email (UNIQUE)
