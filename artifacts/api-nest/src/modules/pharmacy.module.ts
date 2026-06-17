/**
 * pharmacy.module.ts — Physical pharmacy store management
 *
 * Routes (all AdminGuard'd):
 *   GET/POST   /api/v2/pharmacy/branches
 *   GET/PATCH/DELETE /api/v2/pharmacy/branches/:id
 *   GET/POST   /api/v2/pharmacy/branches/:branchId/shifts
 *   DELETE     /api/v2/pharmacy/shifts/:id
 *   GET/POST   /api/v2/pharmacy/branches/:branchId/employees
 *   PATCH/DELETE /api/v2/pharmacy/employees/:id
 *   GET/POST   /api/v2/pharmacy/pos/transactions
 *   PATCH      /api/v2/pharmacy/pos/transactions/:id
 */

import { Injectable, Controller, Get, Post, Patch, Delete, Param, Body, Req, Inject, Module, UseGuards, HttpException, HttpStatus } from "@nestjs/common"
import type { Request } from "express"
import { eq, desc, inArray } from "drizzle-orm"
import { db, pharmacies, pharmacyBranches, pharmacyShifts, pharmacyEmployees, posTransactions } from "@workspace/db"
import { newId } from "../common/repository"
import { AdminGuard, RequirePerm } from "../common/admin-guard"
import {
  clerkPartnerOrgEnabled,
  createClerkOrganization,
  createClerkOrgInvitation,
  resolveClerkOrgCreatorUserId,
} from "../common/clerk-partner-org"
import {
  type PharmacyScope,
  resolvePharmacyScope,
  assertPharmacyAccess,
  requireAllPharmacyScope,
  assertBranchAccess,
  assertEmployeeAccess,
  assertTransactionAccess,
  scopedPharmacyId,
} from "../common/pharmacy-scope"

// ─── Service ────────────────────────────────────────────────────────────────

@Injectable()
class PharmacyService {
  // ── Pharmacies (legal entity / internal network) ──
  async listPharmacies(scope: PharmacyScope) {
    const pid = scopedPharmacyId(scope)
    if (pid) {
      return db.select().from(pharmacies).where(eq(pharmacies.id, pid)).orderBy(desc(pharmacies.createdAt))
    }
    return db.select().from(pharmacies).orderBy(desc(pharmacies.createdAt))
  }

  async getPharmacy(scope: PharmacyScope, id: string) {
    const [row] = await db.select().from(pharmacies).where(eq(pharmacies.id, id)).limit(1)
    if (!row) throw new HttpException("Pharmacy not found", HttpStatus.NOT_FOUND)
    assertPharmacyAccess(scope, row.id)
    return row
  }

  async createPharmacy(scope: PharmacyScope, body: Record<string, unknown>) {
    requireAllPharmacyScope(scope, "register pharmacies")
    const name = String(body?.name ?? "").trim()
    if (!name) throw new HttpException("Pharmacy name is required", HttpStatus.BAD_REQUEST)
    const id = newId("phrx")
    let clerkOrgId = String(body?.clerkOrgId ?? "").trim() || null
    const adminUserId = String(body?.adminUserId ?? "").trim() || undefined
    const contactEmail = String(body?.email ?? "").trim().toLowerCase()
    if (!clerkOrgId && clerkPartnerOrgEnabled()) {
      const creatorId = await resolveClerkOrgCreatorUserId({
        clerkCreatorUserId: String(body?.clerkCreatorUserId ?? "").trim(),
        adminUserId,
        contactEmail,
      })
      if (creatorId) {
        const org = await createClerkOrganization(name, creatorId)
        clerkOrgId = org.id
      }
    }
    const [row] = await db.insert(pharmacies).values({
      id,
      name,
      legalName: String(body?.legalName ?? name).trim(),
      licenseNumber: String(body?.licenseNumber ?? "").trim(),
      email: contactEmail,
      phone: String(body?.phone ?? "").trim() || undefined,
      address: String(body?.address ?? "").trim(),
      city: String(body?.city ?? "").trim(),
      status: String(body?.status ?? "pending"),
      clerkOrgId,
      adminUserId,
      kyc: (body?.kyc as Record<string, unknown>) ?? {},
    }).returning()
    return row
  }

