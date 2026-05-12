"use client"

import { MapPin, Truck, Clock, Package, ShoppingCart, Flame, Zap, CheckCircle2 } from "lucide-react"
import { TopBar } from "./top-bar"
import { Navbar } from "./navbar"
import { Footer } from "./footer"
import type { DeliveryLocation } from "@/lib/types"
import useSWR from "swr"
import { Link } from "wouter"

const WINE        = "#3D0814"
const WINE_SOFT   = "#6B0F1A"
const CREAM       = "#FFFBF5"
const PEACH_BORDER= "#F2DCC8"
const AMBER_CARD  = "#F5D5A0"
const MAUVE_CARD  = "#C17070"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function formatPrice(price: number): string {
  return `KSh ${price.toLocaleString()}`
}

/* ── Step tile for "How It Works" ── */
function StepTile({ icon: Icon, step, label1, label2 }: { icon: React.ElementType; step: number; label1: string; label2: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div
        className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center mb-3 sm:mb-4"
        style={{
          background: `linear-gradient(145deg, ${AMBER_CARD} 0%, #E8B870 100%)`,
          boxShadow: "0 8px 24px -8px rgba(61,8,20,0.25)",
        }}
      >
        <Icon className="h-9 w-9 sm:h-11 sm:w-11" style={{ color: WINE }} strokeWidth={1.6} />
      </div>
      <p className="text-xs sm:text-sm font-semibold" style={{ color: WINE }}>{step}. {label1}</p>
      <p className="text-xs sm:text-sm font-semibold" style={{ color: WINE }}>{label2}</p>
    </div>
  )
}

