# Manual SQL migrations

Apply when `pnpm --filter @workspace/db run push` is unavailable (e.g. Postgres not running locally, or drizzle-kit path issues on Windows).

**Source of truth for table/column definitions:** `lib/db/src/schema/*.ts` (Drizzle).

Run against your database (order matters if tables reference each other):

```bash
psql "$DATABASE_URL" -f lib/db/migrations/manual/20250604_rx_extraction.sql
psql "$DATABASE_URL" -f lib/db/migrations/manual/20250604_crm.sql
psql "$DATABASE_URL" -f lib/db/migrations/manual/20250604_prescription_subscriptions.sql
psql "$DATABASE_URL" -f lib/db/migrations/manual/20250604_operations.sql
psql "$DATABASE_URL" -f lib/db/migrations/manual/20250604_prescription_workflow_status.sql
```

Or use drizzle push when the DB is up:

```bash
pnpm --filter @workspace/db run push
```

## Recent workflow additions

| Migration | Tables / columns |
|-----------|------------------|
| `20250604_rx_extraction.sql` | `prescriptions.extraction_status`, `extracted_drugs`, `extraction_summary` |
| `20250604_crm.sql` | `crm_contacts` |
| `20250604_prescription_subscriptions.sql` | `prescription_subscriptions`, `prescription_refills` |
| `20250604_operations.sql` | `care_pack_mappings`, `care_pack_assessments` |
| `20250604_prescription_workflow_status.sql` | Documents `accepted` / `declined` status values |
