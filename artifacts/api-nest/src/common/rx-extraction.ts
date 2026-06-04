/**
 * Prescription OCR / medication extraction (order capture automation).
 *
 * Pipeline:
 *   1. Read bytes from storage (image/jpeg/png/webp or PDF).
 *   2. Prefer OpenAI vision when OPENAI_API_KEY is set.
 *   3. Else PDF text via pdf-parse + Tesseract for images.
 *   4. Parse medication lines from text with pharmacy-oriented heuristics.
 *
 * Env:
 *   OPENAI_API_KEY          — enables gpt-4o-mini vision / text extraction
 *   RX_EXTRACTION_DISABLED  — set to "1" / "true" to skip all automation
 */
import type { ExtractedDrug } from "@workspace/db"

export type RxExtractionResult = {
  drugs: ExtractedDrug[]
  rawText?: string
  summary?: string
  provider: "openai" | "tesseract" | "pdf-text" | "none"
}

const RX_EXTRACTION_DISABLED =
  /^(1|true|yes)$/i.test(String(process.env.RX_EXTRACTION_DISABLED ?? "").trim())

export function isRxExtractionEnabled(): boolean {
  return !RX_EXTRACTION_DISABLED
}

const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
])

const OPENAI_MODEL = String(process.env.OPENAI_RX_MODEL ?? "gpt-4o-mini").trim()

const EXTRACTION_PROMPT = `You are a licensed-pharmacy assistant reading a prescription scan for a Kenyan pharmacy (Shaniid RX).
Extract every medication line you can read clearly from the document.

Return ONLY valid JSON with this shape:
{
  "drugs": [
    {
      "name": "generic or brand drug name",
      "dosage": "strength e.g. 500mg",
      "instructions": "sig e.g. 1 tab BD after meals",
      "quantity": 1,
      "confidence": 0.0
    }
  ],
  "summary": "one sentence on legibility",
  "patientHint": "patient name if visible or empty string"
}

Rules:
- Include only medicines, not clinic headers, addresses, or lab tests unless clearly prescribed.
- quantity is integer packs/units if stated, else 1.
- confidence is 0-1 for how sure you are about that line.
- If nothing is legible, return { "drugs": [], "summary": "reason" }.`

/** Heuristic parser for OCR/plain-text output when no vision API is configured. */
export function parseMedicationsFromText(text: string): ExtractedDrug[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l.length >= 4 && l.length <= 160)

  const doseRe =
    /\d+\s*(?:mg|mcg|g|ml|iu|%)\b|\b(?:tab|tabs|cap|caps|tablet|capsule|inj|syrup|susp)\b|\b(?:BD|TDS|OD|QDS|PRN|mane|nocte)\b/i
  const skipRe =
    /^(rx\b|prescription|date|dr\.?|doctor|patient|name|tel|phone|signature|stamp|hospital|clinic|address|age|sex|weight|diagnosis|notes?:)/i

  const out: ExtractedDrug[] = []
  for (const line of lines) {
    if (skipRe.test(line)) continue
    if (!doseRe.test(line)) continue
    const cleaned = line.replace(/^\d+[\.\)\-]\s*/, "").trim()
    const nameMatch = cleaned.match(
      /^([A-Za-z][A-Za-z0-9\s\-\/\+]{2,60}?)(?:\s+\d|\s+\b(?:tab|cap))/i,
    )
    const name = (nameMatch?.[1] ?? cleaned.split(/\s{2,}/)[0] ?? cleaned).trim().slice(0, 80)
    if (name.length < 3) continue
    const dosageMatch = cleaned.match(
      /\d+\s*(?:mg|mcg|g|ml|iu|%)\b(?:\s*\/\s*\d+\s*(?:mg|mcg|g|ml))?/i,
    )
    out.push({
      name,
      dosage: dosageMatch?.[0] ?? "",
      instructions: cleaned.length > name.length + 2 ? cleaned : "",
      quantity: 1,
      confidence: 0.55,
    })
  }
  return dedupeDrugs(out).slice(0, 25)
}

function dedupeDrugs(drugs: ExtractedDrug[]): ExtractedDrug[] {
  const seen = new Set<string>()
  const result: ExtractedDrug[] = []
  for (const d of drugs) {
    const key = d.name.toLowerCase().replace(/\s+/g, " ")
    if (seen.has(key)) continue
    seen.add(key)
    result.push(d)
  }
  return result
}

