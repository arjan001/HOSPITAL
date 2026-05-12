"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import Link from "next/link"
import { useStoreContact } from "@/hooks/use-store-contact"

export type Faq = { q: string; a: string }

export function FaqSection({ faqs }: { faqs: Faq[] }) {
  const [open, setOpen] = useState<number | null>(0)
  const { phoneDisplay } = useStoreContact()
  if (!faqs?.length) return null
  return (
    <section
      id="faq"
      className="bg-secondary/30 border-y border-border py-16 lg:py-20"
      aria-labelledby="faq-heading"
    >
      <div className="mx-auto max-w-4xl px-4">
        <div className="text-center mb-10">
          <p className="text-xs uppercase tracking-[0.25em] text-primary font-medium mb-3">
            Help Centre
          </p>
          <h2
            id="faq-heading"
            className="text-3xl lg:text-4xl font-serif font-semibold"
          >
            Frequently Asked Questions
          </h2>
          <p className="text-muted-foreground text-sm mt-3 max-w-xl mx-auto">
            Everything you need to know about shopping curated jewelry, watches
            and luxe gift packages at{" "}
            <Link href="/" className="underline underline-offset-4">
              herkingdom.shop
            </Link>
            . Still have questions? WhatsApp us on {phoneDisplay}.
          </p>
        </div>
        <ul className="divide-y divide-border rounded-xl border border-border bg-background shadow-sm">
          {faqs.map((f, i) => {
            const isOpen = open === i
            return (
              <li key={f.q}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-panel-${i}`}
                  className="w-full flex items-center justify-between gap-4 text-left px-5 py-4 hover:bg-secondary/30 transition-colors"
                >
                  <span className="font-medium text-sm lg:text-base">{f.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 flex-shrink-0 transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div
                    id={`faq-panel-${i}`}
                    className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground"
                  >
                    {f.a}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
