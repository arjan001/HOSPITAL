"use client"

import { useCallback, useEffect, useState } from "react"
import { AdminShell } from "./admin-shell"
import { apiAdminCarePacks, type CarePackMappingRow } from "@/lib/api-nest"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Plus, Pencil, Trash2, Layers, Package } from "lucide-react"

const WINE = "#3D0814"

function blank(): CarePackMappingRow {
  return {
    id: "",
    conditionKey: "",
    packSlug: "",
    packName: "",
    productSkus: [],
    priority: 0,
    active: true,
    notes: "",
    updatedAt: new Date().toISOString(),
  }
}

export function AdminCarePackMappings() {
  const [rows, setRows] = useState<CarePackMappingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modal, setModal] = useState<{ open: boolean; editing: CarePackMappingRow | null }>({
    open: false,
    editing: null,
  })
  const [skuText, setSkuText] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await apiAdminCarePacks.listMappings()
      setRows(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load mappings")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const openEdit = (row: CarePackMappingRow | null) => {
    const base = row ?? blank()
    setSkuText((base.productSkus ?? []).join(", "))
    setModal({ open: true, editing: base })
  }

  const save = async () => {
    const e = modal.editing
    if (!e) return
    const productSkus = skuText
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter(Boolean)
    const payload = {
      conditionKey: e.conditionKey.trim().toLowerCase(),
      packSlug: e.packSlug.trim(),
      packName: e.packName.trim(),
      productSkus,
      priority: Number(e.priority) || 0,
      active: e.active !== false,
      notes: e.notes?.trim() || undefined,
    }
    try {
      if (e.id) {
        await apiAdminCarePacks.updateMapping(e.id, payload)
      } else {
        await apiAdminCarePacks.createMapping(payload)
      }
      setModal({ open: false, editing: null })
      await load()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Save failed")
    }
  }

  const remove = async (id: string) => {
    if (!confirm("Remove this care pack mapping?")) return
    try {
      await apiAdminCarePacks.deleteMapping(id)
      await load()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed")
    }
  }

  return (
    <AdminShell title="Care Pack Mapping">
      <div className="space-y-6 max-w-6xl">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Business logic #4</p>
              <h2 className="text-lg font-serif mt-1" style={{ color: WINE }}>
                Condition → Care Pack mapping
              </h2>
              <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
                Maps assessment condition keys to curated care pack slugs and procurement SKUs.
                The storefront assessment and demand aggregation both read these rules.
              </p>
            </div>
            <Button type="button" onClick={() => openEdit(null)} className="gap-1.5">
              <Plus className="h-4 w-4" /> Add mapping
            </Button>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 rounded-lg border border-red-200 bg-red-50 p-3">{error}</p>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading mappings…</p>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-4 py-3 font-semibold">Condition</th>
                  <th className="px-4 py-3 font-semibold">Care pack</th>
                  <th className="px-4 py-3 font-semibold">SKUs</th>
                  <th className="px-4 py-3 font-semibold">Priority</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold w-28" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/20">
                    <td className="px-4 py-3 font-mono text-xs">{r.conditionKey}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{r.packName}</div>
                      <div className="text-xs text-muted-foreground">{r.packSlug}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {(r.productSkus ?? []).slice(0, 4).map((s) => (
                          <Badge key={s} variant="secondary" className="text-[10px] font-mono">
                            {s}
                          </Badge>
                        ))}
                        {(r.productSkus?.length ?? 0) > 4 && (
                          <Badge variant="outline" className="text-[10px]">
                            +{(r.productSkus?.length ?? 0) - 4}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">{r.priority}</td>
                    <td className="px-4 py-3">
                      <Badge variant={r.active ? "default" : "outline"}>{r.active ? "Active" : "Off"}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button type="button" size="icon" variant="ghost" onClick={() => openEdit(r)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button type="button" size="icon" variant="ghost" onClick={() => remove(r.id)}>
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No mappings yet — defaults seed on first API load when the database is available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-lg border border-dashed p-4 flex gap-3">
            <Layers className="h-8 w-8 shrink-0 opacity-60" style={{ color: WINE }} />
            <div>
              <p className="text-sm font-semibold">Storefront assessment</p>
              <p className="text-xs text-muted-foreground mt-1">
                `/care-packs/assessment` resolves packs from these rules and persists outcomes for demand aggregation.
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-dashed p-4 flex gap-3">
            <Package className="h-8 w-8 shrink-0 opacity-60" style={{ color: WINE }} />
            <div>
              <p className="text-sm font-semibold">Procurement SKUs</p>
              <p className="text-xs text-muted-foreground mt-1">
                SKU lists roll into Demand Aggregation (#5) alongside verified prescription line items.
              </p>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={modal.open} onOpenChange={(o) => !o && setModal({ open: false, editing: null })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif">
              {modal.editing?.id ? "Edit mapping" : "New care pack mapping"}
            </DialogTitle>
            <DialogDescription>
              Condition keys must match assessment options (e.g. diabetes, hypertension).
            </DialogDescription>
          </DialogHeader>
          {modal.editing && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs">Condition key</Label>
                <Input
                  value={modal.editing.conditionKey}
                  onChange={(ev) =>
                    setModal((m) => ({
                      ...m,
                      editing: m.editing ? { ...m.editing, conditionKey: ev.target.value } : null,
                    }))
                  }
                  placeholder="diabetes"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Pack slug</Label>
                  <Input
                    value={modal.editing.packSlug}
                    onChange={(ev) =>
                      setModal((m) => ({
                        ...m,
                        editing: m.editing ? { ...m.editing, packSlug: ev.target.value } : null,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Priority</Label>
                  <Input
                    type="number"
                    value={modal.editing.priority}
                    onChange={(ev) =>
                      setModal((m) => ({
                        ...m,
                        editing: m.editing
                          ? { ...m.editing, priority: Number(ev.target.value) }
                          : null,
                      }))
                    }
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Pack display name</Label>
                <Input
                  value={modal.editing.packName}
                  onChange={(ev) =>
                    setModal((m) => ({
                      ...m,
                      editing: m.editing ? { ...m.editing, packName: ev.target.value } : null,
                    }))
                  }
                />
              </div>
              <div>
                <Label className="text-xs">Product SKUs (comma-separated)</Label>
                <Textarea rows={3} value={skuText} onChange={(ev) => setSkuText(ev.target.value)} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={modal.editing.active !== false}
                  onChange={(ev) =>
                    setModal((m) => ({
                      ...m,
                      editing: m.editing ? { ...m.editing, active: ev.target.checked } : null,
                    }))
                  }
                />
                Active on storefront
              </label>
              <Textarea
                rows={2}
                placeholder="Internal notes"
                value={modal.editing.notes ?? ""}
                onChange={(ev) =>
                  setModal((m) => ({
                    ...m,
                    editing: m.editing ? { ...m.editing, notes: ev.target.value } : null,
                  }))
                }
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setModal({ open: false, editing: null })}>
                  Cancel
                </Button>
                <Button type="button" onClick={() => void save()}>
                  Save mapping
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminShell>
  )
}
