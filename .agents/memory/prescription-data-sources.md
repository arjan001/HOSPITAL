---
name: Prescription data sources
description: Which surfaces read the real api-nest backend vs legacy cmsStore keys.
---

The admin prescriptions panel and the patient `/account/prescriptions` page both
read the **real api-nest backend** (`/api/v2` prescriptions, in-memory repo).
Status changes there sync between admin and patient. Admin mutations
(`PATCH /admin/prescriptions/:id[/status]`) require `rx.verify`; the list/get/
file routes allow `rx.view` OR `rx.verify`.

Two **legacy cmsStore keys still feed older surfaces** and must not be assumed
dead:
- `cmsStore["user-prescriptions"]` → read by the legacy `/user` dashboard
  (`pages/dashboard.tsx`, `useCmsCollection`).
- `cmsStore["prescriptions"]` → read by consultation patient-history in
  `components/admin/consultations.tsx` (keyed by phone) and written by its
  "push to pharmacist" action. The storefront upload page also writes both keys
  as a soft fallback.

**Why:** the upload flow writes cmsStore *and* calls `apiPrescriptions.create`.
A backend-create failure must NOT show a success reference — the new
patient/admin surfaces read api-nest, so a failed create means the request never
reached the pharmacy (the cmsStore copy only shows in the legacy `/user` view).

**Durability:** prescriptions are now **Postgres-durable** in api-nest
(`prescriptions` + `prescription_drugs` + `prescription_timeline` in
`@workspace/db`), keyed to a `users` row via `users.clerkId = req.sessionId`
(the `session-user.ts` bridge). They survive restarts/deploys. Owner scoping is
enforced through `ensureUserId`; admin cross-session reads resolve the owner via
`users.clerkId`. Payment redemption is idempotent at the row level: `pay()` does
an atomic guarded transition (`WHERE id=? AND status='verified' AND paid_at IS
NULL ... RETURNING`) so a replay/concurrent call updates zero rows and the
timeline + notification side effects fire exactly once; `payment_reference` also
has a unique index as the hard cross-row backstop.
