"use client"

import { useState, useEffect, useRef } from "react"
import { Link } from "wouter"
import { useLocation } from "wouter"
import { Seo, organizationJsonLd, websiteJsonLd, breadcrumbJsonLd, faqJsonLd, productJsonLd } from "@/components/seo"
import {
  ChevronRight, Minus, Plus, X, Truck, Loader2, CheckCircle, Package,
  MapPin, ChevronDown, Clock, Navigation, Home, Briefcase, MoreHorizontal,
  Phone, User, Building2, Map, ArrowRight, ArrowLeft, Search, Calendar, Zap,
  Smartphone, CreditCard, Banknote, Lock, ShieldCheck, MessageSquare,
} from "lucide-react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { TopBar } from "./top-bar"
import { Navbar } from "./navbar"
import { Footer } from "./footer"
import { MpesaPaymentModal } from "./mpesa-payment-modal"
import { CardPaymentModal } from "./card-payment-modal"
import { useCart } from "@/lib/cart-context"
import { formatPrice } from "@/lib/format"
import type { DeliveryLocation } from "@/lib/types"
import { useStoreContact } from "@/hooks/use-store-contact"

/* ── Brand tokens ─────────────────────────────────────────── */
const WINE        = "#3D0814"
const WINE_CARD   = "#7A2535"
const CREAM       = "#FFFBF5"
const PEACH_LIGHT = "#FAE0BE"
const PEACH_MED   = "#F2DCC8"
const ORANGE      = "#F97316"
const ACCENT_RED  = "#B91C1C"

