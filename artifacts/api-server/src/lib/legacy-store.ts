/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Supabase has been fully removed from Shaniid RX (May 2026).
 *
 * All admin-managed content now lives in `cmsStore` on the storefront/admin
 * side (localStorage today, NestJS later). The legacy `/api/admin/*` and
 * public `/api/*` route handlers in this server still import `createClient`
 * and `createAdminClient` from this module, so we keep the function names
 * but return chainable, no-op stubs:
 *
 *   - Reads (`.from(...).select(...)`) resolve to `{ data: [], error: null }`.
 *   - Writes (`.insert/.update/.upsert/.delete`) resolve to a soft error so
 *     callers can degrade visibly instead of corrupting state.
 *   - `.auth` / `.auth.admin` / `.storage` calls resolve with safe defaults.
 *
 * The return type is `any` on purpose — Supabase's runtime client is loosely
 * typed and the legacy routes rely on that. New work should NOT call these
 * helpers; persist via cmsStore on the frontend, or add a NestJS endpoint.
 */

const READ_OK: { data: any[]; error: null; count: number } = { data: [], error: null, count: 0 }
const WRITE_DISABLED: { data: null; error: { message: string } } = {
  data: null,
  error: { message: "Backend disabled — Supabase has been removed; persist via cmsStore" },
}

function isWriteMethod(name: string) {
  return name === "insert" || name === "update" || name === "upsert" || name === "delete"
}

function makeQuery(mode: "read" | "write" = "read"): any {
  return new Proxy(function () {}, {
    apply() {
      return makeQuery(mode)
    },
    get(_t, prop: string | symbol) {
      if (prop === "then") {
        return (resolve: (v: any) => void) =>
          resolve(mode === "write" ? WRITE_DISABLED : READ_OK)
      }
      if (prop === "single" || prop === "maybeSingle") {
        return () =>
          Promise.resolve(mode === "write" ? WRITE_DISABLED : { data: null, error: null })
      }
      if (typeof prop === "string" && isWriteMethod(prop)) {
        return (..._args: any[]) => makeQuery("write")
      }
      return (..._args: any[]) => makeQuery(mode)
    },
  }) as any
}

function makeStorage(): any {
  return {
    from: (..._args: any[]) => ({
      upload: async (..._a: any[]) => WRITE_DISABLED,
      getPublicUrl: (..._a: any[]) => ({ data: { publicUrl: "" } }),
      remove: async (..._a: any[]) => ({ data: null, error: null }),
      list: async (..._a: any[]) => READ_OK,
    }),
  }
}

function makeAuth(): any {
  return {
    getUser: async (..._a: any[]) => ({ data: { user: null }, error: null }),
    getSession: async (..._a: any[]) => ({ data: { session: null }, error: null }),
    signInWithPassword: async (..._a: any[]) => ({
      data: { user: null, session: null },
      error: { message: "Auth disabled" },
    }),
    signOut: async (..._a: any[]) => ({ error: null }),
    admin: {
      listUsers: async (..._a: any[]) => ({ data: { users: [] }, error: null }),
      updateUserById: async (..._a: any[]) => ({
        data: { user: null },
        error: { message: "Auth disabled" },
      }),
      inviteUserByEmail: async (..._a: any[]) => ({
        data: { user: null },
        error: { message: "Auth disabled" },
      }),
      deleteUser: async (..._a: any[]) => ({ data: null, error: null }),
      createUser: async (..._a: any[]) => ({
        data: { user: null },
        error: { message: "Auth disabled" },
      }),
    },
  }
}

function makeClient(): any {
  return {
    from: (..._a: any[]) => makeQuery("read"),
    auth: makeAuth(),
    storage: makeStorage(),
    rpc: async (..._a: any[]) => READ_OK,
  }
}

export function createClient(): any {
  return makeClient()
}

export function createAdminClient(): any {
  return makeClient()
}
