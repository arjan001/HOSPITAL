"use client"

import React, { useState } from "react"
import { Send, Mail } from "lucide-react"

const WINE = "#3D0814"
const WINE_SOFT = "#6B0F1A"
const ACCENT_PEACH = "#F5C9A6"
const ACCENT_ORANGE = "#F97316"

export function CompactNewsletter() {
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setError("")
    try {
      const res = await fetch("/api/v2/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "compact-bar" }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data?.error || "Something went wrong. Please try again.")
        return
      }
    } catch {
      setError("Network error. Please check your connection and try again.")
      return
    }
    setSubmitted(true)
    setEmail("")
  }

  return (
    <section className="px-4 py-8 lg:py-10">
      <div className="mx-auto max-w-7xl">
        <div
          className="relative overflow-hidden rounded-3xl px-6 sm:px-10 py-7 lg:py-8"
          style={{
            background: `linear-gradient(115deg, ${WINE} 0%, ${WINE_SOFT} 100%)`,
            boxShadow: "0 18px 40px -22px rgba(61,8,20,0.45)",
          }}
        >
          {/* decorative glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full opacity-25"
            style={{ background: `radial-gradient(circle, ${ACCENT_PEACH} 0%, transparent 70%)` }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -left-16 -bottom-24 h-60 w-60 rounded-full opacity-20"
            style={{ background: `radial-gradient(circle, ${ACCENT_ORANGE} 0%, transparent 70%)` }}
          />

          <div className="relative grid grid-cols-1 md:grid-cols-[auto_1fr_auto] items-center gap-5 md:gap-8">
            <div
              className="hidden md:grid place-items-center h-14 w-14 rounded-2xl"
              style={{
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.25)",
                backdropFilter: "blur(6px)",
              }}
            >
              <Mail className="h-7 w-7" style={{ color: ACCENT_PEACH }} />
            </div>

            <div className="text-white">
              <h3 className="text-xl lg:text-2xl font-bold tracking-tight">
                Stay updated on new arrivals &amp; offers
              </h3>
              <p className="mt-1 text-sm text-white/80 max-w-md">
                Sign up for the latest deals, product news and wellness tips from Shaniid&nbsp;RX.
              </p>
            </div>

            {submitted ? (
              <p
                className="text-sm font-semibold whitespace-nowrap"
                style={{ color: ACCENT_PEACH }}
              >
                Thank you for subscribing!
              </p>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="flex items-center gap-2 w-full md:w-auto"
              >
                <div
                  className="flex-1 md:w-[280px] h-11 rounded-full flex items-center px-4"
                  style={{
                    background: "rgba(255,255,255,0.12)",
                    border: "1px solid rgba(255,255,255,0.3)",
                    backdropFilter: "blur(6px)",
                  }}
                >
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="flex-1 h-full bg-transparent text-sm text-white placeholder:text-white/55 outline-none"
                  />
                </div>
                <button
                  type="submit"
                  aria-label="Subscribe"
                  className="h-11 w-12 rounded-full grid place-items-center shrink-0 transition-transform hover:scale-105"
                  style={{ background: ACCENT_PEACH }}
                >
                  <Send className="h-4 w-4" style={{ color: ACCENT_ORANGE }} />
                </button>
              </form>
            )}
            {error && !submitted && (
              <p className="text-sm font-medium whitespace-nowrap" style={{ color: ACCENT_PEACH }}>
                {error}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
