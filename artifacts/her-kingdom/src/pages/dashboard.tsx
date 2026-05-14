"use client"

import { useState, useMemo, useEffect, type ReactNode } from "react"
import { useUser } from "@clerk/react"
import { Link } from "wouter"
import { TopBar } from "@/components/store/top-bar"
import { Navbar } from "@/components/store/navbar"
import { Footer } from "@/components/store/footer"
import { useCmsDoc, useCmsCollection, newId, type CmsRecord } from "@/lib/cms-store"
import { useWishlist } from "@/lib/wishlist-context"
import { useCart } from "@/lib/cart-context"
import { notify } from "@/lib/notify"
import { Seo, organizationJsonLd, websiteJsonLd, breadcrumbJsonLd, faqJsonLd, productJsonLd } from "@/components/seo"
import {
  UserCircle, Package, FileText, Heart, Users, Stethoscope, Coins, MapPin, LogOut,
  ChevronUp, ChevronDown, Search, Edit3, Trash2, Plus, Check, ChevronLeft, ChevronRight,
  ShoppingBag,
} from "lucide-react"

/* ----------------------------------------------------------------
   Design tokens — taken straight from the Figma dashboard mockup.
   We intentionally do NOT theme this page in wine; it's a clean
   white surface with green active states and pink accents.
---------------------------------------------------------------- */
const GREEN_500       = "#22C55E"
const GREEN_600       = "#16A34A"
const GREEN_50        = "#F0FDF4"
const PINK_500        = "#EC4899"
const PINK_600        = "#DB2777"
const PINK_50         = "#FDF2F8"
const BLACK_PILL      = "#111827"
const BORDER          = "#E5E7EB"
const BORDER_SOFT     = "#F3F4F6"
const TEXT            = "#111827"
const TEXT_MUTED      = "#6B7280"

type TabId =
  | "profile" | "orders" | "prescriptions" | "wishlist"
  | "beneficiaries" | "consultations" | "loyalty" | "addresses"

const NAV: Array<{ id: TabId; label: string; icon: typeof UserCircle }> = [
  { id: "profile",        label: "My Profile",       icon: UserCircle },
  { id: "orders",         label: "My Orders",        icon: Package },
  { id: "prescriptions",  label: "My Prescriptions", icon: FileText },
  { id: "wishlist",       label: "Wishlist",         icon: Heart },
  { id: "beneficiaries",  label: "Beneficiaries",    icon: Users },
  { id: "consultations",  label: "Consultation",     icon: Stethoscope },
  { id: "loyalty",        label: "Loyalty Points",   icon: Coins },
  { id: "addresses",      label: "Manage Address",   icon: MapPin },
]

/* ---------- Profile (reuses /account/settings cmsDoc) ---------- */
type Profile = {
  identity: {
    firstName: string; lastName: string; email: string; phone: string
    dateOfBirth: string; gender: "male" | "female" | "other" | "prefer_not"
    language: "en" | "sw"; country: string
  }
}
const PROFILE_DEFAULTS: Profile = {
  identity: {
    firstName: "Shakila", lastName: "Marando", email: "shakila@example.com",
    phone: "254113626187", dateOfBirth: "2008-05-05",
    gender: "female", language: "en", country: "Kenya",
  },
}

/* ---------- CMS-backed mock collections for empty/seed states ---------- */
type OrderRow = CmsRecord & {
  orderNumber: string; date: string; total: number; address: string
  status: "Pending" | "Confirmed" | "Shipped" | "Delivered" | "Cancelled" | "Returned"
}
type PrescriptionRow = CmsRecord & {
  rxNumber: string; name: string; date: string; total: number
  recipient: string; status: "Pending" | "Verified" | "Dispensed" | "Cancelled"
}
type BeneficiaryRow = CmsRecord & {
  name: string; relationship: string; healthConditions: string; phone: string
}
type AddressRow = CmsRecord & {
  fullName: string; line: string; city: string; country: string; phone: string
  isDefault: boolean
}
type LoyaltyRow = CmsRecord & {
  documentNo: string; date: string; expiration: string; points: number; remaining: number
}
type ConsultationRow = CmsRecord & {
  bookingId: string; whenIso: string; service: string
  bookingFor: string; mode: "Video" | "In-Person" | "Phone"
  status: "Upcoming" | "Past"
}

/* ---------- Page ---------- */

const VALID_TABS: TabId[] = [
  "profile", "orders", "prescriptions", "wishlist",
  "beneficiaries", "consultations", "loyalty", "addresses",
]

function readInitialTab(): TabId {
  if (typeof window === "undefined") return "profile"
  try {
    const t = new URLSearchParams(window.location.search).get("tab") as TabId | null
    if (t && VALID_TABS.includes(t)) return t
  } catch { /* ignore */ }
  return "profile"
}

