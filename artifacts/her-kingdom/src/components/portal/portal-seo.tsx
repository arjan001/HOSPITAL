"use client"

import { Seo } from "@/components/seo"

/** Partner portals are private — never index login dashboards. */
export function PortalSeo({ path, label }: { path: string; label: string }) {
  return (
    <Seo
      title={`${label} Partner Portal`}
      description={`Secure ${label.toLowerCase()} partner workspace for Shaniid RX. Sign in required.`}
      canonicalPath={path}
      noindex
    />
  )
}
