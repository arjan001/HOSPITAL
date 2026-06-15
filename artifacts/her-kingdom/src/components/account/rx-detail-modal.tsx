import { useEffect } from "react"
import { Link } from "wouter"
import {
  Clock,
  XCircle,
  Pill,
  FileText,
  Stethoscope,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  MessageCircle,
  Calendar,
  User as UserIcon,
  CheckCheck,
  Eye,
  CreditCard,
  X,
} from "lucide-react"
import {
  refreshMyPrescriptions,
  rxFileUrl,
  DEFAULT_DRUG_PRICE,
  type AccountPrescription,
  type RxStatus,
} from "@/lib/api-nest"

const WINE = "#3D0814"
const ACCENT = "#F97316"
const ACCENT_RED = "#B91C1C"

export const STATUS_META: Record<RxStatus, {
  label: string
  color: string
  bg: string
  ring: string
  Icon: typeof Clock
  blurb: string
}> = {
  pending:   { label: "Validation pending", color: "#92400E", bg: "#FEF3C7", ring: "#FCD34D", Icon: Clock,        blurb: "Your prescription is with our pharmacy team for review. You'll receive a quotation when it's ready." },
  verified:  { label: "Quotation ready",    color: "#166534", bg: "#DCFCE7", ring: "#86EFAC", Icon: ShieldCheck,  blurb: "Your medication list and pricing are ready. Review the quotation below and accept to proceed to payment." },
  accepted:  { label: "Ready to pay",       color: "#1D4ED8", bg: "#DBEAFE", ring: "#93C5FD", Icon: CreditCard,   blurb: "You've accepted the quotation. Complete payment to validate your order." },
  declined:  { label: "Quotation declined", color: "#6B7280", bg: "#F3F4F6", ring: "#D1D5DB", Icon: XCircle,      blurb: "You declined this quotation. Upload a new prescription or contact us if you'd like a revised quote." },
  dispensed: { label: "Order validated",    color: "#1E40AF", bg: "#DBEAFE", ring: "#93C5FD", Icon: CheckCheck,   blurb: "Payment received — your medication is being dispensed and prepared for delivery." },
  rejected:  { label: "Action required",    color: "#991B1B", bg: "#FEE2E2", ring: "#FCA5A5", Icon: XCircle,      blurb: "We couldn't accept this prescription as-is. See the pharmacist's note for next steps." },
}

