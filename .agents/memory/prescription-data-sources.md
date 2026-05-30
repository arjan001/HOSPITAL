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

**Durability:** prescriptions are still in-memory in api-nest (reset on
restart). Postgres migration is deferred — the existing `lib/db` schema is
unused/drifted and would need a redesign for multi-file uploads.
