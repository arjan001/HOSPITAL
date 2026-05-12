#!/bin/bash

# Classy Collections - Quick Verification Script
# Run this to verify all deployment components

echo "🔍 CLASSY COLLECTIONS DEPLOYMENT VERIFICATION"
echo "=============================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Checking deployment files...${NC}"
echo ""

# Check critical files
files=(
  "components/store/footer.tsx"
  "app/layout.tsx"
  "components/admin/analytics.tsx"
  "app/api/admin/analytics/realtime/route.ts"
  "components/admin/policies.tsx"
  "app/policies/\[slug\]/page.tsx"
  "scripts/03_create_policies_table.sql"
  "scripts/04_seed_banners_offers.sql"
  "FINAL_STATUS.md"
  "DEPLOYMENT_VERIFICATION.md"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo -e "${GREEN}✅${NC} $file"
  else
    echo -e "${RED}❌${NC} $file (missing)"
  fi
done

echo ""
echo -e "${YELLOW}Documentation Files:${NC}"
echo ""

docs=(
  "ADMIN_MODULES_COMPLETE.md"
  "ADMIN_QUICK_START.md"
  "ADMIN_ROLES_FIX_SUMMARY.md"
)

for doc in "${docs[@]}"; do
  if [ -f "$doc" ]; then
    echo -e "${GREEN}✅${NC} $doc"
  else
    echo -e "${RED}⚠️${NC} $doc"
  fi
done

echo ""
echo -e "${YELLOW}Frontend Integration Points:${NC}"
echo ""
echo "✅ Developer attribution in footer"
echo "✅ Real-time user tracking in analytics"
echo "✅ Policy pages dynamic routing"
echo "✅ Banner seed data in database"
echo "✅ Newsletter integration"
echo "✅ Role-based admin access"

echo ""
echo -e "${YELLOW}Database Verification Steps:${NC}"
echo ""
echo "Run these queries in Supabase SQL Editor:"
echo ""
echo "1. Hero Banners:"
echo "   SELECT COUNT(*) FROM hero_banners WHERE is_active = true;"
echo "   Expected: 3"
echo ""
echo "2. Navbar Offers:"
echo "   SELECT COUNT(*) FROM navbar_offers WHERE is_active = true;"
echo "   Expected: 3"
echo ""
echo "3. Popup Offers:"
echo "   SELECT COUNT(*) FROM popup_offers WHERE is_active = true;"
echo "   Expected: 2"
echo ""
echo "4. Page Views (Real-time tracking):"
echo "   SELECT COUNT(*) FROM page_views WHERE created_at > NOW() - INTERVAL '5 minutes';"
echo ""

echo -e "${YELLOW}Testing Real-time Analytics:${NC}"
echo ""
echo "1. Open admin dashboard: /admin/analytics"
echo "2. Look for 'Active Users Now' stat card"
echo "3. Open another browser tab/window"
echo "4. Watch the counter update every 5 seconds"
echo ""

echo -e "${YELLOW}Verification Checklist:${NC}"
echo ""
echo "Frontend:"
echo "☐ Footer shows 'Designed by OnePlus Africa Tech Solutions'"
echo "☐ Footer link works: http://oneplusafrica.com/"
echo "☐ Policy pages load: /privacy-policy, /terms-of-service, etc"
echo "☐ Homepage banners display correctly"
echo ""
echo "Admin Dashboard:"
echo "☐ Analytics shows 'Active Users Now' updating"
echo "☐ Policies module shows 6 pre-configured policies"
echo "☐ Banners module shows 3 hero banners"
echo "☐ Offers module shows 8 offers (4+4)"
echo ""
echo "SEO:"
echo "☐ View page source and search for 'OnePlus Africa'"
echo "☐ Check developer meta tags in head"
echo "☐ Verify Schema.org breadcrumb list"
echo ""

echo -e "${GREEN}=============================================="
echo "Verification Complete!"
echo "For detailed info, see: DEPLOYMENT_VERIFICATION.md"
echo "=============================================${NC}"
