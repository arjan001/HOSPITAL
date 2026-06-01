/**
 * Admin → Settings → Storage
 *
 * Selects the active backend for binary uploads (product images, prescription
 * scans, etc.): local disk, an S3-compatible object store, or Cloudinary.
 *
 * SECURITY MODEL (do not change):
 * - Credentials (S3_*, CLOUDINARY_*) live ONLY in server env. This screen NEVER
 *   asks for, displays, or stores secret values. It only persists the provider
 *   *selection* (+ a non-secret S3 preset label) via cmsStore.
 * - Per-key readiness comes from GET /api/v2/admin/storage/status as booleans
 *   ("Set" / "Missing") — never the values themselves.
 * - "Run test upload" hits POST /api/v2/admin/storage/test (round-trips a tiny
 *   object through the active backend).
 *
 * The S3-compatible engine backs every S3 provider (AWS, Cloudflare R2,
 * DigitalOcean Spaces, Wasabi, Backblaze B2, Alibaba OSS, MinIO, …). Choosing a
 * preset only changes the on-screen endpoint/region guidance — the backend reads
 * the same S3_* env keys regardless.
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
import { HardDrive, Cloud, Boxes, Check, X, Copy, CheckCircle2, AlertTriangle } from "lucide-react"

type Provider = "local" | "s3" | "cloudinary"

type S3Keys = {
  S3_BUCKET: boolean
  S3_REGION: boolean
  S3_ENDPOINT: boolean
  S3_ACCESS_KEY_ID: boolean
  S3_SECRET_ACCESS_KEY: boolean
  S3_PUBLIC_BASE_URL: boolean
  S3_FORCE_PATH_STYLE: boolean
}
type CloudinaryKeys = {
  CLOUDINARY_CLOUD_NAME: boolean
  CLOUDINARY_API_KEY: boolean
  CLOUDINARY_API_SECRET: boolean
}

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
      forcePathStyle: boolean
      keys: S3Keys
    }
    cloudinary: { configured: boolean; cloudName: string | null; keys: CloudinaryKeys }
  }
}
type TestResult = { ok: boolean; url?: string; key?: string; reason?: string } & Partial<StorageStatus>

// Non-secret selection persisted to cmsStore. `preset` only drives on-screen
// guidance; the backend ignores it and reads S3_* env regardless.
type Selection = { provider: Provider; preset?: S3PresetId }
const DEFAULTS: Selection = { provider: "local" }

const STATUS_URL = "/api/v2/admin/storage/status"

const statusFetcher = async (url: string): Promise<StorageStatus> => {
  const res = await fetch(url, { credentials: "include", headers: adminAuthHeaders() })
  if (!res.ok) throw new Error(`Request failed (${res.status})`)
  return res.json()
}

/* ---------- provider engines ---------- */

const ENGINES: Array<{ id: Provider; name: string; blurb: string; icon: typeof Cloud }> = [
  {
    id: "local",
    name: "Local disk",
    blurb: "Files are written to the server's .uploads/ directory. Best for development.",
    icon: HardDrive,
  },
  {
    id: "s3",
    name: "S3-compatible object storage",
    blurb: "AWS S3, Cloudflare R2, DigitalOcean Spaces, Wasabi, Backblaze B2, Alibaba OSS, MinIO and more.",
    icon: Boxes,
  },
  {
    id: "cloudinary",
    name: "Cloudinary",
    blurb: "Managed media storage and delivery with on-the-fly image transforms.",
    icon: Cloud,
  },
]

/* ---------- S3 presets (on-screen guidance only) ---------- */

type S3PresetId =
  | "aws"
  | "r2"
  | "spaces"
  | "wasabi"
  | "b2"
  | "oss"
  | "minio"
  | "generic"

