/**
 * Tenant isolation for internal pharmacy network admins.
 * pharmacy_admin accounts see only their assigned pharmacy; super-admin sees all.
 */
import { HttpException, HttpStatus } from "@nestjs/common"
import type { Request } from "express"
import { eq } from "drizzle-orm"
import { db, pharmacies, pharmacyBranches, pharmacyEmployees } from "@workspace/db"

export type PharmacyScope =
  | { mode: "all" }
  | { mode: "single"; pharmacyId: string }

type AdminIdentity = {
  id: string
  role: string
  permissions?: string[]
}

function adminFromReq(req: Request): AdminIdentity | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (req as any).adminUser ?? null
}

export async function resolvePharmacyScope(req: Request): Promise<PharmacyScope> {
  const admin = adminFromReq(req)
  if (!admin) return { mode: "all" }

  if (admin.permissions?.includes("*") || admin.role === "super_admin") {
    return { mode: "all" }
  }

  if (admin.role === "pharmacy_admin") {
    const [owned] = await db
      .select({ id: pharmacies.id })
      .from(pharmacies)
      .where(eq(pharmacies.adminUserId, admin.id))
      .limit(1)
    if (owned) return { mode: "single", pharmacyId: owned.id }
    throw new HttpException(
      "No pharmacy is assigned to this account. Contact a super admin.",
      HttpStatus.FORBIDDEN,
    )
  }

  const [staff] = await db
    .select({ pharmacyId: pharmacyEmployees.pharmacyId })
    .from(pharmacyEmployees)
    .where(eq(pharmacyEmployees.adminUserId, admin.id))
    .limit(1)
  if (staff?.pharmacyId) {
    return { mode: "single", pharmacyId: staff.pharmacyId }
  }

  return { mode: "all" }
}

export function assertPharmacyAccess(scope: PharmacyScope, pharmacyId: string | null | undefined) {
  if (scope.mode === "all") return
  if (!pharmacyId || pharmacyId !== scope.pharmacyId) {
    throw new HttpException("Access denied for this pharmacy", HttpStatus.FORBIDDEN)
  }
}

export function requireAllPharmacyScope(scope: PharmacyScope, action: string) {
  if (scope.mode !== "all") {
    throw new HttpException(
      `Only a super admin can ${action}`,
      HttpStatus.FORBIDDEN,
    )
  }
}

export async function assertBranchAccess(scope: PharmacyScope, branchId: string) {
  const [branch] = await db
    .select({ pharmacyId: pharmacyBranches.pharmacyId })
    .from(pharmacyBranches)
    .where(eq(pharmacyBranches.id, branchId))
    .limit(1)
  if (!branch) throw new HttpException("Branch not found", HttpStatus.NOT_FOUND)
  assertPharmacyAccess(scope, branch.pharmacyId)
  return branch
}

export async function assertEmployeeAccess(scope: PharmacyScope, employeeId: string) {
  const [emp] = await db
    .select({ pharmacyId: pharmacyEmployees.pharmacyId })
    .from(pharmacyEmployees)
    .where(eq(pharmacyEmployees.id, employeeId))
    .limit(1)
  if (!emp) throw new HttpException("Employee record not found", HttpStatus.NOT_FOUND)
  assertPharmacyAccess(scope, emp.pharmacyId)
  return emp
}

export async function assertTransactionAccess(scope: PharmacyScope, transactionId: string) {
  const { posTransactions } = await import("@workspace/db")
  const { eq: eqOp } = await import("drizzle-orm")
  const [tx] = await db
    .select({ branchId: posTransactions.branchId })
    .from(posTransactions)
    .where(eqOp(posTransactions.id, transactionId))
    .limit(1)
  if (!tx) throw new HttpException("Transaction not found", HttpStatus.NOT_FOUND)
  await assertBranchAccess(scope, tx.branchId)
}

export function scopedPharmacyId(scope: PharmacyScope): string | undefined {
  return scope.mode === "single" ? scope.pharmacyId : undefined
}
