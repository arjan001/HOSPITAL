#!/bin/bash
set -e

# Push DB schema changes
pnpm --filter @workspace/db run push 2>/dev/null || echo "[start] DB push skipped (no DATABASE_URL or already up-to-date)"

# Start api-nest (NestJS) on port 8090
PORT=8090 pnpm --filter @workspace/api-nest run dev &
NEST_PID=$!

# Start api-server (Express) on port 8080
PORT=8080 pnpm --filter @workspace/api-server run dev &
API_PID=$!

# Start storefront (Vite) on port 5000
PORT=5000 BASE_PATH=/ pnpm --filter @workspace/shaniid run dev &
VITE_PID=$!

echo "[start] api-nest PID=$NEST_PID  api-server PID=$API_PID  vite PID=$VITE_PID"

wait
