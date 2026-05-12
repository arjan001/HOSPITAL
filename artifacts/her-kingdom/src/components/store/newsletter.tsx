"use client"

import React from "react"

import { useState } from "react"
import { Send } from "lucide-react"

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
    <section className="py-14 lg:py-20 bg-foreground text-background">
      <div className="mx-auto max-w-7xl px-4 text-center">
        <p className="text-background/60 text-xs tracking-[0.3em] uppercase mb-3">
          Stay Connected
        </p>
        <h2 className="text-2xl lg:text-3xl font-serif font-bold text-balance">
          Subscribe & Get 10% Off Your First Purchase
        </h2>
        <p className="text-background/60 text-sm mt-3 max-w-md mx-auto leading-relaxed">
          Be the first to know about new arrivals, exclusive offers, and styling tips.
        </p>

        {submitted ? (
          <div className="mt-8 animate-fade-in-up">
            <p className="text-sm font-medium">Thank you for subscribing!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 flex justify-center">
            <div className="flex w-full max-w-md">
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="flex-1 h-12 px-4 bg-background/10 text-background placeholder:text-background/40 text-sm outline-none border border-background/20 border-r-0"
              />
              <button
                type="submit"
                className="h-12 px-6 bg-background text-foreground text-sm font-medium flex items-center gap-2 hover:bg-background/90 transition-colors"
              >
                Subscribe
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  )
}
