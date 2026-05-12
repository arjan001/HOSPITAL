import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
const supabase = createClient(supabaseUrl, supabaseKey)

const products = [
  {
    name: "Dark Blue Straight-Leg Jeans",
    slug: "dark-blue-straight-leg-jeans-sz18",
    price: 800,
    description: "Classic dark blue straight-leg jeans with a clean finish. No distressing, just timeless denim that pairs with everything. Relaxed fit with a slightly tapered ankle. Perfect for everyday wear.",
    images: ["https://hebbkx1anhila5yf.public.blob.vercel-storage.com/SnapInsta.to_629822741_18339332764212493_3703412237387874899_n-ZWmZtJSBV7QAHB4xQ4v4TLz5XSxI0c.jpg"],
    size: "18",
    condition: "thrift",
  },
  {
    name: "Distressed Light Blue Mom Jeans",
    slug: "distressed-light-blue-mom-jeans-sz18",
    price: 800,
    description: "Head-turning distressed mom jeans in a faded light blue wash. Bold rip details across both legs give these an effortless streetwear edge. Relaxed baggy fit sits comfortably at the waist.",
    images: ["https://hebbkx1anhila5yf.public.blob.vercel-storage.com/SnapInsta.to_628449452_18339332722212493_9211646819391949461_n-JybFmoXR2rXZ0FNesnTyoBofkF8zav.jpg"],
    size: "18",
    condition: "thrift",
  },
  {
    name: "Dark Indigo Straight-Leg Work Jeans",
    slug: "dark-indigo-straight-leg-work-jeans-sz16",
    price: 800,
    description: "Rugged dark indigo straight-leg jeans with authentic paint-splatter detailing. A workwear classic with a bootcut silhouette that sits perfectly over boots or sneakers. Durable heavyweight denim.",
    images: ["https://hebbkx1anhila5yf.public.blob.vercel-storage.com/SnapInsta.to_629480285_18339332740212493_4531324084440404917_n-0RVQgoIzmFf1EzE79VYMVG1BQ8aAWA.jpg"],
    size: "16",
    condition: "thrift",
  },
  {
    name: "Black Ripped Skinny Jeans",
    slug: "black-ripped-skinny-jeans-sz8",
    price: 800,
    description: "Sleek black high-waisted skinny jeans with strategic knee rips for a bold, edgy look. Figure-hugging stretch denim that flatters every curve. Ankle-length cut pairs perfectly with heels or boots.",
    images: ["https://hebbkx1anhila5yf.public.blob.vercel-storage.com/SnapInsta.to_629462952_18339365848212493_2925608112926900403_n-dLV3N2W8cyDosL6BFJ2167JIc3mAEV.jpg"],
    size: "8",
    condition: "thrift",
  },
  {
    name: "H&M Medium Blue Mom Jeans",
    slug: "hm-medium-blue-mom-jeans-sz16",
    price: 800,
    description: "Clean medium blue mom jeans by H&M with a relaxed tapered fit. No distressing -- just smooth, quality denim with a vintage-inspired wash. High-waisted for a flattering silhouette.",
    images: ["https://hebbkx1anhila5yf.public.blob.vercel-storage.com/SnapInsta.to_629396218_18339332785212493_6104919269453315951_n-O2UluA5Wn75valYKyz4NSf1bbFWUyG.jpg"],
    size: "16",
    condition: "thrift",
  },
  {
    name: "Classic Dark Indigo Straight Jeans",
    slug: "classic-dark-indigo-straight-jeans-sz16",
    price: 800,
    description: "Versatile dark indigo straight-leg jeans with a medium wash fade. Clean lines, no rips -- a wardrobe staple that dresses up or down. Traditional five-pocket styling with sturdy construction.",
    images: ["https://hebbkx1anhila5yf.public.blob.vercel-storage.com/SnapInsta.to_625045519_18339332812212493_4484763685591150878_n-iJI3n8v8zBibnoG2m4tkhU25pNUJP0.jpg"],
    size: "16",
    condition: "thrift",
  },
  {
    name: "Light Blue Distressed Skinny Jeans",
    slug: "light-blue-distressed-skinny-jeans-sz16",
    price: 800,
    description: "Trendy light blue high-waisted skinny jeans with distressed knee detailing. Stretchy denim hugs your curves while the ripped accents add personality. Cropped ankle length for a modern finish.",
    images: ["https://hebbkx1anhila5yf.public.blob.vercel-storage.com/SnapInsta.to_628420990_18339365845212493_7791669661132948879_n-gOeO3zihxp7KoaauKfaYlam4axJ9C8.jpg"],
    size: "16",
    condition: "thrift",
  },
  {
    name: "Dark Denim Ripped Mom Jeans",
    slug: "dark-denim-ripped-mom-jeans-sz14",
    price: 800,
    description: "Dark indigo high-waisted mom jeans with subtle distressed knee rips. Cropped length with a relaxed fit through the hip and thigh. The perfect blend of vintage charm and modern edge.",
    images: ["https://hebbkx1anhila5yf.public.blob.vercel-storage.com/SnapInsta.to_629519660_18339365821212493_1587589557172842169_n-RiRoLqQnZDWwe9B637rHdI8icDDSpQ.jpg"],
    size: "14",
    condition: "thrift",
  },
  {
    name: "Black High-Waisted Skinny Jeans",
    slug: "black-high-waisted-skinny-jeans-sz12",
    price: 800,
    description: "Jet black high-waisted skinny jeans with a smooth, clean finish. No distressing -- just sleek, form-fitting denim that goes with absolutely everything. Stretch fabric for all-day comfort.",
    images: ["https://hebbkx1anhila5yf.public.blob.vercel-storage.com/SnapInsta.to_628435484_18339365833212493_3306881259937597579_n-QuUdYQibswqqtVr3Gr5qxAz0EWAfmo.jpg"],
    size: "12",
    condition: "thrift",
  },
  {
    name: "Medium Blue Relaxed Straight Jeans",
    slug: "medium-blue-relaxed-straight-jeans-sz18",
    price: 800,
    description: "Laid-back medium blue relaxed straight-leg jeans with a classic vintage wash. Roomy fit through the leg with a comfortable rise. Ideal for casual days when you want effortless style.",
    images: ["https://hebbkx1anhila5yf.public.blob.vercel-storage.com/SnapInsta.to_628320616_18339332689212493_2192464309518118405_n-x7dy1PyJ6iFncZyAS2FsEDrcPQMWAm.jpg"],
    size: "18",
    condition: "thrift",
  },
]

