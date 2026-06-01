---
name: Server-side audit + payment-confirmed dedupe
description: How the api-nest audit trail persists severity and why payment-paid audits must dedupe via an atomic transition guard.
---

# Server-side audit trail (api-nest)

`AuditService` (`@Global` AuditModule) is the single seam for server-side audit
writes. It is **fail-soft by contract** — `record()` swallows every error so a
logging failure never rolls back the business write.

## Severity must be persisted, not recomputed

The `audit_log` table has a `severity` column. `record()` stores
`input.severity ?? deriveSeverity(action)`; `list()` returns the stored value
with `deriveSeverity(action)` only as a fallback for legacy rows.

**Why:** caller intent (e.g. an order delete/refund tagged `danger`) is lost if
`list()` always re-derives severity from the action verb — verbs misclassify.

**How to apply:** any new audit call that needs a specific severity passes it
explicitly; otherwise the action-verb heuristic fills in.

## Payment-confirmed audits MUST dedupe via an atomic transition guard

`PaystackService.reconcileOrder()` is reached from BOTH the storefront `/status`
poll and the (Paystack-retried) webhook `applyCallback()`. Naively auditing on
every reconcile double-counts; gating on a pre-read `cached.status` is still
racy under concurrent poll+webhook (both read pending, both flip success, both
audit).

The sound fix: the pending→success UPDATE is **atomic and guarded** —
`.where(and(eq(reference), ne(status, "success"))).returning()`. Only the call
whose UPDATE actually flips a not-yet-success row gets rows back; that call sets
`firstTransition = true` and is the only one that audits `Payments/paid`. Both
the poll and webhook paths must mirror this identical guard.

**Why:** Postgres row-level locking + the `status != 'success'` predicate makes
exactly one updater win the race; the losers get zero rows and skip the audit.

**How to apply:** never derive a "first transition" flag from a separate read
before the write. Detect it from the guarded write's RETURNING row count. A
regression test (`paystack-reconcile.spec.ts`) fires two concurrent
`applyCallback()` calls and asserts exactly one `Payments/paid` audit.