function normalizeDrugs(raw: unknown): ExtractedDrug[] {
  if (!raw || typeof raw !== "object") return []
  const drugs = (raw as { drugs?: unknown }).drugs
  if (!Array.isArray(drugs)) return []
  const out: ExtractedDrug[] = []
  for (const row of drugs) {
    if (!row || typeof row !== "object") continue
    const name = String((row as { name?: string }).name ?? "").trim()
    if (name.length < 2) continue
    const qty = Number((row as { quantity?: number }).quantity)
    const conf = Number((row as { confidence?: number }).confidence)
    out.push({
      name: name.slice(0, 120),
      dosage: String((row as { dosage?: string }).dosage ?? "").trim().slice(0, 80),
      instructions: String((row as { instructions?: string }).instructions ?? "")
        .trim()
        .slice(0, 200),
      quantity: Number.isFinite(qty) && qty >= 1 ? Math.round(qty) : 1,
      confidence:
        Number.isFinite(conf) && conf >= 0 && conf <= 1 ? conf : undefined,
    })
  }
  return dedupeDrugs(out)
}

async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const mod = await import("pdf-parse")
  const pdfParse = (mod as { default?: (b: Buffer) => Promise<{ text: string }> }).default
  if (!pdfParse) return ""
  const data = await pdfParse(buffer)
  return String(data.text ?? "").trim()
}

async function extractTextFromImage(buffer: Buffer): Promise<string> {
  try {
    const { createWorker } = await import("tesseract.js")
    const worker = await createWorker("eng")
    try {
      const { data } = await worker.recognize(buffer)
      return String(data.text ?? "").trim()
    } finally {
      await worker.terminate()
    }
  } catch (err) {
    console.warn(
      "[rx-extraction] Tesseract unavailable:",
      err instanceof Error ? err.message : err,
    )
    return ""
  }
}

async function extractWithOpenAI(
  buffer: Buffer,
  contentType: string,
  plainText?: string,
): Promise<RxExtractionResult | null> {
  const key = String(process.env.OPENAI_API_KEY ?? "").trim()
  if (!key) return null

  const userContent: Array<Record<string, unknown>> = [
    { type: "text", text: EXTRACTION_PROMPT },
  ]
  if (plainText && plainText.length > 20) {
    userContent.push({
      type: "text",
      text: `Document text (OCR):\n${plainText.slice(0, 12000)}`,
    })
  } else if (IMAGE_TYPES.has(contentType)) {
    const b64 = buffer.toString("base64")
    userContent.push({
      type: "image_url",
      image_url: { url: `data:${contentType};base64,${b64}` },
    })
  } else {
    return null
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: userContent }],
    }),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => "")
    throw new Error(`OpenAI ${res.status}: ${errText.slice(0, 200)}`)
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const content = json.choices?.[0]?.message?.content ?? "{}"
  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch {
    parsed = { drugs: [] }
  }
  const drugs = normalizeDrugs(parsed)
  const summary =
    typeof (parsed as { summary?: string }).summary === "string"
      ? (parsed as { summary: string }).summary
      : drugs.length > 0
        ? `${drugs.length} medication line(s) extracted`
        : "No medications detected"

  return {
    drugs,
    rawText: plainText,
    summary,
    provider: "openai",
  }
}

/**
 * Run extraction on one prescription attachment.
 */
export async function extractMedicationsFromBuffer(
  buffer: Buffer,
  contentType: string,
): Promise<RxExtractionResult> {
  if (!isRxExtractionEnabled()) {
    return { drugs: [], summary: "Extraction disabled", provider: "none" }
  }

  let plainText = ""
  let provider: RxExtractionResult["provider"] = "none"

  if (contentType === "application/pdf") {
    plainText = await extractTextFromPdf(buffer)
    provider = "pdf-text"
  } else if (IMAGE_TYPES.has(contentType)) {
    plainText = await extractTextFromImage(buffer)
    provider = "tesseract"
  } else {
    return { drugs: [], summary: "Unsupported file type for extraction", provider: "none" }
  }

  try {
    const ai = await extractWithOpenAI(buffer, contentType, plainText)
    if (ai && ai.drugs.length > 0) return ai
    if (ai && ai.summary) {
      const heuristic = parseMedicationsFromText(plainText)
      if (heuristic.length > 0) {
        return {
          drugs: heuristic,
          rawText: plainText.slice(0, 4000),
          summary: ai.summary,
          provider,
        }
      }
      return ai
    }
  } catch (err) {
    console.warn(
      "[rx-extraction] OpenAI failed, using heuristics:",
      err instanceof Error ? err.message : err,
    )
  }

  const drugs = parseMedicationsFromText(plainText)
  return {
    drugs,
    rawText: plainText.slice(0, 4000),
    summary:
      drugs.length > 0
        ? `${drugs.length} medication line(s) parsed from scan (${provider})`
        : plainText.length > 30
          ? "Scan read but no medication lines detected — pharmacist review required"
          : "Could not read text from scan",
    provider,
  }
}