  async updatePharmacy(scope: PharmacyScope, id: string, body: Record<string, unknown>) {
    await this.getPharmacy(scope, id)
    const set: Partial<typeof pharmacies.$inferInsert> = { updatedAt: new Date() }
    if (body.name !== undefined) set.name = String(body.name).trim()
    if (body.legalName !== undefined) set.legalName = String(body.legalName).trim()
    if (body.licenseNumber !== undefined) set.licenseNumber = String(body.licenseNumber).trim()
    if (body.email !== undefined) set.email = String(body.email).trim().toLowerCase()
    if (body.phone !== undefined) set.phone = String(body.phone).trim() || undefined
    if (body.address !== undefined) set.address = String(body.address).trim()
    if (body.city !== undefined) set.city = String(body.city).trim()
    if (body.status !== undefined) set.status = String(body.status)
    if (body.adminUserId !== undefined) {
      requireAllPharmacyScope(scope, "reassign pharmacy administrators")
      set.adminUserId = String(body.adminUserId).trim() || undefined
    }
    if (body.kyc !== undefined) set.kyc = body.kyc as Record<string, unknown>
    const [row] = await db.update(pharmacies).set(set).where(eq(pharmacies.id, id)).returning()
    if (!row) throw new HttpException("Pharmacy not found", HttpStatus.NOT_FOUND)
    return row
  }

  async invitePharmacyStaff(scope: PharmacyScope, pharmacyId: string, body: Record<string, unknown>) {
    const pharmacy = await this.getPharmacy(scope, pharmacyId)
    const email = String(body?.email ?? "").trim().toLowerCase()
    const displayName = String(body?.displayName ?? "").trim() || email
    const branchId = String(body?.branchId ?? "").trim()
    const role = String(body?.role ?? "pharmacist").trim()
    if (!email) throw new HttpException("Employee email is required", HttpStatus.BAD_REQUEST)
    if (!branchId) throw new HttpException("branchId is required", HttpStatus.BAD_REQUEST)
    if (!pharmacy.clerkOrgId) {
      throw new HttpException(
        "This pharmacy has no Clerk organization yet. Super admin must enable staff invites when creating the pharmacy.",
        HttpStatus.BAD_REQUEST,
      )
    }
    let inviteId: string | null = null
    try {
      const inv = await createClerkOrgInvitation(pharmacy.clerkOrgId, email, "member")
      inviteId = inv.id
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Invitation failed"
      throw new HttpException(`Could not send Clerk invitation: ${msg}`, HttpStatus.BAD_GATEWAY)
    }
    const [row] = await db.insert(pharmacyEmployees).values({
      id: newId("phep"),
      pharmacyId,
      branchId,
      displayName,
      email,
      role,
      status: "invited",
      clerkInviteId: inviteId,
    }).returning()
    return row
  }

  // ── Branches ──
  async listBranches(scope: PharmacyScope) {
    const pid = scopedPharmacyId(scope)
    if (pid) {
      return db.select().from(pharmacyBranches)
        .where(eq(pharmacyBranches.pharmacyId, pid))
        .orderBy(desc(pharmacyBranches.createdAt))
    }
    return db.select().from(pharmacyBranches).orderBy(desc(pharmacyBranches.createdAt))
  }

  async getBranch(scope: PharmacyScope, id: string) {
    const [b] = await db.select().from(pharmacyBranches).where(eq(pharmacyBranches.id, id)).limit(1)
    if (!b) throw new HttpException("Branch not found", HttpStatus.NOT_FOUND)
    assertPharmacyAccess(scope, b.pharmacyId)
    return b
  }

