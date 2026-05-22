/**
 * Lightweight SWR-flavored client for the api-nest notifications + tickets
 * surface. Used by the bell in every shell and the customer support page.
 *
 * Falls back to an empty list (rather than throwing) when the backend is
 * unreachable — the bell should never break the page that hosts it.
 */
import { useEffect, useState, useCallback } from "react"

export type ClientNotification = {
  id: string
  audience: string
  module: string
  level: "info" | "success" | "warning" | "alert"
  title: string
  body?: string
  href?: string
  createdAt: string
  read: boolean
}

export type ClientTicketMessage = {
  id: string
  author: "customer" | "staff"
  authorName: string
  body: string
  createdAt: string
}

export type ClientTicket = {
  id: string
  shortId: string
  subject: string
  category: string
  status: "open" | "pending" | "resolved" | "closed"
  customer: { sessionId: string; name: string; email: string; phone?: string }
  messages: ClientTicketMessage[]
  createdAt: string
  updatedAt: string
}

const BASE = "/api/v2"

async function safeJson<T>(p: Promise<Response>, fallback: T): Promise<T> {
  try {
    const r = await p
    if (!r.ok) return fallback
    return (await r.json()) as T
  } catch {
    return fallback
  }
}

/* ---------- Notifications: customer ---------- */

export function useMyNotifications(pollMs = 30_000) {
  const [data, setData] = useState<{ items: ClientNotification[]; unread: number }>({ items: [], unread: 0 })
  const [loading, setLoading] = useState(true)
  const refresh = useCallback(async () => {
    const r = await safeJson<{ items: ClientNotification[]; unread: number }>(
      fetch(`${BASE}/me/notifications?limit=30`, { credentials: "include" }),
      { items: [], unread: 0 },
    )
    setData(r)
    setLoading(false)
  }, [])
  useEffect(() => {
    void refresh()
    const t = setInterval(() => { void refresh() }, pollMs)
    return () => clearInterval(t)
  }, [refresh, pollMs])
  const markAllRead = useCallback(async () => {
    await fetch(`${BASE}/me/notifications/read`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true }),
    }).catch(() => {})
    void refresh()
  }, [refresh])
  return { ...data, loading, refresh, markAllRead }
}

/* ---------- Notifications: admin/doctor/pharmacist ---------- */

export function useAdminNotifications(audience: "admin" | "doctor" | "pharmacist" = "admin", pollMs = 30_000) {
  const [data, setData] = useState<{ items: ClientNotification[]; unread: number }>({ items: [], unread: 0 })
  const refresh = useCallback(async () => {
    const r = await safeJson<{ items: ClientNotification[]; unread: number }>(
      fetch(`${BASE}/admin/notifications?audience=${audience}`, { credentials: "include" }),
      { items: [], unread: 0 },
    )
    setData(r)
  }, [audience])
  useEffect(() => {
    void refresh()
    const t = setInterval(() => { void refresh() }, pollMs)
    return () => clearInterval(t)
  }, [refresh, pollMs])
  const markAllRead = useCallback(async () => {
    await fetch(`${BASE}/admin/notifications/read`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify({ audience, all: true }),
    }).catch(() => {})
    void refresh()
  }, [audience, refresh])
  return { ...data, refresh, markAllRead }
}

export async function pushAdminNotification(input: {
  audience?: "admin" | "doctor" | "pharmacist"
  module: string
  level?: "info" | "success" | "warning" | "alert"
  title: string
  body?: string
  href?: string
}) {
  await fetch(`${BASE}/admin/notifications`, {
    method: "POST", credentials: "include",
    headers: { "Content-Type": "application/json" }, body: JSON.stringify(input),
  }).catch(() => {})
}

/* ---------- Support tickets ---------- */

export function useMyTickets() {
  const [items, setItems] = useState<ClientTicket[]>([])
  const [loading, setLoading] = useState(true)
  const refresh = useCallback(async () => {
    const r = await safeJson<ClientTicket[]>(
      fetch(`${BASE}/me/support/tickets`, { credentials: "include" }), [],
    )
    setItems(r); setLoading(false)
  }, [])
  useEffect(() => { void refresh() }, [refresh])
  return { items, loading, refresh }
}

export async function createMyTicket(input: {
  subject: string; category?: string; name: string; email: string; phone?: string; message: string
}): Promise<ClientTicket | { error: string }> {
  try {
    const r = await fetch(`${BASE}/me/support/tickets`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify(input),
    })
    if (!r.ok) return { error: `Server ${r.status}` }
    return (await r.json()) as ClientTicket
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Network error" }
  }
}

export async function replyMyTicket(ticketId: string, body: string, authorName?: string): Promise<ClientTicket | null> {
  try {
    const r = await fetch(`${BASE}/me/support/tickets/${ticketId}/messages`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body, authorName }),
    })
    if (!r.ok) return null
    return (await r.json()) as ClientTicket
  } catch { return null }
}

export function useAdminTickets() {
  const [items, setItems] = useState<ClientTicket[]>([])
  const [loading, setLoading] = useState(true)
  const refresh = useCallback(async () => {
    const r = await safeJson<ClientTicket[]>(
      fetch(`${BASE}/admin/support/tickets`, { credentials: "include" }), [],
    )
    setItems(r); setLoading(false)
  }, [])
  useEffect(() => {
    void refresh()
    const t = setInterval(() => { void refresh() }, 30_000)
    return () => clearInterval(t)
  }, [refresh])
  return { items, loading, refresh }
}

export async function adminReplyTicket(ticketId: string, body: string, authorName?: string): Promise<ClientTicket | null> {
  try {
    const r = await fetch(`${BASE}/admin/support/tickets/${ticketId}/messages`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body, authorName }),
    })
    if (!r.ok) return null
    return (await r.json()) as ClientTicket
  } catch { return null }
}

export async function adminSetTicketStatus(ticketId: string, status: ClientTicket["status"]): Promise<ClientTicket | null> {
  try {
    const r = await fetch(`${BASE}/admin/support/tickets/${ticketId}/status`, {
      method: "PATCH", credentials: "include",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
    })
    if (!r.ok) return null
    return (await r.json()) as ClientTicket
  } catch { return null }
}