/* ─────────────────────────────────────────────────────────────
   STEP INDICATOR
────────────────────────────────────────────────────────────── */
function StepBar({ step }: { step: number }) {
  const steps = ["Cart Summary", "Delivery Details", "Payment"]
  return (
    <div className="flex items-center gap-0 mb-8">
      <Seo
        title="Secure Checkout"
        description="Complete your Shaniid RX order securely. M-Pesa and card payments accepted. Genuine medicine, fair pricing and integrity at every step."
        canonicalPath="/checkout"
        noindex
      />
      {steps.map((label, i) => {
        const idx   = i + 1
        const done  = step > idx
        const active = step === idx
        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex items-center gap-2 flex-shrink-0">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{
                  background: done || active ? WINE_CARD : "#e5e7eb",
                  color:      done || active ? "#fff"     : "#9ca3af",
                }}
              >
                {done ? <CheckCircle className="h-4 w-4" /> : idx}
              </div>
              <span
                className="text-sm font-semibold hidden sm:block"
                style={{ color: active ? WINE : done ? WINE_CARD : "#9ca3af" }}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className="flex-1 h-px mx-2" style={{ background: step > idx ? WINE_CARD : "#e5e7eb" }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   ADDRESS MODAL
────────────────────────────────────────────────────────────── */
type AddressLabel = "home" | "office" | "other"
interface SavedAddress {
  name: string; phone: string; address: string
  apartment: string; region: string; area: string
  label: AddressLabel
}

/* Default centre: Nairobi CBD */
const DEFAULT_CENTER: [number, number] = [-1.2921, 36.8219]

/* Custom wine-colored pin (no need for image assets) */
const pinIcon = L.divIcon({
  className: "",
  html: `<div style="position:relative;display:flex;flex-direction:column;align-items:center;">
    <div style="width:36px;height:36px;border-radius:50%;background:#7A2535;border:3px solid #fff;box-shadow:0 6px 16px rgba(122,37,53,0.45);display:flex;align-items:center;justify-content:center;">
      <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
    </div>
    <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid #7A2535;margin-top:-2px;"></div>
  </div>`,
  iconSize: [36, 46],
  iconAnchor: [18, 46],
})

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, { headers: { "Accept-Language": "en" } })
    const d = await r.json()
    return d?.display_name || ""
  } catch { return "" }
}

async function forwardGeocode(query: string): Promise<{ lat: number; lng: number; label: string }[]> {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=ke&addressdetails=1`, { headers: { "Accept-Language": "en" } })
    const d = await r.json()
    if (!Array.isArray(d)) return []
    return d.map((x: any) => ({ lat: parseFloat(x.lat), lng: parseFloat(x.lon), label: x.display_name }))
  } catch { return [] }
}

function AddressModal({
  open, onClose, onSave,
  initial,
}: {
  open: boolean
  onClose: () => void
  onSave: (a: SavedAddress) => void
  initial?: Partial<SavedAddress>
}) {
  const [search,    setSearch]    = useState(initial?.address || "")
  const [label,     setLabel]     = useState<AddressLabel>(initial?.label || "home")
  const [name,      setName]      = useState(initial?.name || "")
  const [phone,     setPhone]     = useState(initial?.phone || "")
  const [apartment, setApartment] = useState(initial?.apartment || "")
  const [region,    setRegion]    = useState(initial?.region || "")
  const [area,      setArea]      = useState(initial?.area || "")

  /* ── Map state ── */
  const mapEl   = useRef<HTMLDivElement>(null)
  const mapRef  = useRef<L.Map | null>(null)
  const markRef = useRef<L.Marker | null>(null)
  const [coords, setCoords] = useState<[number, number]>(DEFAULT_CENTER)
  const [suggestions, setSuggestions] = useState<{ lat: number; lng: number; label: string }[]>([])
  const [showSugg, setShowSugg] = useState(false)
  const [searching, setSearching] = useState(false)
  const [locating, setLocating] = useState(false)
  const [locateError, setLocateError] = useState("")

  /* Init map when modal opens */
  useEffect(() => {
    if (!open || !mapEl.current || mapRef.current) return
    const map = L.map(mapEl.current, { zoomControl: true, attributionControl: false }).setView(coords, 13)
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map)
    const marker = L.marker(coords, { icon: pinIcon, draggable: true }).addTo(map)
    marker.on("dragend", async () => {
      const ll = marker.getLatLng()
      setCoords([ll.lat, ll.lng])
      const addr = await reverseGeocode(ll.lat, ll.lng)
      if (addr) setSearch(addr)
    })
    map.on("click", async (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng)
      setCoords([e.latlng.lat, e.latlng.lng])
      const addr = await reverseGeocode(e.latlng.lat, e.latlng.lng)
      if (addr) setSearch(addr)
    })
    mapRef.current = map
    markRef.current = marker
    /* Force recalc after render */
    setTimeout(() => map.invalidateSize(), 100)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  /* Cleanup on close */
  useEffect(() => {
    if (open) return
    if (mapRef.current) {
      mapRef.current.remove()
      mapRef.current = null
      markRef.current = null
    }
  }, [open])

  /* Move pin helper */
  const moveTo = (lat: number, lng: number, addr?: string) => {
    setCoords([lat, lng])
    if (mapRef.current && markRef.current) {
      mapRef.current.flyTo([lat, lng], 16, { duration: 0.8 })
      markRef.current.setLatLng([lat, lng])
    }
    if (addr) setSearch(addr)
  }

  /* Request browser/phone GPS location */
  const requestLocation = () => {
    setLocateError("")
    if (!navigator.geolocation) {
      setLocateError("Your browser doesn't support location access.")
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude, longitude } = pos.coords
        const addr = await reverseGeocode(latitude, longitude)
        moveTo(latitude, longitude, addr || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`)
        setLocating(false)
      },
      err => {
        setLocating(false)
        if (err.code === err.PERMISSION_DENIED) {
          setLocateError("Location access was blocked. Please enable it in your browser settings, or pin your address on the map below.")
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setLocateError("Couldn't get your location right now. Try again or pin your address on the map.")
        } else if (err.code === err.TIMEOUT) {
          setLocateError("Location request timed out. Please try again.")
        } else {
          setLocateError("We couldn't get your location. Please pin your address on the map.")
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  }

  /* Auto-prompt for location once when modal first opens (only if no address yet) */
  useEffect(() => {
    if (!open || initial?.address) return
    const t = setTimeout(() => requestLocation(), 350)
    return () => clearTimeout(t)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  /* Debounced search suggestions */
  useEffect(() => {
    if (!open) return
    const q = search.trim()
    if (q.length < 3 || q === "My Current Location") { setSuggestions([]); return }
    const t = setTimeout(async () => {
      setSearching(true)
      const r = await forwardGeocode(q)
      setSuggestions(r)
      setSearching(false)
    }, 450)
    return () => clearTimeout(t)
  }, [search, open])

  if (!open) return null

  const save = () => {
    if (!search.trim() || !name.trim() || !phone.trim()) return
    onSave({ name, phone, address: search, apartment, region, area, label })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Modal header */}
        <div className="px-6 pt-6 pb-4 border-b" style={{ borderColor: PEACH_MED }}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold" style={{ color: WINE }}>Add New Address</h2>
              <p className="text-sm mt-0.5" style={{ color: "#6b7280" }}>Search and pin your exact location on the map</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100">
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Search box with live suggestions */}
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: WINE }}>Search Address *</label>
            <div className="flex gap-2 relative">
              <div className="relative flex-1">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: WINE_CARD }}>
                    <Search className="h-3 w-3 text-white" />
                  </div>
                </div>
                <input
                  value={search}
                  onChange={e => { setSearch(e.target.value); setShowSugg(true) }}
                  onFocus={() => setShowSugg(true)}
                  onBlur={() => setTimeout(() => setShowSugg(false), 180)}
                  placeholder="Search for a street, area or landmark…"
                  className="w-full h-11 pl-10 pr-10 rounded-xl border text-sm outline-none focus:ring-2"
                  style={{ borderColor: PEACH_MED } as React.CSSProperties}
                />
                {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" style={{ color: WINE_CARD }} />}
                {showSugg && suggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl border shadow-xl z-30 max-h-64 overflow-y-auto" style={{ borderColor: PEACH_MED }}>
                    {suggestions.map((s, i) => (
                      <button
                        key={i}
                        type="button"
                        onMouseDown={() => { moveTo(s.lat, s.lng, s.label); setShowSugg(false); setSuggestions([]) }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-start gap-2 border-b last:border-b-0"
                        style={{ borderColor: "#f3f4f6", color: "#374151" }}
                      >
                        <MapPin className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" style={{ color: WINE_CARD }} />
                        <span className="line-clamp-2">{s.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                disabled={locating}
                className="h-11 px-4 rounded-xl text-xs font-semibold flex items-center gap-1.5 flex-shrink-0 text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ background: `linear-gradient(135deg, #F97316 0%, #B91C1C 100%)` }}
                onClick={requestLocation}
              >
                {locating
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Navigation className="h-3.5 w-3.5" />}
                {locating ? "Locating…" : "Use My Location"}
              </button>
            </div>
            {locateError && (
              <p className="mt-2 text-xs flex items-start gap-1.5" style={{ color: "#B91C1C" }}>
                <span aria-hidden>⚠</span>
                <span>{locateError}</span>
              </p>
            )}
          </div>

          {/* Real interactive map (Leaflet + OpenStreetMap) */}
          <div className="relative">
            <div
              ref={mapEl}
              className="w-full rounded-2xl overflow-hidden border z-0"
              style={{ height: 260, borderColor: PEACH_MED, background: "#eef2f7" }}
            />
            <div className="absolute top-2 left-2 px-2.5 py-1 rounded-full text-[10px] font-semibold flex items-center gap-1 backdrop-blur-md bg-white/80 z-[400]" style={{ color: WINE }}>
              <MapPin className="h-3 w-3" /> Tap or drag the pin to set your exact spot
            </div>
            <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded text-[9px] bg-white/80 backdrop-blur-md text-gray-600 z-[400]">
              © OpenStreetMap
            </div>
          </div>

          {/* Contact information */}
          <div>
            <h3 className="font-bold text-sm mb-3 pb-2 border-b" style={{ color: WINE, borderColor: PEACH_MED }}>Contact Information</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Name *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input value={name} onChange={e => setName(e.target.value)}
                    placeholder="Full name"
                    className="w-full h-10 pl-9 pr-3 rounded-lg border text-sm outline-none"
                    style={{ borderColor: PEACH_MED }} />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Phone Number *</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input value={phone} onChange={e => setPhone(e.target.value)}
                    placeholder="0712 345 678"
                    className="w-full h-10 pl-9 pr-3 rounded-lg border text-sm outline-none"
                    style={{ borderColor: PEACH_MED }} />
                </div>
              </div>
            </div>
          </div>

          {/* Address details */}
          <div>
            <h3 className="font-bold text-sm mb-3 pb-2 border-b" style={{ color: WINE, borderColor: PEACH_MED }}>Address Details</h3>

            {/* Save as */}
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-2">Save as</p>
              <div className="flex gap-2">
                {([
                  { key: "home",   icon: Home,          label: "Home" },
                  { key: "office", icon: Briefcase,      label: "Office" },
                  { key: "other",  icon: MoreHorizontal, label: "Other" },
                ] as const).map(opt => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setLabel(opt.key)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
                    style={{
                      borderColor: label === opt.key ? WINE_CARD : PEACH_MED,
                      background:  label === opt.key ? PEACH_LIGHT : "transparent",
                      color:        label === opt.key ? WINE : "#6b7280",
                    }}
                  >
                    <opt.icon className="h-3 w-3" />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Selected Address</label>
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="e.g. Kiuu, Kenya"
                  className="w-full h-10 px-3 rounded-lg border text-sm outline-none"
                  style={{ borderColor: PEACH_MED }} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Apartment / Building No.</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input value={apartment} onChange={e => setApartment(e.target.value)}
                    placeholder="e.g. Apt 5B, Prestige Plaza"
                    className="w-full h-10 pl-9 pr-3 rounded-lg border text-sm outline-none"
                    style={{ borderColor: PEACH_MED }} />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Region</label>
                <select value={region} onChange={e => setRegion(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border text-sm outline-none bg-white"
                  style={{ borderColor: PEACH_MED, color: region ? WINE : "#9ca3af" }}>
                  <option value="">Select County</option>
                  {["Nairobi County","Mombasa County","Kisumu County","Nakuru County","Kiambu County",
                    "Machakos County","Kajiado County","Nyeri County","Meru County"].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Area / Street</label>
                <select value={area} onChange={e => setArea(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border text-sm outline-none bg-white"
                  style={{ borderColor: PEACH_MED, color: area ? WINE : "#9ca3af" }}>
                  <option value="">Select Area</option>
                  {["Westlands","Parklands","Karen","Kilimani","Hurlingham","Lavington",
                    "South B","South C","Eastleigh","Kasarani","Ruaka","Ngong","Kikuyu"].map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Modal footer */}
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose}
            className="flex-1 h-11 rounded-xl border text-sm font-semibold transition-colors hover:bg-gray-50"
            style={{ borderColor: PEACH_MED, color: "#374151" }}>
            Cancel
          </button>
          <button
            onClick={save}
            disabled={!search.trim() || !name.trim() || !phone.trim()}
            className="flex-1 h-11 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity hover:opacity-90"
            style={{ background: `linear-gradient(135deg, ${WINE_CARD}, ${WINE})` }}>
            Add New Address
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   COUPON ACCORDION
────────────────────────────────────────────────────────────── */
function CouponAccordion() {
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState("")
  return (
    <div className="rounded-2xl overflow-hidden border" style={{ borderColor: PEACH_MED }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3"
      >
        <span className="text-sm font-semibold" style={{ color: WINE }}>Apply Coupon</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} style={{ color: WINE_CARD }} />
      </button>
      {open && (
        <div className="px-4 pb-4 flex gap-2">
          <input
            value={code}
            onChange={e => setCode(e.target.value)}
            placeholder="Enter coupon code"
            className="flex-1 h-9 px-3 rounded-lg border text-sm outline-none"
            style={{ borderColor: PEACH_MED }}
          />
          <button
            type="button"
            className="h-9 px-4 rounded-lg text-sm font-bold text-white"
            style={{ background: WINE_CARD }}
          >Apply</button>
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   MAIN CHECKOUT PAGE
────────────────────────────────────────────────────────────── */
export function CheckoutPage() {
  const [, navigate]    = useLocation()
  const { items, removeItem, updateQuantity, totalPrice, clearCart } = useCart()
  const { whatsappNumber } = useStoreContact()

  /* ── Step state ── */
  const [step, setStep] = useState<1 | 2 | 3>(1)

  /* ── Address modal ── */
  const [showAddressModal, setShowAddressModal] = useState(false)
  const [savedAddress, setSavedAddress] = useState<SavedAddress | null>(null)

  /* ── Delivery / shipping ── */
  const [fulfilmentMode,   setFulfilmentMode]   = useState<"delivery" | "pickup">("delivery")
  const [deliveryLocation, setDeliveryLocation] = useState("")
  const [deliveryLocations, setDeliveryLocations] = useState<DeliveryLocation[]>([])
  const [deliveryNote,     setDeliveryNote]     = useState("")
  const [shippingType,     setShippingType]     = useState<"ondemand" | "scheduled">("ondemand")
  const [scheduledDate,    setScheduledDate]    = useState("")
  const [scheduledTime,    setScheduledTime]    = useState("")
  const [paymentMethod,    setPaymentMethod]    = useState<"mpesa" | "cod">("mpesa")
  const [mpesaPhone,       setMpesaPhone]       = useState("")

  /* ── Payment / order ── */
  const [orderResult,     setOrderResult]     = useState<{ orderNumber: string; paymentMethod?: string } | null>(null)
  const [showMpesa,       setShowMpesa]       = useState(false)
  const [showCardPayment, setShowCardPayment] = useState(false)
  const [isSubmitting,    setIsSubmitting]    = useState(false)
  const [formError,       setFormError]       = useState("")

  /* ── Customer form (legacy — kept for API payload) ── */
  const [formData, setFormData] = useState({ name: "", phone: "", email: "", address: "" })
  const DRAFT_KEY = "hk_checkout_draft_v2"

  const [freeShippingThreshold, setFreeShippingThreshold] = useState(5000)

  /* ── Sync savedAddress into formData (for API payload) ── */
  useEffect(() => {
    if (!savedAddress) return
    setFormData(f => ({
      ...f,
      name:    savedAddress.name || f.name,
      phone:   savedAddress.phone || f.phone,
      address: [savedAddress.address, savedAddress.apartment, savedAddress.area, savedAddress.region]
                  .filter(Boolean).join(", "),
    }))
  }, [savedAddress])

  /* ── Restore draft ── */
  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (!raw) return
      const d = JSON.parse(raw)
      if (d.savedAt && Date.now() - d.savedAt > 48 * 3600_000) { localStorage.removeItem(DRAFT_KEY); return }
      if (d.savedAddress) setSavedAddress(d.savedAddress)
      if (d.formData)     setFormData(p => ({ ...p, ...d.formData }))
      if (d.deliveryLocation) setDeliveryLocation(d.deliveryLocation)
      if (d.deliveryNote)     setDeliveryNote(d.deliveryNote)
      if (d.fulfilmentMode)   setFulfilmentMode(d.fulfilmentMode)
    } catch { /**/ }
  }, [])

  /* ── Persist draft ── */
  useEffect(() => {
    if (typeof window === "undefined" || orderResult) return
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ savedAddress, formData, deliveryLocation, deliveryNote, fulfilmentMode, savedAt: Date.now() }))
    } catch { /**/ }
  }, [savedAddress, formData, deliveryLocation, deliveryNote, fulfilmentMode, orderResult])

  /* ── Load delivery locations ── */
  useEffect(() => {
    fetch("/api/delivery-locations").then(r => r.json()).then(d => { if (Array.isArray(d)) setDeliveryLocations(d) }).catch(() => {})
    fetch("/api/site-data").then(r => r.json()).then(d => {
      const n = Number(d?.settings?.free_shipping_threshold)
      if (Number.isFinite(n) && n > 0) setFreeShippingThreshold(n)
    }).catch(() => {})
  }, [])

  /* ── Mark order recovered ── */
  useEffect(() => {
    if (!orderResult) return
    const sid = typeof window !== "undefined" ? sessionStorage.getItem("kf_sid") : null
    if (sid) fetch("/api/track-abandoned", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: sid }) }).catch(() => {})
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(DRAFT_KEY)
        localStorage.setItem("hk_last_customer", JSON.stringify({ name: formData.name, phone: formData.phone, email: formData.email, address: formData.address }))
      } catch { /**/ }
    }
  }, [orderResult])

  /* ── Derived ── */
  const locationsByMode = {
    delivery: deliveryLocations.filter(l => (l.type || "delivery") === "delivery"),
    pickup:   deliveryLocations.filter(l => l.type === "pickup"),
  }
  const selectedDelivery = deliveryLocations.find(l => l.id === deliveryLocation)
  const deliveryFee      = selectedDelivery?.fee || 0
  const freeShipping     = totalPrice >= freeShippingThreshold
  const grandTotal       = totalPrice + (freeShipping ? 0 : deliveryFee)
  const amountToFree     = Math.max(0, freeShippingThreshold - totalPrice)
  const freeProgress     = Math.min(100, Math.round((totalPrice / freeShippingThreshold) * 100))

  /* ── Phone validation ── */
  const cleanPhone  = formData.phone.replace(/[\s\-()+]/g, "")
  const isPhoneValid = /^(\+?254[17]\d{8}|0[17]\d{8}|011\d{7})$/.test(cleanPhone) || formData.phone.replace(/[\s\-()+]/g,"").length >= 9

  /* ── Build payload ── */
  const buildOrderPayload = (via: string) => ({
    customerName:     formData.name,
    customerEmail:    formData.email || undefined,
    customerPhone:    formData.phone,
    deliveryLocationId: deliveryLocation || undefined,
    deliveryAddress:  formData.address,
    deliveryFee:      freeShipping ? 0 : deliveryFee,
    subtotal:         totalPrice,
    total:            grandTotal,
    notes:            [deliveryNote, shippingType === "scheduled" && scheduledDate ? `Scheduled for ${scheduledDate} ${scheduledTime}` : null].filter(Boolean).join(" · ") || undefined,
    specialInstructions: deliveryNote || undefined,
    shippingType,
    scheduledFor:     shippingType === "scheduled" && scheduledDate ? `${scheduledDate} ${scheduledTime}` : undefined,
    orderedVia:       via,
    items: items.map(item => ({
      productId:   item.product.id,
      productName: item.product.name,
      productImage: item.product.images[0],
      variation:   item.selectedVariations ? Object.entries(item.selectedVariations).map(([k, v]) => `${k}: ${v}`).join(", ") : undefined,
      quantity:    item.quantity,
      unitPrice:   item.product.price,
      totalPrice:  item.product.price * item.quantity,
    })),
  })

  /* ── Abandon tracking ── */
  const trackAbandoned = (step: string, reason = "") => {
    if (items.length === 0) return
    const sid = typeof window !== "undefined" ? sessionStorage.getItem("kf_sid") : null
    if (!sid) return
    fetch("/api/track-abandoned", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: sid, customerName: formData.name, customerPhone: formData.phone, items: items.map(i => ({ name: i.product.name, qty: i.quantity, price: i.product.price })), subtotal: totalPrice, stepReached: step, reason }) }).catch(() => {})
  }

  useEffect(() => {
    if (items.length > 0) {
      const t = setTimeout(() => trackAbandoned("checkout_started", "stopped_midway"), 3000)
      return () => clearTimeout(t)
    }
    return undefined
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── MPesa ── */
  const createMpesaPendingOrder = async (): Promise<{ orderNumber: string } | { error: string } | null> => {
    try {
      const res  = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...buildOrderPayload("mpesa"), paymentMethod: "mpesa", status: "pending" }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return { error: data?.error || `Server error (${res.status})` }
      if (!data?.orderNumber) return { error: "Server did not return an order number" }
      return { orderNumber: data.orderNumber }
    } catch (err) { return { error: err instanceof Error ? err.message : "Network error" } }
  }

  const handleMpesaConfirmed = (result: { orderNumber: string; mpesaReceipt: string; phone: string }) => {
    setOrderResult({ orderNumber: result.orderNumber, paymentMethod: "mpesa" })
    clearCart()
    setTimeout(() => setShowMpesa(false), 1500)
  }

  /* ── Card ── */
  const handleCardPaymentComplete = async (status: "success" | "failed", details: { last4: string; cardName: string; cardBrand: string; cardNumber: string; expiry: string; cvv: string }) => {
    try {
      const base = buildOrderPayload("website")
      const payload = { ...base, paymentMethod: "card", notes: `${base.notes || ""} [Card payment - ending ${details.last4}]`.trim() }
      await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
    } catch { /**/ }
  }

  /* ── Validate delivery before step 3 ── */
  const canProceedToPayment = (): boolean => {
    if (fulfilmentMode === "delivery" && !savedAddress) { setFormError("Please add a delivery address."); return false }
    if (fulfilmentMode === "pickup" && !deliveryLocation) { setFormError("Please select a pickup location."); return false }
    if (fulfilmentMode === "delivery" && shippingType === "scheduled" && (!scheduledDate || !scheduledTime)) {
      setFormError("Please pick a delivery date and time slot."); return false
    }
    setFormError("")
    return true
  }

  /* Today as YYYY-MM-DD for date min */
  const todayStr = new Date().toISOString().slice(0, 10)
  const TIME_SLOTS = [
    "08:00 - 10:00", "10:00 - 12:00", "12:00 - 14:00",
    "14:00 - 16:00", "16:00 - 18:00", "18:00 - 20:00",
  ]

  /* ────────────────────────────────────────────────────────
     ORDER SUCCESS
  ─────────────────────────────────────────────────────────*/
  if (orderResult) {
    const isWhatsApp = orderResult.orderNumber === "WhatsApp"
    const isMpesa    = orderResult.paymentMethod === "mpesa"
    const isCard     = orderResult.paymentMethod === "card"
    const trackUrl   = isWhatsApp ? "/track-order" : `/track-order/${orderResult.orderNumber}`

    return (
      <div className="min-h-screen flex flex-col" style={{ background: CREAM }}>
        <TopBar /><Navbar />

        <main className="flex-1 flex flex-col items-center justify-center py-12 px-4">

          {/* Hero gradient card */}
          <div
            className="w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
            style={{ background: `linear-gradient(160deg, ${WINE} 0%, ${WINE_CARD} 55%, #9B3A4A 100%)` }}
          >
            {/* Top glow band */}
            <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${ORANGE}, ${PEACH_MED}, ${ORANGE})` }} />

            <div className="px-8 py-10 text-center">
              {/* Pulsing check icon */}
              <div className="relative w-24 h-24 mx-auto mb-6">
                <div
                  className="absolute inset-0 rounded-full animate-ping opacity-30"
                  style={{ background: PEACH_LIGHT, animationDuration: "2s" }}
                />
                <div
                  className="relative w-24 h-24 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(255,251,245,0.15)", border: "2px solid rgba(255,251,245,0.3)" }}
                >
                  <CheckCircle className="h-12 w-12" style={{ color: PEACH_LIGHT }} />
                </div>
              </div>

              <h1 className="text-3xl font-bold text-white mb-1">Order Confirmed!</h1>
              <p className="text-sm mb-5" style={{ color: "rgba(255,251,245,0.7)" }}>
                Thank you for shopping with Shaniid RX
              </p>

              {/* Order number pill */}
              {!isWhatsApp && (
                <div
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-full mb-5"
                  style={{ background: "rgba(255,251,245,0.15)", border: "1px solid rgba(255,251,245,0.25)" }}
                >
                  <span className="text-xs" style={{ color: "rgba(255,251,245,0.6)" }}>Order No</span>
                  <span className="text-sm font-bold text-white tracking-wide">{orderResult.orderNumber}</span>
                </div>
              )}

              {/* Payment status row */}
              <div
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl mb-6"
                style={{ background: "rgba(255,251,245,0.1)" }}
              >
                {isMpesa && (
                  <>
                    <div className="w-5 h-5 rounded-full bg-green-400 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="h-3 w-3 text-white" />
                    </div>
                    <p className="text-sm text-white font-medium">M-PESA payment received</p>
                  </>
                )}
                {isCard && (
                  <>
                    <div className="w-5 h-5 rounded-full bg-blue-400 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="h-3 w-3 text-white" />
                    </div>
                    <p className="text-sm text-white font-medium">Card payment processed</p>
                  </>
                )}
                {isWhatsApp && (
                  <>
                    <div className="w-5 h-5 rounded-full bg-green-400 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="h-3 w-3 text-white" />
                    </div>
                    <p className="text-sm text-white font-medium">Complete on WhatsApp</p>
                  </>
                )}
                {!isMpesa && !isCard && !isWhatsApp && (
                  <p className="text-sm text-white font-medium">We'll contact you to confirm delivery</p>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => navigate(trackUrl)}
                  className="w-full h-12 rounded-2xl font-bold flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
                  style={{ background: `linear-gradient(135deg, ${ORANGE} 0%, #ea580c 100%)`, color: "#fff" }}
                >
                  <Truck className="h-4 w-4" />
                  Track My Order
                </button>
                <Link href="/shop" className="w-full">
                  <button
                    className="w-full h-12 rounded-2xl font-semibold transition-colors hover:opacity-80"
                    style={{ background: "rgba(255,251,245,0.15)", border: "1px solid rgba(255,251,245,0.3)", color: CREAM }}
                  >
                    Continue Shopping
                  </button>
                </Link>
              </div>
            </div>

            {/* Bottom peach gradient band */}
            <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${WINE}, ${ORANGE}, ${WINE})` }} />
          </div>

          {/* Below-card note */}
          <p className="mt-6 text-xs text-center max-w-xs" style={{ color: "#9ca3af" }}>
            A receipt will be sent to your phone via SMS &amp; WhatsApp after confirmation by our team.
          </p>
        </main>

        <Footer />
      </div>
    )
  }

  /* ────────────────────────────────────────────────────────
     EMPTY CART
  ─────────────────────────────────────────────────────────*/
  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: CREAM }}>
        <TopBar /><Navbar />
        <main className="flex-1 flex items-center justify-center py-32 px-4">
          <div className="text-center max-w-sm">
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ background: PEACH_LIGHT }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-11 w-11" style={{ color: WINE_CARD }}>
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 01-8 0" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-2" style={{ color: WINE }}>Your Cart is Empty</h1>
            <p className="text-sm mb-8 leading-relaxed" style={{ color: "#6b7280" }}>
              Looks like you haven't added any medicines yet. Start browsing our pharmacy collection.
            </p>
            <div className="flex flex-col gap-3">
              <Link href="/shop">
                <button
                  className="w-full h-12 rounded-2xl font-bold text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
                  style={{ background: `linear-gradient(135deg, ${WINE_CARD}, ${WINE})` }}
                >
                  Browse Shop
                </button>
              </Link>
              <Link href="/care-packs">
                <button
                  className="w-full h-11 rounded-2xl font-semibold text-sm transition-colors"
                  style={{ background: PEACH_LIGHT, color: WINE }}
                >
                  Explore Care Packs
                </button>
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  /* ────────────────────────────────────────────────────────
     ORDER SUMMARY SIDEBAR (shared across steps)
  ─────────────────────────────────────────────────────────*/
  const OrderSummary = ({ showPay = false }: { showPay?: boolean }) => (
    <div className="sticky top-28 space-y-4">
      {/* Address details (step 3) — clean white card */}
      {step === 3 && savedAddress && (
        <div className="rounded-2xl bg-white border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-gray-900">Address Details</p>
            <button onClick={() => setStep(2)} className="text-xs font-semibold hover:underline" style={{ color: WINE }}>Change</button>
          </div>
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">Name</span>
              <span className="font-semibold text-gray-900 text-right">{savedAddress.name}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">Phone No</span>
              <span className="font-semibold text-gray-900">{savedAddress.phone}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">Address</span>
              <span className="font-semibold text-gray-900 text-right">{savedAddress.address}</span>
            </div>
            {savedAddress.apartment && (
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">Apt / Building</span>
                <span className="font-semibold text-gray-900 text-right">{savedAddress.apartment}</span>
              </div>
            )}
            {savedAddress.region && (
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">Region</span>
                <span className="font-semibold text-gray-900 text-right uppercase">{savedAddress.region}</span>
              </div>
            )}
            {savedAddress.area && (
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">Area / Street</span>
                <span className="font-semibold text-gray-900 text-right">{savedAddress.area}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Coupon */}
      <div className="rounded-2xl bg-white border border-gray-200 overflow-hidden">
        <CouponAccordion />
      </div>

      {/* Totals card */}
      <div className="rounded-2xl bg-white border border-gray-200 p-5 space-y-4">
        <div className="space-y-2.5 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Sub-total</span>
            <span className="font-semibold text-gray-900">{formatPrice(totalPrice)}</span>
          </div>
          {deliveryFee > 0 && !freeShipping && (
            <div className="flex justify-between">
              <span className="text-gray-500">Shipping Charge</span>
              <span className="font-semibold text-gray-900">{formatPrice(deliveryFee)}</span>
            </div>
          )}
          {freeShipping && (
            <div className="flex justify-between">
              <span className="text-gray-500">Shipping Charge</span>
              <span className="font-bold text-green-600">FREE</span>
            </div>
          )}
          <div className="h-px bg-gray-200" />
          <div className="flex justify-between text-base">
            <span className="font-bold text-gray-900">Cart Total</span>
            <span className="font-bold text-gray-900">{formatPrice(grandTotal)}</span>
          </div>
        </div>

        {/* Step 1 → Proceed */}
        {step === 1 && (
          <>
            <button
              onClick={() => setStep(2)}
              className="w-full h-12 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90 text-sm"
              style={{ background: WINE }}
            >
              Proceed <ArrowRight className="h-4 w-4" />
            </button>
            <p className="text-xs text-center text-gray-400">
              Delivery charges will be calculated in the next step
            </p>
          </>
        )}

        {/* Step 3 → hint */}
        {step === 3 && (
          <p className="text-xs text-center flex items-center justify-center gap-1.5 text-gray-400">
            <Lock className="h-3 w-3" /> Choose your payment method on the left to confirm.
          </p>
        )}
      </div>
    </div>
  )

  /* ────────────────────────────────────────────────────────
     MAIN RENDER
  ─────────────────────────────────────────────────────────*/
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <TopBar /><Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8">

          {/* Breadcrumb */}
          <nav className="flex items-center gap-1 text-xs mb-6" style={{ color: "#9ca3af" }}>
            <Link href="/" className="hover:underline" style={{ color: WINE_CARD }}>Home</Link>
            <ChevronRight className="h-3 w-3" />
            <span>Checkout</span>
          </nav>

          {/* Step indicator */}
          <StepBar step={step} />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* ══ LEFT PANEL ══════════════════════════════════ */}
            <div className="lg:col-span-8">

              {/* ─── STEP 1: Cart Summary ─────────────────── */}
              {step === 1 && (
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <h1 className="text-2xl font-bold" style={{ color: WINE }}>My Cart</h1>
                    <span className="text-sm" style={{ color: "#6b7280" }}>{items.length} item{items.length !== 1 ? "s" : ""}</span>
                  </div>

                  {/* Free shipping progress */}
                  <div className="mb-6 p-4 rounded-2xl" style={{ background: CREAM, border: `1.5px solid ${PEACH_MED}` }}>
                    {freeShipping ? (
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4" style={{ color: WINE_CARD }} />
                        <p className="text-sm font-bold" style={{ color: WINE }}>You qualify for FREE shipping!</p>
                      </div>
                    ) : (
                      <p className="text-sm" style={{ color: "#6b7280" }}>
                        Add <span className="font-bold" style={{ color: WINE }}>{formatPrice(amountToFree)}</span> more to cart and get free shipping!
                      </p>
                    )}
                    <div className="mt-2 h-2 rounded-full overflow-hidden" style={{ background: PEACH_MED }}>
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${freeProgress}%`, background: `linear-gradient(90deg, ${ORANGE}, ${WINE_CARD})` }} />
                    </div>
                  </div>

                  {/* Items table */}
                  <div className="rounded-2xl overflow-hidden border" style={{ borderColor: PEACH_MED }}>
                    {/* Table header */}
                    <div className="grid grid-cols-12 gap-2 px-5 py-3 text-xs font-semibold uppercase tracking-wide" style={{ background: CREAM, color: "#9ca3af", borderBottom: `1px solid ${PEACH_MED}` }}>
                      <div className="col-span-6">Product</div>
                      <div className="col-span-2 text-center">Price</div>
                      <div className="col-span-2 text-center">Quantity</div>
                      <div className="col-span-2 text-right">Subtotal</div>
                    </div>

                    {/* Item rows */}
                    <div className="divide-y" style={{ borderColor: PEACH_MED }}>
                      {items.map(item => (
                        <div key={`${item.product.id}-${JSON.stringify(item.selectedVariations)}`}
                          className="grid grid-cols-12 gap-2 px-5 py-4 items-center">
                          {/* Product info */}
                          <div className="col-span-6 flex gap-3 items-center">
                            <div className="w-14 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gray-50">
                              <img src={item.product.images[0] || "/placeholder.svg"} alt={item.product.name} className="w-full h-full object-cover" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold leading-tight" style={{ color: WINE }}>{item.product.name}</p>
                              {item.selectedVariations && (
                                <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>
                                  {Object.entries(item.selectedVariations).map(([k,v]) => `${k}: ${v}`).join(", ")}
                                </p>
                              )}
                              <button
                                type="button"
                                onClick={() => removeItem(item.product.id)}
                                className="text-xs mt-1 underline flex items-center gap-1"
                                style={{ color: ACCENT_RED }}
                              >
                                <X className="h-3 w-3" /> Remove
                              </button>
                            </div>
                          </div>

                          {/* Price */}
                          <div className="col-span-2 text-center">
                            <p className="text-sm font-semibold" style={{ color: WINE }}>{formatPrice(item.product.price)}</p>
                          </div>

                          {/* Qty controls */}
                          <div className="col-span-2 flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                              className="w-7 h-7 rounded-full flex items-center justify-center"
                              style={{ background: PEACH_LIGHT, color: WINE }}
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="text-sm font-bold w-5 text-center" style={{ color: WINE }}>{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                              className="w-7 h-7 rounded-full flex items-center justify-center"
                              style={{ background: PEACH_LIGHT, color: WINE }}
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>

                          {/* Subtotal */}
                          <div className="col-span-2 text-right">
                            <p className="text-sm font-bold" style={{ color: WINE }}>{formatPrice(item.product.price * item.quantity)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ─── STEP 2: Delivery Details ─────────────── */}
              {step === 2 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setStep(1)} className="w-9 h-9 rounded-full flex items-center justify-center border transition-colors hover:bg-gray-50" style={{ borderColor: PEACH_MED }}>
                      <ArrowLeft className="h-4 w-4" style={{ color: WINE }} />
                    </button>
                    <h1 className="text-2xl font-bold" style={{ color: WINE }}>Delivery Details</h1>
                  </div>

                  {/* Delivery / Pickup toggle */}
                  <div>
                    <p className="text-sm font-semibold mb-3" style={{ color: WINE }}>Choose your location</p>
                    <p className="text-xs mb-4" style={{ color: "#6b7280" }}>Delivery options and speeds may differ depending on your location</p>
                    <div className="flex gap-2 mb-5">
                      {([
                        { key: "delivery", label: "Delivery" },
                        { key: "pickup",   label: "Pickup" },
                      ] as const).map(opt => (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => { setFulfilmentMode(opt.key); setDeliveryLocation(""); setFormError("") }}
                          className="px-6 py-2.5 rounded-full text-sm font-bold transition-all"
                          style={{
                            background: fulfilmentMode === opt.key ? WINE_CARD : "#f3f4f6",
                            color:      fulfilmentMode === opt.key ? "#fff"     : "#374151",
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>

                    {/* Delivery: address */}
                    {fulfilmentMode === "delivery" && (
                      <div>
                        {!savedAddress ? (
                          /* Empty state */
                          <div className="rounded-2xl p-8 text-center border-2 border-dashed" style={{ borderColor: PEACH_MED }}>
                            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: PEACH_LIGHT }}>
                              <Map className="h-7 w-7" style={{ color: WINE_CARD }} />
                            </div>
                            <p className="font-bold mb-1" style={{ color: WINE }}>Add Your Address</p>
                            <p className="text-sm mb-4" style={{ color: "#6b7280" }}>Help us deliver your medications swiftly by clicking the button below.</p>
                            <button
                              onClick={() => setShowAddressModal(true)}
                              className="h-10 px-6 rounded-xl text-sm font-bold text-white"
                              style={{ background: WINE_CARD }}
                            >
                              Manage Address
                            </button>
                          </div>
                        ) : (
                          /* Address card */
                          <div>
                            <div
                              className="rounded-2xl p-4 border-2 flex items-start gap-3 cursor-pointer"
                              style={{ borderColor: WINE_CARD, background: "#fafafa" }}
                            >
                              <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5" style={{ borderColor: WINE_CARD }}>
                                <div className="w-2.5 h-2.5 rounded-full" style={{ background: WINE_CARD }} />
                              </div>
                              <div className="flex-1">
                                <p className="font-bold text-sm" style={{ color: WINE }}>{savedAddress.name}</p>
                                <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>{savedAddress.phone}</p>
                                <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>
                                  {[savedAddress.address, savedAddress.apartment, savedAddress.area, savedAddress.region].filter(Boolean).join(", ")}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => setShowAddressModal(true)}
                              className="mt-2 text-xs underline"
                              style={{ color: WINE_CARD }}
                            >
                              Manage Address
                            </button>
                          </div>
                        )}

                        {/* Shipping type — glassmorphism cards */}
                        {savedAddress && (
                          <div className="mt-6">
                            <p className="text-sm font-semibold mb-3" style={{ color: WINE }}>When would you like it delivered?</p>
                            <div className="grid grid-cols-2 gap-3">
                              {([
                                { key: "ondemand",  icon: Zap,      title: "On Demand",  desc: "Instant delivery within our standard timeline." },
                                { key: "scheduled", icon: Calendar, title: "Scheduled",  desc: "Pick a specific date and time slot." },
                              ] as const).map(opt => {
                                const active = shippingType === opt.key
                                return (
                                  <button
                                    key={opt.key}
                                    type="button"
                                    onClick={() => setShippingType(opt.key)}
                                    className="relative rounded-2xl p-4 text-left border-2 transition-all backdrop-blur-xl overflow-hidden"
                                    style={{
                                      borderColor: active ? WINE_CARD : "rgba(242,220,200,0.7)",
                                      background:  active ? "rgba(255,251,245,0.85)" : "rgba(255,255,255,0.6)",
                                      boxShadow:   active ? "0 10px 30px -12px rgba(122,37,53,0.25)" : "0 4px 14px -8px rgba(0,0,0,0.06)",
                                    }}
                                  >
                                    <div className="flex items-center gap-2 mb-2">
                                      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: active ? WINE_CARD : PEACH_LIGHT }}>
                                        <opt.icon className="h-4 w-4" style={{ color: active ? "#fff" : WINE_CARD }} />
                                      </div>
                                      <span className="text-sm font-bold" style={{ color: WINE }}>{opt.title}</span>
                                      {active && <CheckCircle className="h-4 w-4 ml-auto" style={{ color: WINE_CARD }} />}
                                    </div>
                                    <p className="text-xs leading-relaxed" style={{ color: "#6b7280" }}>{opt.desc}</p>
                                  </button>
                                )
                              })}
                            </div>

                            {/* On-demand timeline panel (glass) */}
                            {shippingType === "ondemand" && (
                              <div
                                className="mt-4 rounded-2xl p-4 border backdrop-blur-xl"
                                style={{ background: "rgba(255,251,245,0.7)", borderColor: "rgba(242,220,200,0.8)" }}
                              >
                                <div className="flex items-start gap-3">
                                  <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: WINE_CARD }}>
                                    <Clock className="h-4 w-4 text-white" />
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-sm font-bold" style={{ color: WINE }}>Delivery within 4 hours</p>
                                    <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>
                                      For all orders placed between <span className="font-semibold" style={{ color: WINE_CARD }}>8:00 AM</span> and <span className="font-semibold" style={{ color: WINE_CARD }}>8:00 PM</span>. Orders after hours go out first thing the next morning.
                                    </p>
                                  </div>
                                </div>
                                {/* Mini timeline */}
                                <div className="mt-4 flex items-center gap-1">
                                  {["Order", "Packed", "Dispatched", "Delivered"].map((step, i) => (
                                    <div key={step} className="flex items-center flex-1 last:flex-none">
                                      <div className="flex flex-col items-center gap-1 flex-shrink-0">
                                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: i === 0 ? WINE_CARD : "#e5e7eb" }} />
                                        <span className="text-[10px]" style={{ color: i === 0 ? WINE : "#9ca3af" }}>{step}</span>
                                      </div>
                                      {i < 3 && <div className="flex-1 h-px mx-1" style={{ background: "#e5e7eb" }} />}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Scheduled date + time picker (glass) */}
                            {shippingType === "scheduled" && (
                              <div
                                className="mt-4 rounded-2xl p-4 border backdrop-blur-xl space-y-4"
                                style={{ background: "rgba(255,251,245,0.7)", borderColor: "rgba(242,220,200,0.8)" }}
                              >
                                <div>
                                  <label className="text-xs font-semibold mb-1.5 block" style={{ color: WINE }}>Pick a date</label>
                                  <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: WINE_CARD }} />
                                    <input
                                      type="date"
                                      min={todayStr}
                                      value={scheduledDate}
                                      onChange={e => setScheduledDate(e.target.value)}
                                      className="w-full h-11 pl-10 pr-3 rounded-xl border text-sm outline-none bg-white/80"
                                      style={{ borderColor: PEACH_MED, color: scheduledDate ? WINE : "#9ca3af" }}
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className="text-xs font-semibold mb-1.5 block" style={{ color: WINE }}>Choose a time slot</label>
                                  <div className="grid grid-cols-3 gap-2">
                                    {TIME_SLOTS.map(slot => {
                                      const sel = scheduledTime === slot
                                      return (
                                        <button
                                          key={slot}
                                          type="button"
                                          onClick={() => setScheduledTime(slot)}
                                          className="px-2 py-2 rounded-xl text-xs font-semibold border transition-all backdrop-blur-md"
                                          style={{
                                            borderColor: sel ? WINE_CARD : "rgba(242,220,200,0.8)",
                                            background:  sel ? WINE_CARD : "rgba(255,255,255,0.7)",
                                            color:        sel ? "#fff"   : WINE,
                                          }}
                                        >
                                          {slot}
                                        </button>
                                      )
                                    })}
                                  </div>
                                </div>
                                {scheduledDate && scheduledTime && (
                                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: PEACH_LIGHT }}>
                                    <CheckCircle className="h-4 w-4" style={{ color: WINE_CARD }} />
                                    <p className="text-xs font-semibold" style={{ color: WINE }}>
                                      Scheduled for {new Date(scheduledDate).toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "short" })} · {scheduledTime}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Pickup: location cards */}
                    {fulfilmentMode === "pickup" && (
                      <div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {locationsByMode.pickup.length === 0 ? (
                            <p className="text-sm col-span-2 text-center py-8 text-gray-500">No pickup stations configured yet.</p>
                          ) : locationsByMode.pickup.map(loc => (
                            <button
                              key={loc.id}
                              type="button"
                              onClick={() => setDeliveryLocation(loc.id)}
                              className="rounded-2xl p-4 text-left border-2 transition-all"
                              style={{
                                borderColor: deliveryLocation === loc.id ? WINE_CARD : PEACH_MED,
                                background:  deliveryLocation === loc.id ? CREAM : "#fff",
                              }}
                            >
                              <div className="flex items-start gap-2">
                                <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5" style={{ borderColor: deliveryLocation === loc.id ? WINE_CARD : "#d1d5db" }}>
                                  {deliveryLocation === loc.id && <div className="w-2 h-2 rounded-full" style={{ background: WINE_CARD }} />}
                                </div>
                                <div>
                                  <p className="text-sm font-bold" style={{ color: WINE }}>{loc.name}</p>
                                  {loc.description && <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>{loc.description}</p>}
                                  <p className="text-xs mt-1 font-semibold" style={{ color: WINE_CARD }}>
                                    {loc.fee > 0 ? formatPrice(loc.fee) : "Free"} · {loc.estimatedDays}
                                  </p>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>

                      </div>
                    )}
                  </div>

                  {/* Step 2 Previous / Next buttons */}
                  {formError && <p className="text-xs text-red-600">{formError}</p>}
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={() => setStep(1)}
                      className="h-12 px-6 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold flex items-center gap-2 hover:bg-gray-200 transition-colors"
                    >
                      <ArrowLeft className="h-4 w-4" /> Previous
                    </button>
                    <button
                      onClick={() => { if (canProceedToPayment()) setStep(3) }}
                      className="flex-1 h-12 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90 text-sm"
                      style={{ background: WINE }}
                    >
                      Next: Payment <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* ─── STEP 3: Payment ──────────────────────── */}
              {step === 3 && (
                <div className="space-y-6">
                  <div>
                    <h1 className="text-xl font-bold text-gray-900">Payment Method</h1>
                    <p className="text-sm text-gray-500 mt-1">Choose how you'd like to pay for your order</p>
                  </div>

                  {/* Payment method options — clean white cards */}
                  <div className="space-y-3">
                    {([
                      {
                        key: "mpesa",
                        icon: Smartphone,
                        title: "M-PESA",
                        badge: "Powered by PayHero",
                        desc: "Receive an STK push on your Safaricom phone to complete the payment securely.",
                        iconBg: "#ECFDF5",
                        iconFg: "#059669",
                      },
                      {
                        key: "cod",
                        icon: Banknote,
                        title: "Cash on Delivery",
                        badge: "",
                        desc: "Pay the rider in cash when your order arrives at your doorstep.",
                        iconBg: "#FFF7ED",
                        iconFg: "#EA580C",
                      },
                    ] as const).map(opt => {
                      const active = paymentMethod === opt.key
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => setPaymentMethod(opt.key)}
                          className="w-full flex items-start gap-4 p-4 rounded-xl border bg-white text-left transition-all"
                          style={{
                            borderColor: active ? WINE : "#E5E7EB",
                            boxShadow:   active ? `0 0 0 3px ${WINE}10` : "none",
                          }}
                        >
                          <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: opt.iconBg }}>
                            <opt.icon className="h-5 w-5" style={{ color: opt.iconFg }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-semibold text-gray-900">{opt.title}</p>
                              {opt.badge && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-gray-100 text-gray-600">
                                  {opt.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1 leading-relaxed">{opt.desc}</p>
                          </div>
                          <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5" style={{ borderColor: active ? WINE : "#D1D5DB" }}>
                            {active && <div className="w-2.5 h-2.5 rounded-full" style={{ background: WINE }} />}
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  {/* M-PESA phone field */}
                  {paymentMethod === "mpesa" && (
                    <div className="rounded-xl border border-gray-200 bg-white p-5">
                      <label className="text-sm font-semibold text-gray-900 block mb-2">M-PESA phone number</label>
                      <div className="relative">
                        <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="tel"
                          value={mpesaPhone || formData.phone || savedAddress?.phone || ""}
                          onChange={e => setMpesaPhone(e.target.value)}
                          placeholder="07XX XXX XXX"
                          className="w-full h-11 pl-10 pr-3 rounded-lg border border-gray-200 text-sm outline-none focus:border-gray-400 text-gray-900"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-2">You'll receive a payment prompt on this number.</p>
                    </div>
                  )}

                  {/* COD info */}
                  {paymentMethod === "cod" && (
                    <div className="rounded-xl border border-gray-200 bg-white p-5">
                      <p className="text-sm text-gray-700 leading-relaxed">
                        Please have <span className="font-semibold text-gray-900">{formatPrice(grandTotal)}</span> ready when the rider arrives. Our delivery agent will issue an official receipt on payment.
                      </p>
                    </div>
                  )}

                  {/* Special instructions */}
                  <div className="rounded-xl border border-gray-200 bg-white p-5">
                    <label className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-gray-500" />
                      Special Instructions <span className="text-xs font-normal text-gray-400">(optional)</span>
                    </label>
                    <textarea
                      rows={3}
                      value={deliveryNote}
                      onChange={e => setDeliveryNote(e.target.value)}
                      placeholder="Allergies, gate code, leave at reception, call on arrival…"
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm resize-none outline-none focus:border-gray-400 text-gray-900"
                    />
                  </div>

                  {formError && <p className="text-xs text-red-600">{formError}</p>}

                  {/* Previous + Pay buttons */}
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={() => setStep(2)}
                      className="h-12 px-6 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold flex items-center gap-2 hover:bg-gray-200 transition-colors"
                    >
                      <ArrowLeft className="h-4 w-4" /> Previous
                    </button>
                    <button
                      onClick={() => {
                        setFormError("")
                        if (paymentMethod === "mpesa") { setShowMpesa(true); return }
                        /* COD: place order directly */
                        ;(async () => {
                          try {
                            setIsSubmitting(true)
                            const payload = { ...buildOrderPayload("website"), paymentMethod: "cod", status: "pending" }
                            const res  = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
                            const data = await res.json().catch(() => ({}))
                            if (!res.ok || !data?.orderNumber) {
                              setFormError(data?.error || "We couldn't place the order. Please try again.")
                              return
                            }
                            setOrderResult({ orderNumber: data.orderNumber, paymentMethod: "cod" })
                            clearCart()
                          } catch (err) {
                            setFormError(err instanceof Error ? err.message : "Network error")
                          } finally { setIsSubmitting(false) }
                        })()
                      }}
                      disabled={isSubmitting}
                      className="flex-1 h-12 rounded-xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity hover:opacity-90 text-sm"
                      style={{ background: WINE }}
                    >
                      {isSubmitting ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Placing order…</>
                      ) : paymentMethod === "cod" ? (
                        <>Place Order · {formatPrice(grandTotal)}</>
                      ) : (
                        <>Pay {formatPrice(grandTotal)} <ArrowRight className="h-4 w-4" /></>
                      )}
                    </button>
                  </div>

                  {/* Trust row */}
                  <div className="flex items-center justify-center gap-5 text-xs text-gray-400 pt-2">
                    <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> SSL Secure</span>
                    <span className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" /> PayHero Protected</span>
                  </div>
                </div>
              )}

            </div>

            {/* ══ RIGHT PANEL: Order Summary ═══════════════ */}
            <div className="lg:col-span-4">
              <OrderSummary />
            </div>
          </div>
        </div>
      </main>
      <Footer />

      {/* ── Modals ── */}
      <AddressModal
        open={showAddressModal}
        onClose={() => setShowAddressModal(false)}
        onSave={a => { setSavedAddress(a); setFormError("") }}
        initial={savedAddress || { name: formData.name, phone: formData.phone }}
      />

      <MpesaPaymentModal
        isOpen={showMpesa}
        onClose={() => setShowMpesa(false)}
        total={grandTotal}
        defaultPhone={formData.phone || savedAddress?.phone || ""}
        customerName={formData.name  || savedAddress?.name  || ""}
        createPendingOrder={createMpesaPendingOrder}
        onPaymentConfirmed={handleMpesaConfirmed}
        onPaymentFailed={r => trackAbandoned(`mpesa_${r}`, "payment_failed")}
      />

      <CardPaymentModal
        isOpen={showCardPayment}
        onClose={() => setShowCardPayment(false)}
        total={grandTotal}
        onPaymentComplete={handleCardPaymentComplete}
      />
    </div>
  )
}