  async createBranch(scope: PharmacyScope, body: Record<string, unknown>) {
    const name = String(body?.name ?? "").trim()
    if (!name) throw new HttpException("name is required", HttpStatus.BAD_REQUEST)
    let pharmacyId = String(body?.pharmacyId ?? "").trim() || undefined
    const scoped = scopedPharmacyId(scope)
    if (scoped) pharmacyId = scoped
    if (!pharmacyId) throw new HttpException("pharmacyId is required", HttpStatus.BAD_REQUEST)
    assertPharmacyAccess(scope, pharmacyId)
    const branchCode = String(body?.branchCode ?? `BR-${Date.now().toString(36).toUpperCase()}`).trim()
    const [b] = await db.insert(pharmacyBranches).values({
      id: newId("phbr"),
      pharmacyId,
      branchCode,
      name,
      address: String(body?.address ?? "").trim(),
      city: String(body?.city ?? "").trim(),
      phone: String(body?.phone ?? "").trim() || undefined,
      latitude: String(body?.latitude ?? "").trim() || undefined,
      longitude: String(body?.longitude ?? "").trim() || undefined,
      status: String(body?.status ?? "active"),
      managerId: String(body?.managerId ?? "").trim() || undefined,
      managerName: String(body?.managerName ?? "").trim() || undefined,
      managerEmail: String(body?.managerEmail ?? "").trim() || undefined,
      operatingHours: (body?.operatingHours as Record<string, string>) ?? {},
      maxCapacity: Number(body?.maxCapacity) || 0,
      notes: String(body?.notes ?? "").trim() || undefined,
    }).returning()
    return b
  }

  async updateBranch(scope: PharmacyScope, id: string, body: Record<string, unknown>) {
    await this.getBranch(scope, id)
    const set: Partial<typeof pharmacyBranches.$inferInsert> = { updatedAt: new Date() }
    if (body.name !== undefined) set.name = String(body.name)
    if (body.address !== undefined) set.address = String(body.address)
    if (body.city !== undefined) set.city = String(body.city)
    if (body.phone !== undefined) set.phone = String(body.phone)
    if (body.latitude !== undefined) set.latitude = String(body.latitude)
    if (body.longitude !== undefined) set.longitude = String(body.longitude)
    if (body.status !== undefined) set.status = String(body.status)
    if (body.managerName !== undefined) set.managerName = String(body.managerName)
    if (body.managerEmail !== undefined) set.managerEmail = String(body.managerEmail)
    if (body.operatingHours !== undefined) set.operatingHours = body.operatingHours as Record<string, string>
    if (body.maxCapacity !== undefined) set.maxCapacity = Number(body.maxCapacity)
    if (body.notes !== undefined) set.notes = String(body.notes)
    const [b] = await db.update(pharmacyBranches).set(set).where(eq(pharmacyBranches.id, id)).returning()
    if (!b) throw new HttpException("Branch not found", HttpStatus.NOT_FOUND)
    return b
  }

  async deleteBranch(scope: PharmacyScope, id: string) {
    await this.getBranch(scope, id)
    await db.delete(pharmacyBranches).where(eq(pharmacyBranches.id, id))
    return { ok: true }
  }

  // ── Shifts ──
  async listShifts(scope: PharmacyScope, branchId: string) {
    await assertBranchAccess(scope, branchId)
    return db.select().from(pharmacyShifts).where(eq(pharmacyShifts.branchId, branchId)).orderBy(pharmacyShifts.name)
  }

  async createShift(scope: PharmacyScope, branchId: string, body: Record<string, unknown>) {
    await assertBranchAccess(scope, branchId)
    const name = String(body?.name ?? "").trim()
    if (!name) throw new HttpException("name is required", HttpStatus.BAD_REQUEST)
    const [s] = await db.insert(pharmacyShifts).values({
      id: newId("phsh"),
      branchId,
      name,
      startTime: String(body?.startTime ?? "08:00"),
      endTime: String(body?.endTime ?? "16:00"),
      daysOfWeek: (body?.daysOfWeek as number[]) ?? [1, 2, 3, 4, 5],
      maxStaff: Number(body?.maxStaff) || 0,
      active: body?.active !== false,
    }).returning()
    return s
  }