/* ── Chevron separator ── */
function Chevron() {
  return (
    <div className="hidden sm:flex items-center self-start mt-7 sm:mt-9">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M7 4l6 6-6 6" stroke={WINE} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

export function DeliveryPage() {
  const { data: deliveryLocations = [] } = useSWR<DeliveryLocation[]>("/api/delivery-locations", fetcher)

  return (
    <div className="min-h-screen flex flex-col" style={{ background: CREAM }}>
      <TopBar />
      <Navbar />

      <main className="flex-1">
        {/* ── Hero Banner ── */}
        <section
          className="relative overflow-hidden"
          style={{
            background: "linear-gradient(120deg, #FFF6EB 0%, #FAE0C8 60%, #F5CDB8 100%)",
            borderBottom: `1px solid ${PEACH_BORDER}`,
            minHeight: 360,
          }}
        >
          {/* Soft glow behind rider */}
          <div
            className="absolute right-0 bottom-0 w-[600px] h-[600px] pointer-events-none"
            style={{ background: `radial-gradient(ellipse at 80% 100%, rgba(197,136,100,0.22) 0%, transparent 68%)` }}
          />

          <div className="mx-auto max-w-7xl px-4 relative z-10" style={{ minHeight: 360 }}>
            <div className="flex items-center" style={{ minHeight: 360 }}>
              {/* Text — left half */}
              <div className="w-full lg:w-1/2 py-12">
                <h1
                  className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight tracking-tight"
                  style={{ color: WINE, fontFamily: "var(--font-serif, ui-serif, Georgia, serif)" }}
                >
                  Fast &amp; Safe<br />Medicine Delivery
                </h1>
                <p className="text-neutral-600 mt-3 max-w-md leading-relaxed text-sm sm:text-base">
                  Get your medicine delivered to your doorstep with care &amp; privacy.
                </p>
                <Link href="/shop">
                  <button
                    type="button"
                    className="mt-6 px-7 h-12 rounded-full text-sm font-bold inline-flex items-center gap-2 transition-transform hover:scale-105"
                    style={{
                      background: `linear-gradient(135deg, ${AMBER_CARD} 0%, #D4924A 100%)`,
                      color: WINE,
                      boxShadow: "0 10px 26px -10px rgba(212,146,74,0.55)",
                    }}
                  >
                    <ShoppingCart className="h-4 w-4" />
                    View Delivery Options
                  </button>
                </Link>
              </div>
            </div>
          </div>

          {/* Rider — absolute right, bottom-anchored, fills banner height */}
          <img
            src="/delivery-rider.png"
            alt="Delivery rider on scooter"
            className="hidden lg:block absolute bottom-0 right-0 object-contain drop-shadow-2xl pointer-events-none"
            style={{
              height: "110%",
              maxHeight: 420,
              width: "auto",
              right: "4%",
            }}
          />
        </section>

        <div className="mx-auto max-w-7xl px-4 py-12 space-y-14">

          {/* ── How Delivery Works ── */}
          <section>
            <h2
              className="text-2xl sm:text-3xl font-extrabold mb-8"
              style={{ color: WINE, fontFamily: "var(--font-serif, ui-serif, Georgia, serif)" }}
            >
              How Delivery Works
            </h2>

            <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 sm:gap-2">
              <StepTile icon={ShoppingCart}  step={1} label1="Order Your"    label2="Medicine"          />
              <Chevron />
              <StepTile icon={MapPin}        step={2} label1="Enter Delivery" label2="Address"           />
              <Chevron />
              <StepTile icon={Truck}         step={3} label1="Confirm"        label2="Delivery &amp; Pay" />
              <Chevron />
              <StepTile icon={Package}       step={4} label1="Receive"        label2="Your Order"        />
            </div>
          </section>

          {/* ── Delivery Options ── */}
          <section>
            <h2
              className="text-2xl sm:text-3xl font-extrabold mb-6"
              style={{ color: WINE, fontFamily: "var(--font-serif, ui-serif, Georgia, serif)" }}
            >
              Delivery Options
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Express */}
              <div
                className="relative rounded-2xl p-6 sm:p-8 overflow-hidden"
                style={{
                  background: `linear-gradient(145deg, ${AMBER_CARD} 0%, #EEC070 100%)`,
                  boxShadow: "0 8px 28px -10px rgba(212,146,74,0.4)",
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-extrabold" style={{ color: WINE }}>Express Delivery</p>
                    <p className="text-sm mt-0.5" style={{ color: WINE_SOFT }}>Same day / Next day</p>
                    <p className="text-xl font-black mt-4" style={{ color: WINE }}>Ksh 300 – Ksh 250</p>
                    <p className="text-xs mt-1" style={{ color: WINE_SOFT }}>Members price in green</p>
                  </div>
                  {/* Flame-clock icon */}
                  <div className="flex-shrink-0 relative">
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center"
                      style={{ background: "rgba(61,8,20,0.12)" }}
                    >
                      <Flame className="h-8 w-8 absolute top-2 right-2 opacity-80" style={{ color: WINE }} />
                      <Clock className="h-9 w-9" style={{ color: WINE }} strokeWidth={1.6} />
                    </div>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  {["Nairobi CBD", "Westlands", "Kilimani", "Parklands", "Kasarani"].map((area) => (
                    <span key={area} className="text-[11px] px-2.5 py-1 rounded-full font-medium" style={{ background: "rgba(61,8,20,0.1)", color: WINE }}>
                      {area}
                    </span>
                  ))}
                </div>
              </div>

              {/* Standard */}
              <div
                className="relative rounded-2xl p-6 sm:p-8 overflow-hidden"
                style={{
                  background: `linear-gradient(145deg, ${MAUVE_CARD} 0%, #9E4A4A 100%)`,
                  boxShadow: "0 8px 28px -10px rgba(193,112,112,0.4)",
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-extrabold text-white">Standard Delivery</p>
                    <p className="text-sm mt-0.5 text-white/75">2-3 working days</p>
                    <p className="text-xl font-black mt-4" style={{ color: AMBER_CARD }}>Ksh 150 – Ksh 100</p>
                    <p className="text-xs mt-1 text-white/60">Members price in amber</p>
                  </div>
                  {/* Truck icon */}
                  <div className="flex-shrink-0">
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center"
                      style={{ background: "rgba(245,213,160,0.2)" }}
                    >
                      <Truck className="h-10 w-10" style={{ color: AMBER_CARD }} strokeWidth={1.5} />
                    </div>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  {["Mombasa", "Kisumu", "Nakuru", "Eldoret", "Thika", "Nyeri"].map((area) => (
                    <span key={area} className="text-[11px] px-2.5 py-1 rounded-full font-medium" style={{ background: "rgba(255,255,255,0.15)", color: "white" }}>
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ── Free shipping notice ── */}
          <div
            className="rounded-2xl px-6 py-4 flex items-center gap-3"
            style={{
              background: "linear-gradient(135deg, #FFF7ED 0%, #FFECD8 100%)",
              border: `1px solid ${PEACH_BORDER}`,
            }}
          >
            <Zap className="h-5 w-5 flex-shrink-0" style={{ color: WINE }} />
            <p className="text-sm font-medium" style={{ color: WINE }}>
              <span className="font-extrabold">FREE delivery</span> on all orders above{" "}
              <span className="font-extrabold">KSh 5,000</span> across Kenya.
            </p>
          </div>

          {/* ── Delivery Rates Table (from API) ── */}
          {deliveryLocations.length > 0 && (
            <section>
              <h2
                className="text-2xl font-extrabold mb-5"
                style={{ color: WINE, fontFamily: "var(--font-serif, ui-serif, Georgia, serif)" }}
              >
                Delivery Rates by Location
              </h2>
              <div
                className="rounded-2xl overflow-hidden"
                style={{ border: `1px solid ${PEACH_BORDER}`, boxShadow: "0 6px 20px -10px rgba(61,8,20,0.12)" }}
              >
                {/* Table header */}
                <div
                  className="grid grid-cols-3 px-5 py-3 text-xs font-bold uppercase tracking-widest"
                  style={{ background: `linear-gradient(135deg, ${WINE} 0%, ${WINE_SOFT} 100%)`, color: "white" }}
                >
                  <span><MapPin className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />Location</span>
                  <span className="text-center">Est. Time</span>
                  <span className="text-right">Fee</span>
                </div>
                <div className="divide-y" style={{ divideColor: PEACH_BORDER }}>
                  {deliveryLocations.map((loc, i) => (
                    <div
                      key={loc.id}
                      className="grid grid-cols-3 items-center px-5 py-4 transition-colors hover:bg-[#FFF6EE]"
                      style={{ background: i % 2 === 0 ? "white" : "#FFFBF5" }}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: WINE }} />
                        <span className="text-sm font-semibold" style={{ color: WINE }}>{loc.name}</span>
                      </div>
                      <p className="text-xs text-neutral-500 text-center">{loc.estimatedDays}</p>
                      <span className="text-sm font-extrabold text-right" style={{ color: WINE }}>
                        {formatPrice(loc.fee)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* ── Trust row ── */}
          <section>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { icon: Clock,        label: "Order by 12 PM",   sub: "for same-day delivery" },
                { icon: CheckCircle2, label: "Verified Products", sub: "sourced from licensed distributors" },
                { icon: Package,      label: "Discreet Packaging",sub: "your privacy matters" },
                { icon: Truck,        label: "Real-time Tracking",sub: "via WhatsApp updates" },
              ].map(({ icon: Icon, label, sub }) => (
                <div
                  key={label}
                  className="rounded-2xl p-4 text-center"
                  style={{
                    background: "white",
                    border: `1px solid ${PEACH_BORDER}`,
                    boxShadow: "0 4px 14px -6px rgba(61,8,20,0.1)",
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3"
                    style={{ background: "#FFF1E2" }}
                  >
                    <Icon className="h-5 w-5" style={{ color: WINE }} strokeWidth={1.8} />
                  </div>
                  <p className="text-xs font-bold" style={{ color: WINE }}>{label}</p>
                  <p className="text-[10px] text-neutral-400 mt-0.5 leading-snug">{sub}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── Physical shop ── */}
          <div
            className="rounded-2xl px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center gap-4"
            style={{
              background: "linear-gradient(135deg, #FFF0E0 0%, #FFE4CC 100%)",
              border: `1px solid ${PEACH_BORDER}`,
            }}
          >
            <MapPin className="h-8 w-8 flex-shrink-0" style={{ color: WINE }} />
            <div>
              <p className="font-extrabold text-sm" style={{ color: WINE }}>Physical Shop</p>
              <p className="text-sm text-neutral-600 leading-relaxed mt-0.5">
                Philadelphia House, 3rd Floor Wing B Room 9.<br />
                Open <strong>Monday – Saturday, 9 AM – 6 PM</strong>.
              </p>
            </div>
            <a
              href="https://wa.me/254700000000?text=I'd like to visit your shop"
              target="_blank"
              rel="noopener noreferrer"
              className="sm:ml-auto flex-shrink-0 px-5 h-10 rounded-full text-sm font-semibold inline-flex items-center gap-2 text-white transition-transform hover:scale-105"
              style={{ background: "#25D366" }}
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" /></svg>
              Get Directions
            </a>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  )
}
