import { useMemo, useState } from "react"
import { Link } from "wouter"
import {
  Pill,
  FileText,
  ArrowLeft,
  ShieldCheck,
  Upload,
  Loader2,
  RefreshCw,
  Eye,
  ChevronRight,
  Bell,
  Calendar,
  ShoppingBag,
} from "lucide-react"
import { AccountShell } from "@/components/account/account-shell"
import { Seo } from "@/components/seo"
import {
  useMyPrescriptions,
  useMe,
  useRefillReminders,
  apiPrescriptions,
  apiRefillReminders,
  type AccountPrescription,
  type RxStatus,
  type SubscriptionFrequency,
} from "@/lib/api-nest"
import { RxDetailModal, StatusPill, STATUS_META, fmtTime } from "@/components/account/rx-detail-modal"
import { RxBuyModal } from "@/components/account/rx-buy-modal"
import { PaystackPaymentModal } from "@/components/store/paystack-payment-modal"

const WINE = "#3D0814"
const ACCENT = "#F97316"
const ACCENT_RED = "#B91C1C"
const CREAM = "#FFFBF5"

export default function AccountPrescriptionsPage() {
  const { data: me } = useMe()
  const refillPrefOn =
    (me?.profile?.notifications as { refillReminders?: boolean } | undefined)?.refillReminders !== false
  const { data, isLoading, error, mutate } = useMyPrescriptions()
  const {
    data: reminders,
    isLoading: remindersLoading,
    mutate: mutateReminders,
  } = useRefillReminders(refillPrefOn)
  const items = useMemo<AccountPrescription[]>(() => data ?? [], [data])

  const [openId, setOpenId] = useState<string | null>(null)
  const [payRefillId, setPayRefillId] = useState<string | null>(null)
  const [subscribingId, setSubscribingId] = useState<string | null>(null)
  const [filter, setFilter] = useState<RxStatus | "all">("all")
  const [buyRxId, setBuyRxId] = useState<string | null>(null)
  const open = openId ? items.find((x) => x.id === openId) ?? null : null
  const buyRx = buyRxId ? items.find((x) => x.id === buyRxId) ?? null : null

  const counts = useMemo(() => {
    const c = {
      all: items.length,
      pending: 0,
      verified: 0,
      accepted: 0,
      declined: 0,
      dispensed: 0,
      rejected: 0,
    }
    items.forEach((r) => {
      if (r.status in c) c[r.status as keyof typeof c]++
    })
    return c
  }, [items])

  const filtered = useMemo(
    () => filter === "all" ? items : items.filter((r) => r.status === filter),
    [items, filter],
  )

  return (
    <AccountShell
      title="My Prescriptions"
      subtitle="Upload, review and refill your prescriptions"
      user={{ name: me?.fullName || "You", email: me?.email || "", phone: me?.phone }}
    >
      <Seo
        title="My Prescriptions — Shaniid RX"
        description="View, refill and track the status of your prescriptions on Shaniid RX."
        canonicalPath="/account/prescriptions"
        noindex
      />
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <button
              onClick={() => { void mutate() }}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-white px-3 text-xs font-semibold"
              style={{ color: WINE }}
              title="Refresh"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
            <Link
              href="/upload-prescription"
              className="inline-flex h-9 items-center gap-1.5 rounded-md px-4 text-xs font-semibold text-white shadow-sm"
              style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_RED} 100%)` }}
            >
              <Upload className="h-3.5 w-3.5" /> Upload prescription
            </Link>
          </div>
        </div>

        {/* Hero card with brand language and the trust seal motif. */}
        <div
          className="relative overflow-hidden rounded-2xl p-6 text-white shadow-lg"
          style={{ background: `linear-gradient(135deg, ${WINE} 0%, #6B0F1A 100%)` }}
        >
          <div
            aria-hidden
            className="absolute -right-10 -top-10 h-44 w-44 rounded-full opacity-20"
            style={{ background: `radial-gradient(circle, ${ACCENT} 0%, transparent 65%)` }}
          />
          <div className="relative flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-white/70">
                <ShieldCheck className="h-3.5 w-3.5" /> Trust seal · Verified care
              </div>
              <h1 className="mt-1 text-2xl font-bold">My prescriptions</h1>
              <p className="mt-1 max-w-xl text-sm text-white/80">
                Follow each prescription from upload through verification to delivery. Approved
                medication, dosage and pharmacist instructions appear here as soon as your
                pharmacist signs off.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <KpiChip label="Total" value={counts.all} tone="rgba(255,255,255,0.95)" />
              <KpiChip label="Ready / paid" value={counts.verified + counts.accepted + counts.dispensed} tone="#86EFAC" />
            </div>
          </div>
        </div>

          {refillPrefOn && (
            <RefillRemindersPanel
              items={items}
              reminders={reminders}
              loading={remindersLoading}
              subscribingId={subscribingId}
              onSubscribe={async (rxId, frequency) => {
                setSubscribingId(rxId)
                try {
                  await apiPrescriptions.subscribe(rxId, frequency)
                  await mutateReminders()
                } finally {
                  setSubscribingId(null)
                }
              }}
              onPayRefill={(id) => setPayRefillId(id)}
            />
          )}

          {/* Quotation-ready alert banner */}
          {(counts.verified > 0 || counts.accepted > 0) && (
            <button
              type="button"
              onClick={() => setFilter(counts.verified > 0 ? "verified" : "accepted")}
              className="flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition hover:opacity-90"
              style={{ background: "#ECFDF5", borderColor: "#6EE7B7", color: "#065F46" }}
            >
              <div className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg" style={{ background: "#6EE7B7" }}>
                <Bell className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold">
                  {counts.verified > 0
                    ? `You have ${counts.verified} quotation${counts.verified === 1 ? "" : "s"} ready to review`
                    : `You have ${counts.accepted} prescription${counts.accepted === 1 ? "" : "s"} ready to pay`}
                </p>
                <p className="text-xs mt-0.5">
                  {counts.verified > 0
                    ? "Your pharmacist has reviewed and priced your medication — click here to accept and proceed to payment."
                    : "You accepted a quotation — click here to complete payment for your medication."}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 flex-shrink-0" />
            </button>
          )}

          {/* Filter pills */}
          <div className="flex flex-wrap items-center gap-2">
            <FilterPill label={`All (${counts.all})`}                active={filter === "all"}       onClick={() => setFilter("all")} />
            <FilterPill label={`Awaiting (${counts.pending})`}       active={filter === "pending"}   onClick={() => setFilter("pending")} />
            <FilterPill label={`Quotation (${counts.verified})`}     active={filter === "verified"}  onClick={() => setFilter("verified")} />
            <FilterPill label={`To pay (${counts.accepted})`}        active={filter === "accepted"}  onClick={() => setFilter("accepted")} />
            <FilterPill label={`Validated (${counts.dispensed})`}  active={filter === "dispensed"} onClick={() => setFilter("dispensed")} />
            {counts.rejected > 0 && (
              <FilterPill label={`Action required (${counts.rejected})`} active={filter === "rejected"} onClick={() => setFilter("rejected")} />
            )}
          </div>

          {/* List */}
          <div className="rounded-2xl border border-border bg-white shadow-sm">
            {error && items.length === 0 ? (
              <div className="space-y-3 px-6 py-14 text-center">
                <div
                  className="mx-auto grid h-14 w-14 place-items-center rounded-full"
                  style={{ background: `${ACCENT_RED}1a`, color: ACCENT_RED }}
                >
                  <FileText className="h-6 w-6" />
                </div>
                <p className="text-base font-semibold" style={{ color: WINE }}>
                  We couldn't load your prescriptions
                </p>
                <p className="mx-auto max-w-sm text-xs text-muted-foreground">
                  Something went wrong reaching the pharmacy. Check your connection and try again.
                </p>
                <button
                  type="button"
                  onClick={() => void mutate()}
                  className="inline-flex h-10 items-center gap-1.5 rounded-md px-5 text-sm font-semibold text-white"
                  style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_RED} 100%)` }}
                >
                  Try again
                </button>
              </div>
            ) : isLoading && items.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading your prescriptions…
              </div>
            ) : filtered.length === 0 ? (
              <div className="space-y-3 px-6 py-14 text-center">
                <div
                  className="mx-auto grid h-14 w-14 place-items-center rounded-full"
                  style={{ background: `${ACCENT}1a`, color: ACCENT }}
                >
                  <FileText className="h-6 w-6" />
                </div>
                <p className="text-base font-semibold" style={{ color: WINE }}>
                  {items.length === 0 ? "No prescriptions yet" : "No prescriptions in this filter"}
                </p>
                <p className="mx-auto max-w-sm text-xs text-muted-foreground">
                  {items.length === 0
                    ? "Upload a prescription and a verified pharmacist will review it. You'll see approved medication and notes here as soon as it's reviewed."
                    : "Try a different filter or upload a new prescription."}
                </p>
                <Link
                  href="/upload-prescription"
                  className="inline-flex h-10 items-center gap-1.5 rounded-md px-5 text-sm font-semibold text-white"
                  style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_RED} 100%)` }}
                >
                  <Upload className="h-4 w-4" /> Upload prescription
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {filtered.map((rx) => (
                  <li key={rx.id}>
                    <div className="flex items-center gap-3 px-5 py-4">
                      <div
                        className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl"
                        style={{ background: STATUS_META[rx.status].bg, color: STATUS_META[rx.status].color }}
                      >
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold" style={{ color: WINE }}>
                            Rx-{rx.rxNumber}
                          </span>
                          <StatusPill k={rx.status} />
                          {rx.approvedDrugs.length > 0 && (
                            <span
                              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                              style={{ background: `${ACCENT}1a`, color: ACCENT }}
                            >
                              <Pill className="h-2.5 w-2.5" />
                              {rx.approvedDrugs.length} medication{rx.approvedDrugs.length === 1 ? "" : "s"}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 truncate text-xs text-muted-foreground">
                          For {rx.recipient} · {rx.files[0]?.name || "Prescription"}
                          {rx.files.length > 1 ? ` +${rx.files.length - 1}` : ""}
                        </div>
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          Updated {fmtTime(rx.updatedAt)}
                        </div>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-2">
                        {(rx.status === "verified" || rx.status === "accepted") && rx.approvedDrugs.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setBuyRxId(rx.id)}
                            className="inline-flex h-8 items-center gap-1 rounded-md px-3 text-[11px] font-bold text-white shadow"
                            style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_RED} 100%)` }}
                          >
                            <ShoppingBag className="h-3.5 w-3.5" />
                            {rx.status === "accepted" ? "Pay" : "Buy now"}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setOpenId(rx.id)}
                          aria-label={`View prescription Rx-${rx.rxNumber}`}
                          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-white px-3 text-[11px] font-bold shadow-sm transition hover:shadow"
                          style={{ color: WINE }}
                        >
                          <Eye className="h-3.5 w-3.5" /> View
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

      {open && (
        <RxDetailModal
          rx={open}
          onClose={() => setOpenId(null)}
          onAccept={async () => {
            await apiPrescriptions.acceptQuotation(open.id)
            await mutate()
          }}
          onDecline={async () => {
            await apiPrescriptions.declineQuotation(open.id)
            await mutate()
            setOpenId(null)
          }}
          onPay={() => {
            setBuyRxId(open.id)
            setOpenId(null)
          }}
        />
      )}

      {buyRx && (
        <RxBuyModal
          rx={buyRx}
          onClose={() => setBuyRxId(null)}
          onPaid={() => { setBuyRxId(null); void mutate() }}
        />
      )}

      {payRefillId && reminders && (() => {
        const refill = reminders.dueRefills.find((r) => r.id === payRefillId)
        if (!refill) return null
        const rx = items.find((x) => x.id === refill.prescriptionId)
        if (!rx) return null
        return (
        <RefillPayModal
          refill={refill}
          rx={rx}
          onClose={() => setPayRefillId(null)}
          onPaid={() => {
            setPayRefillId(null)
            void mutateReminders()
            void mutate()
          }}
        />
        )
      })()}
    </AccountShell>
  )
}

const ksh = (n: number) => `KSh ${Math.round(n).toLocaleString()}`

const FREQ_LABEL: Record<SubscriptionFrequency, string> = {
  weekly: "Weekly",
  biweekly: "Every 2 weeks",
  monthly: "Monthly",
  quarterly: "Quarterly",
}

function RefillRemindersPanel({
  items,
  reminders,
  loading,
  subscribingId,
  onSubscribe,
  onPayRefill,
}: {
  items: AccountPrescription[]
  reminders: ReturnType<typeof useRefillReminders>["data"]
  loading: boolean
  subscribingId: string | null
  onSubscribe: (rxId: string, frequency: SubscriptionFrequency) => Promise<void>
  onPayRefill: (refillId: string) => void
}) {
  const activeSubRx = new Set(
    (reminders?.subscriptions ?? []).filter((s) => s.status === "active").map((s) => s.prescriptionId),
  )
  const eligible = items.filter(
    (r) =>
      (r.status === "verified" || r.status === "accepted" || r.status === "dispensed") &&
      r.approvedDrugs.length > 0 &&
      !activeSubRx.has(r.id),
  )
  const due = reminders?.dueRefills ?? []
  const upcoming = reminders?.upcoming ?? []

  if (loading && !reminders) {
    return (
      <div className="rounded-2xl border border-border bg-white px-5 py-4 text-sm text-muted-foreground flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading refill reminders…
      </div>
    )
  }

  if (due.length === 0 && upcoming.length === 0 && eligible.length === 0) return null

  return (
    <div
      className="rounded-2xl border p-5 space-y-4"
      style={{ background: "#fff", borderColor: "#F2DCC8" }}
    >
      <div className="flex items-center gap-2">
        <Bell className="h-4 w-4" style={{ color: ACCENT }} />
        <h2 className="text-sm font-bold" style={{ color: WINE }}>Refill reminders</h2>
      </div>

      {due.length > 0 && (
        <ul className="space-y-2">
          {due.map((r) => {
            const rx = items.find((x) => x.id === r.prescriptionId)
            return (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl px-4 py-3"
                style={{ background: "#FFF1E6", border: "1px solid #F2DCC8" }}
              >
                <div>
                  <p className="text-sm font-semibold" style={{ color: WINE }}>
                    Refill due · {rx ? `Rx-${rx.rxNumber}` : "Prescription"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {ksh(r.amount)} · due {new Date(r.dueAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onPayRefill(r.id)}
                  className="h-9 px-4 rounded-full text-xs font-bold text-white"
                  style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_RED} 100%)` }}
                >
                  Pay refill
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {upcoming.length > 0 && (
        <div className="text-xs text-muted-foreground space-y-1">
          {upcoming.slice(0, 3).map((u) => (
            <p key={u.subscriptionId} className="flex items-center gap-1.5">
              <Calendar className="h-3 w-3" />
              Next {FREQ_LABEL[u.frequency] ?? u.frequency} refill · {new Date(u.dueAt).toLocaleDateString()} · {ksh(u.amount)}
            </p>
          ))}
        </div>
      )}

      {eligible.length > 0 && (
        <div className="space-y-2 pt-1 border-t border-border">
          <p className="text-xs font-semibold text-muted-foreground">Enable automatic refills</p>
          {eligible.map((rx) => (
            <div key={rx.id} className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium" style={{ color: WINE }}>
                Rx-{rx.rxNumber} · {rx.recipient}
              </span>
              <button
                type="button"
                disabled={subscribingId === rx.id}
                onClick={() => void onSubscribe(rx.id, "monthly")}
                className="h-8 px-3 rounded-md text-xs font-semibold border disabled:opacity-50"
                style={{ borderColor: "#F2DCC8", color: WINE }}
              >
                {subscribingId === rx.id ? "Saving…" : "Monthly reminders"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function RefillPayModal({
  refill,
  rx,
  onClose,
  onPaid,
}: {
  refill: { id: string; amount: number; prescriptionId: string }
  rx?: AccountPrescription
  onClose: () => void
  onPaid: () => void
}) {
  if (!rx) return null
  return (
    <PaystackPaymentModal
      isOpen
      onClose={onClose}
      total={refill.amount}
      customerName={rx.recipient}
      defaultPhone={rx.phone}
      defaultEmail={rx.email}
      createPendingOrder={async () => ({ orderNumber: `RX-REFILL-${rx.rxNumber}` })}
      onPaymentConfirmed={async (result) => {
        try {
          await apiRefillReminders.payRefill(refill.id, {
            reference: result.reference,
            receipt: result.mpesaReceipt,
          })
        } finally {
          onPaid()
        }
      }}
    />
  )
}

function KpiChip({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-lg bg-white/10 px-3 py-2 text-center backdrop-blur" style={{ minWidth: 72 }}>
      <div className="text-[10px] uppercase tracking-widest text-white/70">{label}</div>
      <div className="text-lg font-bold" style={{ color: tone }}>{value}</div>
    </div>
  )
}

function FilterPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      type="button"
      className="h-8 rounded-full px-3 text-[11px] font-semibold uppercase tracking-wider transition"
      style={
        active
          ? { background: WINE, color: "#fff" }
          : { background: "#fff", color: WINE, boxShadow: "inset 0 0 0 1px #E5E7EB" }
      }
    >
      {label}
    </button>
  )
}

