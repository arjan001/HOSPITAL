---
name: admin_orders atomic upsert + insert detection
description: How AdminOrdersService.upsert avoids the read-then-insert race and detects true first-insert for one-time side effects.
---

`AdminOrdersService.upsert` keys on the **unique** `order_no`. It still reads the
existing row first (the merge/status-demotion logic needs the prior values), but
the WRITE is a single `INSERT ... ON CONFLICT (order_no) DO UPDATE` — never a
read-then-conditional-insert.

**Why:** two concurrent first-writes for the same order (client double-submit /
retry) both see "no existing" and would race into a unique-constraint violation;
worse, any one-time side effect gated on `!existing` would double-fire. The order
mirror (`OrdersService.create` → `AdminOrdersService.upsert`) is the only writer,
but retries make the race real.

**How to apply:** to know whether *this* call truly created the row (e.g. to fire
the one-time admin bell notification exactly once), use Postgres `xmax`:
`.returning({ ...getTableColumns(table), wasInserted: sql<boolean>\`(xmax = 0)\` })`.
`xmax = 0` is true only for a freshly inserted row; a conflict→update yields a
non-zero `xmax`. Gate one-time effects on `wasInserted`, not on the pre-read
`!existing` flag. Covered by a concurrency test (two `Promise.allSettled` upserts
→ no throw, bell pushed once).
