import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
const supabase = createClient(supabaseUrl, supabaseKey)

interface DressProduct {
  name: string
  slug: string
  price: number
  original_price: number
  description: string
  images: string[]
  sizes: string[]
  tags: string[]
  is_new: boolean
  is_on_offer: boolean
  offer_percentage: number
  featured: boolean
}

const products: DressProduct[] = [
  {
    name: "Pink Button-Front Belted Midi Dress",
    slug: "pink-button-front-belted-midi-dress",
    price: 850,
    original_price: 950,
    description:
      "Effortlessly feminine pink midi dress with a flattering V-neckline and delicate button detailing down the front. The self-tie waist belt cinches beautifully while the long balloon sleeves add a romantic flair. Soft ribbed fabric drapes gracefully for an elegant silhouette.",
    images: ["/images/products/dresses/pink-button-midi-dress.jpg"],
    sizes: ["S", "M", "L", "XL"],
    tags: ["thrift", "new-arrival", "in-stock", "on-offer", "casual", "office-wear"],
    is_new: true,
    is_on_offer: true,
    offer_percentage: 11,
    featured: true,
  },
  {
    name: "Yellow Sunflower Halterneck Bodycon Dress",
    slug: "yellow-sunflower-halterneck-bodycon-dress",
    price: 750,
    original_price: 0,
    description:
      "Turn heads in this stunning yellow sunflower print bodycon dress. The halterneck design frames the shoulders beautifully while the body-hugging silhouette celebrates every curve. A vibrant showstopper for brunches and summer outings.",
    images: ["/images/products/dresses/yellow-sunflower-bodycon-dress.jpg"],
    sizes: ["S", "M", "L"],
    tags: ["thrift", "new-arrival", "in-stock", "party-wear", "statement-piece"],
    is_new: true,
    is_on_offer: false,
    offer_percentage: 0,
    featured: true,
  },
  {
    name: "Dark Floral Ruffle-Collar Midi Dress",
    slug: "dark-floral-ruffle-collar-midi-dress",
    price: 800,
    original_price: 900,
    description:
      "Charming dark floral midi dress with a romantic ruffle collar and three-quarter sleeves. The cinched waist creates an hourglass shape while the flared skirt moves freely with every step. A timeless print that transitions effortlessly from day to evening.",
    images: ["/images/products/dresses/dark-floral-ruffle-midi-dress.jpg"],
    sizes: ["S", "M", "L", "XL"],
    tags: ["thrift", "new-arrival", "in-stock", "on-offer", "casual", "vintage"],
    is_new: true,
    is_on_offer: true,
    offer_percentage: 11,
    featured: false,
  },
  {
    name: "Blue Polka Dot Tiered Midi Dress",
    slug: "blue-polka-dot-tiered-midi-dress",
    price: 700,
    original_price: 0,
    description:
      "Fresh and playful blue midi dress covered in cheerful white polka dots. Features a relaxed scoop neckline and short flutter sleeves with a tiered flowing skirt. Cinch the waist with the included tan leather belt for a pulled-together look.",
    images: ["/images/products/dresses/blue-polka-dot-midi-dress.jpg"],
    sizes: ["S", "M", "L", "XL"],
    tags: ["thrift", "new-arrival", "in-stock", "casual"],
    is_new: true,
    is_on_offer: false,
    offer_percentage: 0,
    featured: false,
  },
  {
    name: "Beige Wrap Midi Dress",
    slug: "beige-wrap-midi-dress",
    price: 750,
    original_price: 0,
    description:
      "Understated elegance meets everyday comfort in this beige wrap midi dress. The crossover V-neckline and cap sleeves create a clean minimalist look while the wrap silhouette flatters every body type. Pair with sandals for brunch or heels for the office.",
    images: ["/images/products/dresses/beige-wrap-midi-dress.jpg"],
    sizes: ["S", "M", "L", "XL"],
    tags: ["thrift", "new-arrival", "in-stock", "casual", "office-wear"],
    is_new: true,
    is_on_offer: false,
    offer_percentage: 0,
    featured: false,
  },
  {
    name: "Lilac Cap-Sleeve Midi Dress",
    slug: "lilac-cap-sleeve-midi-dress",
    price: 700,
    original_price: 0,
    description:
      "Dreamy lilac midi dress with a softly gathered neckline and relaxed cap sleeves. The lightweight fabric falls beautifully to mid-calf while the included belt adds shape and definition. A pastel dream for garden parties and weekend strolls.",
    images: ["/images/products/dresses/lilac-cap-sleeve-midi-dress.jpg"],
    sizes: ["S", "M", "L", "XL"],
    tags: ["thrift", "new-arrival", "in-stock", "casual"],
    is_new: true,
    is_on_offer: false,
    offer_percentage: 0,
    featured: false,
  },
  {
    name: "Black Sculpted Bodycon Mini Dress",
    slug: "black-sculpted-bodycon-mini-dress",
    price: 650,
    original_price: 800,
    description:
      "The ultimate little black dress reinvented. This sleek bodycon mini features structured cap sleeves and a high mock neckline for a bold and confident look. Thick stretch fabric smooths and sculpts for a flawless finish. Your new go-to for nights out.",
    images: ["/images/products/dresses/black-bodycon-mini-dress.jpg"],
    sizes: ["S", "M", "L"],
    tags: ["thrift", "new-arrival", "in-stock", "on-offer", "party-wear"],
    is_new: true,
    is_on_offer: true,
    offer_percentage: 19,
    featured: true,
  },
  {
    name: "Black & White Pleated Sleeve Cocktail Dress",
    slug: "black-white-pleated-sleeve-cocktail-dress",
    price: 900,
    original_price: 0,
    description:
      "Sophisticated black cocktail dress with show-stopping white accordion-pleated long sleeves. The keyhole neckline adds a touch of allure while the belted waist defines the silhouette. A head-turning fusion of classic and contemporary for formal events.",
    images: ["/images/products/dresses/black-white-pleated-sleeve-dress.jpg"],
    sizes: ["S", "M", "L", "XL"],
    tags: ["thrift", "new-arrival", "in-stock", "party-wear", "statement-piece", "best-seller"],
    is_new: true,
    is_on_offer: false,
    offer_percentage: 0,
    featured: true,
  },
  {
    name: "White Floral Eyelet-Trim Midi Dress",
    slug: "white-floral-eyelet-trim-midi-dress",
    price: 800,
    original_price: 0,
    description:
      "Cottage-core charm meets modern style in this white floral midi dress. Delicate wildflower print scattered across lightweight cotton with eyelet lace trim along the flutter sleeves and hemline. The fitted waist flares into a romantic A-line skirt.",
    images: ["/images/products/dresses/white-floral-eyelet-midi-dress.jpg"],
    sizes: ["S", "M", "L"],
    tags: ["thrift", "new-arrival", "in-stock", "casual", "vintage"],
    is_new: true,
    is_on_offer: false,
    offer_percentage: 0,
    featured: false,
  },
  {
    name: "Pastel Stripe Cami Mini Dress",
    slug: "pastel-stripe-cami-mini-dress",
    price: 600,
    original_price: 750,
    description:
      "Sweet and flirty pastel-striped mini dress with thin spaghetti straps and a playful ruffled hem. The candy-coloured pink and cream stripes bring instant summer vibes while the fitted stretch fabric hugs the body in all the right places. Perfect for beach days and casual dates.",
    images: ["/images/products/dresses/pastel-stripe-mini-dress.jpg"],
    sizes: ["S", "M", "L"],
    tags: ["thrift", "new-arrival", "in-stock", "on-offer", "casual"],
    is_new: true,
    is_on_offer: true,
    offer_percentage: 20,
    featured: false,
  },
  {
    name: "Green Paisley Long-Sleeve Bodycon Dress",
    slug: "green-paisley-long-sleeve-bodycon-dress",
    price: 750,
    original_price: 0,
    description:
      "Make a statement in this vibrant green and turquoise paisley bodycon dress. Bold swirling patterns in green and purple create an eye-catching retro aesthetic. Long sleeves and a boat neckline keep it chic while the body-skimming fit adds modern edge.",
    images: ["/images/products/dresses/green-paisley-bodycon-dress.jpg"],
    sizes: ["S", "M", "L"],
    tags: ["thrift", "new-arrival", "in-stock", "party-wear", "statement-piece"],
    is_new: true,
    is_on_offer: false,
    offer_percentage: 0,
    featured: true,
  },
  {
    name: "Champagne Smocked Bodice Maxi Dress",
    slug: "champagne-smocked-bodice-maxi-dress",
    price: 850,
    original_price: 0,
    description:
      "Graceful champagne maxi dress with a stretchy smocked bodice and flowing layered skirt. Thin spaghetti straps create a delicate look while the floor-length silhouette adds drama. From sunset dinners to weddings this dress does it all beautifully.",
    images: ["/images/products/dresses/champagne-smocked-maxi-dress.jpg"],
    sizes: ["S", "M", "L", "XL"],
    tags: ["thrift", "new-arrival", "in-stock", "party-wear", "best-seller"],
    is_new: true,
    is_on_offer: false,
    offer_percentage: 0,
    featured: true,
  },
  {
    name: "Sage Green Button-Down Shirt Dress",
    slug: "sage-green-button-down-shirt-dress",
    price: 800,
    original_price: 900,
    description:
      "Classic and effortlessly cool sage green shirt dress with a pointed collar and button-through front. The three-quarter sleeves roll up for a relaxed vibe and the self-tie waist belt adds feminine polish. A versatile wardrobe essential from boardroom to brunch.",
    images: ["/images/products/dresses/sage-button-shirt-dress.jpg"],
    sizes: ["S", "M", "L", "XL"],
    tags: ["thrift", "new-arrival", "in-stock", "on-offer", "casual", "office-wear"],
    is_new: true,
    is_on_offer: true,
    offer_percentage: 11,
    featured: false,
  },
  {
    name: "Black Double-Breasted Blazer Dress",
    slug: "black-double-breasted-blazer-dress",
    price: 900,
    original_price: 0,
    description:
      "Power dressing at its finest. This structured black blazer dress features a sharp notched lapel collar and polished gold double-breasted buttons. The short-sleeve design and tailored waist create a sleek boardroom-to-cocktails silhouette. Confidence never looked this good.",
    images: ["/images/products/dresses/black-blazer-dress.jpg"],
    sizes: ["S", "M", "L", "XL"],
    tags: ["thrift", "new-arrival", "in-stock", "office-wear", "statement-piece", "best-seller"],
    is_new: true,
    is_on_offer: false,
    offer_percentage: 0,
    featured: true,
  },
  {
    name: "Green Tropical Palm Leaf Maxi Dress",
    slug: "green-tropical-palm-leaf-maxi-dress",
    price: 850,
    original_price: 0,
    description:
      "Escape to paradise in this lush green tropical maxi dress. Bold palm leaf and banana leaf prints in vivid greens create an exotic resort feel. The halterneck ties at the nape while the full flowing skirt sweeps dramatically. Holiday dressing at its absolute best.",
    images: ["/images/products/dresses/green-tropical-maxi-dress.jpg"],
    sizes: ["S", "M", "L"],
    tags: ["thrift", "new-arrival", "in-stock", "casual", "statement-piece"],
    is_new: true,
    is_on_offer: false,
    offer_percentage: 0,
    featured: false,
  },
  {
    name: "White & Blue Floral Smocked Mini Dress",
    slug: "white-blue-floral-smocked-mini-dress",
    price: 650,
    original_price: 800,
    description:
      "Sweet and breezy white mini dress with tiny blue floral sprigs. The smocked elastic bodice provides a perfect fit while the tie-strap shoulders adjust for comfort. A relaxed A-line skirt falls above the knee for an easy-going feminine look.",
    images: ["/images/products/dresses/white-blue-floral-smocked-dress.jpg"],
    sizes: ["S", "M", "L"],
    tags: ["thrift", "new-arrival", "in-stock", "on-offer", "casual"],
    is_new: true,
    is_on_offer: true,
    offer_percentage: 19,
    featured: false,
  },
  {
    name: "Black Lace-Trim Asymmetric Mini Dress",
    slug: "black-lace-trim-asymmetric-mini-dress",
    price: 700,
    original_price: 0,
    description:
      "Daring and seductive black mini dress with intricate lace trim along the asymmetric hemline. Thin spaghetti straps and a fitted bodice hug the body while the lace overlay adds texture and drama. Your after-dark secret weapon.",
    images: ["/images/products/dresses/black-lace-trim-mini-dress.jpg"],
    sizes: ["S", "M", "L"],
    tags: ["thrift", "new-arrival", "in-stock", "party-wear"],
    is_new: true,
    is_on_offer: false,
    offer_percentage: 0,
    featured: true,
  },
  {
    name: "Brown Leopard Ombre Halter Midi Dress",
    slug: "brown-leopard-ombre-halter-midi-dress",
    price: 750,
    original_price: 0,
    description:
      "Wild and sophisticated. This halterneck midi dress features a gradient ombre effect that fades from rich chocolate brown into a bold leopard print. The crossover neckline and body-skimming jersey fabric create an effortlessly chic silhouette.",
    images: ["/images/products/dresses/brown-leopard-halter-dress.jpg"],
    sizes: ["S", "M", "L"],
    tags: ["thrift", "new-arrival", "in-stock", "party-wear", "statement-piece"],
    is_new: true,
    is_on_offer: false,
    offer_percentage: 0,
    featured: false,
  },
  {
    name: "Black Long-Sleeve Belted Maxi Dress",
    slug: "black-long-sleeve-belted-maxi-dress",
    price: 800,
    original_price: 0,
    description:
      "Timeless sophistication in this flowing black maxi dress with long sleeves and a relaxed scoop neckline. The braided tan belt cinches the waist beautifully while the floor-length skirt drapes elegantly. A wardrobe staple that works for literally any occasion.",
    images: ["/images/products/dresses/black-long-sleeve-maxi-dress.jpg"],
    sizes: ["S", "M", "L", "XL"],
    tags: ["thrift", "new-arrival", "in-stock", "casual", "office-wear"],
    is_new: true,
    is_on_offer: false,
    offer_percentage: 0,
    featured: false,
  },
  {
    name: "Teal Abstract Print Sleeveless Midi Dress",
    slug: "teal-abstract-print-sleeveless-midi-dress",
    price: 700,
    original_price: 850,
    description:
      "Artistic and eye-catching teal midi dress with an abstract splatter print in turquoise black and white. The sleeveless design and scoop neckline keep it cool and contemporary. Cinch with the tan leather belt for a polished daytime look.",
    images: ["/images/products/dresses/teal-abstract-belted-dress.jpg"],
    sizes: ["S", "M", "L", "XL"],
    tags: ["thrift", "new-arrival", "in-stock", "on-offer", "casual", "vintage"],
    is_new: true,
    is_on_offer: true,
    offer_percentage: 18,
    featured: false,
  },
]

