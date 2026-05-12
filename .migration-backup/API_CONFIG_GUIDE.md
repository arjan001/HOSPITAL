# API Configuration Guide - Ankara Fashion Store

## Current Status: Frontend Standalone Mode

The frontend has been themed for Ankara fashion. Backend and frontend APIs are currently **disconnected** to focus on UI improvements. When you're ready to reconnect, follow this guide.

## Environment Variables Needed

### Supabase Configuration
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_URL=your_supabase_url
POSTGRES_URL=your_postgres_url
POSTGRES_PRISMA_URL=your_postgres_prisma_url
POSTGRES_URL_NON_POOLING=your_postgres_url_non_pooling
POSTGRES_USER=your_db_user
POSTGRES_PASSWORD=your_db_password
POSTGRES_DATABASE=your_db_name
POSTGRES_HOST=your_db_host
SUPABASE_JWT_SECRET=your_jwt_secret
SUPABASE_ANON_KEY=your_anon_key
```

### Email Configuration (Optional - for newsletters)
```
SMTP_HOST=your_smtp_host
SMTP_PORT=your_smtp_port
SMTP_USER=your_email
SMTP_PASSWORD=your_email_password
```

### Payment Integration (Optional - for M-PESA via PayHero)
```
# Option A: supply the pre-computed Basic auth token
PAYHERO_BASIC_AUTH_TOKEN=your_payhero_basic_auth_token

# Option B (alternative to the token): username + password
PAYHERO_API_USERNAME=your_payhero_api_username
PAYHERO_API_PASSWORD=your_payhero_api_password

PAYHERO_CHANNEL_ID=your_payment_channel_id
PAYHERO_WALLET_ID=your_wallet_channel_id
# Optional — auto-derived from NEXT_PUBLIC_SITE_URL / Netlify URL when blank.
# Only set to override, e.g. https://herkingdom.shop/api/payments/payhero/callback
PAYHERO_CALLBACK_URL=https://your-site.netlify.app/api/payments/payhero/callback
```

### Analytics (Optional)
```
GOOGLE_ANALYTICS_ID=your_ga_id
FACEBOOK_PIXEL_ID=your_fb_pixel
```

## Reconnecting Frontend to Backend

### Step 1: Set Environment Variables
Add all required Supabase URLs and API keys to your `.env.local` file (for local development) or Vercel environment variables.

### Step 2: Test Database Connection
The database schema is already created in Supabase. Verify by:
1. Going to Supabase dashboard
2. Check that all 16 tables are present
3. Verify seed data exists in categories and site_settings

### Step 3: API Routes Ready
All API routes are pre-built:
```
POST/GET  /api/categories
POST/GET  /api/products
POST/GET  /api/orders
POST/GET  /api/delivery-locations
POST/GET  /api/banners
POST/GET  /api/newsletter
GET       /api/admin/* (requires auth)
```

### Step 4: Admin Panel Setup
1. Create admin user via database insert or use admin routes:
   ```sql
   INSERT INTO admin_users (email, password_hash, name, role)
   VALUES ('admin@ankarafashion.com', 'hashed_password', 'Admin', 'super_admin');
   ```
2. Use bcrypt to hash passwords
3. Access admin panel at `/admin` (login required)

## Database Tables & Their Purpose

| Table | Purpose | Records |
|-------|---------|---------|
| categories | Product categories (Ankara Suits, Dresses, etc.) | 8 seeded |
| products | Product listings with pricing | 10 samples |
| product_images | Multiple images per product | Auto-linked |
| product_variations | Size, color, fit options | Pre-configured |
| orders | Customer orders | Empty (ready for orders) |
| order_items | Line items in orders | Empty |
| delivery_locations | Shipping zones | 8 seeded |
| banners | Homepage hero banners | Empty (use admin) |
| navbar_offers | Running announcements | Empty |
| popup_offers | Modal offers | Empty |
| site_settings | Store configuration | 1 record seeded |
| newsletter_subscribers | Email list | Empty |
| analytics_events | Event tracking | Empty |
| admin_users | Admin accounts | Empty (needs setup) |
| tags | Product tags | 8 seeded |
| product_tags | Product-tag relationships | Pre-linked |

## Sample Data Included

The database has been seeded with:
- **8 Ankara Categories**: Suits, Dresses, Shirts, Kimonos, Palazzo, Tops, Skirts, Accessories
- **10 Sample Products**: Real Ankara products with images, variations, and pricing
- **8 Delivery Locations**: Across Kenya and East Africa with fees
- **Store Settings**: Pre-configured with Ankara Fashion branding

## Admin Panel Access

Once API is reconnected:
1. Create admin user
2. Navigate to `/admin`
3. Login with credentials
4. Manage:
   - Products (add real images, set prices)
   - Orders (track shipments)
   - Categories (customize collections)
   - Banners (update promotions)
   - Settings (adjust store config)
   - Users (manage team)

## Frontend Components Connected to API

These components fetch data from API endpoints:
- `Hero` - Fetches banner data
- `CategoriesSection` - Fetches categories
- `FeaturedProducts` - Fetches featured products
- `NewArrivals` - Fetches new products
- `OnOfferProducts` - Fetches products on sale
- `Navbar` - Fetches categories for menu

All use SWR for client-side data fetching and caching.

## Testing Checklist

When reconnecting, test:
- [ ] Categories load from API
- [ ] Products display correctly
- [ ] Product images show
- [ ] Cart adds/removes items
- [ ] Search functionality works
- [ ] Filters work (category, tags)
- [ ] Wishlist functionality works
- [ ] Order creation succeeds
- [ ] Newsletter subscription works
- [ ] Admin login works
- [ ] Product management works
- [ ] Analytics tracking triggers

## Security Notes

- All admin routes require `requireAuth()` middleware
- Rate limiting on public endpoints (30 req/min)
- Parameterized queries prevent SQL injection
- Password hashing with bcrypt required
- JWT tokens for admin authentication
- CORS configured for same-origin requests

## Troubleshooting

**Products not showing?**
- Verify Supabase connection
- Check product images URL format
- Ensure categories exist in database

**Admin login fails?**
- Verify admin user exists in database
- Check password hash is correct (bcrypt)
- Verify JWT secret in environment

**Orders not creating?**
- Check delivery_locations exist
- Verify order number generation works
- Confirm order_items line items insert

## Next Phase: Admin Data Management

Once API is reconnected, populate database with:
1. Real Ankara product images and descriptions
2. Accurate pricing for each item
3. Product variations (sizes, colors)
4. Customer testimonials/reviews
5. Blog/lifestyle content
6. FAQs about Ankara fabrics

The database structure supports all of this. Just add content through the admin panel!