export default function DashboardPage() {
  const [tab, setTab] = useState<TabId>(readInitialTab)

  // Keep ?tab= in sync without adding history entries.
  useEffect(() => {
    if (typeof window === "undefined") return
    const url = new URL(window.location.href)
    if (tab === "profile") url.searchParams.delete("tab")
    else url.searchParams.set("tab", tab)
    window.history.replaceState(null, "", url.toString())
  }, [tab])

  return (
    <div className="min-h-screen flex flex-col bg-white" style={{ color: TEXT }}>
      <Seo title="Your Account" description="Manage your Shaniid RX orders, prescriptions, addresses and payment methods in one calm, secure dashboard." canonicalPath="/dashboard" noindex />
      <TopBar />
      <Navbar />

      <main className="flex-1 bg-[#FAFAFA]">
        <div className="max-w-6xl mx-auto px-4 py-6 lg:py-10">
          {/* Breadcrumb */}
          <nav className="text-sm mb-5 flex items-center gap-1 text-[#6B7280]">
            <Link href="/" className="hover:text-[#111827]">Home</Link>
            <span>/</span>
            <span className="font-semibold text-[#111827]">{NAV.find((n) => n.id === tab)?.label || "My Profile"}</span>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-5">
            {/* Sidebar */}
            <Sidebar tab={tab} onChange={setTab} />

            {/* Right pane */}
            <div className="min-w-0 space-y-5">
              {tab === "profile"        && <ProfileTab />}
              {tab === "orders"         && <OrdersTab />}
              {tab === "prescriptions"  && <PrescriptionsTab />}
              {tab === "wishlist"       && <WishlistTab />}
              {tab === "beneficiaries"  && <BeneficiariesTab />}
              {tab === "consultations"  && <ConsultationsTab />}
              {tab === "loyalty"        && <LoyaltyTab />}
              {tab === "addresses"      && <AddressesTab />}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

/* ---------- Sidebar ---------- */

function Sidebar({ tab, onChange }: { tab: TabId; onChange: (t: TabId) => void }) {
  return (
    <aside className="lg:sticky lg:top-6 self-start">
      <div className="rounded-xl bg-white border p-2.5 space-y-0.5" style={{ borderColor: BORDER }}>
        {NAV.map((item) => {
          const isActive = tab === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-colors text-left"
              style={{
                background: isActive ? GREEN_50 : "transparent",
                color: isActive ? GREEN_600 : TEXT,
                fontWeight: isActive ? 600 : 500,
              }}
            >
              <span
                className="grid place-items-center h-7 w-7 rounded-lg flex-shrink-0"
                style={{
                  background: isActive ? "white" : "transparent",
                  border: isActive ? `1px solid ${GREEN_500}` : "1px solid transparent",
                  color: isActive ? GREEN_600 : "#374151",
                }}
              >
                <item.icon className="h-4 w-4" />
              </span>
              <span className="flex-1">{item.label}</span>
              {isActive && <Check className="h-3.5 w-3.5" style={{ color: GREEN_600 }} />}
            </button>
          )
        })}
        <div className="pt-1 mt-1 border-t" style={{ borderColor: BORDER_SOFT }}>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") window.location.href = "/"
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-colors text-left font-medium"
            style={{ color: PINK_500 }}
          >
            <span
              className="grid place-items-center h-7 w-7 rounded-lg"
              style={{ border: `1px solid ${PINK_500}` }}
            >
              <LogOut className="h-4 w-4" />
            </span>
            <span className="flex-1">Log Out</span>
          </button>
        </div>
      </div>
    </aside>
  )
}

/* =================================================================
   PROFILE TAB — Profile Setup (collapsible) + Change Password (collapsible) + Delete Account
================================================================= */

function ProfileTab() {
  const [profile, setProfile] = useCmsDoc<Profile>("customer-profile", PROFILE_DEFAULTS)
  const { user, isSignedIn } = useUser()
  const [draft, setDraft] = useState<Profile["identity"]>(profile.identity ?? PROFILE_DEFAULTS.identity)
  const [openProfile, setOpenProfile] = useState(true)
  const [openPassword, setOpenPassword] = useState(false)

  // Hydrate profile from Clerk on first sign-in. Only fills empty / default
  // placeholder fields so we never overwrite anything the user has typed.
  useEffect(() => {
    if (!isSignedIn || !user) return
    const id = profile.identity ?? PROFILE_DEFAULTS.identity
    const def = PROFILE_DEFAULTS.identity
    const clerkEmail = user.primaryEmailAddress?.emailAddress ?? ""
    const clerkPhone = user.primaryPhoneNumber?.phoneNumber ?? ""
    const clerkFirst = user.firstName ?? ""
    const clerkLast  = user.lastName ?? ""
    const isPlaceholder = (v: string, d: string) => !v.trim() || v === d
    const next: Profile["identity"] = {
      ...id,
      firstName: isPlaceholder(id.firstName, def.firstName) && clerkFirst ? clerkFirst : id.firstName,
      lastName:  isPlaceholder(id.lastName,  def.lastName)  && clerkLast  ? clerkLast  : id.lastName,
      email:     isPlaceholder(id.email,     def.email)     && clerkEmail ? clerkEmail : id.email,
      phone:     isPlaceholder(id.phone,     def.phone)     && clerkPhone ? clerkPhone.replace(/^\+/, "") : id.phone,
    }
    if (JSON.stringify(next) !== JSON.stringify(id)) {
      setProfile({ ...profile, identity: next })
      setDraft(next)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn, user?.id])

  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(profile.identity),
    [draft, profile.identity],
  )

  const update = (patch: Partial<Profile["identity"]>) => setDraft((d) => ({ ...d, ...patch }))

  return (
    <>
      {/* Profile Setup */}
      <Card>
        <CardHeader
          title="Profile Setup"
          subtitle="Manage your account details here."
          collapsed={!openProfile}
          onToggle={() => setOpenProfile((o) => !o)}
        />
        {openProfile && (
          <div className="px-5 pb-5 pt-1 space-y-4">
            <Grid cols={2}>
              <Field label="First Name" required value={draft.firstName} onChange={(v) => update({ firstName: v })} />
              <Field label="Last Name" required value={draft.lastName} onChange={(v) => update({ lastName: v })} />
              <Field label="E-mail ID" required type="email" value={draft.email} onChange={(v) => update({ email: v })} />
              <Field label="Phone Number" required value={draft.phone} onChange={(v) => update({ phone: v })} />
              <SelectField
                label="Gender" required
                value={draft.gender}
                onChange={(v) => update({ gender: v as Profile["identity"]["gender"] })}
                options={[
                  { value: "female", label: "Female" },
                  { value: "male", label: "Male" },
                  { value: "other", label: "Other" },
                  { value: "prefer_not", label: "Prefer not to say" },
                ]}
              />
              <Field label="Date of Birth" required type="date" value={draft.dateOfBirth} onChange={(v) => update({ dateOfBirth: v })} />
            </Grid>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDraft(profile.identity ?? PROFILE_DEFAULTS.identity)}
                disabled={!dirty}
                className="px-6 h-10 rounded-full border bg-white text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                style={{ borderColor: BORDER, color: TEXT }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setProfile({ ...profile, identity: draft })
                  notify.saved("Profile updated")
                }}
                disabled={!dirty}
                className="px-6 h-10 rounded-full text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: GREEN_500 }}
              >
                Update Details
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader
          title="Change Password"
          subtitle="Manage your password details here."
          collapsed={!openPassword}
          onToggle={() => setOpenPassword((o) => !o)}
        />
        {openPassword && (
          <div className="px-5 pb-5 pt-1 space-y-4">
            <Grid cols={2}>
              <Field label="Current Password" type="password" value="" onChange={() => {}} placeholder="••••••••" />
              <div />
              <Field label="New Password" type="password" value="" onChange={() => {}} placeholder="••••••••" />
              <Field label="Confirm New Password" type="password" value="" onChange={() => {}} placeholder="••••••••" />
            </Grid>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => notify.info("Password changes will be handled by Clerk (coming soon)")}
                className="px-6 h-10 rounded-full text-sm font-semibold text-white"
                style={{ background: GREEN_500 }}
              >
                Update Password
              </button>
            </div>
          </div>
        )}
      </Card>

      <div className="flex justify-end pt-1">
        <button
          type="button"
          onClick={() =>
            notify.error("Account deletion is gated. Contact support to proceed.", {
              description: "We'll verify your identity before processing.",
              action: { label: "Contact us", onClick: () => (window.location.href = "/contact") },
            })
          }
          className="text-sm font-semibold underline-offset-4 hover:underline"
          style={{ color: PINK_500 }}
        >
          Delete Account
        </button>
      </div>
    </>
  )
}

