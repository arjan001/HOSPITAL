/**
 * Partner directory — Postgres-backed supplier / clinic / logistics profiles.
 *
 * Replaces cms_docs arrays (`suppliers`, `clinics`, `logistics-partners`).
 *
 * Routes:
 *   GET  /api/v2/admin/partner-directory/:key     — list (admin)
 *   PUT  /api/v2/admin/partner-directory/:key     — full replace (admin)
 *   GET  /api/v2/partner-directory/logistics/active — checkout rider matching (public)
 */
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Module,
  OnModuleInit,
  Param,
  Patch,
  Put,
  UseGuards,
} from "@nestjs/common"
import { and, eq, isNull } from "drizzle-orm"
import { db, partnerDirectory, cmsDocs, partnerAccounts, partnerMembers } from "@workspace/db"
import { AdminGuard, RequirePerm } from "../common/admin-guard"

export type DirectoryKey = "suppliers" | "clinics" | "logistics-partners"

const KEY_TO_TYPE: Record<DirectoryKey, string> = {
  suppliers: "supplier",
  clinics: "clinic",
  "logistics-partners": "logistics",
}

const CMS_KEY: Record<DirectoryKey, string> = {
  suppliers: "suppliers",
  clinics: "clinics",
  "logistics-partners": "logistics-partners",
}

function migrationMarkerKey(key: DirectoryKey): string {
  return `__partner_dir_migrated:${key}`
}

function tombstoneKey(key: DirectoryKey): string {
  return `__partner_dir_tombstones:${key}`
}

function assertKey(key: string): DirectoryKey {
  if (key === "suppliers" || key === "clinics" || key === "logistics-partners") return key
  throw new HttpException("Invalid directory key", HttpStatus.BAD_REQUEST)
}

function indexFromPayload(partnerType: string, payload: Record<string, unknown>) {
  const email = String(payload.email ?? "").trim().toLowerCase()
  const displayName =
    String(
      payload.companyName ??
        payload.clinicName ??
        payload.name ??
        payload.tradingName ??
        email,
    ).trim() || email
  const status = String(payload.status ?? "pending")
  const portalCode = String(payload.portalCode ?? "").trim()
  const kyc = extractKycFromPayload(partnerType, payload)
  return { email, displayName, status, portalCode, partnerType, kyc }
}

function extractKycFromPayload(partnerType: string, payload: Record<string, unknown>) {
  if (partnerType === "logistics") {
    return {
      hasInsurance: Boolean(payload.hasInsurance),
      hasRegistration: Boolean(payload.hasRegistration),
      hasDriverLicenses: Boolean(payload.hasDriverLicenses),
      hasSafetyTraining: Boolean(payload.hasSafetyTraining),
      hasVehicleInsurance: Boolean(payload.hasVehicleInsurance),
      hasDriverInsurance: Boolean(payload.hasDriverInsurance),
      hasGoodsInTransitCover: Boolean(payload.hasGoodsInTransitCover),
      hasCommercialVehicleCover: Boolean(payload.hasCommercialVehicleCover),
      vehicleInsuranceExpiry: String(payload.vehicleInsuranceExpiry ?? ""),
      kycNotes: String(payload.kycNotes ?? ""),
    }
  }
  if (partnerType === "supplier") {
    return {
      hasLicense: Boolean(payload.hasLicense),
      hasFdaCert: Boolean(payload.hasFdaCert),
      hasInsurance: Boolean(payload.hasInsurance),
      kycNotes: String(payload.kycNotes ?? ""),
    }
  }
  if (partnerType === "clinic") {
    return {
      hasLicense: Boolean(payload.hasLicense),
      hasNhifCert: Boolean(payload.hasNhifCert),
      hasPinCert: Boolean(payload.hasPinCert),
      hasDirectorId: Boolean(payload.hasDirectorId),
      kycNotes: String(payload.kycNotes ?? ""),
    }
  }
  return {}
}

async function purgeLegacyCmsItem(key: DirectoryKey, id: string) {
  const cmsKey = CMS_KEY[key]
  const rows = await db.select().from(cmsDocs).where(eq(cmsDocs.key, cmsKey)).limit(1)
  const value = rows[0]?.value
  if (!Array.isArray(value)) return
  const filtered = value.filter((v) => {
    if (v == null || typeof v !== "object") return true
    return String((v as Record<string, unknown>).id ?? "") !== id
  })
  if (filtered.length === value.length) return
  await db
    .update(cmsDocs)
    .set({ value: filtered, updatedAt: new Date() })
    .where(eq(cmsDocs.key, cmsKey))
}

