import { Link } from "wouter"
import { Heart, MapPin, Package, User as UserIcon, Mail, Phone, Settings, ShieldCheck, ClipboardList, Pill, Clock, CheckCircle2 } from "lucide-react"
import { useMe, useAddresses, useOrders, useWishlistRemote } from "@/lib/api-nest"
import { useCmsCollection } from "@/lib/cms-store"
import type { Prescription } from "@/components/admin/prescriptions"

type UserPrescriptionRow = {
  id: string
  rxNumber: string
  name: string
  date: string
  total: number
  recipient: string
  status: "Pending" | "Verified" | "Dispensed" | "Cancelled"
}

const WINE = "#3D0814"
const ACCENT = "#F97316"
const CREAM = "#FFFBF5"

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

export default function AccountDashboard() {
  const { data: me } = useMe()
  const { data: addresses } = useAddresses()
  const { data: orders } = useOrders()
  const { data: wishlist } = useWishlistRemote()
  const { items: rxRows } = useCmsCollection<UserPrescriptionRow>("user-prescriptions", [])
  const { items: adminRxItems } = useCmsCollection<Prescription>("prescriptions", [])
  const adminRxById = new Map(adminRxItems.map((p) => [p.id, p]))
  const rxPending = rxRows.filter((r) => {
    const a = adminRxById.get(r.id)
    return a ? a.status === "pending" : r.status === "Pending"
  }).length
  const rxVerified = rxRows.filter((r) => {
    const a = adminRxById.get(r.id)
    return a ? (a.status === "verified" || a.status === "dispensed") : (r.status === "Verified" || r.status === "Dispensed")
  }).length

  const firstName = me?.fullName ? me.fullName.split(" ")[0] : ""

  return (
    <div className="min-h-screen" style={{ background: CREAM }}>
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <div
          className="flex flex-wrap items-center justify-between gap-4 rounded-2xl p-6 text-white shadow-lg"
          style={{ background: `linear-gradient(135deg, ${WINE} 0%, #6B0F1A 100%)` }}
        >
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-white/70">
              <ShieldCheck className="h-3.5 w-3.5" /> Verified account
            </div>
            <h1 className="mt-1 text-2xl font-bold">
              Welcome back{firstName ? `, ${firstName}` : ""}
            </h1>
            <p className="mt-1 text-sm text-white/80">
              Manage your profile, delivery addresses, orders and saved items.
            </p>
          </div>
          <Link
            href="/account/settings"
            className="inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-semibold text-white"
            style={{ background: ACCENT }}
          >
            <Settings className="h-4 w-4" /> Account settings
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard icon={Package} label="Orders" value={orders?.length ?? 0} href="/account/orders" />
          <StatCard icon={ClipboardList} label="Prescriptions" value={rxRows.length} href="/account/prescriptions" />
          <StatCard icon={MapPin} label="Addresses" value={addresses?.length ?? 0} href="/account/addresses" />
          <StatCard icon={Heart} label="Wishlist" value={wishlist?.length ?? 0} href="/account/wishlist" />
          <StatCard icon={UserIcon} label="Profile" value={me?.email ? "Set" : "Incomplete"} href="/account/settings" />
        </div>

        {rxRows.length > 0 && (
          <div className="space-y-3 rounded-xl border border-border bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold" style={{ color: WINE }}>Prescriptions</h2>
              <Link href="/account/prescriptions" className="text-xs font-semibold" style={{ color: ACCENT }}>
                View all
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              <MiniRxStat icon={Clock} label="Awaiting review" value={rxPending} tone="#92400E" bg="#FEF3C7" />
              <MiniRxStat icon={CheckCircle2} label="Verified / dispensed" value={rxVerified} tone="#166534" bg="#DCFCE7" />
              <MiniRxStat icon={Pill} label="Approved medications" value={
                rxRows.reduce((sum, r) => sum + (adminRxById.get(r.id)?.recommendedDrugs?.length ?? 0), 0)
              } tone="#1E40AF" bg="#DBEAFE" />
            </div>
            <ul className="divide-y divide-border">
              {rxRows.slice(0, 3).map((r) => {
                const a = adminRxById.get(r.id)
                const status = a?.status ?? r.status.toLowerCase()
                return (
                  <li key={r.id}>
                    <Link href="/account/prescriptions" className="flex items-center justify-between py-2.5">
                      <div className="min-w-0">
                        <div className="text-sm font-medium" style={{ color: WINE }}>Rx-{r.rxNumber}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{r.name}</div>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{status}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

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
                  <li key={o.id} className="flex items-center justify-between py-3">
                    <div>
                      <div className="text-sm font-medium" style={{ color: WINE }}>{o.number}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(o.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold" style={{ color: WINE }}>
                        {o.currency} {o.total.toLocaleString()}
                      </div>
                      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        {o.status}
                      </div>
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

        <div className="rounded-xl border border-dashed border-border bg-white/60 p-4 text-center text-xs text-muted-foreground">
          Account data is served by the new Shaniid RX backend (NestJS, in-memory today,
          Postgres-ready). Sign-in with Clerk arrives in a future release.
        </div>
      </div>
    </div>
  )
}