/* =================================================================
   ORDERS TAB
================================================================= */

function OrdersTab() {
  const { items: orders } = useCmsCollection<OrderRow>("user-orders", [])
  const [sub, setSub] = useState<"all" | "ongoing" | "completed" | "returns">("all")
  const [q, setQ] = useState("")
  const [page, setPage] = useState(1)
  const PAGE = 8

  const filtered = useMemo(() => {
    const byStatus = orders.filter((o) => {
      if (sub === "all") return true
      if (sub === "ongoing") return ["Pending", "Confirmed", "Shipped"].includes(o.status)
      if (sub === "completed") return o.status === "Delivered"
      return o.status === "Returned"
    })
    const ql = q.trim().toLowerCase()
    return ql ? byStatus.filter((o) => String(o.orderNumber ?? "").toLowerCase().includes(ql)) : byStatus
  }, [orders, sub, q])

  const counts = useMemo(() => ({
    all: orders.length,
    ongoing: orders.filter((o) => ["Pending", "Confirmed", "Shipped"].includes(o.status)).length,
    completed: orders.filter((o) => o.status === "Delivered").length,
    returns: orders.filter((o) => o.status === "Returned").length,
  }), [orders])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE))
  const slice = filtered.slice((page - 1) * PAGE, page * PAGE)

  return (
    <>
      <PaneHeading title="Order History" />
      <Card>
        <div className="px-5 pt-5 flex flex-wrap items-center gap-x-6 gap-y-3 justify-between">
          <SubTabs
            value={sub}
            onChange={(v) => { setSub(v as typeof sub); setPage(1) }}
            options={[
              { value: "all",       label: `All Orders (${counts.all})` },
              { value: "ongoing",   label: `Ongoing (${counts.ongoing})` },
              { value: "completed", label: `Completed (${counts.completed})` },
              { value: "returns",   label: `Returns (${counts.returns})` },
            ]}
          />
          <SearchInput value={q} onChange={setQ} placeholder="Search By Order" />
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F9FAFB] text-[#6B7280]">
              <tr>
                <Th>Order ID</Th><Th>Order Date</Th><Th>Total (KES)</Th>
                <Th>Delivery Address</Th><Th>Order Status</Th><Th>Action</Th>
              </tr>
            </thead>
            <tbody>
              {slice.length === 0 ? (
                <tr><td colSpan={6} className="py-14 text-center text-[#9CA3AF]">No orders to display</td></tr>
              ) : (
                slice.map((o) => (
                  <tr key={o.id} className="border-t" style={{ borderColor: BORDER_SOFT }}>
                    <Td className="font-medium">{o.orderNumber}</Td>
                    <Td>{o.date}</Td>
                    <Td>{o.total.toLocaleString()}</Td>
                    <Td className="max-w-[180px] truncate">{o.address}</Td>
                    <Td><StatusPill status={o.status} /></Td>
                    <Td><Link href={`/track-order/${o.orderNumber}`} className="text-[#16A34A] hover:underline font-medium">Track</Link></Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </>
  )
}

/* =================================================================
   PRESCRIPTIONS TAB
================================================================= */

function PrescriptionsTab() {
  const { items } = useCmsCollection<PrescriptionRow>("user-prescriptions", [])
  const [sub, setSub] = useState<"all" | "ongoing" | "completed">("all")
  const [q, setQ] = useState("")
  const [page, setPage] = useState(1)
  const PAGE = 8

  const filtered = useMemo(() => {
    const byStatus = items.filter((p) =>
      sub === "all" ? true
      : sub === "ongoing" ? ["Pending", "Verified"].includes(p.status)
      : p.status === "Dispensed"
    )
    const ql = q.trim().toLowerCase()
    return ql ? byStatus.filter((p) => `${p.rxNumber ?? ""} ${p.name ?? ""}`.toLowerCase().includes(ql)) : byStatus
  }, [items, sub, q])

  const counts = useMemo(() => ({
    all: items.length,
    ongoing: items.filter((p) => ["Pending", "Verified"].includes(p.status)).length,
    completed: items.filter((p) => p.status === "Dispensed").length,
  }), [items])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE))
  const slice = filtered.slice((page - 1) * PAGE, page * PAGE)

  return (
    <>
      <PaneHeading
        title="Manage Prescriptions"
        action={<PillButton onClick={() => (window.location.href = "/upload-prescription")}>Submit Prescription</PillButton>}
      />
      <Card>
        <div className="px-5 pt-5 flex flex-wrap items-center gap-x-6 gap-y-3 justify-between">
          <SubTabs
            value={sub}
            onChange={(v) => { setSub(v as typeof sub); setPage(1) }}
            options={[
              { value: "all",       label: `All Prescriptions (${counts.all})` },
              { value: "ongoing",   label: `Ongoing (${counts.ongoing})` },
              { value: "completed", label: `Completed (${counts.completed})` },
            ]}
          />
          <SearchInput value={q} onChange={setQ} placeholder="Search" />
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F9FAFB] text-[#6B7280]">
              <tr>
                <Th>Prescriptions ID</Th><Th>Name</Th><Th>Date</Th>
                <Th>Total (KES)</Th><Th>Recepient</Th><Th>Status</Th><Th>Action</Th>
              </tr>
            </thead>
            <tbody>
              {slice.length === 0 ? (
                <tr><td colSpan={7} className="py-16 text-center text-[#9CA3AF]">No prescriptions yet — tap “Submit Prescription” to upload one.</td></tr>
              ) : (
                slice.map((p) => (
                  <tr key={p.id} className="border-t" style={{ borderColor: BORDER_SOFT }}>
                    <Td className="font-medium">{p.rxNumber}</Td>
                    <Td>{p.name}</Td>
                    <Td>{p.date}</Td>
                    <Td>{p.total.toLocaleString()}</Td>
                    <Td>{p.recipient}</Td>
                    <Td><StatusPill status={p.status} /></Td>
                    <Td><button type="button" className="text-[#16A34A] hover:underline font-medium">View</button></Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} onChange={setPage} variant="inline" />
      </Card>
    </>
  )
}

/* =================================================================
   WISHLIST TAB — uses real wishlist context
================================================================= */

function WishlistTab() {
  const { items, removeItem } = useWishlist()
  const { addItem: addToCart } = useCart()
  const [q, setQ] = useState("")

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase()
    return ql ? items.filter((p) => p.name?.toLowerCase().includes(ql)) : items
  }, [items, q])

  return (
    <>
      <PaneHeading title="My Wishlist" />
      <Card>
        <div className="px-5 pt-5 flex flex-wrap items-center gap-x-6 gap-y-3 justify-between">
          <p className="text-sm text-[#6B7280]">{items.length} item{items.length === 1 ? "" : "s"} saved</p>
          <SearchInput value={q} onChange={setQ} placeholder="Search wishlist" />
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F9FAFB] text-[#6B7280]">
              <tr>
                <Th>Product</Th><Th>Price (KES)</Th><Th>Status</Th><Th>Action</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={4} className="py-16 text-center text-[#9CA3AF]">
                  Your wishlist is empty. <Link href="/shop" className="text-[#16A34A] hover:underline font-medium">Browse products</Link>
                </td></tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="border-t" style={{ borderColor: BORDER_SOFT }}>
                    <Td>
                      <Link href={`/product/${p.slug}`} className="flex items-center gap-3 hover:text-[#16A34A]">
                        <div className="h-10 w-10 rounded-md bg-[#F9FAFB] border overflow-hidden flex-shrink-0" style={{ borderColor: BORDER }}>
                          {p.images?.[0] && <img src={p.images[0]} alt="" className="h-full w-full object-cover" />}
                        </div>
                        <span className="font-medium line-clamp-1">{p.name}</span>
                      </Link>
                    </Td>
                    <Td>{Number(p.price ?? 0).toLocaleString()}</Td>
                    <Td>
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-[#16A34A]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#16A34A]" /> In stock
                      </span>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            addToCart(p)
                            notify.success(`${p.name} added to cart`)
                          }}
                          className="inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-semibold text-white"
                          style={{ background: BLACK_PILL }}
                        >
                          <ShoppingBag className="h-3.5 w-3.5" /> Add to cart
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            removeItem(p.id)
                            notify.info("Removed from wishlist")
                          }}
                          className="grid place-items-center h-8 w-8 rounded-full border hover:bg-gray-50"
                          style={{ borderColor: BORDER, color: PINK_500 }}
                          aria-label="Remove from wishlist"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}

