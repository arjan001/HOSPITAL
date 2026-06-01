"use client"

import { useMemo, useState } from "react"
import { AdminShell } from "./admin-shell"
import {
  useContactInquiries,
  updateContactInquiry,
  deleteContactInquiry,
  type ContactInquiry,
  type InquiryStatus,
  type InquiryCategory,
} from "@/lib/contact-inquiries-client"
import {
  Inbox,
  Search,
  Mail,
  Phone,
  User,
  Calendar,
  Tag,
  X,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  MessageSquare,
} from "lucide-react"

export type { InquiryStatus, InquiryCategory, ContactInquiry }

const STATUS_META: Record<InquiryStatus, { label: string; cls: string; icon: any }> = {
  "new":         { label: "New",         cls: "bg-blue-50 text-blue-700 border border-blue-200",       icon: AlertCircle },
  "in-progress": { label: "In progress", cls: "bg-amber-50 text-amber-700 border border-amber-200",    icon: Clock },
  "resolved":    { label: "Resolved",    cls: "bg-green-50 text-green-700 border border-green-200",    icon: CheckCircle2 },
  "spam":        { label: "Spam",        cls: "bg-neutral-100 text-neutral-600 border border-neutral-200", icon: Trash2 },
}

const CATEGORY_LABEL: Record<InquiryCategory, string> = {
  general: "General",
  prescription: "Prescription",
  order: "Order",
  delivery: "Delivery",
  product: "Product",
  billing: "Billing",
  complaint: "Complaint",
  partnership: "Partnership",
  other: "Other",
}