async function readTombstones(key: DirectoryKey): Promise<Set<string>> {
  const rows = await db.select().from(cmsDocs).where(eq(cmsDocs.key, tombstoneKey(key))).limit(1)
  const value = rows[0]?.value
  if (!Array.isArray(value)) return new Set()
  return new Set(value.map((v) => String(v)).filter(Boolean))
}

async function addTombstone(key: DirectoryKey, id: string): Promise<void> {
  const trimmed = id.trim()
  if (!trimmed) return
  const existing = await readTombstones(key)
  if (existing.has(trimmed)) return
  existing.add(trimmed)
  const now = new Date()
  await db
    .insert(cmsDocs)
    .values({ key: tombstoneKey(key), value: [...existing], version: 1 })
    .onConflictDoUpdate({
      target: cmsDocs.key,
      set: { value: [...existing], updatedAt: now },
    })
}

function withoutTombstones(items: Record<string, unknown>[], tombstones: Set<string>) {
  if (!tombstones.size) return items
  return items.filter((raw) => !tombstones.has(String(raw.id ?? "").trim()))
}

@Injectable()
export class PartnerDirectoryService implements OnModuleInit {
  async onModuleInit(): Promise<void> {
    const keys: DirectoryKey[] = ["suppliers", "clinics", "logistics-partners"]
    for (const key of keys) {
      try {
        await this.ensureMigrated(key)
      } catch {
        /* non-fatal at boot */
      }
    }
  }

  private async isMigrated(key: DirectoryKey): Promise<boolean> {
    const [marker] = await db
      .select()
      .from(cmsDocs)
      .where(eq(cmsDocs.key, migrationMarkerKey(key)))
      .limit(1)
    return Boolean(marker)
  }

  private async setMigrated(key: DirectoryKey): Promise<void> {
    const now = new Date()
    await db
      .insert(cmsDocs)
      .values({ key: migrationMarkerKey(key), value: true, version: 1 })
      .onConflictDoUpdate({
        target: cmsDocs.key,
        set: { value: true, updatedAt: now },
      })
  }

  private async clearLegacyCmsArray(key: DirectoryKey): Promise<void> {
    await db
      .update(cmsDocs)
      .set({ value: [], updatedAt: new Date() })
      .where(eq(cmsDocs.key, CMS_KEY[key]))
  }

  async countType(partnerType: string): Promise<number> {
    const rows = await db
      .select({ id: partnerDirectory.id })
      .from(partnerDirectory)
      .where(and(eq(partnerDirectory.partnerType, partnerType), isNull(partnerDirectory.deletedAt)))
    return rows.length
  }

  /**
   * One-time import from legacy cms_docs. After the marker is set we NEVER
   * re-import — otherwise deleting the last partner resurrects the whole list.
   */
  async ensureMigrated(key: DirectoryKey): Promise<void> {
    if (await this.isMigrated(key)) return

    const partnerType = KEY_TO_TYPE[key]
    const tombstones = await readTombstones(key)

    const [anyRow] = await db
      .select({ id: partnerDirectory.id })
      .from(partnerDirectory)
      .where(eq(partnerDirectory.partnerType, partnerType))
      .limit(1)

    if (anyRow) {
      await this.setMigrated(key)
      await this.clearLegacyCmsArray(key)
      return
    }

    const rows = await db.select().from(cmsDocs).where(eq(cmsDocs.key, CMS_KEY[key])).limit(1)
    const value = rows[0]?.value
    if (!Array.isArray(value) || value.length === 0) {
      await this.setMigrated(key)
      return
    }

    const items = withoutTombstones(
      value.filter((v): v is Record<string, unknown> => v != null && typeof v === "object"),
      tombstones,
    )
    if (items.length) {
      await this.replaceAll(key, items)
    }
    await this.clearLegacyCmsArray(key)
    await this.setMigrated(key)
  }

  /** List active partners — does not trigger legacy re-import after migration marker exists. */
  async listRows(key: DirectoryKey) {
    const partnerType = KEY_TO_TYPE[key]
    return db
      .select()
      .from(partnerDirectory)
      .where(and(eq(partnerDirectory.partnerType, partnerType), isNull(partnerDirectory.deletedAt)))
  }

  async syncLegacyCms(key: DirectoryKey): Promise<void> {
    const rows = await this.listRows(key)
    const items = rows.map((r) => r.payload)
    await db
      .update(cmsDocs)
      .set({ value: items, updatedAt: new Date() })
      .where(eq(cmsDocs.key, CMS_KEY[key]))
  }

  async list(key: DirectoryKey): Promise<Record<string, unknown>[]> {
    await this.ensureMigrated(key)
    const rows = await this.listRows(key)
    return rows.map((r) => r.payload)
  }

