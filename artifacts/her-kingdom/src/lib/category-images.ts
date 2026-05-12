// Fallback category images for categories that may not yet have
// image_url set in the database. The admin UI can still override
// any of these by uploading a new image.
//
// Keys are category slugs (as stored in public.categories.slug).
const CATEGORY_IMAGE_FALLBACKS: Record<string, string> = {
  "necklace-sets": "/images/products/necklaces/necklace-sets-category.jpeg",
  "men-necklaces": "/images/products/men-necklaces/men-necklaces-category.jpeg",
}

const PLACEHOLDER_PREFIX = "/placeholder"

export function resolveCategoryImage(
  slug: string | null | undefined,
  imageUrl: string | null | undefined,
): string {
  if (imageUrl && !imageUrl.startsWith(PLACEHOLDER_PREFIX)) return imageUrl
  if (slug && CATEGORY_IMAGE_FALLBACKS[slug]) return CATEGORY_IMAGE_FALLBACKS[slug]
  return "/placeholder.svg?height=500&width=400"
}
