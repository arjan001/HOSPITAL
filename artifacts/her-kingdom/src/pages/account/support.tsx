import { useEffect, useMemo, useState } from "react"
import { Link } from "wouter"
import { useUser } from "@clerk/react"
import { TopBar } from "@/components/store/top-bar"
import { Navbar } from "@/components/store/navbar"
import { Footer } from "@/components/store/footer"
import { Seo } from "@/components/seo"
import {
  ArrowLeft, MessageCircle, Plus, Send, ShieldCheck, X, Pencil, Trash2,
} from "lucide-react"
import {
  useMyTickets,
  createMyTicket,
  replyMyTicket,
  updateMyTicket,
  deleteMyTicket,
  type ClientTicket,
} from "@/lib/notifications-client"

const WINE = "#3D0814"
const ACCENT = "#F97316"
const ACCENT_RED = "#B91C1C"
const CREAM = "#FFFBF5"

const STATUS_META: Record<ClientTicket["status"], { label: string; bg: string; color: string }> = {
  open:     { label: "Open",     bg: "#DBEAFE", color: "#1E40AF" },
  pending:  { label: "In progress", bg: "#FEF3C7", color: "#92400E" },
  resolved: { label: "Resolved", bg: "#DCFCE7", color: "#166534" },
  closed:   { label: "Closed",   bg: "#F3F4F6", color: "#4B5563" },
}

const CATEGORIES = [
  "general", "prescription", "order", "delivery", "billing", "complaint", "other",
] as const

