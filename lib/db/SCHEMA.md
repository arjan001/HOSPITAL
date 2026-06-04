# Database schema (`@workspace/db`)

**Canonical definitions:** TypeScript in [`src/schema/`](src/schema/). Drizzle Kit reads `src/schema/*.ts` via [`drizzle.config.ts`](drizzle.config.ts).

**Runtime:** [`src/index.ts`](src/index.ts) exports `db` and re-exports all tables/types.

## Workflow tables (recent)

| Table | Schema file | Purpose |
|-------|-------------|---------|
| `crm_contacts` | [`crm.ts`](src/schema/crm.ts) | Customer demand funnel stages |
| `care_pack_mappings` | [`operations.ts`](src/schema/operations.ts) | Condition → care pack + SKUs (BL #4) |
| `care_pack_assessments` | [`operations.ts`](src/schema/operations.ts) | Persisted assessment outcomes |
| `prescription_subscriptions` | [`prescriptions.ts`](src/schema/prescriptions.ts) | Refill reminder subscriptions |
| `prescription_refills` | [`prescriptions.ts`](src/schema/prescriptions.ts) | Due/paid refill cycles |
| `procurement_decisions` | [`operations.ts`](src/schema/operations.ts) | Buy/defer/reject from demand (BL #6) |
| `supplier_suggestions` | [`operations.ts`](src/schema/operations.ts) | Ranked suppliers per decision (BL #7) |

## Prescription columns (recent)

On `prescriptions` ([`prescriptions.ts`](src/schema/prescriptions.ts)):

| Column | Type | Notes |
|--------|------|-------|
| `extraction_status` | text | `pending` \| `processing` \| `completed` \| `failed` \| `skipped` |
| `extracted_drugs` | jsonb | OCR/vision suggested lines |
| `extraction_summary` | text | Pharmacist-facing scan summary |
| `status` | text | Includes `accepted`, `declined` for quotation workflow |

Related child tables (unchanged names): `prescription_drugs`, `prescription_timeline`.

## Relations

Join graph for `db.query.*`: [`relations.ts`](src/schema/relations.ts).

## Applying to Postgres

- Preferred: `pnpm --filter @workspace/db run push`
- Manual SQL: [`migrations/manual/README.md`](migrations/manual/README.md)