  async deleteShift(scope: PharmacyScope, id: string) {
    const [shift] = await db.select().from(pharmacyShifts).where(eq(pharmacyShifts.id, id)).limit(1)
    if (!shift) throw new HttpException("Shift not found", HttpStatus.NOT_FOUND)
    await assertBranchAccess(scope, shift.branchId)
    await db.delete(pharmacyShifts).where(eq(pharmacyShifts.id, id))
    return { ok: true }
  }

  // ── Employees ──
  async listEmployees(scope: PharmacyScope, branchId: string) {
    await assertBranchAccess(scope, branchId)
    return db.select().from(pharmacyEmployees).where(eq(pharmacyEmployees.branchId, branchId)).orderBy(pharmacyEmployees.displayName)
  }

  async allEmployees(scope: PharmacyScope) {
    const pid = scopedPharmacyId(scope)
    if (pid) {
      return db.select().from(pharmacyEmployees)
        .where(eq(pharmacyEmployees.pharmacyId, pid))
        .orderBy(pharmacyEmployees.branchId, pharmacyEmployees.displayName)
    }
    return db.select().from(pharmacyEmployees).orderBy(pharmacyEmployees.branchId, pharmacyEmployees.displayName)
  }

  async assignEmployee(scope: PharmacyScope, branchId: string, body: Record<string, unknown>) {
    const branch = await assertBranchAccess(scope, branchId)
    const displayName = String(body?.displayName ?? "").trim()
    if (!displayName) throw new HttpException("displayName is required", HttpStatus.BAD_REQUEST)
    const [e] = await db.insert(pharmacyEmployees).values({
      id: newId("phep"),
      pharmacyId: branch.pharmacyId ?? (String(body?.pharmacyId ?? "").trim() || undefined),
      branchId,
      userId: String(body?.userId ?? "").trim() || undefined,
      adminUserId: String(body?.adminUserId ?? "").trim() || undefined,
      shiftId: String(body?.shiftId ?? "").trim() || undefined,
      displayName,
      email: String(body?.email ?? "").trim() || undefined,
      phone: String(body?.phone ?? "").trim() || undefined,
      role: String(body?.role ?? "pharmacist"),
      status: "active",
    }).returning()
    return e
  }

  async updateEmployee(scope: PharmacyScope, id: string, body: Record<string, unknown>) {
    await assertEmployeeAccess(scope, id)
    const set: Partial<typeof pharmacyEmployees.$inferInsert> = { updatedAt: new Date() }
    if (body.shiftId !== undefined) set.shiftId = String(body.shiftId) || undefined
    if (body.role !== undefined) set.role = String(body.role)
    if (body.status !== undefined) set.status = String(body.status)
    if (body.displayName !== undefined) set.displayName = String(body.displayName)
    if (body.phone !== undefined) set.phone = String(body.phone)
    const [e] = await db.update(pharmacyEmployees).set(set).where(eq(pharmacyEmployees.id, id)).returning()
    if (!e) throw new HttpException("Employee record not found", HttpStatus.NOT_FOUND)
    return e
  }

  async removeEmployee(scope: PharmacyScope, id: string) {
    await assertEmployeeAccess(scope, id)
    await db.delete(pharmacyEmployees).where(eq(pharmacyEmployees.id, id))
    return { ok: true }
  }