const S3_PRESETS: Array<{
  id: S3PresetId
  name: string
  endpointExample: string
  regionExample: string
  forcePathStyle: boolean
  note: string
}> = [
  {
    id: "aws",
    name: "AWS S3",
    endpointExample: "(leave S3_ENDPOINT empty — uses AWS default)",
    regionExample: "us-east-1",
    forcePathStyle: false,
    note: "Native AWS S3. No custom endpoint needed.",
  },
  {
    id: "r2",
    name: "Cloudflare R2",
    endpointExample: "https://<ACCOUNT_ID>.r2.cloudflarestorage.com",
    regionExample: "auto",
    forcePathStyle: true,
    note: "Zero egress fees. Use region \"auto\" and set a public base URL for delivery.",
  },
  {
    id: "spaces",
    name: "DigitalOcean Spaces",
    endpointExample: "https://<REGION>.digitaloceanspaces.com",
    regionExample: "nyc3",
    forcePathStyle: false,
    note: "Region is the datacenter slug (e.g. nyc3, ams3, sgp1).",
  },
  {
    id: "wasabi",
    name: "Wasabi",
    endpointExample: "https://s3.<REGION>.wasabisys.com",
    regionExample: "us-east-1",
    forcePathStyle: false,
    note: "Low-cost hot storage. Match the endpoint region to the bucket region.",
  },
  {
    id: "b2",
    name: "Backblaze B2",
    endpointExample: "https://s3.<REGION>.backblazeb2.com",
    regionExample: "us-west-004",
    forcePathStyle: true,
    note: "Use the S3-compatible endpoint shown in your B2 bucket details.",
  },
  {
    id: "oss",
    name: "Alibaba Cloud OSS",
    endpointExample: "https://oss-<REGION>.aliyuncs.com",
    regionExample: "oss-ap-southeast-1",
    forcePathStyle: false,
    note: "Use the OSS S3-compatible endpoint for your region.",
  },
  {
    id: "minio",
    name: "MinIO (self-hosted)",
    endpointExample: "https://minio.your-domain.com",
    regionExample: "us-east-1",
    forcePathStyle: true,
    note: "Self-hosted S3. Path-style addressing is required.",
  },
  {
    id: "generic",
    name: "Other S3-compatible",
    endpointExample: "https://<your-s3-endpoint>",
    regionExample: "us-east-1",
    forcePathStyle: true,
    note: "Any other provider exposing the S3 API.",
  },
]

// env key → human label + whether it's required / a secret, used for the status table.
const S3_FIELDS: Array<{ key: keyof S3Keys; label: string; required: boolean; secret?: boolean }> = [
  { key: "S3_BUCKET", label: "Bucket name", required: true },
  { key: "S3_ACCESS_KEY_ID", label: "Access key ID", required: true },
  { key: "S3_SECRET_ACCESS_KEY", label: "Secret access key", required: true, secret: true },
  { key: "S3_REGION", label: "Region", required: false },
  { key: "S3_ENDPOINT", label: "Endpoint URL", required: false },
  { key: "S3_PUBLIC_BASE_URL", label: "Public base URL (CDN)", required: false },
  { key: "S3_FORCE_PATH_STYLE", label: "Force path-style", required: false },
]

const CLOUDINARY_FIELDS: Array<{ key: keyof CloudinaryKeys; label: string; secret?: boolean }> = [
  { key: "CLOUDINARY_CLOUD_NAME", label: "Cloud name" },
  { key: "CLOUDINARY_API_KEY", label: "API key" },
  { key: "CLOUDINARY_API_SECRET", label: "API secret", secret: true },
]

function KeyRow({
  envName,
  label,
  set,
  required,
  secret,
  onCopy,
  copied,
}: {
  envName: string
  label: string
  set: boolean
  required?: boolean
  secret?: boolean
  onCopy: (name: string) => void
  copied: string | null
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-border/60 last:border-0">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{label}</span>
          {required && <span className="text-[10px] uppercase tracking-wider text-[#B91C1C]">Required</span>}
          {secret && <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Secret</span>}
        </div>
        <button
          type="button"
          onClick={() => onCopy(envName)}
          className="mt-0.5 inline-flex items-center gap-1 text-xs font-mono text-muted-foreground hover:text-foreground transition"
          title="Copy env variable name"
        >
          {envName}
          {copied === envName ? (
            <Check className="h-3 w-3 text-emerald-600" />
          ) : (
            <Copy className="h-3 w-3 opacity-60" />
          )}
        </button>
      </div>
      {set ? (
        <Badge variant="outline" className="gap-1 text-emerald-700 border-emerald-300 shrink-0">
          <Check className="h-3 w-3" /> Set
        </Badge>
      ) : (
        <Badge
          variant="outline"
          className={cn(
            "gap-1 shrink-0",
            required ? "text-[#B91C1C] border-[#B91C1C]/40" : "text-muted-foreground",
          )}
        >
          <X className="h-3 w-3" /> Missing
        </Badge>
      )}
    </div>
  )
}

