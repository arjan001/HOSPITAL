---
name: admin RBAC enforcement model (api-nest)
description: How admin role/permission enforcement works and the two invariants that keep it correct.
---

# Admin RBAC model (api-nest `/api/v2`)

AdminGuard is **fail-closed**: every admin controller under `@UseGuards(AdminGuard)` must declare either `@RequirePerm(...)` (one-of semantics) or `@AnyAdmin()`. An admin route with **neither** is reachable only by a super-admin (wildcard `*`). Signed per-user tokens are verified, then the live account is re-loaded from Postgres (`admin_users`, `active=true`) so deactivation/deletion revokes access immediately and perms are enforced against current DB state, not stale token claims.

**Why:** the original gap was "any valid admin token can hit any admin route." The fail-closed default closes it without needing a decorator audit to be perfect — a forgotten decorator denies rather than over-grants.

**How to apply:** when adding any new admin controller, add `@RequirePerm(...)` or `@AnyAdmin()` or it silently becomes super-only. Dev/env/master-key paths (no `ADMIN_API_TOKEN` + `NODE_ENV!=production`, or the `ADMIN_API_TOKEN` master key) attach a synthetic super-admin `["*"]`, so in dev a no-token admin request returns 200 — that is expected, not a bypass. Production fails closed (503) unless `ADMIN_API_TOKEN` / admin creds are set.

## Invariant: backend role defaults MUST mirror the frontend seed roles

Because the Admin Accounts UI assigns accounts **by role only** (no per-permission editing in the create flow), `ROLE_DEFAULT_PERMISSIONS` in `admin-permissions.ts` ARE the effective privileges the guard enforces. They must equal the frontend `SEED_ROLES` in `roles-permissions.tsx`, and every id must be in the shared `PERMISSION_CATALOG` (== frontend `ALL_PERMS`).

**Why:** drift here silently under/over-privileges real accounts (e.g. a doctor losing chat access, or marketing gaining integrations). A contract test (`admin-permissions.spec.ts`) locks catalog equality + the per-role matrix and fails on drift.

**How to apply:** any change to a role's permissions or the catalog must edit BOTH the frontend (`roles-permissions.tsx`) and backend (`admin-permissions.ts`) in the same change, then keep `admin-permissions.spec.ts` green. Note marketing deliberately lacks `marketing.broadcast`/`whatsapp.send` — campaign send is super-admin/explicit-grant only, matching the frontend nav gating.
