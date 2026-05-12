import { UAParser } from "ua-parser-js"

const BOT_UA_PATTERNS = /bot|crawl|spider|scraper|curl|wget|python|java|go-http|headless|phantom|puppeteer|selenium|playwright|preview|slurp|bingpreview|whatsapp|telegrambot|discordbot|linkedinbot|facebookexternalhit/i
const PREFETCH_HEADERS = ["purpose", "sec-purpose", "x-middleware-prefetch", "x-purpose", "x-prefetch"]

export interface TrafficClassification {
  isBot: boolean
  botReason: string
  browser: string
  deviceType: string
}

export function classifyTraffic(headers: Headers, clientBotHint: boolean): TrafficClassification {
  const userAgent = headers.get("user-agent") || ""
  const parser = new UAParser(userAgent)
  const browser = parser.getBrowser().name || "Unknown"
  const deviceType = parser.getDevice().type || "desktop"

  let score = 0
  const reasons: string[] = []

  if (!userAgent) {
    score += 3
    reasons.push("missing_user_agent")
  } else if (BOT_UA_PATTERNS.test(userAgent)) {
    score += 3
    reasons.push("bot_user_agent")
  }

  for (const key of PREFETCH_HEADERS) {
    const value = (headers.get(key) || "").toLowerCase()
    if (value.includes("prefetch") || value.includes("preview") || value.includes("prerender")) {
      score += 2
      reasons.push("prefetch_request")
      break
    }
  }

  const secFetchMode = (headers.get("sec-fetch-mode") || "").toLowerCase()
  const secFetchDest = (headers.get("sec-fetch-dest") || "").toLowerCase()
  const accept = (headers.get("accept") || "").toLowerCase()
  if (secFetchMode && secFetchMode !== "navigate" && secFetchDest !== "document" && !accept.includes("text/html")) {
    score += 1
    reasons.push("non_document_fetch")
  }

  if (clientBotHint) {
    score += 2
    reasons.push("client_bot_signal")
  }

  const isBot = score >= 3
  return {
    isBot,
    botReason: isBot ? reasons.join(",") || "classified_bot" : "human",
    browser,
    deviceType,
  }
}
