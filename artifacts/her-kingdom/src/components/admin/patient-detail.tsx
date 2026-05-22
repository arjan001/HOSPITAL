"use client"

import { useMemo, useState } from "react"
import { Link, useRoute } from "wouter"
import { AdminShell } from "./admin-shell"
import { useStickyNotes, makeStickyNote, type StickyNote } from "@/lib/doctors-store"
import { useEffectivePermissions } from "@/lib/permissions"
import { ArrowLeft, NotebookPen, Pin, Trash2, Save } from "lucide-react"

const WINE = "#3D0814"
const ACCENT = "#F97316"
const ACCENT_RED = "#B91C1C"

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
    upsert({ ...n, pinned: !n.pinned, updatedAt: new Date().toISOString() })
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
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
        {/* Composer */}
        <section className="rounded-xl border border-border bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold mb-3" style={{ color: WINE }}>Add a sticky note</h2>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={5}
            placeholder="e.g. Allergic to penicillin · prefers liquid medication · spoke with daughter on…"
            className="w-full px-3 py-2 text-sm border border-border rounded-md bg-white focus:outline-none focus:border-foreground resize-none"
          />
          <div className="mt-3 flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Colour</span>
            {(["yellow", "wine", "orange", "blue"] as StickyNote["color"][]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={`Colour ${c}`}
                className={`h-6 w-6 rounded-full border-2 transition-all ${color === c ? "scale-110" : ""}`}
                style={{ background: COLOR_BG[c], borderColor: color === c ? WINE : "transparent" }}
              />
            ))}
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
                <article
                  key={n.id}
                  className="rounded-xl p-4 shadow-sm border border-border/40 relative"
                  style={{ background: COLOR_BG[n.color], color: COLOR_TEXT[n.color] }}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-[10px] uppercase tracking-wider font-bold">
                      {n.authorName} · {n.authorRole}
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => togglePin(n)}
                        aria-label={n.pinned ? "Unpin" : "Pin"}
                        className={`p-1 rounded-md hover:bg-black/5 ${n.pinned ? "" : "opacity-50"}`}
                      >
                        <Pin className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => { if (confirm("Delete this note?")) remove(n.id) }}
                        aria-label="Delete note"
                        className="p-1 rounded-md hover:bg-black/5"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{n.body}</p>
                  <p className="mt-3 text-[10px] opacity-75">{new Date(n.createdAt).toLocaleString()}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </AdminShell>
  )
}
