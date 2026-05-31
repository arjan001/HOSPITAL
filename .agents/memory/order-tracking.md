---
name: Order tracking (durable, public)
description: How storefront order tracking resolves orders, and why the lookup keys are shaped the way they are.
---

# Order tracking

Storefront order tracking reads from the **api-nest Postgres orders**, not the
legacy Express `/api/track-order` route (that route is backed by the no-op
`legacy-store` stub and always 404s — never wire UI to it).

## Order number must be supplied at creation
The order number shown on the confirmation screen / admin feed is generated
up-front by the checkout flow. api-nest `OrdersService.create` must **store that
caller-supplied `orderNumber` verbatim** and only self-generate an `SHX-` number
when none is provided.

**Why:** a confirmed payment generated an `HK-…` number but tracking said "order
not found" because api-nest was ignoring the supplied number and minting its own
`SHX-…`. The displayed number never existed in the durable store. Displayed ==
stored is the invariant; breaking it silently breaks tracking.

**How to apply:** any new order-creation path must pass the customer-facing order
number into the durable create call, and pass a `paid` flag when payment is
already confirmed (so status persists as paid/confirmed, not pending).

## Public tracking lookup keys
`GET /api/v2/orders/track` is **unauthenticated by design** — the order number (or
full phone) is the lookup key (tracking-link trust model, parity with how the
legacy public route was intended to work). Accepts EITHER:
- `orderNumber` alone — the "Track my order" button right after checkout uses this.
- `phone` alone — but require the **complete** number (>= 9 significant digits
  after stripping +254 / leading 0), matched as a full-significant-digit substring.

**Why:** never loosen phone lookup to a short fragment. A 6-digit fragment +
`ilike '%frag%'` lets anyone enumerate other customers' full orders (name, phone,
address = PII leak). Requiring the whole number makes the substring effectively
exact across stored formats (`0712…`, `+254712…`, `254712…`) without enabling
enumeration.

**How to apply:** do not add a phone-fragment or wildcard search to any public
order endpoint. If broader phone search is ever needed, gate it behind session
ownership or OTP and return a redacted payload.
