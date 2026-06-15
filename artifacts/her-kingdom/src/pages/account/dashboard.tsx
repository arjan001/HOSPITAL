import { useState } from "react"
import { Link } from "wouter"
import {
  Heart, MapPin, Package, User as UserIcon, Mail, Phone, ClipboardList, Pill, Clock, CheckCheck,
  ChevronRight, Upload, FileText, Eye, LifeBuoy, Bell, MessagesSquare, Truck, Stethoscope,
} from "lucide-react"
import { useMe, useAddresses, useOrders, useWishlistRemote, useMyPrescriptions, apiPrescriptions, type RxStatus } from "@/lib/api-nest"
import { STATUS_META, RxDetailModal } from "@/components/account/rx-detail-modal"
import { RxBuyModal } from "@/components/account/rx-buy-modal"
import { AccountShell, useAccountShellUser } from "@/components/account/account-shell"
import { Seo } from "@/components/seo"

const WINE = "#3D0814"
const ACCENT = "#F97316"
const ACCENT_RED = "#B91C1C"

const STATUS_TONES: Record<RxStatus, { label: string; color: string; bg: string }> = Object.fromEntries(
  (Object.keys(STATUS_META) as RxStatus[]).map((k) => [
    k,
    { label: STATUS_META[k].label, color: STATUS_META[k].color, bg: STATUS_META[k].bg },
  ]),
) as Record<RxStatus, { label: string; color: string; bg: string }>

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  paid: "Confirmed",
  confirmed: "Confirmed",
  dispatched: "Dispatched",
  fulfilled: "Delivered",
  delivered: "Delivered",
  cancelled: "Cancelled",
}

function MiniRxStat({ icon: Icon, label, value, tone, bg }: {
  icon: typeof Heart; label: string; value: number; tone: string; bg: string
}) {
  return (
    <div className="rounded-lg border border-border p-3 flex items-center gap-3">
      <div className="grid h-9 w-9 place-items-center rounded-lg" style={{ background: bg, color: tone }}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-lg font-bold" style={{ color: tone }}>{value}</div>
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: typeof Heart
  label: string
  value: string | number
  href: string
}) {
  return (
    <Link
      href={href}
      className="block rounded-xl border border-border bg-white p-4 transition hover:shadow-md"
    >
      <div className="flex items-center gap-3">
        <div
          className="grid h-10 w-10 place-items-center rounded-lg"
          style={{ background: `${ACCENT}1a`, color: ACCENT }}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="text-lg font-bold" style={{ color: WINE }}>{value}</div>
        </div>
      </div>
    </Link>
  )
}

function QuickAction({
  href,
  icon: Icon,
  label,
  desc,
}: {
  href: string
  icon: typeof Upload
  label: string
  desc: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border border-border bg-white p-4 transition hover:shadow-md"
    >
      <div
        className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-lg"
        style={{ background: `${ACCENT}1a`, color: ACCENT }}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold" style={{ color: WINE }}>{label}</div>
        <div className="text-[11px] text-muted-foreground">{desc}</div>
      </div>
      <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
    </Link>
  )
}

