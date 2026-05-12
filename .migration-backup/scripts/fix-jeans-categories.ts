import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
)

// Map product slugs to their correct category slugs
const categoryMap = {
  "dark-blue-straight-leg-jeans-sz18": "boyfriend-jeans",       // straight-leg relaxed
  "distressed-light-blue-mom-jeans-sz18": "mom-jeans",          // mom jeans
  "dark-indigo-straight-leg-work-jeans-sz16": "rugged-jeans",   // paint splatter workwear
  "black-ripped-skinny-jeans-sz8": "skinny-jeans",              // skinny
  "hm-medium-blue-mom-jeans-sz16": "mom-jeans",                 // mom jeans
  "classic-dark-indigo-straight-jeans-sz16": "boyfriend-jeans", // straight classic
  "light-blue-distressed-skinny-jeans-sz16": "skinny-jeans",    // skinny
  "dark-denim-ripped-mom-jeans-sz14": "mom-jeans",              // mom jeans
  "black-high-waisted-skinny-jeans-sz12": "skinny-jeans",       // skinny
  "medium-blue-relaxed-straight-jeans-sz18": "baggy-jeans",     // relaxed/baggy
}

async function fix() {
  const { data: categories } = await supabase.from("categories").select("id, slug")
  const catLookup = Object.fromEntries((categories || []).map(c => [c.slug, c.id]))

  for (const [productSlug, catSlug] of Object.entries(categoryMap)) {
    const catId = catLookup[catSlug]
    if (!catId) { console.log(`Category ${catSlug} not found`); continue }

    const { error } = await supabase
      .from("products")
      .update({ category_id: catId })
      .eq("slug", productSlug)

    if (error) console.error(`Failed ${productSlug}:`, error.message)
    else console.log(`${productSlug} -> ${catSlug}`)
  }
  console.log("Done!")
}
fix()
