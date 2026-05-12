// Admin Supabase client - in client-side Vite this is the same as browser client
// Server-only admin operations should go through the API server
import { createClient as createBrowserClient } from "./client"
export function createAdminClient() {
  return createBrowserClient()
}