  // ── POS Transactions ──
  async listTransactions(scope: PharmacyScope, branchId?: string) {
    if (branchId) {
      await assertBranchAccess(scope, branchId)
      return db.select().from(posTransactions)
        .where(eq(posTransactions.branchId, branchId))
        .orderBy(desc(posTransactions.createdAt))
        .limit(200)
    }
    const pid = scopedPharmacyId(scope)
    if (pid) {
      const branches = await db.select({ id: pharmacyBranches.id })
        .from(pharmacyBranches)
        .where(eq(pharmacyBranches.pharmacyId, pid))
      const ids = branches.map((b) => b.id)
      if (!ids.length) return []
      return db.select().from(posTransactions)
        .where(inArray(posTransactions.branchId, ids))
        .orderBy(desc(posTransactions.createdAt))
        .limit(200)
    }
    return db.select().from(posTransactions).orderBy(desc(posTransactions.createdAt)).limit(200)
  }

  async createTransaction(scope: PharmacyScope, body: Record<string, unknown>) {
    const branchId = String(body?.branchId ?? "").trim()
    if (!branchId) throw new HttpException("branchId is required", HttpStatus.BAD_REQUEST)
    await assertBranchAccess(scope, branchId)
    const receiptNo = `POS-${Date.now().toString(36).toUpperCase()}`
    const [t] = await db.insert(posTransactions).values({
      id: newId("pos"),
      branchId,
      employeeId: String(body?.employeeId ?? "").trim() || undefined,
      customerName: String(body?.customerName ?? "").trim() || undefined,
      customerPhone: String(body?.customerPhone ?? "").trim() || undefined,
      items: (body?.items ?? []) as typeof posTransactions.$inferInsert["items"],
      subtotal: Number(body?.subtotal) || 0,
      discount: Number(body?.discount) || 0,
      total: Number(body?.total) || 0,
      paymentMethod: String(body?.paymentMethod ?? "cash"),
      paystackRef: String(body?.paystackRef ?? "").trim() || undefined,
      status: String(body?.status ?? "pending"),
      receiptNo,
      notes: String(body?.notes ?? "").trim() || undefined,
    }).returning()
    return t
  }

  async updateTransaction(scope: PharmacyScope, id: string, body: Record<string, unknown>) {
    await assertTransactionAccess(scope, id)
    const set: Partial<typeof posTransactions.$inferInsert> = { updatedAt: new Date() }
    if (body.status !== undefined) set.status = String(body.status)
    if (body.paystackRef !== undefined) set.paystackRef = String(body.paystackRef)
    const [t] = await db.update(posTransactions).set(set).where(eq(posTransactions.id, id)).returning()
    if (!t) throw new HttpException("Transaction not found", HttpStatus.NOT_FOUND)
    return t
  }
}

// ─── Controllers ────────────────────────────────────────────────────────────

@Controller("pharmacy/pharmacies")
@UseGuards(AdminGuard)
@RequirePerm("pharmacy.manage", "pharmacy.staff")
class PharmacyNetworkController {
  constructor(@Inject(PharmacyService) private readonly svc: PharmacyService) {}

  @Get() async list(@Req() req: Request) {
    return this.svc.listPharmacies(await resolvePharmacyScope(req))
  }
  @Post() async create(@Req() req: Request, @Body() body: Record<string, unknown>) {
    return this.svc.createPharmacy(await resolvePharmacyScope(req), body)
  }
  @Get(":id") async get(@Req() req: Request, @Param("id") id: string) {
    return this.svc.getPharmacy(await resolvePharmacyScope(req), id)
  }
  @Patch(":id") async update(@Req() req: Request, @Param("id") id: string, @Body() body: Record<string, unknown>) {
    return this.svc.updatePharmacy(await resolvePharmacyScope(req), id, body)
  }
  @Post(":id/staff/invite") async invite(@Req() req: Request, @Param("id") id: string, @Body() body: Record<string, unknown>) {
    return this.svc.invitePharmacyStaff(await resolvePharmacyScope(req), id, body)
  }
}

@Controller("pharmacy/branches")
@UseGuards(AdminGuard)
@RequirePerm("pharmacy.manage", "pharmacy.staff", "products.view")
class PharmacyBranchesController {
  constructor(@Inject(PharmacyService) private readonly svc: PharmacyService) {}

