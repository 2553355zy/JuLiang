$ErrorActionPreference = "Stop"

if (-not (Test-Path ".\node_modules\electron")) {
  throw "Electron is not installed. Run: `$env:ELECTRON_MIRROR='https://npmmirror.com/mirrors/electron/'; pnpm add -D electron"
}

pnpm build
pnpm exec electron .\electron\main.cjs

