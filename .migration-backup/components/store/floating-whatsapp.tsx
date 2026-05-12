"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import { X } from "lucide-react"

const FALLBACK_WHATSAPP_NUMBER = "254780406059"
const DEFAULT_MESSAGE = "Hi Her Kingdom! I'd like to chat about an order."

const fetcher = (url: string) => fetch(url).then((r) => r.json())

type SiteDataResponse = {
  settings?: {
    whatsapp_number?: string
    footer_whatsapp?: string
    store_phone?: string
  }
}

export function FloatingWhatsApp() {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { data } = useSWR<SiteDataResponse>("/api/site-data", fetcher)

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 400)
    return () => clearTimeout(t)
  }, [])

  const rawNumber =
    data?.settings?.whatsapp_number ||
    data?.settings?.store_phone ||
    data?.settings?.footer_whatsapp ||
    FALLBACK_WHATSAPP_NUMBER
  const whatsappNumber = rawNumber.replace(/[^\d]/g, "") || FALLBACK_WHATSAPP_NUMBER

  const href = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(DEFAULT_MESSAGE)}`

  return (
    <div
      className={`fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3 transition-opacity duration-500 ${
        mounted ? "opacity-100" : "opacity-0"
      }`}
    >
      {open && (
        <div className="w-72 bg-white text-gray-900 rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-bottom-2">
          <div className="bg-[#25D366] px-4 py-3 flex items-center justify-between text-white">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold leading-tight">Her Kingdom</p>
                <p className="text-[11px] text-white/80">Typically replies within an hour</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center"
              aria-label="Close chat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="px-4 py-4 bg-[#ece5dd]">
            <div className="bg-white rounded-lg shadow-sm p-3 text-sm leading-relaxed max-w-[85%]">
              Karibu Her Kingdom! Chat with us about an order, delivery, or product details.
            </div>
          </div>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-[#25D366] hover:bg-[#1fb358] text-white text-center text-sm font-semibold py-3 transition-colors"
          >
            Start chat on WhatsApp
          </a>
        </div>
      )}

      <a
        href={open ? href : undefined}
        target={open ? "_blank" : undefined}
        rel="noopener noreferrer"
        onClick={(e) => {
          if (!open) {
            e.preventDefault()
            setOpen(true)
          }
        }}
        aria-label="Chat with us on WhatsApp"
        className="group relative w-14 h-14 rounded-full bg-[#25D366] text-white shadow-lg shadow-[#25D366]/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
      >
        <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-30" />
        <svg className="h-7 w-7 relative" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </a>
    </div>
  )
}
