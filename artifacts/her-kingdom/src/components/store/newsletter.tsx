"use client"

import React, { useState } from "react"
import { Send } from "lucide-react"

const DEEP_RED = "#7A0F1B"
const ACCENT_PEACH = "#F5C9A6"
const ACCENT_ORANGE = "#F97316"

export function Newsletter() {
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    try {
      await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
    } catch {
      // Continue even if fails
    }
    setSubmitted(true)
    setEmail("")
  }

  return (
    <section className="py-8 lg:py-10" style={{ background: DEEP_RED }}>
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Copy + form */}
          <div className="text-white">
            <h2 className="text-3xl lg:text-5xl font-bold tracking-tight">Stay Updated</h2>
            <p className="mt-3 text-base lg:text-lg text-white/85 max-w-md leading-relaxed">
              Be the first to know about new products and offers
            </p>

            {submitted ? (
              <p className="mt-6 text-sm font-medium text-white">Thank you for subscribing!</p>
            ) : (
              <form onSubmit={handleSubmit} className="mt-6 flex items-center gap-3 max-w-md">
                <div className="flex-1 h-12 rounded-full bg-white/10 border border-white/30 backdrop-blur-sm flex items-center px-5">
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="flex-1 h-full bg-transparent text-sm text-white placeholder:text-white/60 outline-none"
                  />
                </div>
                <button
                  type="submit"
                  aria-label="Subscribe"
                  className="h-12 w-14 rounded-full flex items-center justify-center shrink-0 transition-transform hover:scale-105"
                  style={{ background: ACCENT_PEACH }}
                >
                  <Send className="h-5 w-5" style={{ color: ACCENT_ORANGE }} />
                </button>
              </form>
            )}
          </div>

          {/* Pills hero image */}
          <div className="hidden lg:flex justify-end">
            <img
              src="/newsletter-pills.png"
              alt="Assorted medication bottles, pills and capsules"
              className="w-full max-w-md h-auto max-h-[240px] object-contain drop-shadow-2xl"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
