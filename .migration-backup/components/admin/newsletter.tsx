"use client"

import { useState, useEffect } from "react"
import { Trash2, Download, Mail } from "lucide-react"
import { usePagination } from "@/hooks/use-pagination"
import { PaginationControls } from "@/components/pagination-controls"
import { AdminShell } from "./admin-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface Subscriber {
  id: string
  email: string
  is_active: boolean
  subscribed_at: string
}

export function NewsletterComponent() {
  const { data: subscribers = [], mutate } = useSWR<Subscriber[]>("/api/admin/newsletter", fetcher)
  const [deleting, setDeleting] = useState(false)
  const [search, setSearch] = useState("")

  const filtered = subscribers.filter((s) =>
    s.email.toLowerCase().includes(search.toLowerCase())
  )

  const { paginatedItems, currentPage, totalPages, totalItems, itemsPerPage, goToPage, changePerPage, resetPage } = usePagination(filtered, { defaultPerPage: 15 })

  useEffect(() => { resetPage() }, [search])

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this subscriber?")) return
    setDeleting(true)
    try {
      await fetch(`/api/admin/newsletter?id=${id}`, { method: "DELETE" })
      mutate()
    } finally {
      setDeleting(false)
    }
  }

  const handleToggleActive = async (subscriber: Subscriber) => {
    try {
      await fetch("/api/admin/newsletter", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: subscriber.id, isActive: !subscriber.is_active }),
      })
      mutate()
    } catch (err) {
      console.error("Failed to update subscriber:", err)
    }
  }

  const handleExport = () => {
    const csv = ["Email,Status,Subscribed Date", ...subscribers.map((s) => `${s.email},${s.is_active ? "Active" : "Inactive"},${new Date(s.subscribed_at).toLocaleDateString()}`)].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `newsletter-subscribers-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <AdminShell title="Newsletter Subscribers">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-serif font-bold">Newsletter Subscribers</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage your newsletter sign-ups and subscriptions</p>
          </div>
          <Button onClick={handleExport} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>

        <div className="relative max-w-sm">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 h-10" />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-secondary rounded-sm p-4">
            <p className="text-sm text-muted-foreground">Total Subscribers</p>
            <p className="text-2xl font-bold mt-1">{subscribers.length}</p>
          </div>
          <div className="bg-secondary rounded-sm p-4">
            <p className="text-sm text-muted-foreground">Active</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{subscribers.filter((s) => s.is_active).length}</p>
          </div>
          <div className="bg-secondary rounded-sm p-4">
            <p className="text-sm text-muted-foreground">Inactive</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{subscribers.filter((s) => !s.is_active).length}</p>
          </div>
        </div>

        <div className="border border-border rounded-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Email</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Subscribed</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {subscribers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                      No subscribers yet
                    </td>
                  </tr>
                ) : (
                  paginatedItems.map((subscriber) => (
                    <tr key={subscriber.id} className="border-b border-border hover:bg-secondary/50 transition-colors">
                      <td className="px-4 py-3 font-medium">{subscriber.email}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(subscriber)}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                            subscriber.is_active
                              ? "bg-green-100 text-green-700 hover:bg-green-200"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          {subscriber.is_active ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {new Date(subscriber.subscribed_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDelete(subscriber.id)}
                          disabled={deleting}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={goToPage}
          onItemsPerPageChange={changePerPage}
          perPageOptions={[10, 15, 25, 50]}
        />
      </div>
    </AdminShell>
  )
}