/* =================================================================
   BENEFICIARIES TAB
================================================================= */

function BeneficiariesTab() {
  const { items, upsert, remove } = useCmsCollection<BeneficiaryRow>("user-beneficiaries", [])
  const [q, setQ] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [draft, setDraft] = useState<BeneficiaryRow>({
    id: "", name: "", relationship: "", healthConditions: "", phone: "",
  })

  const [page, setPage] = useState(1)
  const PAGE = 8

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase()
    return ql ? items.filter((b) => `${b.name ?? ""} ${b.relationship ?? ""}`.toLowerCase().includes(ql)) : items
  }, [items, q])
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE))
  const slice = filtered.slice((page - 1) * PAGE, page * PAGE)

  const reset = () => setDraft({ id: "", name: "", relationship: "", healthConditions: "", phone: "" })

  return (
    <>
      <PaneHeading
        title="Beneficiaries List"
        action={<PillButton onClick={() => { reset(); setShowForm(true) }}>Add a beneficiary</PillButton>}
      />
      <Card>
        <div className="px-5 pt-5">
          <SearchInput value={q} onChange={setQ} placeholder="Search By Order Number" />
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F9FAFB] text-[#6B7280]">
              <tr>
                <Th>Recipient</Th><Th>Relationship</Th><Th>Health Conditions</Th><Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {slice.length === 0 ? (
                <tr><td colSpan={4} className="py-12 text-center text-[#9CA3AF]">No beneficiaries found</td></tr>
              ) : (
                slice.map((b) => (
                  <tr key={b.id} className="border-t" style={{ borderColor: BORDER_SOFT }}>
                    <Td className="font-medium">{b.name}</Td>
                    <Td>{b.relationship}</Td>
                    <Td className="max-w-[260px] truncate">{b.healthConditions || "—"}</Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => { setDraft(b); setShowForm(true) }} className="grid place-items-center h-8 w-8 rounded-full border hover:bg-gray-50" style={{ borderColor: BORDER, color: TEXT_MUTED }} aria-label="Edit"><Edit3 className="h-3.5 w-3.5" /></button>
                        <button type="button" onClick={() => { remove(b.id); notify.info("Beneficiary removed") }} className="grid place-items-center h-8 w-8 rounded-full border hover:bg-gray-50" style={{ borderColor: BORDER, color: PINK_500 }} aria-label="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} onChange={setPage} variant="inline" />
      </Card>

      {showForm && (
        <Modal title={draft.id ? "Edit beneficiary" : "Add a beneficiary"} onClose={() => setShowForm(false)}>
          <Grid cols={2}>
            <Field label="Recipient name" required value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} />
            <Field label="Relationship" required value={draft.relationship} onChange={(v) => setDraft({ ...draft, relationship: v })} placeholder="e.g. Spouse, Child, Parent" />
            <Field label="Phone" value={draft.phone} onChange={(v) => setDraft({ ...draft, phone: v })} />
            <Field label="Health conditions" value={draft.healthConditions} onChange={(v) => setDraft({ ...draft, healthConditions: v })} placeholder="Allergies, chronic conditions" />
          </Grid>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setShowForm(false)} className="px-5 h-10 rounded-full border bg-white text-sm font-medium hover:bg-gray-50" style={{ borderColor: BORDER }}>Cancel</button>
            <button
              type="button"
              onClick={() => {
                if (!draft.name.trim() || !draft.relationship.trim()) {
                  notify.warning("Name and relationship are required")
                  return
                }
                const id = draft.id || newId("ben")
                upsert({ ...draft, id })
                notify.saved(draft.id ? "Beneficiary updated" : "Beneficiary added")
                setShowForm(false)
              }}
              className="px-5 h-10 rounded-full text-sm font-semibold text-white"
              style={{ background: BLACK_PILL }}
            >
              {draft.id ? "Save changes" : "Add beneficiary"}
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}

/* =================================================================
   CONSULTATIONS TAB
================================================================= */

function ConsultationsTab() {
  const { items } = useCmsCollection<ConsultationRow>("user-consultations", [])
  const [sub, setSub] = useState<"upcoming" | "past">("upcoming")
  const [q, setQ] = useState("")

  const filtered = useMemo(() => {
    const byStatus = items.filter((c) => sub === "upcoming" ? c.status === "Upcoming" : c.status === "Past")
    const ql = q.trim().toLowerCase()
    return ql ? byStatus.filter((c) => `${c.bookingId ?? ""} ${c.service ?? ""}`.toLowerCase().includes(ql)) : byStatus
  }, [items, sub, q])

  const counts = {
    upcoming: items.filter((c) => c.status === "Upcoming").length,
    past: items.filter((c) => c.status === "Past").length,
  }

  return (
    <>
      <PaneHeading
        title="Manage Consultations"
        action={<PillButton onClick={() => (window.location.href = "/speak-to-a-doctor")}>Schedule Consulatation</PillButton>}
      />
      <Card>
        <div className="px-5 pt-5 flex flex-wrap items-center gap-x-6 gap-y-3 justify-between">
          <SubTabs
            value={sub}
            onChange={(v) => setSub(v as typeof sub)}
            options={[
              { value: "upcoming", label: `Upcoming Consultations (${counts.upcoming})` },
              { value: "past",     label: `Past Consultations (${counts.past})` },
            ]}
          />
          <SearchInput value={q} onChange={setQ} placeholder="Search" />
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F9FAFB] text-[#6B7280]">
              <tr>
                <Th>Booking ID</Th><Th>Date &amp; Time</Th><Th>Consultation Service</Th>
                <Th>Booking For</Th><Th>Consultation Mode</Th><Th>Actions</Th><Th>More</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="py-16 text-center text-[#9CA3AF]">You haven&apos;t had any consultations yet</td></tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="border-t" style={{ borderColor: BORDER_SOFT }}>
                    <Td className="font-medium">{c.bookingId}</Td>
                    <Td>{new Date(c.whenIso).toLocaleString()}</Td>
                    <Td>{c.service}</Td>
                    <Td>{c.bookingFor}</Td>
                    <Td>{c.mode}</Td>
                    <Td><button type="button" className="text-[#16A34A] hover:underline font-medium">Reschedule</button></Td>
                    <Td><button type="button" className="text-[#6B7280] hover:underline">Details</button></Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}

/* =================================================================
   LOYALTY POINTS TAB
================================================================= */

function LoyaltyTab() {
  const { items } = useCmsCollection<LoyaltyRow>("user-loyalty", [])
  const [q, setQ] = useState("")
  const [page, setPage] = useState(1)
  const PAGE = 8
  const balance = useMemo(() => items.reduce((s, r) => s + r.remaining, 0), [items])

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase()
    return ql ? items.filter((r) => String(r.documentNo ?? "").toLowerCase().includes(ql)) : items
  }, [items, q])
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE))
  const slice = filtered.slice((page - 1) * PAGE, page * PAGE)

  return (
    <>
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div>
          <h2 className="text-xl font-semibold">
            Available Balance: <span className="text-[#111827]">{balance.toLocaleString()}</span>{" "}
            <span className="font-bold">(KES {balance.toLocaleString()})</span>
          </h2>
          <p className="text-sm text-[#6B7280] mt-1">You can use your available balance to complete the payment.</p>
        </div>
        <PillButton onClick={() => notify.info("Point transfer flow coming soon")}>Transfer Points</PillButton>
      </div>

      <Card>
        <div className="px-5 pt-5">
          <SearchInput value={q} onChange={setQ} placeholder="Search" />
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F9FAFB] text-[#6B7280]">
              <tr>
                <Th>Document No</Th><Th>Date</Th><Th>Expiration Date</Th><Th>Points</Th><Th>Remaining Points</Th>
              </tr>
            </thead>
            <tbody>
              {slice.length === 0 ? (
                <tr><td colSpan={5} className="py-12 text-center text-[#9CA3AF]">No points history yet</td></tr>
              ) : (
                slice.map((r) => (
                  <tr key={r.id} className="border-t" style={{ borderColor: BORDER_SOFT }}>
                    <Td className="font-medium">{r.documentNo}</Td>
                    <Td>{r.date}</Td>
                    <Td>{r.expiration}</Td>
                    <Td>{r.points.toLocaleString()}</Td>
                    <Td>{r.remaining.toLocaleString()}</Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </>
  )
}

/* =================================================================
   ADDRESSES TAB
================================================================= */

function AddressesTab() {
  const { items, upsert, remove, set } = useCmsCollection<AddressRow>("user-addresses", [
    {
      id: "addr_default",
      fullName: "SHAKILA MARANDO",
      line: "Kiuu",
      city: "Kenya",
      country: "Kenya",
      phone: "254113626187",
      isDefault: true,
    },
  ])
  const [showForm, setShowForm] = useState(false)
  const [draft, setDraft] = useState<AddressRow>({
    id: "", fullName: "", line: "", city: "", country: "Kenya", phone: "", isDefault: false,
  })

  const setDefault = (id: string) => {
    set(items.map((a) => ({ ...a, isDefault: a.id === id })))
    notify.success("Default address updated")
  }

  return (
    <>
      <PaneHeading
        title="Manage Address"
        action={<PillButton onClick={() => { setDraft({ id: "", fullName: "", line: "", city: "", country: "Kenya", phone: "", isDefault: items.length === 0 }); setShowForm(true) }}>Add New Address</PillButton>}
      />

      <div className="space-y-3">
        {items.length === 0 && (
          <Card><div className="p-10 text-center text-[#9CA3AF] text-sm">No saved addresses</div></Card>
        )}
        {items.map((a) => (
          <div
            key={a.id}
            className="rounded-xl bg-white border p-4 flex items-start justify-between gap-3"
            style={{ borderColor: BORDER }}
          >
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <button
                type="button"
                onClick={() => setDefault(a.id)}
                className="mt-0.5 grid place-items-center h-5 w-5 rounded-full border-2 flex-shrink-0"
                style={{
                  borderColor: a.isDefault ? "#3B82F6" : BORDER,
                  background: a.isDefault ? "#3B82F6" : "white",
                }}
                aria-label={a.isDefault ? "Default address" : "Set as default"}
              >
                {a.isDefault && <span className="h-2 w-2 rounded-full bg-white" />}
              </button>
              <div className="min-w-0">
                <p className="text-sm font-bold uppercase tracking-wide" style={{ color: "#3B82F6" }}>{a.fullName}</p>
                <p className="text-xs mt-1" style={{ color: "#3B82F6" }}>{[a.line, a.city, a.country].filter(Boolean).join(", ")}</p>
                <p className="text-xs mt-0.5" style={{ color: "#3B82F6" }}>Phone: <span className="font-semibold" style={{ color: "#1D4ED8" }}>{a.phone}</span></p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button type="button" onClick={() => { setDraft(a); setShowForm(true) }} className="grid place-items-center h-7 w-7 rounded hover:bg-gray-50" style={{ color: PINK_500 }} aria-label="Edit">
                <Edit3 className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => { remove(a.id); notify.info("Address removed") }} className="grid place-items-center h-7 w-7 rounded hover:bg-gray-50" style={{ color: PINK_500 }} aria-label="Delete">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => { setDraft({ id: "", fullName: "", line: "", city: "", country: "Kenya", phone: "", isDefault: items.length === 0 }); setShowForm(true) }}
          className="inline-flex items-center gap-1.5 text-sm font-semibold underline-offset-4 hover:underline"
          style={{ color: PINK_500 }}
        >
          <Plus className="h-3.5 w-3.5" /> Add New Address
        </button>
      </div>

      {showForm && (
        <Modal title={draft.id ? "Edit address" : "Add new address"} onClose={() => setShowForm(false)}>
          <Grid cols={2}>
            <Field label="Full name" required value={draft.fullName} onChange={(v) => setDraft({ ...draft, fullName: v })} />
            <Field label="Phone" required value={draft.phone} onChange={(v) => setDraft({ ...draft, phone: v })} />
            <Field label="Address line" required value={draft.line} onChange={(v) => setDraft({ ...draft, line: v })} />
            <Field label="City / Town" value={draft.city} onChange={(v) => setDraft({ ...draft, city: v })} />
            <Field label="Country" value={draft.country} onChange={(v) => setDraft({ ...draft, country: v })} />
            <label className="flex items-center gap-2 text-sm pt-6">
              <input type="checkbox" checked={draft.isDefault} onChange={(e) => setDraft({ ...draft, isDefault: e.target.checked })} className="h-4 w-4 accent-[#3B82F6]" />
              Set as default
            </label>
          </Grid>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setShowForm(false)} className="px-5 h-10 rounded-full border bg-white text-sm font-medium hover:bg-gray-50" style={{ borderColor: BORDER }}>Cancel</button>
            <button
              type="button"
              onClick={() => {
                if (!draft.fullName.trim() || !draft.line.trim() || !draft.phone.trim()) {
                  notify.warning("Name, address and phone are required")
                  return
                }
                const id = draft.id || newId("addr")
                let next = [...items.filter((a) => a.id !== id), { ...draft, id }]
                if (draft.isDefault) next = next.map((a) => ({ ...a, isDefault: a.id === id }))
                set(next)
                notify.saved(draft.id ? "Address updated" : "Address added")
                setShowForm(false)
              }}
              className="px-5 h-10 rounded-full text-sm font-semibold text-white"
              style={{ background: BLACK_PILL }}
            >
              {draft.id ? "Save changes" : "Add address"}
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}

/* =================================================================
   Shared primitives
================================================================= */

function Card({ children }: { children: ReactNode }) {
  return <div className="rounded-xl bg-white border" style={{ borderColor: BORDER }}>{children}</div>
}

function CardHeader({
  title, subtitle, collapsed, onToggle,
}: {
  title: string; subtitle?: string; collapsed: boolean; onToggle: () => void
}) {
  return (
    <div className="px-5 py-4 flex items-start justify-between gap-3">
      <div>
        <h3 className="text-base font-semibold">{title}</h3>
        {subtitle && <p className="text-sm text-[#6B7280] mt-0.5">{subtitle}</p>}
      </div>
      <button
        type="button"
        onClick={onToggle}
        className="grid place-items-center h-8 w-8 rounded-full border hover:bg-gray-50"
        style={{ borderColor: BORDER, color: TEXT_MUTED }}
        aria-label={collapsed ? "Expand" : "Collapse"}
        aria-expanded={!collapsed}
      >
        {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
      </button>
    </div>
  )
}

function PaneHeading({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
      <h2 className="text-xl font-semibold">{title}</h2>
      {action}
    </div>
  )
}

function PillButton({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-5 h-10 rounded-full text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-opacity"
      style={{ background: BLACK_PILL }}
    >
      {children}
    </button>
  )
}

function SubTabs<T extends string>({
  value, onChange, options,
}: { value: T; onChange: (v: T) => void; options: Array<{ value: T; label: string }> }) {
  return (
    <div className="flex items-center gap-5 border-b" style={{ borderColor: BORDER_SOFT }}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className="relative pb-2.5 text-sm font-medium transition-colors"
            style={{ color: active ? GREEN_600 : TEXT_MUTED }}
          >
            {o.label}
            {active && <span className="absolute left-0 right-0 -bottom-px h-0.5 rounded-full" style={{ background: GREEN_500 }} />}
          </button>
        )
      })}
    </div>
  )
}

function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative w-full sm:w-80">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-10 pl-4 pr-10 rounded-full border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-300"
        style={{ borderColor: BORDER }}
      />
      <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: TEXT_MUTED }} />
    </div>
  )
}

