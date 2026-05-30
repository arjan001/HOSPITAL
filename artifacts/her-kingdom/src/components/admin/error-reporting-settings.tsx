/**
 * Admin → Settings → Error Reporting
 *
 * Replaces the removed in-app monitoring viewer. Runtime errors captured by the
 * monitoring backend are forwarded to the destination(s) the team already uses:
 * Sentry and/or Slack.
 *
 * - Credentials (SENTRY_DSN, SLACK_WEBHOOK_URL, …) live ONLY in env. This screen
 *   never asks for or stores secrets.
 * - The enable/disable toggles are non-secret and persist via cmsStore
 *   (`error-reporting` = { sentryEnabled, slackEnabled }).
 * - Provider readiness comes from GET /api/v2/admin/error-reporting/status.
 * - "Send test event" hits POST /api/v2/admin/error-reporting/test.
 */
import { useState } from "react"
import useSWR from "swr"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { useCmsDoc } from "@/lib/cms-store"
import { adminAuthHeaders } from "@/lib/api-client"

type ProviderStatus = { configured: boolean; enabled: boolean; active: boolean }
type ErrorReportingStatus = {
  sentry: ProviderStatus
  slack: ProviderStatus
  environment: string
  release: string
}
type ForwardResult = { ok: boolean; skipped?: boolean; reason?: string; status?: number }
type TestResult = { ok: boolean; sentry?: ForwardResult; slack?: ForwardResult }

type Toggles = { sentryEnabled: boolean; slackEnabled: boolean }
const DEFAULTS: Toggles = { sentryEnabled: true, slackEnabled: true }

const STATUS_URL = "/api/v2/admin/error-reporting/status"

const statusFetcher = async (url: string): Promise<ErrorReportingStatus> => {
  const res = await fetch(url, { credentials: "include", headers: adminAuthHeaders() })
  if (!res.ok) throw new Error(`Request failed (${res.status})`)
  return res.json()
}

function ReadinessBadge({ s }: { s?: ProviderStatus }) {
  if (!s) return <Badge variant="outline">Unknown</Badge>
  if (s.active) return <Badge className="bg-emerald-600 hover:bg-emerald-600">Active</Badge>
  if (s.configured && !s.enabled)
    return <Badge className="bg-amber-500 hover:bg-amber-500">Configured · disabled</Badge>
  if (!s.configured)
    return <Badge variant="outline">Not configured</Badge>
  return <Badge variant="outline">Inactive</Badge>
}

export function ErrorReportingSettings() {
  const { toast } = useToast()
  const [toggles, setToggles] = useCmsDoc<Toggles>("error-reporting", DEFAULTS)
  const { data: status, isLoading, mutate } = useSWR<ErrorReportingStatus>(
    STATUS_URL,
    statusFetcher,
    { revalidateOnFocus: false },
  )
  const [testing, setTesting] = useState(false)

  async function sendTest() {
    setTesting(true)
    try {
      const res = await fetch("/api/v2/admin/error-reporting/test", {
        method: "POST",
        credentials: "include",
        headers: adminAuthHeaders(),
      })
      const data = (await res.json()) as TestResult
      if (data.ok) {
        const dest = [
          data.sentry?.ok ? "Sentry" : null,
          data.slack?.ok ? "Slack" : null,
        ]
          .filter(Boolean)
          .join(" + ")
        toast({ title: "Test event sent", description: `Delivered to ${dest || "destination"}.` })
      } else {
        const reason =
          data.sentry?.reason || data.slack?.reason || "No destination is configured."
        toast({ title: "Test failed", description: reason, variant: "destructive" })
      }
      void mutate()
    } catch (err) {
      toast({
        title: "Test failed",
        description: err instanceof Error ? err.message : "Request failed",
        variant: "destructive",
      })
    } finally {
      setTesting(false)
    }
  }

  const anyConfigured = !!(status?.sentry.configured || status?.slack.configured)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Error reporting</CardTitle>
          <CardDescription>
            Forward runtime errors to Sentry and/or Slack. Credentials are set as
            server secrets — only the on/off switches are saved here.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isLoading && !anyConfigured && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              No destination is configured. Set <code className="font-mono">SENTRY_DSN</code> and/or{" "}
              <code className="font-mono">SLACK_WEBHOOK_URL</code> as server secrets to enable
              forwarding.
            </div>
          )}

          {/* Sentry */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Label className="text-base">Sentry</Label>
                <ReadinessBadge s={status?.sentry} />
              </div>
              <p className="text-sm text-muted-foreground">
                Sends error & fatal events to your Sentry project via{" "}
                <code className="font-mono">SENTRY_DSN</code>.
              </p>
            </div>
            <Switch
              checked={toggles.sentryEnabled}
              onCheckedChange={(v) => setToggles((p) => ({ ...p, sentryEnabled: v }))}
              disabled={!status?.sentry.configured}
              aria-label="Enable Sentry forwarding"
            />
          </div>

          <Separator />

          {/* Slack */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Label className="text-base">Slack</Label>
                <ReadinessBadge s={status?.slack} />
              </div>
              <p className="text-sm text-muted-foreground">
                Posts an alert to a Slack channel via an incoming webhook (
                <code className="font-mono">SLACK_WEBHOOK_URL</code>).
              </p>
            </div>
            <Switch
              checked={toggles.slackEnabled}
              onCheckedChange={(v) => setToggles((p) => ({ ...p, slackEnabled: v }))}
              disabled={!status?.slack.configured}
              aria-label="Enable Slack forwarding"
            />
          </div>

          <Separator />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Environment: <span className="font-mono">{status?.environment ?? "—"}</span> · Release:{" "}
              <span className="font-mono">{status?.release ?? "—"}</span>
            </p>
            <Button onClick={sendTest} disabled={testing || !anyConfigured} variant="outline">
              {testing ? "Sending…" : "Send test event"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