  async replaceAll(key: DirectoryKey, items: Record<string, unknown>[]): Promise<{ ok: true; count: number }> {
    const partnerType = KEY_TO_TYPE[key]
    const tombstones = await readTombstones(key)
    const filtered = withoutTombstones(items, tombstones)
    const now = new Date()
    await db.transaction(async (tx) => {
      await tx.delete(partnerDirectory).where(eq(partnerDirectory.partnerType, partnerType))
      for (const raw of filtered) {
        const id = String(raw.id ?? "").trim()
        if (!id) continue
        const payload = raw as Record<string, unknown>
        const idx = indexFromPayload(partnerType, payload)
        await tx.insert(partnerDirectory).values({
          id,
          partnerType,
          payload,
          email: idx.email,
          displayName: idx.displayName,
          status: idx.status,
          portalCode: idx.portalCode,
          kyc: idx.kyc,
          deletedAt: null,
          createdAt: now,
          updatedAt: now,
        })
      }
      await tx
        .update(cmsDocs)
        .set({ value: filtered, updatedAt: now })
        .where(eq(cmsDocs.key, CMS_KEY[key]))
    })
    await this.setMigrated(key)
    return { ok: true, count: filtered.length }
  }

  async removeOne(key: DirectoryKey, id: string): Promise<{ ok: true }> {
    const partnerType = KEY_TO_TYPE[key]
    const trimmed = id.trim()
    if (!trimmed) throw new HttpException("Partner id is required", HttpStatus.BAD_REQUEST)

    const [row] = await db
      .select()
      .from(partnerDirectory)
      .where(and(eq(partnerDirectory.id, trimmed), eq(partnerDirectory.partnerType, partnerType)))
      .limit(1)
    if (!row) throw new HttpException("Partner not found", HttpStatus.NOT_FOUND)

    const now = new Date()
    await db.transaction(async (tx) => {
      await tx
        .delete(partnerDirectory)
        .where(and(eq(partnerDirectory.id, trimmed), eq(partnerDirectory.partnerType, partnerType)))

      await tx
        .update(partnerAccounts)
        .set({ status: "suspended", updatedAt: now })
        .where(and(eq(partnerAccounts.partnerId, trimmed), eq(partnerAccounts.partnerType, partnerType)))

      await tx
        .update(partnerMembers)
        .set({ status: "suspended", updatedAt: now })
        .where(eq(partnerMembers.partnerId, trimmed))
    })

    await addTombstone(key, trimmed)
    await purgeLegacyCmsItem(key, trimmed)
    await this.syncLegacyCms(key)
    await this.setMigrated(key)

    return { ok: true }
  }

  async patchOne(
    key: DirectoryKey,
    id: string,
    patch: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const partnerType = KEY_TO_TYPE[key]
    const trimmed = id.trim()
    const [row] = await db
      .select()
      .from(partnerDirectory)
      .where(and(eq(partnerDirectory.id, trimmed), eq(partnerDirectory.partnerType, partnerType)))
      .limit(1)
    if (!row) throw new HttpException("Partner not found", HttpStatus.NOT_FOUND)

    const payload = { ...row.payload, ...patch, id: trimmed }
    const idx = indexFromPayload(partnerType, payload)
    const now = new Date()

    await db
      .update(partnerDirectory)
      .set({
        payload,
        email: idx.email,
        displayName: idx.displayName,
        status: idx.status,
        portalCode: idx.portalCode,
        kyc: idx.kyc,
        updatedAt: now,
      })
      .where(eq(partnerDirectory.id, trimmed))

    await this.syncLegacyCms(key)

    if (patch.status === "suspended" || patch.status === "inactive" || patch.status === "blacklisted" || patch.status === "on_hold") {
      await db
        .update(partnerAccounts)
        .set({ status: "suspended", updatedAt: now })
        .where(and(eq(partnerAccounts.partnerId, trimmed), eq(partnerAccounts.partnerType, partnerType)))
    } else if (patch.status) {
      await db
        .update(partnerAccounts)
        .set({ status: "active", updatedAt: now })
        .where(
          and(
            eq(partnerAccounts.partnerId, trimmed),
            eq(partnerAccounts.partnerType, partnerType),
            eq(partnerAccounts.status, "suspended"),
          ),
        )
    }

    return payload
  }

