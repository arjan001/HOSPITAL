import { useMemo, useState } from "react"
import { Link } from "wouter"
import {
  Package, ClipboardList, Upload, FileText, Eye, MessagesSquare, Truck,
  ChevronRight,
} from "lucide-react"
import { useOrders, useMyPrescriptions, apiPrescriptions, type RxStatus } from "@/lib/api-nest"
import { STATUS_META, RxDetailModal } from "@/components/account/rx-detail-modal"
import { RxBuyModal } from "@/components/account/rx-buy-modal"
import { AccountShell, useAccountShellUser } from "@/components/account/account-shell"
import { Seo } from "@/components/seo"

const WINE = "#3D0814"
const ACCENT = "#F97316"
const ACCENT_RED = "#B91C1C"

const ORDER_STATUS: Record<string, string> = {
  pending: "Pending",
  paid: "Confirmed",
  confirmed: "Confirmed",
  dispatched: "Dispatched",
  fulfilled: "Delivered",
  delivered: "Delivered",
  cancelled: "Cancelled",
}

type ActivityItem =
  | { kind: "order"; id: string; label: string; meta: string; status: string; href: string; at: string }
  | { kind: "rx"; id: string; label: string; meta: string; status: string; href: string; at: string; rxId: string }

export default function AccountDashboard() {
  const user = useAccountShellUser()
  const { data: orders } = useOrders()
  const { data: rxList, mutate: mutateRx } = useMyPrescriptions()
  const rxRows = rxList ?? []
  const [openRxId, setOpenRxId] = useState<string | null>(null)
  const [buyRxId, setBuyRxId] = useState<string | null>(null)
  const openRx = openRxId ? rxRows.find((r) => r.id === openRxId) ?? null : null
  const buyRx = buyRxId ? rxRows.find((r) => r.id === buyRxId) ?? null : null

  const activity = useMemo(() => {
    const rows: ActivityItem[] = []
    for (const o of orders ?? []) {
      rows.push({
        kind: "order",
        id: o.id,
        label: o.number,
        meta: `${o.currency} ${o.total.toLocaleString()}`,
        status: ORDER_STATUS[o.status] ?? o.status,
        href: `/track-order/${encodeURIComponent(o.number)}`,
        at: o.createdAt,
      })
    }
    for (const r of rxRows) {
      rows.push({
        kind: "rx",
        id: r.id,
        label: `Rx-${r.rxNumber}`,
        meta: r.recipient,
        status: STATUS_META[r.status as RxStatus]?.label ?? r.status,
        href: "/account/prescriptions",
        at: r.updatedAt,
        rxId: r.id,
      })
    }
    return rows
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 6)
  }, [orders, rxRows])

  const rxActionable = rxRows.filter((r) => r.status === "verified" || r.status === "accepted").length

  return (
    <AccountShell
      title="Dashboard"
      subtitle="Recent activity and shortcuts"
      user={user}
    >
      <Seo
        title="My Account — Shaniid RX"
        description="Your Shaniid RX account overview."
        canonicalPath="/account"
        noindex
      />

      <div className="space-y-4">
        {rxActionable > 0 && (
          <Link
            href="/account/prescriptions"
            className="flex items-center gap-3 rounded-xl border-2 px-4 py-3 transition hover:opacity-95"
            style={{ background: "#ECFDF5", borderColor: "#6EE7B7", color: "#065F46" }}
          >
            <ClipboardList className="h-5 w-5 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">
                {rxActionable} prescription{rxActionable === 1 ? "" : "s"} need your attention
              </p>
              <p className="text-xs mt-0.5">Review quotation or complete payment</p>
            </div>
            <ChevronRight className="h-4 w-4 flex-shrink-0" />
          </Link>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { href: "/upload-prescription", icon: Upload, label: "Upload Rx" },
            { href: "/account/chat", icon: MessagesSquare, label: "Pharmacist" },
            { href: "/account/orders", icon: Package, label: "Orders" },
            { href: "/track-order", icon: Truck, label: "Track" },
          ].map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="flex flex-col items-center gap-1.5 rounded-xl border bg-white px-2 py-3 text-center text-[11px] font-semibold transition hover:shadow-sm"
              style={{ color: WINE, borderColor: "#E5E7EB" }}
            >
              <a.icon className="h-4 w-4" style={{ color: ACCENT }} />
              {a.label}
            </Link>
          ))}
        </div>

        <div className="rounded-xl border border-border bg-white overflow-hidden">
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border bg-muted/30">
            <h2 className="text-sm font-bold" style={{ color: WINE }}>Recent activity</h2>
            <Link href="/account/orders" className="text-[11px] font-semibold" style={{ color: ACCENT }}>
              All orders
            </Link>
          </div>

          {activity.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              No activity yet. Upload a prescription or place an order to get started.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {activity.map((row) => (
                <li key={`${row.kind}-${row.id}`} className="px-4 py-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3 min-w-0">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div
                        className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg"
                        style={{ background: `${ACCENT}15`, color: ACCENT }}
                      >
                        {row.kind === "order" ? <Package className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-sm font-semibold break-words" style={{ color: WINE }}>
                            {row.label}
                          </span>
                          <span
                            className="inline-flex shrink rounded-full px-2 py-0.5 text-[10px] font-bold uppercase leading-tight"
                            style={{ background: "#F3F4F6", color: "#4B5563" }}
                          >
                            {row.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground break-words mt-0.5">{row.meta}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {new Date(row.at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-shrink-0 gap-1 pl-12 sm:pl-0">
                      {row.kind === "rx" ? (
                        <button
                          type="button"
                          onClick={() => setOpenRxId(row.rxId)}
                          className="inline-flex h-8 items-center gap-1 rounded-md px-2.5 text-[10px] font-bold text-white"
                          style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_RED} 100%)` }}
                        >
                          <Eye className="h-3 w-3" /> View
                        </button>
                      ) : (
                        <Link
                          href={row.href}
                          className="inline-flex h-8 items-center gap-1 rounded-md border px-2.5 text-[10px] font-bold"
                          style={{ color: WINE, borderColor: "#E5E7EB" }}
                        >
                          Track
                        </Link>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {rxRows.length > 0 && (
          <div className="flex justify-center">
            <Link
              href="/account/prescriptions"
              className="text-xs font-semibold"
              style={{ color: ACCENT }}
            >
              View all prescriptions →
            </Link>
          </div>
        )}
      </div>

      {openRx && (
        <RxDetailModal
          rx={openRx}
          onClose={() => setOpenRxId(null)}
          onAccept={async () => {
            await apiPrescriptions.acceptQuotation(openRx.id)
            await mutateRx()
          }}
          onDecline={async () => {
            await apiPrescriptions.declineQuotation(openRx.id)
            await mutateRx()
            setOpenRxId(null)
          }}
          onPay={() => {
            setBuyRxId(openRx.id)
            setOpenRxId(null)
          }}
        />
      )}
      {buyRx && (
        <RxBuyModal
          rx={buyRx}
          onClose={() => setBuyRxId(null)}
          onPaid={() => {
            setBuyRxId(null)
            void mutateRx()
          }}
        />
      )}
    </AccountShell>
  )
}