function timeAgo(iso: string) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000
  if (d < 60) return "just now"
  if (d < 3600) return `${Math.floor(d / 60)}m ago`
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`
  return `${Math.floor(d / 86400)}d ago`
}

export function AdminContactInquiries() {
  const { items: inquiries, loading, error, refresh } = useContactInquiries()
  const [filter, setFilter] = useState<"all" | InquiryStatus>("all")
  const [q, setQ] = useState("")
  const [activeId, setActiveId] = useState<string | null>(null)
  const [noteDraft, setNoteDraft] = useState<{ id: string; value: string } | null>(null)
  const [mutationError, setMutationError] = useState<string | null>(null)

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: inquiries.length, new: 0, "in-progress": 0, resolved: 0, spam: 0 }
    for (const i of inquiries) c[i.status] = (c[i.status] ?? 0) + 1
    return c
  }, [inquiries])

  const visible = useMemo(() => {
    const ql = q.trim().toLowerCase()
    return inquiries
      .filter((i) => filter === "all" || i.status === filter)
      .filter((i) =>
        !ql ||
        i.fullName.toLowerCase().includes(ql) ||
        i.email.toLowerCase().includes(ql) ||
        i.phone.toLowerCase().includes(ql) ||
        i.subject.toLowerCase().includes(ql) ||
        i.message.toLowerCase().includes(ql)
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [inquiries, filter, q])

  const active = inquiries.find((i) => i.id === activeId) || null

  async function update(id: string, patch: { status?: InquiryStatus; internalNote?: string; category?: InquiryCategory }) {
    const res = await updateContactInquiry(id, patch)
    if (!res) {
      setMutationError("Couldn't save that change. Check your admin sign-in and try again.")
      return
    }
    setMutationError(null)
    await refresh()
  }
  async function remove(id: string) {
    const ok = await deleteContactInquiry(id)
    if (!ok) {
      setMutationError("Couldn't delete that enquiry. Check your admin sign-in and try again.")
      return
    }
    setMutationError(null)
    if (activeId === id) setActiveId(null)
    await refresh()
  }

  return (
    <AdminShell title="Contact Inquiries">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Inbox className="h-6 w-6" /> Contact Inquiries
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Messages submitted from the public contact page. Triage, reply offline and mark resolved.
          </p>
        </div>
      </div>

      {mutationError && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {mutationError}
        </div>
      )}

      {/* Filter chips + search */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {(["all", "new", "in-progress", "resolved", "spam"] as const).map((k) => {
          const isActive = filter === k
          const label = k === "all" ? "All" : STATUS_META[k].label
          return (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                isActive
                  ? "bg-foreground text-background border-foreground"
                  : "bg-background text-foreground border-border hover:bg-muted"
              }`}
            >
              {label} <span className={isActive ? "opacity-70" : "text-muted-foreground"}>({counts[k] ?? 0})</span>
            </button>
          )
        })}

        <div className="relative ml-auto w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, email, phone or text…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-full focus:outline-none focus:border-foreground"
          />
        </div>
      </div>

      {/* List */}
      <div className="border border-border rounded-md overflow-hidden bg-background">
        <div className="hidden sm:grid grid-cols-[1.4fr_1.4fr_0.9fr_1.5fr_0.9fr_0.7fr_0.6fr] gap-4 px-5 py-3 bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
          <div>Patient</div>
          <div>Contact</div>
          <div>Category</div>
          <div>Subject</div>
          <div>Status</div>
          <div>Received</div>
          <div className="text-right">Action</div>
        </div>

        {loading && inquiries.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">
            Loading inquiries…
          </div>
        ) : error && inquiries.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-red-600">
            Couldn't load inquiries ({error}). Check your admin sign-in and try again.
          </div>
        ) : visible.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">
            No inquiries match your filters.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {visible.map((i) => {
              const meta = STATUS_META[i.status]
              return (
                <li
                  key={i.id}
                  className="grid grid-cols-1 sm:grid-cols-[1.4fr_1.4fr_0.9fr_1.5fr_0.9fr_0.7fr_0.6fr] gap-2 sm:gap-4 px-5 py-4 items-center hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => setActiveId(i.id)}
                >
                  <div>
                    <div className="text-sm font-medium">{i.fullName}</div>
                    {i.isExistingPatient && (
                      <div className="text-[11px] text-muted-foreground mt-0.5">Patient {i.patientId || "—"}</div>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <div>{i.email}</div>
                    <div>{i.phone}</div>
                  </div>
                  <div className="text-xs">
                    <span className="px-2 py-0.5 rounded-full bg-muted text-foreground">
                      {CATEGORY_LABEL[i.category]}
                    </span>
                  </div>
                  <div className="text-sm truncate" title={i.subject}>{i.subject}</div>
                  <div>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${meta.cls}`}>
                      <meta.icon className="h-3 w-3" /> {meta.label}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">{timeAgo(i.createdAt)}</div>
                  <div className="text-right">
                    <button
                      onClick={(e) => { e.stopPropagation(); setActiveId(i.id) }}
                      className="text-xs font-medium hover:underline"
                    >
                      Open →
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Detail Drawer */}
      {active && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setActiveId(null)} />
          <aside className="w-full max-w-xl bg-background border-l border-border flex flex-col shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Inquiry · {active.id}
                </p>
                <h2 className="text-lg font-semibold mt-1">{active.subject}</h2>
              </div>
              <button onClick={() => setActiveId(null)} className="p-1 hover:bg-muted rounded">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* Status */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2">Status</p>
                <div className="flex flex-wrap gap-2">
                  {(["new", "in-progress", "resolved", "spam"] as const).map((s) => {
                    const m = STATUS_META[s]
                    const on = active.status === s
                    return (
                      <button
                        key={s}
                        onClick={() => update(active.id, { status: s })}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                          on ? m.cls : "bg-background text-foreground border-border hover:bg-muted"
                        }`}
                      >
                        <m.icon className="h-3 w-3" /> {m.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Patient details */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2">From</p>
                <div className="border border-border rounded-md divide-y divide-border text-sm">
                  <div className="flex items-center gap-3 px-4 py-2.5">
                    <User className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="text-muted-foreground w-28">Full name</span>
                    <span className="font-medium">{active.fullName}</span>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-2.5">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="text-muted-foreground w-28">Email</span>
                    <a href={`mailto:${active.email}`} className="font-medium underline underline-offset-4">{active.email}</a>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-2.5">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="text-muted-foreground w-28">Phone</span>
                    <a href={`tel:${active.phone}`} className="font-medium underline underline-offset-4">{active.phone}</a>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-2.5">
                    <MessageSquare className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="text-muted-foreground w-28">Prefers</span>
                    <span className="font-medium capitalize">{active.preferredContact}</span>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-2.5">
                    <Tag className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="text-muted-foreground w-28">Category</span>
                    <span className="font-medium">{CATEGORY_LABEL[active.category]}</span>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-2.5">
                    <User className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="text-muted-foreground w-28">Patient on file</span>
                    <span className="font-medium">{active.isExistingPatient ? `Yes${active.patientId ? ` · ${active.patientId}` : ""}` : "No"}</span>
                  </div>
                  {active.dob && (
                    <div className="flex items-center gap-3 px-4 py-2.5">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="text-muted-foreground w-28">Date of birth</span>
                      <span className="font-medium">{active.dob}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 px-4 py-2.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="text-muted-foreground w-28">Consent</span>
                    <span className="font-medium">{active.consent ? "Granted" : "Not given"}</span>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-2.5">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="text-muted-foreground w-28">Received</span>
                    <span className="font-medium">{new Date(active.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Message */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2">Message</p>
                <div className="border border-border rounded-md p-4 text-sm whitespace-pre-wrap leading-relaxed bg-muted/20">
                  {active.message}
                </div>
              </div>

              {/* Internal note */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2">Internal note</p>
                <textarea
                  value={noteDraft?.id === active.id ? noteDraft.value : active.internalNote}
                  onChange={(e) => setNoteDraft({ id: active.id, value: e.target.value })}
                  onBlur={() => {
                    if (noteDraft?.id === active.id && noteDraft.value !== active.internalNote) {
                      void update(active.id, { internalNote: noteDraft.value })
                    }
                    setNoteDraft(null)
                  }}
                  rows={4}
                  placeholder="Add a note for your team — won't be visible to the customer. Saved when you click away."
                  className="w-full px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:border-foreground resize-none"
                />
              </div>

              {/* Quick actions */}
              <div className="flex flex-wrap gap-2">
                <a
                  href={`mailto:${active.email}?subject=Re: ${encodeURIComponent(active.subject)}`}
                  className="px-3 py-2 text-xs font-medium border border-border rounded-md hover:bg-muted inline-flex items-center gap-1"
                >
                  <Mail className="h-3.5 w-3.5" /> Reply by email
                </a>
                <a
                  href={`https://wa.me/${active.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent("Hello " + active.fullName + ", regarding your message about " + active.subject + " — ")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 text-xs font-medium border border-border rounded-md hover:bg-muted inline-flex items-center gap-1"
                >
                  <MessageSquare className="h-3.5 w-3.5" /> Reply on WhatsApp
                </a>
                <a
                  href={`tel:${active.phone}`}
                  className="px-3 py-2 text-xs font-medium border border-border rounded-md hover:bg-muted inline-flex items-center gap-1"
                >
                  <Phone className="h-3.5 w-3.5" /> Call
                </a>
                <button
                  onClick={() => { if (confirm("Delete this inquiry permanently?")) remove(active.id) }}
                  className="ml-auto px-3 py-2 text-xs font-medium border border-red-200 text-red-700 rounded-md hover:bg-red-50 inline-flex items-center gap-1"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}
    </AdminShell>
  )
}
