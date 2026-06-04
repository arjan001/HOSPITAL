# Load key=value pairs from a .env-style file into the current process.
param(
  [string]$EnvFile = (Join-Path (Join-Path $PSScriptRoot "..") ".env.local")
)

if (-not (Test-Path $EnvFile)) {
  Write-Warning "Env file not found: $EnvFile"
  return
}

Get-Content $EnvFile | ForEach-Object {
  $line = $_.Trim()
  if ($line -eq "" -or $line.StartsWith("#")) { return }
  if ($line -match '^\s*([^=]+)=(.*)$') {
    $name = $matches[1].Trim()
    $value = $matches[2].Trim().Trim('"').Trim("'")
    Set-Item -Path "env:$name" -Value $value
  }
}
