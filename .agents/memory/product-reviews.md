---
name: Product reviews
description: How product reviews attach to catalog products and how one-per-session is enforced safely.
---

# Product reviews (api-nest `/api/v2/reviews`)

## productId is a plain text column, NOT a FK
`product_reviews.productId` deliberately has no FK to the Drizzle `products` table.

**Why:** the storefront catalog is served from a static fixture in the legacy
api-server (`getProducts()`), not from the Drizzle `products` table (which is
empty). An FK to `products.id` rejected every real insert with a 500. Reviews
must attach to any catalog id by string.

**How to apply:** keep `productId` as `text().notNull()` + a plain index for
per-product lookups. Do not "fix" it by adding a FK — that breaks inserts until/
unless the catalog itself becomes Drizzle-durable.

## One review per session per product = DB unique index + upsert
Enforced by a **partial unique index** `(product_id, session_id) WHERE session_id IS NOT NULL`,
and the service create path uses `INSERT ... ON CONFLICT DO UPDATE` with a
matching `targetWhere` predicate (Postgres requires the predicate to match the
partial index).

**Why:** the original read-then-insert raced under concurrent submits — two
requests both miss the pre-read and both insert, producing duplicate reviews and
inflated aggregate counts.

**How to apply:** never go back to read-then-insert for per-session uniqueness.
The atomic upsert + partial unique index is the contract. When testing the race
with curl, establish the session cookie with ONE request first, then fire the
concurrent requests reusing that jar — parallel cold requests each get a fresh
session and falsely look like duplicates.

## Rating validation rejects, not coerces
`parseRating` throws 400 for non-integer or out-of-range values instead of
clamping (999 must not silently become 5).
