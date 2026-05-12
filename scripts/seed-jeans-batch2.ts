import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
const supabase = createClient(supabaseUrl, supabaseKey)

const products = [
  {
    name: "Dark Indigo Raw Hem Skinny Jeans",
    slug: "dark-indigo-raw-hem-skinny-sz12",
    price: 800,
    description: "Sleek dark indigo skinny jeans with subtle distressed rips at the knees and a trendy raw-cut hem. High-waisted stretch denim that sculpts your silhouette. A go-to pair for date nights and casual outings.",
    images: ["https://hebbkx1anhila5yf.public.blob.vercel-storage.com/SnapInsta.to_631274538_18340114252212493_9127723058582707924_n-agfpOaV9q3NsWmSQntocbXq08U7f3e.jpg"],
    size: "12",
    condition: "thrift",
    categorySlug: "skinny-jeans",
  },
  {
    name: "Heavy Ripped Skinny Jeans",
    slug: "heavy-ripped-skinny-jeans-sz14",
    price: 800,
    description: "Bold statement-making skinny jeans covered in heavy distressed rips from thigh to shin. Dark indigo denim with a washed fade adds a rebellious edge to any outfit. High-waisted, ankle-length fit.",
    images: ["https://hebbkx1anhila5yf.public.blob.vercel-storage.com/SnapInsta.to_631975890_18340114261212493_944369402477700991_n-9ibeBPmKdxfc3I2zRZJkx44hAoHAx1.jpg"],
    size: "14",
    condition: "thrift",
    categorySlug: "skinny-jeans",
  },
  {
    name: "Knee-Ripped Dark Skinny Jeans",
    slug: "knee-ripped-dark-skinny-sz14",
    price: 800,
    description: "Classic dark indigo skinny jeans with stylish blown-out knee rips. The subtle fading around the thighs gives these a worn-in vintage feel. Stretchy and figure-flattering ankle-length cut.",
    images: ["https://hebbkx1anhila5yf.public.blob.vercel-storage.com/SnapInsta.to_632049947_18340114270212493_5089217272793621197_n-r4ICYMVA9AQU71UMBuMTAlC05i0vDs.jpg"],
    size: "14",
    condition: "thrift",
    categorySlug: "skinny-jeans",
  },
  {
    name: "Scatter-Distressed Straight Jeans",
    slug: "scatter-distressed-straight-sz14",
    price: 800,
    description: "Unique dark indigo straight-leg jeans with scattered mini-distress marks down both legs. A subtle, artistic take on ripped denim that is both edgy and wearable. Comfortable mid-rise with a relaxed ankle.",
    images: ["https://hebbkx1anhila5yf.public.blob.vercel-storage.com/SnapInsta.to_631489848_18340114279212493_661396256371324687_n-jgJ9NgHWdKFCbhQyOBDtK21rdrTnCl.jpg"],
    size: "14",
    condition: "thrift",
    categorySlug: "boyfriend-jeans",
  },
  {
    name: "Classic Denim Bermuda Shorts",
    slug: "classic-denim-bermuda-shorts",
    price: 800,
    description: "Clean medium blue denim bermuda shorts with a knee-length cut. Premium quality 'Denim Since 1959' heritage brand with star-stud detailing. Perfect for Nairobi's warm weather or a laid-back weekend look.",
    images: ["https://hebbkx1anhila5yf.public.blob.vercel-storage.com/SnapInsta.to_629571521_18339713992212493_8114152744370172163_n-Cy4im5HEf3XgTqaZ3RYpcrzSYFRJZw.jpg"],
    size: "16",
    condition: "thrift",
    categorySlug: "shorts",
  },
  {
    name: "Dark Distressed Skinny Jeans",
    slug: "dark-distressed-skinny-sz12",
    price: 800,
    description: "Head-turning dark indigo skinny jeans with heavy distressing across both thighs and knees. The deep washed fade and frayed raw hem scream street-style cool. High-waisted with stretchy denim for all-day comfort.",
    images: ["https://hebbkx1anhila5yf.public.blob.vercel-storage.com/SnapInsta.to_631722123_18340114288212493_7753704251199130486_n-8pA0Vp4uEfgGzxN4XqCVaF1c11YsUc.jpg"],
    size: "12",
    condition: "thrift",
    categorySlug: "skinny-jeans",
  },
]

async function seed() {
  console.log("Starting batch 2 product seed...")

  // Get all categories
  const { data: allCats } = await supabase.from("categories").select("id, slug, name")
  console.log("Available categories:", JSON.stringify(allCats?.map(c => c.slug), null, 2))

  // Build a map
  const catMap = new Map()
  for (const c of allCats || []) {
    catMap.set(c.slug, c.id)
  }

  // Create shorts category if it doesn't exist
  if (!catMap.has("shorts")) {
    const { data: newCat } = await supabase
      .from("categories")
      .insert({ name: "Shorts", slug: "shorts", is_active: true })
      .select()
      .single()
    if (newCat) {
      catMap.set("shorts", newCat.id)
      console.log("Created 'Shorts' category")
    }
  }

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

    const categoryId = catMap.get(p.categorySlug) || catMap.get("skinny-jeans")
    if (!categoryId) {
      console.error(`No category for "${p.name}" (${p.categorySlug})`)
      continue
    }

    // Insert product
    const { data: product, error: productError } = await supabase
      .from("products")
      .insert({
        name: p.name,
        slug: p.slug,
        price: p.price,
        description: p.description,
        category_id: categoryId,
        is_new: true,
        is_on_offer: false,
        offer_percentage: 0,
        in_stock: true,
        is_featured: false,
        condition: p.condition,
      })
      .select()
      .single()

    if (productError) {
      console.error(`Failed to insert "${p.name}":`, productError.message)
      continue
    }

    // Insert images
    await supabase.from("product_images").insert({
      product_id: product.id,
      url: p.images[0],
      alt_text: `${p.name} - Kallittos Fashions`,
      sort_order: 0,
    })

    // Insert size variation
    await supabase.from("product_variations").insert({
      product_id: product.id,
      label: "Size",
      value: p.size,
      extra_price: 0,
      in_stock: true,
    })

    console.log(`Created: "${p.name}" (Size ${p.size}, ${p.categorySlug}) - KSh ${p.price}`)
  }

  console.log("Done! Batch 2 seeded.")
}

seed()