export default function AccountDashboard() {
  const user = useAccountShellUser()
  const { data: me } = useMe()
  const { data: addresses } = useAddresses()
  const { data: orders } = useOrders()
  const { data: wishlist } = useWishlistRemote()
  const { data: rxList, mutate: mutateRx } = useMyPrescriptions()
  const rxRows = rxList ?? []
  const [openRxId, setOpenRxId] = useState<string | null>(null)
  const [buyRxId, setBuyRxId] = useState<string | null>(null)
  const openRx = openRxId ? rxRows.find((r) => r.id === openRxId) ?? null : null
  const buyRx = buyRxId ? rxRows.find((r) => r.id === buyRxId) ?? null : null
  const rxPending = rxRows.filter((r) => r.status === "pending").length
  const rxVerifiedOrDispensed = rxRows.filter((r) => r.status === "verified" || r.status === "accepted" || r.status === "dispensed").length
  const rxApprovedMeds = rxRows.reduce((s, r) => s + r.approvedDrugs.length, 0)
  const rxAttention = rxRows.filter((r) => r.status === "rejected").length
  const rxVerified = rxRows.filter((r) => r.status === "verified").length
  const rxAccepted = rxRows.filter((r) => r.status === "accepted").length

  return (
    <AccountShell
      title="Dashboard"
      subtitle="Your orders, prescriptions and account at a glance"
      user={user}
    >
      <Seo
        title="My Account — Shaniid RX"
        description="Manage your Shaniid RX orders, prescriptions, addresses and wishlist."
        canonicalPath="/account"
        noindex
      />

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <StatCard icon={Package} label="Orders" value={orders?.length ?? 0} href="/account/orders" />
          <StatCard icon={ClipboardList} label="Prescriptions" value={rxRows.length} href="/account/prescriptions" />
          <StatCard icon={MapPin} label="Addresses" value={addresses?.length ?? 0} href="/account/addresses" />
          <StatCard icon={Heart} label="Wishlist" value={wishlist?.length ?? 0} href="/account/wishlist" />
          <StatCard icon={UserIcon} label="Profile" value={me?.email ? "Set" : "Incomplete"} href="/account/settings" />
          <StatCard icon={LifeBuoy} label="Support" value="Get help" href="/account/support" />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction href="/upload-prescription" icon={Upload} label="Upload prescription" desc="Send a new Rx for review" />
          <QuickAction href="/account/chat" icon={MessagesSquare} label="Talk to pharmacist" desc="Live chat with our team" />
          <QuickAction href="/speak-to-a-doctor" icon={Stethoscope} label="Speak to a doctor" desc="Book a consultation" />
          <QuickAction href="/track-order" icon={Truck} label="Track an order" desc="Check delivery status" />
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
          <div
            className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
            style={{ background: "linear-gradient(135deg, #FFF7ED 0%, #FFFBEB 100%)" }}
          >
            <div className="flex items-center gap-3">
              <div
                className="grid h-10 w-10 place-items-center rounded-xl"
                style={{ background: `${ACCENT}1a`, color: ACCENT }}
              >
                <ClipboardList className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold" style={{ color: WINE }}>My prescriptions</h2>
                <p className="text-[11px] text-muted-foreground">
                  Track status, approved medication and pharmacist notes.
                </p>
              </div>
            </div>
            <Link
              href="/account/prescriptions"
              className="inline-flex h-9 items-center gap-1.5 rounded-md border bg-white px-3 text-xs font-semibold shadow-sm hover:shadow"
              style={{ color: WINE, borderColor: "#E5E7EB" }}
            >
              View all <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-2 px-5 pt-4 md:grid-cols-4">
            <MiniRxStat icon={Clock} label="Awaiting" value={rxPending} tone="#92400E" bg="#FEF3C7" />
            <MiniRxStat icon={CheckCheck} label="Quotation / paid" value={rxVerifiedOrDispensed} tone="#166534" bg="#DCFCE7" />
            <MiniRxStat icon={Pill} label="Approved meds" value={rxApprovedMeds} tone="#1E40AF" bg="#DBEAFE" />
            <MiniRxStat icon={LifeBuoy} label="Action required" value={rxAttention} tone="#991B1B" bg="#FEE2E2" />
          </div>

          {(rxVerified > 0 || rxAccepted > 0) && (
            <div className="mx-5 mt-3 flex items-center gap-3 rounded-xl border-2 px-4 py-3" style={{ background: "#ECFDF5", borderColor: "#6EE7B7", color: "#065F46" }}>
              <div className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg" style={{ background: "#6EE7B7" }}>
                <Bell className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">
                  {rxVerified > 0
                    ? `${rxVerified} quotation${rxVerified === 1 ? "" : "s"} ready to review`
                    : `${rxAccepted} prescription${rxAccepted === 1 ? "" : "s"} ready to pay`}
                </p>
                <p className="mt-0.5 text-xs">Open a prescription below to accept and pay.</p>
              </div>
              <Link href="/account/prescriptions" className="text-xs font-semibold underline">
                View all
              </Link>
            </div>
          )}

          <div className="px-5 pb-5 pt-4">
            {rxRows.length === 0 ? (
              <div className="space-y-2 rounded-xl border border-dashed border-border bg-muted/30 px-5 py-6 text-center">
                <div
                  className="mx-auto grid h-11 w-11 place-items-center rounded-full"
                  style={{ background: `${ACCENT}1a`, color: ACCENT }}
                >
                  <FileText className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold" style={{ color: WINE }}>No prescriptions yet</p>
                <p className="mx-auto max-w-sm text-[11px] text-muted-foreground">
                  Upload your first prescription. A verified pharmacist will review it and
                  approved medication will appear here.
                </p>
                <Link
                  href="/upload-prescription"
                  className="inline-flex h-9 items-center gap-1.5 rounded-md px-4 text-xs font-semibold text-white"
                  style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_RED} 100%)` }}
                >
                  <Upload className="h-3.5 w-3.5" /> Upload prescription
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {rxRows.slice(0, 4).map((r) => {
                  const meta = STATUS_TONES[r.status]
                  return (
                    <li key={r.id}>
                      <div className="flex items-center gap-3 py-2.5">
                        <div
                          className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg"
                          style={{ background: meta.bg, color: meta.color }}
                        >
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold" style={{ color: WINE }}>
                              Rx-{r.rxNumber}
                            </span>
                            <span
                              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                              style={{ background: meta.bg, color: meta.color }}
                            >
                              {meta.label}
                            </span>
                          </div>
                          <div className="truncate text-[11px] text-muted-foreground">
                            For {r.recipient} · {r.files[0]?.name || "Prescription"}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setOpenRxId(r.id)}
                          aria-label={`View prescription Rx-${r.rxNumber}`}
                          className="inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-xs font-bold text-white shadow-sm transition hover:shadow"
                          style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_RED} 100%)` }}
                        >
                          <Eye className="h-3.5 w-3.5" /> View
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="space-y-3 rounded-xl border border-border bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold" style={{ color: WINE }}>Recent orders</h2>
              <Link href="/account/orders" className="text-xs font-semibold" style={{ color: ACCENT }}>
                View all
              </Link>
            </div>
            {!orders || orders.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No orders yet — your first order will appear here.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {orders.slice(0, 5).map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium" style={{ color: WINE }}>{o.number}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(o.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-semibold" style={{ color: WINE }}>
                        {o.currency} {o.total.toLocaleString()}
                      </div>
                      <div className="text-[11px] font-medium" style={{ color: ACCENT }}>
                        {ORDER_STATUS_LABELS[o.status] ?? o.status}
                      </div>
                      <Link
                        href={`/track-order/${encodeURIComponent(o.number)}`}
                        className="text-[10px] font-semibold underline"
                        style={{ color: WINE }}
                      >
                        Track
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-3 rounded-xl border border-border bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold" style={{ color: WINE }}>Profile</h2>
              <Link href="/account/settings" className="text-xs font-semibold" style={{ color: ACCENT }}>
                Edit
              </Link>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-muted-foreground" />
                {me?.fullName || <span className="text-muted-foreground">Add your name</span>}
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                {me?.email || <span className="text-muted-foreground">Add your email</span>}
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                {me?.phone || <span className="text-muted-foreground">Add your phone</span>}
              </div>
            </div>
          </div>
        </div>
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
