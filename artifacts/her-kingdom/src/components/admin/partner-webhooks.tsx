"use client"

import { useState } from "react"
import useSWR from "swr"
import { AdminShell } from "./admin-shell"
import { apiAdminPartnerWebhooks } from "@/lib/api-admin-partner-webhooks"
import { usePermission } from "@/lib/permissions"
import { notify } from "@/lib/notify"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Webhook, Plus, Play, RefreshCw } from "lucide-react"

const EVENT_OPTIONS = ["po.issued", "delivery.job_assigned", "delivery.job_updated"]

export function AdminPartnerWebhooks() {
  const canManage = usePermission("integrations.manage") || usePermission("procurement.manage")
  const { data: endpoints, mutate, isLoading } = useSWR(
    "/admin/partner-webhooks",
    () => apiAdminPartnerWebhooks.list(),
    { revalidateOnFocus: true },
  )
  const { data: deliveries, mutate: mutateDeliveries } = useSWR(
    "/admin/partner-webhooks/deliveries",
    () => apiAdminPartnerWebhooks.deliveries(30),
    { revalidateOnFocus: true },
  )

  const [partnerId, setPartnerId] = useState("")
  const [url, setUrl] = useState("")
  const [secret, setSecret] = useState("")
  const [events, setEvents] = useState<string[]>(["po.issued", "delivery.job_assigned"])
  const [saving, setSaving] = useState(false)

  const toggleEvent = (event: string) => {
    setEvents((prev) => (prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]))
  }

  const handleRegister = async () => {
    if (!canManage) {
      notify.warning("You need integrations.manage or procurement.manage permission.")
      return
    }
    if (!partnerId.trim() || !url.trim()) {
      notify.warning("Partner ID and URL are required.")
      return
    }
    setSaving(true)
    try {
      await apiAdminPartnerWebhooks.register({
        partnerId: partnerId.trim(),
        url: url.trim(),
        secret: secret.trim() || undefined,
        events,
      })
      notify.success("Webhook endpoint saved.")
      setUrl("")
      setSecret("")
      void mutate()
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Could not save endpoint")
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async (pid: string) => {
    try {
      const res = await apiAdminPartnerWebhooks.test({ partnerId: pid, event: "po.issued" })
      notify.success(`Test dispatched to ${res.dispatched} endpoint(s), ${res.delivered} delivered.`)
      void mutateDeliveries()
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Test failed")
    }
  }

  return (
    <AdminShell title="Partner webhooks">
      <p className="text-sm text-muted-foreground mb-4">Outbound HTTP notifications for PO issued and delivery jobs.</p>
      <div className="space-y-6 max-w-5xl">
        <div className="rounded-lg border border-border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Webhook className="h-5 w-5 text-[#3D0814]" />
            <h2 className="font-semibold">Register endpoint</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Partner ID (supplier / logistics directory id)</Label>
              <Input value={partnerId} onChange={(e) => setPartnerId(e.target.value)} placeholder="pd_..." />
            </div>
            <div>
              <Label className="text-xs">Webhook URL</Label>
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://partner.example/hooks" />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Signing secret (optional)</Label>
              <Input value={secret} onChange={(e) => setSecret(e.target.value)} type="password" placeholder="HMAC secret" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {EVENT_OPTIONS.map((ev) => (
              <button
                key={ev}
                type="button"
                onClick={() => toggleEvent(ev)}
                className={`text-xs px-2.5 py-1 rounded-full border ${
                  events.includes(ev) ? "bg-[#3D0814] text-white border-[#3D0814]" : "bg-background"
                }`}
              >
                {ev}
              </button>
            ))}
          </div>
          <Button
            onClick={() => void handleRegister()}
            disabled={!canManage || saving}
            className="bg-[#3D0814] hover:bg-[#6B0F1A] text-white gap-1.5"
          >
            <Plus className="h-4 w-4" />
            {saving ? "Saving…" : "Save endpoint"}
          </Button>
        </div>

        <div className="rounded-lg border border-border overflow-hidden">
          <div className="px-4 py-3 bg-secondary flex items-center justify-between">
            <h2 className="font-semibold text-sm">Active endpoints</h2>
            <Button variant="ghost" size="sm" onClick={() => void mutate()}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="divide-y divide-border">
            {(endpoints ?? []).map((ep) => (
              <div key={ep.id} className="px-4 py-3 flex flex-wrap items-center gap-2 justify-between">
                <div>
                  <p className="font-mono text-xs">{ep.partnerId}</p>
                  <p className="text-sm truncate max-w-md">{ep.url}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {ep.events.map((e) => (
                      <Badge key={e} variant="secondary" className="text-[10px]">
                        {e}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Button variant="outline" size="sm" className="gap-1" onClick={() => void handleTest(ep.partnerId)}>
                  <Play className="h-3 w-3" /> Test
                </Button>
              </div>
            ))}
            {!isLoading && (endpoints ?? []).length === 0 && (
              <p className="px-4 py-8 text-sm text-muted-foreground text-center">No webhook endpoints yet.</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border overflow-hidden">
          <div className="px-4 py-3 bg-secondary">
            <h2 className="font-semibold text-sm">Recent deliveries</h2>
          </div>
          <div className="divide-y divide-border max-h-64 overflow-y-auto">
            {(deliveries ?? []).map((d) => (
              <div key={d.id} className="px-4 py-2 text-xs flex items-center justify-between gap-2">
                <span className="font-mono">{d.event}</span>
                <Badge className={d.status === "delivered" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                  {d.status}
                </Badge>
                <span className="text-muted-foreground">{new Date(d.createdAt).toLocaleString()}</span>
              </div>
            ))}
            {(deliveries ?? []).length === 0 && (
              <p className="px-4 py-6 text-sm text-muted-foreground text-center">No deliveries logged yet.</p>
            )}
          </div>
        </div>
      </div>
    </AdminShell>
  )
}
