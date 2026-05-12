import { Router } from "express"
import { createClient } from "../../lib/supabase.js"

const router = Router()
const VALID_CATEGORIES = new Set(["addon", "gift_wrap", "greeting_card"])

router.get("/", async (req, res) => {
  const supabase = createClient()
  const category = req.query.category as string | undefined

  let query = supabase
    .from("gift_items")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })

  if (category && VALID_CATEGORIES.has(category)) {
    query = query.eq("category", category)
  }

  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })

  const items = (data || []).map((row) => ({
    id: row.id as string,
    category: row.category as string,
    name: row.name as string,
    description: (row.description as string) || "",
    price: Number(row.price) || 0,
    imageUrl: (row.image_url as string) || "",
    isActive: row.is_active as boolean,
    sortOrder: (row.sort_order as number) || 0,
  }))

  res.json(items)
})

export default router
