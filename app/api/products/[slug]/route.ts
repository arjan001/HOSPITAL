import { NextResponse } from "next/server"
import { getProductBySlug, getProducts } from "@/lib/supabase-data"

// Score how similar two product names are by shared keywords
function nameSimilarity(a: string, b: string): number {
  const stopWords = new Set(["the", "a", "an", "for", "and", "or", "in", "of", "to", "with"])
  const wordsA = a.toLowerCase().split(/[\s\-_]+/).filter((w) => w.length > 2 && !stopWords.has(w))
  const wordsB = b.toLowerCase().split(/[\s\-_]+/).filter((w) => w.length > 2 && !stopWords.has(w))
  let score = 0
  for (const wa of wordsA) {
    for (const wb of wordsB) {
      if (wa === wb) score += 3
      else if (wa.includes(wb) || wb.includes(wa)) score += 1
    }
  }
  return score
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const product = await getProductBySlug(slug)

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    // Fetch all products for related recommendations
    const allProducts = await getProducts()
    const others = allProducts.filter((p) => p.id !== product.id)

    // Score each product by: same category (+5), name similarity, shared tags
    const productTagSet = new Set(product.tags.map((t) => t.toLowerCase()))
    const scored = others.map((p) => {
      let score = 0
      // Same category boost
      if (p.categorySlug === product.categorySlug) score += 5
      // Name similarity
      score += nameSimilarity(product.name, p.name)
      // Shared tags
      const tagOverlap = p.tags.filter((t) => productTagSet.has(t.toLowerCase())).length
      score += tagOverlap * 2
      return { ...p, _score: score }
    })

    // Sort by score descending, take top 8
    const related = scored
      .sort((a, b) => b._score - a._score)
      .slice(0, 8)
      .map(({ _score, ...p }) => p)

    return NextResponse.json({ product, related })
  } catch (error) {
    console.error("Failed to fetch product:", error)
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 })
  }
}