function timeAgo(iso: string) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000
  if (d < 60) return "just now"
  if (d < 3600) return `${Math.floor(d / 60)}m ago`
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`
  return `${Math.floor(d / 86400)}d ago`
}

export default function AccountSupportPage() {
  const { user } = useUser()
  const { items, refresh, loading } = useMyTickets()
  const [openId, setOpenId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [editTicket, setEditTicket] = useState<ClientTicket | null>(null)
  const [deleteTicket, setDeleteTicket] = useState<ClientTicket | null>(null)
  const active = useMemo(() => items.find((t) => t.id === openId) ?? null, [items, openId])

  return (
    <>
      <Seo
        title="Support — Shaniid RX"
        description="Open a ticket or follow up on existing conversations with the Shaniid RX care team."
        canonicalPath="/account/support"
        noindex
      />
      <TopBar />
      <Navbar />
      <div className="min-h-screen" style={{ background: CREAM }}>
        <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <Link href="/account" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to account
            </Link>
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full text-sm font-semibold text-white shadow-sm"
              style={{ background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_RED})` }}
            >
              <Plus className="h-4 w-4" /> New ticket
            </button>
          </div>

          <div
            className="relative overflow-hidden rounded-2xl p-6 text-white shadow-lg"
            style={{ background: `linear-gradient(135deg, ${WINE} 0%, #6B0F1A 100%)` }}
          >
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-white/70">
              <ShieldCheck className="h-3.5 w-3.5" /> Calm, professional support
            </div>
            <h1 className="mt-1 text-2xl font-bold">Help & support</h1>
            <p className="mt-1 max-w-xl text-sm text-white/80">
              Open a ticket and a real pharmacist or our care team will reply. Your past conversations stay here so you can pick up where you left off.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-white shadow-sm">
            {loading ? (
              <div className="px-6 py-14 text-center text-sm text-muted-foreground">Loading your tickets…</div>
            ) : items.length === 0 ? (
              <div className="px-6 py-14 text-center space-y-2">
                <MessageCircle className="h-7 w-7 mx-auto text-muted-foreground" />
                <p className="text-sm font-semibold" style={{ color: WINE }}>No tickets yet</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Open your first ticket and our team will reply — usually within fifteen minutes during working hours.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {items.map((t) => (
                  <li key={t.id} className="flex items-center gap-2 px-5 py-4 hover:bg-muted/40 transition-colors">
                    <button
                      type="button"
                      onClick={() => setOpenId(t.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold" style={{ color: WINE }}>{t.shortId}</span>
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
                          style={{ background: STATUS_META[t.status].bg, color: STATUS_META[t.status].color }}
                        >
                          {STATUS_META[t.status].label}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-semibold truncate" style={{ color: WINE }}>{t.subject}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        Last update {timeAgo(t.updatedAt)} · {t.messages.length} message{t.messages.length === 1 ? "" : "s"}
                      </p>
                    </button>
                    <div className="flex flex-shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditTicket(t)}
                        aria-label={`Edit ticket ${t.shortId}`}
                        title="Edit ticket"
                        className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTicket(t)}
                        aria-label={`Delete ticket ${t.shortId}`}
                        title="Delete ticket"
                        className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted-foreground hover:text-red-600 hover:border-red-200 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {creating && (
        <CreateTicketModal
          defaultName={user?.fullName ?? ""}
          defaultEmail={user?.primaryEmailAddress?.emailAddress ?? ""}
          defaultPhone={user?.primaryPhoneNumber?.phoneNumber ?? ""}
          onClose={() => setCreating(false)}
          onCreated={async (t) => { setCreating(false); await refresh(); setOpenId(t.id) }}
        />
      )}

      {active && (
        <TicketThread
          ticket={active}
          onClose={() => setOpenId(null)}
          onRefresh={refresh}
        />
      )}

      {editTicket && (
        <EditTicketModal
          ticket={editTicket}
          onClose={() => setEditTicket(null)}
          onSaved={async () => { setEditTicket(null); await refresh() }}
        />
      )}

      {deleteTicket && (
        <DeleteTicketDialog
          ticket={deleteTicket}
          onClose={() => setDeleteTicket(null)}
          onDeleted={async () => {
            const removedId = deleteTicket.id
            setDeleteTicket(null)
            if (openId === removedId) setOpenId(null)
            await refresh()
          }}
        />
      )}

      <Footer />
    </>
  )
}

function CreateTicketModal({
  defaultName, defaultEmail, defaultPhone, onClose, onCreated,
}: {
  defaultName: string; defaultEmail: string; defaultPhone: string
  onClose: () => void; onCreated: (t: ClientTicket) => void
}) {
  const [name, setName] = useState(defaultName)
  const [email, setEmail] = useState(defaultEmail)
  const [phone, setPhone] = useState(defaultPhone)
  const [subject, setSubject] = useState("")
  const [category, setCategory] = useState<typeof CATEGORIES[number]>("general")
  const [message, setMessage] = useState("")
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    if (!subject.trim()) return setErr("Please add a short subject.")
    if (!message.trim()) return setErr("Please describe your question.")
    if (!email.trim()) return setErr("Please share an email so we can reply.")
    setBusy(true)
    const res = await createMyTicket({ subject, category, name, email, phone, message })
    setBusy(false)
    if ("error" in res) return setErr(res.error)
    onCreated(res)
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <aside className="w-full max-w-lg bg-white border-l border-border flex flex-col shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-bold" style={{ color: WINE }}>Open a new ticket</h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={submit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {err && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{err}</div>}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Your name">
              <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Category">
              <select value={category} onChange={(e) => setCategory(e.target.value as typeof CATEGORIES[number])} className={inputCls}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Email">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} required />
            </Field>
            <Field label="Phone (optional)">
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
            </Field>
          </div>
          <Field label="Subject">
            <input value={subject} onChange={(e) => setSubject(e.target.value)} className={inputCls} required />
          </Field>
          <Field label="Message">
            <textarea rows={6} value={message} onChange={(e) => setMessage(e.target.value)} className={`${inputCls} resize-none`} required />
          </Field>
        </form>
        <div className="border-t border-border px-6 py-4 flex justify-end gap-2 bg-muted/30">
          <button type="button" onClick={onClose} className="h-10 px-4 rounded-full text-sm font-semibold border border-border bg-white">Cancel</button>
          <button
            type="submit" onClick={submit} disabled={busy}
            className="h-10 px-5 rounded-full text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_RED})` }}
          >
            {busy ? "Sending…" : "Open ticket"}
          </button>
        </div>
      </aside>
    </div>
  )
}

function TicketThread({ ticket, onClose, onRefresh }: { ticket: ClientTicket; onClose: () => void; onRefresh: () => Promise<void> }) {
  const [reply, setReply] = useState("")
  const [busy, setBusy] = useState(false)

  async function send() {
    if (!reply.trim()) return
    setBusy(true)
    const next = await replyMyTicket(ticket.id, reply.trim())
    setBusy(false)
    if (next) { setReply(""); await onRefresh() }
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <aside className="w-full max-w-2xl bg-white border-l border-border flex flex-col shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {ticket.shortId} · {STATUS_META[ticket.status].label}
            </p>
            <h2 className="text-lg font-bold mt-1" style={{ color: WINE }}>{ticket.subject}</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3 bg-muted/20">
          {ticket.messages.map((m) => (
            <div key={m.id} className={`flex ${m.author === "customer" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                  m.author === "customer" ? "text-white" : "bg-white border border-border"
                }`}
                style={m.author === "customer" ? { background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_RED})` } : undefined}
              >
                <p className={`text-[10px] uppercase tracking-wider font-bold mb-1 ${m.author === "customer" ? "text-white/80" : "text-muted-foreground"}`}>
                  {m.authorName}
                </p>
                <p className="whitespace-pre-wrap">{m.body}</p>
                <p className={`mt-1 text-[10px] ${m.author === "customer" ? "text-white/70" : "text-muted-foreground"}`}>
                  {timeAgo(m.createdAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-border px-6 py-4 bg-white">
          {ticket.status === "closed" ? (
            <p className="text-xs text-muted-foreground text-center">This ticket is closed. Open a new ticket for a fresh question.</p>
          ) : (
            <>
              <textarea
                rows={3} value={reply} onChange={(e) => setReply(e.target.value)}
                placeholder="Type your reply…"
                className="w-full px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:border-foreground resize-none"
              />
              <div className="mt-2 flex justify-end">
                <button
                  type="button" onClick={send} disabled={!reply.trim() || busy}
                  className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full text-sm font-semibold text-white shadow-sm disabled:opacity-40"
                  style={{ background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_RED})` }}
                >
                  <Send className="h-3.5 w-3.5" /> {busy ? "Sending…" : "Send"}
                </button>
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  )
}

function EditTicketModal({ ticket, onClose, onSaved }: {
  ticket: ClientTicket; onClose: () => void; onSaved: () => void
}) {
  const startCategory = (CATEGORIES as readonly string[]).includes(ticket.category)
    ? (ticket.category as typeof CATEGORIES[number])
    : "general"
  const [subject, setSubject] = useState(ticket.subject)
  const [category, setCategory] = useState<typeof CATEGORIES[number]>(startCategory)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    if (!subject.trim()) return setErr("Please add a short subject.")
    setBusy(true)
    const res = await updateMyTicket(ticket.id, { subject: subject.trim(), category })
    setBusy(false)
    if ("error" in res) return setErr(res.error)
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <aside className="w-full max-w-lg bg-white border-l border-border flex flex-col shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-bold" style={{ color: WINE }}>Edit ticket {ticket.shortId}</h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={submit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {err && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{err}</div>}
          <Field label="Subject">
            <input value={subject} onChange={(e) => setSubject(e.target.value)} className={inputCls} required />
          </Field>
          <Field label="Category">
            <select value={category} onChange={(e) => setCategory(e.target.value as typeof CATEGORIES[number])} className={inputCls}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
        </form>
        <div className="border-t border-border px-6 py-4 flex justify-end gap-2 bg-muted/30">
          <button type="button" onClick={onClose} className="h-10 px-4 rounded-full text-sm font-semibold border border-border bg-white">Cancel</button>
          <button
            type="submit" onClick={submit} disabled={busy}
            className="h-10 px-5 rounded-full text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_RED})` }}
          >
            {busy ? "Saving…" : "Save changes"}
          </button>
        </div>
      </aside>
    </div>
  )
}

function DeleteTicketDialog({ ticket, onClose, onDeleted }: {
  ticket: ClientTicket; onClose: () => void; onDeleted: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function confirm() {
    setErr(null)
    setBusy(true)
    const ok = await deleteMyTicket(ticket.id)
    setBusy(false)
    if (!ok) return setErr("Could not delete this ticket. Please try again.")
    onDeleted()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="px-6 py-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-red-50 text-red-600">
              <Trash2 className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-bold" style={{ color: WINE }}>Delete ticket {ticket.shortId}?</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            This permanently removes “{ticket.subject}” and its entire conversation. This cannot be undone.
          </p>
          {err && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{err}</div>}
        </div>
        <div className="border-t border-border px-6 py-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-10 px-4 rounded-full text-sm font-semibold border border-border bg-white">Cancel</button>
          <button
            type="button" onClick={confirm} disabled={busy}
            className="h-10 px-5 rounded-full text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
          >
            {busy ? "Deleting…" : "Delete ticket"}
          </button>
        </div>
      </div>
    </div>
  )
}

const inputCls = "w-full px-3 py-2 text-sm border border-border rounded-md bg-white focus:outline-none focus:border-foreground"

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">{label}</span>
      {children}
    </label>
  )
}
