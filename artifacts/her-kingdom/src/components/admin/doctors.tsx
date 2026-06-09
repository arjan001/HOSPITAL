"use client"

import { useMemo, useState } from "react"
import { AdminShell } from "./admin-shell"
import { useDoctors, makeDoctor, type Doctor } from "@/lib/doctors-store"
import type { DoctorRecord } from "@/lib/doctors-client"
import { RequirePerm } from "@/lib/permissions"
import {
  Stethoscope, Plus, Pencil, Trash2, X, Check, ShieldCheck, Languages,
  Phone, Mail, BadgeCheck, Clock, Search, Send, Loader2,
} from "lucide-react"
import { toast } from "@/hooks/use-toast"

const WINE = "#3D0814"
const ACCENT = "#F97316"
const ACCENT_RED = "#B91C1C"

export function AdminDoctors() {
  const { items, records, upsert, remove, invite, isLoading, error } = useDoctors()
  const [invitingId, setInvitingId] = useState<string | null>(null)
  const recordById = useMemo(
    () => Object.fromEntries(records.map((r) => [r.id, r])) as Record<string, DoctorRecord>,
    [records],
  )
  const [q, setQ] = useState("")
  const [editing, setEditing] = useState<Doctor | null>(null)
  const [creating, setCreating] = useState(false)

  const visible = useMemo(() => {
    const ql = q.trim().toLowerCase()
    if (!ql) return items
    return items.filter((d) =>
      d.name.toLowerCase().includes(ql) ||
      d.specialization.toLowerCase().includes(ql) ||
      d.email.toLowerCase().includes(ql),
    )
  }, [items, q])

  const stats = useMemo(() => {
    const active = items.filter((d) => d.active).length
    const specialties = new Set(items.map((d) => d.specialization.trim()).filter(Boolean)).size
    const rates = items.map((d) => d.consultationRateKES).filter((n) => n > 0)
    const avgRate = rates.length ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length) : 0
    return { total: items.length, active, specialties, avgRate }
  }, [items])

  return (
    <AdminShell title="Doctors">
      <div className="flex items-start justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: WINE }}>
            <Stethoscope className="h-6 w-6" /> Doctors
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Verified doctors and pharmacists who run consultations and approve prescriptions on Shaniid RX.
          </p>
        </div>
        <RequirePerm perm={["users.manage", "consult.handle"]} hideWhenDenied>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full text-sm font-semibold text-white shadow-sm"
            style={{ background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_RED})` }}
          >
            <Plus className="h-4 w-4" /> Add doctor
          </button>
        </RequirePerm>
      </div>

      {items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <StatCard label="Doctors" value={String(stats.total)} icon={Stethoscope} />
          <StatCard label="Active" value={String(stats.active)} icon={Check} accent />
          <StatCard label="Specialties" value={String(stats.specialties)} icon={BadgeCheck} />
          <StatCard label="Avg rate" value={`KSh ${stats.avgRate.toLocaleString()}`} icon={Clock} />
        </div>
      )}

      <div className="relative max-w-sm mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, specialty or email…"
          className="w-full pl-9 pr-3 h-10 text-sm border border-border rounded-full focus:outline-none focus:border-foreground bg-white"
        />
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          Could not load doctors: {error.message}
        </div>
      )}
      {isLoading && items.length === 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading doctors…
        </div>
      )}

      {visible.length === 0 && !isLoading ? (
        <div className="rounded-xl border border-dashed border-border bg-white p-12 text-center">
          <Stethoscope className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm font-semibold" style={{ color: WINE }}>No doctors yet</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Add your first doctor or pharmacist so patients can request consultations and have their prescriptions verified.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((d) => (
            <article key={d.id} className="rounded-xl border border-border bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div
                  className="h-12 w-12 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                  style={{ background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_RED})` }}
                >
                  {d.avatarUrl
                    ? <img src={d.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
                    : d.name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase() || "DR"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold truncate" style={{ color: WINE }}>{d.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{d.title} · {d.specialization}</p>
                </div>
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                  style={{ background: d.active ? "#DCFCE7" : "#FEE2E2", color: d.active ? "#166534" : "#991B1B" }}
                >
                  <Check className="h-2.5 w-2.5" /> {d.active ? "Active" : "Off"}
                </span>
              </div>

              <p className="text-xs text-muted-foreground mt-3 line-clamp-3">{d.bio || "No bio provided."}</p>

              <dl className="mt-4 space-y-1.5 text-[11px]">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <BadgeCheck className="h-3 w-3" />
                  <span>License {d.licenseNumber || "—"}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Languages className="h-3 w-3" />
                  <span>{d.languages.join(", ") || "—"}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{d.availability.hours} · {d.availability.monFri ? "Mon–Fri" : ""}{d.availability.weekends ? " · Wknds" : ""}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-3 w-3" /> <span className="truncate">{d.email}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-3 w-3" /> <span>{d.phone}</span>
                </div>
              </dl>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold"
                    style={{ background: "#FFF1E6", color: ACCENT_RED }}
                  >
                    KSh {d.consultationRateKES.toLocaleString()} / session
                  </span>
                  <span className="text-[10px] text-muted-foreground capitalize">
                    Portal: {recordById[d.id]?.accountStatus ?? "none"}
                  </span>
                </div>
                <RequirePerm perm={["users.manage", "consult.handle"]} hideWhenDenied>
                  <div className="flex items-center gap-1">
                    {d.email && (
                      <button
                        type="button"
                        disabled={invitingId === d.id}
                        onClick={async () => {
                          setInvitingId(d.id)
                          try {
                            await invite(d.id)
                            toast({ title: "Invite sent", description: `Portal email sent to ${d.email}` })
                          } catch (e) {
                            toast({
                              title: "Invite failed",
                              description: e instanceof Error ? e.message : "Could not send invite",
                              variant: "destructive",
                            })
                          } finally {
                            setInvitingId(null)
                          }
                        }}
                        className="p-1.5 rounded-md hover:bg-orange-50 text-orange-700"
                        aria-label="Send portal invite"
                        title="Email password setup link"
                      >
                        {invitingId === d.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setEditing(d)}
                      className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
                      aria-label="Edit doctor"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!confirm(`Remove ${d.name} from the directory?`)) return
                        try {
                          await remove(d.id)
                          toast({ title: "Doctor removed" })
                        } catch (e) {
                          toast({
                            title: "Remove failed",
                            description: e instanceof Error ? e.message : "Could not remove",
                            variant: "destructive",
                          })
                        }
                      }}
                      className="p-1.5 rounded-md hover:bg-red-50 text-red-600"
                      aria-label="Remove doctor"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </RequirePerm>
              </div>
            </article>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <DoctorEditor
          initial={editing ?? makeDoctor({})}
          onClose={() => { setCreating(false); setEditing(null) }}
          onSave={async (d) => {
            try {
              await upsert(d)
              toast({ title: "Doctor saved" })
              setCreating(false)
              setEditing(null)
            } catch (e) {
              toast({
                title: "Save failed",
                description: e instanceof Error ? e.message : "Could not save",
                variant: "destructive",
              })
            }
          }}
        />
      )}
    </AdminShell>
  )
}

