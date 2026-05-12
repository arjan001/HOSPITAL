import React, { useEffect, useState } from "react"
import { TopBar } from "@/components/store/top-bar"
import { Navbar } from "@/components/store/navbar"
import { Footer } from "@/components/store/footer"
import { sanitizeHtml } from "@/lib/sanitize-html"

// @ts-ignore
function createAdminClient() {
  // No-op client for client side - will call API instead
  return null
}

interface PolicyContent {
  title: string
  content: string
  updated_at?: string
}

const POLICY_TITLES: Record<string, string> = {
  "privacy-policy": "Privacy Policy",
  "terms-of-service": "Terms of Service",
  "payments-policy": "Payments Policy",
  "refund-policy": "Refund Policy",
}

export default function PolicyPage({ slug }: { slug: string }) {
  const [policy, setPolicy] = useState<PolicyContent | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchPolicy() {
      try {
        const res = await fetch(`/api/policies/${slug}`)
        if (res.ok) {
          const data = await res.json()
          setPolicy(data.policy || data)
        }
      } catch {
        // Use fallback
      } finally {
        setLoading(false)
      }
    }
    fetchPolicy()
  }, [slug])

  const title = policy?.title || POLICY_TITLES[slug] || "Policy"

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <TopBar />
      <Navbar />
      <main className="flex-1 mx-auto max-w-3xl px-4 py-12 lg:py-16">
        {loading ? (
          <div className="text-center text-sm text-muted-foreground py-8">Loading...</div>
        ) : (
          <>
            <h1 className="text-3xl md:text-4xl font-serif font-bold tracking-tight text-balance">{title}</h1>
            {policy?.updated_at && (
              <p className="text-sm text-muted-foreground mt-2">
                Last updated: {new Date(policy.updated_at).toLocaleDateString("en-KE", { year: "numeric", month: "long", day: "numeric" })}
              </p>
            )}
            <div
              className="mt-10 prose prose-sm max-w-none text-muted-foreground prose-headings:text-lg prose-headings:font-serif prose-headings:font-semibold prose-headings:text-foreground prose-strong:text-foreground prose-a:text-foreground prose-a:underline prose-a:underline-offset-2 prose-ul:list-disc prose-ul:pl-5 prose-li:my-1"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(policy?.content || "<p>Content not available.</p>") }}
            />
          </>
        )}
      </main>
      <Footer />
    </div>
  )
}
