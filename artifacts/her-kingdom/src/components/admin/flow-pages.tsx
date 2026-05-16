"use client"

import { AdminShell } from "./admin-shell"
import {
  Handshake, Receipt, TrendingUp, Wallet,
  ShieldCheck, ClipboardList, HeartHandshake, AlertCircle,
  Truck, Warehouse, Timer,
} from "lucide-react"
import type { ReactNode } from "react"

const WINE = "#3D0814"

function FlowStage({
  title, eyebrow, blurb, icon: Icon, steps,
}: {
  title: string
  eyebrow: string
  blurb: string
  icon: typeof Handshake
  steps: { label: string; detail: string }[]
}) {
  return (
    <AdminShell title={title}>
      <div className="space-y-5 max-w-5xl">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: WINE }}>
            {eyebrow}
          </p>
          <h1 className="text-2xl font-bold flex items-center gap-2 mt-1">
            <Icon className="h-5 w-5" />
            {title}
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{blurb}</p>
        </div>

        <div className="rounded-lg border border-dashed border-border bg-background/60 p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Pipeline steps
          </p>
          <ol className="space-y-3">
            {steps.map((s, i) => (
              <li key={s.label} className="flex items-start gap-3">
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                  style={{ background: WINE }}
                >
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{s.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <Notice>
          This stage is wired into the sidebar pipeline (<strong>Sourcing → Trading → QA & Assurance → Logistics</strong>).
          Backend service for this view ships with the next NestJS module — the page persists state via <code>cmsStore</code> in the meantime.
        </Notice>
      </div>
    </AdminShell>
  )
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md border border-amber-300/50 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
      {children}
    </div>
  )
}

// ============ Trading ============

export function AdminTrading() {
  return (
    <FlowStage
      title="Deal Pipeline"
      eyebrow="Pipeline · Trading"
      icon={Handshake}
      blurb="Negotiated trade flow with verified suppliers — RFQ → bid → award → settlement."
      steps={[
        { label: "Open requests", detail: "Demand pulled from Sourcing → Aggregation Layer." },
        { label: "Bidding window", detail: "Approved suppliers submit quotes." },
        { label: "Award & lock price", detail: "Best-fit (price + lead time + supplier score) wins." },
        { label: "Settlement", detail: "Push to Logistics + post to ledger." },
      ]}
    />
  )
}

export function AdminTradingBids() {
  return (
    <FlowStage
      title="Bids & Quotes"
      eyebrow="Pipeline · Trading"
      icon={Receipt}
      blurb="Live quote book — compare prices, MOQs, lead times, and supplier trust scores side-by-side."
      steps={[
        { label: "Quote intake", detail: "Suppliers respond via portal / WhatsApp / email." },
        { label: "Normalize", detail: "Currency, pack size, lead time normalized for fair comparison." },
        { label: "Shortlist", detail: "Top 3 by composite score sent to negotiation." },
      ]}
    />
  )
}

export function AdminTradingNegotiation() {
  return (
    <FlowStage
      title="Price Negotiation"
      eyebrow="Pipeline · Trading"
      icon={TrendingUp}
      blurb="Counter-offer workspace. Target margin floors are enforced against the live competitor market check."
      steps={[
        { label: "Target margin", detail: "Pulled from Pricing & Competitor (Sourcing)." },
        { label: "Counter loop", detail: "Two rounds of structured counter-offers." },
        { label: "Lock", detail: "Awarded price flows to Settlements." },
      ]}
    />
  )
}

export function AdminTradingSettlements() {
  return (
    <FlowStage
      title="Settlements"
      eyebrow="Pipeline · Trading"
      icon={Wallet}
      blurb="Closed deals, supplier invoices, and payment status — feeds the ledger and supplier performance score."
      steps={[
        { label: "Invoice received", detail: "Match to award." },
        { label: "3-way match", detail: "PO ↔ GRN ↔ invoice." },
        { label: "Pay & score", detail: "Outcome posts back to Supplier Performance." },
      ]}
    />
  )
}

// ============ QA & Assurance ============

export function AdminQa() {
  return (
    <FlowStage
      title="Incoming QC"
      eyebrow="Pipeline · QA & Assurance"
      icon={ShieldCheck}
      blurb="Every batch is checked before it can be sold. This is the trust layer the brand promise depends on."
      steps={[
        { label: "GRN intake", detail: "Goods Received Note opens a QC ticket." },
        { label: "Sampling plan", detail: "AQL-driven sample size per batch size." },
        { label: "Release / hold", detail: "Pass → Logistics inventory. Fail → Recalls queue." },
      ]}
    />
  )
}

export function AdminQaBatches() {
  return (
    <FlowStage
      title="Batch Verification"
      eyebrow="Pipeline · QA & Assurance"
      icon={ClipboardList}
      blurb="Per-batch traceability: supplier, manufacture / expiry date, lab report, QR/blockchain anchor."
      steps={[
        { label: "Batch profile", detail: "Lot #, expiry, CoA on file." },
        { label: "Anchor", detail: "QR + blockchain hash for end-customer verification." },
        { label: "Release", detail: "Searchable under Trust Seal Registry." },
      ]}
    />
  )
}

export function AdminQaTrustSeal() {
  return (
    <FlowStage
      title="Trust Seal Registry"
      eyebrow="Pipeline · QA & Assurance"
      icon={HeartHandshake}
      blurb="Verified medicines / suppliers carry the Shaniid RX shield. This registry powers the PDP badge."
      steps={[
        { label: "Eligibility", detail: "Supplier audit + batch lineage + lab report." },
        { label: "Issue seal", detail: "Surfaces on the storefront PDP." },
        { label: "Revoke", detail: "Auto-revoke on QC fail or recall." },
      ]}
    />
  )
}

export function AdminQaRecalls() {
  return (
    <FlowStage
      title="Recalls & Compliance"
      eyebrow="Pipeline · QA & Assurance"
      icon={AlertCircle}
      blurb="Initiate, track and notify on regulator and supplier-driven recalls. Touches customer comms automatically."
      steps={[
        { label: "Open recall", detail: "Reference batch / lot." },
        { label: "Notify customers", detail: "SMS + WhatsApp + Email templates (Communications)." },
        { label: "Reconcile", detail: "Returned units, refund posting, regulator report." },
      ]}
    />
  )
}

// ============ Logistics ============

export function AdminLogistics() {
  return (
    <FlowStage
      title="Order Records"
      eyebrow="Pipeline · Logistics"
      icon={Receipt}
      blurb="End-to-end order ledger: dispatched, in-transit, delivered, exception. Source of truth for couriers."
      steps={[
        { label: "Dispatch", detail: "Auto-assign courier by delivery location + SLA." },
        { label: "Track", detail: "Live status feeds into customer order page." },
        { label: "Reconcile", detail: "POD + COD remittance + supplier performance score." },
      ]}
    />
  )
}

export function AdminLogisticsInventory() {
  return (
    <FlowStage
      title="Inventory Optimization"
      eyebrow="Pipeline · Logistics"
      icon={Warehouse}
      blurb="Min/max levels, ABC classification, slow-mover detection — all tied back to Demand Forecast."
      steps={[
        { label: "Snapshot", detail: "Daily stock-on-hand across hubs." },
        { label: "Reorder points", detail: "Computed from forecast + lead time." },
        { label: "Action", detail: "Push reorder to Sourcing automation." },
      ]}
    />
  )
}

export function AdminLogisticsLeadTime() {
  return (
    <FlowStage
      title="Lead Time Monitoring"
      eyebrow="Pipeline · Logistics"
      icon={Timer}
      blurb="Track promised vs actual lead times per supplier and per route. Feeds supplier performance scoring."
      steps={[
        { label: "Promised", detail: "From PO / award." },
        { label: "Actual", detail: "From dispatch + delivery events." },
        { label: "Variance", detail: "Penalties flow to supplier scorecard." },
      ]}
    />
  )
}

export function AdminLogisticsFallback() {
  return (
    <FlowStage
      title="Retail Emergency Fallback"
      eyebrow="Pipeline · Logistics"
      icon={Truck}
      blurb="When demand spikes or a supplier misses, pull from the nearest verified retail pharmacy partner."
      steps={[
        { label: "Trigger", detail: "Stockout risk detected by inventory + forecast." },
        { label: "Match", detail: "Find nearest partner with stock + Trust Seal." },
        { label: "Fulfil", detail: "Partner ships under Shaniid RX trust seal." },
      ]}
    />
  )
}
