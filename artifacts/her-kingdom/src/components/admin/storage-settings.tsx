/**
 * Admin → Settings → Storage
 *
 * Selects the active backend for binary uploads (product images, prescription
 * scans, etc.): local disk, an S3-compatible object store, or Cloudinary.
 *
 * - Credentials (S3_*, CLOUDINARY_*) live ONLY in env. This screen never asks
 *   for or stores secrets — it only persists the provider *selection* via
 *   cmsStore (`storage` = { provider }).
 * - Readiness + the currently-active provider come from
 *   GET /api/v2/admin/storage/status. If the selected provider is not fully
 *   configured the backend falls back to local disk (surfaced here).
 * - "Run test upload" hits POST /api/v2/admin/storage/test (round-trips a tiny
 *   object through the active backend).
 */
import { useState } from "react"
import useSWR from "swr"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useCmsDoc } from "@/lib/cms-store"
import { cn } from "@/lib/utils"
import { adminAuthHeaders } from "@/lib/api-client"

type Provider = "local" | "s3" | "cloudinary"

type StorageStatus = {
  provider: Provider
  active: Provider
  fellBack: boolean
  providers: {
    local: { configured: boolean }
    s3: {
      configured: boolean
      bucket: string | null
      region: string
      endpoint: string | null
      publicBaseUrl: string | null
    }
    cloudinary: { configured: boolean; cloudName: string | null }
  }
}
type TestResult = { ok: boolean; url?: string; key?: string; reason?: string } & Partial<StorageStatus>

type Selection = { provider: Provider }
const DEFAULTS: Selection = { provider: "local" }

const STATUS_URL = "/api/v2/admin/storage/status"

const statusFetcher = async (url: string): Promise<StorageStatus> => {
  const res = await fetch(url, { credentials: "include", headers: adminAuthHeaders() })
  if (!res.ok) throw new Error(`Request failed (${res.status})`)
  return res.json()
}

const PROVIDERS: Array<{
  id: Provider
  name: string
  blurb: string
  envHint: string
}> = [
  {
    id: "local",
    name: "Local disk",
    blurb: "Files written to the server's .uploads/ directory. Best for development.",
    envHint: "No credentials needed.",
  },
  {
    id: "s3",
    name: "S3-compatible",
    blurb: "AWS S3, Cloudflare R2, DigitalOcean Spaces, MinIO — any S3 API.",
    envHint: "S3_BUCKET · S3_REGION · S3_ENDPOINT · S3_ACCESS_KEY_ID · S3_SECRET_ACCESS_KEY",
  },
  {
    id: "cloudinary",
    name: "Cloudinary",
    blurb: "Managed media storage + delivery with on-the-fly transforms.",
    envHint: "CLOUDINARY_CLOUD_NAME · CLOUDINARY_API_KEY · CLOUDINARY_API_SECRET",
  },
]

export function StorageSettings() {
  const { toast } = useToast()
  const [selection, setSelection] = useCmsDoc<Selection>("storage", DEFAULTS)
  const { data: status, mutate } = useSWR<StorageStatus>(STATUS_URL, statusFetcher, {
    revalidateOnFocus: false,
  })
  const [testing, setTesting] = useState(false)

  function configured(id: Provider): boolean {
    if (!status) return id === "local"
    return status.providers[id].configured
  }

  function selectProvider(id: Provider) {
    setSelection({ provider: id })
    // Give the server a moment to pick up the new cms value, then refresh status.
    setTimeout(() => void mutate(), 400)
  }

  async function runTest() {
    setTesting(true)
    try {
      const res = await fetch("/api/v2/admin/storage/test", {
        method: "POST",
        credentials: "include",
        headers: adminAuthHeaders(),
      })
      const data = (await res.json()) as TestResult
      if (data.ok) {
        toast({
          title: "Upload test passed",
          description: `Round-tripped through "${data.active ?? selection.provider}".`,
        })
      } else {
        toast({
          title: "Upload test failed",
          description: data.reason || "The active storage backend rejected the test.",
          variant: "destructive",
        })
      }
      void mutate()
    } catch (err) {
      toast({
        title: "Upload test failed",
        description: err instanceof Error ? err.message : "Request failed",
        variant: "destructive",
      })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>File storage</CardTitle>
          <CardDescription>
            Choose where uploaded files are stored. Credentials are set as server
            secrets — only the selection is saved here.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status?.fellBack && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              "{status.provider}" is selected but not fully configured — uploads are
              currently using <strong>local disk</strong>. Add the required server
              secrets to activate it.
            </div>
          )}

          <div className="grid gap-3">
            {PROVIDERS.map((p) => {
              const isSelected = selection.provider === p.id
              const isActive = status?.active === p.id
              const ready = configured(p.id)
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => selectProvider(p.id)}
                  className={cn(
                    "flex w-full items-start justify-between gap-4 rounded-lg border px-4 py-3 text-left transition",
                    isSelected
                      ? "border-[#6B0F1A] ring-1 ring-[#6B0F1A] bg-[#6B0F1A]/[0.03]"
                      : "border-border hover:border-muted-foreground/40",
                  )}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{p.name}</span>
                      {isActive && (
                        <Badge className="bg-emerald-600 hover:bg-emerald-600">Active</Badge>
                      )}
                      {ready ? (
                        p.id !== "local" && (
                          <Badge variant="outline" className="text-emerald-700 border-emerald-300">
                            Configured
                          </Badge>
                        )
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          Not configured
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{p.blurb}</p>
                    <p className="text-xs text-muted-foreground font-mono">{p.envHint}</p>
                    {p.id === "s3" && status?.providers.s3.bucket && (
                      <p className="text-xs text-muted-foreground">
                        Bucket: <span className="font-mono">{status.providers.s3.bucket}</span> ·
                        Region: <span className="font-mono">{status.providers.s3.region}</span>
                        {status.providers.s3.endpoint && (
                          <>
                            {" "}· Endpoint:{" "}
                            <span className="font-mono">{status.providers.s3.endpoint}</span>
                          </>
                        )}
                      </p>
                    )}
                    {p.id === "cloudinary" && status?.providers.cloudinary.cloudName && (
                      <p className="text-xs text-muted-foreground">
                        Cloud:{" "}
                        <span className="font-mono">{status.providers.cloudinary.cloudName}</span>
                      </p>
                    )}
                  </div>
                  <div
                    className={cn(
                      "mt-1 h-4 w-4 shrink-0 rounded-full border",
                      isSelected ? "border-[#6B0F1A] bg-[#6B0F1A]" : "border-muted-foreground/40",
                    )}
                    aria-hidden
                  />
                </button>
              )
            })}
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            <p className="text-xs text-muted-foreground">
              Active backend: <span className="font-mono">{status?.active ?? "—"}</span>
            </p>
            <Button onClick={runTest} disabled={testing} variant="outline">
              {testing ? "Testing…" : "Run test upload"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
