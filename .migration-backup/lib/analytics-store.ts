import { getStore } from "@netlify/blobs"

// Store names
const VIEWS_STORE = "analytics-views"
const EVENTS_STORE = "analytics-events"
const CHECKOUTS_STORE = "analytics-checkouts"
const REALTIME_STORE = "analytics-realtime"
const VIEW_DEDUP_WINDOW_MS = 30 * 60 * 1000
const EVENT_DEDUP_WINDOW_MS = 10 * 1000

function todayKey(): string {
  return new Date().toISOString().split("T")[0]
}

// ---- Page Views ----

export interface PageView {
  id: string
  page_path: string
  referrer: string
  user_agent: string
  country: string
  country_name: string
  city: string
  region: string
  device_type: string
  browser: string
  session_id: string
  is_bot: boolean
  ip_address: string
  duration_seconds: number
  scroll_depth: number
  visitor_id: string
  is_returning: boolean
  language: string
  utm_source: string
  utm_medium: string
  utm_campaign: string
  created_at: string
}

function isRecent(createdAt: string, windowMs: number): boolean {
  const ts = new Date(createdAt).getTime()
  if (Number.isNaN(ts)) return false
  return Date.now() - ts <= windowMs
}

function sameVisitor(view: PageView, incoming: Omit<PageView, "id" | "created_at">): boolean {
  if (incoming.session_id && view.session_id && incoming.session_id === view.session_id) return true
  if (incoming.visitor_id && view.visitor_id && incoming.visitor_id === view.visitor_id) return true
  if (incoming.ip_address && view.ip_address && incoming.ip_address === view.ip_address) return true
  return false
}

export async function addPageView(view: Omit<PageView, "id" | "created_at">): Promise<string> {
  const store = getStore({ name: VIEWS_STORE, consistency: "strong" })
  const day = todayKey()
  const existing: PageView[] = (await store.get(day, { type: "json" })) || []

  // Prevent duplicate page-view rows for repeated hits by the same visitor
  // on the same page in a short window.
  for (let i = existing.length - 1; i >= 0; i--) {
    const current = existing[i]
    if (
      current.page_path === view.page_path &&
      sameVisitor(current, view) &&
      isRecent(current.created_at, VIEW_DEDUP_WINDOW_MS)
    ) {
      current.referrer = current.referrer || view.referrer
      current.country = current.country || view.country
      current.country_name = current.country_name || view.country_name
      current.city = current.city || view.city
      current.region = current.region || view.region
      current.user_agent = current.user_agent || view.user_agent
      current.device_type = current.device_type || view.device_type
      current.browser = current.browser || view.browser
      current.is_bot = current.is_bot || view.is_bot
      if (!current.ip_address && view.ip_address) current.ip_address = view.ip_address
      await store.setJSON(day, existing)
      return current.id
    }
  }

  const id = crypto.randomUUID()
  const record: PageView = { ...view, id, created_at: new Date().toISOString() }
  existing.push(record)
  await store.setJSON(day, existing)
  return id
}

export async function updatePageView(sessionId: string, path: string, duration: number, scrollDepth: number): Promise<void> {
  const store = getStore({ name: VIEWS_STORE, consistency: "strong" })
  const day = todayKey()
  const existing: PageView[] = (await store.get(day, { type: "json" })) || []
  // Find the most recent view for this session + path
  for (let i = existing.length - 1; i >= 0; i--) {
    if (existing[i].session_id === sessionId && existing[i].page_path === path) {
      existing[i].duration_seconds = duration
      existing[i].scroll_depth = scrollDepth
      break
    }
  }
  await store.setJSON(day, existing)
}

