"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { apiCarePacks } from "@/lib/api-nest"
import { Link, useSearch } from "wouter"
import { TopBar } from "./top-bar"
import { Navbar } from "./navbar"
import { Footer } from "./footer"
import { Seo } from "@/components/seo"
import {
  ArrowLeft, ArrowRight, Activity, ShieldCheck, Stethoscope,
  ClipboardList, Sparkles,
} from "lucide-react"

const WINE = "#3D0814"
const WINE_SOFT = "#6B0F1A"
const ACCENT_RED = "#B91C1C"
const ACCENT_ORANGE = "#F97316"
const PEACH_BORDER = "#F2DCC8"
const PILL_BG = "linear-gradient(135deg, #FFF1E6 0%, #FFE2D1 100%)"

const CONDITIONS = [
  { id: "diabetes", label: "Diabetes", packSlug: "diabetes-care", packName: "Diabetes Care Pack" },
  { id: "hypertension", label: "High blood pressure", packSlug: "blood-pressure-care", packName: "Blood Pressure Care Pack" },
  { id: "asthma", label: "Asthma / breathing", packSlug: "asthma-care", packName: "Asthma & Respiratory Pack" },
  { id: "chronic", label: "Other chronic condition", packSlug: "nutrition", packName: "Nutrition & Wellness Pack" },
  { id: "acute", label: "Short-term illness (cold, pain, infection)", packSlug: "cold-flu", packName: "Cold & Flu Pack" },
  { id: "family", label: "Family / caregiver needs", packSlug: "family-first-aid", packName: "Family First Aid Pack" },
  { id: "wellness", label: "Prevention & wellness", packSlug: "immunity", packName: "Immunity Boost Pack" },
  { id: "monitoring", label: "Home monitoring (BP, glucose, etc.)", packSlug: "diabetes-monitor", packName: "Diabetes Monitoring Pack" },
] as const

const STEPS = ["Your health needs", "Risk profile", "Recommended pack", "Next steps"] as const

function riskLabel(count: number): { level: string; detail: string } {
  if (count >= 3) return { level: "Higher complexity", detail: "A pharmacist-led care pack with follow-up is recommended." }
  if (count === 2) return { level: "Moderate", detail: "A curated pack plus optional consult will keep you on track." }
  return { level: "Routine", detail: "A starter care pack should cover your immediate needs." }
}