async function seed() {
  console.log("Starting dresses product seed...")

  // Find or create dresses category
  const { data: allCats } = await supabase.from("categories").select("id, slug, name")
  console.log("Available categories:", JSON.stringify(allCats, null, 2))

  let category = allCats?.find((c) => c.slug === "dresses") || null

  if (!category && allCats) {
    const { data: newCat } = await supabase
      .from("categories")
      .insert({
        name: "Dresses",
        slug: "dresses",
        description:
          "Beautiful thrift dresses for every occasion — maxi, midi, and mini styles. Floral prints, tropical vibes, and classic patterns. All items in stock and new.",
        image_url: "/images/categories/dresses.jpg",
        sort_order: 3,
        is_active: true,
      })
      .select()
      .single()
    category = newCat
    console.log("Created 'Dresses' category")
  }

  if (!category) {
    console.error("Could not find or create category!")
    return
  }

  console.log(`Using category: ${category.name} (${category.id})`)

  // Ensure all required tags exist
  const allTags = [
    "thrift",
    "new-arrival",
    "in-stock",
    "on-offer",
    "casual",
    "office-wear",
    "party-wear",
    "statement-piece",
    "best-seller",
    "vintage",
    "date-night",
    "limited-edition",
  ]

  for (const tagSlug of allTags) {
    const { data: existing } = await supabase.from("tags").select("id").eq("slug", tagSlug).single()
    if (!existing) {
      await supabase.from("tags").insert({
        name: tagSlug
          .split("-")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" "),
        slug: tagSlug,
      })
      console.log(`Created tag: ${tagSlug}`)
    }
  }

  for (const p of products) {
    // Check if slug already exists
    const { data: existing } = await supabase.from("products").select("id").eq("slug", p.slug).single()

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
        original_price: p.original_price > 0 ? p.original_price : null,
        description: p.description,
        category_id: category.id,
        is_new: p.is_new,
        is_on_offer: p.is_on_offer,
        offer_percentage: p.offer_percentage,
        in_stock: true,
        featured: p.featured,
        gallery_images: p.images,
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
      image_url: url,
      url: url,
      alt_text: `${p.name} - Image ${i + 1}`,
      sort_order: i,
      is_primary: i === 0,
    }))
    await supabase.from("product_images").insert(imageRows)

    // Insert size variations
    for (const size of p.sizes) {
      await supabase.from("product_variations").insert({
        product_id: product.id,
        type: "Size",
        label: "Size",
        value: size,
        extra_price: 0,
        in_stock: true,
      })
    }

    // Insert tags
    for (const tagSlug of p.tags) {
      const { data: tag } = await supabase.from("tags").select("id").eq("slug", tagSlug).single()
      if (tag) {
        await supabase.from("product_tags").insert({
          product_id: product.id,
          tag_id: tag.id,
        })
      }
    }

    const status = []
    if (p.is_new) status.push("NEW")
    if (p.is_on_offer) status.push(`${p.offer_percentage}% OFF`)
    if (p.featured) status.push("FEATURED")

    console.log(`Created: "${p.name}" - KSh ${p.price} [${status.join(", ")}]`)
  }

  console.log("\nDone! All 20 dress products seeded.")
}

seed()
