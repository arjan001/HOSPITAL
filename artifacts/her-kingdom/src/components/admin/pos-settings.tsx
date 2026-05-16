"use client"

/**
 * Tab body for /admin/settings → POS & Receipt.
 *
 * All state goes through `usePosSettings` (cmsStore key `pos.settings`),
 * which means the POS cashier screen picks up changes immediately.
 */
import { useEffect, useState } from "react"
import {
  Save, Printer, Receipt as ReceiptIcon, Banknote, Smartphone, CreditCard,
  FileSignature, Percent, RotateCcw,
} from "lucide-react"
import { notify } from "@/lib/notify"
import {
  usePosSettings, DEFAULT_POS_SETTINGS,
  type PosSettings, type PaymentMethod,
} from "@/lib/pos-store"
import { Receipt } from "./pos"
import type { PosTransaction } from "@/lib/pos-store"

const WINE = "#3D0814"

const METHOD_META: Record<PaymentMethod, { label: string; icon: typeof Banknote }> = {
  cash:   { label: "Cash",   icon: Banknote },
  mpesa:  { label: "M-Pesa", icon: Smartphone },
  card:   { label: "Card",   icon: CreditCard },
  credit: { label: "Credit / IOU", icon: FileSignature },
}

const SAMPLE_TX: PosTransaction = {
  id: "RX-PREVIEW",
  shiftId: "preview",
  cashier: "Counter Cashier",
  customer: "Walk-in",
  items: [
    { productId: "p1", name: "Paracetamol 500mg × 24", unitPrice: 120, quantity: 1 },
    { productId: "p2", name: "Amoxicillin 250mg syrup", unitPrice: 380, quantity: 2 },
    { productId: "p3", name: "ORS sachets", unitPrice: 60, quantity: 3 },
  ],
  subtotal: 879.31,
  discountTotal: 0,
  taxTotal: 140.69,
  total: 1020,
  paymentMethod: "mpesa",
  paymentRef: "QXY7HJ23KP",
  tendered: 1020,
  change: 0,
  createdAt: new Date().toISOString(),
}

