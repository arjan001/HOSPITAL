/**
 * Allowlist-based HTML sanitizer.
 * Strips <script>, <style>, <iframe>, <object>, event handlers (onclick, onerror...),
 * javascript:/data: URLs, and any tag/attribute not explicitly allowed.
 *
 * Safe for server and client (no DOM dependency).
 * Use before passing admin-authored rich text to dangerouslySetInnerHTML.
 */

// Tags that are allowed in rendered rich text
const ALLOWED_TAGS = new Set([
  "a", "b", "blockquote", "br", "code", "div", "em", "figure", "figcaption",
  "h1", "h2", "h3", "h4", "h5", "h6", "hr", "i", "img", "li", "ol",
  "p", "pre", "s", "span", "strong", "sub", "sup", "table", "tbody", "td",
  "th", "thead", "tr", "u", "ul",
])

// Attributes allowed on every allowed tag
const GLOBAL_ATTRS = new Set(["class", "id", "style", "title"])

// Per-tag additional attributes
const TAG_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "target", "rel"]),
  img: new Set(["src", "alt", "width", "height", "loading"]),
  td: new Set(["colspan", "rowspan"]),
  th: new Set(["colspan", "rowspan", "scope"]),
}

// URL attributes to scrutinise for javascript:/data: schemes
const URL_ATTRS = new Set(["href", "src"])

// Self-closing / void tags
const VOID_TAGS = new Set(["br", "hr", "img"])

// Tags whose entire contents must be dropped
const DROP_CONTENT_TAGS = new Set(["script", "style", "iframe", "object", "embed", "noscript"])

function isSafeUrl(value: string): boolean {
  const v = value.trim().toLowerCase()
  if (!v) return false
  // Allow relative URLs, fragments, mailto, tel, http(s)
  if (v.startsWith("javascript:") || v.startsWith("vbscript:") || v.startsWith("data:")) return false
  return true
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

function escapeText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

function sanitizeStyle(style: string): string {
  // Drop expression(), url(javascript:..), @import, and any js-like content
  const cleaned = style
    .replace(/expression\s*\(/gi, "")
    .replace(/javascript\s*:/gi, "")
    .replace(/vbscript\s*:/gi, "")
    .replace(/@import/gi, "")
  return cleaned.slice(0, 500)
}

function parseAttributes(raw: string, tag: string): string {
  const attrs: string[] = []
  // Match name="value" | name='value' | name=value | name
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g
  let m: RegExpExecArray | null
  while ((m = re.exec(raw)) !== null) {
    const nameRaw = m[1]
    const name = nameRaw.toLowerCase()
    const value = (m[2] ?? m[3] ?? m[4] ?? "").trim()

    // Drop any on* event handler
    if (name.startsWith("on")) continue
    // Drop any attribute whose name begins with "javascript"
    if (/^(formaction|xlink:href|srcset)$/.test(name)) continue

    const allowed =
      GLOBAL_ATTRS.has(name) || (TAG_ATTRS[tag] && TAG_ATTRS[tag].has(name))
    if (!allowed) continue

    if (URL_ATTRS.has(name)) {
      if (!isSafeUrl(value)) continue
    }

    let cleanValue = value
    if (name === "style") cleanValue = sanitizeStyle(cleanValue)

    // Force rel="noopener noreferrer" on target=_blank anchors
    attrs.push(`${name}="${escapeAttr(cleanValue)}"`)
  }

  // Enforce rel/noopener on anchors with target=_blank
  if (tag === "a") {
    const hasTargetBlank = attrs.some((a) => /^target="_blank"$/i.test(a))
    const hasRel = attrs.some((a) => a.startsWith("rel="))
    if (hasTargetBlank && !hasRel) {
      attrs.push('rel="noopener noreferrer"')
    }
  }

  return attrs.length ? " " + attrs.join(" ") : ""
}

/**
 * Sanitize an HTML string for safe rendering via dangerouslySetInnerHTML.
 * Removes disallowed tags, event handlers, dangerous URL schemes, and
 * drops the contents of <script>/<style>/<iframe>/etc entirely.
 */
export function sanitizeHtml(dirty: string): string {
  if (typeof dirty !== "string" || !dirty) return ""

  let input = dirty
  // Strip HTML comments (can hide conditional comments / payloads)
  input = input.replace(/<!--[\s\S]*?-->/g, "")

  // Remove the whole <script>...</script>, <style>...</style>, <iframe>...</iframe>, etc.
  for (const t of DROP_CONTENT_TAGS) {
    const re = new RegExp(`<${t}\\b[^>]*>[\\s\\S]*?<\\/${t}>`, "gi")
    input = input.replace(re, "")
    // Also drop self-closing / unclosed forms
    input = input.replace(new RegExp(`<${t}\\b[^>]*>`, "gi"), "")
  }

  let output = ""
  const tagRe = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g
  let lastIndex = 0
  let m: RegExpExecArray | null

  while ((m = tagRe.exec(input)) !== null) {
    const [full, nameRaw, rest] = m
    const tag = nameRaw.toLowerCase()
    const isClosing = full.startsWith("</")

    // Append (escaped) text before this tag
    output += escapeText(input.slice(lastIndex, m.index))
    lastIndex = m.index + full.length

    if (!ALLOWED_TAGS.has(tag)) {
      // Drop the tag entirely (but keep any inner text in subsequent iterations)
      continue
    }

    if (isClosing) {
      if (VOID_TAGS.has(tag)) continue
      output += `</${tag}>`
    } else {
      const attrs = parseAttributes(rest, tag)
      if (VOID_TAGS.has(tag) || /\/\s*$/.test(rest)) {
        output += `<${tag}${attrs} />`
      } else {
        output += `<${tag}${attrs}>`
      }
    }
  }

  // Append trailing text
  output += escapeText(input.slice(lastIndex))

  return output
}

/** Strip ALL HTML -- returns plain text (for logs, previews, notifications). */
export function stripHtml(dirty: string, maxLength = 1000): string {
  if (typeof dirty !== "string") return ""
  return dirty
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength)
}
