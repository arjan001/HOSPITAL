#!/bin/bash
# Replit Autoscale post-build: prune store and push Drizzle schema when DATABASE_URL is set.
set -e

pnpm store prune

if [ -n "${DATABASE_URL:-}" ]; then
  echo "[deploy-post-build] Pushing Drizzle schema to DATABASE_URL..."
  pnpm --filter @workspace/db run push || echo "[deploy-post-build] drizzle push failed — apply manual SQL if needed"
else
  echo "[deploy-post-build] WARNING: No database URL — Replit should inject DATABASE_URL when the managed DB is linked to this deployment."
fi

# Refresh sitemap + SEO prerender when api-nest is up (includes live products/blogs).
if [ -d "artifacts/her-kingdom/dist/public" ]; then
  export SITEMAP_API_URL="${SITEMAP_API_URL:-http://127.0.0.1:8090}"
  if node artifacts/her-kingdom/scripts/generate-sitemap.mjs 2>/dev/null; then
    cp artifacts/her-kingdom/public/sitemap.xml artifacts/her-kingdom/dist/public/sitemap.xml
    echo "[deploy-post-build] Sitemap refreshed from API"
  fi
  node artifacts/her-kingdom/scripts/prerender-seo.mjs 2>/dev/null || echo "[deploy-post-build] prerender skipped (API may be offline)"
fi
