---
name: Paystack order reconciliation
description: Why a paid charge can be invisible to admin, and the server-side reconcile invariant that fixes it
---

# Server-side payment → order reconciliation

**Rule:** An order's `pending → paid` transition MUST have a server-side path that
runs independent of the customer's browser. The Paystack webhook (and the lazy
`/status` re-verify) calls `OrdersService.reconcilePaid(...)`, which looks the
order up by `orderNumber` (no session), advances it to paid, and mirrors it into
`admin_orders`. If no order row exists, it still surfaces a confirmed admin order
from the payment record alone.

**Why:** The storefront's confirm step used to run ONLY in the customer's tab
(poll `/status` → success → POST `/me/orders`). If the tab closed/timed out, the
webhook only flipped the `payments` row to success and NEVER created/advanced an
order — Paystack had the money, admin saw nothing. Real incident: order
`SHX-MPTIVW4O` stuck pending with an empty payment_ref.

**How to apply:**
- Webhook reconcile (`applyCallback`) is **awaited and lets failures throw** so a
  transient failure returns non-2xx and Paystack RETRIES. The `payments` row is
  set to success first and `applyCallback` does NOT early-exit on non-pending, so
  a retry safely re-runs reconcile (idempotent).
- The `/status` poll path is **fire-and-forget** (best-effort secondary) — and it
  early-exits when cached status != pending, so it will NOT re-attempt. Never rely
  on it as the durable path; the awaited webhook is the source of truth.
- Reconcile re-checks `payment.amount >= order.total` before confirming — never
  mark an underpayment paid; leave it pending for manual review (the amount is
  server-recorded at init, but re-validate as defense in depth).
- Admin mirror via `adminOrders.upsert` is safe to call repeatedly: keyed on
  `orderNo`, no-demote, dedupes — so client mirror + reconcile mirror converge.
- DI: `PaystackModule` imports `OrdersModule` (which exports `OrdersService`).
  Safe because nothing in `OrdersModule → AdminOrdersModule → {PatientNotifications,
  Notifications}` imports Paystack back.