export function CarePackAssessmentPage() {
  const search = useSearch()
  const preselect = useMemo(() => {
    const params = new URLSearchParams(search)
    return params.get("pack") ?? ""
  }, [search])

  const [step, setStep] = useState(1)
  const [selected, setSelected] = useState<string[]>(() => {
    const match = CONDITIONS.find((c) => c.packSlug === preselect)
    return match ? [match.id] : []
  })

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const recommendations = useMemo(() => {
    const picks = CONDITIONS.filter((c) => selected.includes(c.id))
    if (picks.length === 0 && preselect) {
      const bySlug = CONDITIONS.find((c) => c.packSlug === preselect)
      if (bySlug) return [bySlug]
    }
    return picks.length > 0 ? picks : [CONDITIONS[6]]
  }, [selected, preselect])

  const risk = riskLabel(selected.length)
  const crmSent = useRef(false)

  useEffect(() => {
    if (step !== 4 || crmSent.current) return
    crmSent.current = true
    void apiCarePacks
      .submitAssessment({
        conditionKeys: selected,
        recommendedPacks: recommendations.map((r) => ({
          packSlug: r.packSlug,
          packName: r.packName,
          productSkus: [],
        })),
        riskLevel: risk.level,
      })
      .catch(() => {})
  }, [step, selected, recommendations, risk.level])

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#FFFBF5" }}>
      <Seo
        title="Care Pack Assessment — Personalised Health Bundles"
        description="Answer a few questions and get a pharmacist-recommended care pack. Pricing is shared after review — no surprises at checkout."
        keywords={["care pack assessment Kenya", "personalised medicine bundle", "Shaniid RX care pack"]}
        canonicalPath="/care-packs/assessment"
      />
      <TopBar />
      <Navbar />

      <main className="flex-1">
        <div
          className="border-b"
          style={{ borderColor: PEACH_BORDER, background: "linear-gradient(180deg, #FFF6EE 0%, #FFFBF5 100%)" }}
        >
          <div className="mx-auto max-w-3xl px-4 py-8 lg:py-10">
            <Link
              href="/care-packs"
              className="inline-flex items-center gap-1.5 text-xs font-semibold mb-4 hover:opacity-80"
              style={{ color: WINE_SOFT }}
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to care packs
            </Link>
            <h1 className="text-2xl lg:text-3xl font-black" style={{ color: WINE }}>
              Care Pack Assessment
            </h1>
            <p className="mt-2 text-sm max-w-xl" style={{ color: WINE_SOFT }}>
              A short assessment to match you with the right care pack.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {STEPS.map((label, i) => {
                const n = i + 1
                const done = step > n
                const active = step === n
                return (
                  <span
                    key={label}
                    className="text-[11px] font-semibold px-3 py-1.5 rounded-full"
                    style={{
                      background: done || active ? `linear-gradient(135deg, ${ACCENT_ORANGE} 0%, ${ACCENT_RED} 100%)` : "#F2D4C4",
                      color: done || active ? "#fff" : WINE,
                    }}
                  >
                    {n}. {label}
                  </span>
                )
              })}
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-3xl px-4 py-8 lg:py-10">
          {step === 1 && (
            <section
              className="rounded-2xl p-6 lg:p-8"
              style={{ background: "#fff", border: `1px solid ${PEACH_BORDER}`, boxShadow: "0 12px 40px -24px rgba(61,8,20,0.2)" }}
            >
              <div className="flex items-center gap-3 mb-5">
                <span className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: PILL_BG }}>
                  <ClipboardList className="h-5 w-5" style={{ color: ACCENT_RED }} />
                </span>
                <div>
                  <h2 className="text-lg font-bold" style={{ color: WINE }}>What do you need support with?</h2>
                  <p className="text-xs" style={{ color: WINE_SOFT }}>Select all that apply — takes under a minute.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {CONDITIONS.map((c) => {
                  const on = selected.includes(c.id)
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggle(c.id)}
                      className="text-left px-4 py-3 rounded-xl text-sm font-medium transition-all"
                      style={{
                        border: `1.5px solid ${on ? ACCENT_RED : PEACH_BORDER}`,
                        background: on ? "#FFF1E6" : "#fff",
                        color: WINE,
                      }}
                    >
                      {c.label}
                    </button>
                  )
                })}
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  disabled={selected.length === 0}
                  onClick={() => setStep(2)}
                  className="h-11 px-6 rounded-full text-sm font-bold text-white inline-flex items-center gap-2 disabled:opacity-40"
                  style={{ background: `linear-gradient(135deg, ${ACCENT_ORANGE} 0%, ${ACCENT_RED} 100%)` }}
                >
                  Continue <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </section>
          )}

          {step === 2 && (
            <section
              className="rounded-2xl p-6 lg:p-8"
              style={{ background: "#fff", border: `1px solid ${PEACH_BORDER}` }}
            >
              <div className="flex items-center gap-3 mb-5">
                <span className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: PILL_BG }}>
                  <Activity className="h-5 w-5" style={{ color: ACCENT_RED }} />
                </span>
                <h2 className="text-lg font-bold" style={{ color: WINE }}>Your risk profile</h2>
              </div>
              <div
                className="rounded-xl p-5"
                style={{ background: "linear-gradient(145deg, #FEF0E4 0%, #FAE2CC 100%)", border: `1px solid ${PEACH_BORDER}` }}
              >
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: WINE_SOFT }}>Profile</p>
                <p className="text-xl font-black mt-1" style={{ color: WINE }}>{risk.level}</p>
                <p className="text-sm mt-2" style={{ color: WINE_SOFT }}>{risk.detail}</p>
                <p className="text-xs mt-4" style={{ color: WINE_SOFT }}>
                  {selected.length} need{selected.length !== 1 ? "s" : ""} selected · A licensed pharmacist will confirm before any quote.
                </p>
              </div>
              <div className="mt-6 flex justify-between gap-3">
                <button type="button" onClick={() => setStep(1)} className="h-11 px-5 rounded-full text-sm font-semibold border" style={{ borderColor: PEACH_BORDER, color: WINE }}>
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="h-11 px-6 rounded-full text-sm font-bold text-white"
                  style={{ background: `linear-gradient(135deg, ${ACCENT_ORANGE} 0%, ${ACCENT_RED} 100%)` }}
                >
                  See recommended pack
                </button>
              </div>
            </section>
          )}

          {step === 3 && (
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: PILL_BG }}>
                  <Sparkles className="h-5 w-5" style={{ color: ACCENT_RED }} />
                </span>
                <div>
                  <h2 className="text-lg font-bold" style={{ color: WINE }}>Recommended care pack(s)</h2>
                  <p className="text-xs" style={{ color: WINE_SOFT }}>No prices here — you&apos;ll receive a personalised quote after review.</p>
                </div>
              </div>
              {recommendations.map((rec) => (
                <div
                  key={rec.id}
                  className="rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                  style={{ background: "#fff", border: `1px solid ${PEACH_BORDER}` }}
                >
                  <div>
                    <p className="text-base font-bold" style={{ color: WINE }}>{rec.packName}</p>
                    <p className="text-xs mt-1" style={{ color: WINE_SOFT }}>
                      Curated bundle · Pharmacist-verified · Delivered to your door
                    </p>
                  </div>
                  <Link
                    href={`/care-packs/assessment?pack=${rec.packSlug}`}
                    className="h-10 px-5 rounded-full text-sm font-bold inline-flex items-center justify-center gap-1.5 shrink-0"
                    style={{ background: "#F2D4C4", color: WINE }}
                  >
                    See more <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              ))}
              <div className="mt-4 flex justify-between gap-3">
                <button type="button" onClick={() => setStep(2)} className="h-11 px-5 rounded-full text-sm font-semibold border" style={{ borderColor: PEACH_BORDER, color: WINE }}>
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="h-11 px-6 rounded-full text-sm font-bold text-white"
                  style={{ background: `linear-gradient(135deg, ${ACCENT_ORANGE} 0%, ${ACCENT_RED} 100%)` }}
                >
                  Continue
                </button>
              </div>
            </section>
          )}

          {step === 4 && (
            <section
              className="rounded-2xl p-6 lg:p-8 space-y-4"
              style={{ background: "#fff", border: `1px solid ${PEACH_BORDER}` }}
            >
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: PILL_BG }}>
                  <Stethoscope className="h-5 w-5" style={{ color: ACCENT_RED }} />
                </span>
                <h2 className="text-lg font-bold" style={{ color: WINE }}>Consultation offer &amp; order</h2>
              </div>
              <p className="text-sm" style={{ color: WINE_SOFT }}>
                Optional video consult with a licensed clinician, or upload a prescription for pharmacist review.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Link
                  href="/speak-to-a-doctor"
                  className="rounded-xl p-4 border transition-shadow hover:shadow-md"
                  style={{ borderColor: PEACH_BORDER }}
                >
                  <p className="text-sm font-bold" style={{ color: WINE }}>Speak to a doctor</p>
                  <p className="text-xs mt-1" style={{ color: WINE_SOFT }}>Video consult · Prescription if needed</p>
                </Link>
                <Link
                  href="/upload-prescription"
                  className="rounded-xl p-4 text-white transition-opacity hover:opacity-95"
                  style={{ background: `linear-gradient(135deg, ${ACCENT_ORANGE} 0%, ${ACCENT_RED} 100%)` }}
                >
                  <p className="text-sm font-bold">Upload prescription</p>
                  <p className="text-xs mt-1 opacity-90">Or use WhatsApp from that page</p>
                </Link>
              </div>
              <p className="text-xs flex items-start gap-2 pt-2" style={{ color: WINE_SOFT }}>
                <ShieldCheck className="h-4 w-4 shrink-0" style={{ color: ACCENT_RED }} />
                Shaniid RX trust seal: genuine medicine, fair pricing after review, delivered with integrity.
              </p>
              <Link
                href="/care-packs"
                className="inline-flex items-center gap-1.5 text-sm font-semibold mt-2"
                style={{ color: ACCENT_RED }}
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Browse all care packs
              </Link>
            </section>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