export function PosSettingsPanel() {
  const [stored, setStored] = usePosSettings()
  const [draft, setDraft] = useState<PosSettings>(stored)
  const [dirty, setDirty] = useState(false)

  useEffect(() => { setDraft(stored) }, [stored])

  const set = <K extends keyof PosSettings>(k: K, v: PosSettings[K]) => {
    setDraft((d) => ({ ...d, [k]: v }))
    setDirty(true)
  }
  const toggleMethod = (m: PaymentMethod) => {
    setDraft((d) => {
      const has = d.enabledMethods.includes(m)
      const next = has ? d.enabledMethods.filter((x) => x !== m) : [...d.enabledMethods, m]
      const safe = next.length === 0 ? ["cash" as PaymentMethod] : next
      return { ...d, enabledMethods: safe, defaultMethod: safe.includes(d.defaultMethod) ? d.defaultMethod : safe[0] }
    })
    setDirty(true)
  }
  const save = () => {
    setStored(draft)
    setDirty(false)
    notify.saved("POS settings saved")
  }
  const reset = () => {
    setDraft(DEFAULT_POS_SETTINGS)
    setDirty(true)
    notify.info("Defaults restored — click Save to apply")
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
      <div className="space-y-6">
        {/* Register */}
        <Card title="Register" subtitle="Identity printed on every receipt and used to label the cashier screen.">
          <Row label="Register name">
            <Input value={draft.registerName} onChange={(v) => set("registerName", v)} placeholder="Counter 1" />
          </Row>
          <Row label="Store name">
            <Input value={draft.storeName} onChange={(v) => set("storeName", v)} />
          </Row>
          <Row label="Store address">
            <Input value={draft.storeAddress} onChange={(v) => set("storeAddress", v)} />
          </Row>
          <Row label="Store phone">
            <Input value={draft.storePhone} onChange={(v) => set("storePhone", v)} />
          </Row>
          <Row label="Tax / KRA PIN">
            <Input value={draft.storeTaxId} onChange={(v) => set("storeTaxId", v)} placeholder="Optional" />
          </Row>
        </Card>

        {/* Money */}
        <Card title="Tax & money" subtitle="VAT defaults, currency symbol, and whether tax is already baked into the displayed price.">
          <Row label="Currency symbol">
            <Input value={draft.currency} onChange={(v) => set("currency", v)} className="w-24" />
          </Row>
          <Row label="Tax rate (%)">
            <Input
              type="number"
              value={String(draft.taxRate)}
              onChange={(v) => set("taxRate", Number(v) || 0)}
              className="w-24"
            />
          </Row>
          <Row label="Tax mode">
            <div className="flex gap-2">
              {([["Inclusive", true], ["Exclusive", false]] as const).map(([l, val]) => (
                <button
                  key={l}
                  onClick={() => set("taxInclusive", val)}
                  className={`h-9 px-3 rounded-md text-xs font-bold border ${draft.taxInclusive === val ? "text-white" : "hover:bg-secondary"}`}
                  style={draft.taxInclusive === val ? { background: WINE, borderColor: WINE } : { borderColor: "rgba(0,0,0,0.1)" }}
                >
                  {l}
                </button>
              ))}
            </div>
          </Row>
          <Row label="Max discount (%)">
            <Input
              type="number"
              value={String(draft.maxDiscountPercent)}
              onChange={(v) => set("maxDiscountPercent", Number(v) || 0)}
              className="w-24"
            />
          </Row>
        </Card>

        {/* Shift */}
        <Card title="Shift management" subtitle="Controls how the cashier opens and reconciles the cash drawer.">
          <Row label="Require opening float">
            <Switch on={draft.requireOpeningFloat} onChange={(v) => set("requireOpeningFloat", v)} />
          </Row>
          <Row label={`Default opening float (${draft.currency})`}>
            <Input
              type="number"
              value={String(draft.defaultOpeningFloat)}
              onChange={(v) => set("defaultOpeningFloat", Number(v) || 0)}
              className="w-32"
            />
          </Row>
        </Card>

        {/* Payment methods */}
        <Card title="Payment methods" subtitle="Toggle the tender types your counter accepts. The default is pre-selected when a new sale starts.">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {(Object.keys(METHOD_META) as PaymentMethod[]).map((m) => {
              const Icon = METHOD_META[m].icon
              const on = draft.enabledMethods.includes(m)
              return (
                <button
                  key={m}
                  onClick={() => toggleMethod(m)}
                  className={`p-3 rounded-lg border text-left transition-colors ${on ? "text-white" : "hover:bg-secondary"}`}
                  style={on ? { background: WINE, borderColor: WINE } : { borderColor: "rgba(0,0,0,0.1)" }}
                >
                  <Icon className="h-4 w-4 mb-1" />
                  <p className="text-xs font-bold">{METHOD_META[m].label}</p>
                  <p className="text-[10px] opacity-75">{on ? "Enabled" : "Disabled"}</p>
                </button>
              )
            })}
          </div>
          <Row label="Default method">
            <select
              value={draft.defaultMethod}
              onChange={(e) => set("defaultMethod", e.target.value as PaymentMethod)}
              className="h-9 px-2 rounded-md border text-xs font-semibold bg-white"
              style={{ borderColor: "rgba(0,0,0,0.1)" }}
            >
              {draft.enabledMethods.map((m) => (
                <option key={m} value={m}>{METHOD_META[m].label}</option>
              ))}
            </select>
          </Row>
        </Card>

        {/* Receipt */}
        <Card title="Receipt template" subtitle="Header, footer and printer paper size for thermal receipts.">
          <Row label="Paper width">
            <div className="flex gap-2">
              {(["58mm", "80mm"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => set("paperWidth", p)}
                  className={`h-9 px-3 rounded-md text-xs font-bold border ${draft.paperWidth === p ? "text-white" : "hover:bg-secondary"}`}
                  style={draft.paperWidth === p ? { background: WINE, borderColor: WINE } : { borderColor: "rgba(0,0,0,0.1)" }}
                >
                  {p}
                </button>
              ))}
            </div>
          </Row>
          <Row label="Auto-print on charge">
            <Switch on={draft.autoPrint} onChange={(v) => set("autoPrint", v)} />
          </Row>
          <Row label="Logo URL">
            <Input value={draft.receiptLogoUrl} onChange={(v) => set("receiptLogoUrl", v)} placeholder="/logo.svg" />
          </Row>
          <Row label="Header line" stacked>
            <Input value={draft.receiptHeader} onChange={(v) => set("receiptHeader", v)} placeholder="Tagline printed above items" />
          </Row>
          <Row label="Footer line" stacked>
            <textarea
              value={draft.receiptFooter}
              onChange={(e) => set("receiptFooter", e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-md border text-xs outline-none"
              style={{ borderColor: "rgba(0,0,0,0.12)" }}
              placeholder="Thank-you / returns policy"
            />
          </Row>
        </Card>

        <div className="flex items-center justify-between">
          <button
            onClick={reset}
            className="h-10 px-3 rounded-md border text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-secondary"
            style={{ borderColor: "rgba(0,0,0,0.12)" }}
          >
            <RotateCcw className="h-3.5 w-3.5" /> Restore defaults
          </button>
          <button
            onClick={save}
            disabled={!dirty}
            className="h-10 px-5 rounded-md text-sm font-bold text-white inline-flex items-center gap-1.5 disabled:opacity-50"
            style={{ background: WINE }}
          >
            <Save className="h-4 w-4" /> Save POS settings
          </button>
        </div>
      </div>

      {/* Live receipt preview */}
      <aside className="space-y-2 lg:sticky lg:top-4 self-start">
        <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground inline-flex items-center gap-1">
          <ReceiptIcon className="h-3 w-3" /> Live receipt preview
        </p>
        <div className="rounded-xl border bg-secondary p-3" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
          <div className="bg-white shadow mx-auto" style={{ width: draft.paperWidth === "58mm" ? 220 : 300 }}>
            <Receipt tx={SAMPLE_TX} settings={draft} />
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
          <Printer className="h-3 w-3" /> Updates as you edit. Sample data only.
        </p>
        <p className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
          <Percent className="h-3 w-3" /> Max single-sale discount: {draft.maxDiscountPercent}%.
        </p>
      </aside>
    </div>
  )
}

/* ---------- micro UI helpers ---------- */

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="border rounded-xl bg-white p-5 space-y-4" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
      <div>
        <h3 className="text-sm font-bold">{title}</h3>
        {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function Row({ label, children, stacked }: { label: string; children: React.ReactNode; stacked?: boolean }) {
  if (stacked) {
    return (
      <div>
        <label className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">{label}</label>
        <div className="mt-1">{children}</div>
      </div>
    )
  }
  return (
    <div className="flex items-center justify-between gap-3">
      <label className="text-xs font-semibold text-muted-foreground flex-1">{label}</label>
      {children}
    </div>
  )
}

function Input({ value, onChange, type = "text", placeholder, className = "" }: {
  value: string; onChange: (v: string) => void; type?: string; placeholder?: string; className?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`h-9 px-3 rounded-md border text-xs bg-white outline-none focus:ring-2 ${className || "w-full md:w-72"}`}
      style={{ borderColor: "rgba(0,0,0,0.12)" }}
    />
  )
}

function Switch({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className="relative w-10 h-6 rounded-full transition-colors"
      style={{ background: on ? WINE : "#D1D5DB" }}
    >
      <span
        className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
        style={{ left: on ? "calc(100% - 22px)" : 2 }}
      />
    </button>
  )
}