function DoctorEditor({ initial, onClose, onSave }: { initial: Doctor; onClose: () => void; onSave: (d: Doctor) => void }) {
  const [d, setD] = useState<Doctor>(initial)
  const [err, setErr] = useState<string | null>(null)

  function patch<K extends keyof Doctor>(k: K, v: Doctor[K]) {
    setD((prev) => ({ ...prev, [k]: v }))
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!d.name.trim()) return setErr("Name is required")
    if (!d.licenseNumber.trim()) return setErr("License number is required")
    if (!d.email.trim()) return setErr("Email is required")
    onSave({ ...d, updatedAt: new Date().toISOString() })
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <aside className="w-full max-w-lg bg-white border-l border-border flex flex-col shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-bold" style={{ color: WINE }}>
            {initial.id && initial.name ? "Edit doctor" : "Onboard a doctor"}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={submit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {err && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{err}</div>
          )}

          <Field label="Full name">
            <input className={inputCls} value={d.name} onChange={(e) => patch("name", e.target.value)} required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Title / qualification">
              <input className={inputCls} value={d.title} onChange={(e) => patch("title", e.target.value)} placeholder="MBChB" />
            </Field>
            <Field label="Specialization">
              <input className={inputCls} value={d.specialization} onChange={(e) => patch("specialization", e.target.value)} />
            </Field>
          </div>
          <Field label="License number" hint="Practising license from KMPDC or equivalent regulator.">
            <input className={inputCls} value={d.licenseNumber} onChange={(e) => patch("licenseNumber", e.target.value)} required />
          </Field>
          <Field label="Photo URL (optional)">
            <input className={inputCls} value={d.avatarUrl ?? ""} onChange={(e) => patch("avatarUrl", e.target.value)} placeholder="https://…" />
          </Field>
          <Field label="Short bio" hint="Shown to patients before the consultation.">
            <textarea
              rows={4}
              className={`${inputCls} resize-none`}
              value={d.bio}
              onChange={(e) => patch("bio", e.target.value)}
              placeholder="Calm, evidence-based care for…"
            />
          </Field>
          <Field label="Languages (comma-separated)">
            <input
              className={inputCls}
              value={d.languages.join(", ")}
              onChange={(e) => patch("languages", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
              placeholder="English, Swahili"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Consultation rate (KES)">
              <input
                type="number" min={0} step={50}
                className={inputCls}
                value={d.consultationRateKES}
                onChange={(e) => patch("consultationRateKES", Math.max(0, Number(e.target.value) || 0))}
              />
            </Field>
            <Field label="Hours">
              <input
                className={inputCls}
                value={d.availability.hours}
                onChange={(e) => patch("availability", { ...d.availability, hours: e.target.value })}
              />
            </Field>
          </div>
          <div className="flex gap-4 text-xs">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={d.availability.monFri}
                onChange={(e) => patch("availability", { ...d.availability, monFri: e.target.checked })} />
              Mon–Fri
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={d.availability.weekends}
                onChange={(e) => patch("availability", { ...d.availability, weekends: e.target.checked })} />
              Weekends
            </label>
            <label className="inline-flex items-center gap-2 ml-auto">
              <input type="checkbox" checked={d.active} onChange={(e) => patch("active", e.target.checked)} />
              Active (visible to patients)
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email">
              <input type="email" className={inputCls} value={d.email} onChange={(e) => patch("email", e.target.value)} required />
            </Field>
            <Field label="Phone">
              <input className={inputCls} value={d.phone} onChange={(e) => patch("phone", e.target.value)} placeholder="+254…" />
            </Field>
          </div>

          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800 flex gap-2">
            <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
            <span>
              By onboarding this practitioner you confirm their license has been verified against the regulator's
              public registry. Their bio is what patients see at booking.
            </span>
          </div>
        </form>
        <div className="border-t border-border px-6 py-4 flex justify-end gap-2 bg-muted/30">
          <button type="button" onClick={onClose} className="h-10 px-4 rounded-full text-sm font-semibold border border-border bg-white">
            Cancel
          </button>
          <button
            type="submit" onClick={submit}
            className="h-10 px-5 rounded-full text-sm font-semibold text-white"
            style={{ background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_RED})` }}
          >
            Save doctor
          </button>
        </div>
      </aside>
    </div>
  )
}

function StatCard({ label, value, icon: Icon, accent }: {
  label: string; value: string; icon: typeof Stethoscope; accent?: boolean
}) {
  return (
    <div className="rounded-xl border border-border bg-white p-4 shadow-sm flex items-center gap-3">
      <div
        className="h-9 w-9 rounded-lg flex items-center justify-center text-white flex-shrink-0"
        style={{ background: accent ? `linear-gradient(135deg, ${ACCENT}, ${ACCENT_RED})` : WINE }}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-lg font-bold leading-tight truncate" style={{ color: WINE }}>{value}</p>
        <p className="text-[11px] text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

const inputCls = "w-full px-3 py-2 text-sm border border-border rounded-md bg-white focus:outline-none focus:border-foreground"

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">{label}</span>
      {children}
      {hint && <span className="block text-[10px] text-muted-foreground mt-1">{hint}</span>}
    </label>
  )
}
