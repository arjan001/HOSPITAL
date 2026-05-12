import { Router } from "express"
import { createAdminClient } from "../../lib/supabase.js"

const router = Router()

const STATIC_POLICIES: Record<string, { title: string; content: string }> = {
  "privacy-policy": {
    title: "Privacy Policy",
    content: "<p>Our full privacy policy is being loaded. Please check back shortly or contact support@shaniid.co.ke.</p>",
  },
  "terms-of-service": {
    title: "Terms of Service",
    content: "<p>Our terms of service are being loaded. Please check back shortly or contact support@shaniid.co.ke.</p>",
  },
  "refund-policy": {
    title: "Refund Policy",
    content: "<p>We accept returns within 7 days for sealed, unopened items. Please contact support@shaniid.co.ke to initiate a return.</p>",
  },
  "payments-policy": {
    title: "Payments Policy",
    content: "<p>We accept M-PESA, Visa, Mastercard, and Equity Bank payments. All transactions are encrypted and secure.</p>",
  },
}

function isSupabaseMissing(err: unknown): boolean {
  return err instanceof Error && /Missing Supabase/i.test(err.message)
}

router.get("/", async (_req, res) => {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.from("policies").select("*").order("title")
    if (error) return res.json([])
    res.json(data ?? [])
  } catch (err) {
    if (isSupabaseMissing(err)) return res.json([])
    console.error("[api/policies] exception:", err)
    res.json([])
  }
})

router.get("/:slug", async (req, res) => {
  const { slug } = req.params
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("policies")
      .select("*")
      .eq("slug", slug)
      .maybeSingle()
    if (error) {
      const fallback = STATIC_POLICIES[slug]
      if (fallback) return res.json({ slug, ...fallback })
      return res.status(404).json({ error: "Policy not found" })
    }
    if (!data) {
      const fallback = STATIC_POLICIES[slug]
      if (fallback) return res.json({ slug, ...fallback })
      return res.status(404).json({ error: "Policy not found" })
    }
    res.json(data)
  } catch (err) {
    if (isSupabaseMissing(err)) {
      const fallback = STATIC_POLICIES[slug]
      if (fallback) return res.json({ slug, ...fallback })
      return res.status(404).json({ error: "Policy not found" })
    }
    console.error("[api/policies] exception:", err)
    res.status(500).json({ error: "Server error" })
  }
})

export default router
