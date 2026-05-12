import { Router } from "express"
import { getProducts, getProductBySlug } from "../../lib/supabase-data.js"

const router = Router()

router.get("/", async (_req, res) => {
  try {
    const products = await getProducts()
    res.json(products)
  } catch (error) {
    console.error("Failed to fetch products:", error)
    res.status(500).json({ error: "Failed to fetch products" })
  }
})

router.get("/:slug", async (req, res) => {
  try {
    const product = await getProductBySlug(req.params.slug)
    if (!product) return res.status(404).json({ error: "Product not found" })
    const all = await getProducts()
    const related = all
      .filter((p) => p.id !== product.id && (p.categorySlug === product.categorySlug || p.collection === product.collection))
      .slice(0, 8)
    res.json({ product, related })
  } catch (error) {
    console.error("Failed to fetch product:", error)
    res.status(500).json({ error: "Failed to fetch product" })
  }
})

export default router
