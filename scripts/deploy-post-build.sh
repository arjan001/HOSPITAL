#!/bin/bash
# Replit Autoscale post-build: prune store and push Drizzle schema when DATABASE_URL is set.
set -e

pnpm store prune

if [ -n "${DATABASE_URL:-}" ]; then
  echo "[deploy-post-build] Pushing Drizzle schema to DATABASE_URL..."
  pnpm --filter @workspace/db run push || echo "[deploy-post-build] drizzle push failed — apply manual SQL if needed"
else
  echo "[deploy-post-build] WARNING: DATABASE_URL not set — skipping db push. Set it in Deployment Secrets."
fi
