import { useEffect, useRef } from "react"
import { useUser } from "@clerk/react"
import { cmsStore } from "@/lib/cms-store"
import { apiNest } from "@/lib/api-nest"

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
  }
  const others = all.filter((c) => c.id !== input.id)
  writeCustomers([next, ...others])
  return next
}

export function deleteCustomer(id: string): void {
  writeCustomers(readCustomers().filter((c) => c.id !== id))
}

export function useCustomerMirror(): void {
  const { isSignedIn, user } = useUser()
  const lastIdRef = useRef<string | null>(null)

  useEffect(() => {
    // Reset the dedupe ref when the user signs out so the next sign-in
    // re-mirrors and refreshes lastSeenAt.
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
    })

    // Mirror into the NestJS Profile module so server-side customer-facing
    // endpoints (orders, addresses, wishlist) see the user's identity.
    // Best-effort: if the server is unreachable, we still have the cmsStore
    // mirror so admin views work.
    void apiNest
      .updateMe({ fullName, email, phone })
      .catch(() => undefined)
  }, [isSignedIn, user])
}