  async getSummary(key: DirectoryKey, id: string) {
    const partnerType = KEY_TO_TYPE[key]
    const trimmed = id.trim()
    const [row] = await db
      .select()
      .from(partnerDirectory)
      .where(and(eq(partnerDirectory.id, trimmed), eq(partnerDirectory.partnerType, partnerType)))
      .limit(1)
    if (!row) throw new HttpException("Partner not found", HttpStatus.NOT_FOUND)

    const members = await db
      .select()
      .from(partnerMembers)
      .where(eq(partnerMembers.partnerId, trimmed))

    const accounts = await db
      .select()
      .from(partnerAccounts)
      .where(and(eq(partnerAccounts.partnerId, trimmed), eq(partnerAccounts.partnerType, partnerType)))

    const fleet =
      partnerType === "logistics" && Array.isArray(row.payload.vehicles)
        ? (row.payload.vehicles as unknown[]).length
        : 0

    return {
      partner: row.payload,
      clerkOrgId: row.clerkOrgId,
      directoryStatus: row.status,
      kyc: row.kyc ?? extractKycFromPayload(partnerType, row.payload),
      employees: {
        total: members.length,
        active: members.filter((m) => m.status === "active").length,
        invited: members.filter((m) => m.status === "invited").length,
        suspended: members.filter((m) => m.status === "suspended").length,
        byRole: members.reduce<Record<string, number>>((acc, m) => {
          acc[m.role] = (acc[m.role] ?? 0) + 1
          return acc
        }, {}),
      },
      portalAccounts: accounts.map((a) => ({
        id: a.id,
        email: a.email,
        displayName: a.displayName,
        status: a.status,
        lastLoginAt: a.lastLoginAt,
      })),
      fleetSize: fleet,
    }
  }

  async findById(partnerType: string, id: string): Promise<Record<string, unknown> | null> {
    const [row] = await db
      .select()
      .from(partnerDirectory)
      .where(
        and(
          eq(partnerDirectory.id, id),
          eq(partnerDirectory.partnerType, partnerType),
          isNull(partnerDirectory.deletedAt),
        ),
      )
      .limit(1)
    if (!row) return null
    return row.payload
  }

  async listLogisticsActive(): Promise<
    Array<{ id: string; status: string; coverageCounties: string[]; activeDeliveries: number }>
  > {
    await this.ensureMigrated("logistics-partners")
    const rows = await db
      .select()
      .from(partnerDirectory)
      .where(and(eq(partnerDirectory.partnerType, "logistics"), isNull(partnerDirectory.deletedAt)))
    return rows
      .map((r) => {
        const p = r.payload
        const coverage = Array.isArray(p.coverageCounties)
          ? (p.coverageCounties as string[])
          : []
        return {
          id: r.id,
          status: String(p.status ?? r.status),
          coverageCounties: coverage,
          activeDeliveries: Number(p.activeDeliveries ?? 0),
        }
      })
      .filter((p) => p.status === "active" || p.status === "verified")
  }
}

@UseGuards(AdminGuard)
@RequirePerm("partners.manage", "suppliers.manage", "cms.settings")
@Controller("admin/partner-directory")
class PartnerDirectoryAdminController {
  constructor(@Inject(PartnerDirectoryService) private readonly svc: PartnerDirectoryService) {}

  @Get(":key")
  async list(@Param("key") key: string) {
    return this.svc.list(assertKey(key))
  }

  @Put(":key")
  async replace(@Param("key") key: string, @Body() body: unknown) {
    if (!Array.isArray(body)) {
      throw new HttpException("Body must be a JSON array", HttpStatus.BAD_REQUEST)
    }
    return this.svc.replaceAll(
      assertKey(key),
      body.filter((v): v is Record<string, unknown> => v != null && typeof v === "object"),
    )
  }

  @Get(":key/items/:id/summary")
  summary(@Param("key") key: string, @Param("id") id: string) {
    return this.svc.getSummary(assertKey(key), id)
  }

  @Patch(":key/items/:id")
  patch(@Param("key") key: string, @Param("id") id: string, @Body() body: Record<string, unknown>) {
    return this.svc.patchOne(assertKey(key), id, body ?? {})
  }

  @Delete(":key/items/:id")
  remove(@Param("key") key: string, @Param("id") id: string) {
    return this.svc.removeOne(assertKey(key), id)
  }
}

@Controller("partner-directory")
class PartnerDirectoryPublicController {
  constructor(@Inject(PartnerDirectoryService) private readonly svc: PartnerDirectoryService) {}

  /** Active logistics partners for checkout county matching (no PII beyond coverage). */
  @Get("logistics/active")
  activeLogistics() {
    return this.svc.listLogisticsActive()
  }
}

@Module({
  controllers: [PartnerDirectoryAdminController, PartnerDirectoryPublicController],
  providers: [PartnerDirectoryService],
  exports: [PartnerDirectoryService],
})
export class PartnerDirectoryModule {}
