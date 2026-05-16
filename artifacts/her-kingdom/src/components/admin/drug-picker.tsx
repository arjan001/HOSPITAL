"use client"

/**
 * <DrugPicker /> — autocomplete picker that fetches from the product
 * catalogue (/api/products) and returns a pre-filled recommended-drug row.
 *
 * Drop-in replacement for the bare "+ Add" button in the prescription
 * review modal and the consultation side panel.
 */
import { useEffect, useMemo, useRef, useState } from "react"
import useSWR from "swr"
import { Pill, Plus, Search, Sparkles, X } from "lucide-react"
import { safeFetcher } from "@/lib/fetcher"
import type { Product } from "@/lib/types"
import { searchProducts, suggestDrugs, type SuggestedDrug } from "@/lib/drug-suggester"

const WINE = "#3D0814"

export type DrugRow = { name: string; dosage: string; instructions: string }

export function useDrugCatalogue() {
  const { data, isLoading } = useSWR<Product[]>("/api/products", safeFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  })
  return { products: data ?? [], isLoading }
}

interface DrugPickerProps {
  onPick: (row: DrugRow, source?: Product) => void
  /** Optional clinical text used to power "Suggested for this case". */
  clinicalContext?: string
  triggerLabel?: string
  align?: "start" | "end"
}

export function DrugPicker({ onPick, clinicalContext, triggerLabel = "Add drug", align = "end" }: DrugPickerProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const { products, isLoading } = useDrugCatalogue()
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setTimeout(() => inputRef.current?.focus(), 30)
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false) }
    document.addEventListener("mousedown", onClick)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onClick)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  const suggestions = useMemo<SuggestedDrug[]>(() => {
    if (!clinicalContext || !clinicalContext.trim()) return []
    return suggestDrugs(clinicalContext, products, { limit: 4 })
  }, [clinicalContext, products])

  const results = useMemo(() => searchProducts(query, products, 8), [query, products])

  const pick = (p: Product) => {
    onPick({ name: p.name, dosage: "", instructions: "" }, p)
    setQuery("")
    setOpen(false)
  }
  const pickSuggested = (s: SuggestedDrug) => {
    onPick({ name: s.name, dosage: "", instructions: "" }, products.find((p) => p.id === s.productId))
    setOpen(false)
  }

  return (
    <div ref={wrapRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs font-semibold inline-flex items-center gap-1 px-2.5 h-7 rounded-md border border-dashed hover:bg-secondary"
        style={{ borderColor: WINE, color: WINE }}
      >
        <Plus className="h-3 w-3" /> {triggerLabel}
      </button>
      {open && (
        <div
          className={`absolute z-50 mt-1.5 w-[320px] rounded-lg border bg-white shadow-2xl overflow-hidden ${align === "end" ? "right-0" : "left-0"}`}
          style={{ borderColor: "rgba(0,0,0,0.1)" }}
        >
          <div className="px-3 py-2.5 border-b flex items-center gap-2" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
            <Search className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={isLoading ? "Loading catalogue…" : "Search drug, brand or category"}
              className="flex-1 text-xs h-7 outline-none bg-transparent"
            />
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {suggestions.length > 0 && (
            <div className="border-b" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
              <p className="px-3 pt-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1">
                <Sparkles className="h-3 w-3" style={{ color: WINE }} /> Suggested for this case
              </p>
              <ul className="py-1">
                {suggestions.map((s) => (
                  <li key={s.productId ?? s.name}>
                    <button
                      onClick={() => pickSuggested(s)}
                      className="w-full text-left px-3 py-1.5 hover:bg-secondary/60 flex items-start gap-2"
                    >
                      <Pill className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" style={{ color: WINE }} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold truncate">{s.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{s.reason}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="max-h-[260px] overflow-y-auto">
            {results.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                {query ? `No drugs match "${query}".` : "Type to search the drug catalogue."}
              </p>
            ) : (
              <ul className="py-1">
                {results.map((p) => (
                  <li key={p.id}>
                    <button
                      onClick={() => pick(p)}
                      className="w-full text-left px-3 py-1.5 hover:bg-secondary/60 flex items-center gap-2"
                    >
                      <div className="w-7 h-7 rounded-md bg-secondary flex items-center justify-center flex-shrink-0">
                        <Pill className="h-3.5 w-3.5" style={{ color: WINE }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold truncate">{p.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {p.category}{p.price ? ` · KSh ${p.price.toLocaleString()}` : ""}
                          {!p.inStock && <span className="text-rose-600"> · out of stock</span>}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Compact "Suggest from notes" button — bulk-adds the top engine
 * suggestions in one click. Doctor still edits dosage/instructions.
 */
interface SuggestBulkButtonProps {
  clinicalContext: string
  existingNames: string[]
  onAdd: (rows: DrugRow[]) => void
}

export function SuggestFromNotesButton({ clinicalContext, existingNames, onAdd }: SuggestBulkButtonProps) {
  const { products } = useDrugCatalogue()
  const suggestions = useMemo(() => {
    if (!clinicalContext.trim()) return []
    return suggestDrugs(clinicalContext, products, { limit: 4 })
  }, [clinicalContext, products])

  if (suggestions.length === 0) return null
  const fresh = suggestions.filter((s) => !existingNames.some((n) => n.toLowerCase() === s.name.toLowerCase()))
  if (fresh.length === 0) return null

  return (
    <button
      type="button"
      onClick={() => onAdd(fresh.map((s) => ({ name: s.name, dosage: "", instructions: "" })))}
      className="text-[11px] font-semibold inline-flex items-center gap-1 px-2 h-7 rounded-md text-white hover:opacity-90"
      style={{ background: WINE }}
      title={fresh.map((s) => `${s.name} — ${s.reason}`).join("\n")}
    >
      <Sparkles className="h-3 w-3" /> Suggest {fresh.length}
    </button>
  )
}