async function seed() {
  console.log("Starting product seed...")

  // List all categories
  const { data: allCats } = await supabase.from("categories").select("id, slug, name")
  console.log("Available categories:", JSON.stringify(allCats, null, 2))

  // Try jeans, then denim, then first available
  let category = allCats?.find(c => c.slug === "jeans") 
    || allCats?.find(c => c.slug === "denim")
    || allCats?.find(c => c.slug?.includes("jean"))
    || null

  if (!category && allCats && allCats.length > 0) {
    // Create jeans category
    const { data: newCat } = await supabase
      .from("categories")
      .insert({ name: "Jeans", slug: "jeans", is_active: true })
      .select()
      .single()
    category = newCat
    console.log("Created 'Jeans' category")
  }

  if (!category) {
    console.error("Could not find or create category!")
    return
  }

  console.log(`Using category: ${category.name} (${category.id})`)

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
        description: p.description,
        category_id: category.id,
        is_new: false,
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
    const imageRows = p.images.map((url, i) => ({
      product_id: product.id,
      url,
      alt_text: `${p.name} - Image ${i + 1}`,
      sort_order: i,
    }))
    await supabase.from("product_images").insert(imageRows)

    // Insert size variation
    await supabase.from("product_variations").insert({
      product_id: product.id,
      label: "Size",
      value: p.size,
      extra_price: 0,
      in_stock: true,
    })

    console.log(`Created: "${p.name}" (Size ${p.size}) - KSh ${p.price}`)
  }

  console.log("Done! All 10 products seeded.")
}

seed()