export async function getPageViews(days: number): Promise<PageView[]> {
  const store = getStore(VIEWS_STORE)
  const allViews: PageView[] = []
  for (let i = 0; i < days; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().split("T")[0]
    try {
      const dayViews: PageView[] | null = await store.get(key, { type: "json" })
      if (dayViews && Array.isArray(dayViews)) allViews.push(...dayViews)
    } catch {
      // Day doesn't exist yet
    }
  }
  return allViews.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

export async function getRecentPageViews(minutes: number): Promise<PageView[]> {
  const store = getStore(VIEWS_STORE)
  const cutoff = new Date(Date.now() - minutes * 60 * 1000)
  // Only need today and possibly yesterday
  const keys = [todayKey()]
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  keys.push(yesterday.toISOString().split("T")[0])

  const allViews: PageView[] = []
  for (const key of keys) {
    try {
      const dayViews: PageView[] | null = await store.get(key, { type: "json" })
      if (dayViews && Array.isArray(dayViews)) {
        allViews.push(...dayViews.filter(v => new Date(v.created_at) >= cutoff))
      }
    } catch {
      // ignore
    }
  }
  return allViews
}

// ---- Analytics Events ----

export interface AnalyticsEvent {
  id: string
  event_type: string
  event_target: string
  event_data: Record<string, unknown>
  page_path: string
  session_id: string
  device_type: string
  browser: string
  country: string
  country_name: string
  city: string
  region: string
  is_bot: boolean
  bot_reason: string
  ip_address: string
  created_at: string
}

export async function addEvent(event: Omit<AnalyticsEvent, "id" | "created_at">): Promise<void> {
  const store = getStore({ name: EVENTS_STORE, consistency: "strong" })
  const day = todayKey()
  const existing: AnalyticsEvent[] = (await store.get(day, { type: "json" })) || []

  const isDuplicate = existing.some((current) => (
    current.event_type === event.event_type &&
    current.event_target === event.event_target &&
    current.page_path === event.page_path &&
    ((event.session_id && current.session_id === event.session_id) ||
      (event.ip_address && current.ip_address === event.ip_address)) &&
    isRecent(current.created_at, EVENT_DEDUP_WINDOW_MS)
  ))
  if (isDuplicate) return

  existing.push({ ...event, id: crypto.randomUUID(), created_at: new Date().toISOString() })
  await store.setJSON(day, existing)
}

export async function getEvents(days: number): Promise<AnalyticsEvent[]> {
  const store = getStore(EVENTS_STORE)
  const allEvents: AnalyticsEvent[] = []
  for (let i = 0; i < days; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().split("T")[0]
    try {
      const dayEvents: AnalyticsEvent[] | null = await store.get(key, { type: "json" })
      if (dayEvents && Array.isArray(dayEvents)) allEvents.push(...dayEvents)
    } catch {
      // ignore
    }
  }
  return allEvents.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

// ---- Abandoned Checkouts ----

export interface AbandonedCheckout {
  id: string
  session_id: string
  customer_name: string
  customer_phone: string
  customer_email: string
  items: unknown[]
  subtotal: number
  step_reached: string
  /**
   * Why the checkout did not complete. Richer than step_reached because it
   * answers "what happened?" instead of just "where did they stop?":
   *   - `payment_failed`        → tried to pay (card/M-PESA) and got a failure
   *   - `payment_abandoned`     → opened payment modal, never confirmed
   *   - `closed_with_items`     → added items but never reached checkout
   *   - `checkout_abandoned`    → on checkout page, closed before submitting
   *   - `stopped_midway`        → filled some details, walked away
   * Empty string means "unknown / not yet classified".
   */
  reason: string
  device_type: string
  browser: string
  recovered: boolean
  created_at: string
  updated_at: string
}

export async function upsertCheckout(sessionId: string, data: Partial<AbandonedCheckout>): Promise<void> {
  const store = getStore({ name: CHECKOUTS_STORE, consistency: "strong" })
  const existing: AbandonedCheckout | null = await store.get(sessionId, { type: "json" })
  if (existing) {
    await store.setJSON(sessionId, { ...existing, ...data, updated_at: new Date().toISOString() })
  } else {
    await store.setJSON(sessionId, {
      id: crypto.randomUUID(),
      session_id: sessionId,
      recovered: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...data,
    })
  }
}

export async function recoverCheckout(sessionId: string): Promise<void> {
  const store = getStore({ name: CHECKOUTS_STORE, consistency: "strong" })
  const existing: AbandonedCheckout | null = await store.get(sessionId, { type: "json" })
  if (existing) {
    await store.setJSON(sessionId, { ...existing, recovered: true, updated_at: new Date().toISOString() })
  }
}

export async function getAbandonedCheckouts(days: number): Promise<AbandonedCheckout[]> {
  const store = getStore(CHECKOUTS_STORE)
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)

  const allCheckouts: AbandonedCheckout[] = []
  const { blobs } = await store.list()
  for (const blob of blobs) {
    try {
      const checkout: AbandonedCheckout | null = await store.get(blob.key, { type: "json" })
      if (checkout && new Date(checkout.created_at) >= cutoff) {
        allCheckouts.push(checkout)
      }
    } catch {
      // ignore
    }
  }
  return allCheckouts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

// ---- Realtime Sessions ----

export async function touchSession(sessionId: string): Promise<void> {
  const store = getStore({ name: REALTIME_STORE, consistency: "strong" })
  await store.setJSON(sessionId, { ts: Date.now() })
}

export async function getActiveSessions(minutes: number = 5): Promise<number> {
  const store = getStore(REALTIME_STORE)
  const cutoff = Date.now() - minutes * 60 * 1000
  const { blobs } = await store.list()
  let count = 0
  for (const blob of blobs) {
    try {
      const data: { ts: number } | null = await store.get(blob.key, { type: "json" })
      if (data && data.ts >= cutoff) count++
    } catch {
      // ignore
    }
  }
  return count
}

// ---- Geo helpers ----

export interface GeoData {
  country: string
  countryName: string
  city: string
  region: string
  latitude: number
  longitude: number
  timezone: string
}

export function parseNetlifyGeo(headers: Headers): GeoData {
  const geo: GeoData = {
    country: "",
    countryName: "",
    city: "",
    region: "",
    latitude: 0,
    longitude: 0,
    timezone: "",
  }

  const nfGeo = headers.get("x-nf-geo")
  if (nfGeo) {
    try {
      const parsed = JSON.parse(nfGeo)
      geo.country = parsed?.country?.code || ""
      geo.countryName = parsed?.country?.name || ""
      geo.city = parsed?.city || ""
      geo.region = parsed?.subdivision?.name || ""
      geo.latitude = parsed?.latitude || 0
      geo.longitude = parsed?.longitude || 0
      geo.timezone = parsed?.timezone || ""
    } catch {
      // ignore
    }
  }

  if (!geo.country) {
    geo.country = headers.get("x-country") || headers.get("x-vercel-ip-country") || ""
  }

  return geo
}

export function getClientIP(headers: Headers): string {
  return (
    headers.get("x-nf-client-connection-ip") ||
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    ""
  )
}

// Country code to name map for dashboard display
const COUNTRY_NAMES: Record<string, string> = {
  AF: "Afghanistan", AL: "Albania", DZ: "Algeria", AO: "Angola", AR: "Argentina",
  AT: "Austria", AU: "Australia", BD: "Bangladesh", BE: "Belgium", BR: "Brazil",
  CA: "Canada", CH: "Switzerland", CL: "Chile", CM: "Cameroon", CN: "China",
  CO: "Colombia", CZ: "Czech Republic", DE: "Germany", DK: "Denmark", EG: "Egypt",
  ES: "Spain", ET: "Ethiopia", FI: "Finland", FR: "France", GB: "United Kingdom",
  GH: "Ghana", GR: "Greece", HK: "Hong Kong", HU: "Hungary", ID: "Indonesia",
  IE: "Ireland", IL: "Israel", IN: "India", IQ: "Iraq", IR: "Iran", IT: "Italy",
  JP: "Japan", KE: "Kenya", KR: "South Korea", KW: "Kuwait", LK: "Sri Lanka",
  MA: "Morocco", MX: "Mexico", MY: "Malaysia", NG: "Nigeria", NL: "Netherlands",
  NO: "Norway", NZ: "New Zealand", PE: "Peru", PH: "Philippines", PK: "Pakistan",
  PL: "Poland", PT: "Portugal", QA: "Qatar", RO: "Romania", RU: "Russia",
  RW: "Rwanda", SA: "Saudi Arabia", SE: "Sweden", SG: "Singapore", TH: "Thailand",
  TN: "Tunisia", TR: "Turkey", TW: "Taiwan", TZ: "Tanzania", UA: "Ukraine",
  UG: "Uganda", US: "United States", VN: "Vietnam", ZA: "South Africa", ZM: "Zambia",
  ZW: "Zimbabwe", AE: "UAE", BW: "Botswana", CD: "DR Congo", CI: "Ivory Coast",
  DJ: "Djibouti", ER: "Eritrea", GA: "Gabon", GM: "Gambia", GN: "Guinea",
  GQ: "Equatorial Guinea", LS: "Lesotho", LR: "Liberia", LY: "Libya", MG: "Madagascar",
  ML: "Mali", MU: "Mauritius", MW: "Malawi", MZ: "Mozambique", NA: "Namibia",
  NE: "Niger", SC: "Seychelles", SD: "Sudan", SL: "Sierra Leone", SN: "Senegal",
  SO: "Somalia", SS: "South Sudan", SZ: "Eswatini", TD: "Chad", TG: "Togo",
}

export function countryCodeToName(code: string): string {
  return COUNTRY_NAMES[code.toUpperCase()] || code
}
