"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { X } from "lucide-react"
import useSWR from "swr"
import type { Offer } from "@/lib/types"
import { safeFetcher } from "@/lib/fetcher"

export function OfferModal() {
  const { data } = useSWR<{ popupOffer?: Offer }>("/api/site-data", safeFetcher)
  const offer: Offer | null = data?.popupOffer || null
  const [isOpen, setIsOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [dontShow, setDontShow] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (!offer) return
    const dismissed = localStorage.getItem("offer-dismissed-permanent")
    const sessionDismissed = sessionStorage.getItem("offer-dismissed")
    if (dismissed || sessionDismissed) return
    const timer = setTimeout(() => setIsOpen(true), 3000)
    return () => clearTimeout(timer)
  }, [offer])

  const handleClose = () => {
    setIsOpen(false)
    if (dontShow) {
      localStorage.setItem("offer-dismissed-permanent", "true")
    } else {
      sessionStorage.setItem("offer-dismissed", "true")
    }
  }

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    try {
      await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
    } catch {
      // Continue even if API fails
    }
    setSubmitted(true)
    setTimeout(() => handleClose(), 2500)
  }

  if (!offer || !isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
        onKeyDown={(e) => e.key === "Escape" && handleClose()}
        role="button"
        tabIndex={0}
        aria-label="Close popup"
      />

      {/* Modal */}
      <div className="relative z-10 w-[92vw] max-w-[780px] bg-background shadow-2xl flex flex-col sm:flex-row overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        {/* Left panel - Product Image */}
        <div className="relative w-full sm:w-[46%] h-60 sm:h-auto sm:min-h-[480px] flex-shrink-0 bg-[#f5f0eb]">
          <Image
            src={offer.image || "/placeholder.svg"}
            alt={offer.title}
            fill
            className="object-cover object-center"
            sizes="(max-width: 640px) 92vw, 360px"
            priority
          />
        </div>

        {/* Right panel - Newsletter form */}
        <div className="flex-1 relative px-8 py-10 sm:px-10 sm:py-12 flex flex-col justify-center">
          {/* Close button */}
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-5 right-5 w-9 h-9 flex items-center justify-center text-foreground/60 hover:text-foreground transition-colors"
            aria-label="Close popup"
          >
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>

          {submitted ? (
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-[#e63946]/10 flex items-center justify-center mx-auto mb-5">
                <svg className="h-7 w-7 text-[#e63946]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl font-serif font-bold text-foreground">Thank You!</h3>
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                {"You've"} been subscribed. Check your inbox for your discount code.
              </p>
            </div>
          ) : (
            <>
              {/* Newsletter label */}
              <p className="text-sm text-muted-foreground font-medium">
                Newsletter
              </p>

              {/* Heading */}
              <h3 className="text-[28px] sm:text-[32px] font-serif font-bold text-foreground mt-2 leading-tight text-balance">
                Subscribe Now
              </h3>

              {/* Subtitle */}
              <p className="text-[15px] text-muted-foreground mt-3 leading-relaxed">
                {offer.description || "Subscribe to our newsletter and get 10% off your first purchase"}
              </p>

              {/* Email form */}
              <form onSubmit={handleSubscribe} className="mt-8">
                <label htmlFor="offer-email" className="text-sm font-medium text-foreground block mb-2">
                  Email Address <span className="text-[#e63946]">*</span>
                </label>
                <input
                  id="offer-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter Your Email"
                  className="w-full h-12 px-4 border border-border/80 rounded-sm bg-background text-foreground text-sm outline-none focus:border-foreground/50 transition-colors placeholder:text-muted-foreground/60"
                />
                <button
                  type="submit"
                  className="w-full h-12 mt-4 bg-[#e63946] text-white text-sm font-semibold tracking-wide rounded-sm hover:bg-[#d62f3c] active:bg-[#c4272f] transition-colors"
                >
                  Subscribe
                </button>
              </form>

              {/* Don't show again */}
              <label className="flex items-center gap-3 mt-7 cursor-pointer select-none group">
                <div className="relative flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={dontShow}
                    onChange={(e) => setDontShow(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="w-[18px] h-[18px] border-2 border-border/70 rounded-sm peer-checked:bg-foreground peer-checked:border-foreground transition-colors flex items-center justify-center">
                    {dontShow && (
                      <svg className="w-3 h-3 text-background" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                  {"Don't show this popup again"}
                </span>
              </label>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