export function StatusPill({ k, size = "sm" }: { k: RxStatus; size?: "sm" | "md" }) {
  const meta = STATUS_META[k]
  const Icon = meta.Icon
  const pad = size === "md" ? "px-3 py-1.5 text-xs" : "px-2.5 py-1 text-[11px]"
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-bold uppercase tracking-wider ${pad}`}
      style={{ background: meta.bg, color: meta.color, boxShadow: `inset 0 0 0 1px ${meta.ring}` }}
    >
      <Icon className={size === "md" ? "h-3.5 w-3.5" : "h-3 w-3"} /> {meta.label}
    </span>
  )
}

const ksh = (n: number) => `KSh ${Math.round(n).toLocaleString()}`
type RxDrug = AccountPrescription["approvedDrugs"][number]
const isPriced = (d: RxDrug) => typeof d.price === "number" && d.price >= 0
const drugUnitPrice = (d: RxDrug) => (isPriced(d) ? (d.price as number) : DEFAULT_DRUG_PRICE)
const drugQty = (d: RxDrug) => (typeof d.quantity === "number" && d.quantity >= 1 ? d.quantity : 1)

/** Priced line items exist but status may lag behind after admin sends quotation. */
export function hasQuotationContent(rx: AccountPrescription): boolean {
  return rx.approvedDrugs.length > 0 && rx.approvedDrugs.some(isPriced)
}

export function effectiveRxStatus(rx: AccountPrescription): RxStatus {
  if (rx.status === "pending" && hasQuotationContent(rx)) return "verified"
  return rx.status
}

export function fmtTime(iso: string): string {
  const d = new Date(iso)
  const now = Date.now()
  const diff = (now - d.getTime()) / 1000
  if (diff < 60) return "just now"
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return d.toLocaleDateString()
}

export function RxDetailModal({
  rx,
  onClose,
  onAccept,
  onDecline,
  onPay,
}: {
  rx: AccountPrescription
  onClose: () => void
  onAccept?: () => void | Promise<void>
  onDecline?: () => void | Promise<void>
  onPay?: () => void
}) {
  const displayStatus = effectiveRxStatus(rx)
  const meta = STATUS_META[displayStatus]
  const statusLag = rx.status === "pending" && hasQuotationContent(rx)
  const showQuotation =
    rx.status === "verified" ||
    rx.status === "accepted" ||
    rx.status === "dispensed" ||
    statusLag
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])
  useEffect(() => {
    if (statusLag) void refreshMyPrescriptions()
  }, [rx.id, statusLag])
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="rx-detail-title"
    >
      <div
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="relative overflow-hidden px-6 py-5 text-white"
          style={{ background: `linear-gradient(135deg, ${WINE} 0%, #6B0F1A 100%)` }}
        >
          <div
            aria-hidden
            className="absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-25"
            style={{ background: `radial-gradient(circle, ${ACCENT} 0%, transparent 60%)` }}
          />
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-white/70">Prescription</div>
              <div id="rx-detail-title" className="mt-0.5 text-xl font-bold">Rx-{rx.rxNumber}</div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <StatusPill k={displayStatus} size="md" />
                {statusLag && (
                  <span className="text-[10px] font-medium text-white/80">
                    Status updating — use Refresh if actions are unavailable.
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
              aria-label="Close"
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <div
            className="flex items-start gap-3 rounded-xl border p-3 text-sm"
            style={{ background: meta.bg, borderColor: meta.ring, color: meta.color }}
          >
            <meta.Icon className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p className="text-xs font-medium leading-relaxed">{meta.blurb}</p>
          </div>

          <section>
            <SectionHeading icon={Pill} title={showQuotation ? "Your quotation" : "Medication"} />
            {rx.approvedDrugs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4 text-center">
                <Sparkles className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  {rx.status === "pending"
                    ? "Your prescription is being reviewed. Pricing and medication details will appear here once the pharmacist sends your quotation."
                    : "The pharmacist hasn't added medication yet."}
                </p>
              </div>
            ) : !showQuotation ? (
              <div className="rounded-xl border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
                {rx.approvedDrugs.length} line{rx.approvedDrugs.length === 1 ? "" : "s"} identified — pricing is shared after pharmacist verification.
              </div>
            ) : (
              <ul className="space-y-2">
                {rx.approvedDrugs.map((d, i) => (
                  <li key={i} className="rounded-xl border border-border bg-white p-3 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div
                        className="mt-0.5 grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg"
                        style={{ background: `${ACCENT}1a`, color: ACCENT }}
                      >
                        <Pill className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="text-sm font-bold" style={{ color: WINE }}>{d.name}</span>
                          {d.dosage && (
                            <span
                              className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                              style={{ background: "#F3F4F6", color: "#4B5563" }}
                            >
                              {d.dosage}
                            </span>
                          )}
                          <span className="ml-auto text-sm font-bold" style={{ color: WINE }}>
                            {ksh(drugUnitPrice(d) * drugQty(d))}
                          </span>
                        </div>
                        <div className="mt-0.5 text-[11px] text-muted-foreground">
                          {ksh(drugUnitPrice(d))} × {drugQty(d)}
                          {!isPriced(d) && (
                            <span className="ml-1 rounded bg-amber-100 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-700">
                              Estimated
                            </span>
                          )}
                        </div>
                        {d.instructions && (
                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{d.instructions}</p>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {showQuotation && rx.approvedDrugs.length > 0 && (
              <div className="mt-2 flex items-center justify-between rounded-xl border border-border bg-muted/30 px-3 py-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total</span>
                <span className="text-sm font-bold" style={{ color: WINE }}>
                  {ksh(rx.approvedDrugs.reduce((s, d) => s + drugUnitPrice(d) * drugQty(d), 0))}
                </span>
              </div>
            )}
          </section>

          {rx.payment && (
            <section>
              <SectionHeading icon={CreditCard} title="Payment" />
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Paid</span>
                  <span className="font-bold">{ksh(rx.payment.amount)}</span>
                </div>
                <div className="mt-1 text-[11px] text-emerald-800">
                  {rx.payment.receipt ? `M-PESA ${rx.payment.receipt} · ` : ""}
                  {new Date(rx.payment.at).toLocaleString()}
                </div>
              </div>
            </section>
          )}

          {rx.doctorNote && (
            <section>
              <SectionHeading icon={Stethoscope} title="Doctor's note" />
              <div
                className="rounded-xl border-l-4 bg-sky-50/70 p-3 text-xs text-sky-900"
                style={{ borderColor: "#0EA5E9" }}
              >
                <p className="whitespace-pre-wrap">{rx.doctorNote}</p>
              </div>
            </section>
          )}

          {rx.files.length > 0 && (rx.extractionStatus ?? "pending") !== "skipped" && (
            <section>
              <SectionHeading icon={Sparkles} title="Prescription scan" />
              <div
                className="rounded-xl border px-3 py-2.5 text-xs"
                style={{ borderColor: "#93C5FD", background: "#EFF6FF", color: "#1E3A8A" }}
              >
                {rx.extractionStatus === "pending" || rx.extractionStatus === "processing" ? (
                  <p>We&apos;re reading your prescription scan. A pharmacist will confirm the medication list shortly.</p>
                ) : rx.extractionStatus === "completed" && (rx.extractedDrugs?.length ?? 0) > 0 ? (
                  <p>
                    We detected {(rx.extractedDrugs ?? []).length} medication line
                    {(rx.extractedDrugs ?? []).length === 1 ? "" : "s"} on your scan — your pharmacist will verify and send a quotation.
                  </p>
                ) : rx.extractionStatus === "failed" ? (
                  <p>We couldn&apos;t auto-read this scan. Our pharmacy team will enter your medications manually.</p>
                ) : (
                  <p>Your scan is on file for pharmacist review.</p>
                )}
              </div>
            </section>
          )}

          {rx.pharmacistNote && (
            <section>
              <SectionHeading icon={Stethoscope} title="Pharmacist note" />
              <div
                className="rounded-xl border-l-4 bg-amber-50/70 p-3 text-xs text-amber-900"
                style={{ borderColor: "#F59E0B" }}
              >
                <p className="whitespace-pre-wrap">{rx.pharmacistNote}</p>
              </div>
            </section>
          )}

          {rx.status === "rejected" && rx.rejectedReason && (
            <section>
              <SectionHeading icon={XCircle} title="Why this was declined" />
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-900">
                <p className="whitespace-pre-wrap">{rx.rejectedReason}</p>
              </div>
            </section>
          )}

          <section>
            <SectionHeading icon={UserIcon} title="Details" />
            <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <DetailRow label="For" value={rx.recipient} />
              <DetailRow label="Date of birth" value={rx.dob ? new Date(rx.dob).toLocaleDateString() : "—"} />
              <DetailRow label="Payment" value={rx.paymentMethod === "insurance" ? "Insurance" : rx.paymentMethod === "cash" ? "Cash" : "—"} />
              <DetailRow label="Uploaded" value={new Date(rx.createdAt).toLocaleString()} />
            </dl>
          </section>

          {rx.files.length > 0 && (
            <section>
              <SectionHeading icon={FileText} title="Attached files" />
              <ul className="space-y-1.5">
                {rx.files.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-xs">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="truncate" style={{ color: WINE }}>{f.name}</span>
                    {typeof f.size === "number" && (
                      <span className="ml-auto text-[10px] text-muted-foreground">
                        {Math.round(f.size / 1024)} KB
                      </span>
                    )}
                    <a
                      href={rxFileUrl(rx.id, i)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex h-7 items-center gap-1 rounded-md border border-border bg-white px-2 text-[11px] font-semibold ${typeof f.size === "number" ? "" : "ml-auto"}`}
                      style={{ color: WINE }}
                    >
                      <Eye className="h-3 w-3" /> View
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <SectionHeading icon={Calendar} title="Timeline" />
            <ol className="relative space-y-3 border-l border-border pl-4">
              {rx.timeline.map((ev, i) => (
                <li key={i} className="relative">
                  <span
                    className="absolute -left-[21px] top-1 grid h-3 w-3 place-items-center rounded-full"
                    style={{ background: ev.kind === "payment" ? "#10B981" : i === rx.timeline.length - 1 ? ACCENT : "#D1D5DB" }}
                  />
                  <p className="text-xs font-medium" style={{ color: WINE }}>{ev.label}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {fmtTime(ev.at)} {ev.by ? `· ${ev.by}` : ""}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border bg-muted/30 px-6 py-3">
          <button
            onClick={() => { void refreshMyPrescriptions() }}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-white px-3 text-xs font-semibold"
            style={{ color: WINE }}
            type="button"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {displayStatus === "verified" && rx.approvedDrugs.length > 0 && onAccept && (
              <button
                type="button"
                onClick={() => void onAccept()}
                className="inline-flex h-9 items-center gap-1.5 rounded-md px-4 text-xs font-semibold text-white"
                style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_RED} 100%)` }}
              >
                Accept quotation
              </button>
            )}
            {displayStatus === "verified" && onDecline && (
              <button
                type="button"
                onClick={() => void onDecline()}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-white px-3 text-xs font-semibold"
                style={{ color: WINE }}
              >
                Decline
              </button>
            )}
            {displayStatus === "accepted" && rx.approvedDrugs.length > 0 && onPay && (
              <button
                type="button"
                onClick={onPay}
                className="inline-flex h-9 items-center gap-1.5 rounded-md px-4 text-xs font-semibold text-white"
                style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_RED} 100%)` }}
              >
                <CreditCard className="h-3.5 w-3.5" /> Pay now
              </button>
            )}
            <Link
              href="/account/chat"
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-white px-3 text-xs font-semibold"
              style={{ color: WINE }}
            >
              <MessageCircle className="h-3.5 w-3.5" /> Message pharmacist
            </Link>
            <button
              onClick={onClose}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-white px-3 text-xs font-semibold"
              style={{ color: WINE }}
              type="button"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function SectionHeading({ icon: Icon, title }: { icon: typeof Pill; title: string }) {
  return (
    <div className="mb-2 flex items-center gap-1.5">
      <Icon className="h-3.5 w-3.5" style={{ color: ACCENT }} />
      <h3 className="text-[11px] font-bold uppercase tracking-widest" style={{ color: WINE }}>
        {title}
      </h3>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 rounded-lg border border-border bg-white px-3 py-2">
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="truncate text-xs font-semibold" style={{ color: WINE }}>{value}</dd>
    </div>
  )
}
