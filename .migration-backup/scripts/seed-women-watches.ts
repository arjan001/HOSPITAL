import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
const supabase = createClient(supabaseUrl, supabaseKey)

const products = [
  {
    name: "Poedagar Rose Gold Watch",
    slug: "poedagar-rose-gold-watch",
    price: 1500,
    original_price: 1800,
    description: "Elegant Poedagar rose gold watch with a white textured dial, day and date display. Comes in a premium gift box with international guarantee.",
    image: "/images/products/women-watches/poedagar-rose-gold-watch.jpeg",
    is_new: true,
    is_on_offer: true,
    offer_percentage: 17,
    featured: true,
  },
  {
    name: "Rose Gold Mini Chain Watch",
    slug: "rose-gold-mini-chain-watch",
    price: 850,
    original_price: 1000,
    description: "Petite rose gold watch with a rose gold dial and Roman numeral markers. Delicate chain link bracelet band for a feminine look.",
    image: "/images/products/women-watches/rose-gold-mini-chain-watch.jpeg",
    is_new: true,
    is_on_offer: true,
    offer_percentage: 15,
    featured: true,
  },
  {
    name: "Naviforce Rose Gold Floral Watch",
    slug: "naviforce-rose-gold-floral-watch",
    price: 850,
    original_price: 1000,
    description: "Beautiful Naviforce rose gold mesh band watch with 3D white floral dial design and crystal hour markers. A statement piece for any outfit.",
    image: "/images/products/women-watches/naviforce-rose-gold-floral-watch.jpeg",
    is_new: true,
    is_on_offer: true,
    offer_percentage: 15,
    featured: false,
  },
  {
    name: "Gold Flower Bracelet Watch",
    slug: "gold-flower-bracelet-watch",
    price: 550,
    original_price: 700,
    description: "Delicate gold-tone watch with a matching flower chain bracelet band and gold dial. A charming vintage-inspired timepiece.",
    image: "/images/products/women-watches/gold-flower-bracelet-watch.jpeg",
    is_new: false,
    is_on_offer: true,
    offer_percentage: 21,
    featured: false,
  },
  {
    name: "Gold Pearl Bracelet Watch",
    slug: "gold-pearl-bracelet-watch",
    price: 550,
    original_price: 700,
    description: "Elegant gold-tone watch with pearl-adorned bracelet band and white octagonal dial. A timeless accessory for special occasions.",
    image: "/images/products/women-watches/gold-pearl-bracelet-watch.jpeg",
    is_new: false,
    is_on_offer: true,
    offer_percentage: 21,
    featured: false,
  },
]

async function seed() {
  console.log("Starting Women's Watches product seed...")

  // Find the Women's Watches category
  const { data: allCats } = await supabase.from("categories").select("id, slug, name")
  console.log("Available categories:", JSON.stringify(allCats, null, 2))

  let category = allCats?.find(c => c.slug === "women-watches") || null

  if (!category) {
    // Create category if it doesn't exist
    const { data: newCat } = await supabase
      .from("categories")
      .insert({
        name: "Women's Watches",
        slug: "women-watches",
        description: "Elegant women's watches for every occasion",
        image_url: "/categories/women-watches.jpeg",
        sort_order: 5,
        is_active: true,
      })
      .select()
      .single()
    category = newCat
    console.log("Created 'Women's Watches' category")
  } else {
    // Update category image
    await supabase
      .from("categories")
      .update({ image_url: "/categories/women-watches.jpeg" })
      .eq("id", category.id)
    console.log("Updated Women's Watches category image")
  }

  if (!category) {
    console.error("Could not find or create category!")
    return
  }

  console.log(`Using category: ${category.name} (${category.id})`)

  // Get tag IDs for tagging
  const { data: tags } = await supabase.from("tags").select("id, slug")
  const tagMap = new Map(tags?.map(t => [t.slug, t.id]) || [])

  for (const p of products) {
    // Check if slug already exists
    const { data: existing } = await supabase
      .from("products")
      .select("id")
      .eq("slug", p.slug)
      .single()

    if (existing) {
      console.log(`Skipping "${p.name}" -- already exists`)
      continue
    }

    // Insert product
    const { data: product, error: productError } = await supabase
      .from("products")
      .insert({
        name: p.name,
        slug: p.slug,
        price: p.price,
        original_price: p.original_price,
        description: p.description,
        category_id: category.id,
        is_new: p.is_new,
        is_on_offer: p.is_on_offer,
        offer_percentage: p.offer_percentage,
        in_stock: true,
        featured: p.featured,
        collection: "women",
        gallery_images: [p.image],
      })
      .select()
      .single()

    if (productError) {
      console.error(`Failed to insert "${p.name}":`, productError.message)
      continue
    }

    // Insert primary image
    await supabase.from("product_images").insert({
      product_id: product.id,
      image_url: p.image,
      alt_text: p.name,
      sort_order: 0,
      is_primary: true,
    })

    // Tag products
    const productTags: string[] = ["everyday"]
    if (p.is_new) productTags.push("new-arrival")
    if (p.featured) productTags.push("best-seller")
    if (p.price >= 800) productTags.push("luxury")
    productTags.push("gold-plated")

    for (const tagSlug of productTags) {
      const tagId = tagMap.get(tagSlug)
      if (tagId) {
        await supabase.from("product_tags").insert({
          product_id: product.id,
          tag_id: tagId,
        }).then(({ error }) => {
          if (error) console.log(`Tag "${tagSlug}" skipped for "${p.name}"`)
        })
      }
    }

    console.log(`Created: "${p.name}" - KSh ${p.price}`)
  }

  console.log("Done! All Women's Watches products seeded.")
}

seed()
