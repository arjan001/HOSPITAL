import { useEffect, useRef } from "react"
import { useUser } from "@clerk/react"
import { cmsStore } from "@/lib/cms-store"
import { apiNest } from "@/lib/api-nest"
import type { PartnerType } from "@/lib/partners-client"

export type CustomerAccountType = "customer" | "partner"
export type CustomerStatus = "active" | "disabled"

export type CustomerRecord = {
  id: string
  fullName: string
  firstName: string
  lastName: string
  email: string
  phone: string
  imageUrl?: string
  source: "email" | "google" | "phone" | "unknown"
  createdAt: string
  lastSeenAt: string
  signupCount: number
  /** active = can use storefront; disabled = admin-blocked (local flag) */
  status?: CustomerStatus
  disabledAt?: string | null
  accountType?: CustomerAccountType
  partnerType?: PartnerType
  partnerRole?: string
  partnerId?: string
  partnerOrgName?: string
  partnerAccountId?: string
  clerkOrgId?: string
  notes?: string
}

const KEY = "customers"

export function readCustomers(): CustomerRecord[] {
  return cmsStore.get<CustomerRecord[]>(KEY, [])
}

export function writeCustomers(rows: CustomerRecord[]): void {
  cmsStore.set(KEY, rows)
}

export function upsertCustomer(input: Partial<CustomerRecord> & { id: string }): CustomerRecord {
  const all = readCustomers()
  const now = new Date().toISOString()
  const existing = all.find((c) => c.id === input.id)
  const next: CustomerRecord = {
    id: input.id,
    fullName: input.fullName ?? existing?.fullName ?? "",
    firstName: input.firstName ?? existing?.firstName ?? "",
    lastName: input.lastName ?? existing?.lastName ?? "",
    email: input.email ?? existing?.email ?? "",
    phone: input.phone ?? existing?.phone ?? "",
    imageUrl: input.imageUrl ?? existing?.imageUrl,
    source: input.source ?? existing?.source ?? "unknown",
    createdAt: existing?.createdAt ?? input.createdAt ?? now,
    lastSeenAt: now,
    signupCount: (existing?.signupCount ?? 0) + 1,
    status: input.status ?? existing?.status ?? "active",
    disabledAt: input.disabledAt !== undefined ? input.disabledAt : existing?.disabledAt,
    accountType: input.accountType ?? existing?.accountType ?? "customer",
    partnerType: input.partnerType ?? existing?.partnerType,
    partnerRole: input.partnerRole ?? existing?.partnerRole,
    partnerId: input.partnerId ?? existing?.partnerId,
    partnerOrgName: input.partnerOrgName ?? existing?.partnerOrgName,
    partnerAccountId: input.partnerAccountId ?? existing?.partnerAccountId,
    clerkOrgId: input.clerkOrgId ?? existing?.clerkOrgId,
    notes: input.notes ?? existing?.notes,
  }
  const others = all.filter((c) => c.id !== input.id)
  writeCustomers([next, ...others])
  return next
}

export function updateCustomer(
  id: string,
  patch: Partial<Omit<CustomerRecord, "id">>,
): CustomerRecord | null {
  const all = readCustomers()
  const idx = all.findIndex((c) => c.id === id)
  if (idx < 0) return null
  const updated: CustomerRecord = { ...all[idx], ...patch, id }
  const next = [...all]
  next[idx] = updated
  writeCustomers(next)
  return updated
}

export function setCustomerDisabled(id: string, disabled: boolean): CustomerRecord | null {
  return updateCustomer(id, {
    status: disabled ? "disabled" : "active",
    disabledAt: disabled ? new Date().toISOString() : null,
  })
}

export function deleteCustomer(id: string): void {
  writeCustomers(readCustomers().filter((c) => c.id !== id))
}

const PARTNER_TYPES = new Set<string>(["supplier", "clinic", "logistics"])

function clerkPartnerMeta(user: ReturnType<typeof useUser>["user"]) {
  if (!user) return null
  const meta = (user.publicMetadata ?? {}) as Record<string, unknown>
  const partnerType = String(meta.partnerType ?? "")
  if (!PARTNER_TYPES.has(partnerType)) return null
  return {
    partnerType: partnerType as PartnerType,
    partnerId: typeof meta.partnerId === "string" ? meta.partnerId : undefined,
    clerkOrgId: typeof meta.clerkOrgId === "string" ? meta.clerkOrgId : undefined,
    memberRole: typeof meta.memberRole === "string" ? meta.memberRole : undefined,
  }
}

export function useCustomerMirror(): void {
  const { isSignedIn, user } = useUser()
  const lastIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!isSignedIn || !user) {
      lastIdRef.current = null
      return
    }
    if (lastIdRef.current === user.id) return
    lastIdRef.current = user.id

    const externalProviders = (user.externalAccounts ?? []).map((a) =>
      String(a.provider || "").toLowerCase(),
    )
    const source: CustomerRecord["source"] = externalProviders.some((p) => p.includes("google"))
      ? "google"
      : user.primaryEmailAddress
        ? "email"
        : user.primaryPhoneNumber
          ? "phone"
          : "unknown"

    const fullName = user.fullName || [user.firstName, user.lastName].filter(Boolean).join(" ")
    const email = user.primaryEmailAddress?.emailAddress || ""
    const phone = user.primaryPhoneNumber?.phoneNumber || ""
    const partner = clerkPartnerMeta(user)

    upsertCustomer({
      id: user.id,
      fullName,
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      email,
      phone,
      imageUrl: user.imageUrl,
      source,
      createdAt: user.createdAt ? new Date(user.createdAt as unknown as string).toISOString() : undefined,
      accountType: partner ? "partner" : "customer",
      partnerType: partner?.partnerType,
      partnerId: partner?.partnerId,
      clerkOrgId: partner?.clerkOrgId,
      partnerRole: partner?.memberRole,
    })

    if (!partner) {
      void apiNest.updateMe({ fullName, email, phone }).catch(() => undefined)
    }
  }, [isSignedIn, user])
}
