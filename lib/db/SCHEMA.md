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
| `inventory_allocations` | [`operations.ts`](src/schema/operations.ts) | Soft stock reservations (BL #8) |
| `care_pack_assembly_jobs` | [`operations.ts`](src/schema/operations.ts) | Care pack pick/assemble queue (BL #9) |
| `care_pack_assembly_lines` | [`operations.ts`](src/schema/operations.ts) | SKU lines per assembly job (BL #9) |
| `qa_inventory_items` | [`qa-logistics.ts`](src/schema/qa-logistics.ts) | QA stock ledger |
| `qa_dispatch_checks` | [`qa-logistics.ts`](src/schema/qa-logistics.ts) | 7-step dispatch QA gates |
| `qa_settings` | [`qa-logistics.ts`](src/schema/qa-logistics.ts) | QA thresholds (singleton) |
| `logistics_*` | [`qa-logistics.ts`](src/schema/qa-logistics.ts) | Zones, riders, batches, deliveries, exceptions |
| `sourcing_inventory_items` | [`admin.ts`](src/schema/admin.ts) | Branch/sourcing on-hand stock (replaces CMS key) |
| `trading_deals` | [`trading.ts`](src/schema/trading.ts) | B2B deal pipeline |
| `trading_bids` | [`trading.ts`](src/schema/trading.ts) | Supplier bids per deal ref |
| `trading_negotiations` | [`trading.ts`](src/schema/trading.ts) | Counter-offer rounds |
| `trading_settlements` | [`trading.ts`](src/schema/trading.ts) | PO/invoice match + optional `linked_purchase_order_id` |
| `sourcing_price_history` | [`sourcing-ext.ts`](src/schema/sourcing-ext.ts) | Supplier cost captures per SKU |
| `sourcing_competitor_prices` | [`sourcing-ext.ts`](src/schema/sourcing-ext.ts) | Competitor retail prices |
| `sourcing_automation_rules` | [`sourcing-ext.ts`](src/schema/sourcing-ext.ts) | Procurement automation rules |
| `sourcing_automation_log` | [`sourcing-ext.ts`](src/schema/sourcing-ext.ts) | Automation run history |
| `sourcing_supplier_score_overrides` | [`sourcing-ext.ts`](src/schema/sourcing-ext.ts) | Manual quality/complaint overrides |

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

**Preferred (creates/updates all tables from schema):**

```bash
pnpm db:push
```

Equivalent: `pnpm --filter @workspace/db run push`

Drizzle Kit reads every file in `lib/db/src/schema/*.ts` and syncs the database. No manual SQL required when Postgres is reachable.

- Manual SQL fallback: [`migrations/manual/README.md`](migrations/manual/README.md)
