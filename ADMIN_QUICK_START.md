## ADMIN SYSTEM QUICK START GUIDE

### Accessing the Admin Dashboard
1. Login at `/admin/login`
2. Use credentials (created during setup)
3. Dashboard at `/admin`

### Main Modules

#### Policies (Legal Documents)
- **Location**: Admin → Policies
- **Features**: Rich text editor with formatting toolbar
- **Actions**: Create, edit, preview, publish/unpublish, delete
- **Frontend**: Auto-generates pages at `/policies/[slug]`
- **Slugs Available**: terms-and-conditions, privacy-policy, refund-policy, cookie-policy, return-policy, shipping-policy

#### Banners & Offers
- **Location**: Admin → Banners
- **3 Types**:
  1. Hero Banners (homepage collection showcases)
  2. Navbar Offers (announcement bar messages)
  3. Popup Offers (promotional popups)
- **Status**: Toggle active/inactive
- **Images**: Upload banner images with links

#### Newsletter
- **Location**: Admin → Newsletter
- **View**: All subscribers with email, status, date
- **Actions**: Activate/deactivate, delete, export CSV
- **Stats**: Total, active, inactive counts
- **Frontend**: Subscribe form (auto-syncs to database)

#### Delivery
- **Location**: Admin → Delivery
- **Zones**: Create delivery areas with fees and timeframes
- **Frontend**: Users see zones during checkout at `/account/delivery`
- **Actions**: Create, edit, delete zones, set sort order

#### Analytics
- **Location**: Admin → Analytics
- **Tabs**: 
  - Sales & Orders (revenue, order count, trends)
  - Website Traffic (views, devices, countries)
- **Data**: Auto-tracked from page events and purchases
- **Export**: CSV download for reporting

#### Orders
- **Location**: Admin → Orders
- **View**: All customer orders with details
- **Filter**: By customer, order #, status
- **Actions**: Update status, view details, delete, export
- **Statuses**: Pending, Processing, Shipped, Delivered, Cancelled

#### Users & Roles
- **Location**: Admin → Users
- **Roles**: Super Admin, Admin, Editor, Viewer
- **Actions**: Add user, change role, deactivate, delete
- **Permissions**: Each role has specific access levels

#### Settings
- **Location**: Admin → Settings
- **Tabs**:
  - General (store info, name, email, phone)
  - SEO (site metadata, analytics ID)
  - Theme (colors, fonts)
  - Footer (social links, hours, contact info)
- **Real-time**: Changes apply immediately

---

## DATABASE OPERATIONS

### Viewing Raw Data
Connect via Supabase dashboard and browse tables directly.

### Common Tables
- `policies` - Legal documents
- `hero_banners` - Homepage banners
- `navbar_offers` - Announcement messages
- `popup_offers` - Promotional popups
- `newsletter_subscribers` - Email signups
- `delivery_locations` - Delivery zones
- `orders` - Customer orders
- `admin_users` - Team members
- `site_settings` - Global settings

---

## API ENDPOINTS FOR INTEGRATION

### Policies
```
GET    /api/admin/policies           → List all policies
POST   /api/admin/policies           → Create policy
PUT    /api/admin/policies           → Update policy
DELETE /api/admin/policies?id=...    → Delete policy
GET    /api/policies/[slug]          → Get public policy
```

### Banners & Offers
```
GET    /api/admin/banners            → List all banners/offers
POST   /api/admin/banners            → Create banner/offer
PUT    /api/admin/banners            → Update banner/offer
DELETE /api/admin/banners?id=...     → Delete banner/offer
```

### Newsletter
```
GET    /api/admin/newsletter         → List subscribers
POST   /api/newsletter               → Subscribe (public)
PUT    /api/admin/newsletter         → Update subscriber
DELETE /api/admin/newsletter?id=...  → Delete subscriber
```

