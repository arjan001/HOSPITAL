import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { HttpException } from "@nestjs/common"
import { inArray } from "drizzle-orm"
import { db, cmsDocs } from "@workspace/db"
import { AdminCmsService, PublicCmsController, PUBLIC_CMS_KEYS } from "./admin-cms.module"

// Security boundary for the storefront-public CMS reads. In production the admin
// CMS routes fail closed, so logged-out shoppers read display content through
// the unauthenticated PublicCmsController. This suite locks two invariants:
//   1. Allowlisted keys are readable and return the stored value.
//   2. NON-allowlisted keys 404 even when the row exists — no admin-only content
//      (settings, audit-log, roles, ...) can ever leak through the public route.
// Hits real Postgres, the established convention for this package.

const PUBLIC_KEY = "categories"
const SECRET_KEY = "message-templates"
const SEEDED_KEYS = [PUBLIC_KEY, SECRET_KEY]

async function cleanup() {
  await db.delete(cmsDocs).where(inArray(cmsDocs.key, SEEDED_KEYS))
}

function makeController() {
  return new PublicCmsController(new AdminCmsService())
}

async function expectStatus(promise: Promise<unknown>, status: number) {
  try {
    await promise
    throw new Error("expected the call to throw")
  } catch (err) {
    expect(err).toBeInstanceOf(HttpException)
    expect((err as HttpException).getStatus()).toBe(status)
  }
}

describe("PublicCmsController", () => {
  beforeEach(cleanup)
  afterAll(cleanup)

  it("lists exactly the public allowlist", () => {
    const { keys } = makeController().publicKeys()
    expect(new Set(keys)).toEqual(new Set(PUBLIC_CMS_KEYS))
  })

  it("never exposes admin-only / sensitive keys through the allowlist", () => {
    // A guard against someone widening PUBLIC_CMS_KEYS to a key that carries
    // operational config or anything an unauthenticated visitor must not read.
    const SENSITIVE = [
      "settings",
      "storage",
      "error-reporting",
      "message-templates",
      "audit-log",
      "roles",
    ]
    for (const key of SENSITIVE) {
      expect(PUBLIC_CMS_KEYS.has(key)).toBe(false)
    }
  })

  it("returns the stored value for an allowlisted key", async () => {
    const svc = new AdminCmsService()
    await svc.put(PUBLIC_KEY, [{ id: "c1", name: "Antibiotics" }])
    const entry = await makeController().get(PUBLIC_KEY)
    expect(entry.key).toBe(PUBLIC_KEY)
    expect(entry.value).toEqual([{ id: "c1", name: "Antibiotics" }])
  })

  it("404s for an allowlisted key that does not exist (storefront uses defaults)", async () => {
    await expectStatus(makeController().get(PUBLIC_KEY), 404)
  })

  it("404s for a non-allowlisted key EVEN WHEN the row exists (no leak)", async () => {
    const svc = new AdminCmsService()
    await svc.put(SECRET_KEY, { secret: "do-not-leak" })
    // Sanity: the row really is there via the service.
    expect(await svc.get(SECRET_KEY)).not.toBeNull()
    // ...but the public route refuses it.
    await expectStatus(makeController().get(SECRET_KEY), 404)
  })

  it("rejects malformed keys", async () => {
    await expectStatus(makeController().get("bad key!"), 400)
  })
})
