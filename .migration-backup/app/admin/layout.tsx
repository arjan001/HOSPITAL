import React from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Her Kingdom Admin Dashboard",
  description: "Admin dashboard for managing jewelry products, orders, categories, inventory, and store settings.",
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
