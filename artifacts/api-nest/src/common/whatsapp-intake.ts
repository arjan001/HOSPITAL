/** Parse structured fields from a WhatsApp intake message (bot or free-form). */
export function parseWhatsAppIntakeText(text: string): {
  name?: string
  email?: string
  phone?: string
  ailment?: string
  service?: string
} {
  const out: Record<string, string> = {}
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([^:]+):\s*(.+)$/i)
    if (!m) continue
    const key = m[1].trim().toLowerCase().replace(/\s+/g, " ")
    out[key] = m[2].trim()
  }
  return {
    name: out.name || out["full name"],
    email: out.email,
    phone: out.phone || out.whatsapp || out["phone / whatsapp"],
    ailment: out.ailment || out["health issue"] || out.issue,
    service: out.service || out["service needed"] || out["service requested"],
  }
}

export type WhatsAppInboundMessage = {
  from: string
  type: string
  text?: string
  timestamp?: string
}

/** Extract inbound user messages from a Meta WhatsApp Cloud API webhook payload. */
export function extractWhatsAppInbound(body: unknown): WhatsAppInboundMessage[] {
  const out: WhatsAppInboundMessage[] = []
  const entries = (body as { entry?: unknown[] })?.entry
  if (!Array.isArray(entries)) return out
  for (const entry of entries) {
    const changes = (entry as { changes?: unknown[] })?.changes
    if (!Array.isArray(changes)) continue
    for (const change of changes) {
      const value = (change as { value?: { messages?: unknown[] } })?.value
      const messages = value?.messages
      if (!Array.isArray(messages)) continue
      for (const msg of messages) {
        const row = msg as {
          from?: string
          type?: string
          timestamp?: string
          text?: { body?: string }
        }
        if (!row.from) continue
        out.push({
          from: row.from,
          type: row.type ?? "text",
          text: row.text?.body,
          timestamp: row.timestamp,
        })
      }
    }
  }
  return out
}
