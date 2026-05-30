"use client"

import { useMemo, useState } from "react"
import { Link, useRoute } from "wouter"
import { AdminShell } from "./admin-shell"
import { useStickyNotes, makeStickyNote, type StickyNote } from "@/lib/doctors-store"
import { useEffectivePermissions } from "@/lib/permissions"
import { ArrowLeft, NotebookPen, Pin, Trash2, Save, Pencil, X, StickyNote as StickyIcon } from "lucide-react"

const WINE = "#3D0814"
const ACCENT = "#F97316"
const ACCENT_RED = "#B91C1C"

const COLORS: StickyNote["color"][] = ["yellow", "wine", "orange", "blue"]

const COLOR_BG: Record<StickyNote["color"], string> = {
  yellow: "#FEF3C7",
  wine:   "#FBE3E8",
  orange: "#FFE4D6",
  blue:   "#DBEAFE",
}
const COLOR_TEXT: Record<StickyNote["color"], string> = {
  yellow: "#7C2D12",
  wine:   "#3D0814",
  orange: "#9A3412",
  blue:   "#1E3A8A",
}

/**
 * Patient detail page — focused on the clinical surfaces that doctors and
 * pharmacists actually need. Sticky notes live here as the team's shared
 * memory about the patient, persisted under `patient-notes:<patientId>`.
 *
 * Routed at `/admin/patients/:id` from App.tsx. The id is treated as opaque
 * (patient/customer id from CRM data once it's persisted).
 */
export function AdminPatientDetail() {
  const [, params] = useRoute("/admin/patients/:id")
  const patientId = params?.id ?? "unknown"
  return <PatientDetailInner patientId={patientId} />
}

