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
import { eq, desc, and } from "drizzle-orm"
import { db, pharmacyBranches, pharmacyShifts, pharmacyEmployees, posTransactions } from "@workspace/db"
import { newId } from "../common/repository"
import { AdminGuard } from "../common/admin-guard"

// ─── Service ────────────────────────────────────────────────────────────────

@Injectable()
class PharmacyService {
  // ── Branches ──
  async listBranches() {
    return db.select().from(pharmacyBranches).orderBy(desc(pharmacyBranches.createdAt))
  }

  async getBranch(id: string) {
    const [b] = await db.select().from(pharmacyBranches).where(eq(pharmacyBranches.id, id)).limit(1)
    if (!b) throw new HttpException("Branch not found", HttpStatus.NOT_FOUND)
    return b
  }

  async createBranch(body: Record<string, unknown>) {
    const name = String(body?.name ?? "").trim()
    if (!name) throw new HttpException("name is required", HttpStatus.BAD_REQUEST)
    const branchCode = String(body?.branchCode ?? `BR-${Date.now().toString(36).toUpperCase()}`).trim()
    const [b] = await db.insert(pharmacyBranches).values({
      id: newId("phbr"),
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

  async updateBranch(id: string, body: Record<string, unknown>) {
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

  async deleteBranch(id: string) {
    await db.delete(pharmacyBranches).where(eq(pharmacyBranches.id, id))
    return { ok: true }
  }

  // ── Shifts ──
  async listShifts(branchId: string) {
    return db.select().from(pharmacyShifts).where(eq(pharmacyShifts.branchId, branchId)).orderBy(pharmacyShifts.name)
  }

  async createShift(branchId: string, body: Record<string, unknown>) {
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

  async deleteShift(id: string) {
    await db.delete(pharmacyShifts).where(eq(pharmacyShifts.id, id))
    return { ok: true }
  }

  // ── Employees ──
  async listEmployees(branchId: string) {
    return db.select().from(pharmacyEmployees).where(eq(pharmacyEmployees.branchId, branchId)).orderBy(pharmacyEmployees.displayName)
  }

  async allEmployees() {
    return db.select().from(pharmacyEmployees).orderBy(pharmacyEmployees.branchId, pharmacyEmployees.displayName)
  }

  async assignEmployee(branchId: string, body: Record<string, unknown>) {
    const displayName = String(body?.displayName ?? "").trim()
    if (!displayName) throw new HttpException("displayName is required", HttpStatus.BAD_REQUEST)
    const [e] = await db.insert(pharmacyEmployees).values({
      id: newId("phep"),
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

  async updateEmployee(id: string, body: Record<string, unknown>) {
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

  async removeEmployee(id: string) {
    await db.delete(pharmacyEmployees).where(eq(pharmacyEmployees.id, id))
    return { ok: true }
  }

  // ── POS Transactions ──
  async listTransactions(branchId?: string) {
    if (branchId) {
      return db.select().from(posTransactions)
        .where(eq(posTransactions.branchId, branchId))
        .orderBy(desc(posTransactions.createdAt))
        .limit(200)
    }
    return db.select().from(posTransactions).orderBy(desc(posTransactions.createdAt)).limit(200)
  }

  async createTransaction(body: Record<string, unknown>) {
    const branchId = String(body?.branchId ?? "").trim()
    if (!branchId) throw new HttpException("branchId is required", HttpStatus.BAD_REQUEST)
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

  async updateTransaction(id: string, body: Record<string, unknown>) {
    const set: Partial<typeof posTransactions.$inferInsert> = { updatedAt: new Date() }
    if (body.status !== undefined) set.status = String(body.status)
    if (body.paystackRef !== undefined) set.paystackRef = String(body.paystackRef)
    const [t] = await db.update(posTransactions).set(set).where(eq(posTransactions.id, id)).returning()
    if (!t) throw new HttpException("Transaction not found", HttpStatus.NOT_FOUND)
    return t
  }
}

// ─── Controllers ────────────────────────────────────────────────────────────

@Controller("pharmacy/branches")
@UseGuards(AdminGuard)
class PharmacyBranchesController {
  constructor(@Inject(PharmacyService) private readonly svc: PharmacyService) {}

  @Get() list() { return this.svc.listBranches() }
  @Post() create(@Body() body: Record<string, unknown>) { return this.svc.createBranch(body) }
  @Get(":id") get(@Param("id") id: string) { return this.svc.getBranch(id) }
  @Patch(":id") update(@Param("id") id: string, @Body() body: Record<string, unknown>) { return this.svc.updateBranch(id, body) }
  @Delete(":id") remove(@Param("id") id: string) { return this.svc.deleteBranch(id) }

  @Get(":branchId/shifts") listShifts(@Param("branchId") branchId: string) { return this.svc.listShifts(branchId) }
  @Post(":branchId/shifts") createShift(@Param("branchId") branchId: string, @Body() body: Record<string, unknown>) { return this.svc.createShift(branchId, body) }

  @Get(":branchId/employees") listEmployees(@Param("branchId") branchId: string) { return this.svc.listEmployees(branchId) }
  @Post(":branchId/employees") assignEmployee(@Param("branchId") branchId: string, @Body() body: Record<string, unknown>) { return this.svc.assignEmployee(branchId, body) }
}

@Controller("pharmacy/shifts")
@UseGuards(AdminGuard)
class PharmacyShiftsController {
  constructor(@Inject(PharmacyService) private readonly svc: PharmacyService) {}
  @Delete(":id") remove(@Param("id") id: string) { return this.svc.deleteShift(id) }
}

@Controller("pharmacy/employees")
@UseGuards(AdminGuard)
class PharmacyEmployeesController {
  constructor(@Inject(PharmacyService) private readonly svc: PharmacyService) {}
  @Get() all() { return this.svc.allEmployees() }
  @Patch(":id") update(@Param("id") id: string, @Body() body: Record<string, unknown>) { return this.svc.updateEmployee(id, body) }
  @Delete(":id") remove(@Param("id") id: string) { return this.svc.removeEmployee(id) }
}

@Controller("pharmacy/pos")
@UseGuards(AdminGuard)
class PharmacyPosController {
  constructor(@Inject(PharmacyService) private readonly svc: PharmacyService) {}
  @Get("transactions") list(@Req() req: Request) { return this.svc.listTransactions(req.query?.branchId as string | undefined) }
  @Post("transactions") create(@Body() body: Record<string, unknown>) { return this.svc.createTransaction(body) }
  @Patch("transactions/:id") update(@Param("id") id: string, @Body() body: Record<string, unknown>) { return this.svc.updateTransaction(id, body) }
}

// ─── Module ─────────────────────────────────────────────────────────────────

@Module({
  controllers: [
    PharmacyBranchesController,
    PharmacyShiftsController,
    PharmacyEmployeesController,
    PharmacyPosController,
  ],
  providers: [PharmacyService],
  exports: [PharmacyService],
})
export class PharmacyModule {}