### Delivery
```
GET    /api/admin/delivery           → List delivery zones
POST   /api/admin/delivery           → Create zone
PUT    /api/admin/delivery           → Update zone
DELETE /api/admin/delivery?id=...    → Delete zone
```

### Orders
```
GET    /api/admin/orders             → List orders
GET    /api/admin/orders?search=...  → Search orders
POST   /api/admin/orders             → Create order
PUT    /api/admin/orders             → Update order/status
DELETE /api/admin/orders?id=...      → Delete order
```

### Settings
```
GET    /api/admin/settings           → Get all settings
PUT    /api/admin/settings           → Update settings
```

---

## COMMON TASKS

### Add a New Policy
1. Go to Admin → Policies
2. Click "Create New Policy"
3. Fill in:
   - Slug (URL identifier, e.g., "refund-policy")
   - Title (e.g., "Refund Policy")
   - Content using rich text editor
   - Meta tags for SEO
4. Click "Create Policy"
5. Policy appears at `/policies/[slug]`

### Create Hero Banner
1. Admin → Banners → Hero Banners tab
2. Click "Add New Hero Banner"
3. Fill:
   - Title & Subtitle
   - Upload image
   - Set button link (e.g., /shop/men)
   - Button text
4. Save - displays on homepage

### Add Newsletter Subscriber (Manual)
1. Admin → Newsletter
2. Subscribers auto-populate from signups
3. Toggle status or delete as needed
4. Export CSV for mailing list

### Update Order Status
1. Admin → Orders
2. Click order to view details
3. Change status dropdown
4. Status automatically updates
5. Customer receives status notification

### Modify Site Settings
1. Admin → Settings
2. Choose tab (General, SEO, Theme, Footer)
3. Edit fields
4. Click Save
5. Changes apply immediately to frontend

### Create New Team Member
1. Admin → Users
2. Click "Add User"
3. Enter email, name, password
4. Select role (Admin, Editor, Viewer)
5. Send invite or they can login directly

---

## TROUBLESHOOTING

### Policy Not Showing on Frontend
- Check `is_published` is enabled
- Verify slug matches URL (e.g., `/policies/terms-and-conditions`)
- Clear cache if using CDN

### Banners Not Displaying
- Verify `is_active` is true
- Check image URL is valid
- Ensure banner type matches homepage template

### Newsletter Subscribers Not Captured
- Check `/api/newsletter` endpoint accessible
- Verify form submission redirects correctly
- Check browser console for JavaScript errors

### Orders Not Updating
- Confirm user has Admin or Super Admin role
- Verify order exists in database
- Check order status is valid option

### Settings Not Applying
- Clear browser cache
- Verify all required fields filled
- Check Supabase connection active
- Restart admin session if needed

---

## BEST PRACTICES

1. **Backup regularly**: Export data weekly via CSV exports
2. **Keep policies updated**: Review legal docs quarterly
3. **Moderate newsletter**: Regularly remove inactive subscribers
4. **Monitor analytics**: Check dashboard weekly for trends
5. **Update banners**: Rotate offers monthly for engagement
6. **Test thoroughly**: Always test changes on staging first
7. **Use SEO**: Fill all meta fields for better search rankings
8. **Set permissions**: Use proper roles for team security
9. **Respond to orders**: Update order status within 24 hours
10. **Maintain delivery zones**: Keep zones current and accurate

---

## KEYBOARD SHORTCUTS

| Action | Shortcut |
|--------|----------|
| Save | `Ctrl+S` / `Cmd+S` |
| Undo | `Ctrl+Z` / `Cmd+Z` |
| Redo | `Ctrl+Y` / `Cmd+Y` |
| Bold text | `Ctrl+B` / `Cmd+B` |
| Italic text | `Ctrl+I` / `Cmd+I` |

---

## SUPPORT

For issues or questions:
1. Check this guide's troubleshooting section
2. Review module-specific documentation
3. Check browser console for errors
4. Contact support at info@classycollections.com
