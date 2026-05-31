---
name: cms_docs JSON-array concurrency
description: Why public/high-concurrency writers to a cms_docs JSON-array must use version CAS, not read-modify-write.
---

# cms_docs JSON-array writes need optimistic concurrency

`AdminCmsService.put(key, value)` overwrites the whole `cms_docs` row. Any caller
that does read-modify-write on a JSON **array** document (read array → append →
put) has a lost-update race: two concurrent writers both read version N, both
write their own merged array, last writer wins, one entry is silently dropped.

**Why it matters:** most cmsStore content is admin-edited (low concurrency, race
is rare). But PUBLIC endpoints that append to a cms_docs array — newsletter
subscribe is the first — can take many simultaneous writes and will drop sign-ups.

**How to apply:** for any public or high-concurrency append to a cms_docs array,
use the optimistic-concurrency helpers on `AdminCmsService`:
- `createIfAbsent(key, value)` — insert-only (onConflictDoNothing); returns null if the key already exists.
- `putIfVersion(key, value, expectedVersion)` — updates only when the row is still at `expectedVersion`; returns null on mismatch.
Wrap the read → mutate → write in a small retry loop (re-read on null, ~6 tries).
The `cms_docs` row already carries a `version` column that increments on every put.
