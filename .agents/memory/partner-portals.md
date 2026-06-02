---
name: Partner portals (supplier / clinic / logistics)
description: How the three entity-scoped partner portals authenticate, scope data, and provision accounts; the gotchas that bit during the build.
---

# Partner portals

Three portals (supplier, clinic, logistics) share one backend module + one token. Real
Postgres-durable accounts, supporting BOTH admin-invite AND public self-signup.

## Auth & scoping
- Token mirrors the admin token: HMAC over `SESSION_SECRET`, payload `{pid, partnerType, partnerId}`,
  set as HttpOnly cookie `shaniidrx_partner_token`; client calls use `credentials:include`.
- Every portal route resolves the caller through `requirePartner(req, expectedType)`. The
  `expectedType` check is what stops cross-portal access — a supplier token calling a clinic
  route 403s. All data queries scope by `acc.partnerId`. **Never** trust a partnerId from the
  request body on a portal route — always derive it from the resolved account.

## Account provisioning — the bypass that bit
- The `/partners/welcome` endpoint (auto-fires when an admin creates a partner entity) creates
  invited accounts. It MUST be behind `AdminGuard` — it was briefly public, which let anyone
  provision accounts against arbitrary partnerIds. **Why:** any endpoint that mints accounts or
  emails invite links is an admin action, full stop.
- **How to apply:** the admin-side callers (suppliers/clinics/logistics save flows) must attach
  `adminAuthHeaders()` or they 503 in prod once the guard is on. Self-signup goes through the
  public `/partners/apply` → admin `approve`, which auto-provisions an invited account
  (partnerId = application id, fail-soft).

## CMS reads from a service must use injection, even for READS
- Profile + clinic-credit fallback read CMS docs. Doing this via HTTP loopback to
  `/api/v2/admin/cms/:key` fails **closed** in prod (that GET is `AdminGuard`-protected and
  there's no `ADMIN_API_TOKEN`), silently returning the fallback `[]` — so credit limits and
  profiles vanish in production while looking fine in dev.
- **Fix/rule:** inject `AdminCmsService` (exported by `AdminCmsModule`) and call `.get(key)`
  directly. The existing "service injection not loopback" rule applies to guarded **reads**, not
  just writes.

## Logistics status contract
- Allowed job statuses: `assigned | picked_up | in_transit | delivered | failed`. The frontend
  lifecycle is assigned→picked_up→in_transit→delivered, so the backend allow-list and the
  timestamp side-effects (`pickedUpAt` on `picked_up`, `deliveredAt` on `delivered`) must include
  `picked_up`. Keep the two contracts in lockstep or the "Mark Picked Up" action 400s.

## Clinic credit
- `placeClinicOrder` enforces the credit limit atomically: a DB transaction with `FOR UPDATE` on
  the account row before reading the last ledger balance and writing order+ledger. This is the
  anti-race pattern for concurrent credit-line orders — do not relax it to a read-then-write.
