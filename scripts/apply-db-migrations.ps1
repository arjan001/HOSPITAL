# Apply manual SQL migrations (workflow tables/columns). Idempotent.
# Requires Postgres running and DATABASE_URL in .env.local (via load-env.ps1).
$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
. (Join-Path $PSScriptRoot "load-env.ps1")

if (-not $env:DATABASE_URL) {
  Write-Error "DATABASE_URL is not set. Add it to .env.local or export it."
}

$files = @(
  "20250604_rx_extraction.sql",
  "20250604_crm.sql",
  "20250604_prescription_subscriptions.sql",
  "20250604_operations.sql",
  "20250604_prescription_workflow_status.sql",
  "20250604_procurement.sql",
  "20250604_procurement_sourcing_link.sql",
  "20250604_sourcing_requests.sql",
  "20250604_fulfillment.sql",
  "20250611_partner_directory.sql",
  "20250615_partner_organizations.sql",
  "20250616_pharmacies.sql"
)

$manualDir = Join-Path $root "lib\db\migrations\manual"
$psql = Get-Command psql -ErrorAction SilentlyContinue

if (-not $psql) {
  Write-Host "psql not found on PATH. Install PostgreSQL client tools, or run:"
  Write-Host "  pnpm --filter @workspace/db run push"
  Write-Host "when Postgres is up."
  exit 1
}

foreach ($f in $files) {
  $path = Join-Path $manualDir $f
  if (-not (Test-Path $path)) { Write-Error "Missing $path" }
  Write-Host "Applying $f ..."
  & psql $env:DATABASE_URL -v ON_ERROR_STOP=1 -f $path
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host "Done. Optional: pnpm --filter @workspace/db run push  (sync full Drizzle schema)"
