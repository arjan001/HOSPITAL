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
import { useEffect, useState } from "react"
import useSWR from "swr"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
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

type SecretView = { set: boolean; masked: string; source: "db" | "env" | "none" }
type PlainView = { value: string; source: "db" | "env" | "default" }
type ConfigView = {
  sentryDsn: SecretView
  slackWebhookUrl: SecretView
  sentryEnvironment: PlainView
  sentryRelease: PlainView
}

type Toggles = { sentryEnabled: boolean; slackEnabled: boolean }
const DEFAULTS: Toggles = { sentryEnabled: true, slackEnabled: true }

const STATUS_URL = "/api/v2/admin/error-reporting/status"
const CONFIG_URL = "/api/v2/admin/error-reporting/config"

const statusFetcher = async (url: string): Promise<ErrorReportingStatus> => {
  const res = await fetch(url, { credentials: "include", headers: adminAuthHeaders() })
  if (!res.ok) throw new Error(`Request failed (${res.status})`)
  return res.json()
}

const configFetcher = async (url: string): Promise<ConfigView> => {
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
  const { data: config, mutate: mutateConfig } = useSWR<ConfigView>(
    CONFIG_URL,
    configFetcher,
    { revalidateOnFocus: false },
  )
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)

  // Credential form. Inputs are seeded with the masked value; the operator
  // overwrites a field to change it, clears it to fall back to the env secret,
  // or leaves the mask untouched to keep the current value.
  const [form, setForm] = useState({
    sentryDsn: "",
    slackWebhookUrl: "",
    sentryEnvironment: "",
    sentryRelease: "",
  })
  useEffect(() => {
    if (!config) return
    setForm({
      sentryDsn: config.sentryDsn.masked,
      slackWebhookUrl: config.slackWebhookUrl.masked,
      sentryEnvironment: config.sentryEnvironment.value,
      sentryRelease: config.sentryRelease.value,
    })
  }, [config])

  async function saveConfig() {
    setSaving(true)
    try {
      const res = await fetch(CONFIG_URL, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...adminAuthHeaders() },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error(`Request failed (${res.status})`)
      toast({ title: "Credentials saved", description: "Error-reporting destinations updated." })
      await Promise.all([mutateConfig(), mutate()])
    } catch (err) {
      toast({
        title: "Save failed",
        description: err instanceof Error ? err.message : "Request failed",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

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

          {/* Credentials */}
          <div className="space-y-4 rounded-md border border-border bg-card p-4">
            <div className="space-y-1">
              <Label className="text-base">Credentials</Label>
              <p className="text-sm text-muted-foreground">
                Stored securely server-side. Existing values are masked — overwrite a
                field to change it, or clear it to fall back to the server secret.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="er-sentry-dsn" className="text-sm">Sentry DSN</Label>
                {config && (
                  <span className="text-[11px] text-muted-foreground">
                    source: <span className="font-mono">{config.sentryDsn.source}</span>
                  </span>
                )}
              </div>
              <Input
                id="er-sentry-dsn"
                value={form.sentryDsn}
                placeholder="https://<key>@o0.ingest.sentry.io/0"
                onChange={(e) => setForm((p) => ({ ...p, sentryDsn: e.target.value }))}
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="er-slack" className="text-sm">Slack webhook URL</Label>
                {config && (
                  <span className="text-[11px] text-muted-foreground">
                    source: <span className="font-mono">{config.slackWebhookUrl.source}</span>
                  </span>
                )}
              </div>
              <Input
                id="er-slack"
                value={form.slackWebhookUrl}
                placeholder="https://hooks.slack.com/services/…"
                onChange={(e) => setForm((p) => ({ ...p, slackWebhookUrl: e.target.value }))}
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="er-env" className="text-sm">Environment</Label>
                <Input
                  id="er-env"
                  value={form.sentryEnvironment}
                  placeholder="production"
                  onChange={(e) => setForm((p) => ({ ...p, sentryEnvironment: e.target.value }))}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="er-release" className="text-sm">Release</Label>
                <Input
                  id="er-release"
                  value={form.sentryRelease}
                  placeholder="dev"
                  onChange={(e) => setForm((p) => ({ ...p, sentryRelease: e.target.value }))}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={saveConfig}
                disabled={saving}
                style={{ background: "#B91C1C" }}
                className="text-white hover:opacity-90"
              >
                {saving ? "Saving…" : "Save credentials"}
              </Button>
            </div>
          </div>

          <Separator />

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