function PatientDetailInner({ patientId }: { patientId: string }) {
  const { items, upsert, remove } = useStickyNotes(patientId)
  const eff = useEffectivePermissions()
  const [draft, setDraft] = useState("")
  const [color, setColor] = useState<StickyNote["color"]>("yellow")

  const sorted = useMemo(
    () => items.slice().sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt.localeCompare(a.createdAt)),
    [items],
  )
  const pinnedCount = useMemo(() => items.filter((n) => n.pinned).length, [items])

  function addNote() {
    if (!draft.trim()) return
    upsert(makeStickyNote({
      patientId,
      body: draft.trim(),
      authorName: eff.user?.name ?? "Doctor",
      authorRole: eff.role?.name?.toLowerCase().includes("pharm") ? "pharmacist"
        : eff.role?.name?.toLowerCase().includes("doctor") ? "doctor" : "admin",
      color,
    }))
    setDraft("")
  }

  function togglePin(n: StickyNote) {
    // Pin is a transient flag, not a content edit — leave updatedAt untouched so
    // the "edited" marker stays meaningful (only body/color edits flip it).
    upsert({ ...n, pinned: !n.pinned })
  }

  function saveEdit(n: StickyNote, body: string, c: StickyNote["color"]) {
    upsert({ ...n, body: body.trim(), color: c, updatedAt: new Date().toISOString() })
  }

  return (
    <AdminShell title={`Patient · ${patientId}`}>
      <div className="mb-6">
        <Link href="/admin/customers" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to customers
        </Link>
        <h1 className="mt-2 text-2xl font-bold flex items-center gap-2" style={{ color: WINE }}>
          <NotebookPen className="h-6 w-6" /> Patient {patientId}
        </h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Shared clinical memory for this patient. Sticky notes are visible to every doctor and pharmacist on the
          care team — keep them factual and concise.
        </p>
        <div className="mt-4 flex items-center gap-3 flex-wrap">
          <Stat icon={StickyIcon} label="Notes" value={items.length} />
          <Stat icon={Pin} label="Pinned" value={pinnedCount} accent />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
        {/* Composer */}
        <section className="rounded-xl border border-border bg-white p-5 shadow-sm self-start">
          <h2 className="text-sm font-bold mb-3" style={{ color: WINE }}>Add a sticky note</h2>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={5}
            placeholder="e.g. Allergic to penicillin · prefers liquid medication · spoke with daughter on…"
            className="w-full px-3 py-2 text-sm border border-border rounded-md bg-white focus:outline-none focus:border-foreground resize-none"
          />
          <div className="mt-3 flex items-center gap-2">
            <ColorSwatches value={color} onChange={setColor} />
            <button
              type="button"
              onClick={addNote}
              disabled={!draft.trim()}
              className="ml-auto inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-xs font-semibold text-white shadow-sm disabled:opacity-40"
              style={{ background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_RED})` }}
            >
              <Save className="h-3.5 w-3.5" /> Save note
            </button>
          </div>
        </section>

        {/* Notes */}
        <section>
          {sorted.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-white p-10 text-center">
              <NotebookPen className="h-7 w-7 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-semibold" style={{ color: WINE }}>No notes yet</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Add the first sticky note so the rest of the care team has context for this patient.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {sorted.map((n) => (
                <NoteCard
                  key={n.id}
                  note={n}
                  onTogglePin={() => togglePin(n)}
                  onSave={(body, c) => saveEdit(n, body, c)}
                  onDelete={() => { if (confirm("Delete this note?")) remove(n.id) }}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </AdminShell>
  )
}

function NoteCard({ note, onTogglePin, onSave, onDelete }: {
  note: StickyNote
  onTogglePin: () => void
  onSave: (body: string, color: StickyNote["color"]) => void
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [body, setBody] = useState(note.body)
  const [color, setColor] = useState<StickyNote["color"]>(note.color)
  const edited = note.updatedAt && note.createdAt && note.updatedAt !== note.createdAt

  function begin() {
    setBody(note.body)
    setColor(note.color)
    setEditing(true)
  }

  function commit() {
    if (!body.trim()) return
    onSave(body, color)
    setEditing(false)
  }

  return (
    <article
      className="rounded-xl p-4 shadow-sm border border-border/40 relative"
      style={{ background: COLOR_BG[editing ? color : note.color], color: COLOR_TEXT[editing ? color : note.color] }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-[10px] uppercase tracking-wider font-bold">
          {note.authorName} · {note.authorRole}
        </p>
        <div className="flex items-center gap-1">
          {editing ? (
            <>
              <button onClick={commit} aria-label="Save note" className="p-1 rounded-md hover:bg-black/5" disabled={!body.trim()}>
                <Save className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => setEditing(false)} aria-label="Cancel edit" className="p-1 rounded-md hover:bg-black/5">
                <X className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onTogglePin}
                aria-label={note.pinned ? "Unpin" : "Pin"}
                className={`p-1 rounded-md hover:bg-black/5 ${note.pinned ? "" : "opacity-50"}`}
              >
                <Pin className="h-3.5 w-3.5" />
              </button>
              <button onClick={begin} aria-label="Edit note" className="p-1 rounded-md hover:bg-black/5">
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button onClick={onDelete} aria-label="Delete note" className="p-1 rounded-md hover:bg-black/5">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {editing ? (
        <div className="space-y-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            autoFocus
            className="w-full px-2.5 py-2 text-sm rounded-md bg-white/70 border border-black/10 focus:outline-none focus:border-black/30 resize-none"
            style={{ color: COLOR_TEXT[color] }}
          />
          <ColorSwatches value={color} onChange={setColor} small />
        </div>
      ) : (
        <p className="text-sm whitespace-pre-wrap leading-relaxed">{note.body}</p>
      )}

      <p className="mt-3 text-[10px] opacity-75">
        {new Date(note.createdAt).toLocaleString()}
        {edited && !editing && <span> · edited</span>}
      </p>
    </article>
  )
}

function ColorSwatches({ value, onChange, small }: {
  value: StickyNote["color"]
  onChange: (c: StickyNote["color"]) => void
  small?: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      {!small && <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Colour</span>}
      {COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          aria-label={`Colour ${c}`}
          className={`${small ? "h-5 w-5" : "h-6 w-6"} rounded-full border-2 transition-all ${value === c ? "scale-110" : ""}`}
          style={{ background: COLOR_BG[c], borderColor: value === c ? WINE : "transparent" }}
        />
      ))}
    </div>
  )
}

function Stat({ icon: Icon, label, value, accent }: {
  icon: typeof Pin
  label: string
  value: number
  accent?: boolean
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1.5 shadow-sm">
      <Icon className="h-3.5 w-3.5" style={{ color: accent ? ACCENT_RED : WINE }} />
      <span className="text-sm font-bold" style={{ color: WINE }}>{value}</span>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
  )
}
