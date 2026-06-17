/**
 * Standard Clerk env resolution (no Replit host-derived keys).
 * Set CLERK_PUBLISHABLE_KEY + CLERK_SECRET_KEY from your Clerk Dashboard.
 * VITE_CLERK_PUBLISHABLE_KEY is accepted as a fallback for local monorepo dev.
 */

export function clerkPublishableKey(): string | undefined {
  return (
    process.env.CLERK_PUBLISHABLE_KEY?.trim() ||
    process.env.VITE_CLERK_PUBLISHABLE_KEY?.trim() ||
    undefined
  )
}

/** Opt-in Clerk Frontend API proxy (satellite / custom domain only). */
export function clerkProxyUrl(): string | undefined {
  return (
    process.env.CLERK_PROXY_URL?.trim() ||
    process.env.VITE_CLERK_PROXY_URL?.trim() ||
    undefined
  )
}

export function clerkConfigured(): boolean {
  return Boolean(clerkPublishableKey() && process.env.CLERK_SECRET_KEY?.trim())
}
