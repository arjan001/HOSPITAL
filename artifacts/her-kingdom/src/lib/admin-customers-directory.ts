/**
 * Merges cmsStore customer mirror with live partner accounts + org members
 * for the admin Customers directory.
 */
import { useMemo } from "react"
import useSWR from "swr"
import {
  readCustomers,
  type CustomerRecord,
  type CustomerStatus,
} from "@/lib/use-customer-mirror"
import {
  fetchAllAdminPartnerAccounts,
  useAdminPartnerMembers,
  type PartnerType,
  type PartnerAccount,
  type AdminPartnerMember,
} from "@/lib/partners-client"
import { useSyncExternalStore } from "react"
import { cmsStore } from "@/lib/cms-store"

export type AdminDirectoryRow = CustomerRecord & {
  rowKey: string
  /** Row exists only from partner API (not in cms mirror yet) */
  partnerOnly?: boolean
  /** Linked partner portal account id (for suspend via API) */
  partnerAccountId?: string
  /** Linked org member id */
  partnerMemberId?: string
  portalAccountStatus?: string
  memberStatus?: string
}

function subscribe(cb: () => void) {
  if (typeof window === "undefined") return () => {}
  const handler = () => cb()
  window.addEventListener("storage", handler)
  const interval = window.setInterval(cb, 2000)
  return () => {
    window.removeEventListener("storage", handler)
    window.clearInterval(interval)
  }
}

function useCmsCustomers(): CustomerRecord[] {
  useSyncExternalStore(subscribe, () => JSON.stringify(readCustomers()), () => "[]")
  return readCustomers()
}

function partnerLabel(type: PartnerType): string {
  if (type === "supplier") return "Supplier"
  if (type === "clinic") return "Clinic"
  return "Logistics"
}

function mapPortalStatusToCustomer(status: string): CustomerStatus {
  if (status === "suspended") return "disabled"
  return "active"
}

function mergeDirectory(
  cms: CustomerRecord[],
  accounts: PartnerAccount[],
  members: AdminPartnerMember[],
): AdminDirectoryRow[] {
  const byEmail = new Map<string, AdminDirectoryRow>()
  const byClerkId = new Map<string, AdminDirectoryRow>()

  for (const c of cms) {
    const row: AdminDirectoryRow = {
      ...c,
      status: c.status ?? "active",
      accountType: c.accountType ?? "customer",
      rowKey: `cms:${c.id}`,
    }
    if (c.email) byEmail.set(c.email.toLowerCase(), row)
    byClerkId.set(c.id, row)
  }

  for (const acc of accounts) {
    const email = acc.email.toLowerCase()
    const meta = (acc.metadata ?? {}) as Record<string, unknown>
    const clerkUserId = typeof meta.clerkUserId === "string" ? meta.clerkUserId : undefined
    const clerkOrgId = typeof meta.clerkOrgId === "string" ? meta.clerkOrgId : undefined
    const partnerType = acc.partnerType as PartnerType
    const patch: Partial<AdminDirectoryRow> = {
      accountType: "partner",
      partnerType,
      partnerId: acc.partnerId,
      partnerOrgName: acc.displayName,
      partnerRole: typeof meta.memberRole === "string" ? meta.memberRole : "owner",
      partnerAccountId: acc.id,
      portalAccountStatus: acc.status,
      status: mapPortalStatusToCustomer(acc.status),
      clerkOrgId,
    }

    const existing = (clerkUserId && byClerkId.get(clerkUserId)) || byEmail.get(email)
    if (existing) {
      Object.assign(existing, patch, {
        fullName: existing.fullName || acc.displayName,
        email: existing.email || acc.email,
      })
      existing.rowKey = `merged:${existing.id}`
    } else {
      const row: AdminDirectoryRow = {
        id: clerkUserId ?? acc.id,
        fullName: acc.displayName,
        firstName: "",
        lastName: "",
        email: acc.email,
        phone: "",
        source: "email",
        createdAt: acc.createdAt,
        lastSeenAt: acc.lastLoginAt ?? acc.createdAt,
        signupCount: 1,
        status: mapPortalStatusToCustomer(acc.status),
        accountType: "partner",
        partnerType,
        partnerId: acc.partnerId,
        partnerOrgName: acc.displayName,
        partnerRole: typeof meta.memberRole === "string" ? meta.memberRole : "owner",
        partnerAccountId: acc.id,
        portalAccountStatus: acc.status,
        clerkOrgId,
        rowKey: `partner-acc:${acc.id}`,
        partnerOnly: true,
      }
      byEmail.set(email, row)
      if (clerkUserId) byClerkId.set(clerkUserId, row)
    }
  }

  for (const m of members) {
    const email = m.email.toLowerCase()
    const existing = (m.clerkUserId && byClerkId.get(m.clerkUserId)) || byEmail.get(email)
    const partnerType = m.partnerType as PartnerType

    if (existing) {
      existing.partnerType = partnerType
      existing.partnerId = m.partnerId
      existing.partnerRole = m.role
      existing.clerkOrgId = m.clerkOrgId
      existing.partnerMemberId = m.id
      existing.memberStatus = m.status
      if (m.status === "suspended") existing.status = "disabled"
      if (!existing.partnerOrgName) existing.partnerOrgName = m.displayName
      continue
    }

    const row: AdminDirectoryRow = {
      id: m.clerkUserId ?? m.id,
      fullName: m.displayName || m.email,
      firstName: "",
      lastName: "",
      email: m.email,
      phone: "",
      source: "email",
      createdAt: m.createdAt,
      lastSeenAt: m.joinedAt ?? m.createdAt,
      signupCount: 1,
      status: m.status === "suspended" ? "disabled" : "active",
      accountType: "partner",
      partnerType,
      partnerId: m.partnerId,
      partnerOrgName: m.displayName,
      partnerRole: m.role,
      partnerMemberId: m.id,
      memberStatus: m.status,
      clerkOrgId: m.clerkOrgId,
      rowKey: `partner-mem:${m.id}`,
      partnerOnly: true,
    }
    byEmail.set(email, row)
    if (m.clerkUserId) byClerkId.set(m.clerkUserId, row)
  }

  return Array.from(byEmail.values()).sort(
    (a, b) => new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime(),
  )
}

export function useAdminCustomersDirectory() {
  const cms = useCmsCustomers()
  const membersQuery = useAdminPartnerMembers()
  const accountsQuery = useSWR("partner:admin:accounts:all", fetchAllAdminPartnerAccounts, {
    revalidateOnFocus: true,
  })

  const rows = useMemo(
    () => mergeDirectory(cms, accountsQuery.data ?? [], membersQuery.data ?? []),
    [cms, accountsQuery.data, membersQuery.data],
  )

  const stats = useMemo(() => {
    const customers = rows.filter((r) => r.accountType !== "partner").length
    const partners = rows.filter((r) => r.accountType === "partner").length
    const disabled = rows.filter((r) => r.status === "disabled").length
    const last24 = rows.filter((r) => {
      const t = new Date(r.createdAt).getTime()
      return Number.isFinite(t) && Date.now() - t < 24 * 3600 * 1000
    }).length
    return { total: rows.length, customers, partners, disabled, last24 }
  }, [rows])

  return {
    rows,
    stats,
    isLoading: accountsQuery.isLoading || membersQuery.isLoading,
    error: accountsQuery.error || membersQuery.error,
    refresh: () => {
      void accountsQuery.mutate()
      void membersQuery.mutate()
      cmsStore.set("customers", readCustomers())
    },
    partnerLabel,
  }
}