function Th({ children }: { children: ReactNode }) {
  return <th className="text-left text-xs font-semibold uppercase tracking-wide px-5 py-3">{children}</th>
}
function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={`px-5 py-3.5 align-middle ${className || ""}`}>{children}</td>
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; fg: string }> = {
    Pending:    { bg: "#FEF3C7", fg: "#92400E" },
    Confirmed:  { bg: "#DBEAFE", fg: "#1E40AF" },
    Verified:   { bg: "#DBEAFE", fg: "#1E40AF" },
    Shipped:    { bg: "#E0E7FF", fg: "#3730A3" },
    Delivered:  { bg: "#DCFCE7", fg: "#166534" },
    Dispensed:  { bg: "#DCFCE7", fg: "#166534" },
    Cancelled:  { bg: "#FEE2E2", fg: "#991B1B" },
    Returned:   { bg: "#FEE2E2", fg: "#991B1B" },
  }
  const s = map[status] ?? { bg: "#F3F4F6", fg: "#374151" }
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: s.bg, color: s.fg }}>
      {status}
    </span>
  )
}

function Pagination({
  page, totalPages, onChange, variant = "block",
}: { page: number; totalPages: number; onChange: (p: number) => void; variant?: "block" | "inline" }) {
  if (totalPages <= 1 && variant === "inline") return (
    <div className="px-5 py-6 text-center text-sm text-[#6B7280]">
      <button type="button" disabled className="opacity-50">&lt; Prev</button>
      <span className="mx-3">Next &gt;</span>
    </div>
  )

  const pages: number[] = []
  const max = Math.min(5, totalPages)
  for (let i = 1; i <= max; i++) pages.push(i)

  const wrap = variant === "block" ? "flex items-center justify-center gap-1.5 py-6" : "flex items-center justify-center gap-1.5 py-6 border-t mt-3"
  return (
    <div className={wrap} style={variant === "inline" ? { borderColor: BORDER_SOFT } : undefined}>
      <button
        type="button"
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="px-2.5 h-8 text-sm text-[#6B7280] hover:text-[#111827] disabled:opacity-40 inline-flex items-center gap-1"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> Prev
      </button>
      {pages.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          className="grid place-items-center h-8 w-8 rounded-md text-sm font-semibold transition-colors"
          style={
            p === page
              ? { background: PINK_500, color: "white" }
              : { color: "#6B7280" }
          }
        >
          {p}
        </button>
      ))}
      {totalPages > 5 && (
        <>
          <span className="text-[#9CA3AF] px-1">…</span>
          <button
            type="button"
            onClick={() => onChange(totalPages)}
            className="grid place-items-center h-8 w-8 rounded-md text-sm font-semibold text-[#6B7280] hover:text-[#111827]"
          >
            {totalPages}
          </button>
        </>
      )}
      <button
        type="button"
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        className="px-2.5 h-8 text-sm text-[#6B7280] hover:text-[#111827] disabled:opacity-40 inline-flex items-center gap-1"
      >
        Next <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

