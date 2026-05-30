---
name: api-nest payment trust gate
description: How money-granting endpoints in api-nest must verify Paystack payments before granting value.
---

# Payment trust gate (api-nest)

Any `/api/v2` endpoint that grants value in exchange for a payment (e.g. prescription buy → dispensed) MUST verify the payment server-side before mutating state. Never trust a client-supplied `reference`/`amount`.

**The single trust gate:** `PaystackService.verifyPaidReference(reference, minAmount)` (in `paystack.module.ts`).
- Requires the provider configured, resolves the reference via `status()` (throws `NOT_FOUND` for unknown/forged refs, lazily re-verifies pending ones with Paystack), requires `record.status === "success"`, and enforces `record.amount >= minAmount`.
- Returns the verified `PaymentRecord` so callers capture `mpesaReceipt`.
- `PaystackModule` exports `PaystackService`; consuming modules import `PaystackModule` and inject with explicit `@Inject(PaystackService)` (tsx/esbuild emits no decorator metadata).

**Why:** an earlier prescription `pay()` marked an Rx dispensed on any client-sent reference — a trivial business-logic bypass. The charge records live in the same `PaystackService` singleton the storefront's `/charge` + `/status` poll populated, so by the time a confirmed buy calls `pay()`, the success record already exists.

**How to apply when adding a paid action:**
1. Server-compute the expected total (don't trust client amount).
2. Reserve the reference *synchronously* — `consumedReferences.has()` then `.add()` with **no `await` between them** — to close the concurrent-replay TOCTOU race (Node is single-threaded, so back-to-back sync ops are atomic).
3. `await verifyPaidReference(reference, expected)` inside a try/catch; on any throw `delete` the reservation so a legitimate retry (was-pending) can succeed. After a successful save, do NOT delete — the reference stays consumed (one charge → one redemption).
4. Bind the charge to its context, e.g. `verified.orderNumber === \`RX-${rxNumber}\``, so a success reference for one entity can't redeem another. The storefront sets that `orderNumber` when it creates the pending order.
