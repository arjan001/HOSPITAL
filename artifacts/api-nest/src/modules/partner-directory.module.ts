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
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Module,
  Param,
  Put,
  UseGuards,
} from "@nestjs/common"
import { eq } from "drizzle-orm"
import { db, partnerDirectory, cmsDocs } from "@workspace/db"
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
  return { email, displayName, status, portalCode, partnerType }
}

@Injectable()
export class PartnerDirectoryService {
  async countType(partnerType: string): Promise<number> {
    const rows = await db
      .select({ id: partnerDirectory.id })
      .from(partnerDirectory)
      .where(eq(partnerDirectory.partnerType, partnerType))
    return rows.length
  }

  /** Lazy import from legacy cms_docs when a type has no Postgres rows yet. */
  async ensureMigrated(key: DirectoryKey): Promise<void> {
    const partnerType = KEY_TO_TYPE[key]
    if ((await this.countType(partnerType)) > 0) return
    const rows = await db.select().from(cmsDocs).where(eq(cmsDocs.key, CMS_KEY[key])).limit(1)
    const value = rows[0]?.value
    if (!Array.isArray(value) || value.length === 0) return
    await this.replaceAll(
      key,
      value.filter((v): v is Record<string, unknown> => v != null && typeof v === "object"),
    )
  }

  async list(key: DirectoryKey): Promise<Record<string, unknown>[]> {
    await this.ensureMigrated(key)
    const partnerType = KEY_TO_TYPE[key]
    const rows = await db
      .select()
      .from(partnerDirectory)
      .where(eq(partnerDirectory.partnerType, partnerType))
    return rows.map((r) => r.payload)
  }

  async replaceAll(key: DirectoryKey, items: Record<string, unknown>[]): Promise<{ ok: true; count: number }> {
    const partnerType = KEY_TO_TYPE[key]
    const now = new Date()
    await db.transaction(async (tx) => {
      await tx.delete(partnerDirectory).where(eq(partnerDirectory.partnerType, partnerType))
      for (const raw of items) {
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
          createdAt: now,
          updatedAt: now,
        })
      }
    })
    return { ok: true, count: items.length }
  }

  async findById(partnerType: string, id: string): Promise<Record<string, unknown> | null> {
    const [row] = await db
      .select()
      .from(partnerDirectory)
      .where(eq(partnerDirectory.id, id))
      .limit(1)
    if (!row || row.partnerType !== partnerType) return null
    return row.payload
  }

  async listLogisticsActive(): Promise<
    Array<{ id: string; status: string; coverageCounties: string[]; activeDeliveries: number }>
  > {
    await this.ensureMigrated("logistics-partners")
    const rows = await db
      .select()
      .from(partnerDirectory)
      .where(eq(partnerDirectory.partnerType, "logistics"))
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