function Grid({ cols, children }: { cols: 1 | 2; children: ReactNode }) {
  return <div className={`grid grid-cols-1 ${cols === 2 ? "md:grid-cols-2" : ""} gap-4`}>{children}</div>
}

function Field({
  label, value, onChange, type = "text", placeholder, required,
}: {
  label: string; value: string; onChange: (v: string) => void
  type?: string; placeholder?: string; required?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium" style={{ color: TEXT_MUTED }}>
        {label}{required && <span className="text-[#EF4444] ml-0.5">*</span>}
      </label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full h-11 pl-3.5 pr-10 rounded-lg border bg-white text-sm text-[#111827] focus:outline-none focus:border-[#22C55E]"
          style={{ borderColor: BORDER }}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 grid place-items-center h-6 w-6 rounded border" style={{ borderColor: BORDER, color: TEXT_MUTED }}>
          <Edit3 className="h-3 w-3" />
        </span>
      </div>
    </div>
  )
}

function SelectField({
  label, value, onChange, options, required,
}: {
  label: string; value: string; onChange: (v: string) => void
  options: Array<{ value: string; label: string }>; required?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium" style={{ color: TEXT_MUTED }}>
        {label}{required && <span className="text-[#EF4444] ml-0.5">*</span>}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-11 pl-3.5 pr-10 rounded-lg border bg-white text-sm text-[#111827] focus:outline-none focus:border-[#22C55E] appearance-none"
          style={{ borderColor: BORDER }}
        >
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: TEXT_MUTED }} />
      </div>
    </div>
  )
}

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-xl bg-white rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: BORDER_SOFT }}>
          <h3 className="text-base font-semibold">{title}</h3>
          <button type="button" onClick={onClose} className="grid place-items-center h-8 w-8 rounded-full hover:bg-gray-100" aria-label="Close">
            <Plus className="h-4 w-4 rotate-45" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
