/**
 * Contact inquiries client — thin wrapper over the api-nest contact-inquiries
 * surface (`/api/v2/contact-inquiries` public submit + `/api/v2/admin/...`
 * triage). Admin reads/writes attach the signed admin token (adminAuthHeaders)
 * or they 503 in prod (AdminGuard fails closed).
 */
import { useCallback, useEffect, useState } from "react"
import { adminAuthHeaders } from "./api-client"

export type InquiryStatus = "new" | "in-progress" | "resolved" | "spam"
export type InquiryCategory =
  | "general" | "prescription" | "order" | "delivery"
  | "product" | "billing" | "complaint" | "partnership" | "other"

export type ContactInquiry = {
  id: string
  fullName: string
  email: string
  phone: string
  category: InquiryCategory
  subject: string
  message: string
  preferredContact: "email" | "phone" | "whatsapp"
  isExistingPatient: boolean
  patientId?: string | null
  dob?: string | null
  consent: boolean
  status: InquiryStatus
  internalNote: string
  source: string
  createdAt: string
  updatedAt: string
}

const BASE = "/api/v2"

export type SubmitInquiryInput = {
  fullName: string
  email: string
  phone?: string
  category?: InquiryCategory
  subject?: string
  message: string
  preferredContact?: "email" | "phone" | "whatsapp"
  isExistingPatient?: boolean
  patientId?: string
  dob?: string
  consent?: boolean
  source?: string
}

/** PUBLIC — submit an enquiry from the storefront contact form. */
export async function submitContactInquiry(
  input: SubmitInquiryInput,
): Promise<ContactInquiry | { error: string }> {
  try {
    const r = await fetch(`${BASE}/contact-inquiries`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
    if (!r.ok) {
      const j = await r.json().catch(() => null)
      return { error: (j && (j.detail || j.message)) || `Server ${r.status}` }
    }
    return (await r.json()) as ContactInquiry
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Network error" }
  }
}

/** ADMIN — live list of all enquiries (polled). */
export function useContactInquiries(pollMs = 30_000) {
  const [items, setItems] = useState<ContactInquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const r = await fetch(`${BASE}/admin/contact-inquiries`, {
        credentials: "include",
        headers: { ...adminAuthHeaders() },
      })
      if (!r.ok) {
        setError(`Server ${r.status}`)
        setLoading(false)
        return
      }
      setItems((await r.json()) as ContactInquiry[])
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
    const t = setInterval(() => { void refresh() }, pollMs)
    return () => clearInterval(t)
  }, [refresh, pollMs])

  return { items, loading, error, refresh }
}

export async function updateContactInquiry(
  id: string,
  patch: { status?: InquiryStatus; internalNote?: string; category?: InquiryCategory },
): Promise<ContactInquiry | null> {
  try {
    const r = await fetch(`${BASE}/admin/contact-inquiries/${encodeURIComponent(id)}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json", ...adminAuthHeaders() },
      body: JSON.stringify(patch),
    })
    if (!r.ok) return null
    return (await r.json()) as ContactInquiry
  } catch {
    return null
  }
}

export async function deleteContactInquiry(id: string): Promise<boolean> {
  try {
    const r = await fetch(`${BASE}/admin/contact-inquiries/${encodeURIComponent(id)}`, {
      method: "DELETE",
      credentials: "include",
      headers: { ...adminAuthHeaders() },
    })
    return r.ok
  } catch {
    return false
  }
}
