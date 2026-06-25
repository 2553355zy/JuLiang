$ErrorActionPreference = "Stop"

Write-Host "== JuLiang V2 release preflight =="

pnpm typecheck
pnpm lint
pnpm build

$repoRoot = Resolve-Path ".."
$trackedFiles = git -C $repoRoot ls-files
$blockedPatterns = @(
  "\.env$",
  "\.env\.",
  "desktop/config\.local\.json$",
  "^_internal/",
  "\.exe$",
  "\.bak$"
)

$blocked = @()
foreach ($file in $trackedFiles) {
  if ($file -eq "v2-app/.env.example") {
    continue
  }

  foreach ($pattern in $blockedPatterns) {
    if ($file -match $pattern) {
      $blocked += $file
      break
    }
  }
}

if ($blocked.Count -gt 0) {
  Write-Host "Blocked tracked files detected:" -ForegroundColor Red
  $blocked | ForEach-Object { Write-Host " - $_" -ForegroundColor Red }
  throw "Release preflight failed because sensitive or packaged artifacts are tracked."
}

$electronVersion = pnpm exec electron --version
Write-Host "Electron: $electronVersion"
Write-Host "Release preflight passed." -ForegroundColor Green
