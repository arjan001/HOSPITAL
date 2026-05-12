"use client"

import useSWR from "swr"

const FALLBACK_WHATSAPP = "254780406059"
const FALLBACK_PHONE_DISPLAY = "0780 406 059"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

type SiteDataResponse = {
  settings?: {
    store_phone?: string | null
    whatsapp_number?: string | null
    footer_phone?: string | null
    footer_whatsapp?: string | null
  }
}

const onlyDigits = (v: string | null | undefined) => (v || "").replace(/[^\d]/g, "")

function formatPhoneDisplay(raw: string | null | undefined, fallback: string): string {
  const source = (raw || "").trim()
  if (!source) return fallback
  if (/[^\d+\s().-]/.test(source)) return source
  const digits = onlyDigits(source)
  if (digits.length === 12 && digits.startsWith("254")) {
    return `0${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`
  }
  if (digits.length === 10 && digits.startsWith("0")) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`
  }
  return source
}

export function useStoreContact() {
  const { data } = useSWR<SiteDataResponse>("/api/site-data", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  })

  const s = data?.settings || {}

  // Admin UI writes to `whatsapp_number` and `store_phone` only. `footer_whatsapp`
  // and `footer_phone` are legacy columns that are never updated via the admin
  // form, so prefer the admin-editable fields and fall back to the legacy ones
  // only when the admin-editable values are empty.
  const whatsappDigits =
    onlyDigits(s.whatsapp_number) ||
    onlyDigits(s.store_phone) ||
    onlyDigits(s.footer_whatsapp) ||
    FALLBACK_WHATSAPP

  const phoneSource = s.store_phone || s.whatsapp_number || s.footer_phone || ""
  const phoneDisplay = formatPhoneDisplay(phoneSource, FALLBACK_PHONE_DISPLAY)

  const phoneDialDigits = onlyDigits(phoneSource) || whatsappDigits
  const phoneHref = phoneDialDigits
    ? phoneDialDigits.startsWith("254")
      ? `tel:+${phoneDialDigits}`
      : `tel:${phoneDialDigits}`
    : "tel:"

  const whatsappHref = whatsappDigits ? `https://wa.me/${whatsappDigits}` : "#"

  return {
    whatsappNumber: whatsappDigits,
    whatsappHref,
    phoneDisplay,
    phoneHref,
  }
}