export function StorageSettings() {
  const { toast } = useToast()
  const [selection, setSelection] = useCmsDoc<Selection>("storage", DEFAULTS)
  const { data: status, error, mutate } = useSWR<StorageStatus>(STATUS_URL, statusFetcher, {
    revalidateOnFocus: false,
  })
  const [testing, setTesting] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const engine = selection.provider
  const presetId: S3PresetId = selection.preset ?? "aws"
  const preset = S3_PRESETS.find((p) => p.id === presetId) ?? S3_PRESETS[0]

  function configured(id: Provider): boolean {
    if (!status) return id === "local"
    return status.providers[id].configured
  }

  function selectEngine(id: Provider) {
    setSelection({ ...selection, provider: id })
    setTimeout(() => void mutate(), 400)
  }

  function selectPreset(id: S3PresetId) {
    setSelection({ ...selection, provider: "s3", preset: id })
  }

  async function copyKey(name: string) {
    try {
      await navigator.clipboard.writeText(name)
      setCopied(name)
      setTimeout(() => setCopied(null), 1500)
    } catch {
      // Clipboard can be unavailable (insecure context) — fail quietly.
    }
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

  const s3 = status?.providers.s3
  const cl = status?.providers.cloudinary

  return (
    <div className="space-y-6">
      {/* 1. Engine selection */}
      <Card>
        <CardHeader>
          <CardTitle className="font-serif">File storage</CardTitle>
          <CardDescription>
            Choose where uploaded files (product images, prescription scans) are stored.
            Credentials are set as secure server secrets — only your selection is saved here.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="flex items-start gap-3 rounded-md border border-[#B91C1C]/30 bg-[#B91C1C]/5 px-4 py-3 text-sm text-[#B91C1C]">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>Could not load storage status. Confirm you are signed in as an admin, then retry.</span>
            </div>
          )}

          {status?.fellBack && (
            <div className="flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                <strong className="capitalize">{status.provider}</strong> is selected but not fully
                configured — uploads are currently using <strong>local disk</strong>. Set the
                required server secrets below to activate it.
              </span>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            {ENGINES.map((e) => {
              const isSelected = engine === e.id
              const isActive = status?.active === e.id
              const ready = configured(e.id)
              const Icon = e.icon
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => selectEngine(e.id)}
                  className={cn(
                    "flex flex-col gap-2 rounded-lg border p-4 text-left transition h-full",
                    isSelected
                      ? "border-[#6B0F1A] ring-1 ring-[#6B0F1A] bg-[#6B0F1A]/[0.03]"
                      : "border-border hover:border-muted-foreground/40",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-md",
                        isSelected ? "bg-[#6B0F1A] text-white" : "bg-muted text-muted-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div
                      className={cn(
                        "h-4 w-4 shrink-0 rounded-full border",
                        isSelected ? "border-[#6B0F1A] bg-[#6B0F1A]" : "border-muted-foreground/40",
                      )}
                      aria-hidden
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-medium text-sm">{e.name}</span>
                      {isActive && (
                        <Badge className="bg-emerald-600 hover:bg-emerald-600 text-[10px]">Active</Badge>
                      )}
                      {e.id !== "local" && ready && !isActive && (
                        <Badge variant="outline" className="text-emerald-700 border-emerald-300 text-[10px]">
                          Configured
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{e.blurb}</p>
                  </div>
                </button>
              )
            })}
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <p className="text-xs text-muted-foreground">
              Active backend: <span className="font-mono font-medium">{status?.active ?? "—"}</span>
            </p>
            <Button onClick={runTest} disabled={testing} variant="outline" size="sm">
              {testing ? "Testing…" : "Run test upload"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 2a. S3 configuration */}
      {engine === "s3" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-serif">S3-compatible configuration</CardTitle>
            <CardDescription>
              Pick your provider for tailored endpoint guidance, then set the server secrets below.
              All providers use the same <span className="font-mono">S3_*</span> keys.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* preset chips */}
            <div className="flex flex-wrap gap-2">
              {S3_PRESETS.map((p) => {
                const on = presetId === p.id
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => selectPreset(p.id)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                      on
                        ? "border-[#6B0F1A] bg-[#6B0F1A] text-white"
                        : "border-border text-muted-foreground hover:border-[#6B0F1A]/50 hover:text-foreground",
                    )}
                  >
                    {p.name}
                  </button>
                )
              })}
            </div>

            {/* preset guidance */}
            <div className="rounded-md bg-muted/50 border border-border px-4 py-3 space-y-1.5">
              <p className="text-sm font-medium">{preset.name}</p>
              <p className="text-xs text-muted-foreground">{preset.note}</p>
              <div className="grid gap-1 pt-1 text-xs sm:grid-cols-2">
                <p className="text-muted-foreground">
                  Endpoint: <span className="font-mono text-foreground">{preset.endpointExample}</span>
                </p>
                <p className="text-muted-foreground">
                  Region example: <span className="font-mono text-foreground">{preset.regionExample}</span>
                </p>
                <p className="text-muted-foreground">
                  Force path-style:{" "}
                  <span className="font-mono text-foreground">{preset.forcePathStyle ? "1" : "0"}</span>
                </p>
              </div>
            </div>

            {/* per-key status */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium">Server secrets</p>
                {s3?.configured ? (
                  <Badge variant="outline" className="gap-1 text-emerald-700 border-emerald-300">
                    <CheckCircle2 className="h-3 w-3" /> Ready
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1 text-[#B91C1C] border-[#B91C1C]/40">
                    <AlertTriangle className="h-3 w-3" /> Incomplete
                  </Badge>
                )}
              </div>
              <div className="rounded-md border border-border px-4 py-1">
                {S3_FIELDS.map((f) => (
                  <KeyRow
                    key={f.key}
                    envName={f.key}
                    label={f.label}
                    set={!!s3?.keys?.[f.key]}
                    required={f.required}
                    secret={f.secret}
                    onCopy={copyKey}
                    copied={copied}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                These values are stored as secure server secrets and are never saved to the database
                or shown here. Ask your developer to set any missing keys, then click
                <span className="font-medium"> Run test upload</span> to verify.
              </p>
            </div>

            {/* current non-secret values */}
            {s3 && (s3.bucket || s3.endpoint || s3.publicBaseUrl) && (
              <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                {s3.bucket && (
                  <p>
                    Bucket: <span className="font-mono text-foreground">{s3.bucket}</span>
                  </p>
                )}
                <p>
                  Region: <span className="font-mono text-foreground">{s3.region}</span>
                </p>
                {s3.endpoint && (
                  <p className="truncate">
                    Endpoint: <span className="font-mono text-foreground">{s3.endpoint}</span>
                  </p>
                )}
                {s3.publicBaseUrl && (
                  <p className="truncate">
                    Public base: <span className="font-mono text-foreground">{s3.publicBaseUrl}</span>
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 2b. Cloudinary configuration */}
      {engine === "cloudinary" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-serif">Cloudinary configuration</CardTitle>
            <CardDescription>
              Set the following server secrets from your Cloudinary dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium">Server secrets</p>
                {cl?.configured ? (
                  <Badge variant="outline" className="gap-1 text-emerald-700 border-emerald-300">
                    <CheckCircle2 className="h-3 w-3" /> Ready
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1 text-[#B91C1C] border-[#B91C1C]/40">
                    <AlertTriangle className="h-3 w-3" /> Incomplete
                  </Badge>
                )}
              </div>
              <div className="rounded-md border border-border px-4 py-1">
                {CLOUDINARY_FIELDS.map((f) => (
                  <KeyRow
                    key={f.key}
                    envName={f.key}
                    label={f.label}
                    set={!!cl?.keys?.[f.key]}
                    required
                    secret={f.secret}
                    onCopy={copyKey}
                    copied={copied}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                These values are stored as secure server secrets and are never saved to the database
                or shown here.
              </p>
            </div>
            {cl?.cloudName && (
              <p className="text-xs text-muted-foreground">
                Cloud: <span className="font-mono text-foreground">{cl.cloudName}</span>
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* 2c. Local disk note */}
      {engine === "local" && (
        <Card>
          <CardContent className="py-5 text-sm text-muted-foreground">
            Local disk needs no configuration. Files are written to the server's
            <span className="font-mono"> .uploads/</span> directory. For production, switch to an
            S3-compatible store or Cloudinary so uploads survive redeploys.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
