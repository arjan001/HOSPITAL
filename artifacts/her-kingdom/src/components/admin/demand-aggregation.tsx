"use client"

import { useCallback, useEffect, useState } from "react"
import { AdminShell } from "./admin-shell"
import { apiAdminDemand, type DemandAggregationPayload } from "@/lib/api-nest"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { BarChart3, Package, Pill, RefreshCw } from "lucide-react"
import { Link } from "wouter"

const WINE = "#3D0814"

export function AdminDemandAggregation() {
  const [windowDays, setWindowDays] = useState("30")
  const [data, setData] = useState<DemandAggregationPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const agg = await apiAdminDemand.aggregation(Number(windowDays))
      setData(agg)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load demand")
    } finally {
      setLoading(false)
    }
  }, [windowDays])

  useEffect(() => {
    void load()
  }, [load])

  const s = data?.summary

  return (
    <AdminShell title="Demand Aggregation">
      <div className="space-y-6 max-w-6xl">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Business logic #5</p>
              <h2 className="text-lg font-serif mt-1" style={{ color: WINE }}>
                Unified demand roll-up
              </h2>
              <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
                Combines verified prescription line items, care pack assessment SKUs, and feeds procurement planning.
                Use alongside Sourcing → Demand Forecast for SKU-level reorder math.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Select value={windowDays} onValueChange={setWindowDays}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" size="icon" onClick={() => void load()} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
          {data?.generatedAt && (
            <p className="text-[11px] text-muted-foreground mt-3">
              Generated {new Date(data.generatedAt).toLocaleString()}
            </p>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600 rounded-lg border border-red-200 bg-red-50 p-3">{error}</p>
        )}

        {s && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { label: "Rx in window", value: s.prescriptionCount, icon: Pill },
              { label: "Assessments", value: s.assessmentCount, icon: BarChart3 },
              { label: "Unique drugs", value: s.uniqueDrugs, icon: Pill },
              { label: "Unique SKUs", value: s.uniqueSkus, icon: Package },
              { label: "Care packs", value: s.carePackSlugs, icon: Package },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-xl border border-border bg-background p-4">
                <Icon className="h-5 w-5 mb-2 opacity-50" style={{ color: WINE }} />
                <p className="text-2xl font-bold tabular-nums">{value}</p>
                <p className="text-xs text-muted-foreground mt-1">{label}</p>
              </div>
            ))}
          </div>
        )}

        {data && (
          <>
            <section className="rounded-xl border border-border overflow-hidden">
              <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
                <h3 className="font-semibold text-sm">Procurement hints (top SKUs)</h3>
                <div className="flex gap-3">
                  <Link href="/admin/operations/procurement" className="text-xs text-primary hover:underline font-medium">
                    Procurement decisions →
                  </Link>
                  <Link href="/admin/sourcing/forecast" className="text-xs text-primary hover:underline">
                    Demand forecast →
                  </Link>
                </div>
              </div>
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2">SKU</th>
                    <th className="px-4 py-2">Suggested qty</th>
                    <th className="px-4 py-2">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {data.procurementHints.map((h) => (
                    <tr key={h.sku} className="border-t border-border">
                      <td className="px-4 py-2 font-mono text-xs">{h.sku}</td>
                      <td className="px-4 py-2 font-semibold">{h.suggestedQty}</td>
                      <td className="px-4 py-2 text-muted-foreground">{h.reason}</td>
                    </tr>
                  ))}
                  {data.procurementHints.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">
                        No SKU demand in this window yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>

            <div className="grid lg:grid-cols-2 gap-4">
              <section className="rounded-xl border border-border overflow-hidden">
                <div className="px-4 py-3 border-b bg-muted/30">
                  <h3 className="font-semibold text-sm">Care pack demand</h3>
                </div>
                <ul className="divide-y divide-border text-sm">
                  {data.byPackSlug.map((p) => (
                    <li key={p.packSlug} className="px-4 py-3">
                      <div className="flex justify-between gap-2">
                        <span className="font-medium">{p.packName}</span>
                        <Badge variant="secondary">{p.assessments} assessments</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono mt-1">{p.packSlug}</p>
                      {Object.keys(p.skus).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {Object.entries(p.skus).map(([sku, n]) => (
                            <Badge key={sku} variant="outline" className="text-[10px] font-mono">
                              {sku} ×{n}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </li>
                  ))}
                  {data.byPackSlug.length === 0 && (
                    <li className="px-4 py-6 text-center text-muted-foreground">No assessment-driven pack demand.</li>
                  )}
                </ul>
              </section>

              <section className="rounded-xl border border-border overflow-hidden">
                <div className="px-4 py-3 border-b bg-muted/30">
                  <h3 className="font-semibold text-sm">Medication demand (Rx)</h3>
                </div>
                <ul className="divide-y divide-border text-sm max-h-[420px] overflow-y-auto">
                  {data.byDrug.map((d) => (
                    <li key={d.name} className="px-4 py-2 flex justify-between gap-2">
                      <span>{d.name}</span>
                      <span className="text-muted-foreground tabular-nums">
                        qty {d.quantity} · {d.rxCount} Rx
                      </span>
                    </li>
                  ))}
                  {data.byDrug.length === 0 && (
                    <li className="px-4 py-6 text-center text-muted-foreground">No verified Rx drugs in window.</li>
                  )}
                </ul>
              </section>
            </div>

            <section className="rounded-xl border border-border overflow-hidden">
              <div className="px-4 py-3 border-b bg-muted/30">
                <h3 className="font-semibold text-sm">SKU demand (all sources)</h3>
              </div>
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2">SKU</th>
                    <th className="px-4 py-2">Quantity</th>
                    <th className="px-4 py-2">Sources</th>
                  </tr>
                </thead>
                <tbody>
                  {data.bySku.slice(0, 40).map((r) => (
                    <tr key={r.sku} className="border-t border-border">
                      <td className="px-4 py-2 font-mono text-xs">{r.sku}</td>
                      <td className="px-4 py-2 font-semibold">{r.quantity}</td>
                      <td className="px-4 py-2">
                        {r.sources.map((src) => (
                          <Badge key={src} variant="secondary" className="mr-1 text-[10px]">
                            {src}
                          </Badge>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </>
        )}
      </div>
    </AdminShell>
  )
}