  @Get() async list(@Req() req: Request) {
    return this.svc.listBranches(await resolvePharmacyScope(req))
  }
  @Post() async create(@Req() req: Request, @Body() body: Record<string, unknown>) {
    return this.svc.createBranch(await resolvePharmacyScope(req), body)
  }
  @Get(":id") async get(@Req() req: Request, @Param("id") id: string) {
    return this.svc.getBranch(await resolvePharmacyScope(req), id)
  }
  @Patch(":id") async update(@Req() req: Request, @Param("id") id: string, @Body() body: Record<string, unknown>) {
    return this.svc.updateBranch(await resolvePharmacyScope(req), id, body)
  }
  @Delete(":id") async remove(@Req() req: Request, @Param("id") id: string) {
    return this.svc.deleteBranch(await resolvePharmacyScope(req), id)
  }

  @Get(":branchId/shifts") async listShifts(@Req() req: Request, @Param("branchId") branchId: string) {
    return this.svc.listShifts(await resolvePharmacyScope(req), branchId)
  }
  @Post(":branchId/shifts") async createShift(@Req() req: Request, @Param("branchId") branchId: string, @Body() body: Record<string, unknown>) {
    return this.svc.createShift(await resolvePharmacyScope(req), branchId, body)
  }

  @Get(":branchId/employees") async listEmployees(@Req() req: Request, @Param("branchId") branchId: string) {
    return this.svc.listEmployees(await resolvePharmacyScope(req), branchId)
  }
  @Post(":branchId/employees") async assignEmployee(@Req() req: Request, @Param("branchId") branchId: string, @Body() body: Record<string, unknown>) {
    return this.svc.assignEmployee(await resolvePharmacyScope(req), branchId, body)
  }
}

@Controller("pharmacy/shifts")
@UseGuards(AdminGuard)
class PharmacyShiftsController {
  constructor(@Inject(PharmacyService) private readonly svc: PharmacyService) {}
  @Delete(":id") async remove(@Req() req: Request, @Param("id") id: string) {
    return this.svc.deleteShift(await resolvePharmacyScope(req), id)
  }
}

@Controller("pharmacy/employees")
@UseGuards(AdminGuard)
class PharmacyEmployeesController {
  constructor(@Inject(PharmacyService) private readonly svc: PharmacyService) {}
  @Get() async all(@Req() req: Request) {
    return this.svc.allEmployees(await resolvePharmacyScope(req))
  }
  @Patch(":id") async update(@Req() req: Request, @Param("id") id: string, @Body() body: Record<string, unknown>) {
    return this.svc.updateEmployee(await resolvePharmacyScope(req), id, body)
  }
  @Delete(":id") async remove(@Req() req: Request, @Param("id") id: string) {
    return this.svc.removeEmployee(await resolvePharmacyScope(req), id)
  }
}

@Controller("pharmacy/pos")
@UseGuards(AdminGuard)
class PharmacyPosController {
  constructor(@Inject(PharmacyService) private readonly svc: PharmacyService) {}
  @Get("transactions") async list(@Req() req: Request) {
    return this.svc.listTransactions(await resolvePharmacyScope(req), req.query?.branchId as string | undefined)
  }
  @Post("transactions") async create(@Req() req: Request, @Body() body: Record<string, unknown>) {
    return this.svc.createTransaction(await resolvePharmacyScope(req), body)
  }
  @Patch("transactions/:id") async update(@Req() req: Request, @Param("id") id: string, @Body() body: Record<string, unknown>) {
    return this.svc.updateTransaction(await resolvePharmacyScope(req), id, body)
  }
}

// ─── Module ─────────────────────────────────────────────────────────────────

@Module({
  controllers: [
    PharmacyNetworkController,
    PharmacyBranchesController,
    PharmacyShiftsController,
    PharmacyEmployeesController,
    PharmacyPosController,
  ],
  providers: [PharmacyService],
  exports: [PharmacyService],
})
export class PharmacyModule {}
