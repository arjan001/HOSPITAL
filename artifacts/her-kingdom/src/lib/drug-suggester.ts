/**
 * Lightweight rule-based drug suggestion engine.
 *
 * Inputs:
 *   - free-text clinical notes (doctor's note, patient topic, pharmacist note)
 *   - product catalogue (so suggestions never leave the inventory we can dispense)
 *
 * Output: ranked candidate drugs with a short rationale the doctor can edit.
 *
 * Deliberately deterministic / explainable. Replaceable with a model
 * call later without touching the calling UI — same shape in, same shape out.
 */
import type { Product } from "./types"

export type SuggestedDrug = {
  name: string         // canonical product name (matches Product.name)
  productId?: string
  slug?: string
  reason: string       // human-readable rationale
  score: number        // 0..1 confidence
  category?: string
  price?: number
}

type Rule = {
  keywords: string[]
  drugs: string[]      // candidate substrings to match against Product.name
  reason: string
}

const RULES: Rule[] = [
  { keywords: ["headache", "migraine", "head ache"],
    drugs: ["paracetamol", "ibuprofen", "sumatriptan"],
    reason: "Headache / migraine — analgesic first line." },

  { keywords: ["fever", "temperature", "pyrexia"],
    drugs: ["paracetamol", "ibuprofen"],
    reason: "Fever — antipyretic." },

  { keywords: ["cough", "phlegm", "mucus", "bronch"],
    drugs: ["bromhexine", "dextromethorphan", "guaifenesin"],
    reason: "Cough / chest congestion — mucolytic or antitussive." },

  { keywords: ["cold", "flu", "blocked nose", "runny nose", "sinus"],
    drugs: ["paracetamol", "cetirizine", "phenylephrine", "pseudoephedrine"],
    reason: "Common cold / flu — symptomatic relief." },

  { keywords: ["allerg", "rash", "itch", "hives", "urticaria"],
    drugs: ["cetirizine", "loratadine", "chlorpheniramine"],
    reason: "Allergic reaction — antihistamine." },

  { keywords: ["bacterial", "infection", "uti", "chest infection", "tonsil", "throat infection", "sore throat"],
    drugs: ["amoxicillin", "azithromycin", "ciprofloxacin", "doxycycline"],
    reason: "Suspected bacterial infection — antibiotic (confirm sensitivity)." },

  { keywords: ["pain", "ache", "sprain", "back pain", "muscle"],
    drugs: ["ibuprofen", "diclofenac", "paracetamol"],
    reason: "Musculoskeletal pain — NSAID / analgesic." },

  { keywords: ["diarrhea", "diarrhoea", "loose stool", "stomach upset"],
    drugs: ["ors", "oral rehydration", "loperamide", "metronidazole", "zinc"],
    reason: "Diarrhoea — rehydration + symptomatic / antimicrobial as indicated." },

  { keywords: ["vomit", "nausea", "vomiting"],
    drugs: ["ondansetron", "metoclopramide", "promethazine"],
    reason: "Nausea / vomiting — antiemetic." },

  { keywords: ["hypertension", "high blood pressure", "high bp", "bp"],
    drugs: ["amlodipine", "losartan", "lisinopril", "hydrochlorothiazide"],
    reason: "Hypertension — antihypertensive maintenance." },

  { keywords: ["diabet", "sugar", "hyperglycemia", "hyperglycaemia"],
    drugs: ["metformin", "glimepiride", "insulin", "gliclazide"],
    reason: "Diabetes — glycaemic control." },

  { keywords: ["asthma", "wheez", "shortness of breath", "sob"],
    drugs: ["salbutamol", "budesonide", "ipratropium", "montelukast"],
    reason: "Asthma / wheeze — bronchodilator / inhaled steroid." },

  { keywords: ["acid", "reflux", "heartburn", "gerd", "ulcer", "gastritis"],
    drugs: ["omeprazole", "pantoprazole", "ranitidine", "antacid"],
    reason: "Acid reflux / gastritis — PPI / antacid." },

  { keywords: ["malaria"],
    drugs: ["artemether", "lumefantrine", "artesunate", "coartem"],
    reason: "Malaria — first-line ACT." },

  { keywords: ["worm", "deworm"],
    drugs: ["albendazole", "mebendazole"],
    reason: "Helminthic infection — antihelmintic." },

  { keywords: ["antibiotic"],
    drugs: ["amoxicillin", "azithromycin", "ciprofloxacin", "doxycycline", "metronidazole"],
    reason: "Empirical antibiotic — adjust to culture / sensitivity." },

  { keywords: ["contracept", "family planning"],
    drugs: ["microgynon", "postinor", "iud"],
    reason: "Family planning — discuss options." },
]

function tokenize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim()
}

/**
 * Returns up to `limit` ranked drug suggestions sourced from the product
 * catalogue, based on simple keyword matching against the clinical text.
 */
export function suggestDrugs(
  text: string,
  products: Product[],
  opts: { limit?: number } = {},
): SuggestedDrug[] {
  const limit = opts.limit ?? 5
  const t = tokenize(text)
  if (!t || products.length === 0) return []

  // Collect rule hits + the source rule weight per candidate substring.
  const hits = new Map<string, { reason: string; weight: number }>()
  for (const rule of RULES) {
    const matched = rule.keywords.some((k) => t.includes(k))
    if (!matched) continue
    for (const drug of rule.drugs) {
      const prev = hits.get(drug)
      hits.set(drug, {
        reason: prev?.reason ?? rule.reason,
        weight: (prev?.weight ?? 0) + 1,
      })
    }
  }
  if (hits.size === 0) return []

  // Resolve each candidate substring to the best-matching product (if any).
  const seen = new Set<string>()
  const out: SuggestedDrug[] = []
  for (const [needle, info] of hits) {
    const matches = products.filter((p) => p.name.toLowerCase().includes(needle))
    if (matches.length === 0) continue
    // Prefer in-stock & shortest name (typically the canonical SKU).
    matches.sort((a, b) => {
      const stockDiff = Number(b.inStock) - Number(a.inStock)
      if (stockDiff !== 0) return stockDiff
      return a.name.length - b.name.length
    })
    const p = matches[0]
    if (seen.has(p.id)) continue
    seen.add(p.id)
    out.push({
      name: p.name,
      productId: p.id,
      slug: p.slug,
      category: p.category,
      price: p.price,
      reason: info.reason,
      score: Math.min(1, info.weight / 2),
    })
  }
  return out.sort((a, b) => b.score - a.score).slice(0, limit)
}

/**
 * Free-text product search for the picker. Case-insensitive, matches on
 * name + tags + category. Pharmaceutical-only filter is best-effort and
 * relaxed if it would return nothing.
 */
export function searchProducts(query: string, products: Product[], limit = 8): Product[] {
  const q = query.trim().toLowerCase()
  if (!q) {
    // Empty query → no dump. Caller renders an "type to search" hint.
    return []
  }
  const scored = products
    .map((p) => {
      const name = p.name.toLowerCase()
      const tagHit = p.tags?.some((t) => t.toLowerCase().includes(q)) ? 1 : 0
      const catHit = p.category?.toLowerCase().includes(q) ? 1 : 0
      const nameStart = name.startsWith(q) ? 3 : 0
      const nameContains = name.includes(q) ? 2 : 0
      const score = nameStart + nameContains + tagHit + catHit
      return { p, score }
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.p.name.length - b.p.name.length)
  return scored.slice(0, limit).map((x) => x.p)
}
