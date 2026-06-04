# Start all three Shaniid RX dev services (Windows / PowerShell).
$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$env:Path = "C:\Program Files\nodejs;${env:APPDATA}\npm;" + $env:Path

. (Join-Path $PSScriptRoot "load-env.ps1")

$env:NODE_ENV = "development"

Write-Host "Starting api-server on :8080 ..."
Start-Process powershell -ArgumentList @(
  "-NoExit", "-Command",
  "`$env:Path='C:\Program Files\nodejs;${env:APPDATA}\npm;' + `$env:Path; Set-Location '$root'; . .\scripts\load-env.ps1; `$env:PORT='8080'; `$env:NODE_ENV='development'; pnpm --filter @workspace/api-server run dev"
) -WindowStyle Normal

Start-Sleep -Seconds 2

Write-Host "Starting api-nest on :8090 ..."
Start-Process powershell -ArgumentList @(
  "-NoExit", "-Command",
  "`$env:Path='C:\Program Files\nodejs;${env:APPDATA}\npm;' + `$env:Path; Set-Location '$root'; . .\scripts\load-env.ps1; `$env:PORT='8090'; pnpm --filter @workspace/api-nest run dev"
) -WindowStyle Normal

Start-Sleep -Seconds 2

Write-Host "Starting storefront on :21470 ..."
Start-Process powershell -ArgumentList @(
  "-NoExit", "-Command",
  "`$env:Path='C:\Program Files\nodejs;${env:APPDATA}\npm;' + `$env:Path; Set-Location '$root'; . .\scripts\load-env.ps1; `$env:PORT='21470'; `$env:BASE_PATH='/'; pnpm --filter @workspace/shaniid run dev"
) -WindowStyle Normal

Write-Host ""
Write-Host "Three dev windows opened. Storefront: http://localhost:21470"
Write-Host "If Postgres is not running, start it (Docker) then: pnpm --filter @workspace/db run push"
